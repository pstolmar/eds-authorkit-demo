/*
 * Demo overlay for brand sites. Enable with ?demo=1 (or true); ?demo=0 exits.
 * Shows how one set of templates/blocks powers several brands, and toggles a
 * simulated storefront that reads commerce data from structured content.
 */
import { getConfig, getMetadata, loadStyle } from '../../scripts/ak.js';
import { docEditorUrl, docPath } from '../../scripts/utils/structured.js';

const SESSION_KEY = 'brand-demo';
const SETTINGS_KEY = 'brand-demo-settings';
const BRANDS = {
  cutex: { name: 'Cutex', prefix: '/demo/cutex' },
  sinfulcolors: { name: 'Sinful Colors', prefix: '/demo/sinfulcolors' },
};
const DEFAULTS = {
  store: false, inspect: false, edit: true, hover: 'auto', nav: 'auto', collapsed: false,
};

function isActive() {
  const param = new URLSearchParams(window.location.search).get('demo');
  if (param !== null) {
    const on = ['1', 'true', 'on', 'yes'].includes(param.toLowerCase());
    if (on) sessionStorage.setItem(SESSION_KEY, '1');
    else sessionStorage.removeItem(SESSION_KEY);
    return on;
  }
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const waitFor = (test) => new Promise((resolve) => {
  const check = () => {
    const found = test();
    if (found) resolve(found);
    else setTimeout(check, 150);
  };
  check();
});

const headerReady = () => waitFor(() => document.querySelector('header.nav .nav-bar')?.closest('header'));
const mainReady = () => waitFor(() => document.querySelector('main .section')
  && !document.querySelector('main .section[data-status]'));

/* ---------- hover + nav variant swaps ---------- */

async function applyHover(effect) {
  const blocks = [...document.querySelectorAll('main .product-cards')];
  if (!blocks.length) return;
  const { setHoverEffect } = await import('../../blocks/product-cards/product-cards.js');
  blocks.forEach((block) => {
    block.dataset.authoredHover ??= block.classList.contains('splat') ? 'splat' : 'glow';
    setHoverEffect(block, effect === 'auto' ? block.dataset.authoredHover : effect);
  });
}

async function applyNav(style) {
  const header = await headerReady();
  header.dataset.authoredStyle ??= header.classList.contains('light') ? 'light' : 'dark';
  const value = style === 'auto' ? header.dataset.authoredStyle : style;
  header.classList.remove('dark', 'light');
  header.classList.add(value);
}

/* ---------- block inspector ---------- */

function blockLabel(el) {
  const [name, ...variants] = [...el.classList].filter((c) => !['is-open', 'is-scrolled', 'has-mobile-image'].includes(c));
  const shown = variants.filter((v) => !v.startsWith('demo-'));
  return shown.length ? `${name} (${shown.join(', ')})` : name;
}

function applyInspect(on) {
  document.body.classList.toggle('demo-inspect', on);
  document.querySelectorAll('.demo-block-label').forEach((l) => l.remove());
  if (!on) return;
  document.querySelectorAll('main [data-block-name], header[data-block-name], footer[data-block-name]').forEach((el) => {
    const label = document.createElement('span');
    label.className = 'demo-block-label';
    label.textContent = blockLabel(el);
    el.classList.add('demo-inspected');
    el.prepend(label);
  });
}

/* ---------- overlay UI ---------- */

function toggle(id, label, checked, hint = '') {
  return `<label class="demo-row demo-switch">
      <span class="demo-row-text"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</span>
      <input type="checkbox" data-setting="${id}" ${checked ? 'checked' : ''}>
      <span class="demo-track" aria-hidden="true"></span>
    </label>`;
}

function segmented(id, label, value, options) {
  const buttons = options.map((opt) => `<button type="button" data-setting="${id}" data-value="${opt}" aria-pressed="${value === opt}">${opt}</button>`).join('');
  return `<div class="demo-row"><span class="demo-row-text"><span>${label}</span></span><div class="demo-seg" role="group" aria-label="${label}">${buttons}</div></div>`;
}

function otherBrandUrl(brand) {
  const { mount = '' } = getConfig();
  const { prefix } = BRANDS[brand];
  const other = Object.entries(BRANDS).find(([key]) => key !== brand)?.[1];
  const rest = docPath(window.location.pathname).slice(prefix.length);
  const shared = ['/', '', '/index', '/about-us', '/contact-us', '/privacy-policy', '/terms-of-use', '/dsar'];
  return `${mount}${other.prefix}${shared.includes(rest) ? rest || '/' : '/'}`;
}

function templateSummary() {
  const blocks = [...new Set([...document.querySelectorAll('main [data-block-name]')]
    .map((el) => blockLabel(el)))];
  return blocks.join(' · ') || 'default content';
}

function render(panel, settings, brand) {
  const { name } = BRANDS[brand] || { name: brand };
  const other = Object.entries(BRANDS).find(([key]) => key !== brand)?.[1];
  const path = window.location.pathname.replace(/\/$/, '/index');
  panel.innerHTML = `
    <div class="demo-head">
      <span class="demo-dot" aria-hidden="true"></span>
      <strong>Demo · ${name}</strong>
      <button type="button" class="demo-collapse" aria-expanded="${!settings.collapsed}" aria-label="Toggle demo panel">${settings.collapsed ? '+' : '–'}</button>
    </div>
    <div class="demo-body" ${settings.collapsed ? 'hidden' : ''}>
      ${toggle('store', 'Store', settings.store, 'Cart, live inventory &amp; checkout')}
      ${settings.store ? '<p class="demo-disclaimer"><strong>Simulated storefront.</strong> Demonstrates patterns from Adobe Commerce EDS Storefront drop-ins (product details, mini-cart, checkout). Not connected to a commerce backend – prices and stock are demo values stored as structured content.</p>' : ''}
      ${toggle('edit', 'Edit links', settings.edit, 'Open source content in DA')}
      ${toggle('inspect', 'Block inspector', settings.inspect, 'Outline shared blocks + variants')}
      ${segmented('hover', 'Image hover', settings.hover, ['auto', 'glow', 'splat'])}
      ${segmented('nav', 'Nav style', settings.nav, ['auto', 'dark', 'light'])}
      <div class="demo-meta">
        <div><span>Template</span><code>${getMetadata('template') || '–'}</code></div>
        <div><span>Theme</span><code>${getMetadata('theme') || '–'}</code></div>
        <div><span>Blocks</span><code>${templateSummary()}</code></div>
      </div>
      <div class="demo-actions">
        <a href="${otherBrandUrl(brand)}">Switch to ${other?.name}</a>
        <a href="${docEditorUrl(path)}" target="_blank" rel="noopener">Edit page in DA</a>
        <button type="button" data-action="consent">Reset cookie banner</button>
        ${settings.store ? '<button type="button" data-action="inventory">Reset demo inventory</button>' : ''}
        <a href="?demo=0">Exit demo</a>
      </div>
    </div>`;
}

async function applyStore(settings) {
  const store = await import('./store.js');
  if (settings.store) await store.enable();
  else store.disable();
  await store.setEditLinks(settings.edit);
}

export default async function init() {
  if (!isActive()) return;
  const { locale } = getConfig();
  const brand = locale.brand || getMetadata('theme');
  await loadStyle('/tools/demo/demo.css');
  document.body.classList.add('demo-mode');

  const panel = document.createElement('aside');
  panel.className = 'demo-panel';
  panel.setAttribute('aria-label', 'Demo controls');
  document.body.append(panel);

  let settings = getSettings();
  const refresh = () => render(panel, settings, brand);
  refresh();

  panel.addEventListener('click', async (e) => {
    const collapse = e.target.closest('.demo-collapse');
    const seg = e.target.closest('button[data-setting]');
    const action = e.target.closest('[data-action]');
    if (collapse) settings.collapsed = !settings.collapsed;
    if (seg) {
      settings[seg.dataset.setting] = seg.dataset.value;
      if (seg.dataset.setting === 'hover') applyHover(settings.hover);
      if (seg.dataset.setting === 'nav') applyNav(settings.nav);
    }
    if (action?.dataset.action === 'consent') {
      (await import('../../scripts/utils/consent.js')).resetConsent();
    }
    if (action?.dataset.action === 'inventory') {
      (await import('./store.js')).resetInventory();
    }
    if (!(collapse || seg)) return;
    saveSettings(settings);
    refresh();
  });

  panel.addEventListener('change', async (e) => {
    const input = e.target.closest('input[data-setting]');
    if (!input) return;
    settings = { ...settings, [input.dataset.setting]: input.checked };
    saveSettings(settings);
    if (input.dataset.setting === 'inspect') applyInspect(settings.inspect);
    if (['store', 'edit'].includes(input.dataset.setting)) await applyStore(settings);
    refresh();
  });

  // Wait for the page's blocks before applying runtime variants
  await mainReady();
  applyHover(settings.hover);
  applyNav(settings.nav);
  if (settings.store || settings.edit) await applyStore(settings);
  refresh();
  if (settings.inspect) setTimeout(() => applyInspect(true), 400);
}
