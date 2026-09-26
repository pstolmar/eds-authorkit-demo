/**
 * Product Detail – gallery + summary shared by all brand sites.
 * Authoring: one row [ pictures | h1, copy, SKU/category, list of h2 sections ].
 * Variant `simple` keeps the summary list as plain bullets (no accordion).
 * Authored elements are moved, never recreated, so the DA canvas can edit them.
 */
import { isAuthoring, pictureHolder } from '../../scripts/utils/authoring.js';

// A display copy must not carry the editor's position markers
function displayCopy(pic) {
  const copy = pic.cloneNode(true);
  [copy, ...copy.querySelectorAll('*')].forEach((node) => {
    node.removeAttribute('data-prose-index');
    node.removeAttribute('data-initial-length');
  });
  return copy;
}

function buildGallery(pictures) {
  const gallery = document.createElement('div');
  gallery.className = 'pdp-gallery';
  const viewport = document.createElement('div');
  viewport.className = 'pdp-viewport';
  gallery.append(viewport);
  if (pictures.length < 2) {
    if (pictures[0]) viewport.append(pictureHolder(pictures[0]));
    return gallery;
  }
  viewport.append(displayCopy(pictures[0]));

  const thumbs = document.createElement('ol');
  thumbs.className = 'pdp-thumbs';
  pictures.forEach((pic, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pdp-thumb${idx === 0 ? ' is-active' : ''}`;
    btn.setAttribute('aria-label', `Show image ${idx + 1}`);
    btn.append(pictureHolder(pic));
    btn.addEventListener('click', () => {
      viewport.replaceChildren(displayCopy(pic));
      thumbs.querySelectorAll('.pdp-thumb').forEach((t) => t.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
    li.append(btn);
    thumbs.append(li);
  });
  gallery.append(thumbs);
  return gallery;
}

function buildAccordion(list) {
  const items = [...list.children].filter((li) => li.querySelector(':scope > h2, :scope > h3'));
  if (!items.length) return;
  const authoring = isAuthoring();
  list.className = 'pdp-accordion';
  items.forEach((li, idx) => {
    // Accessible accordion: the authored heading keeps a toggle button inside
    const heading = li.querySelector(':scope > h2, :scope > h3');
    const id = `pdp-panel-${idx}`;
    const open = authoring || idx === 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pdp-accordion-header';
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-controls', id);
    btn.append(...heading.childNodes);
    heading.className = 'pdp-accordion-heading';
    heading.append(btn);

    const panel = document.createElement('div');
    panel.className = 'pdp-accordion-panel';
    panel.id = id;
    panel.hidden = !open;
    panel.append(...[...li.childNodes].filter((node) => node !== heading));
    li.className = 'pdp-accordion-item';
    li.replaceChildren(heading, panel);

    btn.addEventListener('click', () => {
      const expand = btn.getAttribute('aria-expanded') !== 'true';
      list.querySelectorAll('.pdp-accordion-item').forEach((item) => {
        item.querySelector('.pdp-accordion-header').setAttribute('aria-expanded', 'false');
        item.querySelector('.pdp-accordion-panel').hidden = true;
      });
      btn.setAttribute('aria-expanded', expand);
      panel.hidden = !expand;
    });
  });
}

export default function init(el) {
  const row = el.querySelector(':scope > div');
  const [mediaCell, infoCell] = row ? [...row.children] : [];
  const pictures = [...(mediaCell?.querySelectorAll('picture') || [])];

  const summary = document.createElement('div');
  summary.className = 'pdp-summary';
  if (infoCell) summary.append(...infoCell.childNodes);

  summary.querySelectorAll(':scope > p').forEach((p) => {
    const text = p.textContent;
    if (/SKU:/i.test(text)) p.classList.add('pdp-meta');
    if (/Categor(y|ies):/i.test(text)) p.classList.add('pdp-meta');
  });

  const list = summary.querySelector(':scope > ul');
  if (list && !el.classList.contains('simple')) buildAccordion(list);
  if (list && el.classList.contains('simple')) list.classList.add('pdp-highlights');

  // Slot the demo storefront fills with price, stock, options and add-to-bag
  const commerce = document.createElement('div');
  commerce.className = 'pdp-commerce';
  const title = summary.querySelector('h1');
  if (title) title.after(commerce);
  else summary.prepend(commerce);

  const wrapper = document.createElement('div');
  wrapper.className = 'pdp-wrapper';
  wrapper.append(buildGallery(pictures), summary);
  el.replaceChildren(wrapper);
  el.dataset.sku = (summary.textContent.match(/SKU:\s*([\w-]+)/i) || [])[1] || '';
}
