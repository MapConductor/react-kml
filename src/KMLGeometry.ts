export interface LonLat {
    readonly longitude: number;
    readonly latitude: number;
}

/**
 * KML geometry model. `Polygon` rings are in KML order: the first ring is the
 * exterior (`outerBoundaryIs`), subsequent rings are holes (`innerBoundaryIs`).
 * `GeometryCollection` represents a KML `<MultiGeometry>` — an unordered
 * collection of heterogeneous geometries.
 */
export type KMLGeometry =
    | { readonly type: 'Point'; readonly longitude: number; readonly latitude: number }
    | { readonly type: 'MultiPoint'; readonly points: ReadonlyArray<{ readonly longitude: number; readonly latitude: number }> }
    | { readonly type: 'LineString'; readonly coordinates: ReadonlyArray<LonLat> }
    | { readonly type: 'MultiLineString'; readonly lines: ReadonlyArray<ReadonlyArray<LonLat>> }
    | { readonly type: 'Polygon'; readonly rings: ReadonlyArray<ReadonlyArray<LonLat>> }
    | { readonly type: 'MultiPolygon'; readonly polygons: ReadonlyArray<ReadonlyArray<ReadonlyArray<LonLat>>> }
    | { readonly type: 'GeometryCollection'; readonly geometries: ReadonlyArray<KMLGeometry> }
    | { readonly type: 'Empty' };
