/* eslint-disable */
/* global WebImporter */
/**
 * Import script – template: product-data
 * Each product page → a structured content entry (DA form, schema `product`)
 * at {site}/data/products/{slug}. The storefront demo reads price/inventory
 * from these entries; authors edit them in the DA form editor.
 */
import productDataParser from './parsers/product-data.js';
import cleanupTransformer from './transformers/brand-cleanup.js';
import { loadAuthoredContent } from './lib/brand.js';
import { runTemplate } from './lib/run.js';

const parsers = { 'product-data': productDataParser };

// The entry document holds only the form blocks (no breadcrumb/page chrome)
const entryOnlyTransformer = (hookName, element) => {
  if (hookName !== 'afterTransform') return;
  const entry = element.querySelector('[data-sc-entry]');
  if (entry) element.replaceChildren(...entry.childNodes);
};

const transformers = [cleanupTransformer, entryOnlyTransformer];

const PAGE_TEMPLATE = {
  name: 'product-data',
  description: 'Structured content (schema: product) per product page',
  urlPattern: '/product/*',
  blocks: [
    { name: 'product-data', instances: ['main div.product-detail'] },
  ],
};

export default {
  onLoad: async ({ document }) => loadAuthoredContent(document),
  transform: (payload) => runTemplate(payload, PAGE_TEMPLATE, parsers, transformers, {
    metadata: false,
    path: (brand, url) => `${brand.prefix}/data/products/${new URL(url).pathname.split('/').filter(Boolean).pop()}`,
  }),
};
