/* eslint-disable */
/* global WebImporter */
/**
 * Parser: source `table` / `table no-header` → Table / Table (no-header).
 * Each block row is a data row; each cell a data point (standard EDS table
 * convention). Reads the authored div grid or a rendered <table>.
 */
function sourceRows(element) {
  const table = element.querySelector('table');
  if (table) return [...table.querySelectorAll('tr')].map((tr) => [...tr.children]);
  return [...element.querySelectorAll(':scope > div')].map((row) => [...row.children]);
}

export default function parse(element, { document }) {
  const noHeader = element.classList.contains('no-header');
  const rows = sourceRows(element).map((cells) => cells.map((cell) => [...cell.childNodes]));
  if (!rows.length) {
    element.remove();
    return;
  }
  const name = noHeader ? 'Table (no-header)' : 'Table';
  element.replaceWith(WebImporter.DOMUtils.createTable([[name], ...rows], document));
}
