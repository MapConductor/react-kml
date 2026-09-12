import type { KMLGeometry, LonLat } from './KMLGeometry';
import {
    END_DOCUMENT,
    END_TAG,
    KMLXmlPullParser,
    START_TAG,
    forEachChild,
    parseCoordinates,
    readText,
    skip,
} from './KMLXmlSupport';

/**
 * `<Point>` / `<LineString>` / `<LinearRing>` / `<Polygon>` / `<MultiGeometry>` の読み取り。
 *
 * `<Polygon>` は外環（outerBoundaryIs）に続けて穴（innerBoundaryIs）を並べた形で持つ。
 * 描画側は「最初の環が外、以降が穴」という約束で扱うので、その順序をここで作る。
 *
 * android-sdk の `KMLGeometryReader.kt` と同じ読み方。
 */

export function readGeometry(parser: KMLXmlPullParser, type: string): KMLGeometry | null {
    switch (type) {
        case 'Point': {
            const coords = readCoordinatesChild(parser);
            const first = coords.length > 0 ? coords[0] : null;
            return first ? { type: 'Point', longitude: first.longitude, latitude: first.latitude } : null;
        }
        case 'LineString':
        case 'LinearRing': {
            const coords = readCoordinatesChild(parser);
            return coords.length === 0 ? null : { type: 'LineString', coordinates: coords };
        }
        case 'Polygon':
            return readPolygon(parser);
        case 'MultiGeometry':
            return readMultiGeometry(parser);
        default:
            skip(parser);
            return null;
    }
}

export function readPolygon(parser: KMLXmlPullParser): KMLGeometry | null {
    // TS does not track assignments made inside the forEachChild callback, so
    // the outer ring lives on a holder object instead of a narrowed local.
    const boundary: { outer: LonLat[] | null } = { outer: null };
    const inners: LonLat[][] = [];
    forEachChild(parser, (name) => {
        switch (name) {
            case 'outerBoundaryIs':
                boundary.outer = readBoundary(parser);
                break;
            case 'innerBoundaryIs': {
                const inner = readBoundary(parser);
                if (inner) inners.push(inner);
                break;
            }
            default:
                skip(parser);
        }
    });
    const exterior = boundary.outer;
    if (!exterior || exterior.length === 0) return null;
    const rings: LonLat[][] = [exterior, ...inners];
    return { type: 'Polygon', rings };
}

/** Reads an `<outerBoundaryIs>` / `<innerBoundaryIs>` wrapper containing a `<LinearRing>`. */
export function readBoundary(parser: KMLXmlPullParser): LonLat[] | null {
    let coords: LonLat[] | null = null;
    forEachChild(parser, (name) => {
        if (name === 'LinearRing') {
            coords = readCoordinatesChild(parser);
        } else {
            skip(parser);
        }
    });
    return coords;
}

/**
 * `<MultiGeometry>` はネスト可能なので、明示スタック + ループで読む（再帰しない）。
 * リーフ要素の読み取りは自分の END_TAG まで消費するため、このループに見える
 * END_TAG は MultiGeometry 自身の閉じタグだけになる。
 */
export function readMultiGeometry(parser: KMLXmlPullParser): KMLGeometry {
    const stack: KMLGeometry[][] = [[]];
    for (;;) {
        switch (parser.next()) {
            case START_TAG: {
                const name = parser.name;
                switch (name) {
                    case 'MultiGeometry':
                        stack.push([]);
                        break;
                    case 'Point':
                    case 'LineString':
                    case 'LinearRing':
                    case 'Polygon': {
                        const geometry = readGeometry(parser, name);
                        if (geometry) stack[stack.length - 1].push(geometry);
                        break;
                    }
                    default:
                        skip(parser);
                }
                break;
            }
            case END_TAG: {
                const closed: KMLGeometry = { type: 'GeometryCollection', geometries: stack.pop()! };
                if (stack.length === 0) return closed;
                stack[stack.length - 1].push(closed);
                break;
            }
            case END_DOCUMENT:
                return { type: 'GeometryCollection', geometries: stack[0] };
        }
    }
}

/** Reads the `<coordinates>` child of the current geometry element. */
export function readCoordinatesChild(parser: KMLXmlPullParser): LonLat[] {
    let coords: LonLat[] = [];
    forEachChild(parser, (name) => {
        if (name === 'coordinates') {
            coords = parseCoordinates(readText(parser));
        } else {
            skip(parser);
        }
    });
    return coords;
}
