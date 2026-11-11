import assert from 'node:assert/strict';
import { crc32, inflateSync } from 'node:zlib';
import { test } from 'node:test';
import { buildEntries } from './support/build.mjs';

// 自前 PNG エンコーダが規格どおりのバイト列（チャンク長・CRC・zlib 格納ブロック・
// Adler-32）を出すことを Node の zlib で検証する。あわせてタイルの LRU が
// KB 単位の上限で古いものから捨て、get で鮮度が更新されることを確かめる。
const { png, cache } = await buildEntries('png-cache-tests', {
    png: 'src/KMLPngEncoder.ts',
    cache: 'src/KMLTileCache.ts',
});
const { encodePng, DynamicBuffer } = png;
const { LruCache } = cache;

function readChunks(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const chunks = [];
    let p = 8;
    while (p < bytes.length) {
        const len = view.getUint32(p);
        const type = new TextDecoder().decode(bytes.subarray(p + 4, p + 8));
        const data = bytes.subarray(p + 8, p + 8 + len);
        const crc = view.getUint32(p + 8 + len);
        chunks.push({ type, data, crc, crcOk: crc === crc32(bytes.subarray(p + 4, p + 8 + len)) });
        p += 12 + len;
    }
    return chunks;
}

function rgbaPattern(w, h) {
    const px = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < px.length; i++) px[i] = (i * 37 + 11) & 0xff;
    return px;
}

test('encodePng emits a valid RGBA8 PNG whose IDAT inflates back to the pixels', () => {
    for (const [w, h] of [[1, 1], [3, 2], [64, 64]]) {
        const pixels = rgbaPattern(w, h);
        const out = encodePng(pixels, w, h, new DynamicBuffer(16));
        assert.deepEqual([...out.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const chunks = readChunks(out);
        assert.deepEqual(chunks.map((c) => c.type), ['IHDR', 'IDAT', 'IEND']);
        assert.ok(chunks.every((c) => c.crcOk), 'every chunk CRC matches');
        const ihdr = new DataView(chunks[0].data.buffer, chunks[0].data.byteOffset, 13);
        assert.deepEqual([ihdr.getUint32(0), ihdr.getUint32(4), ihdr.getUint8(8), ihdr.getUint8(9)], [w, h, 8, 6]);
        assert.equal(chunks[2].data.length, 0);

        // inflateSync verifies the zlib header and Adler-32 trailer.
        const raw = inflateSync(chunks[1].data);
        assert.equal(raw.length, h * (1 + w * 4));
        for (let y = 0; y < h; y++) {
            const row = raw.subarray(y * (1 + w * 4), (y + 1) * (1 + w * 4));
            assert.equal(row[0], 0, 'filter type None');
            assert.deepEqual([...row.subarray(1)], [...pixels.subarray(y * w * 4, (y + 1) * w * 4)]);
        }
    }
});

test('the shared buffer is reused: a second encode does not leak bytes from the first', () => {
    const buf = new DynamicBuffer(16);
    const big = encodePng(rgbaPattern(32, 32), 32, 32, buf);
    const small = encodePng(rgbaPattern(1, 1), 1, 1, buf);
    assert.ok(small.length < big.length);
    assert.deepEqual(small, encodePng(rgbaPattern(1, 1), 1, 1, new DynamicBuffer()));
});

test('DynamicBuffer grows and writes big-endian ints', () => {
    const b = new DynamicBuffer(1);
    for (let i = 0; i < 40; i++) b.writeByte(i + 256);
    b.writeInt32BE(0x01020304);
    b.setInt32BE(0, -1);
    const out = b.toUint8Array();
    assert.equal(out.length, 44);
    assert.deepEqual([...out.subarray(0, 5)], [255, 255, 255, 255, 4]);
    assert.deepEqual([...out.subarray(40)], [1, 2, 3, 4]);
    b.reset();
    assert.equal(b.position(), 0);
});

const kb = (n) => new Uint8Array(n * 1024);

test('LruCache evicts least-recently-used entries beyond the KB budget', () => {
    const c = new LruCache(3);
    c.put('a', kb(1)); c.put('b', kb(1)); c.put('c', kb(1));
    assert.ok(c.get('a'), 'touch a so b becomes the oldest');
    c.put('d', kb(1));
    assert.equal(c.get('b'), undefined);
    assert.ok(c.get('a') && c.get('c') && c.get('d'));
    // A 2 KB entry pushes out two of the oldest.
    c.put('e', kb(2));
    assert.deepEqual(['a', 'c', 'd', 'e'].map((k) => c.get(k) !== undefined), [false, false, true, true]);
});

test('LruCache counts tiny/empty entries as 1 KB, replaces in place, and evictAll clears', () => {
    const c = new LruCache(2);
    const empty = new Uint8Array(0);
    c.put('x', empty); c.put('y', new Uint8Array(10));
    assert.equal(c.get('x'), empty);
    c.put('x', new Uint8Array(5)); // replace: still 2 KB total, nothing evicted
    assert.ok(c.get('y'));
    c.put('z', new Uint8Array(1));
    assert.equal(c.get('x'), undefined, 'x was oldest after y was read');
    // An entry bigger than the whole budget is still stored (after evicting everything).
    c.put('huge', kb(10));
    assert.equal(c.get('y'), undefined);
    assert.ok(c.get('huge'));
    c.evictAll();
    assert.equal(c.get('huge'), undefined);
});
