#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Uploads the migrated brand sites to Document Authoring (DA source API).
 *
 *  - Documents: content/demo/{brand}/**\/*.plain.html → /{path}.html, wrapped in
 *    the DA document shell; brand media references become absolute
 *    content.da.live URLs so the preview pipeline ingests them.
 *  - Binaries: media + PDFs → same paths.
 *  - Schema: tools/structured/schemas/product.json → /.da/forms/schemas/product.html
 *
 * Credentials are injected by the environment (no Authorization header here).
 *
 * PDF links become absolute site URLs: the DA editor rewrites relative file
 * paths (".pdf" → "-pdf") on save, and delivery makes same-site links relative.
 *
 * Usage: node tools/importer/upload-to-da.js [--only schema|docs|files] [--brand cutex]
 *   [--path /demo/cutex/fragments] [--safe] [--limit N]
 *   --safe  skip documents whose DA text differs from the migrated text (edited in DA)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, extname, relative } from 'node:path';

const ORG = 'pstolmar';
const REPO = 'eds-authorkit-demo';
const ADMIN = `https://admin.da.live/source/${ORG}/${REPO}`;
const CONTENT_HOST = `https://content.da.live/${ORG}/${REPO}`;
const SITE_HOST = `https://main--${REPO}--${ORG}.aem.live`;
const ROOT = join(dirname(new URL(import.meta.url).pathname), '..', '..');
const CONTENT = join(ROOT, 'content');
const BRANDS = ['cutex', 'sinfulcolors'];
const TYPES = {
  '.html': 'text/html',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const only = opt('only');
const brands = opt('brand') ? [opt('brand')] : BRANDS;
const limit = Number(opt('limit') || Infinity);
const pathPrefix = opt('path');
const safe = args.includes('--safe');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const textOf = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function toDaDocument(plainHtml) {
  const body = plainHtml
    .replace(/(<img[^>]+src=")(\/demo\/[^"]+)"/g, `$1${CONTENT_HOST}$2"`)
    .replace(/(<a[^>]+href=")(\/demo\/[^"]+\.pdf)"/g, `$1${SITE_HOST}$2"`);
  return `<body><header></header><main>${body}</main><footer></footer></body>`;
}

async function editedInDa(daPath, content) {
  const resp = await fetch(`${ADMIN}${daPath}`);
  if (!resp.ok) return false;
  return textOf(await resp.text()) !== textOf(String(content));
}

async function upload(daPath, content, type) {
  const form = new FormData();
  form.append('data', new Blob([content], { type }), daPath.split('/').pop());
  const resp = await fetch(`${ADMIN}${daPath}`, { method: 'POST', body: form });
  if (!resp.ok) throw new Error(`${resp.status} ${daPath}`);
}

const jobs = [];

if (!only || only === 'schema') {
  const json = readFileSync(join(ROOT, 'tools/structured/schemas/product.json'), 'utf-8').trim();
  const html = `<body><header></header><main><div><pre><code>${escapeHtml(json)}\n</code></pre></div></main><footer></footer></body>`;
  jobs.push(['/.da/forms/schemas/product.html', html, 'text/html']);
}

brands.forEach((brand) => {
  const files = walk(join(CONTENT, 'demo', brand));
  files.forEach((file) => {
    const rel = `/${relative(CONTENT, file)}`;
    if (file.endsWith('.plain.html')) {
      if (only && only !== 'docs') return;
      const daPath = rel.replace(/\.plain\.html$/, '.html');
      jobs.push([daPath, toDaDocument(readFileSync(file, 'utf-8')), 'text/html']);
    } else {
      if (only && only !== 'files') return;
      const type = TYPES[extname(file).toLowerCase()];
      if (!type || statSync(file).size === 0) return;
      jobs.push([rel, readFileSync(file), type]);
    }
  });
});

const queue = jobs
  .filter(([daPath]) => !pathPrefix || daPath.startsWith(pathPrefix))
  .slice(0, limit);
const total = queue.length;
let done = 0;
const failed = [];
const skipped = [];
async function worker() {
  while (queue.length) {
    const [daPath, content, type] = queue.shift();
    try {
      if (safe && type === 'text/html' && await editedInDa(daPath, content)) {
        skipped.push(daPath);
      } else {
        await upload(daPath, content, type);
      }
    } catch (e) {
      failed.push(e.message);
    }
    done += 1;
    if (done % 25 === 0 || done === total) console.log(`… ${done}/${total}`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`Uploaded ${total - failed.length - skipped.length}/${total} to ${ADMIN}`);
skipped.forEach((f) => console.log(`  ↷ skipped (edited in DA): ${f}`));
failed.forEach((f) => console.log(`  ✗ ${f}`));
process.exitCode = failed.length ? 1 : 0;
