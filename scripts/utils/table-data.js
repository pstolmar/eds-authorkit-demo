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

function parseEdsBlockAsSheets(doc) {
  const main = doc.querySelector('main');
  if (!main) return null;
  const blockDiv = main.querySelector('div > div[class]');
  if (!blockDiv) return null;

  const allRows = [...blockDiv.children].map((rowEl) => [...rowEl.children].map((cell) => cell.textContent.trim()));
  if (!allRows.length) return null;

  const hintsByPos = {};
  let featureNames = null;
  const dataRows = [];

  for (const row of allRows) {
    if (row[0] === '_best') {
      row.slice(1).forEach((hint, i) => { hintsByPos[i] = hint; });
    } else if (row[0] === '' && row.slice(1).some(Boolean)) {
      // Row with empty first cell = feature label row (added by authors for named attributes)
      featureNames = row.slice(1);
    } else if (row[0]) {
      dataRows.push(row);
    }
  }

  if (!dataRows.length) return null;

  const numCols = Math.max(...dataRows.map((r) => r.length - 1));
  const names = featureNames || Array.from({ length: numCols }, (_, i) => `Attr ${i + 1}`);

  const bestHints = {};
  names.forEach((name, i) => { if (hintsByPos[i]) bestHints[name] = hintsByPos[i]; });

  const sheets = dataRows.map((row) => {
    const rawName = row[0];
    const featured = rawName.startsWith('★');
    const sheetName = rawName.replace(/^★\s*/, '').trim();
    const sheetRows = names.map((name, i) => [name, row[i + 1] ?? '']);
    return {
      name: sheetName, featured, headers: ['Feature', 'Value'], rows: sheetRows, bestHints,
    };
  });

  const primary = sheets.find((s) => s.featured) || sheets[0];
  return { sheets, headers: ['Feature', 'Value'], rows: primary.rows };
}

export async function loadFromUrl(url) {
  const isFile = /\.(xlsx|csv)(\?|$)/i.test(url);
  if (isFile) {
    const resp = await fetch(url);
    const buffer = await resp.arrayBuffer();
    return loadXlsxBuffer(buffer);
  }
  const baseUrl = url.replace(/\.json$/, '');
  const jsonUrl = `${baseUrl}.json`;
  const jsonResp = await fetch(jsonUrl);
  if (jsonResp.ok) {
    const json = await jsonResp.json();
    if (json[':names']) {
      const sheets = json[':names'].map((name) => daRowsToSheet(name, json[name] || { data: [] }));
      const primary = sheets.find((s) => s.featured) || sheets[0];
      return { sheets, headers: primary?.headers || [], rows: primary?.rows || [] };
    }
    const sheet = daRowsToSheet('Sheet1', json);
    return { sheets: [sheet], headers: sheet.headers, rows: sheet.rows };
  }
  // DA HTML documents don't get .json endpoints — parse the HTML table directly
  const htmlResp = await fetch(baseUrl);
  if (!htmlResp.ok) throw new Error(`${htmlResp.status}`);
  const html = await htmlResp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (table) return parseInlineTable(table);
  // EDS block documents use div-based structure, not <table> — parse and transpose
  const edsResult = parseEdsBlockAsSheets(doc);
  if (edsResult) return edsResult;
  throw new Error('No table in document');
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
