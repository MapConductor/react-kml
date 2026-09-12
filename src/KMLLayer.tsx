import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    LocalTileServer,
    OverlayCollector,
    TileScheme,
    TileServerRegistry,
    createRasterLayerState,
} from '@mapconductor/js-sdk-core';
import { RasterLayer } from '@mapconductor/js-sdk-react';
import { KMLDefaults } from './KMLDefaults';
import { KMLTileRenderer } from './KMLTileRenderer';
import { KMLLayerState } from './KMLLayerState';
import { KMLFeatureState } from './KMLFeatureState';
import type { KMLFeatureData } from './KMLFeature';
import type { KMLFeatureFingerPrint } from './KMLFeatureState';

// ─── Context ──────────────────────────────────────────────────────────────────

const KMLFeatureContext = createContext<OverlayCollector<KMLFeatureState> | null>(null);

function useFeatureCollector(): OverlayCollector<KMLFeatureState> {
    const ctx = useContext(KMLFeatureContext);
    if (!ctx) throw new Error('KMLFeature must be rendered inside <KMLLayer>');
    return ctx;
}

// ─── KMLLayer ─────────────────────────────────────────────────────────────

export interface KMLLayerProps {
    state?: KMLLayerState;
    features?: KMLFeatureData[];
    tileSize?: number;
    trackFeatureUpdates?: boolean;
    children?: React.ReactNode;
}

export function KMLLayer(props: KMLLayerProps): React.ReactElement | null {
    const {
        state: stateProp,
        features = [],
        tileSize = KMLDefaults.DEFAULT_TILE_SIZE,
        trackFeatureUpdates = false,
        children,
    } = props;

    const state = useMemo(() => stateProp ?? new KMLLayerState(), [stateProp]);
    const groupId = useMemo(() => `kml-${Math.random().toString(36).slice(2)}`, []);
    const renderer = useMemo(() => new KMLTileRenderer({ tileSize }), [tileSize]);
    const collector = useMemo(() => new OverlayCollector<KMLFeatureState>(), []);
    const tileServer = useMemo(() => TileServerRegistry.get(), []);

    const rasterStateRef = useRef(
        createRasterLayerState({
            source: {
                type: 'UrlTemplate',
                template: tileServer.urlTemplate({ routeId: groupId, tileSize }),
                tileSize,
                maxZoom: KMLDefaults.DEFAULT_MAX_ZOOM,
                scheme: TileScheme.XYZ,
            },
            opacity: Math.max(0, Math.min(1, state.opacity)),
            visible: state.visible,
            id: `kml-${groupId}`,
        }),
    );

    const [isTileServerRegistered, setIsTileServerRegistered] = useState(false);
    const [hasRenderedOnce, setHasRenderedOnce] = useState(false);
    const [featureVersion, setFeatureVersion] = useState(0);
    const [updateToken, setUpdateToken] = useState(0);
    const featureMapRef = useRef<ReadonlyMap<string, KMLFeatureState>>(new Map());

    // ── Opacity / visibility updates ──────────────────────────────────────────
    useEffect(() => {
        rasterStateRef.current.opacity = Math.max(0, Math.min(1, state.opacity));
    }, [state.opacity]);

    useEffect(() => {
        rasterStateRef.current.visible = state.visible;
    }, [state.visible]);

    // ── Register tile server ──────────────────────────────────────────────────
    useEffect(() => {
        tileServer.register(groupId, renderer);

        // `/__tiles/` URLs are only resolvable while the tile SW controls the page.
        // Start it and wait before mounting RasterLayer to avoid 404s or timeouts.
        let cancelled = false;
        if (LocalTileServer.isServiceWorkerSupported()) {
            tileServer.startServiceWorker('/tile-sw.js');
            tileServer.waitForController().then(() => {
                if (!cancelled) setIsTileServerRegistered(true);
            });
        } else {
            setIsTileServerRegistered(true);
        }

        return () => {
            cancelled = true;
            tileServer.unregister(groupId);
            setIsTileServerRegistered(false);
        };
    }, [groupId, tileServer, renderer]);

    // ── Wire renderer to state for hit-testing ────────────────────────────────
    useEffect(() => {
        state.renderer = renderer;
        return () => { state.renderer = null; };
    }, [state, renderer]);

    // ── Subscribe to child-based feature changes ──────────────────────────────
    useEffect(() => {
        return collector.subscribe((map: ReadonlyMap<string, KMLFeatureState>) => {
            featureMapRef.current = map;
            setFeatureVersion(v => v + 1);
        });
    }, [collector]);

    // ── Track per-feature state changes ──────────────────────────────────────
    useEffect(() => {
        if (trackFeatureUpdates) {
            collector.setUpdateHandler(() => setUpdateToken(t => t + 1));
        } else {
            collector.setUpdateHandler(null);
        }
        return () => { collector.setUpdateHandler(null); };
    }, [collector, trackFeatureUpdates]);

    // ── features prop → collector ─────────────────────────────────────────────
    // (static features are passed directly to renderer, not via collector)

    // ── Re-render tiles when features or style changes ────────────────────────
    useEffect(() => {
        const dynamicFeatures = Array.from(featureMapRef.current.values());
        const layerStyle = {
            strokeColor: state.strokeColor,
            fillColor: state.fillColor,
            strokeWidth: state.strokeWidth,
            pointRadius: state.pointRadius,
        };

        renderer.update(features, dynamicFeatures, layerStyle);

        if (features.length === 0 && dynamicFeatures.length === 0) {
            setHasRenderedOnce(false);
            return;
        }

        setHasRenderedOnce(true);
        rasterStateRef.current.source = {
            type: 'UrlTemplate',
            template: tileServer.urlTemplate({
                routeId: groupId,
                tileSize,
                cacheKey: String(featureVersion + updateToken),
            }),
            tileSize,
            maxZoom: KMLDefaults.DEFAULT_MAX_ZOOM,
            scheme: TileScheme.XYZ,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        featureVersion, updateToken,
        features,
        state.strokeColor, state.fillColor, state.strokeWidth, state.pointRadius,
        groupId, tileSize, tileServer, renderer,
    ]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            collector.setUpdateHandler(null);
            collector.clear();
        };
    }, [collector]);

    return (
        <KMLFeatureContext.Provider value={collector}>
            {isTileServerRegistered && hasRenderedOnce && (
                <RasterLayer state={rasterStateRef.current} />
            )}
            {children}
        </KMLFeatureContext.Provider>
    );
}

// ─── KMLFeature (child component) ────────────────────────────────────────

export interface KMLFeatureStateProps {
    state: KMLFeatureState;
    geometry?: never;
}

export interface KMLFeatureParamsProps {
    state?: never;
    geometry: KMLFeatureState['geometry'];
    featureId?: string | null;
    properties?: Record<string, unknown>;
    strokeColor?: number | null;
    fillColor?: number | null;
    strokeWidth?: number | null;
    pointRadius?: number | null;
    visible?: boolean;
}

export type KMLFeatureProps = KMLFeatureStateProps | KMLFeatureParamsProps;

function KMLFeatureWithState({ state }: KMLFeatureStateProps): null {
    const collector = useFeatureCollector();

    useEffect(() => { collector.add(state); }, [state, collector]);

    useEffect(() => {
        return () => { collector.remove(state.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.id, collector]);

    return null;
}

function KMLFeatureFromParams(props: KMLFeatureParamsProps): React.ReactElement | null {
    const stateRef = useRef<KMLFeatureState | null>(null);
    if (!stateRef.current) {
        stateRef.current = new KMLFeatureState({
            featureId: props.featureId,
            geometry: props.geometry,
            properties: props.properties,
            strokeColor: props.strokeColor,
            fillColor: props.fillColor,
            strokeWidth: props.strokeWidth,
            pointRadius: props.pointRadius,
            visible: props.visible,
        });
    }
    const s = stateRef.current;

    useEffect(() => { s.geometry = props.geometry; }, [s, props.geometry]);
    useEffect(() => { s.properties = props.properties ?? {}; }, [s, props.properties]);
    useEffect(() => { s.strokeColor = props.strokeColor ?? null; }, [s, props.strokeColor]);
    useEffect(() => { s.fillColor = props.fillColor ?? null; }, [s, props.fillColor]);
    useEffect(() => { s.strokeWidth = props.strokeWidth ?? null; }, [s, props.strokeWidth]);
    useEffect(() => { s.pointRadius = props.pointRadius ?? null; }, [s, props.pointRadius]);
    useEffect(() => { s.visible = props.visible ?? true; }, [s, props.visible]);

    return <KMLFeatureWithState state={s} />;
}

export function KMLFeature(props: KMLFeatureStateProps): null;
export function KMLFeature(props: KMLFeatureParamsProps): React.ReactElement | null;
export function KMLFeature(props: KMLFeatureProps): React.ReactElement | null {
    if (props.state !== undefined) return <KMLFeatureWithState state={props.state} />;
    return <KMLFeatureFromParams {...(props as KMLFeatureParamsProps)} />;
}

// ─── KMLFeatures (bulk) ───────────────────────────────────────────────────

export interface KMLFeaturesProps {
    states: KMLFeatureState[];
}

export function KMLFeatures({ states }: KMLFeaturesProps): null {
    const collector = useFeatureCollector();

    useEffect(() => {
        collector.replaceAll(states);
    }, [states, states.length, collector]);

    useEffect(() => {
        return () => { collector.clear(); };
    }, [collector]);

    return null;
}

// Re-export type for external consumers
export type { KMLFeatureFingerPrint };
