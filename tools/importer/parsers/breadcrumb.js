/* eslint-disable */
/* global WebImporter */
/**
 * Parser: source `breadcrumb` → Breadcrumb (list of links; last item = current page).
 * Handles the authored list and the rendered trail (which adds "/" separator items).
 */
export default function parse(element, { document }) {
  const items = [...element.querySelectorAll('li')]
    .filter((li) => li.textContent.trim() && li.textContent.trim() !== '/');
  if (!items.length) {
    element.remove();
    return;
  }
  const ul = document.createElement('ul');
  items.forEach((item) => {
    const li = document.createElement('li');
    const link = item.querySelector('a[href]');
    const label = item.textContent.trim().replace(/\s+/g, ' ');
    if (link) {
      const a = document.createElement('a');
      a.href = link.getAttribute('href');
      a.textContent = label;
      li.append(a);
    } else {
      li.textContent = label;
    }
    ul.append(li);
  });
  element.replaceWith(WebImporter.DOMUtils.createTable([['Breadcrumb'], [ul]], document));
}
