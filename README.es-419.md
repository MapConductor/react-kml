[English](./README.md) | [日本語](./README.ja.md) | Español (Latinoamérica)

# @mapconductor/react-kml

Extensión de capa KML para el MapConductor React SDK. Analiza documentos OGC
KML 2.2 (y archivos KMZ) en modelos de elementos y los renderiza como una
superposición de mosaicos dentro de cualquier vista de mapa de proveedor
(`react-for-googlemaps`, `react-for-maplibre`, `react-for-here`, …), con
estilos KML y detección de clics. Comparte la arquitectura de renderizado por
mosaicos de `@mapconductor/react-geojson`, por lo que escala a conjuntos
de datos KML grandes.

El soporte para React Native aún no está disponible — por ahora este paquete es
solo para web.

## Características

- Analiza `Point`, `LineString`, `LinearRing`, `Polygon` (con agujeros de
  `innerBoundaryIs`) y `MultiGeometry`.
- Lee archivos KMZ de forma transparente: la entrada ZIP se detecta por firma y
  se usa la primera entrada `.kml` (convencionalmente `doc.kml`).
- Recorre contenedores `<Document>` y `<Folder>` anidados con un bucle y un
  contador de profundidad — nunca con recursión.
- Sigue referencias `<NetworkLink>` mediante `KMLLoader`, con resolución de
  href relativos, detección de ciclos y un límite de documentos.
- Resuelve estilos KML: `LineStyle`, `PolyStyle`, `IconStyle`, incluidas las
  referencias compartidas `<Style>` / `<StyleMap>` vía `styleUrl`. Los colores
  KML `aabbggrr` se convierten a enteros ARGB.
- Lee `<name>`, `<description>` y `<ExtendedData>` (`Data`/`SchemaData`) en las
  propiedades del elemento.
- Estilos por capa y por elemento con `KMLStyleProviderInterface` y detección
  de clics con `KMLLayerState.processClick`.

## Instalación

```shell
npm install @mapconductor/react-kml
```

## Licencia

Apache License 2.0
