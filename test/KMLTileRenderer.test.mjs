import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { test } from 'node:test';
import { buildEntries } from './support/build.mjs';

// KMLTileRenderer をそのまま動かす。canvas だけ描画命令を記録する偽物
// （globalThis.OffscreenCanvas）に差し替え、どのタイルに何が描かれるか、
// 空タイルは null、キャッシュと update による無効化、x の折り返し、
// 索引あり（256 件以上）/なしの当たり判定、KMLLayerState.processClick の
// ピクセル許容、KMLFeatureState の ID・フィンガープリント・通知を確かめる。
const canvases = [];
class FakeCtx {
    constructor(size) { this.size = size; this.ops = []; }
    clearRect(...a) { this.ops.push(['clearRect', ...a]); }
    beginPath() { this.ops.push(['beginPath']); }
    arc(x, y, r) { this.ops.push(['arc', x, y, r, this.fillStyle]); }
    moveTo(x, y) { this.ops.push(['moveTo', x, y]); }
    lineTo(x, y) { this.ops.push(['lineTo', x, y]); }
    closePath() { this.ops.push(['closePath']); }
    fill(rule) { this.ops.push(['fill', this.fillStyle, rule]); }
    stroke() { this.ops.push(['stroke', this.strokeStyle, this.lineWidth]); }
    getImageData(x, y, w, h) {
        const data = new Uint8ClampedArray(w * h * 4);
        data[0] = 7; // marker so the PNG can be traced back to this buffer
        return { data };
    }
}
globalThis.OffscreenCanvas = class {
    constructor(w, h) { this.width = w; this.height = h; this.ctx = new FakeCtx(w); canvases.push(this); }
    getContext(kind) { assert.equal(kind, '2d'); return this.ctx; }
};

const { renderer, layerState, featureState, colors } = await buildEntries('tile-renderer-tests', {
    renderer: 'src/KMLTileRenderer.ts',
    layerState: 'src/KMLLayerState.ts',
    featureState: 'src/KMLFeatureState.ts',
    colors: 'src/KMLDefaults.ts',
});
const { KMLTileRenderer } = renderer;
const { KMLLayerState } = layerState;
const { KMLFeatureState } = featureState;
const { colorArgb } = colors;

const layerStyle = { strokeColor: colorArgb(255, 255, 0, 0), fillColor: colorArgb(255, 0, 0, 255), strokeWidth: 2, pointRadius: 4 };
const point = (longitude, latitude, extra = {}) => ({ geometry: { type: 'Point', longitude, latitude }, properties: {}, visible: true, ...extra });
const ops = (r) => r._ctx.ops;
const opsOf = (r, name) => ops(r).filter((o) => o[0] === name);

test('no features: every tile is null and no canvas is created', () => {
    const before = canvases.length;
    const r = new KMLTileRenderer({ tileSize: 256 });
    assert.equal(r.renderTile({ x: 0, y: 0, z: 0 }), null);
    r.update([], [], layerStyle);
    assert.equal(r.renderTile({ x: 0, y: 0, z: 0 }), null);
    assert.equal(canvases.length, before);
});

test('a point is drawn only on its tile, at the right pixel, and encoded as a PNG', () => {
    const r = new KMLTileRenderer({ tileSize: 256 });
    r.update([point(90, 0.0001)], [], layerStyle);
    assert.equal(r.renderTile({ x: 0, y: 0, z: 1 }), null);
    assert.equal(r.renderTile({ x: 1, y: 1, z: 1 }), null, 'just north of the equator');
    const png = r.renderTile({ x: 1, y: 0, z: 1 });
    assert.ok(png instanceof Uint8Array);
    assert.deepEqual([...png.subarray(1, 4)], [0x50, 0x4e, 0x47]);
    // The PNG carries the canvas pixels (first byte after the row filter = 7).
    const idatStart = 8 + 25 + 8;
    assert.equal(inflateSync(png.subarray(idatStart, png.length - 12 - 4))[1], 7);
    const [arc] = opsOf(r, 'arc').slice(-1);
    // lon 90 -> wx 0.75; z1 worldSize 512; tile origin x 256 -> px 128.
    assert.equal(arc[1], 128);
    assert.ok(Math.abs(arc[2] - 256) < 0.01);
    assert.equal(arc[3], 4);
    assert.deepEqual(opsOf(r, 'fill').at(-1), ['fill', 'rgba(0,0,255,1.0000)', undefined]);
    assert.deepEqual(opsOf(r, 'stroke').at(-1), ['stroke', 'rgba(255,0,0,1.0000)', 2]);
});

test('tiles are cached (including empty ones) until update() invalidates them', () => {
    const r = new KMLTileRenderer({ tileSize: 256 });
    r.update([point(90, 45)], [], layerStyle);
    const first = r.renderTile({ x: 1, y: 0, z: 1 });
    assert.equal(r.renderTile({ x: 0, y: 1, z: 1 }), null);
    const drawn = ops(r).length;
    assert.equal(r.renderTile({ x: 1, y: 0, z: 1 }), first);
    assert.equal(r.renderTile({ x: 0, y: 1, z: 1 }), null);
    assert.equal(ops(r).length, drawn, 'nothing re-drawn');

    r.update([point(-90, -45)], [], layerStyle);
    assert.equal(r.renderTile({ x: 1, y: 0, z: 1 }), null);
    assert.ok(r.renderTile({ x: 0, y: 1, z: 1 }));
});

test('x wraps around the antimeridian; y outside the world is empty', () => {
    const r = new KMLTileRenderer({ tileSize: 256 });
    r.update([point(90, 45)], [], layerStyle);
    assert.ok(r.renderTile({ x: -1, y: 0, z: 1 }));
    assert.ok(r.renderTile({ x: 3, y: 0, z: 1 }));
    assert.equal(r.renderTile({ x: 1, y: -1, z: 1 }), null);
    assert.equal(r.renderTile({ x: 1, y: 2, z: 1 }), null);
});

test('invisible features are dropped; feature colors override the layer style', () => {
    const r = new KMLTileRenderer({ tileSize: 256 });
    r.update([point(90, 45, { visible: false })], [], layerStyle);
    assert.equal(r.renderTile({ x: 1, y: 0, z: 1 }), null);

    r.update([point(90, 45, { fillColor: colorArgb(255, 0, 255, 0), strokeColor: 0 })], [], layerStyle);
    assert.ok(r.renderTile({ x: 1, y: 0, z: 1 }));
    assert.equal(opsOf(r, 'fill').at(-1)[1], 'rgba(0,255,0,1.0000)');
    assert.equal(opsOf(r, 'stroke').length, 0, 'transparent stroke is not drawn');
});

test('polygons fill with evenodd (holes) and lines are stroked', () => {
    const r = new KMLTileRenderer({ tileSize: 256 });
    const ring = (a) => [{ longitude: -a, latitude: -a }, { longitude: a, latitude: -a }, { longitude: a, latitude: a }, { longitude: -a, latitude: a }, { longitude: -a, latitude: -a }];
    r.update([
        { geometry: { type: 'Polygon', rings: [ring(40), ring(10)] }, properties: {}, visible: true },
        { geometry: { type: 'LineString', coordinates: [{ longitude: -100, latitude: 50 }, { longitude: 100, latitude: 50 }] }, properties: {}, visible: true, strokeWidth: 3 },
    ], [], layerStyle);
    assert.ok(r.renderTile({ x: 0, y: 0, z: 0 }));
    assert.equal(opsOf(r, 'closePath').length, 2, 'outer ring and hole');
    assert.deepEqual(opsOf(r, 'fill').at(-1), ['fill', 'rgba(0,0,255,1.0000)', 'evenodd']);
    assert.deepEqual(opsOf(r, 'stroke').map((s) => s[2]), [2, 3]);
});

test('hitTest: topmost (last added) feature wins and the snapped position is returned', () => {
    const r = new KMLTileRenderer({ tileSize: 256 });
    r.update([point(10, 10, { id: 'under' }), point(10, 10, { id: 'over' })], [], layerStyle);
    const hit = r.hitTest(10.001, 10.001);
    assert.equal(hit.feature.id, 'over');
    assert.ok(Math.abs(hit.position.longitude - 10) < 1e-9);
    assert.ok(Math.abs(hit.position.latitude - 10) < 1e-9);
    assert.equal(hit.feature.geometry.type, 'Empty', 'source geometry is not kept');
    assert.equal(r.hitTest(20, 20), null);
});

test('hitTest uses the spatial index once there are >= 256 features', () => {
    const r = new KMLTileRenderer({ tileSize: 256 });
    const features = [];
    for (let i = 0; i < 300; i++) features.push(point(-150 + i, (i % 50) - 25, { id: `f${i}` }));
    r.update(features, [], layerStyle);
    assert.ok(r.state.index, 'index built');
    assert.equal(r.hitTest(-150 + 123, (123 % 50) - 25).feature.id, 'f123');
    assert.equal(r.hitTest(170, 80), null);
    // Tiles still render through the index path.
    assert.ok(r.renderTile({ x: 0, y: 0, z: 0 }));
});

test('dynamic KMLFeatureState features render and hit alongside static ones', () => {
    const r = new KMLTileRenderer({ tileSize: 256 });
    const state = new KMLFeatureState({ featureId: 'dyn', geometry: { type: 'Point', longitude: -60, latitude: -30 }, properties: { a: 1 } });
    r.update([point(60, 30)], [state], layerStyle);
    const hit = r.hitTest(-60, -30);
    assert.equal(hit.feature.id, 'dyn');
    assert.deepEqual(hit.feature.properties, { a: 1 });
    state.visible = false;
    r.update([point(60, 30)], [state], layerStyle);
    assert.equal(r.hitTest(-60, -30), null);
});

test('KMLLayerState: defaults and processClick with world and pixel tolerances', () => {
    const clicks = [];
    const s = new KMLLayerState({ onClick: (f, p) => clicks.push([f.id, p.longitude]) });
    assert.deepEqual([s.opacity, s.strokeWidth, s.pointRadius, s.visible, s.minZoom, s.maxZoom], [1, 2, 8, true, 0, 22]);
    assert.equal(s.processClick({ longitude: 0, latitude: 0 }), false, 'no renderer yet');

    const r = new KMLTileRenderer({ tileSize: 256 });
    r.update([point(0, 0, { id: 'p' })], [], layerStyle);
    s.renderer = r;
    // 0.5 degrees ~ 0.0014 world units: outside the default point tolerance (0.0004).
    assert.equal(s.processClick({ longitude: 0.5, latitude: 0 }), false);
    // At z10 one world unit = 262144 px, so 0.5° ≈ 364 px; 10 px tolerance -> point tol 20 px: miss.
    assert.equal(s.processClick({ longitude: 0.5, latitude: 0 }, 10, 10), false);
    // At z2 0.5° ≈ 1.4 px: hit.
    assert.equal(s.processClick({ longitude: 0.5, latitude: 0 }, 10, 2), true);
    assert.deepEqual(clicks, [['p', 0]]);
});

test('KMLFeatureState: deterministic default id, fingerprint changes, distinct notifications', () => {
    const geometry = { type: 'Point', longitude: 1, latitude: 2 };
    const a = new KMLFeatureState({ geometry, properties: { k: 'v' } });
    const b = new KMLFeatureState({ geometry: { ...geometry }, properties: { k: 'v' } });
    const c = new KMLFeatureState({ geometry, properties: { k: 'w' } });
    assert.equal(a.id, b.id);
    assert.notEqual(a.id, c.id);
    assert.equal(new KMLFeatureState({ featureId: 'x', geometry }).id, 'x');

    const seen = [];
    const unsubscribe = a.asObservable().subscribe((fp) => seen.push(fp));
    assert.equal(seen.length, 1, 'replays the current fingerprint on subscribe');
    const fp0 = a.fingerPrint();
    a.strokeColor = 0xff00ff00 | 0;
    assert.notEqual(a.fingerPrint().style, fp0.style);
    a.strokeColor = 0xff00ff00 | 0; // same value: no new notification
    a.visible = false;
    assert.equal(a.fingerPrint().visible, 0);
    a.geometry = { type: 'Point', longitude: 3, latitude: 4 };
    assert.notEqual(a.fingerPrint().geometry, fp0.geometry);
    assert.equal(seen.length, 4);
    unsubscribe();
    a.properties = { other: true };
    assert.equal(seen.length, 4);
});
