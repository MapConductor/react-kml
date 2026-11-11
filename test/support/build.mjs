import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { after } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'tsup';

// テスト用に src/ のエントリを tsup で個別にビルドし、import した結果を返す。
// 出力は build/ 下の一時ディレクトリに置き、テスト終了時に消す。
// @mapconductor/js-sdk-core は外部扱いにして、ワークスペースの dist を読む。
export async function buildEntries(label, entries) {
    mkdirSync(new URL('../../build/', import.meta.url), { recursive: true });
    const outDir = mkdtempSync(fileURLToPath(new URL(`../../build/${label}-`, import.meta.url)));
    after(() => rmSync(outDir, { recursive: true, force: true }));
    await build({
        entry: entries,
        outDir, format: ['esm'], platform: 'node', splitting: false,
        dts: false, sourcemap: false, config: false, silent: true,
        external: ['@mapconductor/js-sdk-core', '@mapconductor/js-sdk-react', 'react'],
    });
    const modules = {};
    for (const name of Object.keys(entries)) {
        modules[name] = await import(pathToFileURL(resolve(outDir, `${name}.mjs`)));
    }
    return modules;
}
