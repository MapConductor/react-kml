import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEntries } from './support/build.mjs';

// KML 読み取りの土台: 自前のプル型 XML トークナイザ、子要素の走査ヘルパ、
// 座標文字列と KML 色（aabbggrr）の解釈、ARGB 整数の色ユーティリティ。
const { xml, colors } = await buildEntries('xml-support-tests', {
    xml: 'src/KMLXmlSupport.ts',
    colors: 'src/KMLDefaults.ts',
});
const { KMLXmlPullParser, START_TAG, END_TAG, TEXT, END_DOCUMENT, forEachChild, readText, skip, parseCoordinates, parseKmlColor } = xml;
const { colorArgb, colorRgb, colorAlpha, colorRed, colorGreen, colorBlue, argbToCss, KMLDefaults } = colors;

function events(src) {
    const p = new KMLXmlPullParser(src);
    const out = [];
    for (;;) {
        const e = p.next();
        if (e === START_TAG) out.push(['start', p.name]);
        else if (e === END_TAG) out.push(['end', p.name]);
        else if (e === TEXT) out.push(['text', p.text]);
        else { out.push(['eod']); break; }
    }
    return out;
}

test('tokenizer skips the prolog, comments and doctype, and splits self-closing tags', () => {
    const src = '<?xml version="1.0"?><!DOCTYPE kml><!-- c --><a><b/><c>x</c></a>';
    assert.deepEqual(events(src), [
        ['start', 'a'], ['start', 'b'], ['end', 'b'],
        ['start', 'c'], ['text', 'x'], ['end', 'c'], ['end', 'a'], ['eod'],
    ]);
});

test('CDATA is returned verbatim and entities in text are decoded', () => {
    assert.deepEqual(events('<d><![CDATA[<b>&amp;</b>]]></d>'), [
        ['start', 'd'], ['text', '<b>&amp;</b>'], ['end', 'd'], ['eod'],
    ]);
    const [, [, text]] = events('<t>a &lt; b &amp;&amp; &#65;&#x42; &quot;&apos;&gt; &bogus;</t>');
    assert.equal(text, 'a < b && AB "\'> &bogus;');
});

test('attributes: double, single, unquoted, valueless; entities decoded; cleared on END_TAG', () => {
    const p = new KMLXmlPullParser(`<Data name="a&amp;b" other='x y' bare=v flag/>`);
    assert.equal(p.next(), START_TAG);
    assert.equal(p.name, 'Data');
    assert.equal(p.getAttributeValue('name'), 'a&b');
    assert.equal(p.getAttributeValue('other'), 'x y');
    assert.equal(p.getAttributeValue('bare'), 'v');
    assert.equal(p.getAttributeValue('flag'), '');
    assert.equal(p.getAttributeValue('missing'), null);
    assert.equal(p.next(), END_TAG);
    assert.equal(p.name, 'Data');
    assert.equal(p.getAttributeValue('name'), null);
    assert.equal(p.next(), END_DOCUMENT);
});

test('forEachChild visits direct children only and leaves the parser past the parent', () => {
    const p = new KMLXmlPullParser('<root><a><deep>1</deep></a><b>two</b><c/></root><after/>');
    p.next(); // <root>
    const seen = [];
    forEachChild(p, (name) => {
        seen.push(name);
        if (name === 'b') assert.equal(readText(p), 'two');
        else skip(p);
    });
    assert.deepEqual(seen, ['a', 'b', 'c']);
    assert.equal(p.next(), START_TAG);
    assert.equal(p.name, 'after');
});

test('readText concatenates text and CDATA pieces', () => {
    const p = new KMLXmlPullParser('<v>a<![CDATA[<b>]]>c</v>');
    p.next();
    assert.equal(readText(p), 'a<b>c');
});

test('truncated documents end instead of looping', () => {
    const p = new KMLXmlPullParser('<root><a>');
    p.next();
    forEachChild(p, () => skip(p));
    assert.equal(p.next(), END_DOCUMENT);
});

test('parseCoordinates reads lon,lat[,alt] tuples and drops malformed ones', () => {
    assert.deepEqual(parseCoordinates('\n  139.7,35.6,10  140,36\n\t1,2,3 bad 5 x,1 7,8 '), [
        { longitude: 139.7, latitude: 35.6 },
        { longitude: 140, latitude: 36 },
        { longitude: 1, latitude: 2 },
        { longitude: 7, latitude: 8 },
    ]);
    assert.deepEqual(parseCoordinates('   '), []);
});

test('parseKmlColor converts aabbggrr / bbggrr to ARGB and rejects anything else', () => {
    // KML: alpha=80, blue=ff, green=00, red=11
    const c = parseKmlColor(' 80ff0011 ');
    assert.equal(colorAlpha(c), 0x80);
    assert.equal(colorRed(c), 0x11);
    assert.equal(colorGreen(c), 0x00);
    assert.equal(colorBlue(c), 0xff);
    assert.equal(parseKmlColor('ff0000'), colorArgb(255, 0, 0, 255));
    assert.equal(parseKmlColor('0000ff'), colorRgb(255, 0, 0));
    assert.equal(parseKmlColor('fff'), null);
    assert.equal(parseKmlColor('zz00ff00'), null);
    assert.equal(parseKmlColor(''), null);
});

test('ARGB helpers are signed 32-bit and round-trip through the channel getters', () => {
    const c = colorArgb(255, 1, 2, 3);
    assert.equal(c, (0xff010203 | 0));
    assert.ok(c < 0);
    assert.deepEqual([colorAlpha(c), colorRed(c), colorGreen(c), colorBlue(c)], [255, 1, 2, 3]);
    assert.equal(colorRgb(1, 2, 3), c);
    assert.equal(argbToCss(colorArgb(128, 30, 136, 229)), 'rgba(30,136,229,0.5020)');
    assert.equal(argbToCss(0), 'rgba(0,0,0,0.0000)');
    assert.equal(KMLDefaults.DEFAULT_FILL_COLOR, colorArgb(128, 30, 136, 229));
});
