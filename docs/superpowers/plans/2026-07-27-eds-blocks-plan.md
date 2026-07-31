# EDS Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three EDS blocks (`structured-content`, `data-table`, `comparison-table`) with shared utilities, Universal Editor registration, a sidekick block-wizard plugin, and four DA Live demo pages.

**Architecture:** Three focused blocks delegate shared logic to `scripts/utils/` utilities (`schema-hints.js`, `table-data.js`, `chart-engine.js`). External libraries (ECharts, SheetJS) are loaded lazily via dynamic `<script>` injection — zero cost if features are unused. Per-block `_<block>.json` files define UE models; root aggregated files (`component-definition.json`, `component-models.json`, `component-filters.json`) are maintained manually since this project has no auto-aggregation tooling.

**Tech Stack:** Vanilla JS ESM, no framework. WTR + Chai + Sinon for tests. ECharts 5 + ECharts-GL 2 (CDN, lazy). SheetJS 0.18.5 (CDN, lazy). CSS custom properties, Montserrat font (inherited from `styles.css`).

## Global Constraints

- All JS is ESM (`"type": "module"` in package.json). No CommonJS.
- No framework dependencies. No build step for block code.
- Block CSS files use CSS nesting (already used in this project).
- Owner/repo derived from hostname using same pattern as `tools/quick-edit/quick-edit.js`: `hostname.split('.')[0].split('--')` → `[branch, repo, owner]`.
- SC API base: `https://da-sc.adobeaem.workers.dev/live/{owner}/{repo}/structured/{slug}`
- ECharts CDN: `https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js`
- ECharts-GL CDN: `https://cdn.jsdelivr.net/npm/echarts-gl@2/dist/echarts-gl.min.js`
- SheetJS CDN: `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`
- UE resourceType: `core/franklin/components/block/v1/block`
- Test runner: `npm test` (WTR). Single file: `npm run test:file -- ./test/path/test.js`
- Lint: `npm run lint`

---

### Task 1: `scripts/utils/schema-hints.js`

**Files:**
- Create: `scripts/utils/schema-hints.js`
- Create: `test/utils/schema-hints.test.js`

**Interfaces:**
- Produces:
  - `renderField(key, value, hint, data) → HTMLElement`
  - `getBuiltInHints(schemaName) → Record<string, string>`

- [ ] **Step 1: Write failing tests**

```js
// test/utils/schema-hints.test.js
import { expect } from '@esm-bundle/chai';
import { renderField, getBuiltInHints } from '../../scripts/utils/schema-hints.js';

describe('schema-hints', () => {
  describe('getBuiltInHints', () => {
    it('returns coffee hints', () => {
      const h = getBuiltInHints('coffee');
      expect(h.rating).to.equal('stars');
      expect(h.tastingNotes).to.equal('pills');
      expect(h.price).to.equal('price-badge');
      expect(h.faqs).to.equal('accordion');
      expect(h.brewing).to.equal('spec-table');
    });
    it('returns empty object for unknown schema', () => {
      expect(getBuiltInHints('unknown')).to.deep.equal({});
    });
  });

  describe('renderField', () => {
    it('stars: renders span.sc-stars with aria-label', () => {
      const el = renderField('rating', 4.5, 'stars', {});
      expect(el.className).to.equal('sc-stars');
      expect(el.getAttribute('aria-label')).to.equal('4.5 out of 5 stars');
    });

    it('pills: renders ul.sc-pills with one li per item', () => {
      const el = renderField('tags', ['citrus', 'floral'], 'pills', {});
      expect(el.tagName).to.equal('UL');
      expect(el.className).to.equal('sc-pills');
      expect(el.querySelectorAll('li').length).to.equal(2);
    });

    it('price-badge: formats currency from data.currency', () => {
      const el = renderField('price', 16.5, 'price-badge', { currency: 'USD' });
      expect(el.className).to.equal('sc-price-badge');
      expect(el.textContent).to.include('16.50');
    });

    it('accordion: renders dl.sc-accordion with details/summary per item', () => {
      const faqs = [{ question: 'Q1?', answer: 'A1.' }];
      const el = renderField('faqs', faqs, 'accordion', {});
      expect(el.className).to.equal('sc-accordion');
      expect(el.querySelector('summary').textContent).to.equal('Q1?');
    });

    it('spec-table: renders dl.sc-spec-table with dt/dd pairs', () => {
      const el = renderField('brewing', { method: 'V60', ratio: '1:16' }, 'spec-table', {});
      expect(el.className).to.equal('sc-spec-table');
      expect(el.querySelectorAll('dt').length).to.equal(2);
    });

    it('boolean true: renders sc-boolean--true', () => {
      const el = renderField('inStock', true, 'boolean', {});
      expect(el.classList.contains('sc-boolean--true')).to.be.true;
    });

    it('default: renders div.sc-field with dt label and dd value', () => {
      const el = renderField('origin', 'Ethiopia', null, {});
      expect(el.className).to.equal('sc-field');
      expect(el.querySelector('dt').textContent).to.equal('Origin');
      expect(el.querySelector('dd').textContent).to.equal('Ethiopia');
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```
npm run test:file -- ./test/utils/schema-hints.test.js
```
Expected: FAIL — `schema-hints.js` not found.

- [ ] **Step 3: Implement `schema-hints.js`**

```js
// scripts/utils/schema-hints.js
const BUILT_IN_HINTS = {
  coffee: {
    rating: 'stars',
    tastingNotes: 'pills',
    price: 'price-badge',
    faqs: 'accordion',
    brewing: 'spec-table',
    status: 'badge',
    inStock: 'boolean',
  },
  'pricing-tier': {
    price: 'price-badge',
    features: 'pills',
    limitations: 'pills',
    support: 'spec-table',
    cta: 'cta-button',
    featured: 'boolean',
  },
};

export function getBuiltInHints(schemaName) {
  return BUILT_IN_HINTS[schemaName] || {};
}

function renderStars(value) {
  const num = parseFloat(value);
  const full = Math.floor(num);
  const half = num - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const el = document.createElement('span');
  el.className = 'sc-stars';
  el.setAttribute('aria-label', `${num} out of 5 stars`);
  el.textContent = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  return el;
}

function renderPills(value) {
  const items = Array.isArray(value) ? value : [value];
  const el = document.createElement('ul');
  el.className = 'sc-pills';
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    el.append(li);
  }
  return el;
}

function renderPriceBadge(value, _key, data) {
  const currency = data.currency || 'USD';
  const el = document.createElement('span');
  el.className = 'sc-price-badge';
  el.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  return el;
}

function renderAccordion(value) {
  const items = Array.isArray(value) ? value : [value];
  const el = document.createElement('dl');
  el.className = 'sc-accordion';
  for (const { question, answer } of items) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = question;
    const p = document.createElement('p');
    p.textContent = answer;
    details.append(summary, p);
    el.append(details);
  }
  return el;
}

function renderSpecTable(value) {
  const el = document.createElement('dl');
  el.className = 'sc-spec-table';
  for (const [k, v] of Object.entries(value)) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    el.append(dt, dd);
  }
  return el;
}

function renderBadge(value) {
  const el = document.createElement('span');
  el.className = 'sc-badge';
  el.textContent = value;
  return el;
}

function renderBoolean(value) {
  const el = document.createElement('span');
  el.className = `sc-boolean sc-boolean--${value ? 'true' : 'false'}`;
  el.textContent = value ? 'In Stock' : 'Out of Stock';
  return el;
}

function renderCtaButton(value) {
  const a = document.createElement('a');
  a.className = 'sc-cta btn btn-accent';
  a.href = value.url || '#';
  a.textContent = value.label || 'Learn More';
  return a;
}

function renderDefault(key, value) {
  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  const el = document.createElement('div');
  el.className = 'sc-field';
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = Array.isArray(value) ? value.join(', ') : String(value);
  el.append(dt, dd);
  return el;
}

const RENDERERS = {
  stars: (v, k, d) => renderStars(v),
  pills: (v, k, d) => renderPills(v),
  'price-badge': (v, k, d) => renderPriceBadge(v, k, d),
  accordion: (v, k, d) => renderAccordion(v),
  'spec-table': (v, k, d) => renderSpecTable(v),
  badge: (v, k, d) => renderBadge(v),
  boolean: (v, k, d) => renderBoolean(v),
  'cta-button': (v, k, d) => renderCtaButton(v),
};

export function renderField(key, value, hint, data) {
  if (hint && RENDERERS[hint]) return RENDERERS[hint](value, key, data);
  return renderDefault(key, value);
}
```

- [ ] **Step 4: Run tests — verify pass**

```
npm run test:file -- ./test/utils/schema-hints.test.js
```
Expected: all 8 tests pass.

- [ ] **Step 5: Lint**

```
npm run lint:js
```

- [ ] **Step 6: Commit**

```bash
git add scripts/utils/schema-hints.js test/utils/schema-hints.test.js
git commit -m "feat: add schema-hints utility for structured content field rendering"
```

---

### Task 2: `scripts/utils/table-data.js`

**Files:**
- Create: `scripts/utils/table-data.js`
- Create: `test/utils/table-data.test.js`

**Interfaces:**
- Consumes: SheetJS (`window.XLSX`) loaded via CDN script tag
- Produces:
  - `loadTableData(el) → Promise<TableData | null>`
  - `loadFromUrl(url) → Promise<TableData>`
  - `parseInlineTable(table) → TableData`
  - Type `TableData = { headers: string[], rows: string[][], sheets: Sheet[] }`
  - Type `Sheet = { name: string, headers: string[], rows: string[][], featured: boolean }`

- [ ] **Step 1: Write failing tests**

```js
// test/utils/table-data.test.js
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { parseInlineTable, loadTableData, loadFromUrl } from '../../scripts/utils/table-data.js';

describe('table-data', () => {
  describe('parseInlineTable', () => {
    it('extracts headers from thead and rows from tbody', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <thead><tr><th>Name</th><th>Price</th></tr></thead>
        <tbody>
          <tr><td>Coffee A</td><td>12.00</td></tr>
          <tr><td>Coffee B</td><td>14.00</td></tr>
        </tbody>`;
      const result = parseInlineTable(table);
      expect(result.headers).to.deep.equal(['Name', 'Price']);
      expect(result.rows.length).to.equal(2);
      expect(result.rows[0]).to.deep.equal(['Coffee A', '12.00']);
      expect(result.sheets[0].name).to.equal('Table');
    });
  });

  describe('loadFromUrl — DA JSON (single sheet)', () => {
    let fetchStub;
    beforeEach(() => {
      fetchStub = sinon.stub(window, 'fetch');
    });
    afterEach(() => sinon.restore());

    it('parses single-sheet DA JSON response', async () => {
      fetchStub.resolves(new Response(JSON.stringify({
        total: 2, limit: 256, offset: 0,
        data: [{ Name: 'Coffee A', Price: '12' }, { Name: 'Coffee B', Price: '14' }],
      })));
      const result = await loadFromUrl('https://example.com/sheet');
      expect(result.headers).to.deep.equal(['Name', 'Price']);
      expect(result.rows.length).to.equal(2);
      expect(result.sheets.length).to.equal(1);
      expect(result.sheets[0].featured).to.be.false;
    });

    it('parses multi-sheet DA JSON response', async () => {
      fetchStub.resolves(new Response(JSON.stringify({
        ':names': ['★ Pro', 'Starter'],
        '★ Pro': { data: [{ Feature: 'Users', Value: '10' }] },
        'Starter': { data: [{ Feature: 'Users', Value: '1' }] },
      })));
      const result = await loadFromUrl('https://example.com/sheet');
      expect(result.sheets.length).to.equal(2);
      expect(result.sheets[0].featured).to.be.true;
      expect(result.sheets[0].name).to.equal('Pro');
    });
  });

  describe('loadTableData', () => {
    let fetchStub;
    beforeEach(() => { fetchStub = sinon.stub(window, 'fetch'); });
    afterEach(() => sinon.restore());

    it('returns null when no link and no table', async () => {
      const el = document.createElement('div');
      el.textContent = 'hello';
      const result = await loadTableData(el);
      expect(result).to.be.null;
    });

    it('calls loadFromUrl when a link is present', async () => {
      fetchStub.resolves(new Response(JSON.stringify({ total: 0, data: [] })));
      const el = document.createElement('div');
      el.innerHTML = '<a href="/demo/tables/test">test</a>';
      const result = await loadTableData(el);
      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.args[0][0]).to.include('/demo/tables/test');
    });

    it('calls parseInlineTable when an inline table is present', async () => {
      const el = document.createElement('div');
      el.innerHTML = '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
      const result = await loadTableData(el);
      expect(fetchStub.called).to.be.false;
      expect(result.headers).to.deep.equal(['A']);
    });
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

```
npm run test:file -- ./test/utils/table-data.test.js
```

- [ ] **Step 3: Implement `table-data.js`**

```js
// scripts/utils/table-data.js

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

async function getXLSX() {
  if (window.XLSX) return window.XLSX;
  await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
  return window.XLSX;
}

function isFeatured(name) {
  return name.startsWith('★');
}

function normalizeSheetName(name) {
  return name.replace(/^★\s*/, '').trim();
}

function xlsxSheetToRows(ws) {
  const XLSX = window.XLSX;
  const ref = ws['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const rows = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? String(cell.v) : '');
    }
    rows.push(row);
  }
  return rows;
}

function makeSheet(name, allRows) {
  const headers = allRows[0] || [];
  const rows = allRows.slice(1).filter((r) => {
    // strip _best / featured metadata rows from display
    return !headers[0] || r[0] !== '_best';
  });
  const bestHints = {};
  allRows.slice(1).forEach((r) => {
    if (r[0] === '_best') {
      headers.slice(1).forEach((h, i) => { bestHints[h] = r[i + 1]; });
    }
  });
  return {
    name: normalizeSheetName(name),
    featured: isFeatured(name),
    headers,
    rows,
    bestHints,
  };
}

async function loadXlsxBuffer(buffer) {
  const XLSX = await getXLSX();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets = workbook.SheetNames.map((name) => {
    const allRows = xlsxSheetToRows(workbook.Sheets[name]);
    return makeSheet(name, allRows);
  });
  const primary = sheets.find((s) => s.featured) || sheets[0];
  return { sheets, headers: primary?.headers || [], rows: primary?.rows || [] };
}

function daRowsToSheet(name, data) {
  const rows = data.data || [];
  if (!rows.length) return makeSheet(name, []);
  const headers = Object.keys(rows[0]);
  const allRows = [headers, ...rows.map((r) => headers.map((h) => String(r[h] ?? '')))];
  return makeSheet(name, allRows);
}

export async function loadFromUrl(url) {
  const isFile = /\.(xlsx|csv)(\?|$)/i.test(url);
  if (isFile) {
    const resp = await fetch(url);
    const buffer = await resp.arrayBuffer();
    return loadXlsxBuffer(buffer);
  }
  const jsonUrl = url.endsWith('.json') ? url : `${url}.json`;
  const resp = await fetch(jsonUrl);
  const json = await resp.json();

  if (json[':names']) {
    const sheets = json[':names'].map((name) => daRowsToSheet(name, json[name] || { data: [] }));
    const primary = sheets.find((s) => s.featured) || sheets[0];
    return { sheets, headers: primary?.headers || [], rows: primary?.rows || [] };
  }
  const sheet = daRowsToSheet('Sheet1', json);
  return { sheets: [sheet], headers: sheet.headers, rows: sheet.rows };
}

export async function loadFromFile(file) {
  const buffer = await file.arrayBuffer();
  return loadXlsxBuffer(buffer);
}

export function parseInlineTable(table) {
  const headers = [...table.querySelectorAll('thead th, thead td')].map((th) => th.textContent.trim());
  const rows = [...table.querySelectorAll('tbody tr')].map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()),
  );
  const sheet = { name: 'Table', featured: false, headers, rows, bestHints: {} };
  return { sheets: [sheet], headers, rows };
}

export async function loadTableData(el) {
  const link = el.querySelector('a[href]');
  if (link) return loadFromUrl(link.href);
  const table = el.querySelector('table');
  if (table) return parseInlineTable(table);
  return null;
}
```

- [ ] **Step 4: Run tests — verify pass**

```
npm run test:file -- ./test/utils/table-data.test.js
```

- [ ] **Step 5: Commit**

```bash
git add scripts/utils/table-data.js test/utils/table-data.test.js
git commit -m "feat: add table-data utility for DA sheet, xlsx/CSV, and inline table loading"
```

---

### Task 3: `scripts/utils/chart-engine.js`

**Files:**
- Create: `scripts/utils/chart-engine.js`
- Create: `test/utils/chart-engine.test.js`

**Interfaces:**
- Consumes: `TableData` from Task 2
- Produces:
  - `renderChart(container, data, type) → Promise<EChartsInstance>`
  - `detectChartType(data) → string` — one of `'bar'|'line'|'scatter'|'3d-bar'|'3d-scatter'`

- [ ] **Step 1: Write failing tests**

```js
// test/utils/chart-engine.test.js
import { expect } from '@esm-bundle/chai';
import { detectChartType } from '../../scripts/utils/chart-engine.js';

describe('chart-engine', () => {
  describe('detectChartType', () => {
    it('returns bar for few categories + numeric values', () => {
      const data = {
        headers: ['Product', 'Sales'],
        rows: [['A', '100'], ['B', '200']],
        sheets: [],
      };
      expect(detectChartType(data)).to.equal('bar');
    });

    it('returns line for time-like first header', () => {
      const data = {
        headers: ['Month', 'Revenue'],
        rows: [['Jan', '1000'], ['Feb', '1200']],
        sheets: [],
      };
      expect(detectChartType(data)).to.equal('line');
    });

    it('returns scatter for two numeric columns', () => {
      const data = {
        headers: ['Name', 'Price', 'Rating'],
        rows: [['A', '10', '4.5'], ['B', '20', '3.2']],
        sheets: [],
      };
      expect(detectChartType(data)).to.equal('scatter');
    });

    it('returns 3d-scatter for three or more numeric columns', () => {
      const data = {
        headers: ['Name', 'X', 'Y', 'Z'],
        rows: [['A', '1', '2', '3']],
        sheets: [],
      };
      expect(detectChartType(data)).to.equal('3d-scatter');
    });

    it('returns bar when no rows', () => {
      const data = { headers: ['A', 'B'], rows: [], sheets: [] };
      expect(detectChartType(data)).to.equal('bar');
    });
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

```
npm run test:file -- ./test/utils/chart-engine.test.js
```

- [ ] **Step 3: Implement `chart-engine.js`**

```js
// scripts/utils/chart-engine.js

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

async function getECharts(needs3D = false) {
  if (!window.echarts) {
    await loadScript('https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js');
  }
  if (needs3D) {
    await loadScript('https://cdn.jsdelivr.net/npm/echarts-gl@2/dist/echarts-gl.min.js');
  }
  return window.echarts;
}

export function detectChartType(data) {
  const { headers, rows } = data;
  if (!rows.length || headers.length < 2) return 'bar';
  const numericCols = headers.slice(1).filter((_, i) =>
    rows.length > 0 && rows.every((r) => r[i + 1] !== undefined && !Number.isNaN(parseFloat(r[i + 1]))),
  );
  if (numericCols.length >= 3) return '3d-scatter';
  if (numericCols.length === 2) return 'scatter';
  if (/year|month|date|week|quarter|day/i.test(headers[0])) return 'line';
  return 'bar';
}

function buildOption(type, data) {
  const { headers, rows, sheets } = data;

  if (type === 'bar') {
    const useSheets = sheets && sheets.length > 1;
    const categories = useSheets ? sheets.map((s) => s.name) : rows.map((r) => r[0]);
    const seriesHeaders = useSheets ? (sheets[0]?.headers || headers).slice(1) : headers.slice(1);
    const series = seriesHeaders.map((name, i) => ({
      name,
      type: 'bar',
      data: useSheets
        ? sheets.map((s) => parseFloat(s.rows[0]?.[i + 1]) || 0)
        : rows.map((r) => parseFloat(r[i + 1]) || 0),
    }));
    return { legend: {}, tooltip: {}, xAxis: { type: 'category', data: categories }, yAxis: {}, series };
  }

  if (type === 'line') {
    return {
      legend: {}, tooltip: {},
      xAxis: { type: 'category', data: rows.map((r) => r[0]) },
      yAxis: {},
      series: headers.slice(1).map((name, i) => ({
        name, type: 'line', data: rows.map((r) => parseFloat(r[i + 1]) || 0),
      })),
    };
  }

  if (type === 'scatter') {
    return {
      tooltip: {},
      xAxis: { name: headers[1] },
      yAxis: { name: headers[2] },
      series: [{ type: 'scatter', data: rows.map((r) => [parseFloat(r[1]) || 0, parseFloat(r[2]) || 0]) }],
    };
  }

  if (type === '3d-bar') {
    const sheetList = sheets && sheets.length ? sheets : [{ name: 'Data', rows }];
    const seriesData = [];
    sheetList.forEach((s, i) => {
      headers.slice(1).forEach((_, j) => {
        seriesData.push([i, j, parseFloat(s.rows[0]?.[j + 1]) || 0]);
      });
    });
    return {
      grid3D: {}, tooltip: {},
      xAxis3D: { type: 'category', data: sheetList.map((s) => s.name) },
      yAxis3D: { type: 'category', data: headers.slice(1) },
      zAxis3D: {},
      series: [{ type: 'bar3D', data: seriesData, shading: 'realistic' }],
    };
  }

  if (type === '3d-scatter') {
    return {
      grid3D: {}, tooltip: {},
      xAxis3D: { name: headers[1] },
      yAxis3D: { name: headers[2] },
      zAxis3D: { name: headers[3] },
      series: [{
        type: 'scatter3D',
        data: rows.map((r) => [parseFloat(r[1]) || 0, parseFloat(r[2]) || 0, parseFloat(r[3]) || 0]),
      }],
    };
  }

  return buildOption('bar', data);
}

export async function renderChart(container, data, type = 'auto') {
  const resolved = type === 'auto' ? detectChartType(data) : type;
  const needs3D = resolved.startsWith('3d-');
  const echarts = await getECharts(needs3D);
  if (!echarts) return null;

  // Dispose any existing chart on this container
  const existing = echarts.getInstanceByDom(container);
  if (existing) existing.dispose();

  const chart = echarts.init(container);
  chart.setOption(buildOption(resolved, data));
  const ro = new ResizeObserver(() => chart.resize());
  ro.observe(container);
  container._chartCleanup = () => { ro.disconnect(); chart.dispose(); };
  return chart;
}
```

- [ ] **Step 4: Run tests — verify pass**

```
npm run test:file -- ./test/utils/chart-engine.test.js
```

- [ ] **Step 5: Commit**

```bash
git add scripts/utils/chart-engine.js test/utils/chart-engine.test.js
git commit -m "feat: add chart-engine utility wrapping ECharts with lazy loading and type detection"
```

---

### Task 4: `structured-content` block

**Files:**
- Create: `blocks/structured-content/structured-content.js`
- Create: `blocks/structured-content/structured-content.css`
- Create: `blocks/structured-content/_structured-content.json`
- Create: `test/blocks/structured-content.test.js`

**Interfaces:**
- Consumes: `renderField`, `getBuiltInHints` from Task 1
- Produces: `default export init(el)` — EDS block init signature

- [ ] **Step 1: Write failing tests**

```js
// test/blocks/structured-content.test.js
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

const MOCK_RESPONSE = {
  metadata: { schemaName: 'coffee', title: 'light-roast-coffee' },
  data: {
    name: 'Morning Time Light Roast',
    price: 16.5,
    currency: 'USD',
    rating: 4.7,
    inStock: true,
    description: 'A bright, citrusy light roast',
    tastingNotes: ['citrus', 'floral'],
    brewing: { method: 'Pour-over', ratio: '1:16', temperature: 94 },
    faqs: [{ question: 'Q?', answer: 'A.' }],
  },
};

describe('structured-content block', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify(MOCK_RESPONSE)));
    // Simulate EDS hostname pattern
    Object.defineProperty(window, 'location', {
      value: { hostname: 'main--eds-authorkit-demo--pstolmar.aem.page', pathname: '/' },
      configurable: true,
    });
  });
  afterEach(() => sinon.restore());

  it('renders sc-header with product name', async () => {
    const el = document.createElement('div');
    el.textContent = 'light-roast-coffee';
    const { default: init } = await import('../../blocks/structured-content/structured-content.js');
    await init(el);
    expect(el.querySelector('.sc-header h2').textContent).to.equal('Morning Time Light Roast');
  });

  it('renders sc-stars for rating field', async () => {
    const el = document.createElement('div');
    el.textContent = 'light-roast-coffee';
    const { default: init } = await import('../../blocks/structured-content/structured-content.js');
    await init(el);
    expect(el.querySelector('.sc-stars')).to.exist;
  });

  it('shows error text when slug is empty', async () => {
    const el = document.createElement('div');
    el.textContent = '';
    const { default: init } = await import('../../blocks/structured-content/structured-content.js');
    await init(el);
    expect(fetchStub.called).to.be.false;
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

```
npm run test:file -- ./test/blocks/structured-content.test.js
```

- [ ] **Step 3: Implement `structured-content.js`**

```js
// blocks/structured-content/structured-content.js
import { renderField, getBuiltInHints } from '../../scripts/utils/schema-hints.js';

const SKIP = new Set(['_display', 'slug', 'currency', 'name', 'price', 'rating', 'inStock']);

function getOwnerRepo() {
  let { hostname } = window.location;
  const proxy = document.querySelector('meta[property="hlx:proxyUrl"]');
  if (hostname === 'localhost' && proxy) hostname = proxy.content;
  const parts = hostname.split('.')[0].split('--');
  const [, repo, owner] = parts;
  return { owner, repo };
}

async function fetchSC(slug) {
  const { owner, repo } = getOwnerRepo();
  const url = `https://da-sc.adobeaem.workers.dev/live/${owner}/${repo}/structured/${slug}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status}`);
  return resp.json();
}

export default async function init(el) {
  const slug = el.textContent.trim();
  if (!slug) return;

  el.textContent = '';
  el.classList.add('sc-loading');

  let json;
  try {
    json = await fetchSC(slug);
  } catch {
    el.classList.remove('sc-loading');
    el.textContent = `Could not load content: ${slug}`;
    return;
  }

  const { metadata = {}, data = {} } = json;
  const hints = getBuiltInHints(metadata.schemaName || '');
  el.classList.remove('sc-loading');
  el.dataset.schema = metadata.schemaName || '';

  const header = document.createElement('div');
  header.className = 'sc-header';
  if (data.name) {
    const h2 = document.createElement('h2');
    h2.textContent = data.name;
    header.append(h2);
  }
  if (data.price != null) header.append(renderField('price', data.price, hints.price, data));
  if (data.rating != null) header.append(renderField('rating', data.rating, hints.rating, data));
  if (data.inStock != null) header.append(renderField('inStock', data.inStock, hints.inStock, data));
  el.append(header);

  const body = document.createElement('div');
  body.className = 'sc-body';
  for (const [key, value] of Object.entries(data)) {
    if (SKIP.has(key) || value == null) continue;
    body.append(renderField(key, value, hints[key], data));
  }
  el.append(body);
}
```

- [ ] **Step 4: Create `structured-content.css`**

```css
/* blocks/structured-content/structured-content.css */
.structured-content {
  max-width: var(--grid-container-width);
  margin: var(--spacing-xl) auto;
  padding: var(--spacing-l);
  border: 1px solid var(--color-gray-200);
  border-radius: 8px;
  background: var(--color-shaded);

  &.sc-loading {
    opacity: 0.5;
    pointer-events: none;
  }

  .sc-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-m);
    margin-block-end: var(--spacing-l);

    h2 {
      margin: 0;
      flex: 1;
      min-width: 0;
    }
  }

  .sc-price-badge {
    font-size: var(--heading-font-size-m);
    font-weight: 700;
    color: var(--color-accent);
  }

  .sc-stars {
    color: var(--color-yellow-200);
    font-size: var(--body-font-size-l);
    letter-spacing: 2px;
  }

  .sc-boolean--true { color: var(--color-green-500); font-weight: 600; }
  .sc-boolean--false { color: var(--color-red-500); font-weight: 600; }

  .sc-badge {
    display: inline-block;
    padding: 2px 10px;
    background: var(--color-gray-200);
    border-radius: 12px;
    font-size: var(--body-font-size-s);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sc-pills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    list-style: none;
    padding: 0;
    margin: var(--spacing-xs) 0;

    li {
      padding: 3px 10px;
      background: var(--color-purple-100);
      color: var(--color-purple-700);
      border-radius: 12px;
      font-size: var(--body-font-size-s);
      margin: 0;
    }
  }

  .sc-body {
    display: grid;
    gap: var(--spacing-m);
  }

  .sc-field {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: var(--spacing-s);
    padding-block: var(--spacing-xs);
    border-block-end: 1px solid var(--color-gray-200);

    dt { font-weight: 600; color: var(--color-gray-600); }
    dd { margin: 0; }
  }

  .sc-spec-table {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--spacing-xs) var(--spacing-m);
    background: var(--color-shaded);
    padding: var(--spacing-s);
    border-radius: 4px;

    dt { font-weight: 600; }
    dd { margin: 0; }
  }

  .sc-accordion {
    margin: 0;

    details {
      border-block-end: 1px solid var(--color-gray-200);
      padding-block: var(--spacing-s);

      summary {
        cursor: pointer;
        font-weight: 600;
        list-style: none;

        &::before { content: '▶ '; font-size: 0.75em; }
      }

      &[open] summary::before { content: '▼ '; }

      p { margin: var(--spacing-s) 0 0; color: var(--color-gray-700); }
    }
  }

  .sc-cta {
    display: inline-block;
    margin-block-start: var(--spacing-m);
  }
}
```

- [ ] **Step 5: Create `_structured-content.json`**

```json
{
  "definitions": [
    {
      "title": "Structured Content",
      "id": "structured-content",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Structured Content",
              "model": "structured-content"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "structured-content",
      "fields": [
        {
          "component": "text-input",
          "name": "slug",
          "label": "Content Slug",
          "valueType": "string",
          "value": ""
        }
      ]
    }
  ],
  "filters": []
}
```

- [ ] **Step 6: Run tests — verify pass**

```
npm run test:file -- ./test/blocks/structured-content.test.js
```

- [ ] **Step 7: Commit**

```bash
git add blocks/structured-content/ test/blocks/structured-content.test.js
git commit -m "feat: add structured-content block with schema-hints rendering and UE model"
```

---

### Task 5: `data-table` block

**Files:**
- Create: `blocks/data-table/data-table.js`
- Create: `blocks/data-table/data-table.css`
- Create: `blocks/data-table/_data-table.json`
- Create: `test/blocks/data-table.test.js`

**Interfaces:**
- Consumes: `loadTableData`, `loadFromFile` from Task 2
- Produces: `default export init(el)`

- [ ] **Step 1: Write failing tests**

```js
// test/blocks/data-table.test.js
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

const MOCK_DATA = {
  headers: ['Name', 'Price', 'Origin'],
  rows: [['Coffee A', '12.00', 'Ethiopia'], ['Coffee B', '14.00', 'Colombia']],
  sheets: [{ name: 'Table', featured: false, headers: ['Name', 'Price', 'Origin'], rows: [['Coffee A', '12.00', 'Ethiopia'], ['Coffee B', '14.00', 'Colombia']], bestHints: {} }],
};

describe('data-table block', () => {
  let fetchStub;
  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({ total: 2, data: [{ Name: 'Coffee A', Price: '12.00', Origin: 'Ethiopia' }, { Name: 'Coffee B', Price: '14.00', Origin: 'Colombia' }] })));
  });
  afterEach(() => sinon.restore());

  it('renders a table with thead and tbody when data loads', async () => {
    const el = document.createElement('div');
    el.className = 'data-table';
    el.innerHTML = '<div><a href="/demo/tables/test">test</a></div>';
    const { default: init } = await import('../../blocks/data-table/data-table.js');
    await init(el);
    expect(el.querySelector('table')).to.exist;
    expect(el.querySelector('thead th').textContent).to.equal('Name');
    expect(el.querySelectorAll('tbody tr').length).to.equal(2);
  });

  it('renders empty-state panel when no data source', async () => {
    const el = document.createElement('div');
    el.className = 'data-table';
    const { default: init } = await import('../../blocks/data-table/data-table.js');
    await init(el);
    expect(el.querySelector('.dt-setup-panel')).to.exist;
    expect(fetchStub.called).to.be.false;
  });

  it('sorts column ascending on th click', async () => {
    const el = document.createElement('div');
    el.className = 'data-table';
    el.innerHTML = '<div><a href="/demo/tables/test">test</a></div>';
    const { default: init } = await import('../../blocks/data-table/data-table.js');
    await init(el);
    const priceHeader = el.querySelectorAll('thead th')[1];
    priceHeader.click(); // descending
    priceHeader.click(); // ascending
    const firstCell = el.querySelector('tbody tr:first-child td:nth-child(2)');
    expect(parseFloat(firstCell.textContent)).to.equal(12);
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

```
npm run test:file -- ./test/blocks/data-table.test.js
```

- [ ] **Step 3: Implement `data-table.js`**

```js
// blocks/data-table/data-table.js
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
    const path = window.prompt('Enter DA Live path (e.g. /demo/tables/my-sheet):');
    if (!path) return;
    panel.remove();
    const inner = document.createElement('div');
    const a = document.createElement('a');
    a.href = path;
    a.textContent = path;
    inner.append(a);
    el.append(inner);
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
```

- [ ] **Step 4: Create `data-table.css`**

```css
/* blocks/data-table/data-table.css */
.data-table {
  max-width: var(--grid-container-width);
  margin: var(--spacing-xl) auto;

  .dt-wrapper {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid var(--color-gray-200);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--body-font-size-s);
  }

  thead {
    background: light-dark(var(--color-gray-900), var(--color-gray-800));
    color: light-dark(var(--color-light), var(--color-light));

    th {
      padding: var(--spacing-s) var(--spacing-m);
      text-align: left;
      font-weight: 600;
      white-space: nowrap;
      user-select: none;

      &:hover { background: light-dark(var(--color-gray-700), var(--color-gray-600)); }
      &[aria-sort="ascending"]::after { content: ' ↑'; }
      &[aria-sort="descending"]::after { content: ' ↓'; }
    }
  }

  tbody {
    tr { border-block-end: 1px solid var(--color-gray-200); }
    td { padding: var(--spacing-s) var(--spacing-m); }
  }

  &.striped tbody tr:nth-child(even) {
    background: var(--color-shaded);
  }

  &.compact {
    thead th, tbody td { padding: var(--spacing-xs) var(--spacing-s); }
    font-size: var(--body-font-size-xs);
  }

  &.full-width { max-width: 100%; }

  /* Setup panel */
  .dt-setup-panel {
    border: 2px dashed var(--color-gray-300);
    border-radius: 8px;
    padding: var(--spacing-xl);
    text-align: center;
  }

  .dt-setup-title {
    margin: 0 0 var(--spacing-l);
    font-size: var(--heading-font-size-xs);
  }

  .dt-setup-options {
    display: flex;
    gap: var(--spacing-m);
    justify-content: center;
    flex-wrap: wrap;
    margin-block-end: var(--spacing-l);
  }

  .dt-opt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-l);
    border: 1px solid var(--color-gray-300);
    border-radius: 8px;
    background: none;
    cursor: pointer;
    min-width: 120px;
    text-decoration: none;
    color: inherit;
    font: inherit;

    &:hover { border-color: var(--color-brand); background: var(--color-purple-100); }

    .dt-opt-icon { font-size: 2em; }
    small { color: var(--color-gray-500); font-size: var(--body-font-size-xs); }
  }

  .dt-style-row { font-size: var(--body-font-size-s); }
  .dt-hint { color: var(--color-gray-500); font-style: italic; }
}
```

- [ ] **Step 5: Create `_data-table.json`**

```json
{
  "definitions": [
    {
      "title": "Data Table",
      "id": "data-table",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Data Table",
              "model": "data-table"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "data-table",
      "fields": [
        {
          "component": "text-input",
          "name": "source",
          "label": "Data Source URL or DA Path",
          "valueType": "string",
          "value": ""
        },
        {
          "component": "select",
          "name": "style",
          "label": "Table Style",
          "valueType": "string",
          "options": [
            { "name": "Default", "value": "" },
            { "name": "Striped", "value": "striped" },
            { "name": "Compact", "value": "compact" },
            { "name": "Full Width", "value": "full-width" }
          ]
        }
      ]
    }
  ],
  "filters": []
}
```

- [ ] **Step 6: Run tests — verify pass**

```
npm run test:file -- ./test/blocks/data-table.test.js
```

- [ ] **Step 7: Commit**

```bash
git add blocks/data-table/ test/blocks/data-table.test.js
git commit -m "feat: add data-table block with DA sheet, xlsx/CSV, and inline table support"
```

---

### Task 6: `comparison-table` block

**Files:**
- Create: `blocks/comparison-table/comparison-table.js`
- Create: `blocks/comparison-table/comparison-table.css`
- Create: `blocks/comparison-table/_comparison-table.json`
- Create: `test/blocks/comparison-table.test.js`

**Interfaces:**
- Consumes: `loadTableData`, `loadFromFile` from Task 2; `renderChart`, `detectChartType` from Task 3
- Produces: `default export init(el)`

**Chart type from block variant:** read `el.classList` for `chart`, `bar-chart`, `line-chart`, `scatter-chart`, `3d-bar-chart`, `3d-scatter-chart`. Map: `bar-chart → 'bar'`, `line-chart → 'line'`, `scatter-chart → 'scatter'`, `3d-bar-chart → '3d-bar'`, `3d-scatter-chart → '3d-scatter'`, `chart → 'auto'`, absent → chart hidden by default.

**Best-value detection:** for numeric rows, compare across all sheets. If header matches `/price|cost|fee/i` → lower wins; else higher wins. Override via `bestHints` from sheet data (from `_best` row in source).

- [ ] **Step 1: Write failing tests**

```js
// test/blocks/comparison-table.test.js
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

const MULTI_SHEET_RESPONSE = {
  ':names': ['★ Pro', 'Starter', 'Enterprise'],
  '★ Pro': { data: [{ Feature: 'Users', Value: '10' }, { Feature: 'Price', Value: '29' }] },
  'Starter': { data: [{ Feature: 'Users', Value: '1' }, { Feature: 'Price', Value: '9' }] },
  'Enterprise': { data: [{ Feature: 'Users', Value: '100' }, { Feature: 'Price', Value: '99' }] },
};

describe('comparison-table block', () => {
  let fetchStub;
  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify(MULTI_SHEET_RESPONSE)));
    Object.defineProperty(window, 'location', {
      value: { hostname: 'main--eds-authorkit-demo--pstolmar.aem.page', pathname: '/' },
      configurable: true,
    });
  });
  afterEach(() => sinon.restore());

  it('renders tab buttons for each sheet', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    const tabs = el.querySelectorAll('.ct-tab');
    expect(tabs.length).to.equal(3);
  });

  it('marks featured tab with recommended badge', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    const activeTab = el.querySelector('.ct-tab.is-active');
    expect(activeTab.textContent).to.include('Pro');
    expect(activeTab.querySelector('.ct-recommended')).to.exist;
  });

  it('renders chart container when "chart" variant present', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table chart';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    expect(el.querySelector('.ct-chart')).to.exist;
    expect(el.querySelector('.ct-chart').classList.contains('is-visible')).to.be.true;
  });

  it('chart hidden by default when no chart variant', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    const chart = el.querySelector('.ct-chart');
    expect(chart.classList.contains('is-visible')).to.be.false;
  });

  it('eye toggle flips chart visibility', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    const toggle = el.querySelector('.ct-chart-toggle');
    toggle.click();
    expect(el.querySelector('.ct-chart').classList.contains('is-visible')).to.be.true;
    toggle.click();
    expect(el.querySelector('.ct-chart').classList.contains('is-visible')).to.be.false;
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

```
npm run test:file -- ./test/blocks/comparison-table.test.js
```

- [ ] **Step 3: Implement `comparison-table.js`**

```js
// blocks/comparison-table/comparison-table.js
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

  // Trigger initial focus on featured col
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
  toggle.innerHTML = chartConfig.visible ? '👁' : '👁‍🗨';
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

  async function ensureChart() {
    if (!chartRendered) {
      await renderChart(chartEl, data, currentType);
      chartRendered = true;
    }
  }

  toggle.addEventListener('click', async () => {
    const visible = chartEl.classList.toggle('is-visible');
    toggle.innerHTML = visible ? '👁' : '👁‍🗨';
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
  panel.className = 'dt-setup-panel';
  panel.innerHTML = `
    <h3 class="dt-setup-title">Set up Comparison Table</h3>
    <div class="dt-setup-options">
      <button class="dt-opt" data-action="choose" type="button">
        <span class="dt-opt-icon">📂</span>
        <strong>Choose Sheet</strong>
        <small>Multi-sheet DA path or xlsx</small>
      </button>
      <label class="dt-opt">
        <span class="dt-opt-icon">📤</span>
        <strong>Upload Excel</strong>
        <small>.xlsx or .csv (each tab = one column)</small>
        <input type="file" accept=".xlsx,.csv" hidden>
      </label>
    </div>
    <div class="dt-style-row">
      <label>Default chart:
        <select class="dt-chart-default">
          <option value="">Hidden</option>
          <option value="chart">Auto-detect</option>
          <option value="bar-chart">Bar Chart</option>
          <option value="line-chart">Line Chart</option>
          <option value="scatter-chart">Scatter</option>
          <option value="3d-bar-chart">3D Bar</option>
          <option value="3d-scatter-chart">3D Scatter</option>
        </select>
      </label>
    </div>`;

  panel.querySelector('[data-action="choose"]').addEventListener('click', () => {
    const path = window.prompt('Enter DA Live path to multi-sheet workbook:');
    if (!path) return;
    panel.remove();
    const inner = document.createElement('div');
    const a = document.createElement('a');
    a.href = path;
    a.textContent = path;
    inner.append(a);
    el.append(inner);
    init(el);
  });

  panel.querySelector('input[type="file"]').addEventListener('change', async (e) => {
    const [file] = e.target.files;
    if (!file) return;
    const data = await loadFromFile(file);
    if (data) { panel.remove(); renderComparison(el, data); }
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
```

- [ ] **Step 4: Create `comparison-table.css`**

```css
/* blocks/comparison-table/comparison-table.css */
.comparison-table {
  max-width: var(--grid-container-width);
  margin: var(--spacing-xl) auto;

  .ct-tabs {
    display: flex;
    gap: var(--spacing-xs);
    border-block-end: 2px solid var(--color-gray-200);
    overflow-x: auto;
    scrollbar-width: none;
    margin-block-end: var(--spacing-m);
  }

  .ct-tab {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-s) var(--spacing-m);
    border: none;
    border-radius: 4px 4px 0 0;
    background: none;
    cursor: pointer;
    font: inherit;
    font-weight: 500;
    color: var(--color-gray-600);
    border-block-end: 2px solid transparent;
    margin-block-end: -2px;
    transition: color 0.15s, border-color 0.15s;

    &:hover { color: var(--color-text); }

    &.is-active {
      color: var(--color-brand);
      border-block-end-color: var(--color-brand);
    }
  }

  .ct-recommended {
    font-size: var(--body-font-size-xs);
    padding: 2px 6px;
    background: var(--color-accent);
    color: #fff;
    border-radius: 8px;
    font-weight: 600;
  }

  .ct-table-wrapper {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid var(--color-gray-200);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--body-font-size-s);
  }

  thead th {
    padding: var(--spacing-s) var(--spacing-m);
    background: light-dark(var(--color-gray-900), var(--color-gray-800));
    color: light-dark(var(--color-light), var(--color-light));
    text-align: center;
    font-weight: 600;

    &:first-child { text-align: left; }
    &.ct-featured-col { background: var(--color-purple-700); }
  }

  tbody th {
    padding: var(--spacing-s) var(--spacing-m);
    font-weight: 600;
    text-align: left;
    background: var(--color-shaded);
    border-block-end: 1px solid var(--color-gray-200);
  }

  tbody td {
    padding: var(--spacing-s) var(--spacing-m);
    text-align: center;
    border-block-end: 1px solid var(--color-gray-200);
    transition: background 0.15s;

    &.ct-best {
      background: var(--color-green-100);
      color: var(--color-green-700);
      font-weight: 600;

      &::after { content: ' ✓'; font-size: 0.85em; }
    }

    &.ct-featured-col { background: light-dark(var(--color-purple-100), var(--color-purple-900)); }
    &.ct-focus { outline: 2px solid var(--color-brand); outline-offset: -2px; }
  }

  .ct-chart-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-m);
    padding-block: var(--spacing-s);
    margin-block-start: var(--spacing-m);
  }

  .ct-chart-toggle {
    background: none;
    border: 1px solid var(--color-gray-300);
    border-radius: 4px;
    padding: var(--spacing-xs) var(--spacing-s);
    cursor: pointer;
    font-size: var(--body-font-size-m);

    &:hover { border-color: var(--color-brand); }
  }

  .ct-chart-type {
    font: inherit;
    font-size: var(--body-font-size-s);
    padding: var(--spacing-xs) var(--spacing-s);
    border: 1px solid var(--color-gray-300);
    border-radius: 4px;
    background: var(--color-shaded);
  }

  .ct-chart {
    display: none;
    margin-block-start: var(--spacing-m);
    border-radius: 8px;
    overflow: hidden;

    &.is-visible { display: block; }
  }
}
```

- [ ] **Step 5: Create `_comparison-table.json`**

```json
{
  "definitions": [
    {
      "title": "Comparison Table",
      "id": "comparison-table",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Comparison Table",
              "model": "comparison-table"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "comparison-table",
      "fields": [
        {
          "component": "text-input",
          "name": "source",
          "label": "Data Source URL or DA Path",
          "valueType": "string",
          "value": ""
        },
        {
          "component": "select",
          "name": "chartType",
          "label": "Default Chart",
          "valueType": "string",
          "options": [
            { "name": "Hidden", "value": "" },
            { "name": "Auto-detect", "value": "chart" },
            { "name": "Bar Chart", "value": "bar-chart" },
            { "name": "Line Chart", "value": "line-chart" },
            { "name": "Scatter", "value": "scatter-chart" },
            { "name": "3D Bar", "value": "3d-bar-chart" },
            { "name": "3D Scatter", "value": "3d-scatter-chart" }
          ]
        }
      ]
    }
  ],
  "filters": []
}
```

- [ ] **Step 6: Run tests — verify pass**

```
npm run test:file -- ./test/blocks/comparison-table.test.js
```

- [ ] **Step 7: Commit**

```bash
git add blocks/comparison-table/ test/blocks/comparison-table.test.js
git commit -m "feat: add comparison-table block with tabs, best-value highlighting, and chart controls"
```

---

### Task 7: Universal Editor registration

**Files:**
- Create: `models/_section.json`
- Create: `component-definition.json`
- Create: `component-models.json`
- Create: `component-filters.json`

No tests needed — these are static JSON configuration files.

- [ ] **Step 1: Create `models/_section.json`**

This file adds the new blocks to the section allowlist so authors can insert them in Universal Editor. List all blocks that should be insertable in sections.

```json
{
  "definitions": [],
  "models": [],
  "filters": [
    {
      "id": "section",
      "components": [
        "text",
        "image",
        "button",
        "hero",
        "card",
        "columns",
        "fragment",
        "youtube",
        "table",
        "advanced-tabs",
        "section-metadata",
        "structured-content",
        "data-table",
        "comparison-table"
      ]
    }
  ]
}
```

- [ ] **Step 2: Create `component-definition.json`** (aggregated from all `_<block>.json` `definitions` arrays)

```json
{
  "definitions": [
    {
      "title": "Structured Content",
      "id": "structured-content",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": { "name": "Structured Content", "model": "structured-content" }
          }
        }
      }
    },
    {
      "title": "Data Table",
      "id": "data-table",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": { "name": "Data Table", "model": "data-table" }
          }
        }
      }
    },
    {
      "title": "Comparison Table",
      "id": "comparison-table",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": { "name": "Comparison Table", "model": "comparison-table" }
          }
        }
      }
    }
  ],
  "models": [],
  "filters": []
}
```

- [ ] **Step 3: Create `component-models.json`** (aggregated from all `_<block>.json` `models` arrays)

```json
{
  "definitions": [],
  "models": [
    {
      "id": "structured-content",
      "fields": [
        { "component": "text-input", "name": "slug", "label": "Content Slug", "valueType": "string", "value": "" }
      ]
    },
    {
      "id": "data-table",
      "fields": [
        { "component": "text-input", "name": "source", "label": "Data Source URL or DA Path", "valueType": "string", "value": "" },
        {
          "component": "select", "name": "style", "label": "Table Style", "valueType": "string",
          "options": [
            { "name": "Default", "value": "" },
            { "name": "Striped", "value": "striped" },
            { "name": "Compact", "value": "compact" },
            { "name": "Full Width", "value": "full-width" }
          ]
        }
      ]
    },
    {
      "id": "comparison-table",
      "fields": [
        { "component": "text-input", "name": "source", "label": "Data Source URL or DA Path", "valueType": "string", "value": "" },
        {
          "component": "select", "name": "chartType", "label": "Default Chart", "valueType": "string",
          "options": [
            { "name": "Hidden", "value": "" },
            { "name": "Auto-detect", "value": "chart" },
            { "name": "Bar Chart", "value": "bar-chart" },
            { "name": "Line Chart", "value": "line-chart" },
            { "name": "Scatter", "value": "scatter-chart" },
            { "name": "3D Bar", "value": "3d-bar-chart" },
            { "name": "3D Scatter", "value": "3d-scatter-chart" }
          ]
        }
      ]
    }
  ],
  "filters": []
}
```

- [ ] **Step 4: Create `component-filters.json`**

```json
{
  "definitions": [],
  "models": [],
  "filters": [
    {
      "id": "section",
      "components": [
        "text", "image", "button", "hero", "card", "columns",
        "fragment", "youtube", "table", "advanced-tabs", "section-metadata",
        "structured-content", "data-table", "comparison-table"
      ]
    }
  ]
}
```

- [ ] **Step 5: Validate JSON files**

```bash
node -e "['component-definition.json','component-models.json','component-filters.json','models/_section.json'].forEach(f => { JSON.parse(require('fs').readFileSync(f,'utf8')); console.log(f + ' OK'); })"
```
Expected: 4 lines each ending in `OK`.

- [ ] **Step 6: Commit**

```bash
git add models/_section.json component-definition.json component-models.json component-filters.json
git commit -m "feat: add Universal Editor component registration for all three new blocks"
```

---

### Task 8: Block wizard sidekick plugin

**Files:**
- Create: `tools/block-wizard/block-wizard.html`
- Create: `tools/block-wizard/block-wizard.js`
- Create: `tools/block-wizard/block-wizard.css`
- Create: `tools/sidekick/config.json`

No automated tests — the plugin is UI-only and postMessage-based.

- [ ] **Step 1: Create `tools/sidekick/config.json`**

```json
{
  "plugins": [
    {
      "id": "block-wizard",
      "title": "Insert Block",
      "url": "/tools/block-wizard/block-wizard.html",
      "isPalette": true,
      "paletteRect": "top: 50px; right: 20px; width: 400px; height: 540px;"
    }
  ]
}
```

- [ ] **Step 2: Create `tools/block-wizard/block-wizard.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Block Wizard</title>
  <link rel="stylesheet" href="./block-wizard.css">
</head>
<body>
  <div id="wizard">
    <h2 class="bw-title">Insert Block</h2>
    <div class="bw-tabs" role="tablist">
      <button class="bw-tab is-active" data-panel="data-table" type="button">Data Table</button>
      <button class="bw-tab" data-panel="comparison-table" type="button">Comparison Table</button>
      <button class="bw-tab" data-panel="structured-content" type="button">Structured Content</button>
    </div>

    <div class="bw-panel is-active" id="panel-data-table">
      <fieldset>
        <legend>Data Source</legend>
        <label class="bw-radio"><input type="radio" name="dt-source" value="inline" checked> Inline (author in editor)</label>
        <label class="bw-radio"><input type="radio" name="dt-source" value="sheet"> DA Live sheet path</label>
        <label class="bw-radio"><input type="radio" name="dt-source" value="upload"> Upload .xlsx / .csv</label>
      </fieldset>
      <div class="bw-field" id="dt-path-field" hidden>
        <label>Sheet path: <input type="text" id="dt-path" placeholder="/demo/tables/my-sheet"></label>
      </div>
      <div class="bw-field" id="dt-upload-field" hidden>
        <label>File: <input type="file" id="dt-file" accept=".xlsx,.csv"></label>
      </div>
      <fieldset>
        <legend>Style</legend>
        <select id="dt-style">
          <option value="">Default</option>
          <option value="striped">Striped</option>
          <option value="compact">Compact</option>
          <option value="full-width">Full Width</option>
        </select>
      </fieldset>
    </div>

    <div class="bw-panel" id="panel-comparison-table">
      <fieldset>
        <legend>Data Source</legend>
        <label class="bw-radio"><input type="radio" name="ct-source" value="sheet" checked> DA Live sheet path</label>
        <label class="bw-radio"><input type="radio" name="ct-source" value="upload"> Upload .xlsx / .csv</label>
      </fieldset>
      <div class="bw-field">
        <label>Sheet path: <input type="text" id="ct-path" placeholder="/demo/tables/tiers"></label>
      </div>
      <div class="bw-field" id="ct-upload-field" hidden>
        <label>File: <input type="file" id="ct-file" accept=".xlsx,.csv"></label>
      </div>
      <fieldset>
        <legend>Default Chart</legend>
        <select id="ct-chart">
          <option value="">Hidden (toggle to show)</option>
          <option value="chart">Auto-detect</option>
          <option value="bar-chart">Bar Chart</option>
          <option value="line-chart">Line Chart</option>
          <option value="scatter-chart">Scatter</option>
          <option value="3d-bar-chart">3D Bar</option>
          <option value="3d-scatter-chart">3D Scatter</option>
        </select>
      </fieldset>
    </div>

    <div class="bw-panel" id="panel-structured-content">
      <div class="bw-field">
        <label>Content slug: <input type="text" id="sc-slug" placeholder="light-roast-coffee"></label>
      </div>
      <p class="bw-hint">The slug is the filename of your structured content entry in DA.</p>
    </div>

    <div class="bw-actions">
      <button id="bw-insert" type="button" class="bw-btn-primary">Insert Block</button>
      <div id="bw-result" class="bw-result" hidden>
        <p>Block markup (copy if auto-insert fails):</p>
        <pre id="bw-markup"></pre>
        <button id="bw-copy" type="button">Copy</button>
      </div>
    </div>
  </div>
  <script type="module" src="./block-wizard.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `tools/block-wizard/block-wizard.js`**

```js
// tools/block-wizard/block-wizard.js

function getActivePanel() {
  return document.querySelector('.bw-panel.is-active')?.id?.replace('panel-', '') || 'data-table';
}

function buildBlockMarkup(blockName, variants, content) {
  const fullName = [blockName, ...variants.filter(Boolean)].join(' ');
  return `<div class="${fullName}">\n  <div>\n    ${content}\n  </div>\n</div>`;
}

function getDataTableMarkup() {
  const source = document.querySelector('input[name="dt-source"]:checked')?.value;
  const style = document.getElementById('dt-style').value;
  const variants = [style];
  if (source === 'inline') return buildBlockMarkup('data-table', variants, '<!-- author your table here -->');
  if (source === 'sheet') {
    const path = document.getElementById('dt-path').value.trim();
    return buildBlockMarkup('data-table', variants, `<a href="${path}">${path}</a>`);
  }
  return buildBlockMarkup('data-table', variants, '<!-- upload file and paste URL here -->');
}

function getComparisonMarkup() {
  const source = document.querySelector('input[name="ct-source"]:checked')?.value;
  const chart = document.getElementById('ct-chart').value;
  const variants = [chart];
  const path = document.getElementById('ct-path').value.trim();
  if (source === 'sheet' && path) {
    return buildBlockMarkup('comparison-table', variants, `<a href="${path}">${path}</a>`);
  }
  return buildBlockMarkup('comparison-table', variants, '<!-- add data source link here -->');
}

function getStructuredContentMarkup() {
  const slug = document.getElementById('sc-slug').value.trim();
  return buildBlockMarkup('structured-content', [], slug || 'your-content-slug');
}

function generateMarkup() {
  const panel = getActivePanel();
  if (panel === 'data-table') return getDataTableMarkup();
  if (panel === 'comparison-table') return getComparisonMarkup();
  return getStructuredContentMarkup();
}

function tryInsertViaPostMessage(markup) {
  window.parent.postMessage({ type: 'insertContent', content: markup }, '*');
  // DA Live uses 'contentUpdate' in some versions — send both
  window.parent.postMessage({ type: 'contentUpdate', html: markup }, '*');
}

// Tab switching
document.querySelectorAll('.bw-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.bw-tab').forEach((t) => t.classList.remove('is-active'));
    document.querySelectorAll('.bw-panel').forEach((p) => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    document.getElementById(`panel-${tab.dataset.panel}`)?.classList.add('is-active');
  });
});

// DA table source radio toggle
document.querySelectorAll('input[name="dt-source"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    document.getElementById('dt-path-field').hidden = radio.value !== 'sheet';
    document.getElementById('dt-upload-field').hidden = radio.value !== 'upload';
  });
});

// CT source radio toggle
document.querySelectorAll('input[name="ct-source"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    document.getElementById('ct-upload-field').hidden = radio.value !== 'upload';
  });
});

// Insert button
document.getElementById('bw-insert').addEventListener('click', () => {
  const markup = generateMarkup();
  tryInsertViaPostMessage(markup);

  // Always show markup as fallback
  const result = document.getElementById('bw-result');
  document.getElementById('bw-markup').textContent = markup;
  result.hidden = false;
});

// Copy button
document.getElementById('bw-copy').addEventListener('click', async () => {
  const markup = document.getElementById('bw-markup').textContent;
  await navigator.clipboard.writeText(markup);
  document.getElementById('bw-copy').textContent = 'Copied!';
  setTimeout(() => { document.getElementById('bw-copy').textContent = 'Copy'; }, 2000);
});
```

- [ ] **Step 4: Create `tools/block-wizard/block-wizard.css`**

```css
/* tools/block-wizard/block-wizard.css */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 13px;
  padding: 16px;
  background: #fff;
  color: #1b1b1b;
}

.bw-title { font-size: 16px; margin-block-end: 12px; font-weight: 600; }

.bw-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #e0e0e0;
  margin-block-end: 16px;
}

.bw-tab {
  padding: 6px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  color: #636363;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;

  &.is-active { color: #843ccb; border-bottom-color: #843ccb; font-weight: 600; }
  &:hover { color: #1b1b1b; }
}

.bw-panel { display: none; &.is-active { display: block; } }

fieldset {
  border: 1px solid #d3d3d3;
  border-radius: 4px;
  padding: 10px 12px;
  margin-block-end: 12px;

  legend { font-weight: 600; padding: 0 4px; font-size: 11px; color: #636363; text-transform: uppercase; }
}

.bw-radio { display: block; margin-block: 4px; cursor: pointer; }
.bw-field { margin-block-end: 12px; }
.bw-hint { color: #636363; font-size: 11px; margin-block-start: 8px; }

label { display: block; margin-block-end: 4px; font-weight: 500; }
input[type="text"], select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #b5b5b5;
  border-radius: 4px;
  font: inherit;
  margin-block-start: 4px;
}

.bw-actions { margin-block-start: 16px; }

.bw-btn-primary {
  width: 100%;
  padding: 8px;
  background: #843ccb;
  color: #fff;
  border: none;
  border-radius: 4px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:hover { background: #622c98; }
}

.bw-result {
  margin-block-start: 12px;
  background: #f1f1f1;
  border-radius: 4px;
  padding: 10px;

  p { font-size: 11px; color: #636363; margin-block-end: 6px; }
  pre { white-space: pre-wrap; word-break: break-all; font-size: 11px; margin-block-end: 8px; }
  button { font: inherit; font-size: 11px; padding: 4px 10px; cursor: pointer; border: 1px solid #b5b5b5; border-radius: 4px; background: #fff; }
}
```

- [ ] **Step 5: Commit**

```bash
git add tools/block-wizard/ tools/sidekick/config.json
git commit -m "feat: add block wizard sidekick plugin for guided block insertion"
```

---

### Task 9: DA Live content creation

**Files:** No local files. All content created via DA MCP tools.

**Prerequisite:** DA Live MCP connected (`AEM DA - Prod`). Verify with `da_list_sources` on the repo root.

**Important:** Before creating structured content entries, use `da_get_source` to inspect the existing `light-roast-coffee` source to confirm the exact file format DA uses (JSON blob vs. document HTML). Adapt the format for new entries accordingly.

- [ ] **Step 1: Inspect existing structured content to confirm format**

Use DA MCP: `da_get_source` on path `/structured/light-roast-coffee` in repo `pstolmar/eds-authorkit-demo`. Confirm the raw format stored in DA matches the JSON served at `https://da-sc.adobeaem.workers.dev/live/...`.

- [ ] **Step 2: Create `pricing-tier` schema entries**

Use `da_create_source` to create three entries. JSON content for each:

**`/structured/starter-tier`:**
```json
{
  "metadata": { "schemaName": "pricing-tier", "title": "starter-tier" },
  "data": {
    "name": "Starter",
    "tagline": "Perfect for individuals and small projects",
    "price": 9,
    "billingPeriod": "month",
    "currency": "USD",
    "features": ["1 user", "5 projects", "10 GB storage", "Email support"],
    "limitations": ["No custom domains", "No API access", "Community support only"],
    "support": { "type": "Email", "responseTime": "48 hours" },
    "cta": { "label": "Start Free Trial", "url": "#starter" },
    "featured": false
  }
}
```

**`/structured/pro-tier`:**
```json
{
  "metadata": { "schemaName": "pricing-tier", "title": "pro-tier" },
  "data": {
    "name": "Pro",
    "tagline": "For growing teams who need more power",
    "price": 29,
    "billingPeriod": "month",
    "currency": "USD",
    "features": ["10 users", "Unlimited projects", "100 GB storage", "Priority support", "API access", "Custom domains"],
    "limitations": ["No SLA guarantee"],
    "support": { "type": "Priority Email + Chat", "responseTime": "4 hours" },
    "cta": { "label": "Get Started", "url": "#pro" },
    "featured": true
  }
}
```

**`/structured/enterprise-tier`:**
```json
{
  "metadata": { "schemaName": "pricing-tier", "title": "enterprise-tier" },
  "data": {
    "name": "Enterprise",
    "tagline": "Custom solutions for large organizations",
    "price": 99,
    "billingPeriod": "month",
    "currency": "USD",
    "features": ["Unlimited users", "Unlimited projects", "1 TB storage", "Dedicated support", "API access", "Custom domains", "SSO / SAML", "SLA guarantee"],
    "limitations": [],
    "support": { "type": "Dedicated Account Manager", "responseTime": "1 hour" },
    "cta": { "label": "Contact Sales", "url": "#enterprise" },
    "featured": false
  }
}
```

- [ ] **Step 3: Create brewing-ratios sheet**

Use `da_create_source` to create `/demo/tables/brewing-ratios` as a DA sheet (or HTML document that DA Live serves as `.json`). Content (DA sheet format):

```json
{
  "total": 5,
  "data": [
    { "Roast": "Light", "Grind": "Medium-Fine", "Ratio": "1:16", "Temp (°C)": "92-94", "Time (min)": "3-4" },
    { "Roast": "Medium", "Grind": "Medium", "Ratio": "1:15", "Temp (°C)": "90-93", "Time (min)": "4-5" },
    { "Roast": "Medium-Dark", "Grind": "Medium-Coarse", "Ratio": "1:14", "Temp (°C)": "88-91", "Time (min)": "4-6" },
    { "Roast": "Dark", "Grind": "Coarse", "Ratio": "1:13", "Temp (°C)": "85-90", "Time (min)": "5-7" },
    { "Roast": "Espresso", "Grind": "Fine", "Ratio": "1:2", "Temp (°C)": "88-92", "Time (min)": "0.5" }
  ]
}
```

Note: DA Live sheets are typically authored as documents and served as JSON. If `da_create_source` does not accept raw JSON for sheets, create the sheet as an HTML table document. The block reads `.json` appended to the path either way via the DA Live query index.

- [ ] **Step 4: Create demo page 1 — `structured-content-demo`**

Use `da_create_source` on path `/demo/structured-content/structured-content-demo`. HTML content:

```html
<h1>Structured Content Demo</h1>
<p>Each block below fetches live structured content from DA Live and renders it using schema-aware display hints. The slug in the block is the only authoring required.</p>

<h2>Coffee Product Card</h2>
<div class="structured-content">
  <div>
    <p>light-roast-coffee</p>
  </div>
</div>

<h2>Pricing Tier Card</h2>
<div class="structured-content">
  <div>
    <p>pro-tier</p>
  </div>
</div>

<h2>How to Author</h2>
<p>In the document editor, add a <strong>Structured Content</strong> block and type the slug of your content entry. The block fetches and renders the content automatically. No code changes needed for new schemas — just add display hints to your schema definition.</p>
```

- [ ] **Step 5: Create demo page 2 — `data-table-demo`**

```html
<h1>Data Table Demo</h1>
<p>One block, three data sources. All styled with the same CSS design tokens.</p>

<h2>Inline Table (Default Style)</h2>
<div class="data-table">
  <div>
    <table>
      <thead><tr><th>Origin</th><th>Roast</th><th>Flavor Notes</th><th>Price</th></tr></thead>
      <tbody>
        <tr><td>Ethiopia</td><td>Light</td><td>Citrus, Floral</td><td>$16.50</td></tr>
        <tr><td>Colombia</td><td>Medium</td><td>Caramel, Nutty</td><td>$14.00</td></tr>
        <tr><td>Guatemala</td><td>Dark</td><td>Chocolate, Smoky</td><td>$13.00</td></tr>
      </tbody>
    </table>
  </div>
</div>

<h2>DA Live Sheet (Striped Style)</h2>
<div class="data-table striped">
  <div>
    <a href="/demo/tables/brewing-ratios">Brewing Ratios</a>
  </div>
</div>

<h2>Upload Demo (Compact Style)</h2>
<div class="data-table compact">
  <div>
    <p>Drop an .xlsx or .csv file using the Upload option in the setup panel below, or replace this text with a link to an uploaded file.</p>
  </div>
</div>
```

- [ ] **Step 6: Create demo page 3 — `comparison-table-demo`**

```html
<h1>Comparison Table Demo</h1>
<p>Compare products, tiers, or variants side by side. The recommended option is highlighted automatically. Charts are driven by the same data — no separate configuration needed.</p>

<h2>Pricing Tiers — Auto Chart</h2>
<p>Pro tier is marked <em>featured</em> in the source data. The chart auto-detects bar as the appropriate type.</p>
<div class="comparison-table chart">
  <div>
    <a href="/demo/tables/pricing-tiers">Pricing Tiers</a>
  </div>
</div>

<h2>Coffee Origins — Bar Chart with Best-Value Highlights</h2>
<div class="comparison-table bar-chart">
  <div>
    <a href="/demo/tables/coffee-origins">Coffee Origins</a>
  </div>
</div>

<h2>Three-Dimensional View — 3D Bar Chart</h2>
<div class="comparison-table 3d-bar-chart">
  <div>
    <a href="/demo/tables/pricing-tiers">Pricing Tiers</a>
  </div>
</div>
```

Note: `/demo/tables/pricing-tiers` and `/demo/tables/coffee-origins` also need to be created as DA sheets in this step. See sub-steps below.

- [ ] **Step 6a: Create `/demo/tables/pricing-tiers` multi-sheet DA document**

This sheet has 3 named sheets (★ Pro, Starter, Enterprise) each with feature/value rows. If DA multi-sheet format is not directly supported via `da_create_source`, create as an `.xlsx` file and upload via `da_upload_media`. Fallback: use a single inline table in the comparison-table block.

Multi-sheet content (if supported as JSON):
```json
{
  ":names": ["★ Pro", "Starter", "Enterprise"],
  "★ Pro": {
    "data": [
      { "Feature": "Users", "Value": "10", "_best": "high" },
      { "Feature": "Projects", "Value": "Unlimited" },
      { "Feature": "Storage", "Value": "100 GB" },
      { "Feature": "Price/mo", "Value": "29", "_best": "low" },
      { "Feature": "API Access", "Value": "Yes" },
      { "Feature": "Support", "Value": "Priority" }
    ]
  },
  "Starter": {
    "data": [
      { "Feature": "Users", "Value": "1" },
      { "Feature": "Projects", "Value": "5" },
      { "Feature": "Storage", "Value": "10 GB" },
      { "Feature": "Price/mo", "Value": "9" },
      { "Feature": "API Access", "Value": "No" },
      { "Feature": "Support", "Value": "Email" }
    ]
  },
  "Enterprise": {
    "data": [
      { "Feature": "Users", "Value": "Unlimited" },
      { "Feature": "Projects", "Value": "Unlimited" },
      { "Feature": "Storage", "Value": "1 TB" },
      { "Feature": "Price/mo", "Value": "99" },
      { "Feature": "API Access", "Value": "Yes" },
      { "Feature": "Support", "Value": "Dedicated" }
    ]
  }
}
```

- [ ] **Step 6b: Create `/demo/tables/coffee-origins` DA sheet**

```json
{
  "total": 4,
  "data": [
    { "Origin": "Ethiopia", "Price": "16.50", "Rating": "4.7", "Acidity": "High", "_best_Rating": "high", "_best_Price": "low" },
    { "Origin": "Colombia", "Price": "14.00", "Rating": "4.3", "Acidity": "Medium" },
    { "Origin": "Guatemala", "Price": "13.00", "Rating": "4.1", "Acidity": "Low" },
    { "Origin": "Sumatra", "Price": "15.00", "Rating": "4.5", "Acidity": "Low" }
  ]
}
```

- [ ] **Step 7: Create demo page 4 — `all-together-demo`**

```html
<h1>All Together</h1>
<p>A complete editorial page built from all three blocks composing naturally. One data story, many presentation layers.</p>

<div class="hero">
  <div>
    <p>Morning Rituals</p>
    <h1>Coffee, Craft, and Data</h1>
    <p>From the bean to the browser — structured content, rich tables, and visual comparisons all on one page.</p>
  </div>
</div>

<h2>The Coffee</h2>
<div class="structured-content">
  <div>
    <p>light-roast-coffee</p>
  </div>
</div>

<h2>Brewing Guide</h2>
<div class="data-table striped">
  <div>
    <a href="/demo/tables/brewing-ratios">Brewing Ratios</a>
  </div>
</div>

<h2>Compare Origins</h2>
<div class="comparison-table chart">
  <div>
    <a href="/demo/tables/coffee-origins">Coffee Origins</a>
  </div>
</div>

<h2>Pricing</h2>
<div class="fragment">
  <div>
    <a href="/fragments/pricing-sidebar">/fragments/pricing-sidebar</a>
  </div>
</div>
```

- [ ] **Step 7a: Create pricing sidebar fragment at `/fragments/pricing-sidebar`**

```html
<div class="structured-content">
  <div>
    <p>pro-tier</p>
  </div>
</div>
```

- [ ] **Step 8: Preview all four demo pages**

Open each page with `?dapreview=on` appended to verify blocks render correctly:
- `https://sc--eds-authorkit-demo--pstolmar.aem.page/demo/structured-content/structured-content-demo?dapreview=on`
- `https://sc--eds-authorkit-demo--pstolmar.aem.page/demo/structured-content/data-table-demo?dapreview=on`
- `https://sc--eds-authorkit-demo--pstolmar.aem.page/demo/structured-content/comparison-table-demo?dapreview=on`
- `https://sc--eds-authorkit-demo--pstolmar.aem.page/demo/structured-content/all-together-demo?dapreview=on`

Check: structured content renders with correct hints, tables sort, comparison table shows featured badge, chart toggle works, eye icon toggles chart.

- [ ] **Step 9: Run full test suite and lint**

```bash
npm test
npm run lint
```
All tests pass. No lint errors.

- [ ] **Step 10: Final commit**

```bash
git add .
git status  # verify no secrets or unexpected files
git commit -m "feat: add DA Live demo content — pricing tiers, brewing ratios, and four demo pages"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `structured-content` block — Task 4
- ✅ `data-table` block with DA sheet / xlsx / inline — Task 5
- ✅ `comparison-table` with tabs, featured, best-value, chart — Task 6
- ✅ `schema-hints.js` with coffee + pricing-tier built-in hints — Task 1
- ✅ `table-data.js` with multi-sheet DA JSON, xlsx, inline — Task 2
- ✅ `chart-engine.js` with ECharts, 3D, lazy loading, type detection — Task 3
- ✅ Empty-state setup UI for data-table + comparison-table — Tasks 5, 6
- ✅ File upload (.xlsx, .csv) in both blocks — Tasks 5, 6
- ✅ Eye/eye-slash toggle + chart-type dropdown in comparison-table — Task 6
- ✅ Block variants (`bar-chart`, `line-chart`, etc.) mapped to chart types — Task 6
- ✅ Per-block `_<block>.json` UE model files — Tasks 4, 5, 6
- ✅ `models/_section.json` — Task 7
- ✅ Aggregated root JSON files — Task 7
- ✅ Sidekick plugin with HTML/JS/CSS + config.json — Task 8
- ✅ `pricing-tier` schema entries (Starter/Pro/Enterprise) — Task 9
- ✅ `brewing-ratios` sheet — Task 9
- ✅ Four demo pages — Task 9
- ✅ Fragment-inside-page (pricing sidebar fragment in all-together demo) — Task 9

**Type consistency:** `TableData` shape (`headers`, `rows`, `sheets`) used consistently across Tasks 2, 5, 6. `Sheet.bestHints` populated in Task 2, consumed in Task 6 `isBestValue()`. `renderChart(container, data, type)` signature consistent between Task 3 definition and Task 6 usage.

**Open question — DA multi-sheet format:** Step 6a documents the fallback (xlsx upload) if DA does not serve multi-sheet JSON at a path. Implementer must verify via `da_get_source` in Step 1 before assuming format.

**Open question — UE registration format:** If `component-definition.json` format has changed in recent UE versions, compare against the per-block `_<block>.json` files (which are the canonical source) and regenerate. The Slack reference in EDSCOMPONENTJSON.md is the authoritative source.
