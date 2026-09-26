/**
 * Product Cards – product and category tiles shared by all brand sites.
 *
 * Authoring: one row per card: [ picture(s) | title link ].
 * A second picture is the hover image (e.g. the shade splat).
 *
 * Variants
 *   glow      – soft opacity glow on hover
 *   splat     – hover reveals the shade splat in place of the bottle
 *               (second picture, or a painted splat in the card accent color)
 *   category  – category tiles (no commerce)
 *   featured  – large homepage tiles with the title under a compact image
 */

import { isAuthoring, pictureHolder } from '../../scripts/utils/authoring.js';

const ACCENTS = 4;

function slugFromHref(href) {
  try {
    return new URL(href, window.location.href).pathname.split('/').filter(Boolean).pop() || '';
  } catch {
    return '';
  }
}

function buildSplat() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('product-card-splat');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M101 18c14 0 18 17 30 20s27-9 36 2-3 25 1 37 21 17 17 31-21 12-27 23 3 29-10 36-24-6-37-6-26 16-38 8-3-26-12-35-29-6-33-19 13-20 12-33-15-24-6-34 26 1 37-6 14-24 30-24z');
  const drop = document.createElementNS(ns, 'circle');
  drop.setAttribute('cx', '168');
  drop.setAttribute('cy', '160');
  drop.setAttribute('r', '9');
  const drop2 = document.createElementNS(ns, 'circle');
  drop2.setAttribute('cx', '30');
  drop2.setAttribute('cy', '40');
  drop2.setAttribute('r', '6');
  svg.append(path, drop, drop2);
  return svg;
}

/** Keep "&" / "+" with the preceding word; "+" renders as a small glyph. */
function decorateTitle(link, title) {
  const [before, after] = title.replace(/\s+([&+])\s+/, '\u00a0$1 ').split(/(?<=\u00a0)\+/);
  link.textContent = before;
  if (after === undefined) return;
  const plus = document.createElement('span');
  plus.className = 'product-card-plus';
  plus.textContent = '+';
  link.append(plus, after);
}

function buildCard(row, idx, variants) {
  const textCell = row.children[1];
  const pictures = [...row.querySelectorAll('picture')];
  const link = textCell?.querySelector('a') || row.querySelector('a');
  const href = link?.getAttribute('href') || '#';
  const title = (link?.textContent || textCell?.textContent || '').trim();
  const detail = [...(textCell?.querySelectorAll('p') || [])]
    .filter((p) => !p.querySelector('a') && p.textContent.trim());

  const li = document.createElement('li');
  li.className = 'product-card';
  li.dataset.slug = slugFromHref(href);
  li.dataset.href = href;
  li.dataset.name = title;
  li.style.setProperty('--card-accent', `var(--brand-category-${(idx % ACCENTS) + 1})`);

  const media = document.createElement('a');
  media.className = 'product-card-media';
  media.href = href;
  media.tabIndex = -1;
  media.setAttribute('aria-hidden', 'true');

  const [primary, alt] = pictures;
  if (primary) {
    primary.classList.add('product-card-img');
    media.append(pictureHolder(primary));
  }
  if (alt) {
    alt.classList.add('product-card-alt');
    li.classList.add('has-alt');
    media.append(pictureHolder(alt));
  }
  if (variants.has('splat') && !alt) media.prepend(buildSplat());

  // Reuse the authored title element so it stays editable in the DA canvas
  const authored = link?.closest('p, h2, h3, h4');
  const heading = authored && row.contains(authored) ? authored : document.createElement('p');
  if (!heading.contains(link) && link) heading.append(link);
  heading.classList.add('product-card-title');
  if (heading.tagName === 'P') {
    heading.setAttribute('role', 'heading');
    heading.setAttribute('aria-level', '2');
  }
  if (link && !isAuthoring()) decorateTitle(link, title);

  li.append(media, heading);
  detail.forEach((p) => {
    p.className = 'product-card-detail';
    li.append(p);
  });

  // Slot the demo storefront fills with price, stock and add-to-bag
  const commerce = document.createElement('div');
  commerce.className = 'product-card-commerce';
  li.append(commerce);
  return li;
}

/**
 * Swap the hover variant at runtime (used by the demo overlay).
 * @param {Element} el product-cards block
 * @param {'glow'|'splat'} effect
 */
export function setHoverEffect(el, effect) {
  el.classList.remove('glow', 'splat');
  el.classList.add(effect);
  if (effect !== 'splat') return;
  el.querySelectorAll('.product-card:not(.has-alt) .product-card-media').forEach((media) => {
    if (!media.querySelector('.product-card-splat')) media.prepend(buildSplat());
  });
}

export default function init(el) {
  const variants = new Set([...el.classList].slice(1));
  if (!variants.has('glow') && !variants.has('splat')) el.classList.add('glow');
  const rows = [...el.querySelectorAll(':scope > div')];
  const grid = document.createElement('ul');
  grid.className = 'product-cards-grid';
  rows.forEach((row, idx) => grid.append(buildCard(row, idx, variants)));
  grid.style.setProperty('--card-count', rows.length);
  el.replaceChildren(grid);
  el.dataset.commerce = variants.has('category') || variants.has('featured') ? 'off' : 'on';
}
