const scriptPromises = new Map();
function loadScript(src) {
  if (scriptPromises.has(src)) return scriptPromises.get(src);
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing?.dataset.loaded) return Promise.resolve();
  const p = new Promise((resolve, reject) => {
    if (existing) {
      existing.addEventListener('load', () => { scriptPromises.delete(src); resolve(); }, { once: true });
      existing.addEventListener('error', () => { scriptPromises.delete(src); reject(); }, { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { s.dataset.loaded = '1'; scriptPromises.delete(src); resolve(); };
    s.onerror = () => { scriptPromises.delete(src); reject(); };
    document.head.append(s);
  });
  scriptPromises.set(src, p);
  return p;
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
  const numericCols = headers.slice(1).filter((_, i) => {
    const isNum = (r) => r[i + 1] !== undefined && !Number.isNaN(parseFloat(r[i + 1]));
    return rows.every(isNum);
  });
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
      legend: {},
      tooltip: {},
      xAxis: { type: 'category', data: rows.map((r) => r[0]) },
      yAxis: {},
      series: headers.slice(1).map((name, i) => {
        const lineData = rows.map((r) => parseFloat(r[i + 1]) || 0);
        return { name, type: 'line', data: lineData };
      }),
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
      grid3D: {},
      tooltip: {},
      xAxis3D: { type: 'category', data: sheetList.map((s) => s.name) },
      yAxis3D: { type: 'category', data: headers.slice(1) },
      zAxis3D: {},
      series: [{ type: 'bar3D', data: seriesData, shading: 'realistic' }],
    };
  }

  if (type === '3d-scatter') {
    return {
      grid3D: {},
      tooltip: {},
      xAxis3D: { name: headers[1] },
      yAxis3D: { name: headers[2] },
      zAxis3D: { name: headers[3] },
      series: [{
        type: 'scatter3D',
        data: rows.map((r) => [
          parseFloat(r[1]) || 0,
          parseFloat(r[2]) || 0,
          parseFloat(r[3]) || 0,
        ]),
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
  container.chartCleanup = () => { ro.disconnect(); chart.dispose(); };
  return chart;
}
