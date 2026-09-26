/* eslint-disable */
/* global WebImporter */
/**
 * Import script – template: fragments
 * Brand nav + footer documents → {site}/fragments/nav/header|footer,
 * consumed by the shared `nav` and `brand-footer` blocks.
 */
import cleanupTransformer from './transformers/brand-cleanup.js';
import sectionsTransformer from './transformers/brand-sections.js';
import { loadAuthoredContent } from './lib/brand.js';
import { runTemplate } from './lib/run.js';

const transformers = [cleanupTransformer, sectionsTransformer];

const PAGE_TEMPLATE = {
  name: 'fragments',
  description: 'Brand nav + footer fragments',
  urls: [
    'https://www.cutex.com/nav',
    'https://www.cutex.com/footer',
    'https://www.sinfulcolors.com/nav',
    'https://www.sinfulcolors.com/footer',
  ],
  blocks: [],
};

const FRAGMENTS = { '/nav': 'header', '/footer': 'footer' };

export default {
  onLoad: async ({ document }) => loadAuthoredContent(document),
  transform: (payload) => runTemplate(payload, PAGE_TEMPLATE, {}, transformers, {
    metadata: false,
    path: (brand, url) => `${brand.prefix}/fragments/nav/${FRAGMENTS[new URL(url).pathname] || 'misc'}`,
  }),
};
