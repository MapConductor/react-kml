import type { KMLFeatureData } from './KMLFeature';
import type { KMLLayerStyle } from './KMLRenderFeature';

/**
 * Resolves the render style for a KML feature. `defaultStyle` contains the
 * current layer-level stroke color, fill color, stroke width, and point radius.
 *
 * android-sdk の `KMLStyleProviderInterface.kt` に対応する。
 */
export type KMLStyleProviderInterface = (
    feature: KMLFeatureData,
    defaultStyle: KMLLayerStyle,
) => KMLLayerStyle;

/** Preserves the existing feature-style-over-layer-style behavior. */
export const DefaultKMLStyleProvider: KMLStyleProviderInterface = (feature, defaultStyle) => ({
    strokeColor: feature.strokeColor ?? defaultStyle.strokeColor,
    fillColor: feature.fillColor ?? defaultStyle.fillColor,
    strokeWidth: feature.strokeWidth ?? defaultStyle.strokeWidth,
    pointRadius: feature.pointRadius ?? defaultStyle.pointRadius,
});
