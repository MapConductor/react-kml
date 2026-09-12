import type { KMLGeometry } from './KMLGeometry';
import type { KMLFeatureData } from './KMLFeature';
import {
    KMLXmlPullParser,
    forEachChild,
    parseKmlColor,
    readText,
    skip,
} from './KMLXmlSupport';

/**
 * `<Style>` / `<StyleMap>` の読み取りと、プレースマークへの解決。
 *
 * KML はスタイルを文書の別の場所で定義し、`styleUrl` で参照する。さらに
 * `<StyleMap>` は normal / highlight の 2 状態を持つ。ここでは normal だけを採り、
 * 「参照 → StyleMap → 実体」の 2 段の間接を `rawPlacemarkToFeature` で辿る。
 *
 * android-sdk の `KMLStyleReader.kt` と同じ読み方。
 */

const TRANSPARENT = 0;

export class KMLStyle {
    lineColor: number | null = null;
    lineWidth: number | null = null;
    polyColor: number | null = null;
    iconColor: number | null = null;
    fill = true;
    outline = true;
}

export function readStyle(parser: KMLXmlPullParser): KMLStyle {
    const style = new KMLStyle();
    forEachChild(parser, (name) => {
        switch (name) {
            case 'LineStyle':
                forEachChild(parser, (child) => {
                    switch (child) {
                        case 'color': style.lineColor = parseKmlColor(readText(parser)); break;
                        case 'width': {
                            const width = Number(readText(parser).trim());
                            style.lineWidth = Number.isNaN(width) ? null : width;
                            break;
                        }
                        default: skip(parser);
                    }
                });
                break;
            case 'PolyStyle':
                forEachChild(parser, (child) => {
                    switch (child) {
                        case 'color': style.polyColor = parseKmlColor(readText(parser)); break;
                        case 'fill': style.fill = readText(parser).trim() !== '0'; break;
                        case 'outline': style.outline = readText(parser).trim() !== '0'; break;
                        default: skip(parser);
                    }
                });
                break;
            case 'IconStyle':
                forEachChild(parser, (child) => {
                    if (child === 'color') {
                        style.iconColor = parseKmlColor(readText(parser));
                    } else {
                        skip(parser);
                    }
                });
                break;
            default:
                skip(parser);
        }
    });
    return style;
}

/** Reads a `<StyleMap>` and returns the `normal`-key styleUrl id (without the leading `#`). */
export function readStyleMap(parser: KMLXmlPullParser): string | null {
    let normal: string | null = null;
    forEachChild(parser, (name) => {
        if (name === 'Pair') {
            let key: string | null = null;
            let url: string | null = null;
            forEachChild(parser, (child) => {
                switch (child) {
                    case 'key': key = readText(parser).trim(); break;
                    case 'styleUrl': url = readText(parser).trim().replace(/^#/, ''); break;
                    default: skip(parser);
                }
            });
            if (key === 'normal') normal = url;
        } else {
            skip(parser);
        }
    });
    return normal;
}

export interface RawPlacemark {
    readonly geometry: KMLGeometry | null;
    readonly styleUrl: string | null;
    readonly inlineStyle: KMLStyle | null;
    readonly properties: Record<string, unknown>;
}

export function rawPlacemarkToFeature(
    placemark: RawPlacemark,
    styles: Map<string, KMLStyle>,
    styleMaps: Map<string, string>,
): KMLFeatureData | null {
    const geometry = placemark.geometry;
    if (!geometry) return null;
    const style = placemark.inlineStyle ?? resolveStyle(placemark.styleUrl, styles, styleMaps);

    const strokeColor =
        style === null ? null :
        !style.outline ? TRANSPARENT :
        style.lineColor;
    const fillColor =
        style === null ? null :
        !style.fill ? TRANSPARENT :
        style.polyColor ?? style.iconColor;

    return {
        id: null,
        geometry,
        properties: placemark.properties,
        strokeColor,
        fillColor,
        strokeWidth: style?.lineWidth ?? null,
        pointRadius: null,
        visible: true,
    };
}

function resolveStyle(
    url: string | null,
    styles: Map<string, KMLStyle>,
    styleMaps: Map<string, string>,
): KMLStyle | null {
    if (url === null) return null;
    const direct = styles.get(url);
    if (direct) return direct;
    const normal = styleMaps.get(url);
    if (normal !== undefined) return styles.get(normal) ?? null;
    return null;
}
