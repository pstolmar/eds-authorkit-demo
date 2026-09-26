/* eslint-disable */
/* global WebImporter */
/**
 * Parser: source `iframe` (privacy request portal) → Embed.
 * One cell holding the URL of the external content (authored URL text or the
 * rendered iframe src).
 */
export default function parse(element, { document }) {
  const url = element.querySelector('iframe')?.getAttribute('src')
    || element.querySelector('a')?.getAttribute('href')
    || element.textContent.trim();
  if (!url) {
    element.remove();
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.textContent = url;
  element.replaceWith(WebImporter.DOMUtils.createTable([['Embed'], [a]], document));
}
