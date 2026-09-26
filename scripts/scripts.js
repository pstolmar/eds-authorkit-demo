import { loadArea, setConfig, getMetadata, loadStyle } from './ak.js';
import { applyInlineMetadata, isFramed } from './utils/authoring.js';

const hostnames = ['authorkit.dev'];

// Local previews (aem up --html-folder) can mount documents under /content;
// production paths have no mount. Brand roots and links honor it.
const mount = window.location.pathname.startsWith('/content/') ? '/content' : '';

// Brand sites are modeled as locale-style site roots so header, footer and
// 404 fragments resolve per brand (e.g. /demo/cutex/fragments/nav/header).
const locales = {
  '': { lang: 'en' },
  '/de': { lang: 'de' },
  '/es': { lang: 'es' },
  '/fr': { lang: 'fr' },
  '/hi': { lang: 'hi' },
  '/ja': { lang: 'ja' },
  '/zh': { lang: 'zh' },
  '/demo/cutex': { lang: 'en', brand: 'cutex' },
  '/demo/sinfulcolors': { lang: 'en', brand: 'sinfulcolors' },
};
if (mount) {
  locales[`${mount}/demo/cutex`] = locales['/demo/cutex'];
  locales[`${mount}/demo/sinfulcolors`] = locales['/demo/sinfulcolors'];
}

// Document Authoring site, used for edit links from demo tooling
const daSite = { org: 'pstolmar', repo: 'eds-authorkit-demo' };

const linkBlocks = [
  { fragment: '/fragments/' },
  { schedule: '/schedules/' },
  { youtube: 'https://www.youtube' },
];

// Blocks with self-managed styles
const components = ['fragment', 'schedule'];

// How to decorate an area before loading it
const decorateArea = ({ area = document }) => {
  const eagerLoad = (parent, selector) => {
    const img = parent.querySelector(selector);
    if (!img) return;
    img.removeAttribute('loading');
    img.fetchPriority = 'high';
  };

  eagerLoad(area, 'img');

  if (mount) {
    // Documents only; files (PDFs, media) are served without the mount
    area.querySelectorAll('a[href^="/demo/"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!/\.[a-z0-9]+([?#]|$)/i.test(href.split('/').pop())) a.setAttribute('href', `${mount}${href}`);
    });
  }
};

/**
 * Brand themes: a shared foundation (tokens + base elements) plus
 * per-brand token overrides. Loaded before the first section renders.
 */
async function loadTheme() {
  const theme = getMetadata('theme');
  if (!theme) return;
  document.body.classList.add('brand-site', `theme-${theme}`);
  await Promise.all([
    loadStyle('/styles/brands/foundation.css'),
    loadStyle(`/styles/brands/${theme}.css`),
  ]);
}

export async function loadPage() {
  setConfig({
    hostnames, locales, linkBlocks, components, decorateArea, daSite, mount,
  });
  applyInlineMetadata();
  await loadTheme();
  await loadArea();
}
await loadPage();

(function da() {
  const { searchParams } = new URL(window.location.href);
  const hasPreview = searchParams.has('dapreview');
  if (hasPreview) import('../tools/da/da.js').then((mod) => mod.default(loadPage));
  const hasQE = searchParams.has('quick-edit');
  if (hasQE) import('../tools/quick-edit/quick-edit.js').then((mod) => mod.default());
}());

(function brandTools() {
  // Not inside the DA canvas / editor frames: no consent banner or demo panel
  if (!getMetadata('theme') || isFramed()) return;
  import('./utils/consent.js').then((mod) => mod.default());
  import('../tools/demo/demo.js').then((mod) => mod.default());
}());
