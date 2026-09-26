/* eslint-disable */
/* global WebImporter */
/**
 * Parser: source `product-list`, `product-list category` and
 * `category-cards sinful-home` → Product Cards with brand-aware variants.
 * Works on the authored block rows and on the rendered grid.
 *
 * Hover variant: cards with a second (shade splat) image → splat; otherwise
 * the brand default (Cutex → glow, Sinful Colors → splat).
 * Layout variant: `category` (category listing) or `featured` (home 4-up).
 * Output rows: [ picture(s) | title link ] – one row per card.
 */
const BRAND_HOVER = { 'cutex.com': 'glow', 'sinfulcolors.com': 'splat' };

function brandHover(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return BRAND_HOVER[host] || 'glow';
}

function cleanText(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
  return clone.textContent.replace(/\s+/g, ' ').replace(/\s+([+&])\s*/g, ' $1 ').trim();
}

/**
 * Cards as { pictures, titleEl }. Rendered category cards nest links
 * (a.category-card > … > a), which HTML re-parsing splits apart, so they are
 * keyed by their header and the image that follows it.
 */
function findItems(element) {
  const headers = [...element.querySelectorAll('.category-card-header')];
  if (headers.length) {
    return headers.map((header) => {
      const image = header.nextElementSibling?.matches('.category-card-image')
        ? header.nextElementSibling : header.parentElement.querySelector('.category-card-image');
      const titleEl = header.querySelector('a') || header;
      return { pictures: image ? [...image.querySelectorAll('picture')] : [], titleEl };
    });
  }
  const rendered = [...element.querySelectorAll('.product-grid-item')];
  const rows = rendered.length ? rendered : [...element.querySelectorAll(':scope > div')];
  return rows.map((row) => ({
    pictures: [...row.querySelectorAll('picture')],
    titleEl: row.querySelector('.product-grid-name-link')
      || [...row.querySelectorAll('a')].find((a) => a.textContent.trim()),
  }));
}

export default function parse(element, { document, params }) {
  const sourceUrl = params?.originalURL || document.location?.href || window.location.href;
  const items = findItems(element);
  const hasAlt = items.some((item) => item.pictures.length > 1);
  const variants = [hasAlt ? 'splat' : brandHover(sourceUrl)];
  // Tiles that link to listing pages rather than products are category tiles
  const linksToProducts = items.some(({ titleEl }) => /\/product\//.test(titleEl?.getAttribute('href') || ''));
  const isFeatured = element.classList.contains('category-cards');
  if (!isFeatured && (element.classList.contains('category') || !linksToProducts)) variants.push('category');
  if (element.classList.contains('category-cards')) variants.push('featured');

  const rows = items.map(({ pictures, titleEl }) => {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = titleEl?.getAttribute('href') || '#';
    a.textContent = titleEl ? cleanText(titleEl) : '';
    p.append(a);
    return [pictures, p];
  });

  const table = WebImporter.DOMUtils.createTable([[`Product Cards (${variants.join(', ')})`], ...rows], document);
  element.replaceWith(table);
}
