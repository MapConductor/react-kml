[English](./README.md) | 日本語 | [Español (Latinoamérica)](./README.es-419.md)

# @mapconductor/react-kml

MapConductor React SDK 向けの KML レイヤー拡張です。OGC KML 2.2 ドキュメント
（および KMZ アーカイブ）をフィーチャーモデルへ解析し、任意のプロバイダ地図
（`react-for-googlemaps`、`react-for-maplibre`、`react-for-here` など）の中に
タイルオーバーレイとして描画します。KML スタイルとクリック当たり判定に対応し、
`@mapconductor/react-geojson` と同じタイル描画アーキテクチャを共有する
ため、大きな KML データセットにもスケールします。

React Native 対応はまだありません — 現時点では Web 専用パッケージです。

## 特長

- `Point` / `LineString` / `LinearRing` / `Polygon`（`innerBoundaryIs` の穴付き）/
  `MultiGeometry` を解析。
- KMZ アーカイブを透過的に読み取り: ZIP シグネチャで検出し、最初の `.kml`
  エントリ（慣例的に `doc.kml`）をドキュメントとして使用。
- ネストした `<Document>` / `<Folder>` はループ + 深さカウンタで走査（再帰しない）。
  どれだけ深い階層でもコールスタックが溢れない。
- `<NetworkLink>` 参照は `KMLLoader` で追跡。相対 href の解決、循環検出、
  取得ドキュメント数の上限に対応。
- KML スタイルの解決: `LineStyle`（color, width）、`PolyStyle`（color, fill,
  outline）、`IconStyle`（color）。`styleUrl` による共有 `<Style>` / `<StyleMap>`
  参照にも対応。KML の `aabbggrr` 色は ARGB int に変換。
- `<name>` / `<description>` / `<ExtendedData>`（`Data` / `SchemaData`）を
  フィーチャーのプロパティへ読み込み。
- 静的一括フィーチャー（`KMLFeatureData`）とリアクティブなフィーチャー
  （`KMLFeatureState` / `KMLFeature` / `KMLFeatures`）に対応。
- `KMLStyleProviderInterface` によるレイヤー/フィーチャー単位のスタイル差し替え。
- `KMLLayerState.processClick` によるクリック当たり判定。

## インストール

```shell
npm install @mapconductor/react-kml
```

`@mapconductor/js-sdk-core` と `@mapconductor/js-sdk-react` は依存として自動で
インストールされます。地図ビューを提供するプロバイダパッケージ
（`@mapconductor/react-for-*` のいずれか）も必要です。

## ライセンス

Apache License 2.0
