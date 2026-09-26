/**
 * Embed – renders an authored URL as a responsive iframe
 * (e.g. the brand's privacy-rights request portal).
 */
export default function init(el) {
  const url = el.querySelector('a')?.href || el.textContent.trim();
  if (!/^https:\/\//.test(url)) return;
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.title = el.querySelector('a')?.textContent.trim() || 'Embedded content';
  frame.loading = 'lazy';
  frame.allow = 'clipboard-write';
  el.replaceChildren(frame);
}
