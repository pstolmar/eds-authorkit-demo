import { loadTableData, loadFromFile } from '../../scripts/utils/table-data.js';

const STYLE_VARIANTS = ['striped', 'compact', 'full-width'];

function buildTable(headers, rows) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  headers.forEach((h) => {
    const th = document.createElement('th');
    th.textContent = h;
    th.tabIndex = 0;
    hr.append(th);
  });
  thead.append(hr);
  table.append(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  return table;
}

function addSort(table, originalRows) {
  const headers = [...table.querySelectorAll('thead th')];
  const sortState = {};
  headers.forEach((th, i) => {
    sortState[i] = true; // first click toggles to false (descending), second to true (ascending)
    th.style.cursor = 'pointer';
    th.setAttribute('title', 'Click to sort');
    th.addEventListener('click', () => {
      sortState[i] = !sortState[i];
      const asc = sortState[i];
      const sorted = [...originalRows].sort((a, b) => {
        const av = a[i]; const bv = b[i];
        const an = parseFloat(av); const bn = parseFloat(bv);
        if (!Number.isNaN(an) && !Number.isNaN(bn)) return asc ? an - bn : bn - an;
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
      const tbody = table.querySelector('tbody');
      tbody.innerHTML = '';
      sorted.forEach((row) => {
        const tr = document.createElement('tr');
        row.forEach((cell) => {
          const td = document.createElement('td');
          td.textContent = cell;
          tr.append(td);
        });
        tbody.append(tr);
      });
      headers.forEach((h) => h.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
    });
  });
}

function renderData(el, data) {
  el.innerHTML = '';
  const variant = STYLE_VARIANTS.find((v) => el.classList.contains(v));
  const wrapper = document.createElement('div');
  wrapper.className = 'dt-wrapper';
  if (variant) wrapper.classList.add(`dt-${variant}`);
  const table = buildTable(data.headers, data.rows);
  addSort(table, data.rows);
  wrapper.append(table);
  el.append(wrapper);
}

function renderEmptyState(el) {
  const panel = document.createElement('div');
  panel.className = 'dt-setup-panel';
  panel.innerHTML = `
    <h3 class="dt-setup-title">Set up Data Table</h3>
    <div class="dt-setup-options">
      <button class="dt-opt" data-action="create" type="button">
        <span class="dt-opt-icon">✏️</span>
        <strong>Create New</strong>
        <small>Author inline in the document</small>
      </button>
      <button class="dt-opt" data-action="choose" type="button">
        <span class="dt-opt-icon">📂</span>
        <strong>Choose Sheet</strong>
        <small>Link a DA Live path</small>
      </button>
      <label class="dt-opt" data-action="upload">
        <span class="dt-opt-icon">📤</span>
        <strong>Upload File</strong>
        <small>.xlsx or .csv</small>
        <input type="file" accept=".xlsx,.csv" hidden>
      </label>
    </div>
    <div class="dt-style-row">
      <label>Style:
        <select class="dt-style-select">
          <option value="">Default</option>
          <option value="striped">Striped</option>
          <option value="compact">Compact</option>
          <option value="full-width">Full Width</option>
        </select>
      </label>
    </div>`;

  panel.querySelector('[data-action="create"]').addEventListener('click', () => {
    panel.innerHTML = '<p class="dt-hint">Add a Markdown or HTML table in your document editor and reload the page.</p>';
  });

  panel.querySelector('[data-action="choose"]').addEventListener('click', () => {
    // eslint-disable-next-line no-alert
    const path = window.prompt('Enter DA Live path (e.g. /demo/tables/my-sheet):');
    if (!path) return;
    panel.remove();
    const inner = document.createElement('div');
    const a = document.createElement('a');
    a.href = path;
    a.textContent = path;
    inner.append(a);
    el.append(inner);
    // eslint-disable-next-line no-use-before-define
    init(el);
  });

  panel.querySelector('input[type="file"]').addEventListener('change', async (e) => {
    const [file] = e.target.files;
    if (!file) return;
    const data = await loadFromFile(file);
    if (data) { panel.remove(); renderData(el, data); }
  });

  el.append(panel);
}

export default async function init(el) {
  const data = await loadTableData(el);
  if (data) { renderData(el, data); } else { renderEmptyState(el); }
}
