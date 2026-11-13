import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEntries } from './support/build.mjs';

// 描画と当たり判定の土台になる純粋計算: Web メルカトルの世界座標変換、
// 範囲計算、放射距離による間引きとズーム別キャッシュ、格子索引、
// ジオメトリ単位の当たり判定（穴あきポリゴン・許容距離）、スタイル解決。
const { world, hit, index, render, provider } = await buildEntries('geometry-tests', {
    world: 'src/KMLWorld.ts',
    hit: 'src/KMLHitTester.ts',
    index: 'src/KMLSpatialIndex.ts',
    render: 'src/KMLRenderFeature.ts',
    provider: 'src/KMLStyleProviderInterface.ts',
});
const {
    lonToWorld, latToWorld, worldToLon, worldToLat, toPixel, segmentOutside,
    simplifyRadial, WorldRing, WorldBounds, toWorldGeometry, computeBounds, MAX_SIMPLIFY_ZOOM,
} = world;
const { hitTestGeometry, pointInRing, closestPointOnSegment, HIT_POINT_TOLERANCE, HIT_LINE_TOLERANCE } = hit;
const { SpatialIndex, INDEX_GRID_SIZE } = index;
const { buildRenderFeature, buildRenderFeatureFromData } = render;
const { DefaultKMLStyleProvider } = provider;

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('lon/lat <-> world round-trips and has the expected anchors', () => {
    assert.equal(lonToWorld(-180), 0);
    assert.equal(lonToWorld(0), 0.5);
    assert.equal(lonToWorld(180), 1);
    close(latToWorld(0), 0.5);
    assert.ok(latToWorld(60) < 0.5, 'north is up (smaller y)');
    for (const [lon, lat] of [[139.69, 35.68], [-74, 40.7], [0, -60], [179.9, 84]]) {
        close(worldToLon(lonToWorld(lon)), lon);
        close(worldToLat(latToWorld(lat)), lat, 1e-7);
    }
    // Poles are clamped rather than becoming infinite.
    assert.ok(Number.isFinite(latToWorld(90)) && latToWorld(90) > -0.5);
    assert.equal(toPixel(0.25, 1024, 100), 156);
});

test('segmentOutside only rejects segments entirely on one side of the box', () => {
    assert.equal(segmentOutside(-2, 0, -1, 1, 0, 0, 1, 1), true);
    assert.equal(segmentOutside(0, 2, 1, 3, 0, 0, 1, 1), true);
    // Crosses the box diagonally: not rejected.
    assert.equal(segmentOutside(-1, 0.5, 2, 0.5, 0, 0, 1, 1), false);
});

test('simplifyRadial keeps endpoints and drops points within tolerance', () => {
    const coords = new Float64Array([0, 0, 0.1, 0, 0.2, 0, 1, 0, 1.05, 0, 2, 0]);
    assert.deepEqual([...simplifyRadial(coords, 0.5)], [0, 0, 1, 0, 2, 0]);
    // Nothing to drop / tolerance off: returns the same array.
    assert.equal(simplifyRadial(coords, 0), coords);
    const short = new Float64Array([0, 0, 1, 1]);
    assert.equal(simplifyRadial(short, 10), short);
    // The last point is always kept, even if within tolerance of the previous kept one.
    assert.deepEqual([...simplifyRadial(new Float64Array([0, 0, 5, 5, 5.01, 5]), 1)], [0, 0, 5, 5, 5.01, 5]);
});

test('WorldRing simplifies per zoom and caches; high zooms share the max bucket', () => {
    const coords = new Float64Array(200);
    for (let i = 0; i < 100; i++) { coords[i * 2] = 0.5 + i * 1e-7; coords[i * 2 + 1] = 0.5; }
    const ring = new WorldRing(coords);
    const low = ring.coordsForZoom(0, 256);
    assert.equal(low.length, 4, 'at z0 everything collapses to the endpoints');
    assert.equal(ring.coordsForZoom(0, 256), low, 'cached');
    assert.equal(ring.coordsForZoom(30, 256), ring.coordsForZoom(MAX_SIMPLIFY_ZOOM, 256));
    assert.equal(ring.coordsForZoom(22, 256).length, 200, 'nothing dropped at max zoom');
    const tiny = new WorldRing(new Float64Array([0, 0, 1, 1]));
    assert.equal(tiny.coordsForZoom(0, 256), tiny.coords);
});

test('toWorldGeometry covers every KML geometry kind and computeBounds encloses it', () => {
    const p = toWorldGeometry({ type: 'Point', longitude: 0, latitude: 0 });
    assert.deepEqual({ ...p, wy: Math.round(p.wy * 1e9) / 1e9 }, { type: 'Point', wx: 0.5, wy: 0.5 });
    const mp = toWorldGeometry({ type: 'MultiPoint', points: [{ longitude: -180, latitude: 0 }, { longitude: 180, latitude: 0 }] });
    assert.equal(mp.type, 'Points');
    assert.deepEqual([mp.points[0], mp.points[2]], [0, 1]);
    const ml = toWorldGeometry({ type: 'MultiLineString', lines: [[{ longitude: 0, latitude: 0 }, { longitude: 90, latitude: 0 }], [{ longitude: -90, latitude: 0 }]] });
    assert.equal(ml.type, 'Line');
    assert.equal(ml.rings.length, 2);
    const mpoly = toWorldGeometry({ type: 'MultiPolygon', polygons: [[[{ longitude: 0, latitude: 0 }]], [[{ longitude: 90, latitude: 10 }]]] });
    assert.equal(mpoly.type, 'Collection');
    assert.deepEqual(mpoly.parts.map((x) => x.type), ['Polygon', 'Polygon']);
    const b = computeBounds(mpoly);
    close(b.minX, 0.5); close(b.maxX, 0.75);
    close(b.maxY, 0.5); assert.ok(b.minY < 0.5);
    assert.deepEqual({ ...computeBounds(toWorldGeometry({ type: 'Empty' })) }, { minX: 0, maxX: 1, minY: 0, maxY: 1 });
    assert.deepEqual({ ...computeBounds({ type: 'Collection', parts: [] }) }, { minX: 0, maxX: 1, minY: 0, maxY: 1 });
    assert.deepEqual({ ...computeBounds({ type: 'Line', rings: [] }) }, { minX: 0, maxX: 1, minY: 0, maxY: 1 });
});

test('WorldBounds.intersects is inclusive at the edges', () => {
    const b = new WorldBounds(0.2, 0.4, 0.2, 0.4);
    assert.equal(b.intersects(0.4, 0.4, 0.5, 0.5), true);
    assert.equal(b.intersects(0.41, 0.2, 0.5, 0.3), false);
    assert.equal(b.intersects(0, 0, 1, 1), true);
});

// ── hit testing ──────────────────────────────────────────────────────────────

const ring = (...xy) => new WorldRing(new Float64Array(xy));
const square = ring(0.4, 0.4, 0.6, 0.4, 0.6, 0.6, 0.4, 0.6, 0.4, 0.4);
const hole = ring(0.45, 0.45, 0.55, 0.45, 0.55, 0.55, 0.45, 0.55, 0.45, 0.45);

test('pointInRing / closestPointOnSegment', () => {
    assert.equal(pointInRing(0.5, 0.5, square.coords), true);
    assert.equal(pointInRing(0.7, 0.5, square.coords), false);
    const c = closestPointOnSegment(0.5, 1, 0, 0, 1, 0);
    assert.deepEqual(c, { wx: 0.5, wy: 0, distanceSq: 1 });
    // Clamped to the segment's end.
    assert.deepEqual(closestPointOnSegment(2, 0, 0, 0, 1, 0), { wx: 1, wy: 0, distanceSq: 1 });
    // Degenerate segment.
    assert.deepEqual(closestPointOnSegment(3, 4, 0, 0, 0, 0), { wx: 0, wy: 0, distanceSq: 25 });
});

test('polygon hit: interior hits at the tap, holes miss, outline tolerance only when given', () => {
    const poly = { type: 'Polygon', rings: [square, hole] };
    assert.deepEqual(hitTestGeometry(0.42, 0.42, poly), { wx: 0.42, wy: 0.42, distanceSq: 0 });
    assert.equal(hitTestGeometry(0.5, 0.5, poly), null, 'inside the hole');
    const justOutside = 0.6 + 0.0001;
    assert.equal(hitTestGeometry(justOutside, 0.5, poly), null);
    assert.equal(hitTestGeometry(justOutside, 0.5, poly, null), null, 'null means "unspecified"');
    const edge = hitTestGeometry(justOutside, 0.5, poly, 0.001 ** 2);
    close(edge.wx, 0.6); close(edge.wy, 0.5);
    assert.equal(hitTestGeometry(0.5, 0.5, { type: 'Polygon', rings: [] }), null);
});

test('point, multipoint and line hits use their default tolerances', () => {
    const pt = { type: 'Point', wx: 0.5, wy: 0.5 };
    assert.ok(hitTestGeometry(0.5 + HIT_POINT_TOLERANCE * 0.9, 0.5, pt));
    assert.equal(hitTestGeometry(0.5 + HIT_POINT_TOLERANCE * 1.1, 0.5, pt), null);
    assert.ok(hitTestGeometry(0.5 + 0.01, 0.5, pt, undefined, 0.02 ** 2), 'custom point tolerance');

    const pts = { type: 'Points', points: new Float64Array([0.1, 0.1, 0.5, 0.5, 0.5001, 0.5]) };
    const best = hitTestGeometry(0.50009, 0.5, pts);
    assert.deepEqual([best.wx, best.wy], [0.5001, 0.5], 'nearest of several points');

    const line = { type: 'Line', rings: [ring(0, 0.5, 1, 0.5)] };
    const h = hitTestGeometry(0.3, 0.5 + HIT_LINE_TOLERANCE * 0.5, line);
    close(h.wx, 0.3); close(h.wy, 0.5);
    assert.equal(hitTestGeometry(0.3, 0.5 + HIT_LINE_TOLERANCE * 2, line), null);
});

test('collection hit returns the closest part; Empty never hits', () => {
    const geom = {
        type: 'Collection',
        parts: [{ type: 'Point', wx: 0.5, wy: 0.5 }, { type: 'Point', wx: 0.5001, wy: 0.5 }, { type: 'Empty' }],
    };
    assert.equal(hitTestGeometry(0.50008, 0.5, geom).wx, 0.5001);
    assert.equal(hitTestGeometry(0.5, 0.5, { type: 'Empty' }), null);
});

// ── spatial index ────────────────────────────────────────────────────────────

test('SpatialIndex returns each overlapping feature once, in insertion order', () => {
    const feat = (minX, maxX, minY, maxY) => ({ bounds: new WorldBounds(minX, maxX, minY, maxY) });
    const features = [
        feat(0.1, 0.9, 0.1, 0.9), // spans many cells
        feat(0.01, 0.011, 0.01, 0.011),
        feat(0.95, 0.96, 0.95, 0.96),
        feat(-1, 2, -1, 2), // outside the world, clamped to all cells
    ];
    const idx = new SpatialIndex(features);
    assert.deepEqual(idx.query(0.5, 0.5, 0.6, 0.6), [0, 3]);
    assert.deepEqual(idx.query(0, 0, 0.02, 0.02), [1, 3]);
    assert.deepEqual(idx.query(0, 0, 1, 1), [1, 3, 0, 2]);
    assert.equal(INDEX_GRID_SIZE, 64);
});

// ── render features & style provider ────────────────────────────────────────

const layerStyle = { strokeColor: 0xff112233 | 0, fillColor: 0x80445566 | 0, strokeWidth: 2, pointRadius: 8 };

test('DefaultKMLStyleProvider: feature style over layer style, field by field', () => {
    const style = DefaultKMLStyleProvider({ strokeColor: 0, fillColor: null, strokeWidth: 5 }, layerStyle);
    assert.deepEqual(style, { strokeColor: 0, fillColor: layerStyle.fillColor, strokeWidth: 5, pointRadius: 8 });
});

test('buildRenderFeature: css colors, no stroke when transparent or zero width, geometry stripped', () => {
    const source = { id: 'a', geometry: { type: 'Point', longitude: 0, latitude: 0 }, properties: { k: 1 }, visible: true };
    const rf = buildRenderFeatureFromData(source, layerStyle, DefaultKMLStyleProvider);
    assert.equal(rf.fillStyle, 'rgba(68,85,102,0.5020)');
    assert.equal(rf.strokeStyle, 'rgba(17,34,51,1.0000)');
    assert.equal(rf.strokeWidth, 2);
    assert.equal(rf.pointRadius, 8);
    assert.deepEqual(rf.source.geometry, { type: 'Empty' });
    assert.deepEqual(rf.source.properties, { k: 1 });
    assert.equal(source.geometry.type, 'Point', 'the input is not mutated');
    close(rf.bounds.minX, 0.5);

    assert.equal(buildRenderFeature(source, source.geometry, 0x00ffffff, 0, 2, 1).strokeStyle, null);
    assert.equal(buildRenderFeature(source, source.geometry, -1, 0, 0, 1).strokeStyle, null);

    const custom = (_f, d) => ({ ...d, strokeWidth: 9 });
    assert.equal(buildRenderFeatureFromData(source, layerStyle, custom).strokeWidth, 9);
});
