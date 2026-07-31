import { loadTableData, loadFromFile } from '../../scripts/utils/table-data.js';
import { renderChart, detectChartType } from '../../scripts/utils/chart-engine.js';

const VARIANT_TO_TYPE = {
  'bar-chart': 'bar',
  'line-chart': 'line',
  'scatter-chart': 'scatter',
  '3d-bar-chart': '3d-bar',
  '3d-scatter-chart': '3d-scatter',
  chart: 'auto',
};

const LOWER_IS_BETTER = /price|cost|fee|rate/i;

function getChartConfig(el) {
  for (const [variant, type] of Object.entries(VARIANT_TO_TYPE)) {
    if (el.classList.contains(variant)) return { type, visible: true };
  }
  return { type: 'auto', visible: false };
}

function isBestValue(header, value, allValues, hint) {
  const nums = allValues.map(parseFloat).filter((n) => !Number.isNaN(n));
  if (nums.length < 2) return false;
  const num = parseFloat(value);
  if (Number.isNaN(num)) return false;
  const preferLow = hint === 'low' || (hint !== 'high' && LOWER_IS_BETTER.test(header));
  return preferLow ? num === Math.min(...nums) : num === Math.max(...nums);
}

function buildComparisonTable(data) {
  const { sheets } = data;
  if (!sheets.length) return document.createElement('div');

  const rowHeaders = sheets[0].rows.map((r) => r[0]);
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const emptyTh = document.createElement('th');
  headerRow.append(emptyTh);
  sheets.forEach((s) => {
    const th = document.createElement('th');
    th.textContent = s.name;
    if (s.featured) th.classList.add('ct-featured-col');
    headerRow.append(th);
  });
  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  rowHeaders.forEach((rowHeader, rowIdx) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = rowHeader;
    tr.append(th);

    const cellValues = sheets.map((s) => s.rows[rowIdx]?.[1] ?? '');
    const hint = sheets[0].bestHints[rowHeader] || '';

    cellValues.forEach((val, sheetIdx) => {
      const td = document.createElement('td');
      td.textContent = val;
      if (isBestValue(rowHeader, val, cellValues, hint)) {
        td.classList.add('ct-best');
        td.title = 'Best value';
      }
      if (sheets[sheetIdx].featured) td.classList.add('ct-featured-col');
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  return table;
}

function buildTabs(sheets, tableEl, onSwitch) {
  const nav = document.createElement('div');
  nav.className = 'ct-tabs';
  nav.setAttribute('role', 'tablist');

  sheets.forEach((sheet, i) => {
    const btn = document.createElement('button');
    btn.className = 'ct-tab';
    btn.setAttribute('role', 'tab');
    btn.type = 'button';
    btn.textContent = sheet.name;
    if (sheet.featured) {
      const badge = document.createElement('span');
      badge.className = 'ct-recommended';
      badge.textContent = 'Recommended';
      btn.append(badge);
      btn.classList.add('is-active');
    }
    if (i === 0 && !sheets.some((s) => s.featured)) btn.classList.add('is-active');

    btn.addEventListener('click', () => {
      nav.querySelectorAll('.ct-tab').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      tableEl.querySelectorAll('th.ct-focus, td.ct-focus').forEach((c) => c.classList.remove('ct-focus'));
      const colIdx = i + 1;
      tableEl.querySelectorAll(`th:nth-child(${colIdx + 1}), td:nth-child(${colIdx + 1})`).forEach((c) => c.classList.add('ct-focus'));
      if (onSwitch) onSwitch(sheet);
    });
    nav.append(btn);
  });

  // Trigger initial focus on active col
  const activeBtn = nav.querySelector('.ct-tab.is-active');
  if (activeBtn) activeBtn.click();

  return nav;
}

function buildChartControls(chartConfig, chartEl, data) {
  const bar = document.createElement('div');
  bar.className = 'ct-chart-bar';

  const toggle = document.createElement('button');
  toggle.className = 'ct-chart-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Toggle chart');
  toggle.innerHTML = chartConfig.visible ? '&#x1F441;' : '&#x1F441;&#x200D;&#x1F5E8;';
  toggle.title = 'Show/hide chart';

  const typeSelect = document.createElement('select');
  typeSelect.className = 'ct-chart-type';
  [
    ['Auto-detect', 'auto'],
    ['Bar Chart', 'bar'],
    ['Line Chart', 'line'],
    ['Scatter', 'scatter'],
    ['3D Bar', '3d-bar'],
    ['3D Scatter', '3d-scatter'],
  ].forEach(([label, value]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (value === chartConfig.type) opt.selected = true;
    typeSelect.append(opt);
  });

  let currentType = chartConfig.type;
  let chartRendered = false;

  // Pre-compute detected type for the auto option label
  const detectedType = detectChartType(data);
  const autoOpt = typeSelect.querySelector('option[value="auto"]');
  if (autoOpt) autoOpt.textContent = `Auto (${detectedType})`;

  async function ensureChart() {
    if (!chartRendered) {
      try {
        const chart = await renderChart(chartEl, data, currentType);
        if (chart) chartRendered = true;
      } catch {
        // CDN unavailable in offline/test environments — ignore
      }
    }
  }

  toggle.addEventListener('click', async () => {
    const visible = chartEl.classList.toggle('is-visible');
    toggle.innerHTML = visible ? '&#x1F441;' : '&#x1F441;&#x200D;&#x1F5E8;';
    if (visible) await ensureChart();
  });

  typeSelect.addEventListener('change', async () => {
    currentType = typeSelect.value;
    chartRendered = false;
    chartEl.innerHTML = '';
    if (chartEl.classList.contains('is-visible')) await ensureChart();
  });

  bar.append(toggle, typeSelect);

  if (chartConfig.visible) {
    chartEl.classList.add('is-visible');
    ensureChart();
  }

  return bar;
}

function renderEmptyState(el) {
  const panel = document.createElement('div');
  panel.className = 'ct-setup-panel';
  panel.innerHTML = `
    <h3 class="ct-setup-title">Set up Comparison Table</h3>
    <div class="ct-setup-options">
      <button class="ct-opt" data-action="choose" type="button">
        <span class="ct-opt-icon">&#x1F4C2;</span>
        <strong>Choose Sheet</strong>
        <small>Multi-sheet DA path or xlsx</small>
      </button>
      <label class="ct-opt">
        <span class="ct-opt-icon">&#x1F4E4;</span>
        <strong>Upload Excel</strong>
        <small>.xlsx or .csv (each tab = one column)</small>
        <input type="file" accept=".xlsx,.csv" hidden>
      </label>
    </div>
    <div class="ct-style-row">
      <label>Default chart:
        <select class="ct-chart-default">
          <option value="chart" selected>Auto-detect</option>
          <option value="bar-chart">Bar Chart</option>
          <option value="line-chart">Line Chart</option>
          <option value="scatter-chart">Scatter</option>
          <option value="3d-bar-chart">3D Bar</option>
          <option value="3d-scatter-chart">3D Scatter</option>
          <option value="">Hidden</option>
        </select>
      </label>
    </div>`;

  panel.querySelector('[data-action="choose"]').addEventListener('click', () => {
    // eslint-disable-next-line no-alert
    const path = window.prompt('Enter DA Live path to multi-sheet workbook:');
    if (!path) return;
    const variant = panel.querySelector('.ct-chart-default')?.value;
    if (variant) el.classList.add(variant);
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
    if (data) {
      const variant = panel.querySelector('.ct-chart-default')?.value;
      if (variant) el.classList.add(variant);
      // eslint-disable-next-line no-use-before-define
      panel.remove(); renderComparison(el, data);
    }
  });

  el.append(panel);
}

function renderComparison(el, data) {
  el.innerHTML = '';
  const chartConfig = getChartConfig(el);

  const tableEl = buildComparisonTable(data);
  const wrapper = document.createElement('div');
  wrapper.className = 'ct-table-wrapper';
  wrapper.append(tableEl);

  const chartEl = document.createElement('div');
  chartEl.className = 'ct-chart';
  chartEl.style.height = '320px';

  const tabs = buildTabs(data.sheets, tableEl, null);
  const controls = buildChartControls(chartConfig, chartEl, data);

  el.append(tabs, wrapper, controls, chartEl);
}

export default async function init(el) {
  const data = await loadTableData(el);
  if (data && data.sheets.length) { renderComparison(el, data); } else { renderEmptyState(el); }
}
