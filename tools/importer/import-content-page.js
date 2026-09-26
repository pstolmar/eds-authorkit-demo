/* eslint-disable */
/* global WebImporter */
/**
 * Import script – template: content-page
 * Shared by Cutex and Sinful Colors: the brand is derived from the source
 * host, output lands in /demo/{brand}/… with brand theme + nav variant.
 */

// PARSER IMPORTS
import breadcrumbParser from './parsers/breadcrumb.js';
import contactUsParser from './parsers/contact-us.js';
import embedParser from './parsers/embed.js';
import tableParser from './parsers/table.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/brand-cleanup.js';
import sectionsTransformer from './transformers/brand-sections.js';

import { loadAuthoredContent } from './lib/brand.js';
import { runTemplate } from './lib/run.js';

// PARSER REGISTRY
const parsers = {
  'breadcrumb': breadcrumbParser,
  'contact-us': contactUsParser,
  'embed': embedParser,
  'table': tableParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION – embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "content-page",
  "description": "About, contact, legal and campaign pages: breadcrumb + default content with optional blocks",
  "urlPattern": "/*",
  "urls": [
    "https://www.cutex.com/privacy-policy",
    "https://www.cutex.com/contact-us",
    "https://www.cutex.com/about-us",
    "https://www.cutex.com/dsar",
    "https://www.cutex.com/terms-of-use",
    "https://www.sinfulcolors.com/privacy-policy",
    "https://www.sinfulcolors.com/contact-us",
    "https://www.sinfulcolors.com/about-us",
    "https://www.sinfulcolors.com/dsar",
    "https://www.sinfulcolors.com/sinful-colors-2",
    "https://www.sinfulcolors.com/saweetiehotline",
    "https://www.sinfulcolors.com/saweetie-vacay-vibes-giveaway-terms",
    "https://www.sinfulcolors.com/terms-of-use"
  ],
  "blocks": [
    {
      "name": "breadcrumb",
      "instances": [
        "main div.breadcrumb"
      ]
    },
    {
      "name": "contact-us",
      "instances": [
        "main div.contact-us"
      ]
    },
    {
      "name": "embed",
      "instances": [
        "main div.iframe"
      ]
    },
    {
      "name": "table",
      "instances": [
        "main div.table"
      ]
    }
  ]
};

export default {
  onLoad: async ({ document }) => loadAuthoredContent(document),
  transform: (payload) => runTemplate(payload, PAGE_TEMPLATE, parsers, transformers),
};
