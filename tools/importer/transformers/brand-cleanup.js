/* eslint-disable */
/* global WebImporter */
/**
 * beforeTransform: keep only the page's <main> content; drop site chrome
 * (header/footer are migrated separately as brand fragments), the OneTrust
 * consent SDK, scripts and styles (shared by every brand + template).
 */
export default function transform(hookName, element, payload) {
  if (hookName !== 'beforeTransform') return;
  const { document } = payload;
  const main = document.querySelector('main') || element;
  document.querySelectorAll([
    'header',
    'footer',
    'script',
    'style',
    'noscript',
    'link',
    '#onetrust-consent-sdk',
    '#onetrust-banner-sdk',
    '.ot-sdk-container',
    '.nav-wrapper',
  ].join(', ')).forEach((el) => {
    if (!main.contains(el) || el.matches('script, style, noscript, link')) el.remove();
  });
}
