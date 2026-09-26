import { getConfig } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';

const NAV_PATH = '/fragments/nav/header';
const DESKTOP = window.matchMedia('(width >= 900px)');

/**
 * Header metadata is authored in block language, e.g. `nav (dark)`.
 * Author Kit copies it verbatim onto <header>, so normalize the variant
 * tokens into plain classes: ["nav", "(dark)"] -> ["nav", "dark"].
 */
function normalizeVariants(el) {
  const [name, ...rest] = [...el.classList];
  const variants = rest.join(' ').replace(/[(),]/g, ' ').split(/\s+/).filter(Boolean);
  el.className = [name, ...variants].join(' ');
  if (!variants.some((v) => v === 'dark' || v === 'light')) el.classList.add('dark');
}

function setOpen(el, open) {
  el.classList.toggle('is-open', open);
  el.querySelector('.nav-toggle')?.setAttribute('aria-expanded', open);
  document.body.classList.toggle('nav-open', open);
}

function closeMenus(el, except) {
  el.querySelectorAll('.nav-item.is-expanded').forEach((item) => {
    if (item === except) return;
    item.classList.remove('is-expanded');
    item.querySelector(':scope > a')?.setAttribute('aria-expanded', 'false');
  });
}

function decorateBrand(section) {
  const link = section?.querySelector('a');
  if (!link) return null;
  link.className = 'nav-brand';
  link.removeAttribute('title');
  if (!link.getAttribute('aria-label')) {
    const alt = link.querySelector('img')?.alt;
    link.setAttribute('aria-label', alt || link.textContent.trim() || 'Home');
  }
  link.querySelector('img')?.removeAttribute('loading');
  return link;
}

function decorateList(el, section) {
  const list = section?.querySelector('ul');
  if (!list) return null;
  list.className = 'nav-list';
  [...list.children].forEach((li) => {
    li.classList.add('nav-item');
    const p = li.querySelector(':scope > p');
    const link = p?.querySelector('a') || li.querySelector(':scope > a');
    if (p && link) p.replaceWith(link);
    if (!link) return;
    link.classList.add('nav-link');
    const sub = li.querySelector(':scope > ul');
    if (!sub) return;
    li.classList.add('has-menu');
    sub.className = 'nav-sub';
    // Mobile taps toggle the menu, so offer the parent page as an overview link
    const overview = document.createElement('li');
    overview.className = 'nav-sub-overview';
    const overviewLink = link.cloneNode(true);
    overviewLink.className = '';
    overviewLink.textContent = `All ${link.textContent.trim()}`;
    overview.append(overviewLink);
    sub.append(overview);
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');
    link.addEventListener('click', (e) => {
      // Desktop hover opens the menu; clicks on the label still navigate.
      if (DESKTOP.matches) return;
      e.preventDefault();
      const expanded = !li.classList.contains('is-expanded');
      closeMenus(el, li);
      li.classList.toggle('is-expanded', expanded);
      link.setAttribute('aria-expanded', expanded);
    });
    li.addEventListener('mouseenter', () => DESKTOP.matches && link.setAttribute('aria-expanded', 'true'));
    li.addEventListener('mouseleave', () => DESKTOP.matches && link.setAttribute('aria-expanded', 'false'));
  });
  return list;
}

function buildToggle(el) {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-controls', 'nav-panel');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.innerHTML = '<span class="nav-toggle-icon"></span>';
  toggle.addEventListener('click', () => setOpen(el, !el.classList.contains('is-open')));
  return toggle;
}

/**
 * loads and decorates the brand navigation
 * @param {Element} el The header element
 */
export default async function init(el) {
  normalizeVariants(el);
  const { locale } = getConfig();
  const fragment = await loadFragment(`${locale.prefix}${NAV_PATH}`);
  const sections = [...fragment.querySelectorAll(':scope > .section')];
  const listSection = sections.find((s) => s.querySelector('ul'));
  const brandSection = sections.find((s) => s !== listSection);

  const bar = document.createElement('div');
  bar.className = 'nav-bar';
  const nav = document.createElement('nav');
  nav.className = 'nav-inner';
  nav.setAttribute('aria-label', 'Main');

  const brand = decorateBrand(brandSection);
  const list = decorateList(el, listSection);

  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  panel.id = 'nav-panel';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-close';
  close.setAttribute('aria-label', 'Close navigation');
  close.addEventListener('click', () => setOpen(el, false));
  panel.append(close);
  if (list) panel.append(list);

  // Slot for commerce/demo tools (e.g. the mini-cart bag)
  const tools = document.createElement('div');
  tools.className = 'nav-tools';

  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  overlay.addEventListener('click', () => setOpen(el, false));

  if (brand) nav.append(brand);
  nav.append(panel, tools, buildToggle(el), overlay);
  bar.append(nav);
  el.append(bar);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    setOpen(el, false);
    closeMenus(el);
  });
  DESKTOP.addEventListener('change', () => setOpen(el, false));
  window.addEventListener('scroll', () => {
    el.classList.toggle('is-scrolled', window.scrollY > 4);
  }, { passive: true });
}
