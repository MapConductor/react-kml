"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DefaultKMLStyleProvider: () => DefaultKMLStyleProvider,
  KMLDefaults: () => KMLDefaults,
  KMLFeature: () => KMLFeature,
  KMLFeatureState: () => KMLFeatureState,
  KMLFeatures: () => KMLFeatures,
  KMLLayer: () => KMLLayer,
  KMLLayerState: () => KMLLayerState,
  KMLLoader: () => KMLLoader,
  KMLParser: () => KMLParser,
  KMLTileRenderer: () => KMLTileRenderer,
  argbToCss: () => argbToCss,
  colorAlpha: () => colorAlpha,
  colorArgb: () => colorArgb,
  colorBlue: () => colorBlue,
  colorGreen: () => colorGreen,
  colorRed: () => colorRed,
  colorRgb: () => colorRgb,
  createKMLFeature: () => createKMLFeature
});
module.exports = __toCommonJS(index_exports);

// src/KMLDefaults.ts
function colorArgb(a, r, g, b) {
  return a << 24 | r << 16 | g << 8 | b | 0;
}
function colorRgb(r, g, b) {
  return 4278190080 | r << 16 | g << 8 | b | 0;
}
function colorAlpha(c) {
  return c >>> 24 & 255;
}
function colorRed(c) {
  return c >>> 16 & 255;
}
function colorGreen(c) {
  return c >>> 8 & 255;
}
function colorBlue(c) {
  return c & 255;
}
function argbToCss(argb) {
  const u = argb >>> 0;
  const a = (u >>> 24 & 255) / 255;
  const r = u >>> 16 & 255;
  const g = u >>> 8 & 255;
  const b = u & 255;
  return `rgba(${r},${g},${b},${a.toFixed(4)})`;
}
var KMLDefaults = {
  DEFAULT_OPACITY: 1,
  DEFAULT_STROKE_COLOR: colorArgb(255, 30, 136, 229),
  DEFAULT_FILL_COLOR: colorArgb(128, 30, 136, 229),
  DEFAULT_STROKE_WIDTH: 2,
  DEFAULT_POINT_RADIUS: 8,
  DEFAULT_TILE_SIZE: 512,
  DEFAULT_MAX_ZOOM: 22
};

// src/KMLFeature.ts
function createKMLFeature(params) {
  return {
    id: params.id ?? null,
    geometry: params.geometry,
    properties: params.properties ?? {},
    strokeColor: params.strokeColor ?? null,
    fillColor: params.fillColor ?? null,
    strokeWidth: params.strokeWidth ?? null,
    pointRadius: params.pointRadius ?? null,
    visible: params.visible ?? true
  };
}

// src/KMLFeatureState.ts
var import_js_sdk_core = require("@mapconductor/js-sdk-core");
function fpEquals(a, b) {
  return a.id === b.id && a.geometry === b.geometry && a.properties === b.properties && a.style === b.style && a.visible === b.visible;
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h;
}
function objectHash(obj) {
  try {
    return hashStr(JSON.stringify(obj) ?? "");
  } catch {
    return 0;
  }
}
function buildDefaultId(geometry, properties) {
  return (objectHash(geometry) * 31 + objectHash(properties) | 0).toString();
}
var KMLFeatureState = class {
  constructor(params) {
    this.subject = (0, import_js_sdk_core.createSubject)(fpEquals);
    this._geometry = params.geometry;
    this._properties = params.properties ?? {};
    this._strokeColor = params.strokeColor ?? null;
    this._fillColor = params.fillColor ?? null;
    this._strokeWidth = params.strokeWidth ?? null;
    this._pointRadius = params.pointRadius ?? null;
    this._visible = params.visible ?? true;
    this.id = params.featureId ?? buildDefaultId(this._geometry, this._properties);
    this.subject.next(this.fingerPrint());
  }
  get geometry() {
    return this._geometry;
  }
  set geometry(v) {
    this._geometry = v;
    this.subject.next(this.fingerPrint());
  }
  get properties() {
    return this._properties;
  }
  set properties(v) {
    this._properties = v;
    this.subject.next(this.fingerPrint());
  }
  get strokeColor() {
    return this._strokeColor;
  }
  set strokeColor(v) {
    this._strokeColor = v;
    this.subject.next(this.fingerPrint());
  }
  get fillColor() {
    return this._fillColor;
  }
  set fillColor(v) {
    this._fillColor = v;
    this.subject.next(this.fingerPrint());
  }
  get strokeWidth() {
    return this._strokeWidth;
  }
  set strokeWidth(v) {
    this._strokeWidth = v;
    this.subject.next(this.fingerPrint());
  }
  get pointRadius() {
    return this._pointRadius;
  }
  set pointRadius(v) {
    this._pointRadius = v;
    this.subject.next(this.fingerPrint());
  }
  get visible() {
    return this._visible;
  }
  set visible(v) {
    this._visible = v;
    this.subject.next(this.fingerPrint());
  }
  fingerPrint() {
    const styleHash = (this._strokeColor ?? 0) * 31 ^ (this._fillColor ?? 0) * 961 ^ ((this._strokeWidth ?? 0) * 1e3 | 0) * 29791 ^ ((this._pointRadius ?? 0) * 1e3 | 0) * 923521 | 0;
    return {
      id: hashStr(this.id),
      geometry: objectHash(this._geometry),
      properties: objectHash(this._properties),
      style: styleHash,
      visible: this._visible ? 1 : 0
    };
  }
  asObservable() {
    return { subscribe: this.subject.subscribe };
  }
};

// src/KMLLayerState.ts
var KMLLayerState = class {
  constructor(params = {}) {
    /** @internal set by KMLLayer */
    this.renderer = null;
    this.opacity = params.opacity ?? KMLDefaults.DEFAULT_OPACITY;
    this.strokeColor = params.strokeColor ?? KMLDefaults.DEFAULT_STROKE_COLOR;
    this.fillColor = params.fillColor ?? KMLDefaults.DEFAULT_FILL_COLOR;
    this.strokeWidth = params.strokeWidth ?? KMLDefaults.DEFAULT_STROKE_WIDTH;
    this.pointRadius = params.pointRadius ?? KMLDefaults.DEFAULT_POINT_RADIUS;
    this.visible = params.visible ?? true;
    this.minZoom = params.minZoom ?? 0;
    this.maxZoom = params.maxZoom ?? 22;
    this.styleProviderId = params.styleProviderId ?? null;
    this.onLoadStart = params.onLoadStart ?? null;
    this.onLoadComplete = params.onLoadComplete ?? null;
    this.onClick = params.onClick ?? null;
  }
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
  processClick(position, pixelTolerance, zoom) {
    let lineTolSq;
    let pointTolSq;
    if (pixelTolerance !== void 0 && zoom !== void 0 && this.renderer) {
      const worldSize = this.renderer.tileSize * Math.pow(2, zoom);
      const lineTol = pixelTolerance / worldSize;
      const pointTol = pixelTolerance * 2 / worldSize;
      lineTolSq = lineTol * lineTol;
      pointTolSq = pointTol * pointTol;
    }
    const hit = this.renderer?.hitTest(position.longitude, position.latitude, lineTolSq, pointTolSq) ?? null;
    if (!hit) return false;
    this.onClick?.(hit.feature, hit.position);
    return true;
  }
};

// src/KMLTileRenderer.ts
var import_js_sdk_core2 = require("@mapconductor/js-sdk-core");

// src/KMLPngEncoder.ts
var CRC32_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 3988292384 ^ c >>> 1 | 0 : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32Init() {
  return -1;
}
function crc32Update(crc, data, offset, len) {
  for (let i = offset; i < offset + len; i++) crc = CRC32_TABLE[(crc ^ data[i]) & 255] ^ crc >>> 8;
  return crc;
}
function crc32Finalize(crc) {
  return (crc ^ -1) >>> 0;
}
var ADLER_MOD = 65521;
function adler32Update(s, data, offset, len) {
  let s1 = s & 65535, s2 = s >>> 16 & 65535;
  for (let i = offset; i < offset + len; i++) {
    s1 = (s1 + data[i]) % ADLER_MOD;
    s2 = (s2 + s1) % ADLER_MOD;
  }
  return (s2 << 16 | s1) >>> 0;
}
var DynamicBuffer = class {
  constructor(cap = 4096) {
    this.count = 0;
    this.buf = new Uint8Array(Math.max(cap, 16));
  }
  position() {
    return this.count;
  }
  reset() {
    this.count = 0;
  }
  grow(min) {
    if (this.buf.length >= min) return;
    let n = this.buf.length;
    while (n < min) n = n * 2 | 0;
    const next = new Uint8Array(n);
    next.set(this.buf.subarray(0, this.count));
    this.buf = next;
  }
  writeByte(v) {
    this.grow(this.count + 1);
    this.buf[this.count++] = v & 255;
  }
  writeInt32BE(v) {
    this.grow(this.count + 4);
    this.buf[this.count++] = v >>> 24 & 255;
    this.buf[this.count++] = v >>> 16 & 255;
    this.buf[this.count++] = v >>> 8 & 255;
    this.buf[this.count++] = v & 255;
  }
  setInt32BE(offset, v) {
    this.buf[offset] = v >>> 24 & 255;
    this.buf[offset + 1] = v >>> 16 & 255;
    this.buf[offset + 2] = v >>> 8 & 255;
    this.buf[offset + 3] = v & 255;
  }
  writeBytes(src, offset = 0, len = src.length) {
    if (len <= 0) return;
    this.grow(this.count + len);
    for (let i = 0; i < len; i++) this.buf[this.count + i] = src[offset + i];
    this.count += len;
  }
  toUint8Array() {
    return this.buf.slice(0, this.count);
  }
};
var PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
var PNG_IHDR = new Uint8Array([73, 72, 68, 82]);
var PNG_IDAT = new Uint8Array([73, 68, 65, 84]);
var PNG_IEND = new Uint8Array([73, 69, 78, 68]);
var ZLIB_HEADER = new Uint8Array([120, 1]);
var EMPTY_BYTES = new Uint8Array(0);
function writePngChunk(buf, type, data, offset, len) {
  buf.writeInt32BE(len);
  buf.writeBytes(type);
  if (len > 0) buf.writeBytes(data, offset, len);
  let crc = crc32Init();
  crc = crc32Update(crc, type, 0, type.length);
  if (len > 0) crc = crc32Update(crc, data, offset, len);
  buf.writeInt32BE(crc32Finalize(crc));
}
function encodePng(rgba, width, height, pngBuf) {
  pngBuf.reset();
  pngBuf.writeBytes(PNG_SIG);
  const ihdrBuf = new Uint8Array(13);
  ihdrBuf[0] = width >>> 24 & 255;
  ihdrBuf[1] = width >>> 16 & 255;
  ihdrBuf[2] = width >>> 8 & 255;
  ihdrBuf[3] = width & 255;
  ihdrBuf[4] = height >>> 24 & 255;
  ihdrBuf[5] = height >>> 16 & 255;
  ihdrBuf[6] = height >>> 8 & 255;
  ihdrBuf[7] = height & 255;
  ihdrBuf[8] = 8;
  ihdrBuf[9] = 6;
  writePngChunk(pngBuf, PNG_IHDR, ihdrBuf, 0, 13);
  const rowLen = 1 + width * 4;
  const rowBuf = new Uint8Array(rowLen);
  const sbhBuf = new Uint8Array(5);
  const adlerBuf = new Uint8Array(4);
  const idatLenPos = pngBuf.position();
  pngBuf.writeInt32BE(0);
  pngBuf.writeBytes(PNG_IDAT);
  let crc = crc32Init();
  crc = crc32Update(crc, PNG_IDAT, 0, 4);
  const idatDataStart = pngBuf.position();
  crc = crc32Update(crc, ZLIB_HEADER, 0, 2);
  pngBuf.writeBytes(ZLIB_HEADER);
  let adler = 1;
  for (let y = 0; y < height; y++) {
    rowBuf[0] = 0;
    const srcBase = y * width * 4;
    for (let i = 0; i < width * 4; i++) rowBuf[1 + i] = rgba[srcBase + i];
    adler = adler32Update(adler, rowBuf, 0, rowLen);
    const isLast = y === height - 1;
    const nlen = ~rowLen & 65535;
    sbhBuf[0] = isLast ? 1 : 0;
    sbhBuf[1] = rowLen & 255;
    sbhBuf[2] = rowLen >>> 8 & 255;
    sbhBuf[3] = nlen & 255;
    sbhBuf[4] = nlen >>> 8 & 255;
    crc = crc32Update(crc, sbhBuf, 0, 5);
    pngBuf.writeBytes(sbhBuf, 0, 5);
    crc = crc32Update(crc, rowBuf, 0, rowLen);
    pngBuf.writeBytes(rowBuf, 0, rowLen);
  }
  adlerBuf[0] = adler >>> 24 & 255;
  adlerBuf[1] = adler >>> 16 & 255;
  adlerBuf[2] = adler >>> 8 & 255;
  adlerBuf[3] = adler & 255;
  crc = crc32Update(crc, adlerBuf, 0, 4);
  pngBuf.writeBytes(adlerBuf);
  pngBuf.setInt32BE(idatLenPos, pngBuf.position() - idatDataStart);
  pngBuf.writeInt32BE(crc32Finalize(crc));
  writePngChunk(pngBuf, PNG_IEND, EMPTY_BYTES, 0, 0);
  return pngBuf.toUint8Array();
}

// src/KMLWorld.ts
function lonToWorld(lon) {
  return lon / 360 + 0.5;
}
function latToWorld(lat) {
  const siny = Math.sin(lat * Math.PI / 180);
  const c = Math.max(-0.9999, Math.min(0.9999, siny));
  return 0.5 - Math.log((1 + c) / (1 - c)) / (4 * Math.PI);
}
function worldToLon(wx) {
  return (wx - 0.5) * 360;
}
function worldToLat(wy) {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * wy))) * 180 / Math.PI;
}
function toPixel(world, worldSize, origin) {
  return world * worldSize - origin;
}
function segmentOutside(ax, ay, bx, by, minX, minY, maxX, maxY) {
  return ax < minX && bx < minX || ax > maxX && bx > maxX || ay < minY && by < minY || ay > maxY && by > maxY;
}
function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
function simplifyRadial(coords, tolerance) {
  if (coords.length <= 4 || tolerance <= 0) return coords;
  const tolSq = tolerance * tolerance;
  const output = new Float64Array(coords.length);
  let out = 0;
  let lastX = coords[0], lastY = coords[1];
  output[out++] = lastX;
  output[out++] = lastY;
  for (let i = 2; i < coords.length - 2; i += 2) {
    const x = coords[i], y = coords[i + 1];
    if (distanceSq(lastX, lastY, x, y) > tolSq) {
      output[out++] = x;
      output[out++] = y;
      lastX = x;
      lastY = y;
    }
  }
  const endX = coords[coords.length - 2], endY = coords[coords.length - 1];
  if (out < 2 || output[out - 2] !== endX || output[out - 1] !== endY) {
    output[out++] = endX;
    output[out++] = endY;
  }
  return out === coords.length ? coords : output.slice(0, out);
}
var MAX_SIMPLIFY_ZOOM = 22;
var WorldRing = class {
  constructor(coords) {
    this.coords = coords;
    this.cache = new Array(MAX_SIMPLIFY_ZOOM + 1).fill(null);
  }
  coordsForZoom(zoom, tileSize) {
    if (this.coords.length < 6) return this.coords;
    const idx = Math.min(zoom, MAX_SIMPLIFY_ZOOM);
    if (this.cache[idx]) return this.cache[idx];
    const tol = 0.5 / (tileSize * (1 << idx));
    const simplified = simplifyRadial(this.coords, tol);
    this.cache[idx] = simplified;
    return simplified;
  }
};
var WorldBounds = class {
  constructor(minX, maxX, minY, maxY) {
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;
  }
  intersects(x1, y1, x2, y2) {
    return this.minX <= x2 && this.maxX >= x1 && this.minY <= y2 && this.maxY >= y1;
  }
};
function flatPoints(points) {
  const coords = new Float64Array(points.length * 2);
  let i = 0;
  for (const p of points) {
    coords[i++] = lonToWorld(p.longitude);
    coords[i++] = latToWorld(p.latitude);
  }
  return coords;
}
function flatCoords(lonlats) {
  const coords = new Float64Array(lonlats.length * 2);
  let i = 0;
  for (const p of lonlats) {
    coords[i++] = lonToWorld(p.longitude);
    coords[i++] = latToWorld(p.latitude);
  }
  return coords;
}
function toWorldGeometry(geometry) {
  switch (geometry.type) {
    case "Point":
      return { type: "Point", wx: lonToWorld(geometry.longitude), wy: latToWorld(geometry.latitude) };
    case "MultiPoint":
      return { type: "Points", points: flatPoints(geometry.points) };
    case "LineString":
      return { type: "Line", rings: [new WorldRing(flatCoords(geometry.coordinates))] };
    case "MultiLineString":
      return { type: "Line", rings: geometry.lines.map((l) => new WorldRing(flatCoords(l))) };
    case "Polygon":
      return { type: "Polygon", rings: geometry.rings.map((r) => new WorldRing(flatCoords(r))) };
    case "MultiPolygon":
      return {
        type: "Collection",
        parts: geometry.polygons.map((poly) => ({
          type: "Polygon",
          rings: poly.map((r) => new WorldRing(flatCoords(r)))
        }))
      };
    case "GeometryCollection":
      return { type: "Collection", parts: geometry.geometries.map(toWorldGeometry) };
    case "Empty":
      return { type: "Empty" };
  }
}
function boundsOfCoords(coords) {
  if (coords.length === 0) return new WorldBounds(0, 1, 0, 1);
  let minX = coords[0], maxX = coords[0], minY = coords[1], maxY = coords[1];
  for (let i = 2; i < coords.length; i += 2) {
    const x = coords[i], y = coords[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return new WorldBounds(minX, maxX, minY, maxY);
}
function boundsOfRings(rings) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const ring of rings) {
    const coords = ring.coords;
    for (let i = 0; i < coords.length; i += 2) {
      const x = coords[i], y = coords[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return minX <= maxX ? new WorldBounds(minX, maxX, minY, maxY) : new WorldBounds(0, 1, 0, 1);
}
function computeBounds(geometry) {
  switch (geometry.type) {
    case "Point":
      return new WorldBounds(geometry.wx, geometry.wx, geometry.wy, geometry.wy);
    case "Points":
      return boundsOfCoords(geometry.points);
    case "Line":
      return boundsOfRings(geometry.rings);
    case "Polygon":
      return boundsOfRings(geometry.rings);
    case "Collection": {
      if (geometry.parts.length === 0) return new WorldBounds(0, 1, 0, 1);
      const childBounds = geometry.parts.map(computeBounds);
      return new WorldBounds(
        Math.min(...childBounds.map((b) => b.minX)),
        Math.max(...childBounds.map((b) => b.maxX)),
        Math.min(...childBounds.map((b) => b.minY)),
        Math.max(...childBounds.map((b) => b.maxY))
      );
    }
    case "Empty":
      return new WorldBounds(0, 1, 0, 1);
  }
}

// src/KMLRenderFeature.ts
function buildRenderFeatureFromData(feature, layerStyle, styleProvider) {
  const style = styleProvider(feature, layerStyle);
  return buildRenderFeature(
    feature,
    feature.geometry,
    style.strokeColor,
    style.fillColor,
    style.strokeWidth,
    style.pointRadius
  );
}
function buildRenderFeatureFromState(state, layerStyle, styleProvider) {
  const source = {
    id: state.id,
    geometry: state.geometry,
    properties: state.properties,
    strokeColor: state.strokeColor,
    fillColor: state.fillColor,
    strokeWidth: state.strokeWidth,
    pointRadius: state.pointRadius,
    visible: state.visible
  };
  const style = styleProvider(source, layerStyle);
  return buildRenderFeature(
    source,
    state.geometry,
    style.strokeColor,
    style.fillColor,
    style.strokeWidth,
    style.pointRadius
  );
}
function buildRenderFeature(source, geometry, strokeColor, fillColor, strokeWidth, pointRadius) {
  const strokeStyle = colorAlpha(strokeColor) > 0 && strokeWidth > 0 ? argbToCss(strokeColor) : null;
  const worldGeometry = toWorldGeometry(geometry);
  const bounds = computeBounds(worldGeometry);
  return {
    // Strip geometry from source; worldGeometry holds all coords for rendering
    source: { ...source, geometry: { type: "Empty" } },
    worldGeometry,
    bounds,
    fillStyle: argbToCss(fillColor),
    strokeStyle,
    strokeWidth,
    pointRadius
  };
}

// src/KMLStyleProviderInterface.ts
var DefaultKMLStyleProvider = (feature, defaultStyle) => ({
  strokeColor: feature.strokeColor ?? defaultStyle.strokeColor,
  fillColor: feature.fillColor ?? defaultStyle.fillColor,
  strokeWidth: feature.strokeWidth ?? defaultStyle.strokeWidth,
  pointRadius: feature.pointRadius ?? defaultStyle.pointRadius
});

// src/KMLSpatialIndex.ts
var INDEX_GRID_SIZE = 64;
var SpatialIndex = class {
  constructor(features) {
    this.grid = Array.from({ length: INDEX_GRID_SIZE * INDEX_GRID_SIZE }, () => []);
    for (let i = 0; i < features.length; i++) {
      const b = features[i].bounds;
      const x0 = Math.max(0, Math.min(INDEX_GRID_SIZE - 1, b.minX * INDEX_GRID_SIZE | 0));
      const x1 = Math.max(0, Math.min(INDEX_GRID_SIZE - 1, b.maxX * INDEX_GRID_SIZE | 0));
      const y0 = Math.max(0, Math.min(INDEX_GRID_SIZE - 1, b.minY * INDEX_GRID_SIZE | 0));
      const y1 = Math.max(0, Math.min(INDEX_GRID_SIZE - 1, b.maxY * INDEX_GRID_SIZE | 0));
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          this.grid[cy * INDEX_GRID_SIZE + cx].push(i);
        }
      }
    }
  }
  query(x1, y1, x2, y2) {
    const cx0 = Math.max(0, Math.min(INDEX_GRID_SIZE - 1, x1 * INDEX_GRID_SIZE | 0));
    const cx1 = Math.max(0, Math.min(INDEX_GRID_SIZE - 1, x2 * INDEX_GRID_SIZE | 0));
    const cy0 = Math.max(0, Math.min(INDEX_GRID_SIZE - 1, y1 * INDEX_GRID_SIZE | 0));
    const cy1 = Math.max(0, Math.min(INDEX_GRID_SIZE - 1, y2 * INDEX_GRID_SIZE | 0));
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        for (const idx of this.grid[cy * INDEX_GRID_SIZE + cx]) {
          if (!seen.has(idx)) {
            seen.add(idx);
            result.push(idx);
          }
        }
      }
    }
    return result;
  }
};

// src/KMLTileCache.ts
var LruCache = class {
  constructor(maxKb) {
    this.maxKb = maxKb;
    this.map = /* @__PURE__ */ new Map();
    this.sizeKb = 0;
  }
  get(key) {
    const v = this.map.get(key);
    if (v === void 0) return void 0;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  put(key, value) {
    if (this.map.has(key)) {
      const old = this.map.get(key);
      this.sizeKb -= Math.max(1, old.length / 1024 | 0);
      this.map.delete(key);
    }
    const sz = Math.max(1, value.length / 1024 | 0);
    while (this.sizeKb + sz > this.maxKb && this.map.size > 0) {
      const first = this.map.keys().next().value;
      this.sizeKb -= Math.max(1, (this.map.get(first)?.length ?? 0) / 1024 | 0);
      this.map.delete(first);
    }
    this.map.set(key, value);
    this.sizeKb += sz;
  }
  evictAll() {
    this.map.clear();
    this.sizeKb = 0;
  }
};
function createCanvas(size) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(size, size);
  }
  const el = document.createElement("canvas");
  el.width = size;
  el.height = size;
  return el;
}

// src/KMLHitTester.ts
var HIT_LINE_TOLERANCE = 2e-4;
var HIT_LINE_TOLERANCE_SQ = HIT_LINE_TOLERANCE * HIT_LINE_TOLERANCE;
var HIT_POINT_TOLERANCE = 4e-4;
var HIT_POINT_TOLERANCE_SQ = HIT_POINT_TOLERANCE * HIT_POINT_TOLERANCE;
function hitTestGeometry(wx, wy, geometry, lineTolSq, pointTolSq) {
  switch (geometry.type) {
    case "Point": {
      const distance = distanceSq(wx, wy, geometry.wx, geometry.wy);
      return distance <= (pointTolSq ?? HIT_POINT_TOLERANCE_SQ) ? { wx: geometry.wx, wy: geometry.wy, distanceSq: distance } : null;
    }
    case "Points":
      return hitTestPoints(wx, wy, geometry.points, pointTolSq);
    case "Line":
      return hitTestRings(wx, wy, geometry.rings, lineTolSq);
    case "Polygon": {
      const rings = geometry.rings;
      const inside = rings.length > 0 && pointInRing(wx, wy, rings[0].coords) && !rings.slice(1).some((hole) => pointInRing(wx, wy, hole.coords));
      if (inside) return { wx, wy, distanceSq: 0 };
      if (lineTolSq != null) {
        return hitTestRings(wx, wy, geometry.rings, lineTolSq);
      }
      return null;
    }
    case "Collection": {
      let best = null;
      for (const part of geometry.parts) {
        const hit = hitTestGeometry(wx, wy, part, lineTolSq, pointTolSq);
        if (hit && (!best || hit.distanceSq < best.distanceSq)) best = hit;
      }
      return best;
    }
    case "Empty":
      return null;
  }
}
function hitTestPoints(wx, wy, coords, pointTolSq) {
  const tolSq = pointTolSq ?? HIT_POINT_TOLERANCE_SQ;
  let best = null;
  for (let i = 0; i < coords.length; i += 2) {
    const distance = distanceSq(wx, wy, coords[i], coords[i + 1]);
    if (distance <= tolSq && (!best || distance < best.distanceSq)) {
      best = { wx: coords[i], wy: coords[i + 1], distanceSq: distance };
    }
  }
  return best;
}
function hitTestRings(wx, wy, rings, lineTolSq) {
  let best = null;
  for (const ring of rings) {
    const hit = hitTestLine(wx, wy, ring.coords, lineTolSq);
    if (hit && (!best || hit.distanceSq < best.distanceSq)) best = hit;
  }
  return best;
}
function hitTestLine(wx, wy, coords, lineTolSq) {
  const tolSq = lineTolSq ?? HIT_LINE_TOLERANCE_SQ;
  let best = null;
  for (let i = 2; i < coords.length; i += 2) {
    const hit = closestPointOnSegment(wx, wy, coords[i - 2], coords[i - 1], coords[i], coords[i + 1]);
    if (hit.distanceSq <= tolSq && (!best || hit.distanceSq < best.distanceSq)) best = hit;
  }
  return best;
}
function pointInRing(wx, wy, ring) {
  let inside = false;
  let j = ring.length - 2;
  for (let i = 0; i < ring.length; i += 2) {
    const xi = ring[i], yi = ring[i + 1];
    const xj = ring[j], yj = ring[j + 1];
    if (yi > wy !== yj > wy && wx < (xj - xi) * (wy - yi) / (yj - yi) + xi) inside = !inside;
    j = i;
  }
  return inside;
}
function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return { wx: ax, wy: ay, distanceSq: distanceSq(px, py, ax, ay) };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const wx = ax + t * dx;
  const wy = ay + t * dy;
  return { wx, wy, distanceSq: distanceSq(px, py, wx, wy) };
}

// src/KMLTileRenderer.ts
var INDEX_THRESHOLD = 256;
var DEFAULT_CACHE_KB = 8 * 1024;
var SENTINEL = new Uint8Array(0);
var KMLTileRenderer = class {
  constructor(params = {}) {
    this.cacheEpoch = 0;
    this.state = { features: [], index: null };
    this._canvas = null;
    this._ctx = null;
    this.tileSize = params.tileSize ?? KMLDefaults.DEFAULT_TILE_SIZE;
    this.cache = new LruCache(params.cacheSizeKb ?? DEFAULT_CACHE_KB);
    this.pngBuf = new DynamicBuffer(this.tileSize * this.tileSize * 4 + 1024);
  }
  update(staticFeatures, dynamicFeatures, layerStyle, styleProvider = DefaultKMLStyleProvider) {
    const rendered = [];
    for (const f of staticFeatures) if (f.visible) rendered.push(buildRenderFeatureFromData(f, layerStyle, styleProvider));
    for (const s of dynamicFeatures) if (s.visible) rendered.push(buildRenderFeatureFromState(s, layerStyle, styleProvider));
    this.state = {
      features: rendered,
      index: rendered.length >= INDEX_THRESHOLD ? new SpatialIndex(rendered) : null
    };
    this.cacheEpoch++;
    this.cache.evictAll();
  }
  renderTile(request) {
    const epoch = this.cacheEpoch;
    const key = `${epoch}:${request.z}/${request.x}/${request.y}`;
    const cached = this.cache.get(key);
    if (cached !== void 0) return cached === SENTINEL ? null : cached;
    const result = this.renderTileInternal(request, this.state);
    this.cache.put(key, result ?? SENTINEL);
    return result;
  }
  getCtx() {
    if (!this._canvas) {
      this._canvas = createCanvas(this.tileSize);
      this._ctx = this._canvas.getContext("2d");
    }
    return this._ctx;
  }
  renderTileInternal(request, tileState) {
    if (tileState.features.length === 0) return null;
    const z = request.z;
    const worldTileCount = 1 << z;
    const x = (request.x % worldTileCount + worldTileCount) % worldTileCount;
    const y = request.y;
    if (y < 0 || y >= worldTileCount) return null;
    const tileMinX = x / worldTileCount;
    const tileMaxX = (x + 1) / worldTileCount;
    const tileMinY = y / worldTileCount;
    const tileMaxY = (y + 1) / worldTileCount;
    const candidates = tileState.index ? tileState.index.query(tileMinX, tileMinY, tileMaxX, tileMaxY) : tileState.features.map((_, i) => i);
    const worldSize = this.tileSize * worldTileCount;
    const originX = x * this.tileSize;
    const originY = y * this.tileSize;
    const ctx = this.getCtx();
    ctx.clearRect(0, 0, this.tileSize, this.tileSize);
    let hasContent = false;
    for (const idx of candidates) {
      const feature = tileState.features[idx];
      if (!feature.bounds.intersects(tileMinX, tileMinY, tileMaxX, tileMaxY)) continue;
      if (this.renderFeature(ctx, feature, z, worldSize, originX, originY, tileMinX, tileMinY, tileMaxX, tileMaxY)) {
        hasContent = true;
      }
    }
    if (!hasContent) return null;
    const imageData = ctx.getImageData(0, 0, this.tileSize, this.tileSize);
    return encodePng(imageData.data, this.tileSize, this.tileSize, this.pngBuf);
  }
  renderFeature(ctx, feature, zoom, worldSize, originX, originY, tileMinX, tileMinY, tileMaxX, tileMaxY) {
    return this.renderGeometry(ctx, feature, feature.worldGeometry, zoom, worldSize, originX, originY, tileMinX, tileMinY, tileMaxX, tileMaxY);
  }
  renderGeometry(ctx, feature, geometry, zoom, worldSize, originX, originY, tileMinX, tileMinY, tileMaxX, tileMaxY) {
    switch (geometry.type) {
      case "Point": {
        const px = toPixel(geometry.wx, worldSize, originX);
        const py = toPixel(geometry.wy, worldSize, originY);
        ctx.beginPath();
        ctx.arc(px, py, feature.pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = feature.fillStyle;
        ctx.fill();
        if (feature.strokeStyle) {
          ctx.beginPath();
          ctx.arc(px, py, feature.pointRadius, 0, Math.PI * 2);
          ctx.strokeStyle = feature.strokeStyle;
          ctx.lineWidth = feature.strokeWidth;
          ctx.stroke();
        }
        return true;
      }
      case "Points": {
        const pts = geometry.points;
        if (pts.length === 0) return false;
        for (let i = 0; i < pts.length; i += 2) {
          const px = toPixel(pts[i], worldSize, originX);
          const py = toPixel(pts[i + 1], worldSize, originY);
          ctx.beginPath();
          ctx.arc(px, py, feature.pointRadius, 0, Math.PI * 2);
          ctx.fillStyle = feature.fillStyle;
          ctx.fill();
          if (feature.strokeStyle) {
            ctx.beginPath();
            ctx.arc(px, py, feature.pointRadius, 0, Math.PI * 2);
            ctx.strokeStyle = feature.strokeStyle;
            ctx.lineWidth = feature.strokeWidth;
            ctx.stroke();
          }
        }
        return true;
      }
      case "Line": {
        const sw = feature.strokeWidth;
        const margin = (tileMaxX - tileMinX) * 0.25 + sw / worldSize;
        const minX = tileMinX - margin, minY = tileMinY - margin;
        const maxX = tileMaxX + margin, maxY = tileMaxY + margin;
        let hasSegments = false;
        ctx.beginPath();
        for (const ring of geometry.rings) {
          const coords = ring.coordsForZoom(zoom, this.tileSize);
          if (coords.length < 4) continue;
          let needsMove = true;
          for (let i = 2; i < coords.length; i += 2) {
            const ax = coords[i - 2], ay = coords[i - 1];
            const bx = coords[i], by = coords[i + 1];
            if (!segmentOutside(ax, ay, bx, by, minX, minY, maxX, maxY)) {
              if (needsMove) {
                ctx.moveTo(toPixel(ax, worldSize, originX), toPixel(ay, worldSize, originY));
                needsMove = false;
              }
              ctx.lineTo(toPixel(bx, worldSize, originX), toPixel(by, worldSize, originY));
              hasSegments = true;
            } else {
              needsMove = true;
            }
          }
        }
        if (!hasSegments) return false;
        ctx.strokeStyle = feature.strokeStyle ?? feature.fillStyle;
        ctx.lineWidth = sw;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
        return true;
      }
      case "Polygon": {
        let hasRings = false;
        ctx.beginPath();
        for (const ring of geometry.rings) {
          const coords = ring.coordsForZoom(zoom, this.tileSize);
          if (coords.length < 6) continue;
          ctx.moveTo(toPixel(coords[0], worldSize, originX), toPixel(coords[1], worldSize, originY));
          for (let i = 2; i < coords.length; i += 2) {
            ctx.lineTo(toPixel(coords[i], worldSize, originX), toPixel(coords[i + 1], worldSize, originY));
          }
          ctx.closePath();
          hasRings = true;
        }
        if (!hasRings) return false;
        ctx.fillStyle = feature.fillStyle;
        ctx.fill("evenodd");
        if (feature.strokeStyle) {
          ctx.strokeStyle = feature.strokeStyle;
          ctx.lineWidth = feature.strokeWidth;
          ctx.lineJoin = "round";
          ctx.stroke();
        }
        return true;
      }
      case "Collection": {
        let drew = false;
        for (const part of geometry.parts) {
          if (this.renderGeometry(ctx, feature, part, zoom, worldSize, originX, originY, tileMinX, tileMinY, tileMaxX, tileMaxY)) drew = true;
        }
        return drew;
      }
      case "Empty":
        return false;
    }
  }
  // ── Hit-testing ──────────────────────────────────────────────────────────
  hitTest(longitude, latitude, lineTolSq, pointTolSq) {
    const wx = lonToWorld(longitude);
    const wy = latToWorld(latitude);
    const lineTolerance = lineTolSq !== void 0 ? Math.sqrt(lineTolSq) : HIT_LINE_TOLERANCE;
    const pointTolerance = pointTolSq !== void 0 ? Math.sqrt(pointTolSq) : HIT_POINT_TOLERANCE;
    const tolerance = Math.max(lineTolerance, pointTolerance);
    const s = this.state;
    const candidates = s.index ? s.index.query(wx - tolerance, wy - tolerance, wx + tolerance, wy + tolerance) : s.features.map((_, i) => i);
    for (let i = candidates.length - 1; i >= 0; i--) {
      const feature = s.features[candidates[i]];
      if (!feature.bounds.intersects(wx - tolerance, wy - tolerance, wx + tolerance, wy + tolerance)) continue;
      const hit = hitTestGeometry(wx, wy, feature.worldGeometry, lineTolSq, pointTolSq);
      if (hit) {
        return {
          feature: feature.source,
          position: (0, import_js_sdk_core2.createGeoPoint)({
            longitude: worldToLon(hit.wx),
            latitude: worldToLat(hit.wy)
          })
        };
      }
    }
    return null;
  }
};

// src/KMLXmlSupport.ts
var START_TAG = 1;
var END_TAG = 2;
var TEXT = 3;
var END_DOCUMENT = 4;
var LT = 60;
var GT = 62;
var SLASH = 47;
var EQ = 61;
var DQUOTE = 34;
var SQUOTE = 39;
function isSpace(c) {
  return c === 32 || c === 9 || c === 10 || c === 13;
}
function decodeEntities(s) {
  if (s.indexOf("&") < 0) return s;
  return s.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body) => {
    if (body.charCodeAt(0) === 35) {
      const hex = body.charCodeAt(1) === 120 || body.charCodeAt(1) === 88;
      const code = hex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 1114111 ? String.fromCodePoint(code) : match;
    }
    switch (body) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
        return "'";
      default:
        return match;
    }
  });
}
var KMLXmlPullParser = class {
  constructor(src) {
    /** Element name of the current START_TAG / END_TAG event. */
    this.name = "";
    /** Text content of the current TEXT event. */
    this.text = "";
    this.pos = 0;
    this.pendingEndTag = null;
    this.attributes = null;
    this.src = src;
  }
  getAttributeValue(name) {
    return this.attributes?.get(name) ?? null;
  }
  next() {
    if (this.pendingEndTag !== null) {
      this.name = this.pendingEndTag;
      this.pendingEndTag = null;
      this.attributes = null;
      return END_TAG;
    }
    const src = this.src;
    while (this.pos < src.length) {
      if (src.charCodeAt(this.pos) !== LT) {
        const next = src.indexOf("<", this.pos);
        const end = next < 0 ? src.length : next;
        this.text = decodeEntities(src.slice(this.pos, end));
        this.pos = end;
        return TEXT;
      }
      if (src.startsWith("<!--", this.pos)) {
        const end = src.indexOf("-->", this.pos + 4);
        this.pos = end < 0 ? src.length : end + 3;
        continue;
      }
      if (src.startsWith("<![CDATA[", this.pos)) {
        const end = src.indexOf("]]>", this.pos + 9);
        this.text = end < 0 ? src.slice(this.pos + 9) : src.slice(this.pos + 9, end);
        this.pos = end < 0 ? src.length : end + 3;
        return TEXT;
      }
      if (src.startsWith("<?", this.pos)) {
        const end = src.indexOf("?>", this.pos + 2);
        this.pos = end < 0 ? src.length : end + 2;
        continue;
      }
      if (src.startsWith("<!", this.pos)) {
        const end = src.indexOf(">", this.pos + 2);
        this.pos = end < 0 ? src.length : end + 1;
        continue;
      }
      if (src.startsWith("</", this.pos)) {
        const end = src.indexOf(">", this.pos + 2);
        this.name = (end < 0 ? src.slice(this.pos + 2) : src.slice(this.pos + 2, end)).trim();
        this.pos = end < 0 ? src.length : end + 1;
        this.attributes = null;
        return END_TAG;
      }
      return this.readStartTag();
    }
    return END_DOCUMENT;
  }
  readStartTag() {
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
      if (c === GT) {
        i++;
        break;
      }
      if (c === SLASH) {
        selfClosing = true;
        i++;
        continue;
      }
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
        let value;
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
          (this.attributes ?? (this.attributes = /* @__PURE__ */ new Map())).set(attrName, decodeEntities(value));
        }
      } else if (attrName.length > 0) {
        (this.attributes ?? (this.attributes = /* @__PURE__ */ new Map())).set(attrName, "");
      } else {
        i++;
      }
    }
    this.pos = i;
    if (selfClosing) this.pendingEndTag = this.name;
    return START_TAG;
  }
};
function forEachChild(parser, block) {
  let depth = 1;
  while (depth > 0) {
    switch (parser.next()) {
      case START_TAG: {
        depth++;
        block(parser.name);
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
function readText(parser) {
  let result = "";
  let event = parser.next();
  while (event === TEXT) {
    result += parser.text;
    event = parser.next();
  }
  return result;
}
function skip(parser) {
  let depth = 1;
  while (depth > 0) {
    switch (parser.next()) {
      case START_TAG:
        depth++;
        break;
      case END_TAG:
        depth--;
        break;
      case END_DOCUMENT:
        return;
    }
  }
}
var WHITESPACE = /\s+/;
function parseCoordinates(text) {
  const result = [];
  for (const token of text.trim().split(WHITESPACE)) {
    if (token.length === 0) continue;
    const parts = token.split(",");
    if (parts.length < 2) continue;
    const lon = Number(parts[0].trim());
    const lat = Number(parts[1].trim());
    if (Number.isNaN(lon) || Number.isNaN(lat)) continue;
    result.push({ longitude: lon, latitude: lat });
  }
  return result;
}
function parseKmlColor(hex) {
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

// src/KMLGeometryReader.ts
function readGeometry(parser, type) {
  switch (type) {
    case "Point": {
      const coords = readCoordinatesChild(parser);
      const first = coords.length > 0 ? coords[0] : null;
      return first ? { type: "Point", longitude: first.longitude, latitude: first.latitude } : null;
    }
    case "LineString":
    case "LinearRing": {
      const coords = readCoordinatesChild(parser);
      return coords.length === 0 ? null : { type: "LineString", coordinates: coords };
    }
    case "Polygon":
      return readPolygon(parser);
    case "MultiGeometry":
      return readMultiGeometry(parser);
    default:
      skip(parser);
      return null;
  }
}
function readPolygon(parser) {
  const boundary = { outer: null };
  const inners = [];
  forEachChild(parser, (name) => {
    switch (name) {
      case "outerBoundaryIs":
        boundary.outer = readBoundary(parser);
        break;
      case "innerBoundaryIs": {
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
  const rings = [exterior, ...inners];
  return { type: "Polygon", rings };
}
function readBoundary(parser) {
  let coords = null;
  forEachChild(parser, (name) => {
    if (name === "LinearRing") {
      coords = readCoordinatesChild(parser);
    } else {
      skip(parser);
    }
  });
  return coords;
}
function readMultiGeometry(parser) {
  const stack = [[]];
  for (; ; ) {
    switch (parser.next()) {
      case START_TAG: {
        const name = parser.name;
        switch (name) {
          case "MultiGeometry":
            stack.push([]);
            break;
          case "Point":
          case "LineString":
          case "LinearRing":
          case "Polygon": {
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
        const closed = { type: "GeometryCollection", geometries: stack.pop() };
        if (stack.length === 0) return closed;
        stack[stack.length - 1].push(closed);
        break;
      }
      case END_DOCUMENT:
        return { type: "GeometryCollection", geometries: stack[0] };
    }
  }
}
function readCoordinatesChild(parser) {
  let coords = [];
  forEachChild(parser, (name) => {
    if (name === "coordinates") {
      coords = parseCoordinates(readText(parser));
    } else {
      skip(parser);
    }
  });
  return coords;
}

// src/KMLStyleReader.ts
var TRANSPARENT = 0;
var KMLStyle = class {
  constructor() {
    this.lineColor = null;
    this.lineWidth = null;
    this.polyColor = null;
    this.iconColor = null;
    this.fill = true;
    this.outline = true;
  }
};
function readStyle(parser) {
  const style = new KMLStyle();
  forEachChild(parser, (name) => {
    switch (name) {
      case "LineStyle":
        forEachChild(parser, (child) => {
          switch (child) {
            case "color":
              style.lineColor = parseKmlColor(readText(parser));
              break;
            case "width": {
              const width = Number(readText(parser).trim());
              style.lineWidth = Number.isNaN(width) ? null : width;
              break;
            }
            default:
              skip(parser);
          }
        });
        break;
      case "PolyStyle":
        forEachChild(parser, (child) => {
          switch (child) {
            case "color":
              style.polyColor = parseKmlColor(readText(parser));
              break;
            case "fill":
              style.fill = readText(parser).trim() !== "0";
              break;
            case "outline":
              style.outline = readText(parser).trim() !== "0";
              break;
            default:
              skip(parser);
          }
        });
        break;
      case "IconStyle":
        forEachChild(parser, (child) => {
          if (child === "color") {
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
function readStyleMap(parser) {
  let normal = null;
  forEachChild(parser, (name) => {
    if (name === "Pair") {
      let key = null;
      let url = null;
      forEachChild(parser, (child) => {
        switch (child) {
          case "key":
            key = readText(parser).trim();
            break;
          case "styleUrl":
            url = readText(parser).trim().replace(/^#/, "");
            break;
          default:
            skip(parser);
        }
      });
      if (key === "normal") normal = url;
    } else {
      skip(parser);
    }
  });
  return normal;
}
function rawPlacemarkToFeature(placemark, styles, styleMaps) {
  const geometry = placemark.geometry;
  if (!geometry) return null;
  const style = placemark.inlineStyle ?? resolveStyle(placemark.styleUrl, styles, styleMaps);
  const strokeColor = style === null ? null : !style.outline ? TRANSPARENT : style.lineColor;
  const fillColor = style === null ? null : !style.fill ? TRANSPARENT : style.polyColor ?? style.iconColor;
  return {
    id: null,
    geometry,
    properties: placemark.properties,
    strokeColor,
    fillColor,
    strokeWidth: style?.lineWidth ?? null,
    pointRadius: null,
    visible: true
  };
}
function resolveStyle(url, styles, styleMaps) {
  if (url === null) return null;
  const direct = styles.get(url);
  if (direct) return direct;
  const normal = styleMaps.get(url);
  if (normal !== void 0) return styles.get(normal) ?? null;
  return null;
}

// src/KMLParser.ts
var KMLParser = {
  /** Parses a KML string into a list of static features. */
  parse(kml) {
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
  async parseDocument(data) {
    if (typeof data === "string") return parseKmlText(data);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (hasZipSignature(bytes)) return parseKmlText(await extractKmzDocument(bytes));
    return parseKmlText(new TextDecoder().decode(bytes));
  }
};
function parseKmlText(kml) {
  const parser = new KMLXmlPullParser(kml);
  const styles = /* @__PURE__ */ new Map();
  const styleMaps = /* @__PURE__ */ new Map();
  const placemarks = [];
  const networkLinks = [];
  let event = parser.next();
  while (event !== START_TAG && event !== END_DOCUMENT) {
    event = parser.next();
  }
  if (event === START_TAG) {
    walkDocument(parser, styles, styleMaps, placemarks, networkLinks);
  }
  const features = [];
  for (const placemark of placemarks) {
    const feature = rawPlacemarkToFeature(placemark, styles, styleMaps);
    if (feature) features.push(feature);
  }
  return { features, networkLinks };
}
function walkDocument(parser, styles, styleMaps, placemarks, networkLinks) {
  let depth = 1;
  while (depth > 0) {
    switch (parser.next()) {
      case START_TAG:
        switch (parser.name) {
          case "Style": {
            const id = parser.getAttributeValue("id");
            const style = readStyle(parser);
            if (id !== null) styles.set(id, style);
            break;
          }
          case "StyleMap": {
            const id = parser.getAttributeValue("id");
            const normal = readStyleMap(parser);
            if (id !== null && normal !== null) styleMaps.set(id, normal);
            break;
          }
          case "Placemark":
            placemarks.push(readPlacemark(parser));
            break;
          case "NetworkLink": {
            const link = readNetworkLink(parser);
            if (link) networkLinks.push(link);
            break;
          }
          case "Document":
          case "Folder":
          case "kml":
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
function readPlacemark(parser) {
  let name = null;
  let description = null;
  let styleUrl = null;
  let inlineStyle = null;
  let geometry = null;
  const properties = {};
  forEachChild(parser, (tag) => {
    switch (tag) {
      case "name":
        name = readText(parser).trim();
        break;
      case "description":
        description = readText(parser).trim();
        break;
      case "styleUrl":
        styleUrl = readText(parser).trim().replace(/^#/, "");
        break;
      case "Style":
        inlineStyle = readStyle(parser);
        break;
      case "ExtendedData":
        readExtendedData(parser, properties);
        break;
      case "Point":
      case "LineString":
      case "LinearRing":
      case "Polygon":
      case "MultiGeometry":
        geometry = readGeometry(parser, tag);
        break;
      default:
        skip(parser);
    }
  });
  if (name && !("name" in properties)) properties["name"] = name;
  if (description && !("description" in properties)) properties["description"] = description;
  return { geometry, styleUrl, inlineStyle, properties };
}
function readNetworkLink(parser) {
  let href = null;
  let visibility = true;
  forEachChild(parser, (tag) => {
    switch (tag) {
      case "Link":
      case "Url":
        forEachChild(parser, (child) => {
          if (child === "href") {
            href = readText(parser).trim();
          } else {
            skip(parser);
          }
        });
        break;
      case "visibility":
        visibility = readText(parser).trim() !== "0";
        break;
      default:
        skip(parser);
    }
  });
  return href ? { href, visibility } : null;
}
function readExtendedData(parser, properties) {
  forEachChild(parser, (name) => {
    switch (name) {
      case "Data": {
        const key = parser.getAttributeValue("name");
        let value = null;
        forEachChild(parser, (child) => {
          if (child === "value") {
            value = readText(parser).trim();
          } else {
            skip(parser);
          }
        });
        if (key !== null) properties[key] = value;
        break;
      }
      case "SchemaData":
        forEachChild(parser, (child) => {
          if (child === "SimpleData") {
            const key = parser.getAttributeValue("name");
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
function hasZipSignature(bytes) {
  return bytes.length >= 4 && bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
}
var EOCD_SIGNATURE = 101010256;
var CENTRAL_SIGNATURE = 33639248;
var LOCAL_SIGNATURE = 67324752;
var EOCD_MIN_SIZE = 22;
var MAX_COMMENT_SIZE = 65535;
async function extractKmzDocument(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  const scanEnd = Math.max(0, bytes.length - EOCD_MIN_SIZE - MAX_COMMENT_SIZE);
  for (let i = bytes.length - EOCD_MIN_SIZE; i >= scanEnd; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("KMZ archive has no end-of-central-directory record");
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
    const isDirectory = name.endsWith("/");
    if (isDirectory || name.startsWith("__MACOSX/")) continue;
    if (!name.toLowerCase().endsWith(".kml")) continue;
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
  throw new Error("KMZ archive contains no .kml entry");
}
async function inflateRaw(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// src/KMLLoader.ts
var _KMLLoader = class _KMLLoader {
  constructor(params = {}) {
    this.maxDocuments = params.maxDocuments ?? _KMLLoader.DEFAULT_MAX_DOCUMENTS;
    this.onDocumentError = params.onDocumentError ?? null;
    this.fetchFn = params.fetch ?? defaultFetch;
  }
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
  async load(source, baseUrl) {
    if (typeof source === "string" && !source.trimStart().startsWith("<")) {
      return this.collect(null, source);
    }
    return this.collect(source, baseUrl ?? null);
  }
  async collect(rootData, rootUrl) {
    const features = [];
    const queue = [];
    const visited = /* @__PURE__ */ new Set();
    let loaded = 0;
    const merge = (document2, baseUrl) => {
      loaded++;
      features.push(...document2.features);
      for (const link of document2.networkLinks) {
        if (!link.visibility) continue;
        const resolved = _KMLLoader.resolveHref(baseUrl, link.href);
        if (resolved === null) continue;
        if (!visited.has(resolved)) {
          visited.add(resolved);
          queue.push(resolved);
        }
      }
    };
    if (rootUrl !== null) visited.add(rootUrl);
    const rootDocument = rootData !== null ? await KMLParser.parseDocument(rootData) : await KMLParser.parseDocument(await this.fetchFn(rootUrl));
    merge(rootDocument, rootUrl);
    while (queue.length > 0 && loaded < this.maxDocuments) {
      const url = queue.shift();
      let document2;
      try {
        document2 = await KMLParser.parseDocument(await this.fetchFn(url));
      } catch (error) {
        this.onDocumentError?.(url, error);
        continue;
      }
      merge(document2, url);
    }
    return features;
  }
  /** 相対 `href` を `base` に対して解決する。base 不明の相対参照は追跡できず null。 */
  static resolveHref(base, href) {
    if (href.includes("://")) return href;
    if (base === null) return null;
    try {
      return new URL(href, base).toString();
    } catch {
      return null;
    }
  }
};
_KMLLoader.DEFAULT_MAX_DOCUMENTS = 20;
var KMLLoader = _KMLLoader;
async function defaultFetch(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

// src/KMLLayer.tsx
var import_react = require("react");
var import_js_sdk_core3 = require("@mapconductor/js-sdk-core");
var import_js_sdk_react = require("@mapconductor/js-sdk-react");
var import_jsx_runtime = require("react/jsx-runtime");
var KMLFeatureContext = (0, import_react.createContext)(null);
function useFeatureCollector() {
  const ctx = (0, import_react.useContext)(KMLFeatureContext);
  if (!ctx) throw new Error("KMLFeature must be rendered inside <KMLLayer>");
  return ctx;
}
function KMLLayer(props) {
  const {
    state: stateProp,
    features = [],
    tileSize = KMLDefaults.DEFAULT_TILE_SIZE,
    trackFeatureUpdates = false,
    children
  } = props;
  const state = (0, import_react.useMemo)(() => stateProp ?? new KMLLayerState(), [stateProp]);
  const groupId = (0, import_react.useMemo)(() => `kml-${Math.random().toString(36).slice(2)}`, []);
  const renderer = (0, import_react.useMemo)(() => new KMLTileRenderer({ tileSize }), [tileSize]);
  const collector = (0, import_react.useMemo)(() => new import_js_sdk_core3.OverlayCollector(), []);
  const tileServer = (0, import_react.useMemo)(() => import_js_sdk_core3.TileServerRegistry.get(), []);
  const rasterStateRef = (0, import_react.useRef)(
    (0, import_js_sdk_core3.createRasterLayerState)({
      source: {
        type: "UrlTemplate",
        template: tileServer.urlTemplate({ routeId: groupId, tileSize }),
        tileSize,
        maxZoom: KMLDefaults.DEFAULT_MAX_ZOOM,
        scheme: import_js_sdk_core3.TileScheme.XYZ
      },
      opacity: Math.max(0, Math.min(1, state.opacity)),
      visible: state.visible,
      id: `kml-${groupId}`
    })
  );
  const [isTileServerRegistered, setIsTileServerRegistered] = (0, import_react.useState)(false);
  const [hasRenderedOnce, setHasRenderedOnce] = (0, import_react.useState)(false);
  const [featureVersion, setFeatureVersion] = (0, import_react.useState)(0);
  const [updateToken, setUpdateToken] = (0, import_react.useState)(0);
  const featureMapRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
  (0, import_react.useEffect)(() => {
    rasterStateRef.current.opacity = Math.max(0, Math.min(1, state.opacity));
  }, [state.opacity]);
  (0, import_react.useEffect)(() => {
    rasterStateRef.current.visible = state.visible;
  }, [state.visible]);
  (0, import_react.useEffect)(() => {
    tileServer.register(groupId, renderer);
    let cancelled = false;
    if (import_js_sdk_core3.LocalTileServer.isServiceWorkerSupported()) {
      tileServer.startServiceWorker("/tile-sw.js");
      tileServer.waitForController().then(() => {
        if (!cancelled) setIsTileServerRegistered(true);
      });
    } else {
      setIsTileServerRegistered(true);
    }
    return () => {
      cancelled = true;
      tileServer.unregister(groupId);
      setIsTileServerRegistered(false);
    };
  }, [groupId, tileServer, renderer]);
  (0, import_react.useEffect)(() => {
    state.renderer = renderer;
    return () => {
      state.renderer = null;
    };
  }, [state, renderer]);
  (0, import_react.useEffect)(() => {
    return collector.subscribe((map) => {
      featureMapRef.current = map;
      setFeatureVersion((v) => v + 1);
    });
  }, [collector]);
  (0, import_react.useEffect)(() => {
    if (trackFeatureUpdates) {
      collector.setUpdateHandler(() => setUpdateToken((t) => t + 1));
    } else {
      collector.setUpdateHandler(null);
    }
    return () => {
      collector.setUpdateHandler(null);
    };
  }, [collector, trackFeatureUpdates]);
  (0, import_react.useEffect)(() => {
    const dynamicFeatures = Array.from(featureMapRef.current.values());
    const layerStyle = {
      strokeColor: state.strokeColor,
      fillColor: state.fillColor,
      strokeWidth: state.strokeWidth,
      pointRadius: state.pointRadius
    };
    renderer.update(features, dynamicFeatures, layerStyle);
    if (features.length === 0 && dynamicFeatures.length === 0) {
      setHasRenderedOnce(false);
      return;
    }
    setHasRenderedOnce(true);
    rasterStateRef.current.source = {
      type: "UrlTemplate",
      template: tileServer.urlTemplate({
        routeId: groupId,
        tileSize,
        cacheKey: String(featureVersion + updateToken)
      }),
      tileSize,
      maxZoom: KMLDefaults.DEFAULT_MAX_ZOOM,
      scheme: import_js_sdk_core3.TileScheme.XYZ
    };
  }, [
    featureVersion,
    updateToken,
    features,
    state.strokeColor,
    state.fillColor,
    state.strokeWidth,
    state.pointRadius,
    groupId,
    tileSize,
    tileServer,
    renderer
  ]);
  (0, import_react.useEffect)(() => {
    return () => {
      collector.setUpdateHandler(null);
      collector.clear();
    };
  }, [collector]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(KMLFeatureContext.Provider, { value: collector, children: [
    isTileServerRegistered && hasRenderedOnce && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_js_sdk_react.RasterLayer, { state: rasterStateRef.current }),
    children
  ] });
}
function KMLFeatureWithState({ state }) {
  const collector = useFeatureCollector();
  (0, import_react.useEffect)(() => {
    collector.add(state);
  }, [state, collector]);
  (0, import_react.useEffect)(() => {
    return () => {
      collector.remove(state.id);
    };
  }, [state.id, collector]);
  return null;
}
function KMLFeatureFromParams(props) {
  const stateRef = (0, import_react.useRef)(null);
  if (!stateRef.current) {
    stateRef.current = new KMLFeatureState({
      featureId: props.featureId,
      geometry: props.geometry,
      properties: props.properties,
      strokeColor: props.strokeColor,
      fillColor: props.fillColor,
      strokeWidth: props.strokeWidth,
      pointRadius: props.pointRadius,
      visible: props.visible
    });
  }
  const s = stateRef.current;
  (0, import_react.useEffect)(() => {
    s.geometry = props.geometry;
  }, [s, props.geometry]);
  (0, import_react.useEffect)(() => {
    s.properties = props.properties ?? {};
  }, [s, props.properties]);
  (0, import_react.useEffect)(() => {
    s.strokeColor = props.strokeColor ?? null;
  }, [s, props.strokeColor]);
  (0, import_react.useEffect)(() => {
    s.fillColor = props.fillColor ?? null;
  }, [s, props.fillColor]);
  (0, import_react.useEffect)(() => {
    s.strokeWidth = props.strokeWidth ?? null;
  }, [s, props.strokeWidth]);
  (0, import_react.useEffect)(() => {
    s.pointRadius = props.pointRadius ?? null;
  }, [s, props.pointRadius]);
  (0, import_react.useEffect)(() => {
    s.visible = props.visible ?? true;
  }, [s, props.visible]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KMLFeatureWithState, { state: s });
}
function KMLFeature(props) {
  if (props.state !== void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KMLFeatureWithState, { state: props.state });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KMLFeatureFromParams, { ...props });
}
function KMLFeatures({ states }) {
  const collector = useFeatureCollector();
  (0, import_react.useEffect)(() => {
    collector.replaceAll(states);
  }, [states, states.length, collector]);
  (0, import_react.useEffect)(() => {
    return () => {
      collector.clear();
    };
  }, [collector]);
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DefaultKMLStyleProvider,
  KMLDefaults,
  KMLFeature,
  KMLFeatureState,
  KMLFeatures,
  KMLLayer,
  KMLLayerState,
  KMLLoader,
  KMLParser,
  KMLTileRenderer,
  argbToCss,
  colorAlpha,
  colorArgb,
  colorBlue,
  colorGreen,
  colorRed,
  colorRgb,
  createKMLFeature
});
