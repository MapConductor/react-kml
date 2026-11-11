import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEntries } from './support/build.mjs';
import { makeZip } from './support/zip.mjs';

// KMLParser: プレースマークのジオメトリ、共有スタイルと StyleMap の解決、
// ExtendedData、NetworkLink の収集、深いネストでもスタックを食わないこと、
// KMZ（無圧縮・deflate）の展開を確かめる。
const { parser, colors } = await buildEntries('parser-tests', {
    parser: 'src/KMLParser.ts',
    colors: 'src/KMLDefaults.ts',
});
const { KMLParser } = parser;
const { colorArgb } = colors;

const kml = (body) => `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${body}</Document></kml>`;

test('Point / LineString / LinearRing / Polygon with holes', () => {
    const features = KMLParser.parse(kml(`
        <Placemark><name> Tokyo </name><description>capital</description>
            <Point><coordinates>139.69,35.68,0</coordinates></Point></Placemark>
        <Placemark><LineString><tessellate>1</tessellate><coordinates>0,0 1,1 2,0</coordinates></LineString></Placemark>
        <Placemark><LinearRing><coordinates>0,0 1,0 1,1 0,0</coordinates></LinearRing></Placemark>
        <Placemark><Polygon>
            <innerBoundaryIs><LinearRing><coordinates>1,1 2,1 2,2 1,1</coordinates></LinearRing></innerBoundaryIs>
            <outerBoundaryIs><LinearRing><coordinates>0,0 4,0 4,4 0,4 0,0</coordinates></LinearRing></outerBoundaryIs>
        </Polygon></Placemark>`));
    assert.equal(features.length, 4);
    assert.deepEqual(features[0].geometry, { type: 'Point', longitude: 139.69, latitude: 35.68 });
    assert.deepEqual(features[0].properties, { name: 'Tokyo', description: 'capital' });
    assert.equal(features[0].visible, true);
    assert.equal(features[0].strokeColor, null);
    assert.equal(features[0].fillColor, null);
    assert.equal(features[1].geometry.type, 'LineString');
    assert.equal(features[1].geometry.coordinates.length, 3);
    // LinearRing on its own is treated as a line.
    assert.equal(features[2].geometry.type, 'LineString');
    // The exterior ring always comes first, even if the hole was written first.
    const rings = features[3].geometry.rings;
    assert.equal(features[3].geometry.type, 'Polygon');
    assert.equal(rings.length, 2);
    assert.equal(rings[0].length, 5);
    assert.deepEqual(rings[1][0], { longitude: 1, latitude: 1 });
});

test('placemarks without usable geometry are dropped', () => {
    const features = KMLParser.parse(kml(`
        <Placemark><name>no geometry</name></Placemark>
        <Placemark><Point><coordinates>bad</coordinates></Point></Placemark>
        <Placemark><Polygon><innerBoundaryIs><LinearRing><coordinates>0,0 1,1 0,1 0,0</coordinates></LinearRing></innerBoundaryIs></Polygon></Placemark>
        <Placemark><Point><coordinates>1,2</coordinates></Point></Placemark>`));
    assert.equal(features.length, 1);
    assert.deepEqual(features[0].geometry, { type: 'Point', longitude: 1, latitude: 2 });
});

test('MultiGeometry nests into GeometryCollections', () => {
    const [feature] = KMLParser.parse(kml(`<Placemark><MultiGeometry>
        <Point><coordinates>1,1</coordinates></Point>
        <MultiGeometry>
            <LineString><coordinates>0,0 1,1</coordinates></LineString>
            <Point><coordinates>2,2</coordinates></Point>
        </MultiGeometry>
        <Unknown><x/></Unknown>
    </MultiGeometry></Placemark>`));
    const g = feature.geometry;
    assert.equal(g.type, 'GeometryCollection');
    assert.equal(g.geometries.length, 2);
    assert.equal(g.geometries[0].type, 'Point');
    assert.equal(g.geometries[1].type, 'GeometryCollection');
    assert.deepEqual(g.geometries[1].geometries.map((x) => x.type), ['LineString', 'Point']);
});

test('shared styles, StyleMap normal pair, inline style, fill/outline off', () => {
    const features = KMLParser.parse(kml(`
        <Style id="red"><LineStyle><color>ff0000ff</color><width>3.5</width></LineStyle>
            <PolyStyle><color>800000ff</color></PolyStyle></Style>
        <Style id="hl"><LineStyle><color>ffffffff</color></LineStyle></Style>
        <StyleMap id="map">
            <Pair><key>highlight</key><styleUrl>#hl</styleUrl></Pair>
            <Pair><key>normal</key><styleUrl>#red</styleUrl></Pair>
        </StyleMap>
        <Style id="hollow"><LineStyle><color>ff00ff00</color></LineStyle><PolyStyle><fill>0</fill><outline>0</outline></PolyStyle></Style>
        <Style id="icon"><IconStyle><color>ff00ffff</color><scale>2</scale></IconStyle></Style>
        <Placemark><styleUrl>#red</styleUrl><Point><coordinates>0,0</coordinates></Point></Placemark>
        <Placemark><styleUrl>#map</styleUrl><Point><coordinates>0,0</coordinates></Point></Placemark>
        <Placemark><styleUrl>#hollow</styleUrl><Point><coordinates>0,0</coordinates></Point></Placemark>
        <Placemark><styleUrl>#icon</styleUrl><Point><coordinates>0,0</coordinates></Point></Placemark>
        <Placemark><styleUrl>#missing</styleUrl><Point><coordinates>0,0</coordinates></Point></Placemark>
        <Placemark><styleUrl>#red</styleUrl>
            <Style><LineStyle><color>ff00ff00</color></LineStyle></Style>
            <Point><coordinates>0,0</coordinates></Point></Placemark>`));
    const red = colorArgb(255, 255, 0, 0);
    const halfRed = colorArgb(0x80, 255, 0, 0);
    assert.deepEqual([features[0].strokeColor, features[0].fillColor, features[0].strokeWidth], [red, halfRed, 3.5]);
    // StyleMap resolves to its "normal" style, not "highlight".
    assert.deepEqual([features[1].strokeColor, features[1].fillColor, features[1].strokeWidth], [red, halfRed, 3.5]);
    // fill=0 / outline=0 become fully transparent, not "unset".
    assert.deepEqual([features[2].strokeColor, features[2].fillColor], [0, 0]);
    // IconStyle color falls back to the fill color.
    assert.equal(features[3].fillColor, colorArgb(255, 255, 255, 0));
    assert.equal(features[3].strokeColor, null);
    // An unknown style reference resolves to "no style".
    assert.deepEqual([features[4].strokeColor, features[4].fillColor, features[4].strokeWidth], [null, null, null]);
    // An inline <Style> wins over styleUrl wholesale (no merging).
    assert.equal(features[5].strokeColor, colorArgb(255, 0, 255, 0));
    assert.equal(features[5].fillColor, null);
});

test('ExtendedData Data/SimpleData become properties and win over name/description', () => {
    const [feature] = KMLParser.parse(kml(`<Placemark>
        <name>display</name><description>desc</description>
        <ExtendedData>
            <Data name="name"><displayName>N</displayName><value> override </value></Data>
            <Data name="empty"></Data>
            <SchemaData schemaUrl="#s"><SimpleData name="pop">123</SimpleData></SchemaData>
        </ExtendedData>
        <Point><coordinates>0,0</coordinates></Point></Placemark>`));
    assert.deepEqual(feature.properties, { name: 'override', empty: null, pop: '123', description: 'desc' });
});

test('Folder / Document nesting is transparent, including very deep nesting', () => {
    const depth = 20000;
    const deep = '<Folder>'.repeat(depth) + '<Placemark><Point><coordinates>5,6</coordinates></Point></Placemark>' + '</Folder>'.repeat(depth);
    const features = KMLParser.parse(kml(`<Folder><Document>${deep}</Document></Folder>
        <Placemark><Point><coordinates>7,8</coordinates></Point></Placemark>`));
    assert.deepEqual(features.map((f) => f.geometry.longitude), [5, 7]);
});

test('parseDocument collects NetworkLinks (Link and legacy Url) without fetching', async () => {
    const doc = await KMLParser.parseDocument(kml(`
        <NetworkLink><Link><href> sub/a.kml </href><refreshMode>onInterval</refreshMode></Link></NetworkLink>
        <NetworkLink><visibility>0</visibility><Url><href>http://x/b.kmz</href></Url></NetworkLink>
        <NetworkLink><name>no href</name></NetworkLink>
        <Placemark><Point><coordinates>1,1</coordinates></Point></Placemark>`));
    assert.equal(doc.features.length, 1);
    assert.deepEqual(doc.networkLinks, [
        { href: 'sub/a.kml', visibility: true },
        { href: 'http://x/b.kmz', visibility: false },
    ]);
});

test('parseDocument accepts plain KML bytes and ArrayBuffers', async () => {
    const bytes = new TextEncoder().encode(kml('<Placemark><Point><coordinates>3,4</coordinates></Point></Placemark>'));
    for (const input of [bytes, bytes.buffer]) {
        const doc = await KMLParser.parseDocument(input);
        assert.deepEqual(doc.features[0].geometry, { type: 'Point', longitude: 3, latitude: 4 });
    }
});

test('KMZ: the first .kml entry is used, stored or deflated; other entries are ignored', async () => {
    const body = kml('<Placemark><Point><coordinates>9,10</coordinates></Point></Placemark>');
    for (const method of [0, 8]) {
        const zip = makeZip([
            { name: 'files/', data: '', method: 0 },
            { name: '__MACOSX/doc.kml', data: 'garbage', method: 0 },
            { name: 'files/icon.png', data: new Uint8Array([1, 2, 3]), method: 0 },
            { name: 'DOC.KML', data: body, method },
            { name: 'second.kml', data: kml(''), method },
        ]);
        const doc = await KMLParser.parseDocument(zip);
        assert.deepEqual(doc.features.map((f) => f.geometry), [{ type: 'Point', longitude: 9, latitude: 10 }], `method ${method}`);
    }
});

test('KMZ errors: no .kml entry, unsupported method, not really a zip', async () => {
    await assert.rejects(KMLParser.parseDocument(makeZip([{ name: 'a.png', data: 'x', method: 0 }])), /no \.kml entry/);
    const bad = makeZip([{ name: 'doc.kml', data: 'x', method: 0 }]);
    // Patch the central-directory method field to 12 (bzip2).
    const view = new DataView(bad.buffer);
    const central = 30 + 'doc.kml'.length + 1;
    assert.equal(view.getUint32(central, true), 0x02014b50);
    view.setUint16(central + 10, 12, true);
    await assert.rejects(KMLParser.parseDocument(bad), /unsupported compression method 12/);
    await assert.rejects(KMLParser.parseDocument(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])), /end-of-central-directory/);
});
