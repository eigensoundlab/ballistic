// Static server for local work: node scripts/serve.mjs [--port 8080] [--root <folder>]
// To try Send to SFX Workbench locally, serve the folder that holds both checkouts so they share one origin:
//   node scripts/serve.mjs --root ..   then open http://localhost:8080/ballistic/?workbench=/SFXWorkbench/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname, sep } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(here, opt('--root', '.'));
const port = Number(opt('--port', 8080));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav' };

createServer(async (req, res) => {
  try {
    let path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}/`));
