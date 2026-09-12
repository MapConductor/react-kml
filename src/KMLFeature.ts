import type { KMLGeometry } from './KMLGeometry';

/**
 * Lightweight, non-reactive data object for static/bulk KML features.
 * Use this (instead of KMLFeatureState) when loading large KML files
 * that don't need per-feature reactive updates — e.g. via KMLParser.parse.
 */
export interface KMLFeatureData {
    readonly id?: string | null;
    readonly geometry: KMLGeometry;
    readonly properties: Readonly<Record<string, unknown>>;
    readonly strokeColor?: number | null;
    readonly fillColor?: number | null;
    readonly strokeWidth?: number | null;
    readonly pointRadius?: number | null;
    readonly visible: boolean;
}

export function createKMLFeature(params: {
    id?: string | null;
    geometry: KMLGeometry;
    properties?: Record<string, unknown>;
    strokeColor?: number | null;
    fillColor?: number | null;
    strokeWidth?: number | null;
    pointRadius?: number | null;
    visible?: boolean;
}): KMLFeatureData {
    return {
        id: params.id ?? null,
        geometry: params.geometry,
        properties: params.properties ?? {},
        strokeColor: params.strokeColor ?? null,
        fillColor: params.fillColor ?? null,
        strokeWidth: params.strokeWidth ?? null,
        pointRadius: params.pointRadius ?? null,
        visible: params.visible ?? true,
    };
}
