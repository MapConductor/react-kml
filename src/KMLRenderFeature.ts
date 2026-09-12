import type { KMLFeatureData } from './KMLFeature';
import type { KMLGeometry } from './KMLGeometry';
import type { KMLFeatureState } from './KMLFeatureState';
import type { KMLStyleProviderInterface } from './KMLStyleProviderInterface';
import { argbToCss, colorAlpha } from './KMLDefaults';
import { computeBounds, toWorldGeometry, type RenderFeature } from './KMLWorld';

/** レイヤ全体の既定スタイル。フィーチャー個別の指定が無いときに使われる。 */
export interface KMLLayerStyle {
    strokeColor: number;
    fillColor: number;
    strokeWidth: number;
    pointRadius: number;
}

/**
 * スタイルを解決し、描画用フィーチャーを組み立てる部分。
 *
 * 元の緯度経度ジオメトリは捨てる。座標は世界座標側が持っており、描画も
 * 当たり判定もそちらを使う。両方持つとメモリが倍になる。
 *
 * android-sdk の `KMLRenderFeature.kt` / ios-sdk の同名ファイルと同じ。
 */

// ─── Build render features ───────────────────────────────────────────────────

export function buildRenderFeatureFromData(
    feature: KMLFeatureData,
    layerStyle: KMLLayerStyle,
    styleProvider: KMLStyleProviderInterface,
): RenderFeature {
    const style = styleProvider(feature, layerStyle);
    return buildRenderFeature(
        feature,
        feature.geometry,
        style.strokeColor,
        style.fillColor,
        style.strokeWidth,
        style.pointRadius,
    );
}

export function buildRenderFeatureFromState(
    state: KMLFeatureState,
    layerStyle: KMLLayerStyle,
    styleProvider: KMLStyleProviderInterface,
): RenderFeature {
    const source: KMLFeatureData = {
        id: state.id,
        geometry: state.geometry,
        properties: state.properties,
        strokeColor: state.strokeColor,
        fillColor: state.fillColor,
        strokeWidth: state.strokeWidth,
        pointRadius: state.pointRadius,
        visible: state.visible,
    };
    const style = styleProvider(source, layerStyle);
    return buildRenderFeature(
        source,
        state.geometry,
        style.strokeColor,
        style.fillColor,
        style.strokeWidth,
        style.pointRadius,
    );
}

export function buildRenderFeature(
    source: KMLFeatureData,
    geometry: KMLGeometry,
    strokeColor: number,
    fillColor: number,
    strokeWidth: number,
    pointRadius: number,
): RenderFeature {
    const strokeStyle = (colorAlpha(strokeColor) > 0 && strokeWidth > 0) ? argbToCss(strokeColor) : null;
    const worldGeometry = toWorldGeometry(geometry);
    const bounds = computeBounds(worldGeometry);
    return {
        // Strip geometry from source; worldGeometry holds all coords for rendering
        source: { ...source, geometry: { type: 'Empty' } },
        worldGeometry,
        bounds,
        fillStyle: argbToCss(fillColor),
        strokeStyle,
        strokeWidth,
        pointRadius,
    };
}
