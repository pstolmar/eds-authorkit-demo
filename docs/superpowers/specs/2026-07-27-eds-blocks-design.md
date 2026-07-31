# EDS Blocks Design: Structured Content, Data Table, Comparison Table

**Date:** 2026-07-27  
**Project:** eds-authorkit-demo  
**Branch:** sc  

---

## Overview

Three new EDS blocks demonstrating DA Live Structured Content display, rich data table authoring, and interactive comparison tables with chart visualizations. Accompanied by four demo pages and a DA-backed schema + content creation step via MCP.

---

## Architecture

### Approach: Three blocks + shared utility modules

Three focused blocks delegate shared logic to utilities in `scripts/utils/`:

| File | Purpose |
|------|---------|
| `scripts/utils/table-data.js` | Unified data loader — DA sheet JSON, xlsx/CSV via SheetJS, inline passthrough |
| `scripts/utils/chart-engine.js` | Chart rendering — ECharts (2D) + ECharts-GL (3D), lazy-loaded, type-detection |
| `scripts/utils/schema-hints.js` | Maps SC field names → display renderers (stars, pills, price-badge, accordion, spec-table) |

**Why shared utilities and not independent blocks:** EDS anti-pattern is blocks importing from *other blocks*. Utilities in `scripts/utils/` are the established pattern (existing: `icons.js`, `observer.js`, `styles.js`). Duplicating SheetJS and ECharts wiring in two blocks would be the actual anti-pattern.

---

## Sub-project A: `structured-content` Block

### Authoring

Author drops the block, adds one line of text: the SC slug (e.g., `light-roast-coffee`). The block fetches:

```
https://da-sc.adobeaem.workers.dev/live/{owner}/{repo}/structured/{slug}
```

Owner and repo are derived from `window.location` at runtime.

### Schema hints system

Each schema can include a `_display` map in its JSON (or a sidecar `structured/schemas/{name}.json`) that maps field names to render types:

| Hint value | Renders as |
|-----------|-----------|
| `stars` | Star rating row (numeric 0–5) |
| `pills` | Colored tag pills (array of strings) |
| `price-badge` | Large price display with currency |
| `accordion` | Collapsible FAQ list (array of `{question, answer}`) |
| `spec-table` | Two-column key/value mini-table (nested object) |
| `badge` | Status/category badge |
| `boolean` | In-stock / out-of-stock indicator |

Unknown fields fall back to a clean key/value row. This makes the block schema-generic while enabling rich rendering for hinted schemas.

### Visual layout (coffee product card)

- Hero band: name + price badge + rating stars + in-stock badge
- Tasting notes as colored pills
- Brewing guide as a spec-table (method, ratio, temperature)
- FAQs as collapsible accordion
- Light/dark aware via CSS custom properties

### Schemas to create via DA MCP

**`coffee`** — already exists at `/structured/light-roast-coffee`. Add `_display` hints to schema definition.

**`pricing-tier`** — new schema:
```json
{
  "name": "string",
  "tagline": "string",
  "price": "number",          // _display: price-badge
  "billingPeriod": "string",
  "currency": "string",
  "features": ["string"],     // _display: pills
  "limitations": ["string"],  // _display: pills
  "support": {                // _display: spec-table
    "type": "string",
    "responseTime": "string"
  },
  "cta": {                   // _display: cta-button
    "label": "string",
    "url": "string"
  },
  "featured": "boolean"       // _display: boolean
}
```

Three entries: `starter-tier`, `pro-tier`, `enterprise-tier` (Pro marked `featured: true`).

### Files

```
blocks/structured-content/
  structured-content.js
  structured-content.css
scripts/utils/schema-hints.js
```

---

## Sub-project B: `data-table` Block

### Data sources (resolved in priority order)

1. **DA Live sheet** — author puts a relative path (e.g., `/demo/tables/brewing-ratios`) in the block; the block appends `.json` and fetches the DA Live JSON endpoint. Named sheets available via `?sheet=` param.
2. **xlsx / CSV upload** — author puts a link to an uploaded file (uploaded to DA, served as binary asset). SheetJS parses client-side. Copy-paste of file URL works identically. Both `.xlsx` and `.csv` supported.
3. **Inline** — if no URL is present, the block reads the HTML `<table>` already in the document (authored in Canvas/DA). Supersedes the existing bare `table` block with richer styling.

### Block variants (CSS modifier classes)

- `data-table` — default
- `data-table striped` — alternating row shading
- `data-table compact` — reduced padding
- `data-table full-width` — breaks out of grid container

### Visual features

- Sticky header
- Column sort on click (client-side, no server round-trip)
- Horizontal scroll on mobile
- Light/dark aware, Montserrat font, design token palette

### Empty-state setup UI

When block has no content configured, renders an interactive setup panel. Applies to both `data-table` and `comparison-table` (comparison-table adds chart-type default to the chooser):

- **Create New** → scaffolds an inline table the author starts typing into
- **Choose** → path input + simple DA Live path browser (lists available sheets under repo)
- **Upload** → file picker accepting `.xlsx` or `.csv`
- Style chooser: Default / Striped / Compact / Full-width
- *(comparison-table only)* Chart type default: Auto / Bar / Line / Scatter / 3D Bar / 3D Scatter / Hidden

Updates block DOM on selection. In Canvas/WYSIWYG the author sees it immediately.

### Sidekick plugin (write-back)

- `tools/block-wizard/block-wizard.html` — palette UI
- `tools/block-wizard/block-wizard.js` — file parsing, DA path browsing, `postMessage` to DA editor to insert block markup at cursor position
- Sidekick config entry: appears as a panel button in the sidekick

### Component registration

Each block gets its own `_<block>.json` inside its block folder (the per-block source of truth per EDS convention). These are manually aggregated into root-level files since this project has no auto-aggregation tooling yet.

- `blocks/<name>/_<name>.json` — per-block definitions + models + filters (resourceType: `core/franklin/components/block/v1/block`)
- `component-definition.json` — aggregated block browser entries
- `component-models.json` — aggregated field models for Universal Editor / Canvas
- `component-filters.json` — aggregated filters (empty for non-container blocks)
- `models/_section.json` — adds new block IDs to the section allowlist so authors can insert them in Universal Editor

### Files

```
blocks/data-table/
  data-table.js
  data-table.css
scripts/utils/table-data.js
tools/block-wizard/
  block-wizard.html
  block-wizard.js
component-definition.json        (new or updated)
component-models.json            (new or updated)
```

---

## Sub-project C: `comparison-table` Block

### Data sources

Same as `data-table` via `table-data.js`. Each worksheet tab / named sheet becomes one compared entity (product, variant, tier).

### Featured / recommended designation

**Tab level:** Author marks the featured sheet by either:
- Adding a metadata row `featured: true` in the sheet
- Prefixing the sheet/tab name with `★`

Featured tab is selected and scrolled into view on load with a "Recommended" badge on its tab button.

**Cell level (per-row best-value):** For numeric rows, the block compares values across all sheets and highlights the winner. Configurable via a row metadata hint:
- `_best: high` — higher value wins (e.g., features count, rating)
- `_best: low` — lower value wins (e.g., price)

Winning cells: subtle accent color + hover tooltip "Best value across options."

### Tab UI

- Tabs across the top, one per sheet/variant
- Animated tab switching
- Mobile: tabs collapse to a `<select>` dropdown
- Featured tab has "Recommended" badge

### Chart layer

**Block variant controls default chart type and visibility:**

| Variant | Default state |
|---------|--------------|
| `comparison-table` | Table only; chart hidden (toggleable) |
| `comparison-table chart` | Chart shown, type auto-detected |
| `comparison-table bar-chart` | Bar chart shown |
| `comparison-table line-chart` | Line chart shown |
| `comparison-table scatter-chart` | Scatter chart shown |
| `comparison-table 3d-bar-chart` | 3D bar chart shown (ECharts-GL) |
| `comparison-table 3d-scatter-chart` | 3D scatter chart shown (ECharts-GL) |

**Auto-detect heuristic (for `chart` variant):**
- Few categories + numeric values → bar chart
- Time/ordered series → line chart
- Two numeric axes → scatter chart
- 3+ numeric dimensions → 3D scatter chart

**In-page controls (always rendered regardless of variant):**
- Eye / eye-slash icon button — toggles chart visibility
- Chart-type dropdown — overrides current type (options match variant names)
- Both controls work in rendered view and in Canvas authoring context
- When variant omits `chart`, chart defaults hidden but the eye icon lets viewer reveal it

**Library:** ECharts (2D, ~600KB) + ECharts-GL (3D, ~1.2MB). Loaded lazily from CDN only when chart panel is first shown. Zero network cost if chart stays hidden.

### Files

```
blocks/comparison-table/
  comparison-table.js
  comparison-table.css
scripts/utils/chart-engine.js
```

---

## Demo Pages

All four pages created under `demo/structured-content/` via DA MCP.

### Page 1 — `structured-content-demo`

**Story:** What is structured content, and how does one block render any schema beautifully?

- Intro paragraph explaining structured content + link to DA schema editor
- `structured-content` block → coffee product card (`light-roast-coffee`)
- `structured-content` block → pricing tier card (`pro-tier`)
- Light/dark mode visible via body class toggle
- Section: "How to author" — shows the block with just the slug text, explains the fetch

### Page 2 — `data-table-demo`

**Story:** One block, three data sources, multiple visual styles.

- `data-table` (inline authored table, default style)
- `data-table striped` (pulling from DA Live sheet at `/demo/tables/brewing-ratios`)
- `data-table compact` (from uploaded xlsx file)
- Brief heading between each instance labeling the data source

### Page 3 — `comparison-table-demo`

**Story:** Compare anything — products, tiers, options — with automatic insights and visuals.

- `comparison-table chart` — pricing tiers (Starter/Pro/Enterprise), Pro marked featured, bar chart auto-detected
- `comparison-table bar-chart` — coffee origin data with per-row best-value highlighting
- Stretch: `comparison-table 3d-bar-chart` if ECharts-GL renders cleanly
- Eye-toggle and chart-type dropdown visible and interactive

### Page 4 — `all-together-demo`

**Story:** A complete editorial page built from all three blocks composing naturally.

1. Hero section
2. `structured-content` → coffee product card
3. `data-table striped` → brewing ratios (xlsx source)
4. `comparison-table chart` → coffee variant comparison
5. `fragment` block → reusable sidebar fragment containing a `structured-content` pricing-tier card (demonstrates table-inside-fragment composition)

---

## DA Content to Create via MCP

| Item | Path | Method |
|------|------|--------|
| `pricing-tier` schema definition | `/structured/schemas/pricing-tier.json` | `da_create_source` |
| `starter-tier` SC entry | `/structured/starter-tier` | `da_create_source` |
| `pro-tier` SC entry | `/structured/pro-tier` | `da_create_source` |
| `enterprise-tier` SC entry | `/structured/enterprise-tier` | `da_create_source` |
| Brewing ratios sheet | `/demo/tables/brewing-ratios` | `da_create_source` |
| Demo page 1 | `/demo/structured-content/structured-content-demo` | `da_create_source` |
| Demo page 2 | `/demo/structured-content/data-table-demo` | `da_create_source` |
| Demo page 3 | `/demo/structured-content/comparison-table-demo` | `da_create_source` |
| Demo page 4 | `/demo/structured-content/all-together-demo` | `da_create_source` |

---

## File Inventory (complete)

```
blocks/
  structured-content/
    structured-content.js      (new)
    structured-content.css     (new)
    _structured-content.json   (new — UE block definition)
  data-table/
    data-table.js              (new)
    data-table.css             (new)
    _data-table.json           (new — UE block definition)
  comparison-table/
    comparison-table.js        (new)
    comparison-table.css       (new)
    _comparison-table.json     (new — UE block definition)
scripts/utils/
  table-data.js                (new)
  chart-engine.js              (new)
  schema-hints.js              (new)
tools/block-wizard/
  block-wizard.html            (new)
  block-wizard.js              (new)
models/
  _section.json                (new — adds new blocks to section allowlist)
component-definition.json      (new — manually aggregated)
component-models.json          (new — manually aggregated)
component-filters.json         (new — manually aggregated, filters empty)
docs/superpowers/specs/
  2026-07-27-eds-blocks-design.md  (this file)
```

---

## Open Questions / Constraints

- ECharts-GL (`echarts-gl`) requires WebGL. Fallback: if WebGL unavailable, 3D variants silently downgrade to their 2D equivalent with a console warning.
- SheetJS (community edition `xlsx`) is Apache 2.0 licensed — compatible with this project.
- DA `postMessage` API for sidekick write-back: exact message schema to be confirmed against DA Live docs during implementation.
- `component-definition.json` / `component-models.json` format: confirm against current AEM Universal Editor spec during implementation (format has iterated recently).
