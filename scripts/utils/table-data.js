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
  const { XLSX } = window;
  const { '!ref': ref } = ws;
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const rows = [];
  const { r: startRow, c: startCol } = range.s;
  const { r: endRow, c: endCol } = range.e;
  for (let r = startRow; r <= endRow; r += 1) {
    const row = [];
    for (let c = startCol; c <= endCol; c += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? String(cell.v) : '');
    }
    rows.push(row);
  }
  return rows;
}

function makeSheet(name, allRows) {
  const headers = allRows[0] || [];
  const rows = allRows.slice(1).filter((r) => !headers[0] || !r[0]?.startsWith('_best'));
  const bestHints = {};
  allRows.slice(1).forEach((r) => {
    if (r[0] === '_best') {
      headers.slice(1).forEach((h, i) => { bestHints[h] = r[i + 1]; });
    } else if (r[0]?.startsWith('_best_')) {
      const [key, val] = r;
      bestHints[key.slice(6)] = val;
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
  const rows = [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()));
  const sheet = {
    name: 'Table',
    featured: false,
    headers,
    rows,
    bestHints: {},
  };
  return { sheets: [sheet], headers, rows };
}

export async function loadTableData(el) {
  const link = el.querySelector('a[href]');
  if (link) return loadFromUrl(link.href);
  const table = el.querySelector('table');
  if (table) return parseInlineTable(table);
  return null;
}
