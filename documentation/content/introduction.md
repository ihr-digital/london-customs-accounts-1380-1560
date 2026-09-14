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
| Ladings | 33,548 across 46 account-book files (Volumes I–V) |
| Discarded cargo items | 5,020 (potential data loss; see `docs/data/discarded/`) |
| Glossary headwords | 3,333 (7,387 including variant forms) across 22 categories |
| Unique forename forms | 5,632 → 1,283 curated groups |
| Unique surname forms | 37,693 with 245,712 scored neighbour edges |
| Person records | 79,205 |

## Using the site

- **[The Table](using-the-table.md)** — the edition itself, and the filters. The filters govern the Chart and the Map too, so start here.
- **[The Chart](using-the-chart.md)** — the filtered ladings against the enrolled customs totals.
- **[The Map](using-the-map.md)** — the corpus gazetteer, and how to make the map follow the Table's filters.
- **[The More menu](more-resources.md)** — glossary, customs officials, name clusters, and the surviving account books.

## What's in the rest of this documentation

- **[Pipeline](pipeline.md)** — the Python scripts that turn Word documents into JSON, in run order.
- **[Glossary Editor](glossary-editor.md)** — the primary daily-use curation tool for the commodity glossary.
- **[Name Matching](name-matching.md)** — how forenames, surnames, and persons are clustered and reconciled.
- **[Data Model](data-model.md)** — entry fields, qualifier structure, external identifier conventions.
- **[Linked Data API](linked-data.md)** — JSON-LD output, namespaces, and per-entity endpoints.
