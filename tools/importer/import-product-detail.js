/* eslint-disable */
/* global WebImporter */
/**
 * Import script – template: product-detail
 * Shared by Cutex and Sinful Colors: the brand is derived from the source
 * host, output lands in /demo/{brand}/… with brand theme + nav variant.
 */

// PARSER IMPORTS
import breadcrumbParser from './parsers/breadcrumb.js';
import productDetailParser from './parsers/product-detail.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/brand-cleanup.js';
import sectionsTransformer from './transformers/brand-sections.js';

import { loadAuthoredContent } from './lib/brand.js';
import { runTemplate } from './lib/run.js';

// PARSER REGISTRY
const parsers = {
  'breadcrumb': breadcrumbParser,
  'product-detail': productDetailParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION – embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "product-detail",
  "description": "Product detail: breadcrumb and product-detail gallery + summary",
  "urlPattern": "/product/*",
  "urls": [
    "https://www.cutex.com/product/all-in-one-strengthener",
    "https://www.cutex.com/product/hydrating-cuticle-oil",
    "https://www.cutex.com/product/moisture-rich",
    "https://www.cutex.com/product/spot-on-jelly",
    "https://www.cutex.com/product/swipe-go-non-acetone",
    "https://www.cutex.com/product/strength-shield",
    "https://www.cutex.com/product/non-acetone",
    "https://www.cutex.com/product/nourishing",
    "https://www.cutex.com/product/twist-scrub-sponge",
    "https://www.cutex.com/product/intense-recovery",
    "https://www.cutex.com/product/ultra-powerful",
    "https://www.cutex.com/product/ultra-powerful-tropical-breeze",
    "https://www.cutex.com/product/swipe-go",
    "https://www.cutex.com/product/polish-away-sponge-pads",
    "https://www.cutex.com/product/ultra-caring",
    "https://www.sinfulcolors.com/product/berry-charm",
    "https://www.sinfulcolors.com/product/bite",
    "https://www.sinfulcolors.com/product/beach-vibes",
    "https://www.sinfulcolors.com/product/aint-having-it",
    "https://www.sinfulcolors.com/product/24k-drips",
    "https://www.sinfulcolors.com/product/biker-jacket",
    "https://www.sinfulcolors.com/product/bath-goals",
    "https://www.sinfulcolors.com/product/black-cherry",
    "https://www.sinfulcolors.com/product/cari-bae-n",
    "https://www.sinfulcolors.com/product/chamomile-calm",
    "https://www.sinfulcolors.com/product/bitten",
    "https://www.sinfulcolors.com/product/coffee-drip",
    "https://www.sinfulcolors.com/product/black-on-black",
    "https://www.sinfulcolors.com/product/climaxxx",
    "https://www.sinfulcolors.com/product/diamonds-on-my-neck",
    "https://www.sinfulcolors.com/product/cherry-chaser",
    "https://www.sinfulcolors.com/product/endless-blue",
    "https://www.sinfulcolors.com/product/gogo-girl",
    "https://www.sinfulcolors.com/product/flushed",
    "https://www.sinfulcolors.com/product/eucalyptahhh",
    "https://www.sinfulcolors.com/product/hazard",
    "https://www.sinfulcolors.com/product/let-me-go",
    "https://www.sinfulcolors.com/product/juicy",
    "https://www.sinfulcolors.com/product/galaxy-gurl",
    "https://www.sinfulcolors.com/product/glass-pink",
    "https://www.sinfulcolors.com/product/lets-talk",
    "https://www.sinfulcolors.com/product/lie-lac",
    "https://www.sinfulcolors.com/product/ice-ice-cherry",
    "https://www.sinfulcolors.com/product/hit-the-spot",
    "https://www.sinfulcolors.com/product/low-key-lavender",
    "https://www.sinfulcolors.com/product/play-hard",
    "https://www.sinfulcolors.com/product/pink-smart",
    "https://www.sinfulcolors.com/product/plum-n-berry",
    "https://www.sinfulcolors.com/product/sail-la-vie",
    "https://www.sinfulcolors.com/product/rise-shine",
    "https://www.sinfulcolors.com/product/pinky-glitter",
    "https://www.sinfulcolors.com/product/power-moves",
    "https://www.sinfulcolors.com/product/shine-honey",
    "https://www.sinfulcolors.com/product/queen-of-beauty",
    "https://www.sinfulcolors.com/product/pop-it",
    "https://www.sinfulcolors.com/product/prosecco-problems",
    "https://www.sinfulcolors.com/product/smoky-palo-santo",
    "https://www.sinfulcolors.com/product/salt-bath-babe",
    "https://www.sinfulcolors.com/product/clear-coat",
    "https://www.sinfulcolors.com/product/so-matcha-better",
    "https://www.sinfulcolors.com/product/starfish",
    "https://www.sinfulcolors.com/product/strengthening-top-coat",
    "https://www.sinfulcolors.com/product/never-not-working",
    "https://www.sinfulcolors.com/product/snow-me-white",
    "https://www.sinfulcolors.com/product/sugar-sugar",
    "https://www.sinfulcolors.com/product/tempest",
    "https://www.sinfulcolors.com/product/sweet-spicey",
    "https://www.sinfulcolors.com/product/thrilled",
    "https://www.sinfulcolors.com/product/tokyo-pearl",
    "https://www.sinfulcolors.com/product/sweet-cheeks",
    "https://www.sinfulcolors.com/product/taupe-is-dope",
    "https://www.sinfulcolors.com/product/vacation-time",
    "https://www.sinfulcolors.com/product/unicorns-r-real",
    "https://www.sinfulcolors.com/product/yolo-yellow",
    "https://www.sinfulcolors.com/product/thimbleberry",
    "https://www.sinfulcolors.com/product/violet-riot"
  ],
  "blocks": [
    {
      "name": "breadcrumb",
      "instances": [
        "main div.breadcrumb"
      ]
    },
    {
      "name": "product-detail",
      "instances": [
        "main div.product-detail"
      ]
    }
  ]
};

export default {
  onLoad: async ({ document }) => loadAuthoredContent(document),
  transform: (payload) => runTemplate(payload, PAGE_TEMPLATE, parsers, transformers),
};
