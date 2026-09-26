/* eslint-disable */
/* global WebImporter */
/**
 * Parser: source `product-detail` → structured content entry (DA form,
 * schema `product`): a `da-form` block (schema + title) and a `product`
 * block of key/value rows.
 *
 * Name, SKU, category, copy, sizes and imagery come from the source page;
 * price, stock, badge and rating are seeded demo values so the simulated
 * storefront has commerce data to work with.
 */
const BRANDS = {
  'cutex.com': { key: 'cutex', name: 'Cutex', prices: [4.99, 5.49, 5.99, 6.49, 6.99, 7.49, 7.99] },
  'sinfulcolors.com': { key: 'sinfulcolors', name: 'Sinful Colors', prices: [2.99, 3.49, 3.99, 4.49] },
};
const META_RE = /SKU:|Categor(y|ies):/i;

function brandFor(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  const brand = BRANDS[host] || BRANDS['cutex.com'];
  return { ...brand, host, prefix: `/demo/${brand.key}` };
}

function seeded(text, salt) {
  let h = 2166136261;
  const input = `${salt}:${text}`;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function localMedia(brand, src) {
  if (!src) return '';
  const match = src.match(/\/(media_[0-9a-f]+\.[a-z0-9]+)/i);
  return match ? `${brand.prefix}/media/${match[1]}` : src;
}

function localLink(brand, href) {
  if (!href) return '';
  try {
    const url = new URL(href, `https://www.${brand.host}`);
    if (!url.hostname.endsWith(brand.host)) return href;
    return url.pathname.startsWith(brand.prefix) ? url.pathname : `${brand.prefix}${url.pathname}`;
  } catch (e) {
    return href;
  }
}

function parts(element) {
  const summary = element.querySelector('.pdp-summary');
  if (summary) {
    const thumbs = element.querySelectorAll('.pdp-thumb img, .pdp-gallery-thumbs img');
    return { info: summary, images: [...(thumbs.length ? thumbs : element.querySelectorAll('.pdp-gallery img'))] };
  }
  const [media, info] = [...(element.querySelector(':scope > div')?.children || [])];
  return { info, images: [...(media?.querySelectorAll('img') || [])] };
}

function extractProduct(element, url) {
  const brand = brandFor(url);
  const slug = new URL(url).pathname.split('/').filter(Boolean).pop();
  const { info, images } = parts(element);
  const name = info?.querySelector('h1')?.textContent.trim() || slug;
  const paragraphs = [...(info?.querySelectorAll(':scope > p') || [])];
  const text = info?.textContent || '';
  const sku = (text.match(/SKU:\s*([\w-]+)/i) || [])[1] || '';
  const categoryLink = paragraphs.find((p) => /Categor(y|ies):/i.test(p.textContent))?.querySelector('a');
  const bullets = [...(info?.querySelectorAll(':scope > ul > li') || [])]
    .map((li) => li.textContent.trim())
    .filter((t) => t && !/^Available in/i.test(t));
  const description = paragraphs
    .map((p) => p.textContent.trim())
    .find((t) => t.length > 60 && !META_RE.test(t))
    || bullets.slice(0, 3).join('. ');
  const sizeLine = [...(info?.querySelectorAll('li') || [])]
    .map((li) => li.textContent.trim())
    .find((t) => /^Available in/i.test(t));
  const sizes = sizeLine
    ? sizeLine.replace(/^Available in:?/i, '').split('/').map((s) => s.trim()).filter(Boolean)
    : [];

  const price = brand.prices[Math.floor(seeded(slug, 'price') * brand.prices.length)];
  const stockRoll = seeded(slug, 'stock');
  let inventory = 8 + Math.floor(seeded(slug, 'qty') * 52);
  if (stockRoll < 0.1) inventory = 0;
  else if (stockRoll < 0.28) inventory = 2 + Math.floor(seeded(slug, 'low') * 4);
  const badgeRoll = seeded(slug, 'badge');
  let badge = 'None';
  if (badgeRoll < 0.14) badge = 'Best Seller';
  else if (badgeRoll < 0.24) badge = 'New';

  return {
    name,
    slug,
    brand: brand.name,
    sku,
    category: categoryLink?.textContent.trim() || '',
    categoryUrl: localLink(brand, categoryLink?.getAttribute('href')),
    url: `${brand.prefix}/product/${slug}`,
    description,
    image: localMedia(brand, images[0]?.getAttribute('src')),
    hoverImage: localMedia(brand, images[1]?.getAttribute('src')),
    price,
    compareAtPrice: seeded(slug, 'sale') < 0.2 ? Math.round((price + 1) * 100) / 100 : '',
    currency: 'USD',
    inventory,
    lowStockThreshold: 5,
    sizes,
    badge,
    rating: Math.round((3.8 + seeded(slug, 'rating') * 1.2) * 10) / 10,
    reviewCount: 12 + Math.floor(seeded(slug, 'reviews') * 470),
    status: 'Active',
  };
}

function formBlock(document, name, data) {
  const rows = Object.entries(data)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && !v.length))
    .map(([key, value]) => {
      const h3 = document.createElement('h3');
      h3.textContent = key;
      let cell;
      if (Array.isArray(value)) {
        cell = document.createElement('ul');
        value.forEach((v) => {
          const li = document.createElement('li');
          li.textContent = v;
          cell.append(li);
        });
      } else {
        cell = document.createElement('p');
        cell.textContent = String(value);
      }
      return [h3, cell];
    });
  return WebImporter.DOMUtils.createTable([[name], ...rows], document);
}

export default function parse(element, { document, params }) {
  const url = params?.originalURL || document.location?.href || window.location.href;
  const product = extractProduct(element, url);
  const entry = document.createElement('div');
  entry.dataset.scEntry = 'product';
  entry.append(
    formBlock(document, 'da-form', { 'x-schema-name': 'product', title: product.slug }),
    formBlock(document, 'product', product),
  );
  element.replaceWith(entry);
}
