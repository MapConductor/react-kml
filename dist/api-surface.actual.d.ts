import { GeoPointInterface, TileProvider, TileRequest } from '@mapconductor/js-sdk-core';
import React from 'react';

declare function colorArgb(a: number, r: number, g: number, b: number): number;
declare function colorRgb(r: number, g: number, b: number): number;
declare function colorAlpha(c: number): number;
declare function colorRed(c: number): number;
declare function colorGreen(c: number): number;
declare function colorBlue(c: number): number;
declare function argbToCss(argb: number): string;
declare const KMLDefaults: {
    readonly DEFAULT_OPACITY: 1;
    readonly DEFAULT_STROKE_COLOR: number;
    readonly DEFAULT_FILL_COLOR: number;
    readonly DEFAULT_STROKE_WIDTH: 2;
    readonly DEFAULT_POINT_RADIUS: 8;
    readonly DEFAULT_TILE_SIZE: 512;
    readonly DEFAULT_MAX_ZOOM: 22;
};

interface LonLat {
    readonly longitude: number;
    readonly latitude: number;
}
/**
 * KML geometry model. `Polygon` rings are in KML order: the first ring is the
 * exterior (`outerBoundaryIs`), subsequent rings are holes (`innerBoundaryIs`).
 * `GeometryCollection` represents a KML `<MultiGeometry>` — an unordered
 * collection of heterogeneous geometries.
 */
type KMLGeometry = {
    readonly type: 'Point';
    readonly longitude: number;
    readonly latitude: number;
} | {
    readonly type: 'MultiPoint';
    readonly points: ReadonlyArray<{
        readonly longitude: number;
        readonly latitude: number;
    }>;
} | {
    readonly type: 'LineString';
    readonly coordinates: ReadonlyArray<LonLat>;
} | {
    readonly type: 'MultiLineString';
    readonly lines: ReadonlyArray<ReadonlyArray<LonLat>>;
} | {
    readonly type: 'Polygon';
    readonly rings: ReadonlyArray<ReadonlyArray<LonLat>>;
} | {
    readonly type: 'MultiPolygon';
    readonly polygons: ReadonlyArray<ReadonlyArray<ReadonlyArray<LonLat>>>;
} | {
    readonly type: 'GeometryCollection';
    readonly geometries: ReadonlyArray<KMLGeometry>;
} | {
    readonly type: 'Empty';
};

/**
 * Lightweight, non-reactive data object for static/bulk KML features.
 * Use this (instead of KMLFeatureState) when loading large KML files
 * that don't need per-feature reactive updates — e.g. via KMLParser.parse.
 */
interface KMLFeatureData {
    readonly id?: string | null;
    readonly geometry: KMLGeometry;
    readonly properties: Readonly<Record<string, unknown>>;
    readonly strokeColor?: number | null;
    readonly fillColor?: number | null;
    readonly strokeWidth?: number | null;
    readonly pointRadius?: number | null;
    readonly visible: boolean;
}
declare function createKMLFeature(params: {
    id?: string | null;
    geometry: KMLGeometry;
    properties?: Record<string, unknown>;
    strokeColor?: number | null;
    fillColor?: number | null;
    strokeWidth?: number | null;
    pointRadius?: number | null;
    visible?: boolean;
}): KMLFeatureData;

/**
 * `<NetworkLink>` が参照する外部 KML/KMZ ドキュメント。
 *
 * `href` は `<Link>`（KML 2.0 の旧名 `<Url>`）配下の `<href>` の値そのままで、
 * 相対参照の解決は行っていない。KMLLoader が読み込み元 URL に対して解決する。
 */
interface KMLNetworkLink {
    readonly href: string;
    readonly visibility: boolean;
}
/**
 * KMLParser.parseDocument の結果。描画可能な `features` に加えて、
 * まだ取得していない外部参照 `networkLinks` を保持する。
 *
 * KMLParser.parse は `features` だけを返す従来 API。リンク先まで合流させた
 * リストが欲しい場合は KMLLoader を使う。
 */
interface KMLDocument {
    readonly features: KMLFeatureData[];
    readonly networkLinks: KMLNetworkLink[];
}

interface KMLFeatureFingerPrint {
    id: number;
    geometry: number;
    properties: number;
    style: number;
    visible: number;
}
declare class KMLFeatureState {
    readonly id: string;
    private _geometry;
    private _properties;
    private _strokeColor;
    private _fillColor;
    private _strokeWidth;
    private _pointRadius;
    private _visible;
    private readonly subject;
    constructor(params: {
        featureId?: string | null;
        geometry: KMLGeometry;
        properties?: Record<string, unknown>;
        strokeColor?: number | null;
        fillColor?: number | null;
        strokeWidth?: number | null;
        pointRadius?: number | null;
        visible?: boolean;
    });
    get geometry(): KMLGeometry;
    set geometry(v: KMLGeometry);
    get properties(): Record<string, unknown>;
    set properties(v: Record<string, unknown>);
    get strokeColor(): number | null;
    set strokeColor(v: number | null);
    get fillColor(): number | null;
    set fillColor(v: number | null);
    get strokeWidth(): number | null;
    set strokeWidth(v: number | null);
    get pointRadius(): number | null;
    set pointRadius(v: number | null);
    get visible(): boolean;
    set visible(v: boolean);
    fingerPrint(): KMLFeatureFingerPrint;
    asObservable(): {
        subscribe: (fn: (fp: KMLFeatureFingerPrint) => void) => () => void;
    };
}

/**
 * Resolves the render style for a KML feature. `defaultStyle` contains the
 * current layer-level stroke color, fill color, stroke width, and point radius.
 *
 * android-sdk の `KMLStyleProviderInterface.kt` に対応する。
 */
type KMLStyleProviderInterface = (feature: KMLFeatureData, defaultStyle: KMLLayerStyle) => KMLLayerStyle;
/** Preserves the existing feature-style-over-layer-style behavior. */
declare const DefaultKMLStyleProvider: KMLStyleProviderInterface;

/** レイヤ全体の既定スタイル。フィーチャー個別の指定が無いときに使われる。 */
interface KMLLayerStyle {
    strokeColor: number;
    fillColor: number;
    strokeWidth: number;
    pointRadius: number;
}

declare class KMLTileRenderer implements TileProvider {
    readonly tileSize: number;
    private cacheEpoch;
    private state;
    private readonly cache;
    private _canvas;
    private _ctx;
    private readonly pngBuf;
    constructor(params?: {
        tileSize?: number;
        cacheSizeKb?: number;
    });
    update(staticFeatures: KMLFeatureData[], dynamicFeatures: KMLFeatureState[], layerStyle: KMLLayerStyle, styleProvider?: KMLStyleProviderInterface): void;
    renderTile(request: TileRequest): Uint8Array | null;
    private getCtx;
    private renderTileInternal;
    private renderFeature;
    private renderGeometry;
    hitTest(longitude: number, latitude: number, lineTolSq?: number, pointTolSq?: number): KMLHitTestResult | null;
}
interface KMLHitTestResult {
    readonly feature: KMLFeatureData;
    readonly position: GeoPointInterface;
}

declare class KMLLayerState {
    opacity: number;
    strokeColor: number;
    fillColor: number;
    strokeWidth: number;
    pointRadius: number;
    visible: boolean;
    minZoom: number;
    maxZoom: number;
    /** Native provider factory id registered by the Android or iOS application. */
    readonly styleProviderId?: string | null;
    readonly onLoadStart?: (() => void) | null;
    readonly onLoadComplete?: ((error: Error | null) => void) | null;
    readonly onClick?: ((feature: KMLFeatureData, position: GeoPointInterface) => void) | null;
    constructor(params?: {
        opacity?: number;
        strokeColor?: number;
        fillColor?: number;
        strokeWidth?: number;
        pointRadius?: number;
        visible?: boolean;
        minZoom?: number;
        maxZoom?: number;
        styleProviderId?: string | null;
        onLoadStart?: (() => void) | null;
        onLoadComplete?: ((error: Error | null) => void) | null;
        onClick?: ((feature: KMLFeatureData, position: GeoPointInterface) => void) | null;
    });
    /**
     * Call from your map's click handler to perform feature hit-testing.
     * Returns true and invokes onClick if a feature is found at the given position.
     *
     * Pass `pixelTolerance` and `zoom` to use a pixel-based hit threshold instead of
     * the default world-coordinate tolerances. For example, `processClick(point, 10, zoom)`
     * fires when the click is within 10 pixels of the nearest line segment or point.
     * Polygons always hit on interior containment (holes excluded); the threshold only
     * widens their outline.
     */
    processClick(position: GeoPointInterface, pixelTolerance?: number, zoom?: number): boolean;
}

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
declare const KMLParser: {
    /** Parses a KML string into a list of static features. */
    parse(kml: string): KMLFeatureData[];
    /**
     * Parses KML text or KML/KMZ bytes into a KMLDocument, keeping unresolved
     * `<NetworkLink>` references alongside the parsed features.
     *
     * Binary input starting with the ZIP signature is treated as KMZ and the
     * first `.kml` entry in the archive (conventionally `doc.kml`) is used as
     * the document. KMZ inflation uses `DecompressionStream`, hence the
     * asynchronous result.
     */
    parseDocument(data: string | Uint8Array | ArrayBuffer): Promise<KMLDocument>;
};

/** 取得手段の注入点。URL を受け取り、KML テキストか KML/KMZ のバイト列を返す。 */
type KMLFetchFunction = (url: string) => Promise<Uint8Array | string>;
/**
 * KML/KMZ を URL から取得し、`<NetworkLink>` が参照する外部ドキュメントまで
 * たどって 1 枚のフィーチャリストへ平坦化するローダ。
 *
 * KML はインターネット上の別の KML/KMZ を参照できる（NetworkLink）ため、取得は
 * キュー + 訪問済みセットのループで回す。参照がどれだけ連鎖しても呼び出しスタックを
 * 消費せず、循環参照があっても各 URL を 1 回しか取得しない。
 *
 * - 取得数は `maxDocuments` 枚まで（ルート含む）。超過分のリンクは読まない。
 * - `visibility` が 0 の NetworkLink は追跡しない。
 * - リンク先の取得・解析失敗はそのリンクだけをスキップし `onDocumentError` へ通知する。
 *   ルート自身の失敗は `load` がそのまま投げる。
 * - `refreshInterval` などの再読込モードは扱わない（一度だけ読む）。
 *
 * `fetch` を差し替えると取得手段（テスト用スタブや独自 HTTP スタック）を注入できる。
 * 既定はグローバル `fetch`（リダイレクトは自動追従）。
 *
 * android-sdk の `KMLLoader.kt` と同じ意味論。
 */
declare class KMLLoader {
    static readonly DEFAULT_MAX_DOCUMENTS = 20;
    private readonly maxDocuments;
    private readonly onDocumentError;
    private readonly fetchFn;
    constructor(params?: {
        maxDocuments?: number;
        onDocumentError?: ((url: string, error: unknown) => void) | null;
        fetch?: KMLFetchFunction;
    });
    /**
     * Loads KML/KMZ and merges the documents referenced by its NetworkLinks.
     *
     * - `load(url)` — fetches the document from `url` (http / https / …) and
     *   resolves relative NetworkLink hrefs against it.
     * - `load(data, baseUrl?)` — parses caller-supplied KML text or KML/KMZ
     *   bytes. Relative hrefs resolve against `baseUrl`; when `baseUrl` is
     *   omitted only absolute links are followed.
     *
     * A string argument is treated as KML text when it starts with `<`
     * (after leading whitespace); otherwise it is treated as a URL.
     */
    load(source: string | Uint8Array | ArrayBuffer, baseUrl?: string): Promise<KMLFeatureData[]>;
    private collect;
    /** 相対 `href` を `base` に対して解決する。base 不明の相対参照は追跡できず null。 */
    static resolveHref(base: string | null, href: string): string | null;
}

interface KMLLayerProps {
    state?: KMLLayerState;
    features?: KMLFeatureData[];
    tileSize?: number;
    trackFeatureUpdates?: boolean;
    children?: React.ReactNode;
}
declare function KMLLayer(props: KMLLayerProps): React.ReactElement | null;
interface KMLFeatureStateProps {
    state: KMLFeatureState;
    geometry?: never;
}
interface KMLFeatureParamsProps {
    state?: never;
    geometry: KMLFeatureState['geometry'];
    featureId?: string | null;
    properties?: Record<string, unknown>;
    strokeColor?: number | null;
    fillColor?: number | null;
    strokeWidth?: number | null;
    pointRadius?: number | null;
    visible?: boolean;
}
type KMLFeatureProps = KMLFeatureStateProps | KMLFeatureParamsProps;
declare function KMLFeature(props: KMLFeatureStateProps): null;
declare function KMLFeature(props: KMLFeatureParamsProps): React.ReactElement | null;
interface KMLFeaturesProps {
    states: KMLFeatureState[];
}
declare function KMLFeatures({ states }: KMLFeaturesProps): null;

export { DefaultKMLStyleProvider, KMLDefaults, type KMLDocument, KMLFeature, type KMLFeatureData, type KMLFeatureFingerPrint, type KMLFeatureProps, KMLFeatureState, KMLFeatures, type KMLFeaturesProps, type KMLFetchFunction, type KMLGeometry, type KMLHitTestResult, KMLLayer, type KMLLayerProps, KMLLayerState, type KMLLayerStyle, KMLLoader, type KMLNetworkLink, KMLParser, type KMLStyleProviderInterface, KMLTileRenderer, type LonLat, argbToCss, colorAlpha, colorArgb, colorBlue, colorGreen, colorRed, colorRgb, createKMLFeature };
