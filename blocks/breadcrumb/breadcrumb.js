/**
 * Breadcrumb – authored as a list of links; the last item is the current page.
 * The authored list is decorated in place so it stays editable in the DA canvas.
 */
import { isAuthoring } from '../../scripts/utils/authoring.js';

function lowercase(node) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode;
    text.textContent = text.textContent.toLowerCase();
  }
}

export default function init(el) {
  const list = el.querySelector('ul, ol');
  if (!list) return;
  const items = [...list.children];
  list.className = 'breadcrumb-list';
  items.forEach((item, idx) => {
    item.classList.add('breadcrumb-item');
    if (idx === items.length - 1) item.setAttribute('aria-current', 'page');
    // Source trails are title-cased via CSS; normalize casing outside the editor
    if (!isAuthoring()) lowercase(item);
  });

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  nav.append(list);
  el.replaceChildren(nav);
}
