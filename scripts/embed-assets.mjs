// Packs .open-next/assets into the worker bundle so it can be deployed with a
// plain script upload (no separate static-assets upload step).
import { readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';

const SRC = '.open-next/assets';
const OUT = '.open-next/embedded';
const TYPES = {
  '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css',
  '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.map': 'application/json', '.f32': 'application/octet-stream',
};

rmSync(OUT, { recursive: true, force: true });
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p); else files.push(p);
  }
})(SRC);

let imports = '', entries = '';
files.forEach((file, i) => {
  const rel = relative(SRC, file);
  const dest = join(OUT, rel + '.bin');
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(file, dest);
  imports += `import a${i} from ${JSON.stringify('./embedded/' + rel.split('\\').join('/') + '.bin')};\n`;
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  entries += `  ${JSON.stringify('/' + rel.split('\\').join('/'))}: [a${i}, ${JSON.stringify(type)}],\n`;
});
writeFileSync('.open-next/embedded-assets.mjs', `${imports}\nexport const ASSET_MAP = {\n${entries}};\n`);
console.log(`Embedded ${files.length} assets`);
