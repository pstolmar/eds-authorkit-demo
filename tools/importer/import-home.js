/* eslint-disable */
/* global WebImporter */
/**
 * Import script – template: home
 * Shared by Cutex and Sinful Colors: the brand is derived from the source
 * host, output lands in /demo/{brand}/… with brand theme + nav variant.
 */

// PARSER IMPORTS
import marqueeParser from './parsers/marquee.js';
import productCardsParser from './parsers/product-cards.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/brand-cleanup.js';
import sectionsTransformer from './transformers/brand-sections.js';

import { loadAuthoredContent } from './lib/brand.js';
import { runTemplate } from './lib/run.js';

// PARSER REGISTRY
const parsers = {
  'marquee': marqueeParser,
  'product-cards': productCardsParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION – embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "home",
  "description": "Brand homepage: full-bleed marquee and/or featured product cards (shared by all brands)",
  "urlPattern": "/",
  "urls": [
    "https://www.cutex.com/",
    "https://www.sinfulcolors.com/"
  ],
  "blocks": [
    {
      "name": "marquee",
      "instances": [
        "main div.hero"
      ]
    },
    {
      "name": "product-cards",
      "instances": [
        "main div.category-cards"
      ]
    }
  ]
};

export default {
  onLoad: async ({ document }) => loadAuthoredContent(document),
  transform: (payload) => runTemplate(payload, PAGE_TEMPLATE, parsers, transformers),
};
