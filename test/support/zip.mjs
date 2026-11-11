import { crc32, deflateRawSync } from 'node:zlib';

// テスト用の最小 ZIP（KMZ）組み立て。entries: [{ name, data: string|Uint8Array, method?: 0|8 }]
export function makeZip(entries) {
    const enc = new TextEncoder();
    const locals = [];
    const centrals = [];
    let offset = 0;
    for (const { name, data, method = 8 } of entries) {
        const nameBytes = enc.encode(name);
        const raw = typeof data === 'string' ? enc.encode(data) : data;
        const body = method === 8 ? new Uint8Array(deflateRawSync(raw)) : raw;
        const crc = crc32(raw);
        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);
        local.setUint16(4, 20, true);
        local.setUint16(8, method, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, body.length, true);
        local.setUint32(22, raw.length, true);
        local.setUint16(26, nameBytes.length, true);
        const central = new DataView(new ArrayBuffer(46));
        central.setUint32(0, 0x02014b50, true);
        central.setUint16(4, 20, true);
        central.setUint16(6, 20, true);
        central.setUint16(10, method, true);
        central.setUint32(16, crc, true);
        central.setUint32(20, body.length, true);
        central.setUint32(24, raw.length, true);
        central.setUint16(28, nameBytes.length, true);
        central.setUint32(42, offset, true);
        locals.push(new Uint8Array(local.buffer), nameBytes, body);
        centrals.push(new Uint8Array(central.buffer), nameBytes);
        offset += 30 + nameBytes.length + body.length;
    }
    const centralSize = centrals.reduce((n, b) => n + b.length, 0);
    const eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(8, entries.length, true);
    eocd.setUint16(10, entries.length, true);
    eocd.setUint32(12, centralSize, true);
    eocd.setUint32(16, offset, true);
    const parts = [...locals, ...centrals, new Uint8Array(eocd.buffer)];
    const out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
    let p = 0;
    for (const b of parts) { out.set(b, p); p += b.length; }
    return out;
}
