/* eslint-disable */
/* global WebImporter */
/**
 * Shared orchestration for the brand import scripts: every template runs the
 * same pipeline (transformers → parsers → metadata → media), so templates
 * differ only in their embedded PAGE_TEMPLATE and parser registry.
 */
import {
  getBrand, brandPath, brandMetadata, localizeMedia,
} from './brand.js';

export function executeTransformers(transformers, hookName, element, payload, template) {
  const enhanced = { ...payload, template };
  transformers.forEach((fn) => {
    try {
      fn.call(null, hookName, element, enhanced);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

export function findBlocksOnPage(document, template) {
  const found = [];
  template.blocks.forEach((def) => {
    def.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        found.push({ name: def.name, selector, element });
      });
    });
  });
  return found;
}

/**
 * @param {object} payload importer payload
 * @param {object} template embedded PAGE_TEMPLATE
 * @param {object} parsers name → parser
 * @param {Function[]} transformers page transformers
 * @param {object} [options]
 * @param {boolean} [options.metadata=true] append page metadata
 * @param {Function} [options.path] (brand, originalURL) → document path
 */
export function runTemplate(payload, template, parsers, transformers, options = {}) {
  const { document, params } = payload;
  const brand = getBrand(params.originalURL);
  const main = document.querySelector('main') || document.body;

  executeTransformers(transformers, 'beforeTransform', main, payload, template);

  const blocks = findBlocksOnPage(document, template);
  blocks.forEach(({ name, selector, element }) => {
    if (!element.parentNode) return;
    const parser = parsers[name];
    if (!parser) return;
    try {
      parser(element, { ...payload, brand });
    } catch (e) {
      console.error(`Failed to parse ${name} (${selector}):`, e);
    }
  });

  executeTransformers(transformers, 'afterTransform', main, payload, template);

  if (options.metadata !== false) brandMetadata(main, document, brand, template.name);
  localizeMedia(main, brand);

  const path = options.path ? options.path(brand, params.originalURL) : brandPath(brand, params.originalURL);
  return [{
    element: main,
    path,
    report: {
      brand: brand.key,
      template: template.name,
      blocks: [...new Set(blocks.map((b) => b.name))].join(', '),
    },
  }];
}
