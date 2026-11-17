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
process/symphonym/     Bundled BiLSTM phonetic embedding model (Symphonym v7 checkpoint, 128-dim)
process/commodity_parser/  Glossary-derived span parser used by annotate.py
docs/                  GitHub Pages site: HTML editors, JS, CSS, visualisations
docs/api/              JSON-LD entity files (generated at deploy time, never committed except context.json)
docs/data/             Pipeline outputs and curated datasets (JSON, TSV, Parquet, joblib)
docs/data/ladings/     Per-volume ladings with annotations (tracked .json.gz; the .json intermediates are untracked)
docs/data/records/     Per-volume cargo records (tracked .json.gz sidecars, fetched on demand)
docs/data/discarded/   Paragraphs that are not cargos, per volume
docs/symphonym/        Symphonym v8 ONNX model, as loaded by the browser (and by the name pipeline)
docs/js/               JavaScript for browser editors and visualisations
data/                  Source inputs: Word files, Book of Rates, customs officials spreadsheets
data/forename_seeds.json   Manual forename seed data supplementing DMNES
.github/workflows/     deploy-pages.yml: incremental JSON-LD generation + GitHub Pages deployment
documentation/         Sphinx source for this documentation site
tools/                 Audits and test harnesses (e.g. tools/ladings/audit_losses.py, tools/pages/shot.py)
```

## Glossary entries

The commodity glossary is `docs/data/glossary_data.json`. Its `entries` object is keyed by
concept key (singular, lower case: `wine`, `cloth`); each entry has these fields (field
frequencies are from the file on 17 November 2026, which holds 2,474 entries):

| Field | Type | Description |
|---|---|---|
| `f` | `[{t, s, w, p?}]` | Forms: `t`=text, `s`=source ids, `w`=1 for a headword, `p`=phonetic (present on a minority) |
| `d` | `string` | Description |
| `groups` | `[string]` | Subject groupings derived from the AAT ancestry (see [Commodity Groupings](commodity-groupings.md)). These replaced the legacy `c` categories, which no entry carries now |
| `aat` | `[{id, label, source?, broader?, match?, uncertain?, suggested?, note?}]` | Commodity-type identifiers: Getty AAT ids, or Wikidata Q-ids with `source: 'wikidata'`. `match: 'close'` and `broader: true` mark inexact matches; `suggested: true` is an unconfirmed machine proposal |
| `materials` | `[{id, label}]` | AAT material concepts |
| `geo` | `{id, label, dataset}` | Entry-level geographic provenance (World Historical Gazetteer) |
| `q` | `[{ref} \| {tokens} \| {raw}]` | Qualifiers: a reference to a canonical in `qualifiers.json` (`{ref}`), an ordered compound of canonicals and literals (`{tokens}`), or a not-yet-lemmatised survivor (`{raw}`). Each may carry a description `d` |
| `compoundOf` | `[string]` | Keys of the entries that compose a compound term (`hector:compoundOf`) |
| `related` | `[string]` | Keys of related entries (`skos:related`; reciprocal links are maintained) |
| `relatedConcepts` | `[{id, label, source?, note?}]` | Concepts in an external vocabulary the commodity is related to but is not a kind of (for example the animal a food comes from). Kept out of `aat` so that the groupings are not derived from them |
| `x` | `[string]` | Cross-reference keys |
| `reviewed`, `helpWanted`, `sinceLeftovers` | `boolean` | Curation flags (`reviewed` and `helpWanted` are mutually exclusive) |
| `memo` | `string` | Free-text internal note |

The shared qualifier vocabulary is `docs/data/qualifiers.json`: one canonical per qualifier
lemma, with its label, attested `forms`, `gloss` and, where appropriate, an `aat` concept or a
`geo` identifier. See [Rationalising the Qualifiers](qualifier-rationalisation.md).

## Cargo records

Every cargo has a record in `docs/data/records/<volume>.json.gz` (built by
`process/cargo_records.py`): one **row** per commodity, giving its span in the cargo text, the
concept (key, label, AAT and materials, groupings), the quantity and measure, and the qualifiers,
plus the merchant / master / ship **frame** (with `pid`s). Concepts and identifiers are inherited
from `glossary_data.json` when the records are built, so re-run `cargo_records --write` after any
glossary change.

## Person identifiers

Every forename, surname and master annotation in a lading carries a `pid`, the id of a person
group; see [Name Matching](name-matching.md#person-ids-on-ladings-pid).

## Browser editors

| File | Purpose | JS |
|---|---|---|
| `glossary-concepts.html` | **Live** concept, qualifier and leftover review ([documented here](concept-review-tool.md)) | `js/glossary-concepts.js`, `js/aat-picker.js`, `js/aat-db.js` |
| `glossary-editor.html` | **Retired**: a static notice page; the v1 editor ([history](glossary-editor.md)) cannot write. `js/glossary-editor.js` is dead code | — |
| `commodity-review.html` | Review queue for near-miss spellings | `js/commodity-review.js` |
| `concept-annotator.html`, `pos-annotator.html`, `pos-review.html` | Annotation and review tools for the cargo parser | `js/concept-annotator.js`, `js/pos-annotator.js`, `js/pos-review.js` |
| `bor-curation.html` | Books of Rates: goods and qualifiers | `js/bor-curation.js` |
| `place-points.html` | Draw the project's own coordinates for gazetteer rows whose position currently comes from a share-alike source | `js/place-points.js` |
| `officials-editor.html` | Customs officials dataset (public view: `officials.html`) | `js/officials-editor.js`, `js/officials.js` |
| `forename-reconciliation.html` | Forename group merge/split | `forename-reconciliation.js` (in `docs/`) |
| `surname-reconciliation.html` | Surname alias review | `surname-reconciliation.js` (in `docs/`) |
| `person-reconciliation.html` | Full person-identity matching | `person-reconciliation.js` (in `docs/`) |
| `surname-aliases-editor.html` | Manual surname alias management | (inline) |
| `name-clusters.html` | D3 network visualisation of name clusters | `js/name-clusters.js` |
| `glossary.html` | Public glossary with Chart.js visualisations | `js/glossary-public.js`, `js/glossary-visuals.js` |
| `entity.html` | PID-based entity viewer (ladings, commodities, groupings) | (inline) |
| `customs-accounts.html` | Particular Customs Accounts explorer | `js/customs-accounts.js` |

## External dependencies

LibreOffice + Pandoc (`doc → html`), pdfplumber, epitran + panphon,
faiss-cpu, PyTorch (separate install), BeautifulSoup, scikit-learn + joblib,
Chart.js, D3.js, Cytoscape.js, MapLibre GL JS.

CDN dependencies have been replaced with local bundles in `docs/js/libs/`
and `docs/css/libs/`.
