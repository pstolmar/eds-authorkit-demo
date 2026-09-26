/**
 * Product Detail – gallery + summary shared by all brand sites.
 * Authoring: one row [ pictures | h1, copy, SKU/category, list of h2 sections ].
 * Variant `simple` keeps the summary list as plain bullets (no accordion).
 */

function buildGallery(pictures) {
  const gallery = document.createElement('div');
  gallery.className = 'pdp-gallery';
  const viewport = document.createElement('div');
  viewport.className = 'pdp-viewport';
  if (pictures[0]) viewport.append(pictures[0].cloneNode(true));
  gallery.append(viewport);
  if (pictures.length < 2) return gallery;

  const thumbs = document.createElement('ol');
  thumbs.className = 'pdp-thumbs';
  pictures.forEach((pic, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pdp-thumb${idx === 0 ? ' is-active' : ''}`;
    btn.setAttribute('aria-label', `Show image ${idx + 1}`);
    btn.append(pic);
    btn.addEventListener('click', () => {
      viewport.replaceChildren(pic.cloneNode(true));
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
  list.className = 'pdp-accordion';
  items.forEach((li, idx) => {
    const heading = li.querySelector(':scope > h2, :scope > h3');
    const id = `pdp-panel-${idx}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pdp-accordion-header';
    btn.setAttribute('aria-expanded', idx === 0);
    btn.setAttribute('aria-controls', id);
    btn.textContent = heading.textContent.trim();
    heading.remove();

    const panel = document.createElement('div');
    panel.className = 'pdp-accordion-panel';
    panel.id = id;
    panel.hidden = idx !== 0;
    panel.append(...li.childNodes);
    li.className = 'pdp-accordion-item';
    li.replaceChildren(btn, panel);

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      list.querySelectorAll('.pdp-accordion-header').forEach((h) => {
        h.setAttribute('aria-expanded', 'false');
        h.nextElementSibling.hidden = true;
      });
      btn.setAttribute('aria-expanded', open);
      panel.hidden = !open;
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
