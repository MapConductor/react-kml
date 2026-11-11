import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEntries } from './support/build.mjs';
import { makeZip } from './support/zip.mjs';

// KMLLoader: NetworkLink を幅優先でたどって 1 枚に平坦化する。取得はスタブで差し替え、
// 相対 href の解決、循環参照で同じ URL を 2 度取らないこと、visibility=0 の除外、
// maxDocuments の上限、子の失敗はスキップ・ルートの失敗は投げる、を確かめる。
const { loader } = await buildEntries('loader-tests', { loader: 'src/KMLLoader.ts' });
const { KMLLoader } = loader;

const point = (lon) => `<Placemark><Point><coordinates>${lon},0</coordinates></Point></Placemark>`;
const link = (href, visibility) =>
    `<NetworkLink>${visibility === undefined ? '' : `<visibility>${visibility}</visibility>`}<Link><href>${href}</href></Link></NetworkLink>`;
const doc = (...parts) => `<kml><Document>${parts.join('')}</Document></kml>`;

function stubFetch(table) {
    const calls = [];
    const fetch = async (url) => {
        calls.push(url);
        if (!(url in table)) throw new Error(`404 ${url}`);
        return table[url];
    };
    return { fetch, calls };
}

const lons = (features) => features.map((f) => f.geometry.longitude);

test('follows links breadth-first, resolving relative hrefs against the fetching document', async () => {
    const { fetch, calls } = stubFetch({
        'https://ex.com/data/root.kml': doc(point(0), link('a.kml'), link('../b.kml')),
        'https://ex.com/data/a.kml': doc(point(1), link('sub/c.kml')),
        'https://ex.com/b.kml': doc(point(2)),
        'https://ex.com/data/sub/c.kml': doc(point(3)),
    });
    const features = await new KMLLoader({ fetch }).load('https://ex.com/data/root.kml');
    assert.deepEqual(lons(features), [0, 1, 2, 3]);
    assert.deepEqual(calls, [
        'https://ex.com/data/root.kml',
        'https://ex.com/data/a.kml',
        'https://ex.com/b.kml',
        'https://ex.com/data/sub/c.kml',
    ]);
});

test('cycles and duplicate links fetch each URL once', async () => {
    const { fetch, calls } = stubFetch({
        'https://ex.com/a.kml': doc(point(0), link('b.kml'), link('b.kml'), link('a.kml')),
        'https://ex.com/b.kml': doc(point(1), link('https://ex.com/a.kml')),
    });
    const features = await new KMLLoader({ fetch }).load('https://ex.com/a.kml');
    assert.deepEqual(lons(features), [0, 1]);
    assert.deepEqual(calls, ['https://ex.com/a.kml', 'https://ex.com/b.kml']);
});

test('visibility=0 links are not followed', async () => {
    const { fetch, calls } = stubFetch({ 'https://ex.com/b.kml': doc(point(1)) });
    const features = await new KMLLoader({ fetch }).load(doc(point(0), link('https://ex.com/b.kml', 0)));
    assert.deepEqual(lons(features), [0]);
    assert.deepEqual(calls, []);
});

test('inline KML without a base URL follows only absolute links', async () => {
    const { fetch, calls } = stubFetch({ 'https://ex.com/abs.kml': doc(point(1)) });
    const loader = new KMLLoader({ fetch });
    const features = await loader.load(`  \n${doc(point(0), link('rel.kml'), link('https://ex.com/abs.kml'))}`);
    assert.deepEqual(lons(features), [0, 1]);
    assert.deepEqual(calls, ['https://ex.com/abs.kml']);

    const { fetch: fetch2, calls: calls2 } = stubFetch({ 'https://base.io/x/rel.kml': doc(point(2)) });
    const withBase = await new KMLLoader({ fetch: fetch2 }).load(doc(link('rel.kml')), 'https://base.io/x/root.kml');
    assert.deepEqual(lons(withBase), [2]);
    assert.deepEqual(calls2, ['https://base.io/x/rel.kml']);
});

test('maxDocuments caps the number of parsed documents, root included', async () => {
    const table = {};
    for (let i = 0; i < 10; i++) table[`https://ex.com/${i}.kml`] = doc(point(i), link(`${i + 1}.kml`));
    const { fetch, calls } = stubFetch(table);
    const features = await new KMLLoader({ fetch, maxDocuments: 3 }).load('https://ex.com/0.kml');
    assert.deepEqual(lons(features), [0, 1, 2]);
    assert.equal(calls.length, 3);
    assert.equal(KMLLoader.DEFAULT_MAX_DOCUMENTS, 20);
});

test('a failing child is skipped and reported; a failing root throws', async () => {
    const errors = [];
    const { fetch } = stubFetch({
        'https://ex.com/root.kml': doc(point(0), link('missing.kml'), link('ok.kml')),
        'https://ex.com/ok.kml': doc(point(1)),
    });
    const loader = new KMLLoader({ fetch, onDocumentError: (url, e) => errors.push([url, e.message]) });
    assert.deepEqual(lons(await loader.load('https://ex.com/root.kml')), [0, 1]);
    assert.deepEqual(errors, [['https://ex.com/missing.kml', '404 https://ex.com/missing.kml']]);
    await assert.rejects(loader.load('https://ex.com/nope.kml'), /404/);
});

test('KMZ bytes are accepted both as the root and as a linked document', async () => {
    const kmz = makeZip([{ name: 'doc.kml', data: doc(point(5)) }]);
    const { fetch } = stubFetch({ 'https://ex.com/z.kmz': kmz });
    const features = await new KMLLoader({ fetch }).load(makeZip([{ name: 'doc.kml', data: doc(point(4), link('https://ex.com/z.kmz')) }]));
    assert.deepEqual(lons(features), [4, 5]);
});

test('resolveHref', () => {
    assert.equal(KMLLoader.resolveHref(null, 'https://a/b.kml'), 'https://a/b.kml');
    assert.equal(KMLLoader.resolveHref('https://a/x/y.kml', 'z.kml'), 'https://a/x/z.kml');
    assert.equal(KMLLoader.resolveHref('https://a/x/y.kml', '/z.kml'), 'https://a/z.kml');
    assert.equal(KMLLoader.resolveHref(null, 'z.kml'), null);
    assert.equal(KMLLoader.resolveHref('not a url', 'z.kml'), null);
});
