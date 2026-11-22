// Worker entry that serves static files from the bundle (see scripts/embed-assets.mjs)
// and hands everything else to the OpenNext worker.
import openNext from './.open-next/worker.js';
import { ASSET_MAP } from './.open-next/embedded-assets.mjs';

export * from './.open-next/worker.js';

function lookup(pathname) {
  let p;
  try { p = decodeURIComponent(pathname); } catch { p = pathname; }
  return ASSET_MAP[p] || ASSET_MAP[p.replace(/\/$/, '') + '/index.html'];
}

function serve(pathname, asset, method) {
  const [data, type] = asset;
  const immutable = pathname.startsWith('/_next/static/');
  return new Response(method === 'HEAD' ? null : data, {
    headers: {
      'content-type': type,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    },
  });
}

const ASSETS = {
  async fetch(input) {
    const req = input instanceof Request ? input : new Request(input);
    const { pathname } = new URL(req.url);
    const asset = lookup(pathname);
    return asset ? serve(pathname, asset, req.method) : new Response('Not found', { status: 404 });
  },
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'GET' || request.method === 'HEAD') {
      const { pathname } = new URL(request.url);
      const asset = lookup(pathname);
      if (asset) return serve(pathname, asset, request.method);
    }
    return openNext.fetch(request, { ...env, ASSETS }, ctx);
  },
};
