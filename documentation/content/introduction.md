# Introduction

The **London Customs Accounts** project is a digital humanities edition of
transcribed customs accounts (1380–1560) edited by Stuart Jenks. It converts
Word-document transcriptions of Latin and Middle English trade records into
structured JSON, then layers on name-matching and commodity-annotation
pipelines. A GitHub Pages site provides browser-based editors and
visualisations.

- **Main site:** <https://ihr-digital.github.io/london-customs-accounts-1380-1560/>
- **Linked Data namespace:** <https://w3id.org/mlca/>
- **Repository:** <https://github.com/docuracy/London_Customs_Accounts>

## Current data scale

| Resource | Count |
|---|---|
| Ladings | 34,702 across 47 account-book files (references I-4 to IV-26), including IV-26, the butler's accounts of the New Customs on alien wine, 1378–1487 |
| Set aside, not parsed | 8,871 paragraphs that are not cargo records (statements of account, editorial notes, fragments) |
| Glossary concepts | 2,474, attested by 19,938 spellings, in 35 subject groupings (see [Commodity Groupings](commodity-groupings.md)) |
| Distinct forename spellings | 5,702 in the annotated cargos |
| Distinct surname spellings | 37,191 in the annotated cargos |
| Cargos | 216,794, carrying about 320,500 commodity rows |
| Person groups | 121,101 (exact name within a temporal window, plus the merchants of the 16th-century "in navi" cargos) |

Measured from the committed data files on 17 November 2026: the lading files (`docs/data/ladings/`), the discarded paragraphs (`docs/data/discarded/`), the glossary (`docs/data/glossary_data.json`), the cargo records (`docs/data/records/`) and the person index (`docs/data/persons.json.gz`). The cargo and lading counts include about 3,800 cargos the transcription parser had silently dropped and that were restored on 30 September 2026. The figures change as the edition is corrected.

## Using the site

- **[Getting Started](getting-started.md)** — for researchers: finding a commodity, a merchant, goods from a place, a period.

- **[The Table](using-the-table.md)** — the edition itself, and the filters. The filters govern the Chart and the Map too, so start here.
- **[The Chart](using-the-chart.md)** — the filtered ladings against the enrolled customs totals.
- **[The Map](using-the-map.md)** — the corpus gazetteer, and how to make the map follow the Table's filters.
- **[The More menu](more-resources.md)** — glossary, customs officials, name clusters, and the surviving account books.

## What's in the rest of this documentation

- **[Pipeline](pipeline.md)** — the Python scripts that turn Word documents (and, for IV-26, a PDF) into JSON, in run order.
- **[Concept, Qualifier & Leftover Review](concept-review-tool.md)** — the live curation tool for the commodity glossary. (The older [Glossary Editor](glossary-editor.md) is retired; its page is kept for reference.)
- **[Commodity Groupings](commodity-groupings.md)** and **[Rationalising the Qualifiers](qualifier-rationalisation.md)** — how concepts are grouped and how qualifiers are being controlled; **[Why Glossary Curation Is Slow](glossary-curation-complexity.md)** explains the effort involved.
- **[Name Matching](name-matching.md)** — how forenames, surnames, and persons are clustered and reconciled.
- **[The Editorial Indices](editorial-index-rebuild.md)** — how the editors' printed indices were turned into the place and ship gazetteer.
- **[Data Model](data-model.md)** — repository layout, glossary entry fields, qualifier structure, cargo records, external identifier conventions.
- **[Linked Data API](linked-data.md)** — JSON-LD output, namespaces, and per-entity endpoints.
- **[Editing these pages](contributing.md)** — for project staff.
