/* eslint-disable */
/* global WebImporter */
/**
 * Shared, brand-aware helpers for every import script.
 * One implementation serves Cutex and Sinful Colors: the brand is derived
 * from the source host and drives output paths, variants and metadata.
 */

export const BRANDS = {
  cutex: {
    key: 'cutex',
    name: 'Cutex',
    hosts: ['www.cutex.com', 'cutex.com'],
    origin: 'https://www.cutex.com',
    hover: 'glow',
  },
  sinfulcolors: {
    key: 'sinfulcolors',
    name: 'Sinful Colors',
    hosts: ['www.sinfulcolors.com', 'sinfulcolors.com'],
    origin: 'https://www.sinfulcolors.com',
    hover: 'splat',
  },
};

export function getBrand(url) {
  const { hostname } = new URL(url);
  const brand = Object.values(BRANDS).find((b) => b.hosts.includes(hostname));
  if (!brand) throw new Error(`Unknown brand host: ${hostname}`);
  return { ...brand, prefix: `/demo/${brand.key}` };
}

/** Source path → migrated document path (root → /index). */
export function brandPath(brand, url) {
  const pathname = new URL(url).pathname.replace(/\/$/, '').replace(/\.html?$/, '');
  return `${brand.prefix}${pathname || '/index'}`;
}

/**
 * onLoad: the source sites are Edge Delivery Services, so the authored
 * document (`.plain.html`) is the most faithful source. Swap it into <main>
 * and capture render-time signals (nav style) before transforming.
 */
export async function loadAuthoredContent(document) {
  const { location } = document.defaultView || window;
  const path = location.pathname.replace(/\/$/, '') || '/index';
  const resp = await fetch(`${path}.plain.html`);
  if (!resp.ok) return;
  const html = await resp.text();
  const header = document.querySelector('header');
  const light = !!document.querySelector('header.white-header, header .white-header')
    || !!document.querySelector('main .white-header');
  let main = document.querySelector('main');
  if (!main) {
    main = document.createElement('main');
    document.body.append(main);
  }
  main.innerHTML = html;
  // Resolve relative media against the site root (EDS media are root-addressable)
  main.querySelectorAll('img[src], source[srcset]').forEach((el) => {
    const attr = el.hasAttribute('src') ? 'src' : 'srcset';
    const value = el.getAttribute(attr).split(' ')[0];
    if (value.startsWith('./')) el.setAttribute(attr, `/${value.slice(2)}`);
  });
  // The importer strips inline bold from headings before parsers run; keep
  // accent words by turning such block headings into paragraphs.
  main.querySelectorAll(':scope > div > div[class] :is(h1, h2, h3, h4, h5, h6)').forEach((heading) => {
    if (!heading.querySelector('strong, b')) return;
    const p = document.createElement('p');
    p.dataset.heading = heading.tagName.toLowerCase();
    p.innerHTML = heading.innerHTML;
    heading.replaceWith(p);
  });
  document.body.dataset.navStyle = light ? 'light' : 'dark';
  if (header) header.dataset.importedFrom = location.href;
}

const MEDIA_RE = /\/(media_[0-9a-f]+\.[a-z0-9]+)/i;

/** Brand media URL → local copy under {site}/media (see download-assets.js). */
export function localMediaUrl(brand, src) {
  if (!src) return src;
  let url;
  try {
    url = new URL(src, brand.origin);
  } catch (e) {
    return src;
  }
  if (!brand.hosts.includes(url.hostname)) return src;
  const match = url.pathname.match(MEDIA_RE);
  return match ? `${brand.prefix}/media/${match[1]}` : src;
}

export function localizeMedia(main, brand) {
  main.querySelectorAll('picture source').forEach((s) => s.remove());
  main.querySelectorAll('img').forEach((img) => {
    img.setAttribute('src', localMediaUrl(brand, img.getAttribute('src')));
    ['srcset', 'loading', 'width', 'height'].forEach((attr) => img.removeAttribute(attr));
  });
}

/** Page metadata shared by all brand templates. */
export function brandMetadata(main, document, brand, template, extra = {}) {
  const meta = {};
  const title = document.querySelector('title')?.textContent?.trim();
  if (title) meta.Title = title;
  const desc = document.querySelector('meta[name="description"]')?.content;
  if (desc) meta.Description = desc;
  const og = document.querySelector('meta[property="og:image"]')?.content;
  if (og) {
    const img = document.createElement('img');
    img.setAttribute('src', localMediaUrl(brand, og));
    meta.Image = img;
  }
  meta.Template = template;
  meta.Theme = brand.key;
  meta.Header = `nav (${document.body.dataset.navStyle || 'dark'})`;
  meta.Footer = 'brand-footer';
  meta.Favicon = brand.key;
  Object.assign(meta, extra);
  main.append(document.createElement('hr'));
  main.append(WebImporter.Blocks.getMetadataBlock(document, meta));
  return meta;
}

