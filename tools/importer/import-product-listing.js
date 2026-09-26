/* eslint-disable */
/* global WebImporter */
/**
 * Import script – template: product-listing
 * Shared by Cutex and Sinful Colors: the brand is derived from the source
 * host, output lands in /demo/{brand}/… with brand theme + nav variant.
 */

// PARSER IMPORTS
import breadcrumbParser from './parsers/breadcrumb.js';
import productCardsParser from './parsers/product-cards.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/brand-cleanup.js';
import sectionsTransformer from './transformers/brand-sections.js';

import { loadAuthoredContent } from './lib/brand.js';
import { runTemplate } from './lib/run.js';

// PARSER REGISTRY
const parsers = {
  'breadcrumb': breadcrumbParser,
  'product-cards': productCardsParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION – embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "product-listing",
  "description": "Category / product listing: breadcrumb, title and product cards grid",
  "urlPattern": "/store/products*, /nail-polish*",
  "urls": [
    "https://www.cutex.com/store/products/acetone-removers",
    "https://www.cutex.com/store/products",
    "https://www.cutex.com/store/products/non-acetone-removers",
    "https://www.cutex.com/store/products/nail-treatments",
    "https://www.sinfulcolors.com/nail-polish/quick-bliss",
    "https://www.sinfulcolors.com/nail-polish/power-paint",
    "https://www.sinfulcolors.com/nail-polish",
    "https://www.sinfulcolors.com/nail-polish/essenchills",
    "https://www.sinfulcolors.com/nail-polish/bold-color",
    "https://www.sinfulcolors.com/nail-polish/nail-polish"
  ],
  "blocks": [
    {
      "name": "breadcrumb",
      "instances": [
        "main div.breadcrumb"
      ]
    },
    {
      "name": "product-cards",
      "instances": [
        "main div.product-list"
      ]
    }
  ]
};

export default {
  onLoad: async ({ document }) => loadAuthoredContent(document),
  transform: (payload) => runTemplate(payload, PAGE_TEMPLATE, parsers, transformers),
};
