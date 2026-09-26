// Standard EDS block rows (div grid) → a real table
function buildTable(el) {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  for (const row of el.querySelectorAll(':scope > div')) {
    const tr = document.createElement('tr');
    for (const cell of row.children) {
      const td = document.createElement('td');
      td.append(...cell.childNodes);
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  el.replaceChildren(table);
}

export default function init(el) {
  if (!el.querySelector('table')) buildTable(el);
  const tables = el.querySelectorAll('table');
  for (const table of tables) {
    let thead = table.querySelector('table > thead');
    const rows = [...table.querySelectorAll('tr')];

    if (!thead && !el.classList.contains('no-header')) {
      thead = document.createElement('thead');
      table.prepend(thead);

      const headingRow = rows.shift();
      if (headingRow) {
        thead.append(headingRow);
        const tds = headingRow.querySelectorAll(':scope > td');
        for (const td of tds) {
          const th = document.createElement('th');
          th.className = td.className;
          th.innerHTML = td.innerHTML;
          td.parentElement.replaceChild(th, td);
        }
      }
    }

    for (const row of rows) {
      row.classList.add('table-content-row');
    }
  }
}
