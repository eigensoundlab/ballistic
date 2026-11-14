// Builds dist/ballistic.html: one self-contained file (engine and app inlined) that runs from disk, offline.
// The same file is what gets published as the Claude artifact. Usage: npm run build
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFile(join(root, p), 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');

let html = await read('index.html');
const engineTag = '<script src="src/engine.js"></script>';
const appTag = '<script src="src/app.js"></script>';
if (!html.includes(engineTag) || !html.includes(appTag)) {
  throw new Error('index.html no longer contains the expected script tags; update scripts/build.mjs.');
}
const engine = await read('src/engine.js');
const app = await read('src/app.js');
// id="engine" tells the app to build its render worker from this inline copy
html = html.replace(engineTag, () => `<script id="engine">\n${esc(engine)}</script>`).replace(appTag, () => `<script>\n${esc(app)}</script>`);

await mkdir(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist/ballistic.html');
await writeFile(out, html);
console.log(`Built ${out} (${(html.length / 1024).toFixed(0)} KB)`);
