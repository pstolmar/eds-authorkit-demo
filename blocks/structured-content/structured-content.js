import { renderField, getBuiltInHints } from '../../scripts/utils/schema-hints.js';

const SKIP = new Set(['_display', 'slug', 'currency', 'name', 'price', 'rating', 'inStock']);

function getOwnerRepo() {
  let { hostname } = window.location;
  const proxy = document.querySelector('meta[property="hlx:proxyUrl"]');
  if (hostname === 'localhost' && proxy) hostname = proxy.content;
  const parts = hostname.split('.')[0].split('--');
  const [, repo, owner] = parts;
  return { owner, repo };
}

async function fetchSC(slug) {
  const { owner, repo } = getOwnerRepo();
  const url = `https://da-sc.adobeaem.workers.dev/live/${owner}/${repo}/structured/${encodeURIComponent(slug)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status}`);
  return resp.json();
}

export default async function init(el) {
  const slug = el.textContent.trim();
  if (!slug) return;

  el.textContent = '';
  el.classList.add('sc-loading');

  let json;
  try {
    json = await fetchSC(slug);
  } catch {
    el.classList.remove('sc-loading');
    el.textContent = `Could not load content: ${slug}`;
    return;
  }

  const { metadata = {}, data = {} } = json;
  const hints = getBuiltInHints(metadata.schemaName || '');
  el.classList.remove('sc-loading');
  el.dataset.schema = metadata.schemaName || '';

  const header = document.createElement('div');
  header.className = 'sc-header';
  if (data.name) {
    const h2 = document.createElement('h2');
    h2.textContent = data.name;
    header.append(h2);
  }
  if (data.price != null) header.append(renderField('price', data.price, hints.price, data));
  if (data.rating != null) header.append(renderField('rating', data.rating, hints.rating, data));
  if (data.inStock != null) header.append(renderField('inStock', data.inStock, hints.inStock, data));
  el.append(header);

  const body = document.createElement('div');
  body.className = 'sc-body';
  for (const [key, value] of Object.entries(data)) {
    if (!SKIP.has(key) && value != null) {
      body.append(renderField(key, value, hints[key], data));
    }
  }
  el.append(body);
}
