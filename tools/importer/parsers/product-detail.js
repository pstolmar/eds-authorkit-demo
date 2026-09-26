/* eslint-disable */
/* global WebImporter */
/**
 * Parser: source `product-detail` / `product-detail simple` → Product Detail.
 * Output row: [ gallery pictures | title, copy, SKU/category, list of h2 sections ]
 * Handles the authored row and the rendered PDP (gallery + accordion), which
 * is rebuilt into the authored list-of-sections shape.
 */
function galleryPictures(element) {
  const thumbs = [...element.querySelectorAll('.pdp-thumb picture, .pdp-gallery-thumbs picture')];
  if (thumbs.length) return thumbs;
  const viewport = [...element.querySelectorAll('.pdp-gallery picture')];
  if (viewport.length) return viewport;
  const firstCell = element.querySelector(':scope > div > div');
  return firstCell ? [...firstCell.querySelectorAll('picture')] : [];
}

function summaryNodes(element, document) {
  const summary = element.querySelector('.pdp-summary');
  if (!summary) {
    const cells = element.querySelectorAll(':scope > div > div');
    return cells[1] ? [...cells[1].childNodes] : [];
  }
  const nodes = [];
  [...summary.children].forEach((child) => {
    if (child.matches('.pdp-accordion')) {
      const ul = document.createElement('ul');
      child.querySelectorAll('.pdp-accordion-item').forEach((item) => {
        const li = document.createElement('li');
        const h2 = document.createElement('h2');
        h2.textContent = item.querySelector('.pdp-accordion-header')?.textContent.trim() || '';
        li.append(h2, ...(item.querySelector('.pdp-accordion-content')?.childNodes || []));
        ul.append(li);
      });
      nodes.push(ul);
    } else if (!child.matches('.pdp-swatches')) {
      nodes.push(child);
    }
  });
  return nodes;
}

export default function parse(element, { document }) {
  const simple = element.classList.contains('simple');
  const pictures = galleryPictures(element);
  const info = summaryNodes(element, document);
  const name = simple ? 'Product Detail (simple)' : 'Product Detail';
  element.replaceWith(WebImporter.DOMUtils.createTable([[name], [pictures, info]], document));
}
