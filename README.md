# Protein Index — India

A static comparison website for 504 protein product/flavour listings across 18 brands, with 799 exact 1 kg, 2 kg and 4 kg pack offers. Research snapshot: **25 October 2026**. Prices and stock are not live.

## Features

- Search and multi-select filters for brand, product, protein source, subclass, flavour, pack size and stock.
- Minimum/maximum filters for pack price, cost per gram of actual protein, protein percentage, scoop size and calories per 100 g.
- Nutrition completeness filter, sorting, pagination, shareable filter URLs, filtered CSV and full JSON download.
- Official source links and evidence notes per offer, including uncertainty and label conflicts.
- Responsive layout, accessible labelled controls, keyboard navigation and no external runtime dependencies.

## Run

Serve `docs/` with any static HTTP server, for example `python -m http.server 8080 --directory docs`. Open http://localhost:8080. Run `npm test` with Node 22+.

## Data and updates

The website reads `docs/data/catalog.json`. One record represents one actual pack offer. Unknown values are `null`, not zero. Cost = price / (pack kg × 10 × protein g per 100 g). Filtered results apply all conditions to the same pack, avoiding cross-size nutrition mismatches.

The research files remain local and are excluded from Git. To regenerate after updating them, run `python scripts/export_catalog.py`; verify the output and run tests before committing. Updating Excel alone does not refresh the website automatically. The exporter uses the matched research JSON.

## Hosting

GitHub Pages serves the `docs/` folder of `main`. Relative asset paths support repository subpaths. No backend, credentials, analytics, affiliate links or API keys are required.

Selected brands are not a formal top-10 ranking. Sold-out offers are retained; family-level protein claims and missing/conflicting label evidence are disclosed. No prices are extrapolated from other sizes. Product names and nutrition claims belong to their respective brands.
