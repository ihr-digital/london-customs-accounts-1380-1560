# Linked Data API

The project publishes per-entity JSON-LD documents under the namespace
<https://w3id.org/mlca/>. The files are generated at deploy time by
`process/generate_jsonld.py` and served from `docs/api/`. (w3id.org redirects to the
files on GitHub Pages, which are named `.json` rather than `.jsonld` so that Pages
serves them as `application/json`.)

## Namespaces

Defined in `docs/api/context.json`:

| Prefix | Expansion |
|---|---|
| `mlca` | <https://w3id.org/mlca/ontology#> |
| `hector` | <https://w3id.org/hector/ontology#> |
| `skos` | <http://www.w3.org/2004/02/skos/core#> |
| `schema` | <https://schema.org/> |
| `dcterms` | <http://purl.org/dc/terms/> |
| `rdfs` | <http://www.w3.org/2000/01/rdf-schema#> |
| `xsd` | <http://www.w3.org/2001/XMLSchema#> |

## What's emitted

`generate_jsonld.py` produces:

- One document per lading under `docs/api/{lading_id}.json`, with its cargos as nodes
  inside it
- Per-glossary-entry documents under `docs/api/glossary/{term}.json`
- A single `context.json` (the only JSON-LD file that is committed)

Glossary entries carry:

- Commodity-type identifiers (AAT or Wikidata) as SKOS mapping relations:
  `skos:exactMatch`, `skos:closeMatch` (`match: "close"`) and `skos:broadMatch`
  (`broader: true`). Entries that HECTOR has already minted also get an
  `exactMatch` to their HECTOR record. Identifiers marked `uncertain` or
  `suggested` are **withheld**: JSON-LD cannot say "probably" without reifying
  the statement, and a machine's unconfirmed proposal should not be published
  as an assertion. A run logs how many it withheld.
- Subject groupings under `groups` (`mlca:grouping`)
- Materials as AAT URIs under `schema:material`
- Geographic provenance under `provenance` with identifier and label
- `compoundOf` as glossary URIs under `hector:compoundOf`
- `related` as glossary URIs under `skos:related`; concepts from `relatedConcepts`
  (related but not a kind of the commodity) are published in the same
  `skos:related` set
- Qualifier semantic types and specific AAT concepts as AAT URIs

To run it locally: `python -m process.generate_jsonld` (everything), `--ladings`,
`--glossary`, `--volume STEM` (repeatable; implies `--ladings`) or `--dry-run`.

## Build behaviour

The `.github/workflows/deploy-pages.yml` workflow runs `generate_jsonld.py`
incrementally:

- Caches `docs/api/` between runs so unchanged entities are not regenerated.
- Detects which source files changed and regenerates only the affected
  subset (per-volume ladings, glossary, or neither).
- Falls back to full regeneration when `generate_jsonld.py` itself changes,
  or on manual dispatch / first run (no cache).

JSON-LD files in `docs/api/` are generated at deploy time and never
committed (except `context.json`).

## Related projects

- **HECTOR** — Historical Economic Commodities: Terminologies, Ontologies,
  and Rates. A separate repository, hosted at
  <https://w3id.org/hector/>. A Linked Data commodity/unit taxonomy aligned
  with LinkedArt and CIDOC-CRM; currently proof-of-concept stage.
- **DTGC** — Dictionary of Traded Goods and Commodities (N. Cox & K.
  Dannehl). Digitised version accessed via authenticated GitHub API for
  cross-referencing commodity identifications.
