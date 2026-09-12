import type { KMLDocument } from './KMLDocument';
import type { KMLFeatureData } from './KMLFeature';
import { KMLParser } from './KMLParser';

/** 取得手段の注入点。URL を受け取り、KML テキストか KML/KMZ のバイト列を返す。 */
export type KMLFetchFunction = (url: string) => Promise<Uint8Array | string>;

/**
 * KML/KMZ を URL から取得し、`<NetworkLink>` が参照する外部ドキュメントまで
 * たどって 1 枚のフィーチャリストへ平坦化するローダ。
 *
 * KML はインターネット上の別の KML/KMZ を参照できる（NetworkLink）ため、取得は
 * キュー + 訪問済みセットのループで回す。参照がどれだけ連鎖しても呼び出しスタックを
 * 消費せず、循環参照があっても各 URL を 1 回しか取得しない。
 *
 * - 取得数は `maxDocuments` 枚まで（ルート含む）。超過分のリンクは読まない。
 * - `visibility` が 0 の NetworkLink は追跡しない。
 * - リンク先の取得・解析失敗はそのリンクだけをスキップし `onDocumentError` へ通知する。
 *   ルート自身の失敗は `load` がそのまま投げる。
 * - `refreshInterval` などの再読込モードは扱わない（一度だけ読む）。
 *
 * `fetch` を差し替えると取得手段（テスト用スタブや独自 HTTP スタック）を注入できる。
 * 既定はグローバル `fetch`（リダイレクトは自動追従）。
 *
 * android-sdk の `KMLLoader.kt` と同じ意味論。
 */
export class KMLLoader {
    static readonly DEFAULT_MAX_DOCUMENTS = 20;

    private readonly maxDocuments: number;
    private readonly onDocumentError: ((url: string, error: unknown) => void) | null;
    private readonly fetchFn: KMLFetchFunction;

    constructor(params: {
        maxDocuments?: number;
        onDocumentError?: ((url: string, error: unknown) => void) | null;
        fetch?: KMLFetchFunction;
    } = {}) {
        this.maxDocuments = params.maxDocuments ?? KMLLoader.DEFAULT_MAX_DOCUMENTS;
        this.onDocumentError = params.onDocumentError ?? null;
        this.fetchFn = params.fetch ?? defaultFetch;
    }

    /**
     * Loads KML/KMZ and merges the documents referenced by its NetworkLinks.
     *
     * - `load(url)` — fetches the document from `url` (http / https / …) and
     *   resolves relative NetworkLink hrefs against it.
     * - `load(data, baseUrl?)` — parses caller-supplied KML text or KML/KMZ
     *   bytes. Relative hrefs resolve against `baseUrl`; when `baseUrl` is
     *   omitted only absolute links are followed.
     *
     * A string argument is treated as KML text when it starts with `<`
     * (after leading whitespace); otherwise it is treated as a URL.
     */
    async load(source: string | Uint8Array | ArrayBuffer, baseUrl?: string): Promise<KMLFeatureData[]> {
        if (typeof source === 'string' && !source.trimStart().startsWith('<')) {
            return this.collect(null, source);
        }
        return this.collect(source, baseUrl ?? null);
    }

    private async collect(
        rootData: string | Uint8Array | ArrayBuffer | null,
        rootUrl: string | null,
    ): Promise<KMLFeatureData[]> {
        const features: KMLFeatureData[] = [];
        const queue: string[] = [];
        const visited = new Set<string>();
        let loaded = 0;

        const merge = (document: KMLDocument, baseUrl: string | null): void => {
            loaded++;
            features.push(...document.features);
            for (const link of document.networkLinks) {
                if (!link.visibility) continue;
                const resolved = KMLLoader.resolveHref(baseUrl, link.href);
                if (resolved === null) continue;
                if (!visited.has(resolved)) {
                    visited.add(resolved);
                    queue.push(resolved);
                }
            }
        };

        // ルートは呼び出し側の指定そのものなので、失敗はスキップせず投げる。
        if (rootUrl !== null) visited.add(rootUrl);
        const rootDocument = rootData !== null
            ? await KMLParser.parseDocument(rootData)
            : await KMLParser.parseDocument(await this.fetchFn(rootUrl!));
        merge(rootDocument, rootUrl);

        while (queue.length > 0 && loaded < this.maxDocuments) {
            const url = queue.shift()!;
            let document: KMLDocument;
            try {
                document = await KMLParser.parseDocument(await this.fetchFn(url));
            } catch (error) {
                this.onDocumentError?.(url, error);
                continue;
            }
            merge(document, url);
        }
        return features;
    }

    /** 相対 `href` を `base` に対して解決する。base 不明の相対参照は追跡できず null。 */
    static resolveHref(base: string | null, href: string): string | null {
        if (href.includes('://')) return href;
        if (base === null) return null;
        try {
            return new URL(href, base).toString();
        } catch {
            return null;
        }
    }
}

async function defaultFetch(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return new Uint8Array(await response.arrayBuffer());
}
