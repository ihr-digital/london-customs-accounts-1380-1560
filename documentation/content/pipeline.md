# Pipeline

The Python pipeline lives under `process/`. Each step is a module run with
`python -m process.<script>`. Most read from `data/` (source inputs) and write
to `docs/data/` (browser-readable artefacts).

## Run order

```bash
python -m process.update_inventory
python -m process.pdf
python -m process.ladings
python -m process.build_index
python -m process.bor_phonetic_glossary
python -m process.annotate
# Name-matching:
python -m process.cluster_forenames
python -m process.build_forename_reconciliation_dataset
python -m process.build_surname_graph
python -m process.train_surname_scorer
python -m process.train_pair_scorer
# Person IDs on ladings (stamps pids onto the browser-read .json.gz):
python -m process.augment_missing_merchants   # optional: recover merchants absent from the dataset
python -m process.build_name_index            # name_index.json.gz + name_lading_index.json.gz,
                                              # then (automatically) build_person_files ->
                                              # persons.json.gz + person_neighbours/NNN.json.gz
python -m process.attach_person_ids           # re-stamp pids onto docs/data/ladings/*.json.gz
# Cargo records (re-run after ANY glossary change: concepts and identifiers are
# inherited from glossary_data.json at build time, not stored in the ladings):
python -m process.cargo_records --write       # -> docs/data/records/<volume>.json.gz
# Search (re-run after ANY glossary, qualifier, lading, gazetteer or person change):
python3 -m process.build_search               # vocab -> encoder -> name vectors, + parity check
python3 -m process.build_search --check       # exit 1 if anything is stale
```

Notes on the order:

- `update_inventory`, `pdf` and `ladings` read the Word and PDF transcriptions under
  `data/input/`. **IV-26** (the butler's accounts of the New Customs on alien wine,
  1378–1487) has no Word file: it is built from Jenks's PDF by
  `python3 -m process.wine_accounts` (`--check` parses and reports without writing), and
  is then annotated on its own with `python -m process.annotate --only IV-26`.
- `python -m process.annotate` accepts `--only REF [REF ...]` to annotate just those volumes
  and leave the rest untouched, and `-test` for a test run.
- The search steps use the system `python3`, because they need `onnxruntime` and `anyascii`.
- `python -m process.cargo_records` also accepts `--dry-run`, `--only REF ...` and
  `--predictions DIR` (the cargo-structure model's segmentation instead of the published
  spans).
- The name-matching steps embed names with the Symphonym v8 model through
  `process/symphonym_v8.py` (see [Name Matching](name-matching.md#phonetic-stack)).

## Key scripts

| Script | Purpose |
|---|---|
| `process/ladings.py` | Parses HTML transcriptions into per-volume JSON |
| `process/build_index.py` | Extracts surnames, places, ships → `index.json` + TSV |
| `process/wine_accounts.py` | Builds the IV-26 wine-accounts ladings from Jenks's PDF (no Word source exists) |
| `process/annotate.py` | Annotates ladings with name, commodity, and unit matches |
| `process/pos.py` | Part-of-speech tagging for Latin/Middle English cargo text |
| `process/bor_phonetic_glossary.py` | Builds `glossary_data.json` from Book of Rates + subject indices |
| `process/glossary_parser.py` | Parses BOR typographical conventions into structured entries |
| `process/cluster_forenames.py` | Seed-based forename clustering using DMNES + Symphonym |
| `process/build_surname_graph.py` | FAISS ANN + Jaro–Winkler filtering → `surname_graph.json` |
| `process/train_surname_scorer.py` | Logistic-regression surname scorer → `.joblib` + `.meta.json` |
| `process/train_forename_scorer.py` | Logistic-regression forename scorer |
| `process/train_pair_scorer.py` | Person-level pair scorer |
| `process/pair_features.py` | Multi-signal similarity feature computation |
| `process/attach_person_ids.py` | Stamps person `pid`s onto the ladings `.json.gz` (with a name-verifying resolution guard) |
| `process/build_name_index.py` | Reconciliation dataset → `name_index.json.gz` + `name_lading_index.json.gz` |
| `process/augment_missing_merchants.py` | Additively recovers merchants absent from the reconciliation dataset; preserves existing pids |
| `process/build_person_files.py` | Splits the person index for the browser: `persons.json.gz` and `person_neighbours/NNN.json.gz` (run automatically by `build_name_index`) |
| `process/restamp_person_ids.py` | Re-stamps pids onto the *committed* `.json.gz` (use this rather than `attach_person_ids` when only pids should change) |
| `process/cargo_records.py` | The cargo record for every cargo (a row per commodity with quantity, measure, qualifiers and concept) → `docs/data/records/<volume>.json.gz` |
| `process/cargo_structure.py`, `process/cargo_structure_apply.py` | The cargo structure model (a CRF over the rules' and taggers' readings) and its application to the corpus |
| `process/build_search.py` | Rebuilds everything the site's search reads (`build_search_vocab`, `build_search_encoder`, `build_name_phonetic`); `--check` reports staleness |
| `process/recover_lost_cargos.py`, `process/discard_noncargos.py`, `process/reannotate_recovered.py` | One-off, re-runnable corrections applied to the committed ladings (restoring cargos the old parser lost; moving non-cargos to `discarded/`) |
| `process/generate_jsonld.py` | Produces per-entity JSON-LD for the Linked Data API |
| `process/publish_ihr.py` | Snapshots the public site into the IHR publication repository |
| `process/statistics.py` | `CustomsStatisticsAnalyzer` for merchant/master/cargo stats |
| `process/extract_customs_officials.py` | Extracts customs officials from spreadsheet sources |

Shared utilities sit in `process/helpers/` (`phonetic.py`, `commodities.py`,
`utils.py`, `encoding.py`) and `process/symphonym/` (the bundled BiLSTM
phonetic embedding model).

## Commodity tagging & disambiguation

`annotate.py` tags each cargo with a glossary-derived **span parser**
(`process/commodity_parser/`): commodities, units, and nested qualifiers, with a
DP selector that prefers longer multi-word anchors. Several deliberate decisions
govern how an ambiguous surface form is resolved to a *sense*:

- **The Index of Subjects disambiguates, not frequency.** Where a surface form
  maps to more than one concept (e.g. *caddis* → cotton vs worsted, *cage* →
  object vs measure), the printed per-volume **Index of Subjects** — which is
  page-aligned 1:1 with the records — chooses the sense the index attests on that
  page. `index_disambig.parse_index` resolves an index entry that maps to several
  concepts by matching its **gloss** against each candidate's description and AAT
  labels (not headword presence, which can't separate same-form senses); it skips
  on a tie rather than guess. The map is built into
  `docs/data/index_page_concepts.json` by `python -m process.commodity_parser.index_prior`
  and covers **46 of the 47 volumes** (the discovery handles underscore-named files
  and II-9's Latin *index rerum*; IV-26, the wine accounts, is not in it). Rebuild it
  after glossary/AAT edits.
- **The index prior is strong but subordinate to qualifier evidence.**
  `w_index_prior` (0.6, in `scoring.py`) sits *above* the corpus-frequency
  tie-breaker but *below* `w_qual_attest`, so an attested qualifier still fixes
  the head — *panni largi/curtis sine grano* stays cloth even on a page the index
  also lists narrow or pan for. Making the prior decisive was tried and rejected:
  it bulldozed cloth. The accuracy gain is in correct index *resolution*, not in
  overriding everything. Corpus frequency only decides when the index is silent
  **and** context is empty.
- **Text and annotation offsets must stay aligned.** `pos.py`'s
  `get_processed_text` collapses dot-runs to an ellipsis and strips brackets; it
  must persist that cleaned text to `cargo["text"]` whenever *either* transform
  changes it. A prior version only did so for bracket changes, so illegibility-
  redacted cargos kept the longer original text while offsets referenced the
  shorter line — shifting every span left and masking valid tokens.
- **Assize cloths are distinct concepts matched by multiword form.**
  `narrowcloth`/`broadcloth`/`shortcloth`/`longcloth` are matched only via their
  Latin/English phrases (*panni stricti/largi/curti/longi*, *short clothes* …);
  bare *panni* → the generic `cloth`. Width and length are **not** bare-lemma
  qualifiers — a single conflated `narrow` concept that held the bare lemma plus
  width/length qualifiers was a dumping ground (it produced incoherent
  *narrow→broad* taggings) and was split.

## Things to watch

- `ladings.py` warnings about duplicate lading IDs or discarded items — investigate before continuing.
- `docs/data/discarded/` holds paragraphs that are **not cargos** (statements of account,
  editorial notes, fragments). Its size is **not** a measure of loss: cargos the parser lost
  silently never reached it (about 3,760 of them, restored on 30 September 2026). Measure loss
  with `python3 tools/ladings/audit_losses.py`.
- To correct pids or labels without drifting the corpus, work from the committed
  `docs/data/ladings/*.json.gz` (the source of truth) rather than re-running `ladings` or
  `annotate`. `gzip` embeds a timestamp, so commit a `.gz` only if its *decompressed* content
  changed.
- JSON-LD files in `docs/api/` are generated at deploy time and never committed (except `context.json`).
- The GitHub Actions workflow uses `git diff` for incremental builds — cache invalidation matters.

## Import convention

Imports differ by script age. Older scripts (`ladings.py`, `voyages.py`) use
bare `import config`; newer scripts use `from process import config`. Match
the convention of the file being edited.
