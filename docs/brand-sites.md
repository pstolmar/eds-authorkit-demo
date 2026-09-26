# Brand sites: Cutex + Sinful Colors

Two sister brands run on **one set of templates, blocks and import scripts**.
Brand differences are theme tokens or block variants, never forked code.

## Content structure

```
/demo/{brand}/                      brand root (Author Kit locale-style prefix)
  index, about-us, contact-us, privacy-policy, terms-of-use, dsar, …
  store/products/* | nail-polish/*  product listings
  product/*                         product detail pages
  fragments/nav/header|footer       brand navigation + footer
  data/products/*                   structured content (DA form, schema: product)
  media/*                           brand imagery
  assets/*.pdf                      legal documents linked from the footer
```

## Page metadata (every brand page)

| Key | Cutex | Sinful Colors |
|---|---|---|
| Template | home · product-listing · product-detail · content-page | same |
| Theme | cutex | sinfulcolors |
| Header | `nav (light)` | `nav (dark)` |
| Footer | brand-footer | brand-footer |

`templates/{template}/` holds shared page-type CSS; `styles/brands/foundation.css`
holds the shared design system and `styles/brands/{theme}.css` only brand tokens.

## Blocks and variants

| Block | Variants | Used by |
|---|---|---|
| nav | dark, light | header of both brands |
| brand-footer | – (content decides wordmark vs logo + social) | both |
| marquee | (default) stacked headline, overlay-right | Sinful home, Cutex home |
| product-cards | glow, splat, category, featured | all listings + Sinful home |
| product-detail | (default) accordion, simple | Sinful PDP, Cutex PDP |
| breadcrumb, contact-us, embed, table (no-header) | – | content pages |

Hover effects: `glow` = soft opacity glow (Cutex); `splat` = the shade splat
replaces the bottle (Sinful Colors: the authored second image, or a painted
splat in the card accent color when only one image exists).

## Demo mode

Add `?demo=1` (or `true`) to any brand page; `?demo=0` exits. The overlay offers:

- **Store** – simulated storefront (EDS Storefront drop-in patterns: price, stock,
  add to bag, mini-cart, checkout, live inventory). Prices/stock come from
  `data/products/{slug}`; purchases reduce stock locally. Not connected to Commerce.
- **Edit links** – open product entries in the DA form editor
  (`da.live/form#/{org}/{repo}/demo/{brand}/data/products/{slug}`) and pages in DA.
- **Block inspector**, **Image hover** (glow/splat) and **Nav style** (dark/light)
  swaps to show the same blocks re-skinned by variant, plus brand switching and
  cookie-banner reset.

The product schema for the form editor is `tools/structured/schemas/product.json`
(DA stores schemas at `.da/forms/schemas/product`).

## Re-running the migration

```bash
S=<excat-content-import>/scripts
$S/aem-import-bundle.sh --importjs tools/importer/import-<template>.js
node $S/run-bulk-import.js --import-script tools/importer/import-<template>.bundle.js \
  --urls tools/importer/urls-<template>.txt --force
node tools/importer/download-assets.js   # media + PDFs into each brand folder
```

Templates: `home`, `product-listing`, `product-detail`, `content-page`,
`fragments`, `product-data`. One script per template serves both brands.
