# Name Matching

Name matching reconciles variant spellings of forenames, surnames, and full
persons across 33,548 ladings. The current architecture is the result of
thirteen experiments — see `NAME_CLUSTERING_STRATEGIES.md` in the repository
for the full history.

## Architecture overview

- **Forenames:** 5,632 unique forms → 1,283 groups via DMNES seeds +
  Symphonym + FAISS + logistic regression.
- **Surnames:** 37,693 forms with 245,712 scored neighbour edges; three FAISS
  indices (plain, patronymic, particle-prefixed).
- **Patronymics** detected by consonant-skeleton suffix `-sn`.
- **Particle names** detected by regex
  `^(van|de|del|den|der|le|la|atte?)\s+`.
- **Scorers:** Logistic regression on JSONL label files; `.joblib` for
  Python, `.meta.json` (coefficients) for browser-side JS scoring.

## Person IDs on ladings (`pid`)

Every forename / surname / master-* annotation in the per-volume ladings
`.json.gz` carries a `pid` — the group id of a person in the reconciliation
dataset. Clicking a name in the browser opens that person. The person groups
are formed **automatically** (exact forename + surname + status, split on a
50-year temporal gap); no human cross-name merges are baked in.

- `attach_person_ids.py` stamps the pids. A cargo naming several merchants
  ("De X Y et Z W pro …") has its forename/surname annotations **paired by order
  so each merchant gets its own pid** (they share the cargo's status); the first
  pair keeps the positional source key, later pairs resolve by name+year.
  `_resolve_pid` first tries a positional source key
  (`{volume}_{lading}_cargo_{idx}`) but **only trusts it when the name the
  dataset recorded there matches the annotation's name**,
  otherwise it falls back to name + year matching. This guard is essential for
  the late-16th-century *"De \<merchant\>, in navi \<master\>"* cargos: the
  archived dataset builder recorded the **ship-master** under the merchant's
  cargo slot, so a blind match handed merchants the master's identity (clicking
  a merchant opened someone else).
- `augment_missing_merchants.py` additively adds merchants that the dataset
  never recorded (many "in navi" merchants), embedding them with the same
  Symphonym + temporal + status vector and assigning **new** group ids —
  existing pids are never renumbered.
- `build_name_index.py` turns the dataset into the browser artefacts
  `name_index.json.gz` (per-group metadata + neighbours) and
  `name_lading_index.json.gz` (pid → ladings).

> **Reproducibility caveat.** The dataset
> `person_reconciliation_dataset_compressed.json[.gz]` is a **local, untracked
> build intermediate** produced by the now-archived
> `_archive/build_person_reconciliation_dataset.py` (which is not faithfully
> reproducible — it yields a different grouping than the deployed file). Only
> the derived `name_index.json.gz`, `name_lading_index.json.gz` and the ladings
> `.json.gz` are committed. Re-running the attach chain from a fresh checkout
> **without** the dataset would silently drop these fixes.

## Phonetic stack

- **Epitran** → IPA transcription (lazy-loaded singleton)
- **PanPhon** → articulatory feature vectors (sparse, 64-dim default)
- **Symphonym v7** → BiLSTM phonetic embeddings (128-dim), GPU auto-detect

Load via `from process.symphonym import load_embedder` or
`from process.helpers.phonetic import ...`.

## What was rejected

The current candidate-generation + multi-signal scoring architecture was
arrived at after thirteen experiments. Key rejections:

- HDBSCAN on Epitran/PanPhon embeddings (English phonetic model unsuitable
  for multilingual names)
- Union-Find on consonant skeletons (catastrophic transitive chaining)
- Louvain community detection on Jaro–Winkler graph (globally-optimised
  communities too impure)
- Direct Symphonym cosine thresholding (good recall, poor precision — many
  unrelated names > 0.90)

Superseded scripts were removed: `cluster_persons.py`,
`label_forename_clusters.py`, `suggest_pairs.py`,
`cluster_pairs_from_scorer.py`, `run_pair_clustering_sample.py`,
`label_name_pairs.py`.

## Browser editors

| File | Purpose |
|---|---|
| `forename-reconciliation.html` | Forename group merge/split |
| `surname-reconciliation.html` | Surname alias review |
| `person-reconciliation.html` | Full person-identity matching |
| `surname-aliases-editor.html` | Manual surname alias management |
| `name-clusters.html` | D3 network visualisation of name clusters |

## External references

- **DMNES** — Dictionary of Medieval Names from European Sources (2023
  edition, 2,612 headwords). Seed data for forename clustering.
