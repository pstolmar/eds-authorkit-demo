/*
 * Authoring context helpers for DA canvas / quick edit.
 *
 * In the canvas, DA injects the document body into the page (with
 * data-prose-index / data-block-index instrumentation) and re-runs loadPage.
 * Blocks must then move authored elements instead of recreating them, or the
 * editor loses track of what is editable.
 */

/** True when the page is rendered inside the DA canvas / quick edit. */
export function isAuthoring() {
  return !!document.querySelector('main [data-prose-index], main [data-block-index]')
    || document.body.classList.contains('da-preview');
}

/** True when the page is embedded (editor iframe, preview frame). */
export function isFramed() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * The canvas body still contains the document's Metadata block (on a
 * published page it has been turned into <meta> tags). Apply it to the head
 * so theme, template, header and footer resolve, and keep it out of the
 * block loader.
 */
export function applyInlineMetadata(root = document) {
  root.querySelectorAll('main div.metadata').forEach((block) => {
    [...block.children].forEach((row) => {
      const [keyCell, valueCell] = row.children;
      const key = keyCell?.textContent.trim().toLowerCase().replace(/\s+/g, '-');
      if (!key || !valueCell) return;
      const value = valueCell.querySelector('img')?.getAttribute('src') || valueCell.textContent.trim();
      let meta = document.head.querySelector(`meta[name="${key}" i]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = key;
        document.head.append(meta);
      }
      meta.content = value;
    });
    block.removeAttribute('class');
    block.dataset.metadata = '';
    block.hidden = true;
  });
}

/**
 * The element to move when relocating a picture: its wrapping paragraph when
 * that paragraph holds only the picture (the editor instruments it), else the
 * picture itself. Wrappers get `pic-wrap` (display: contents).
 */
export function pictureHolder(picture) {
  const parent = picture?.parentElement;
  if (parent?.tagName === 'P' && !parent.textContent.trim() && parent.children.length === 1) {
    parent.classList.add('pic-wrap');
    return parent;
  }
  return picture;
}
