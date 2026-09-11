# Glossary Editor

> **Retired.** The v1 "Phase 1" full editor (`glossary-editor.html`) has been
> retired — it edited the pre-clean data model and is no longer safe to use. The
> page now serves a static notice and links to the current tool. Curation has
> moved to the [Concept, Qualifier & Leftover Review tool](concept-review-tool.md)
> (`glossary-concepts.html`). The description below is kept for historical
> reference.

The glossary editor (`glossary-editor.html`) was the primary daily-use
curation tool for the commodity glossary (~3,333 headwords). It is a
self-contained SPA persisting state in IndexedDB (via Dexie) and syncing to
GitHub via API.

## Entry data model

Each glossary entry (keyed by headword in `state.glossary.entries`) has:

| Field | Type | Description |
|---|---|---|
| `f` | `[{t,p,s,w,v}]` | Forms: `t`=text, `p`=phonetic, `s`=source IDs, `w`=headword flag (1=headword), `v`=volume occurrences |
| `d` | `string` | Description text |
| `c` | `[string]` | Category names (e.g. "Textiles", "Spices") |
| `q` | `[{t,p,d,s,a,geo,promote}]` | Qualifiers: pipe-delimited variants, optional description, semantic-type AAT ID, specific AAT ID, WHG geo, promotion flag |
| `aat` | `[{id,label,source?,broader?,match?,uncertain?,note?}]` | Commodity type identifiers — AAT concept IDs or Wikidata Q-IDs |
| `materials` | `[{id,label}]` | Material identifiers — AAT concept IDs from the Materials facet |
| `geo` | `{id,label,dataset}` | Entry-level geographic provenance from WHG |
| `compoundOf` | `[string]` | Keys of glossary entries this compound term is composed of (`hector:compoundOf`) |
| `related` | `[string]` | Keys of related entries (`skos:related`; symmetric — reciprocal links maintained automatically) |
| `x` | `[string]` | Cross-reference keys |
| `reviewed` | `boolean` | Reviewed flag (requires description + category; mutually exclusive with `helpWanted`) |
| `helpWanted` | `boolean` | Flagged for collaborative review |
| `memo` | `string` | Free-text internal memo |

## External identifier integrations

### Getty AAT / Wikidata — commodity types (`entry.aat`)

The **AAT Tree Picker** (`js/aat-picker.js`) provides a reusable modal for
browsing and selecting concepts from two sources:

- **Getty AAT** — a local IndexedDB-cached vocabulary (`js/aat-db.js`)
  providing hierarchical tree browsing, debounced text search, scope-note
  tooltips, and lazy-rendered tree expansion. Downloaded once and cached.
- **Wikidata** — an alternative source tab in the same picker, querying the
  Wikidata API live. Stored with `source: 'wikidata'` and displayed with a
  distinct "W" badge and Wikidata entity link.

Match types differentiate how precisely a concept fits the entry:

- **Exact match** (default) — the AAT/Wikidata concept *is* the commodity.
  Post-selection offers to adopt the source's scope note as the description.
- **Close match** (`match: 'close'`) — close but not identical
  (`skos:closeMatch` semantics). Shown with ≊ indicator.
- **Broader match** (`broader: true`) — a more general term. Shown with ≈
  indicator and dashed border; post-selection opens the description for
  manual editing.
- **Uncertain** (`uncertain: true`) — toggleable flag shown with ? indicator.

Each AAT/Wikidata assignment may carry an optional free-text `note`
explaining the rationale.

The picker is reused for three contexts: entry-level commodity types
(`openAATPickerForEntry`), category-level guide terms
(`addAATGuideTerm`), and qualifier-specific AAT concepts
(`openQualifierAATPicker`).

### Getty AAT — materials (`entry.materials`)

A separate **Materials** section (immediately after Provenance in the UI)
allows assigning AAT material concepts to an entry. Uses the same AAT Tree
Picker modal. Stored as `[{id, label}]` and rendered as brown/sienna tags.
Emitted in JSON-LD as `schema:material` with AAT URIs.

### WHG — geographic provenance (`entry.geo`, `qualifier.geo`)

The **World Historical Gazetteer** Reconciliation API is used at two levels:

- **Entry-level provenance** (`entry.geo`) — identifies the geographic
  origin of the commodity. Shown in a dedicated Provenance section.
  Centroid coordinates are fetched via the WHG extend API for display.
- **Qualifier-level provenance** (`qualifier.geo`) — individual qualifiers
  (e.g. "Spanish" in "Spanish iron") can have their own WHG identifier.

Both use `searchWHG(target)` against the WHG reconciliation endpoint.

### DTGC — Dictionary of Traded Goods and Commodities

Accessed via authenticated GitHub API from a private repository. The DTGC
modal (`openDTGCModal`) provides full-text search of the digitised
dictionary for cross-referencing commodity identifications.

### External dictionary lookup

The "Dictionaries" button (`lookupInDictionaries`) opens a modal listing
external dictionary URLs (MED, OED, Lexis of Cloth and Clothing, etc.). The
search term is auto-copied to clipboard.

## Entry linking

- **Compound Of** (`compoundOf`) — links to entries composing a compound term
  (e.g. "aqua vitae" → "aqua" + "vitae"). Uses `hector:compoundOf`. Cycle
  prevention: the entry-picker excludes entries that already list the current
  entry in their `compoundOf`.
- **Related Terms** (`related`) — bidirectional links between
  similar-but-distinct terms. Uses `skos:related`. Adding A→B automatically
  adds B→A; removing one side removes the reciprocal. Rendered as purple tags.

Both sections use a shared **Entry Picker Modal** with search and a
toggle+badge UI pattern.

## Merge system

Entries can be merged via three paths: phonetic-similarity suggestions
(`updateMergeSuggestions`), manual "Merge With…" search, or multi-select
merge. `performMerge()` unions all fields: forms, categories, qualifiers,
sources, cross-references, AAT concepts, materials, `compoundOf`, `related`,
descriptions (with optional append), and memos. For `related`, reciprocal
links on target entries are repointed from the deleted entry to the primary.
For `compoundOf`, back-references across all entries are repointed. Merge
rationale is optionally recorded with timestamp.

## Qualifier system

Qualifiers refine commodity entries (e.g. "white" in "white cloth"). Each
qualifier has:

- Pipe-delimited variant forms (first is canonical; click to promote)
- Optional description
- Optional semantic-type AAT ID (`s`) for the qualifier category (e.g.
  colour, quality)
- Optional specific AAT ID (`a`) for the exact concept
- Optional WHG geographic identifier (`geo`)
- A `promote` flag for promoting a qualifier into a standalone compound entry

Qualifier metadata propagates automatically: when a qualifier's AAT type or
geo is set, the editor offers to apply the same metadata to matching
qualifiers across other entries.

## Filter system

The filter panel supports: reviewed/unreviewed/help-wanted status, hide
entries with AAT concepts, category filter (multi-select checkboxes + "no
categories" toggle), and qualifier-type filter.

## JSON-LD output

`generate_jsonld.py` emits per-entry JSON-LD documents with:

- AAT commodity types as AAT URIs
- Materials as AAT URIs under `schema:material`
- Geographic provenance under `provenance` with identifier and label
- `compoundOf` as glossary URIs under `hector:compoundOf`
- `related` as glossary URIs under `skos:related`
- Qualifier semantic types and specific AAT concepts as AAT URIs

Context prefixes defined in `docs/api/context.json`: `mlca`, `hector`,
`skos`, `schema`, `dcterms`, `rdfs`, `xsd`.
