/**
 * Breadcrumb – authored as a list of links; the last item is the current page.
 */
export default function init(el) {
  const items = [...el.querySelectorAll('li')];
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  const list = document.createElement('ol');
  list.className = 'breadcrumb-list';

  items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'breadcrumb-item';
    const link = item.querySelector('a');
    const isLast = idx === items.length - 1;
    if (link && !isLast) {
      link.className = '';
      link.textContent = link.textContent.trim().toLowerCase();
      li.append(link);
    } else {
      const span = document.createElement('span');
      span.textContent = item.textContent.trim().toLowerCase();
      if (isLast) span.setAttribute('aria-current', 'page');
      li.append(span);
    }
    list.append(li);
  });

  nav.append(list);
  el.replaceChildren(nav);
}
