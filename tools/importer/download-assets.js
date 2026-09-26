#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Downloads the media and documents referenced by imported brand content.
 *
 * The import scripts rewrite brand media to `/demo/{brand}/media/media_*.ext`
 * and PDFs to `/demo/{brand}/assets/*.pdf`. This scans the imported
 * `.plain.html` files and fetches each referenced file from the source site
 * so every brand folder is self-contained.
 *
 * Usage: node tools/importer/download-assets.js [--force]
 */
import {
  readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, statSync,
} from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(new URL(import.meta.url).pathname), '..', '..');
const CONTENT = join(ROOT, 'content');
const ORIGINS = {
  cutex: 'https://www.cutex.com',
  sinfulcolors: 'https://www.sinfulcolors.com',
};
const force = process.argv.includes('--force');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.name.endsWith('.plain.html') ? [path] : [];
  });
}

function sourceUrl(brand, localPath) {
  const origin = ORIGINS[brand];
  const media = localPath.match(/\/media\/(media_[0-9a-f]+)\.([a-z0-9]+)$/i);
  if (media) {
    const [, name, ext] = media;
    // Optimized rendition keeps files small; SVGs are fetched as-is.
    if (ext === 'svg') return `${origin}/${name}.${ext}`;
    return `${origin}/${name}.${ext}?width=2000&format=${ext === 'jpg' ? 'jpg' : ext}&optimize=medium`;
  }
  const asset = localPath.match(/\/assets\/(.+)$/);
  return asset ? `${origin}/assets/${asset[1]}` : null;
}

async function download(url, target) {
  const resp = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (brand-demo asset sync)' } });
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, Buffer.from(await resp.arrayBuffer()));
}

const refs = new Map();
Object.keys(ORIGINS).forEach((brand) => {
  const dir = join(CONTENT, 'demo', brand);
  if (!existsSync(dir)) return;
  const re = new RegExp(`/demo/${brand}/(?:media/media_[0-9a-f]+\\.[a-z0-9]+|assets/[\\w.-]+\\.pdf)`, 'gi');
  walk(dir).forEach((file) => {
    (readFileSync(file, 'utf-8').match(re) || []).forEach((ref) => refs.set(ref, brand));
  });
});

let fetched = 0;
let skipped = 0;
const failed = [];
const queue = [...refs.entries()];
async function worker() {
  while (queue.length) {
    const [ref, brand] = queue.shift();
    const target = join(CONTENT, ref);
    if (!force && existsSync(target) && statSync(target).size > 0) {
      skipped += 1;
    } else {
      const url = sourceUrl(brand, ref);
      try {
        await download(url, target);
        fetched += 1;
      } catch (e) {
        failed.push(e.message);
      }
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`Assets referenced: ${refs.size} · downloaded: ${fetched} · already present: ${skipped} · failed: ${failed.length}`);
failed.forEach((f) => console.log(`  ✗ ${f}`));
