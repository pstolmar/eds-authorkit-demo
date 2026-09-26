/*
 * Simulated storefront for the brand demo.
 *
 * Mirrors the experience of Adobe Commerce EDS Storefront drop-ins
 * (product details, mini-cart, checkout, inventory) without a commerce
 * backend. Product price and stock come from each product's structured
 * content entry: {site}/data/products/{slug}. Cart and "sold" counts are
 * kept in localStorage per brand so inventory changes as you shop.
 */
import { getConfig, loadStyle } from '../../scripts/ak.js';
import { fetchStructured, formEditorUrl } from '../../scripts/utils/structured.js';

const { locale } = getConfig();
const BRAND = locale.brand || 'brand';
const CART_KEY = `brand-cart:${BRAND}`;
const SOLD_KEY = `brand-sold:${BRAND}`;
const FREE_SHIPPING = 25;
const SHIPPING = 4.99;
const CITIES = ['Austin', 'Brooklyn', 'Denver', 'Miami', 'Portland', 'Chicago', 'San Diego', 'Nashville'];

const BAG_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l1 14H5L6 7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

let enabled = false;
let liveTimer;
const products = new Map();

const { mount = '' } = getConfig();
const productPath = (slug) => `${locale.prefix}/data/products/${slug}`;
const pageUrl = (path = '#') => (path.startsWith('/demo/') ? `${mount}${path}` : path);
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const getCart = () => read(CART_KEY, []);
const getSold = () => read(SOLD_KEY, {});
const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value || 0);

function inCart(slug) {
  return getCart().filter((line) => line.slug === slug).reduce((sum, line) => sum + line.qty, 0);
}

function available(product) {
  if (!product) return 0;
  const sold = getSold()[product.slug] || 0;
  return Math.max(0, (product.inventory || 0) - sold - inCart(product.slug));
}

function stockState(product) {
  const avail = available(product);
  if (product.status === 'Discontinued') return { cls: 'is-out', text: 'Discontinued', avail: 0 };
  if (avail <= 0) return { cls: 'is-out', text: 'Out of stock', avail };
  const low = product.lowStockThreshold ?? 5;
  if (avail <= low) return { cls: 'is-low', text: `Only ${avail} left`, avail };
  return { cls: 'is-in', text: 'In stock', avail };
}

function el(tag, cls, html = '') {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html) node.innerHTML = html;
  return node;
}

async function loadProduct(slug) {
  if (!slug) return null;
  if (products.has(slug)) return products.get(slug);
  const entry = await fetchStructured(productPath(slug));
  const product = entry?.data ? { ...entry.data, slug } : null;
  products.set(slug, product);
  return product;
}

function toast(message) {
  const node = el('div', 'store-toast', message);
  node.setAttribute('role', 'status');
  document.body.append(node);
  setTimeout(() => node.classList.add('is-leaving'), 3200);
  setTimeout(() => node.remove(), 3700);
}

/* ---------- mini-cart ---------- */

function cartCount() {
  return getCart().reduce((sum, line) => sum + line.qty, 0);
}

function cartTotals() {
  const subtotal = getCart().reduce((sum, line) => sum + line.price * line.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING;
  return { subtotal, shipping, total: subtotal + shipping };
}

function updateBag() {
  const count = cartCount();
  document.querySelectorAll('.store-bag').forEach((bag) => {
    bag.querySelector('.store-bag-count').textContent = count;
    bag.classList.toggle('has-items', count > 0);
    bag.setAttribute('aria-label', `Bag, ${count} item${count === 1 ? '' : 's'}`);
  });
}

function drawer() {
  let node = document.querySelector('.store-drawer');
  if (node) return node;
  node = el('aside', 'store-drawer');
  node.setAttribute('role', 'dialog');
  node.setAttribute('aria-modal', 'true');
  node.setAttribute('aria-label', 'Shopping bag');
  node.hidden = true;
  const scrim = el('div', 'store-scrim');
  scrim.hidden = true;
  // eslint-disable-next-line no-use-before-define
  scrim.addEventListener('click', () => closeDrawer());
  document.body.append(scrim, node);
  return node;
}

function closeDrawer() {
  const node = document.querySelector('.store-drawer');
  if (!node) return;
  node.classList.remove('is-open');
  document.querySelector('.store-scrim').hidden = true;
  setTimeout(() => { node.hidden = true; }, 250);
}

function renderCartLines() {
  const cart = getCart();
  if (!cart.length) return '<p class="store-empty">Your bag is empty.</p>';
  return `<ul class="store-lines">${cart.map((line, idx) => `
    <li class="store-line">
      <img src="${line.image || ''}" alt="" loading="lazy">
      <div class="store-line-info">
        <a href="${pageUrl(line.url)}">${line.name}</a>
        ${line.size ? `<span>${line.size}</span>` : ''}
        <span class="store-line-price">${money(line.price)}</span>
        <div class="store-qty" data-line="${idx}">
          <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
          <span>${line.qty}</span>
          <button type="button" data-step="1" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button type="button" class="store-remove" data-remove="${idx}" aria-label="Remove ${line.name}">×</button>
    </li>`).join('')}</ul>`;
}

function renderDrawer(view = 'cart') {
  const node = drawer();
  const { subtotal, shipping, total } = cartTotals();
  const remaining = Math.max(0, FREE_SHIPPING - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING) * 100);
  const head = `<div class="store-drawer-head"><h2>${view === 'checkout' ? 'Checkout' : `Your Bag (${cartCount()})`}</h2><button type="button" class="store-close" aria-label="Close">×</button></div>
    <p class="store-disclaimer">Demo storefront – simulates EDS Storefront cart &amp; checkout. No orders are placed.</p>`;
  if (view === 'done') {
    node.innerHTML = `${head}<div class="store-done"><h3>Thank you!</h3><p>Demo order <strong>#${Math.floor(100000 + Math.random() * 900000)}</strong> confirmed.</p><p>Inventory for the purchased items has been reduced.</p><button type="button" class="store-primary" data-close>Continue shopping</button></div>`;
    return;
  }
  const lines = renderCartLines();
  const summary = `<dl class="store-summary">
      <div><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div>
      <div><dt>Shipping</dt><dd>${shipping ? money(shipping) : 'Free'}</dd></div>
      <div class="is-total"><dt>Estimated total</dt><dd>${money(total)}</dd></div>
    </dl>`;
  if (view === 'checkout') {
    node.innerHTML = `${head}<form class="store-checkout">
        <label>Email<input type="email" required value="demo.shopper@example.com"></label>
        <label>Ship to<input required value="345 Park Avenue, San Jose, CA 95110"></label>
        <fieldset><legend>Delivery</legend>
          <label class="store-radio"><input type="radio" name="ship" checked> Standard (3–5 days)</label>
          <label class="store-radio"><input type="radio" name="ship"> Express (1–2 days)</label>
        </fieldset>
        <label>Card<input value="4111 1111 1111 1111" inputmode="numeric" required></label>
        ${summary}
        <button type="submit" class="store-primary">Place demo order · ${money(total)}</button>
        <button type="button" class="store-link" data-view="cart">Back to bag</button>
      </form>`;
    return;
  }
  node.innerHTML = `${head}
    ${subtotal > 0 ? `<div class="store-shipping-meter"><p>${remaining ? `You're ${money(remaining)} away from free shipping` : 'You unlocked free shipping!'}</p><span style="--progress:${progress}%"></span></div>` : ''}
    <div class="store-drawer-body">${lines}</div>
    ${getCart().length ? `<div class="store-drawer-foot">${summary}<button type="button" class="store-primary" data-view="checkout">Checkout</button></div>` : ''}`;
}

function openDrawer(view = 'cart') {
  const node = drawer();
  renderDrawer(view);
  node.hidden = false;
  document.querySelector('.store-scrim').hidden = false;
  requestAnimationFrame(() => node.classList.add('is-open'));
  node.querySelector('.store-close')?.focus();
}

// eslint-disable-next-line no-use-before-define
const refreshAll = () => { updateBag(); refreshStock(); };

function addToCart(product, qty = 1, size = '') {
  const cart = getCart();
  const line = cart.find((l) => l.slug === product.slug && l.size === size);
  if (line) line.qty += qty;
  else {
    cart.push({
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      price: product.price,
      image: product.image,
      url: product.url,
      size,
      qty,
    });
  }
  write(CART_KEY, cart);
  refreshAll();
  openDrawer();
}

function onDrawerClick(e) {
  const cart = getCart();
  const step = e.target.closest('[data-step]');
  const remove = e.target.closest('[data-remove]');
  const view = e.target.closest('[data-view]');
  if (e.target.closest('.store-close, [data-close]')) {
    closeDrawer();
    return;
  }
  if (step) {
    const idx = Number(step.parentElement.dataset.line);
    const line = cart[idx];
    const product = products.get(line.slug);
    const delta = Number(step.dataset.step);
    if (delta > 0 && product && available(product) <= 0) {
      toast(`No more ${line.name} in stock`);
      return;
    }
    line.qty += delta;
    if (line.qty <= 0) cart.splice(idx, 1);
    write(CART_KEY, cart);
  }
  if (remove) {
    cart.splice(Number(remove.dataset.remove), 1);
    write(CART_KEY, cart);
  }
  if (step || remove) {
    refreshAll();
    renderDrawer();
  }
  if (view) renderDrawer(view.dataset.view);
}

function onCheckout(e) {
  if (!e.target.closest('.store-checkout')) return;
  e.preventDefault();
  const sold = getSold();
  getCart().forEach((line) => { sold[line.slug] = (sold[line.slug] || 0) + line.qty; });
  write(SOLD_KEY, sold);
  write(CART_KEY, []);
  refreshAll();
  renderDrawer('done');
}

async function ensureBag() {
  const tools = await new Promise((resolve) => {
    const find = () => {
      const node = document.querySelector('header .nav-tools');
      if (node) resolve(node);
      else setTimeout(find, 150);
    };
    find();
  });
  if (tools.querySelector('.store-bag')) return;
  const bag = el('button', 'store-bag', `${BAG_ICON}<span class="store-bag-count">0</span>`);
  bag.type = 'button';
  bag.addEventListener('click', () => openDrawer());
  tools.append(bag);
  updateBag();
}

/* ---------- product cards + PDP ---------- */

function priceHtml(product) {
  const compare = product.compareAtPrice > product.price ? `<s>${money(product.compareAtPrice, product.currency)}</s>` : '';
  return `<span class="store-price">${money(product.price, product.currency)} ${compare}</span>`;
}

function stars(rating = 0, count = 0) {
  const full = Math.round(rating);
  return `<span class="store-rating" aria-label="${rating} out of 5 stars"><span aria-hidden="true">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span> ${count ? `(${count})` : ''}</span>`;
}

async function decorateCard(card) {
  const slot = card.querySelector('.product-card-commerce');
  const product = await loadProduct(card.dataset.slug);
  if (!enabled || !slot || !product) return;
  const stock = stockState(product);
  slot.innerHTML = `${priceHtml(product)}
    <span class="store-stock ${stock.cls}" data-stock="${product.slug}">${stock.text}</span>
    <button type="button" class="store-add" ${stock.avail ? '' : 'disabled'}>${stock.avail ? 'Add to bag' : 'Sold out'}</button>`;
  slot.dataset.store = '';
  slot.querySelector('.store-add').addEventListener('click', () => addToCart(product, 1, product.sizes?.[0] || ''));
  if (product.badge && product.badge !== 'None' && !card.querySelector('.store-badge')) {
    card.querySelector('.product-card-media')?.append(el('span', 'store-badge', product.badge));
  }
}

async function decoratePdp(block) {
  const slot = block.querySelector('.pdp-commerce');
  const slug = window.location.pathname.split('/').filter(Boolean).pop();
  const product = await loadProduct(slug);
  if (!enabled || !slot || !product) return;
  const stock = stockState(product);
  const sizes = (product.sizes || []).filter(Boolean);
  slot.innerHTML = `
    <div class="store-pdp-price">${priceHtml(product)} ${stars(product.rating, product.reviewCount)}</div>
    <p class="store-stock ${stock.cls}" data-stock="${product.slug}"><span class="store-live" aria-hidden="true"></span>${stock.text}</p>
    ${sizes.length ? `<fieldset class="store-sizes"><legend>Size</legend>${sizes.map((s, i) => `<label><input type="radio" name="size" value="${s}" ${i === 0 ? 'checked' : ''}><span>${s}</span></label>`).join('')}</fieldset>` : ''}
    <div class="store-buy">
      <div class="store-qty store-qty-pdp"><button type="button" data-pdp-step="-1" aria-label="Decrease quantity">−</button><span data-qty>1</span><button type="button" data-pdp-step="1" aria-label="Increase quantity">+</button></div>
      <button type="button" class="store-primary store-add-pdp" ${stock.avail ? '' : 'disabled'}>${stock.avail ? 'Add to bag' : 'Sold out'}</button>
    </div>
    <p class="store-note">Free shipping on orders ${money(FREE_SHIPPING)}+ · Ships in 1–2 business days</p>`;
  slot.dataset.store = '';
  const qtyEl = slot.querySelector('[data-qty]');
  slot.addEventListener('click', (e) => {
    const step = e.target.closest('[data-pdp-step]');
    if (step) {
      const next = Number(qtyEl.textContent) + Number(step.dataset.pdpStep);
      qtyEl.textContent = Math.max(1, Math.min(next, Math.max(1, available(product))));
    }
    if (e.target.closest('.store-add-pdp')) {
      const size = slot.querySelector('input[name="size"]:checked')?.value || '';
      addToCart(product, Math.min(Number(qtyEl.textContent), available(product)), size);
      qtyEl.textContent = '1';
    }
  });
}

function refreshStock() {
  document.querySelectorAll('[data-stock]').forEach((node) => {
    const product = products.get(node.dataset.stock);
    if (!product) return;
    const stock = stockState(product);
    node.className = `store-stock ${stock.cls}`;
    const live = node.querySelector('.store-live');
    node.textContent = stock.text;
    if (live) node.prepend(live);
    const add = node.parentElement.querySelector('.store-add, .store-add-pdp');
    if (add) {
      add.disabled = !stock.avail;
      add.textContent = stock.avail ? 'Add to bag' : 'Sold out';
    }
  });
}

function startLiveInventory() {
  clearInterval(liveTimer);
  liveTimer = setInterval(() => {
    const visible = [...products.values()].filter((p) => p && available(p) > 1);
    if (!visible.length || Math.random() > 0.5) return;
    const product = visible[Math.floor(Math.random() * visible.length)];
    const sold = getSold();
    sold[product.slug] = (sold[product.slug] || 0) + 1;
    write(SOLD_KEY, sold);
    refreshStock();
    document.querySelectorAll(`[data-stock="${product.slug}"]`).forEach((n) => n.classList.add('is-updated'));
    toast(`Someone in ${CITIES[Math.floor(Math.random() * CITIES.length)]} just bought <strong>${product.name}</strong>`);
  }, 22000);
}

/* ---------- edit links to structured content ---------- */

export async function setEditLinks(on) {
  document.querySelectorAll('.sc-edit').forEach((a) => a.remove());
  if (!on) return;
  const link = (path, text, cls) => {
    const a = el('a', `sc-edit ${cls}`, text);
    a.href = formEditorUrl(path);
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = 'Edit this product\'s structured content in the DA form editor';
    return a;
  };
  // Only products that have a structured content entry get an edit link
  const cards = [...document.querySelectorAll('main .product-cards[data-commerce="on"] .product-card')];
  await Promise.all(cards.map(async (card) => {
    if (!await loadProduct(card.dataset.slug)) return;
    card.querySelector('.product-card-media')?.after(link(productPath(card.dataset.slug), 'Edit data', 'sc-edit-card'));
  }));
  const pdp = document.querySelector('main .product-detail .pdp-summary');
  const slug = window.location.pathname.split('/').filter(Boolean).pop();
  if (pdp && await loadProduct(slug)) {
    const wrap = el('p', 'sc-edit sc-edit-pdp');
    wrap.append(
      link(productPath(slug), 'Edit product data in form editor', 'sc-edit-primary'),
      Object.assign(el('a', 'sc-edit-json', 'View entry'), { href: productPath(slug), target: '_blank' }),
    );
    pdp.append(wrap);
  }
}

/* ---------- lifecycle ---------- */

export function resetInventory() {
  localStorage.removeItem(SOLD_KEY);
  refreshAll();
  toast('Demo inventory restored from structured content');
}

export async function enable() {
  if (enabled) return;
  enabled = true;
  await loadStyle('/tools/demo/store.css');
  document.body.classList.add('store-mode');
  drawer().addEventListener('click', onDrawerClick);
  drawer().addEventListener('submit', onCheckout);
  ensureBag();
  const cards = [...document.querySelectorAll('main .product-cards[data-commerce="on"] .product-card')];
  cards.forEach((card) => card.querySelector('.product-card-commerce')?.classList.add('is-loading-data'));
  await Promise.all(cards.map(decorateCard));
  cards.forEach((card) => card.querySelector('.product-card-commerce')?.classList.remove('is-loading-data'));
  const pdp = document.querySelector('main .product-detail');
  if (pdp) await decoratePdp(pdp);
  startLiveInventory();
  window.addEventListener('storage', refreshAll);
}

export function disable() {
  if (!enabled) return;
  enabled = false;
  clearInterval(liveTimer);
  window.removeEventListener('storage', refreshAll);
  document.body.classList.remove('store-mode');
  document.querySelectorAll('[data-store]').forEach((slot) => {
    slot.textContent = '';
    delete slot.dataset.store;
  });
  document.querySelectorAll('.store-bag, .store-badge, .store-drawer, .store-scrim, .store-toast').forEach((n) => n.remove());
}
