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
