# Supplement Research — India

[Website](https://vijayptiwari.github.io/supplement-research/) · [GitHub project](https://github.com/vijayptiwari/supplement-research)

Protein and creatine research from dated public product listings, labels and archived prices. The website is a static app powered by one validated dataset revision. Counts, filter choices, ranges, rankings, costs, evidence coverage, trend colours, dates, examples, metadata and downloads are derived from that revision. No quarterly UI edits are needed.

## Quarterly update workflow

1. Update `docs/data/catalog.json` and/or `docs/data/creatine.json`. Retain stable offer IDs for the same exact brand, product, flavour, weight and packaging; assign new IDs to different variants. Set each category's `checked` date to the research date in `YYYY-MM-DD` format.
2. Add dated exact-variant prices to `docs/data/price-observations.json`. Retain old observations, exclusions and reasons. Price evidence must match the offer ID, category and official product URL. Do not extrapolate prices to unavailable sizes or flavours.
3. Record missing nutrition as `null`, with source URLs, basis and uncertainty in the offer notes. Update price, weight, concentration, energy and scoop inputs only after checking the exact variant. Energy uses **kcal per 100 g**, not kJ or kcal per serving. Creatine concentration uses the **labelled compound**, not a presumed free-creatine equivalent.
4. Run `npm test` and `npm run build`. Review `dist/data/quality-report.json` and the local site with `npm start`. Fix validation errors; inspect warnings and conflicts. Build errors prevent publication, while explicit unknowns remain visible.
5. Commit and push the dataset changes to `main`. GitHub Actions validates, builds and deploys `dist/` to GitHub Pages. UI code and generated statistics do not need to be edited.

After a successful deployment, an open visible page checks for a new revision every minute, on returning to the tab, and through **Refresh data**. It downloads a new snapshot only when its version changes. Filters, layout, sorting and an open evidence dialog are retained. A failed or corrupt update keeps the last validated revision with an error status. This refreshes the **published research dataset**; it does not check merchant prices live. The status bar distinguishes dataset dates from the browser's last update check.

## Source files and calculations

- `docs/data/site.json`: category definitions, comparison quantities, ranking limit, freshness policy, quick-pick rules and polling interval.
- `docs/data/catalog.json`: protein inputs; pack weight in `kg`, labelled `protein` percentage.
- `docs/data/creatine.json`: creatine inputs; net pack weight in `grams`, labelled `creatine` compound percentage.
- `docs/data/price-observations.json`: append-only dated evidence ledger (except correcting an explicitly documented mistake).
- `docs/data/brands.json`: optional official brand directory. Catalog counts and available brands come from offers, so adding a new brand does not require a UI change.
- `docs/model.js`: shared normalization, validation and calculations used by the browser, build and tests.

Compound cost = price / (net pack grams × labelled percentage / 100). Powder cost = price / net pack grams. Comparison-portion cost = compound cost × the configured reference grams. The portion is not the manufacturer's scoop or intake advice. Protein per scoop uses the recorded scoop weight and concentration. Missing energy stays unknown, including on the homepage; a recorded zero remains zero.

Rankings use **grams of labelled compound per ₹100**, with the best eligible pack per brand and product. Eligibility requires known concentration, confirmed in-stock status and a matching recent dated price. This is a cost comparison, not an assessment of efficacy or independent laboratory quality. Different creatine chemical forms are not assumed equivalent. Shared label profiles and conflicts are disclosed, not silently resolved. Stored legacy `cost`, `doseCost`, `score` and `trend` values are ignored and recalculated.

## Twelve-quarter price history

The audit uses the **12 completed calendar quarters** before each category research date, plus a separately labelled current observation. The window rolls automatically with the dataset date; `historyQuarters` in `site.json` controls its length. Every offer retains a slot for every requested quarter, including explicit unknowns.

Each completed-quarter price is the latest verified, exact-variant dated snapshot available in that quarter. Quarter-on-quarter percentages require two adjacent verified snapshots; gaps are never interpolated or carried forward. A current-versus-oldest endpoint comparison is labelled separately and does not imply complete intervening evidence. A full-window change is recorded only when all requested historical quarters are verified. Current price evidence must also belong to the research date's current calendar quarter.

The website shows coverage per category and quarter, per-offer timelines and charts with visible gaps, historical-coverage filters, and source evidence. `dist/data/price-history.csv` and `price-history.json` contain one row per exact offer and quarter, plus current observations. The existing `price-audit.csv` remains the latest-quarter change summary. Missing prices remain null in JSON and empty in CSV, never zero.

To collect public archival evidence for the full window:

```sh
python scripts/research_price_history.py --quarters 12 --alternatives 2 --structured --workers 4
npm test
npm run build
```

The collector searches HTML captures and optional archived product JSON/JS feeds through the [Internet Archive CDX API](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server), follows index pagination, checks capture timestamps, and accepts prices only when an exact variant or SKU can be matched. Local response caches support repeatable review and retries. Use `--cached-only --alternatives 2` for an offline re-audit, or `--skip-known-failures` when trying additional capture dates without repeating already failed requests. Previous manual exclusions are retained. `docs/data/history-research.json` records attempted public sources, archive retrieval failures and quotes collected per quarter; a failed lookup or absent archive is not proof of a product launch date. Review the research log and exclusions before publishing. Incomplete index queries are explicitly flagged, and incomplete historical coverage is shown on the site.

## Price evidence and trends

Each observation includes `category`, `offerId`, ISO `date`, numeric `price`, `currency: INR`, exact official `sourceUrl`, public `evidenceUrl`, and `kind` (`official-live` or `official-archive`). Preserve `variantId` and `matchBasis` where available. Historical evidence accepted for comparison has `kind: official-archive` and `qualityStatus: verified`; excluded quotes retain `qualityStatus: excluded` and `exclusionReason`. A former live observation is not automatically promoted to publicly verified historical evidence.

The latest official-live observation must match the catalog price and fall within the configured age window relative to the category research date. Missing, conflicting or stale observations cannot verify a price. The previous completed calendar quarter is calculated from each research date, including year rollover. The latest eligible verified observation in that quarter is the baseline. Every displayed change has two dated sources; missing history is never interpolated or treated as unchanged. These are listed-price snapshots, **not quarterly averages**.

Green = decrease, red = increase, blue = verified unchanged, grey = no verified comparison. Group summaries disclose mixed directions and partial coverage. Unverified current catalog prices have an amber marker and are excluded from rankings. Unknown concentration is excluded from compound-cost comparisons. The freshness threshold is a research policy, not a promise that prices remain valid for that duration.

Prior synthetic history generators remain disabled. Existing research scripts can help collect inputs, but their output must be checked for exact weight/flavour/SKU matches. Never substitute MRP discounts, another variant or a current page for dated historical evidence.

## Build, exports and hosting

Use Node 22+ and Python 3 for the preview server:

```sh
npm test
npm run build
npm start
```

Open http://localhost:8080. Serve **`dist/`**, not `docs/` directly: the build creates the version manifest and validated snapshot. No application dependencies, backend or API keys are required.

The build produces normalized catalog JSON, price-audit JSON/CSV, a field-level quality report and dataset-driven SEO/JSON-LD. It publishes one content-addressed `snapshot.<sha256>.json` and a small `version.json` pointer. The browser verifies the hash, validates the whole revision and swaps it atomically, avoiding mixed category versions. Generated exports support offline auditing; the website has no export controls. JSON download files belong to the latest deployed build. Original dated Excel workbooks remain archival files and are not presented as current downloads; editing a workbook alone does not update the website.

`.github/workflows/check.yml` runs tests and the build before deploying the Pages artifact. GitHub Pages must use **GitHub Actions** as its build source. A rejected update leaves the last successful deployment available. Generated `dist/` is ignored by Git; edit source inputs rather than generated bundles. Relative paths support the repository subpath.

## Data quality priorities

The coverage panel and quality report identify missing concentration, energy and scoop values, price evidence gaps and nutrition notes requiring review. Complete those fields from exact-variant labels first, archive dated merchant evidence for future comparisons, and keep source/research dates explicit. Recorded manufacturer claims are not independent lab verification. Sold-out offers and uncertain stock remain searchable but do not enter rankings. No pack price is inferred from another size.
Deployment follows the [GitHub Pages custom workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).


## Count-based supplement categories

Ashwagandha, Fish Oil, Vitamin D, Magnesium and ZMC use counted packs, not inferred kilogram prices. `docs/data/additional-sources.json` records curated official product handles, label sources, serving basis and separate label-check dates. Raw category files and the observation ledger supply all displayed prices, counts, nutrient amounts, filters and calculations.

Refresh official prices with `python scripts/build_additional_catalog.py --as-of YYYY-MM-DD --refresh`, review changes and exact pack counts, then run tests and build. Review labels separately before changing their check dates. This is a quarterly research update workflow, not a live merchant checkout-price feed; deployed dataset revisions refresh automatically in the browser.

Amounts refer to the stated label serving. Fish oil comparisons use verified EPA+DHA rather than total oil; Vitamin D converts 1 microgram to 40 IU; mineral comparisons use explicitly elemental amounts, with compound masses stored separately. Ashwagandha material and extract classes remain distinct, and withanolides require a verified standardized extract amount. ZMC requires all three named minerals and compares serving costs without combining mineral masses into an efficacy score. Reference quantities are comparison units, not intake recommendations.

Unknown serving sizes, conflicting labels and uncertain elemental amounts remain null. Historical slots for new categories remain unverified until exact-variant dated public evidence is found. No past prices are generated from current prices. Every offer exposes official price and label sources in its evidence dialog.


## Articles and research

`docs/data/research.json` contains the category guides, editorial review dates, selected reference metadata, summaries and limitations. It is bundled into the same content-addressed dataset as the catalogs, so editing the data and publishing a validated build updates the reading library without editing UI components. `research.html` supports category, topic and reference-type filters, with shareable query parameters. Catalog pages link directly to the relevant guide collection.

This is curated educational coverage, not a systematic review or a brand endorsement. Preserve population, formulation, outcome and safety context. Check original sources and disclosures, update review dates only after review, and distinguish publication years from the date a reference was checked. Dataset validation rejects unsafe source URLs, duplicate IDs and unresolved citations. Avoid extrapolating component evidence to ZMC combinations or one extract to all Ashwagandha products.
