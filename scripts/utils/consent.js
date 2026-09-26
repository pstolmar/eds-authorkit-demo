/*
 * Cookie consent for brand sites – mirrors the OneTrust banner + preference
 * center used on the source sites, without the third-party SDK. Choices are
 * stored per brand and broadcast as a `brand:consent` event so tags can gate.
 */
import { getConfig, loadStyle } from '../ak.js';

const CATEGORIES = [
  {
    id: 'necessary',
    title: 'Strictly Necessary Cookies',
    locked: true,
    text: 'These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions made by you, such as setting your privacy preferences or filling in forms.',
  },
  {
    id: 'performance',
    title: 'Performance Cookies',
    text: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.',
  },
  {
    id: 'functional',
    title: 'Functional Cookies',
    text: 'These cookies enable the website to provide enhanced functionality and personalisation.',
  },
  {
    id: 'targeting',
    title: 'Targeting Cookies',
    text: 'These cookies may be set through our site by our advertising partners to build a profile of your interests and show you relevant adverts on other sites.',
  },
];

const COOKIE_ICON = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M16 3a13 13 0 1 0 13 13 5 5 0 0 1-5-5 5 5 0 0 1-5-5 3 3 0 0 1-3-3z"/><circle cx="11" cy="13" r="1.6" fill="currentColor"/><circle cx="12" cy="21" r="1.6" fill="currentColor"/><circle cx="19" cy="19" r="1.6" fill="currentColor"/><circle cx="21" cy="25" r="1.1" fill="currentColor"/></svg>';

function storageKey() {
  const { locale } = getConfig();
  return `brand-consent:${locale.brand || 'site'}`;
}

export function getConsent() {
  try {
    return JSON.parse(localStorage.getItem(storageKey()));
  } catch {
    return null;
  }
}

function saveConsent(choices) {
  const consent = { ...choices, necessary: true, ts: Date.now() };
  localStorage.setItem(storageKey(), JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent('brand:consent', { detail: consent }));
  return consent;
}

const allChoices = (value) => Object.fromEntries(CATEGORIES.map((c) => [c.id, c.locked || value]));

function el(tag, attrs = {}, html = '') {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (html) node.innerHTML = html;
  return node;
}

function legalLinks() {
  const { locale } = getConfig();
  return `<a href="${locale.prefix}/privacy-policy" target="_blank">Privacy Policy</a> <a href="${locale.prefix}/terms-of-use" target="_blank">Terms of Use</a>`;
}

let floatBtn;

function showFloat() {
  if (floatBtn) {
    floatBtn.hidden = false;
    return;
  }
  floatBtn = el('button', { type: 'button', class: 'consent-float', 'aria-label': 'Manage Preferences' }, COOKIE_ICON);
  // eslint-disable-next-line no-use-before-define
  floatBtn.addEventListener('click', () => openPreferences());
  document.body.append(floatBtn);
}

function openPreferences(banner) {
  const current = getConsent() || allChoices(false);
  const dialog = el('dialog', { class: 'consent-center', 'aria-labelledby': 'consent-center-title' });
  const rows = CATEGORIES.map((c) => `
    <details class="consent-cat">
      <summary>
        <span>${c.title}</span>
        ${c.locked
          ? '<span class="consent-always">Always Active</span>'
          : `<label class="consent-switch"><input type="checkbox" name="${c.id}" ${current[c.id] ? 'checked' : ''}><span class="consent-slider"></span><span class="sr-only">${c.title}</span></label>`}
      </summary>
      <p>${c.text}</p>
    </details>`).join('');
  dialog.innerHTML = `
    <div class="consent-center-head">
      <h2 id="consent-center-title">Privacy Preference Center</h2>
      <button type="button" class="consent-close" aria-label="Close">×</button>
    </div>
    <div class="consent-center-body">
      <p>When you visit any website, it may store or retrieve information on your browser, mostly in the form of cookies. You can choose not to allow some types of cookies. ${legalLinks()}</p>
      <button type="button" class="consent-btn consent-allow">Allow All</button>
      <h3>Manage Consent Preferences</h3>
      ${rows}
    </div>
    <div class="consent-center-foot">
      <button type="button" class="consent-btn consent-reject">Reject All</button>
      <button type="button" class="consent-btn consent-confirm">Confirm My Choices</button>
    </div>`;
  const finish = (choices) => {
    saveConsent(choices);
    dialog.close();
    dialog.remove();
    banner?.remove();
    showFloat();
  };
  dialog.querySelector('.consent-close').addEventListener('click', () => { dialog.close(); dialog.remove(); });
  dialog.querySelector('.consent-allow').addEventListener('click', () => finish(allChoices(true)));
  dialog.querySelector('.consent-reject').addEventListener('click', () => finish(allChoices(false)));
  dialog.querySelector('.consent-confirm').addEventListener('click', () => {
    const choices = allChoices(false);
    dialog.querySelectorAll('input[type="checkbox"]').forEach((input) => { choices[input.name] = input.checked; });
    finish(choices);
  });
  document.body.append(dialog);
  dialog.showModal();
}

function showBanner() {
  const banner = el('div', { class: 'consent-banner', role: 'dialog', 'aria-label': 'Privacy', 'aria-live': 'polite' });
  banner.innerHTML = `
    <p class="consent-text">By clicking “Accept All”, you agree to the storing of cookies and pixels on your device to enhance site navigation, analyze site usage, and assist in our marketing efforts. ${legalLinks()}</p>
    <div class="consent-actions">
      <button type="button" class="consent-btn consent-accept">Accept All</button>
      <button type="button" class="consent-btn consent-manage">Manage Preferences</button>
    </div>`;
  banner.querySelector('.consent-accept').addEventListener('click', () => {
    saveConsent(allChoices(true));
    banner.remove();
    showFloat();
  });
  banner.querySelector('.consent-manage').addEventListener('click', () => openPreferences(banner));
  document.body.append(banner);
}

/** Clears the stored choice and shows the banner again (used by demo tools). */
export function resetConsent() {
  localStorage.removeItem(storageKey());
  floatBtn?.remove();
  floatBtn = null;
  document.querySelector('.consent-banner')?.remove();
  showBanner();
}

export default async function init() {
  await loadStyle('/styles/brands/consent.css');
  if (getConsent()) showFloat();
  else showBanner();
  window.addEventListener('brand:consent-manage', () => openPreferences());
}
