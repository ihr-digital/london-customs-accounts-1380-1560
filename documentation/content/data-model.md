# Data Model

## Interchange formats

- **JSON** is the primary interchange format between Python and the browser.
- Pipeline outputs go to `docs/data/`; browser editors read and write the
  same files via the GitHub API.
- **Parquet** is used only for embedding caches.
- **IndexedDB** (via Dexie) is used for browser-editor persistence.

## Repository layout

```
process/               Python pipeline scripts (run individually via python -m process.<script>)
process/helpers/       Shared utilities: phonetic.py, commodities.py, utils.py, encoding.py
process/symphonym/     Bundled BiLSTM phonetic embedding model (Symphonym v7, 128-dim)
docs/                  GitHub Pages site: HTML editors, JS, CSS, visualisations
docs/api/              JSON-LD entity files (generated at deploy time, never committed except context.json)
docs/data/             Pipeline outputs and curated datasets (JSON, TSV, Parquet, joblib)
docs/js/               JavaScript for browser editors and visualisations
data/                  Source inputs: Word files, Book of Rates, customs officials spreadsheets
data/forename_seeds.json   Manual forename seed data supplementing DMNES
.github/workflows/     deploy-pages.yml: incremental JSON-LD generation + GitHub Pages deployment
documentation/         Sphinx source for this documentation site
```

## Browser editors

| File | Purpose | JS |
|---|---|---|
| `glossary-editor.html` | Commodity glossary curation (main daily-use tool) | `js/glossary-editor.js`, `js/aat-picker.js`, `js/aat-db.js` |
| `officials-editor.html` | Customs officials dataset | `js/officials-editor.js` |
| `forename-reconciliation.html` | Forename group merge/split | `forename-reconciliation.js` |
| `surname-reconciliation.html` | Surname alias review | `surname-reconciliation.js` |
| `person-reconciliation.html` | Full person-identity matching | `person-reconciliation.js` |
| `surname-aliases-editor.html` | Manual surname alias management | (inline) |
| `name-clusters.html` | D3 network visualisation of name clusters | `js/name-clusters.js` |
| `glossary.html` | Public glossary with Chart.js visualisations | `js/glossary-public.js`, `js/glossary-visuals.js` |
| `entity.html` | PID-based entity viewer (ladings, commodities, categories) | (inline) |
| `customs-accounts.html` | Particular Customs Accounts explorer | `js/customs-accounts.js` |

## External dependencies

LibreOffice + Pandoc (`doc → html`), pdfplumber, epitran + panphon,
faiss-cpu, PyTorch (separate install), BeautifulSoup, scikit-learn + joblib,
Chart.js, D3.js, Cytoscape.js, MapLibre GL JS.

CDN dependencies have been replaced with local bundles in `docs/js/libs/`
and `docs/css/libs/`.
