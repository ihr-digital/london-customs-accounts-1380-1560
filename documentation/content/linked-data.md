# Linked Data API

The project publishes per-entity JSON-LD documents under the namespace
<https://w3id.org/mlca/>. The files are generated at deploy time by
`process/generate_jsonld.py` and served from `docs/api/`.

## Namespaces

Defined in `docs/api/context.json`:

| Prefix | Expansion |
|---|---|
| `mlca` | <https://w3id.org/mlca/> |
| `hector` | <https://w3id.org/hector/> |
| `skos` | <http://www.w3.org/2004/02/skos/core#> |
| `schema` | <https://schema.org/> |
| `dcterms` | <http://purl.org/dc/terms/> |
| `rdfs` | <http://www.w3.org/2000/01/rdf-schema#> |
| `xsd` | <http://www.w3.org/2001/XMLSchema#> |

## What's emitted

`generate_jsonld.py` produces:

- Per-volume lading entities under `docs/api/`
- Per-glossary-entry documents under `docs/api/glossary/`
- A single `context.json` (the only JSON-LD file that is committed)

Glossary entries carry:

- AAT commodity types as AAT URIs
- Materials as AAT URIs under `schema:material`
- Geographic provenance under `provenance` with identifier and label
- `compoundOf` as glossary URIs under `hector:compoundOf`
- `related` as glossary URIs under `skos:related`
- Qualifier semantic types and specific AAT concepts as AAT URIs

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
  and Rates. A separate repository at
  `/home/stephen/PycharmProjects/hector/`, hosted at
  <https://w3id.org/hector/>. A Linked Data commodity/unit taxonomy aligned
  with LinkedArt and CIDOC-CRM; currently proof-of-concept stage.
- **DTGC** — Dictionary of Traded Goods and Commodities (N. Cox & K.
  Dannehl). Digitised version accessed via authenticated GitHub API for
  cross-referencing commodity identifications.
