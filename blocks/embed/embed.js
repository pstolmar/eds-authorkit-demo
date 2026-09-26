/**
 * Embed – renders an authored URL as a responsive iframe
 * (e.g. the brand's privacy-rights request portal).
 * In the DA canvas the authored link stays in place so it can be edited.
 */
import { isAuthoring } from '../../scripts/utils/authoring.js';

export default function init(el) {
  const url = el.querySelector('a')?.href || el.textContent.trim();
  if (!/^https:\/\//.test(url) || isAuthoring()) return;
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.title = el.querySelector('a')?.textContent.trim() || 'Embedded content';
  frame.loading = 'lazy';
  frame.allow = 'clipboard-write';
  el.replaceChildren(frame);
}
