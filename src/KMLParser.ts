import type { KMLGeometry } from './KMLGeometry';
import type { KMLFeatureData } from './KMLFeature';
import type { KMLDocument, KMLNetworkLink } from './KMLDocument';
import {
    END_DOCUMENT,
    END_TAG,
    KMLXmlPullParser,
    START_TAG,
    forEachChild,
    readText,
    skip,
} from './KMLXmlSupport';
import { readGeometry } from './KMLGeometryReader';
import {
    KMLStyle,
    type RawPlacemark,
    rawPlacemarkToFeature,
    readStyle,
    readStyleMap,
} from './KMLStyleReader';

/**
 * Parses OGC KML 2.2 documents — and KMZ archives — into KMLFeatureData models
 * for rendering through KMLLayer.
 *
 * The parser walks the whole document into memory with a pull tokenizer,
 * collecting shared `<Style>` / `<StyleMap>` definitions and `<Placemark>`
 * geometries, then resolves each placemark's `styleUrl` reference to a
 * concrete style.
 *
 * Supported geometries: `Point`, `LineString`, `LinearRing`, `Polygon`
 * (with `innerBoundaryIs` holes), and `MultiGeometry`.
 * Supported styling: `LineStyle` (color, width), `PolyStyle` (color, fill, outline),
 * and `IconStyle` (color). KML `aabbggrr` colors are converted to ARGB ints.
 *
 * Nested `<Document>` and `<Folder>` containers are walked with a loop and a
 * depth counter — never by recursion — so arbitrarily deep hierarchies cannot
 * overflow the call stack.
 * `<NetworkLink>` references are collected into KMLDocument.networkLinks (not
 * fetched here); use KMLLoader to fetch and merge them.
 *
 * android-sdk の `KMLParser.kt` と同じ意味論。
 */
export const KMLParser = {
    /** Parses a KML string into a list of static features. */
    parse(kml: string): KMLFeatureData[] {
        return parseKmlText(kml).features;
    },

    /**
     * Parses KML text or KML/KMZ bytes into a KMLDocument, keeping unresolved
     * `<NetworkLink>` references alongside the parsed features.
     *
     * Binary input starting with the ZIP signature is treated as KMZ and the
     * first `.kml` entry in the archive (conventionally `doc.kml`) is used as
     * the document. KMZ inflation uses `DecompressionStream`, hence the
     * asynchronous result.
     */
    async parseDocument(data: string | Uint8Array | ArrayBuffer): Promise<KMLDocument> {
        if (typeof data === 'string') return parseKmlText(data);
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        if (hasZipSignature(bytes)) return parseKmlText(await extractKmzDocument(bytes));
        return parseKmlText(new TextDecoder().decode(bytes));
    },
};

// ─── KML document walking ─────────────────────────────────────────────────────

function parseKmlText(kml: string): KMLDocument {
    const parser = new KMLXmlPullParser(kml);

    const styles = new Map<string, KMLStyle>();
    const styleMaps = new Map<string, string>();
    const placemarks: RawPlacemark[] = [];
    const networkLinks: KMLNetworkLink[] = [];

    // Advance to the first start tag (typically <kml>) and walk its subtree.
    let event = parser.next();
    while (event !== START_TAG && event !== END_DOCUMENT) {
        event = parser.next();
    }
    if (event === START_TAG) {
        walkDocument(parser, styles, styleMaps, placemarks, networkLinks);
    }

    const features: KMLFeatureData[] = [];
    for (const placemark of placemarks) {
        const feature = rawPlacemarkToFeature(placemark, styles, styleMaps);
        if (feature) features.push(feature);
    }
    return { features, networkLinks };
}

/**
 * Walks every container in the document with a single loop and a depth counter.
 * `<Document>` / `<Folder>` / nested `<kml>` are transparent: entering one only
 * increments `depth`, so container nesting consumes no call-stack frames. Every
 * handled child (Style / StyleMap / Placemark / NetworkLink) consumes its own
 * subtree including the END_TAG, which keeps the depth accounting balanced.
 */
function walkDocument(
    parser: KMLXmlPullParser,
    styles: Map<string, KMLStyle>,
    styleMaps: Map<string, string>,
    placemarks: RawPlacemark[],
    networkLinks: KMLNetworkLink[],
): void {
    let depth = 1;
    while (depth > 0) {
        switch (parser.next()) {
            case START_TAG:
                switch (parser.name) {
                    case 'Style': {
                        const id = parser.getAttributeValue('id');
                        const style = readStyle(parser);
                        if (id !== null) styles.set(id, style);
                        break;
                    }
                    case 'StyleMap': {
                        const id = parser.getAttributeValue('id');
                        const normal = readStyleMap(parser);
                        if (id !== null && normal !== null) styleMaps.set(id, normal);
                        break;
                    }
                    case 'Placemark':
                        placemarks.push(readPlacemark(parser));
                        break;
                    case 'NetworkLink': {
                        const link = readNetworkLink(parser);
                        if (link) networkLinks.push(link);
                        break;
                    }
                    case 'Document':
                    case 'Folder':
                    case 'kml':
                        depth++;
                        break;
                    default:
                        skip(parser);
                }
                break;
            case END_TAG:
                depth--;
                break;
            case END_DOCUMENT:
                return;
        }
    }
}

function readPlacemark(parser: KMLXmlPullParser): RawPlacemark {
    let name: string | null = null;
    let description: string | null = null;
    let styleUrl: string | null = null;
    let inlineStyle: KMLStyle | null = null;
    let geometry: KMLGeometry | null = null;
    const properties: Record<string, unknown> = {};

    forEachChild(parser, (tag) => {
        switch (tag) {
            case 'name': name = readText(parser).trim(); break;
            case 'description': description = readText(parser).trim(); break;
            case 'styleUrl': styleUrl = readText(parser).trim().replace(/^#/, ''); break;
            case 'Style': inlineStyle = readStyle(parser); break;
            case 'ExtendedData': readExtendedData(parser, properties); break;
            case 'Point':
            case 'LineString':
            case 'LinearRing':
            case 'Polygon':
            case 'MultiGeometry':
                geometry = readGeometry(parser, tag);
                break;
            default:
                skip(parser);
        }
    });

    if (name && !('name' in properties)) properties['name'] = name;
    if (description && !('description' in properties)) properties['description'] = description;

    return { geometry, styleUrl, inlineStyle, properties };
}

/** Reads a `<NetworkLink>`; the href lives in `<Link>` (or the legacy `<Url>`). */
function readNetworkLink(parser: KMLXmlPullParser): KMLNetworkLink | null {
    let href: string | null = null;
    let visibility = true;
    forEachChild(parser, (tag) => {
        switch (tag) {
            case 'Link':
            case 'Url':
                forEachChild(parser, (child) => {
                    if (child === 'href') {
                        href = readText(parser).trim();
                    } else {
                        skip(parser);
                    }
                });
                break;
            case 'visibility':
                visibility = readText(parser).trim() !== '0';
                break;
            default:
                skip(parser);
        }
    });
    return href ? { href, visibility } : null;
}

function readExtendedData(parser: KMLXmlPullParser, properties: Record<string, unknown>): void {
    forEachChild(parser, (name) => {
        switch (name) {
            case 'Data': {
                const key = parser.getAttributeValue('name');
                let value: string | null = null;
                forEachChild(parser, (child) => {
                    if (child === 'value') {
                        value = readText(parser).trim();
                    } else {
                        skip(parser);
                    }
                });
                if (key !== null) properties[key] = value;
                break;
            }
            case 'SchemaData':
                forEachChild(parser, (child) => {
                    if (child === 'SimpleData') {
                        const key = parser.getAttributeValue('name');
                        const value = readText(parser).trim();
                        if (key !== null) properties[key] = value;
                    } else {
                        skip(parser);
                    }
                });
                break;
            default:
                skip(parser);
        }
    });
}

// ─── KMZ (ZIP) support ────────────────────────────────────────────────────────

function hasZipSignature(bytes: Uint8Array): boolean {
    return bytes.length >= 4 &&
        bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;

/**
 * KMZ から最初の `.kml` エントリを取り出して文字列にする。
 *
 * zip ライブラリには依存しない。セントラルディレクトリを自前で辿り、
 * method 0（無圧縮）はそのまま、method 8（deflate）は
 * `DecompressionStream('deflate-raw')` で展開する。
 */
async function extractKmzDocument(bytes: Uint8Array): Promise<string> {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // End-of-central-directory record: scan backwards past an optional comment.
    let eocd = -1;
    const scanEnd = Math.max(0, bytes.length - EOCD_MIN_SIZE - MAX_COMMENT_SIZE);
    for (let i = bytes.length - EOCD_MIN_SIZE; i >= scanEnd; i--) {
        if (view.getUint32(i, true) === EOCD_SIGNATURE) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('KMZ archive has no end-of-central-directory record');

    const entryCount = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    const decoder = new TextDecoder();

    for (let entry = 0; entry < entryCount; entry++) {
        if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break;
        const method = view.getUint16(offset + 10, true);
        const compressedSize = view.getUint32(offset + 20, true);
        const nameLength = view.getUint16(offset + 28, true);
        const extraLength = view.getUint16(offset + 30, true);
        const commentLength = view.getUint16(offset + 32, true);
        const localOffset = view.getUint32(offset + 42, true);
        const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
        offset += 46 + nameLength + extraLength + commentLength;

        const isDirectory = name.endsWith('/');
        if (isDirectory || name.startsWith('__MACOSX/')) continue;
        if (!name.toLowerCase().endsWith('.kml')) continue;

        if (view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) {
            throw new Error(`KMZ entry ${name} has a corrupt local header`);
        }
        const localNameLength = view.getUint16(localOffset + 26, true);
        const localExtraLength = view.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = bytes.subarray(dataStart, dataStart + compressedSize);

        if (method === 0) return decoder.decode(compressed);
        if (method === 8) return decoder.decode(await inflateRaw(compressed));
        throw new Error(`KMZ entry ${name} uses unsupported compression method ${method}`);
    }
    throw new Error('KMZ archive contains no .kml entry');
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([data as BlobPart]).stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}
