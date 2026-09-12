import type { LonLat } from './KMLGeometry';
import { colorArgb } from './KMLDefaults';

/**
 * KML を読むときの XML 走査ヘルパと、座標・色の解釈。
 *
 * DOMParser は使わない。ツリー全体をメモリに作るためネストの深さが
 * そのままメモリ・スタックに跳ね、非ブラウザ環境にも存在しない。代わりに
 * android-sdk の `XmlPullParser` と同じイベント列（START_TAG / END_TAG /
 * TEXT / END_DOCUMENT）を返す小さな逐次トークナイザを自前で持つ。
 *
 * プル型パーサは「今どの要素にいるか」を呼び出し側が管理する必要があり、
 * 消費し忘れると次の兄弟要素を取り違える。`forEachChild` を通すことで
 * 「子を 1 つ処理したら必ずその END_TAG まで消費する」という約束を 1 箇所に閉じ込める。
 *
 * android-sdk の `KMLXmlSupport.kt` に対応する。
 */

// ─── Event constants (XmlPullParser-compatible shape) ─────────────────────────

export const START_TAG = 1;
export const END_TAG = 2;
export const TEXT = 3;
export const END_DOCUMENT = 4;

const LT = 60; // '<'
const GT = 62; // '>'
const SLASH = 47; // '/'
const EQ = 61; // '='
const DQUOTE = 34; // '"'
const SQUOTE = 39; // "'"

function isSpace(c: number): boolean {
    return c === 32 || c === 9 || c === 10 || c === 13;
}

function decodeEntities(s: string): string {
    if (s.indexOf('&') < 0) return s;
    return s.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
        if (body.charCodeAt(0) === 35 /* '#' */) {
            const hex = body.charCodeAt(1) === 120 || body.charCodeAt(1) === 88; // 'x' / 'X'
            const code = hex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
            return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
        }
        switch (body) {
            case 'amp': return '&';
            case 'lt': return '<';
            case 'gt': return '>';
            case 'quot': return '"';
            case 'apos': return "'";
            default: return match;
        }
    });
}

// ─── Pull parser ──────────────────────────────────────────────────────────────

/**
 * Iterative, dependency-free XML tokenizer. Emits START_TAG / END_TAG / TEXT /
 * END_DOCUMENT events from a string. Handles `<?...?>`, `<!-- -->`, `<!...>`,
 * CDATA sections, self-closing tags, and entity decoding for the five XML
 * entities plus numeric character references. Never builds a tree, so document
 * depth costs neither call-stack frames nor per-node allocations.
 */
export class KMLXmlPullParser {
    /** Element name of the current START_TAG / END_TAG event. */
    name = '';
    /** Text content of the current TEXT event. */
    text = '';

    private readonly src: string;
    private pos = 0;
    private pendingEndTag: string | null = null;
    private attributes: Map<string, string> | null = null;

    constructor(src: string) {
        this.src = src;
    }

    getAttributeValue(name: string): string | null {
        return this.attributes?.get(name) ?? null;
    }

    next(): number {
        if (this.pendingEndTag !== null) {
            this.name = this.pendingEndTag;
            this.pendingEndTag = null;
            this.attributes = null;
            return END_TAG;
        }
        const src = this.src;
        while (this.pos < src.length) {
            if (src.charCodeAt(this.pos) !== LT) {
                const next = src.indexOf('<', this.pos);
                const end = next < 0 ? src.length : next;
                this.text = decodeEntities(src.slice(this.pos, end));
                this.pos = end;
                return TEXT;
            }
            if (src.startsWith('<!--', this.pos)) {
                const end = src.indexOf('-->', this.pos + 4);
                this.pos = end < 0 ? src.length : end + 3;
                continue;
            }
            if (src.startsWith('<![CDATA[', this.pos)) {
                const end = src.indexOf(']]>', this.pos + 9);
                this.text = end < 0 ? src.slice(this.pos + 9) : src.slice(this.pos + 9, end);
                this.pos = end < 0 ? src.length : end + 3;
                return TEXT;
            }
            if (src.startsWith('<?', this.pos)) {
                const end = src.indexOf('?>', this.pos + 2);
                this.pos = end < 0 ? src.length : end + 2;
                continue;
            }
            if (src.startsWith('<!', this.pos)) {
                const end = src.indexOf('>', this.pos + 2);
                this.pos = end < 0 ? src.length : end + 1;
                continue;
            }
            if (src.startsWith('</', this.pos)) {
                const end = src.indexOf('>', this.pos + 2);
                this.name = (end < 0 ? src.slice(this.pos + 2) : src.slice(this.pos + 2, end)).trim();
                this.pos = end < 0 ? src.length : end + 1;
                this.attributes = null;
                return END_TAG;
            }
            return this.readStartTag();
        }
        return END_DOCUMENT;
    }

    private readStartTag(): number {
        const src = this.src;
        const nameStart = this.pos + 1;
        let i = nameStart;
        while (i < src.length) {
            const c = src.charCodeAt(i);
            if (isSpace(c) || c === GT || c === SLASH) break;
            i++;
        }
        this.name = src.slice(nameStart, i);
        this.attributes = null;

        let selfClosing = false;
        while (i < src.length) {
            while (i < src.length && isSpace(src.charCodeAt(i))) i++;
            if (i >= src.length) break;
            const c = src.charCodeAt(i);
            if (c === GT) { i++; break; }
            if (c === SLASH) { selfClosing = true; i++; continue; }

            let nameEnd = i;
            while (nameEnd < src.length) {
                const nc = src.charCodeAt(nameEnd);
                if (nc === EQ || nc === GT || nc === SLASH || isSpace(nc)) break;
                nameEnd++;
            }
            const attrName = src.slice(i, nameEnd);
            i = nameEnd;
            while (i < src.length && isSpace(src.charCodeAt(i))) i++;
            if (src.charCodeAt(i) === EQ) {
                i++;
                while (i < src.length && isSpace(src.charCodeAt(i))) i++;
                const quote = src.charCodeAt(i);
                let value: string;
                if (quote === DQUOTE || quote === SQUOTE) {
                    const close = src.indexOf(String.fromCharCode(quote), i + 1);
                    value = close < 0 ? src.slice(i + 1) : src.slice(i + 1, close);
                    i = close < 0 ? src.length : close + 1;
                } else {
                    let valueEnd = i;
                    while (valueEnd < src.length) {
                        const vc = src.charCodeAt(valueEnd);
                        if (vc === GT || isSpace(vc)) break;
                        valueEnd++;
                    }
                    value = src.slice(i, valueEnd);
                    i = valueEnd;
                }
                if (attrName.length > 0) {
                    (this.attributes ??= new Map()).set(attrName, decodeEntities(value));
                }
            } else if (attrName.length > 0) {
                (this.attributes ??= new Map()).set(attrName, '');
            } else {
                i++;
            }
        }
        this.pos = i;
        if (selfClosing) this.pendingEndTag = this.name;
        return START_TAG;
    }
}

// ─── Traversal helpers ────────────────────────────────────────────────────────

/**
 * Invokes `block` for each direct child START_TAG of the element the parser is
 * currently on, then consumes the element's own END_TAG. `block` must fully
 * consume its child element (via `readText`, `skip`, or a nested `forEachChild`).
 */
export function forEachChild(parser: KMLXmlPullParser, block: (name: string) => void): void {
    let depth = 1;
    while (depth > 0) {
        switch (parser.next()) {
            case START_TAG: {
                depth++;
                block(parser.name);
                // block is expected to leave the parser on this child's END_TAG.
                depth--;
                break;
            }
            case END_TAG:
                depth--;
                break;
            case END_DOCUMENT:
                return;
        }
    }
}

/** Reads the text content of the current element and consumes its END_TAG. */
export function readText(parser: KMLXmlPullParser): string {
    let result = '';
    let event = parser.next();
    while (event === TEXT) {
        result += parser.text;
        event = parser.next();
    }
    return result;
}

/** Skips the current element and all of its descendants. */
export function skip(parser: KMLXmlPullParser): void {
    let depth = 1;
    while (depth > 0) {
        switch (parser.next()) {
            case START_TAG: depth++; break;
            case END_TAG: depth--; break;
            case END_DOCUMENT: return;
        }
    }
}

// ─── Coordinate / color interpretation ────────────────────────────────────────

const WHITESPACE = /\s+/;

/** Parses whitespace-separated `lon,lat[,alt]` tuples. */
export function parseCoordinates(text: string): LonLat[] {
    const result: LonLat[] = [];
    for (const token of text.trim().split(WHITESPACE)) {
        if (token.length === 0) continue;
        const parts = token.split(',');
        if (parts.length < 2) continue;
        const lon = Number(parts[0].trim());
        const lat = Number(parts[1].trim());
        if (Number.isNaN(lon) || Number.isNaN(lat)) continue;
        result.push({ longitude: lon, latitude: lat });
    }
    return result;
}

/** Converts a KML `aabbggrr` (or `bbggrr`) hex color to an ARGB int. */
export function parseKmlColor(hex: string): number | null {
    const h = hex.trim();
    if (!/^[0-9a-fA-F]+$/.test(h)) return null;
    if (h.length === 8) {
        const a = parseInt(h.slice(0, 2), 16);
        const b = parseInt(h.slice(2, 4), 16);
        const g = parseInt(h.slice(4, 6), 16);
        const r = parseInt(h.slice(6, 8), 16);
        return colorArgb(a, r, g, b);
    }
    if (h.length === 6) {
        const b = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const r = parseInt(h.slice(4, 6), 16);
        return colorArgb(255, r, g, b);
    }
    return null;
}
