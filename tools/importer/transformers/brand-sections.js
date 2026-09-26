/* eslint-disable */
/* global WebImporter */
/**
 * afterTransform:
 *  1. Internal links → the brand folder (/demo/{brand}/…), PDFs included.
 *  2. Source section classes → Section Metadata styles, sections split with
 *     <hr>. `white-header` is a nav signal (→ `nav (light)` page metadata)
 *     so it is not carried over as a section style. Shared by all brands.
 */
const BRANDS = { 'cutex.com': 'cutex', 'sinfulcolors.com': 'sinfulcolors' };
const DROP_STYLES = ['white-header'];

function brandInfo(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return { host, prefix: `/demo/${BRANDS[host] || 'cutex'}` };
}

function rewriteLinks(main, { host, prefix }) {
  main.querySelectorAll('a[href]').forEach((a) => {
    const raw = a.getAttribute('href');
    if (!raw || /^(#|mailto:|tel:)/.test(raw)) return;
    let url;
    try {
      url = new URL(raw, `https://www.${host}`);
    } catch (e) {
      return;
    }
    if (url.hostname.replace(/^www\./, '') !== host || url.pathname.startsWith(prefix)) return;
    const pathname = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '');
    a.setAttribute('href', `${prefix}${pathname}${url.hash}`);
  });
}

function sectionize(main, document) {
  const sections = [...main.children].filter((el) => el.tagName === 'DIV' && !el.dataset.scEntry);
  sections.forEach((section, idx) => {
    const styles = [...section.classList].filter((c) => !DROP_STYLES.includes(c));
    if (styles.length) {
      section.append(WebImporter.DOMUtils.createTable([['Section Metadata'], ['style', styles.join(', ')]], document));
    }
    if (idx > 0) section.before(document.createElement('hr'));
    section.replaceWith(...section.childNodes);
  });
}

export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  const { document, params } = payload;
  const url = params?.originalURL || document.location?.href || window.location.href;
  const brand = brandInfo(url);
  rewriteLinks(element, brand);
  sectionize(element, document);
}
