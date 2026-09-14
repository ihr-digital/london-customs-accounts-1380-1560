# Rebuilding the editorial-index parse

The volume editors hand-indexed every volume: people, places, ships by name, and
ships by home port. That is identification work the project would otherwise have to
redo — *Raynam / Rayneham / Regham / Rengham / Reyneham* grouped under **Rainham**,
*Durdraught / van Derdroit* under **Dordrecht** — and it was reaching neither the
corpus nor the gazetteer. This records what was wrong, what changed, and what the
change is measured to be worth.

## What was wrong

### The published artefact could not be reproduced, and was mostly one bucket

`docs/data/index.json` (committed 2025-08-04) held 372 place groups, of which one —
labelled `Almannia` — held **360 alias forms**: Antwerp, Bristol, Calais, Cologne,
Danzig, London, Spain and the Tower of London in a single "place", alongside junk
tokens and one whole cargo line. It is published: `index.json`, `index_places.tsv`
and `index_ships.tsv` are absent from `TOOL_DATA` in `publish_ihr.py`, so they ship
to the IHR repo and are served on Pages.

Measured against the corpus, **71.2% of all 6,796 place annotations in lading
labels resolved into that one bucket.** Coverage to a meaningless answer is not
coverage, which is why the artefact's apparent 98% folded match rate meant nothing.

### Two causes, not one

The issue identified the sticky `place` variable. There was a second cause, at the
other end of the pipeline, and it was the one that built the bucket.

1. **Scope.** `build_index.py` set `place = None` once per file and never reset it.
   In a people-and-places index that is catastrophic, because ship names inside
   skipper parentheticals are italicised: in `II-9/Index personarum et locorum.html`
   the headword "France" stayed current across 49 following person entries and
   collected Rochester, Caen, Rouen, York, Dunwich, Grimsby, London, Danzig, Calais
   — and `Almannia` itself. The same block was copy-pasted verbatim into
   `build_ipa.py` and `cluster_ipa.py`.

2. **Union-Find over shared IPA.** `write_index()` unioned every pair of place
   spellings that shared an Epitran transcription. The individual collisions are
   small — the largest is seven spellings of Brightlingsea — but Union-Find chains
   them transitively, and one spelling appearing in two groups welds both together.
   Re-running today's code reproduces the pathology exactly: the same bucket, 390
   aliases, renamed `Antwerp` only because no source file contains "Almannia" any
   more. **Fixing the scope bug alone would not have fixed this.**

This is the failure `NAME_CLUSTERING_STRATEGIES.md` already records for Union-Find
on consonant skeletons, repeated in a different file.

## What changed

### One parser

`process/index_parser.py` is now the only reader of these files. It emits a rich
per-paragraph record — section, heading in force, headword, aliases, role, ship
name, skipper, home port, page numbers, cross-references — and the scope rule is
explicit rather than a surviving global:

> In a `ship_ports` index a smallcaps heading **governs the entries that follow**.
> In a `people_places` index a leading smallcaps span marks **that entry only** and
> never governs the next paragraph.

`build_index.py`, `build_ipa.py` and `cluster_ipa.py` now call it; their three
copies of `process_soup` are gone. `build_index_surnames.py` and
`surname_aliases.py` are untouched — they own surnames, carry no place logic, and
`surname_aliases.json` feeds the curation editor.

`deindex.py` is deleted. It had never run its `ship_names` path, matched
`style="font-variant: small-caps"` against files that use `<span class="smallcaps">`,
looked for `<i>` in files containing only `<em>`, wrote one `deindexed.json` per
volume so multiple index files overwrote each other, and could not be invoked as a
module. Its four surviving outputs covered III-2 to III-5 and nothing read them.

### The grouping is the editors', not a clustering result

We do not need to infer which spellings are the same place. The editors recorded it
as document structure: in a ships-by-home-port index the smallcaps heading **is**
the canonical place, and the `de <port>` tail of each ship beneath it **is** an
attested spelling of it. So variants come from those links, and folding is used
only where no link exists — for the ships-by-name indices and for the corpus.

Where a form is attested under two different headings, the build assigns it by
weight of attestation and records the conflict rather than silently picking. Those
are usually real: `Trenite de London'` genuinely sits under Lübeck in II-6, and
`Herte de Holand` under Hamburg in III-6. The editors' heading is their judgement
about the ship's home port, not a spelling of the name in it.

A group larger than 40 forms now **fails the build** unless allow-listed. The
editors' own largest is 24 (Vlissingen).

### The editors' identifications are parsed, not discarded

`Ash (Kent, either Ash (Axton) TQ 602646 or Ash (Wingham) TR 287584)` becomes a
name, an administrative parent, and **two candidate identifications, neither
chosen**. Disjunctions are preserved as uncertainty and such a place is emitted
with no coordinate at all. 11% of headings are explicitly unlocalisable; they are
kept, flagged, not dropped. OS grid references are converted to WGS84 (verified
against known points: Tower of London TQ 336806 → 51.5085 N, −0.0763 E).

## What it is worth, measured

| | committed `index.json` | rebuilt |
|---|---|---|
| place groups | 372 | 411 |
| largest group | **360** (`Almannia`) | 24 (Vlissingen) |
| corpus place forms matched **exactly** | 799/1005 | 881/1005 |
| corpus place **occurrences** matched exactly | 4,513 (66.4%) | **6,660 (98.0%)** |
| …of which resolve into one junk bucket | **4,838 (71.2%)** | 0 |
| ship groups | 771 | 1,111 |
| corpus ship forms absent from the index | 417 | 315 |

Both checks above are tested to fire on the bad reading and stay silent on the good
one; a check that fires on everything is no check at all.

**Calais** was the acceptance test. The corpus holds 1,917 Calais mentions across 18
forms, and the accusative `Calesiam` (1,394) is the commonest place name in the
dataset; it did not join to the index's `Calais`, and three orphan one-alias rows
(`Cale`, `Caleis`, `Calys`) sat elsewhere in the file. Calais is now one group of 21
forms containing every one of `Calesiam`, `Calesia`, `Calisiam`, `Calisia`,
`Calicia`, `Caliciam`, `Caleys`, `Cales`, `Calis`, `Caleis`, `Calecia` and
`Calecium`. The orphan rows are gone.

## A finding that revises the plan

Phase 3 expected the gazetteer to seed **new** place tagging in lading labels. It
will not, and the measurement says so plainly: of the 253 distinct un-annotated word
forms across all 33,533 labels, the rebuilt gazetteer resolves **four** — and three
of those (`March`, `Marche`, `Torre`) are false friends, the month and a ship name,
not the places. There is essentially no headroom there.

The value is not in finding more places to tag. It is in **resolving the places
already tagged** to a canonical identity — from 71% landing in a junk bucket to 98%
resolving correctly. That is exactly what both aims need, so the work is worth what
was hoped; it just pays out somewhere other than where the issue predicted.

One genuine annotation gap did surface: `Calisiam` appears 52 times un-annotated in
labels where the same form is tagged elsewhere. That is an inconsistency in the
existing annotation, not an index problem.

## Outputs

| file | what it is |
|---|---|
| `docs/data/index.json` | unchanged shape (`{canonical: [aliases]}`), rebuilt content; `surnames` preserved, never rebuilt here |
| `docs/data/index_gazetteer.json` | the merged gazetteer: identifications, grid references, disjunctions, coordinates, volumes, ships |
| `docs/data/index_places_lp.tsv` | Linked Places TSV for WHG (see below) |
| `docs/data/index_places.tsv` | the human curation surface, `Merge_Into` column preserved |
| `docs/data/index_ship_attestations.json` | ship, skipper, home port, pages, per entry — 7,531 entries, 7,474 with a skipper |
| `docs/data/index_ship_pages.json` | page-level ship/skipper table, 37 volumes — supersedes the four `deindexed.json` |
| `docs/data/index_build_report.json` | everything the build could not do confidently |

Before this, `grep -rn "skipper"` returned only `deindex.py`: skipper names were
extracted nowhere in the repository, and page numbers were discarded.

## The WHG Linked Places TSV

Built to the spec as WHG3 runs it today (`validation/tLPF_mappings.py`), not to the
public documentation. Twenty-two columns, `;` as the list delimiter, unknown columns
silently ignored — so the working columns after column 22 carry the parts
Map-your-Data can use without breaking the classic upload.

Three decisions worth recording:

- **`matches` is left empty for the disjunctions.** The LP-TSV converter hardcodes
  `exactMatch`, so `matches='gn:X;gn:Y'` would assert the place is identical to
  *both* candidates — the precise collapse the editors avoided. The alternatives
  travel in `description` instead. Expressing them honestly needs LPF JSON, where a
  link can carry `type: closeMatch` and `certainty: uncertain`.
- **`parent_name` and `parent_id` are both empty.** They are coupled: `parent_name`
  alone produces a relation with no `relationTo` and fails validation. We hold an
  administrative parent ("Kent", "Prov. Zuid Holland") but no WHG identifier for it,
  so the parent travels in the `admin_parent` working column.
- **Unlocalisable places are included** with no geometry. `geometry: null` is valid
  and counted as a report statistic, not an error; omitting them would lose the
  editors' testimony that the place was attested at all.

Grid references are emitted both as `lon`/`lat` (converted) and as a `grid_ref`
working column, since Map-your-Data converts OS National Grid natively.

**`ccodes` is a hard filter, not a label.** A wrong country code does not merely
mislabel a row: it removes the right answer from the candidate pool and leaves the
matcher to return the best of what remains, which is always something. Reconciling
"Jersey" as `GB` excludes the island itself and offers a Glamorgan village, a pear
tree and a rifle range. Jersey is `JE`, Guernsey `GG`, the Isle of Man `IM`, and
"Channel Island" no longer maps to anything. **An empty ccode means "do not filter"
and is always safer than a wrong one** — the 205 blank rows are the safe default,
not a gap.

`admin_parent` joins with a comma, not `;`: semicolon is the LP-TSV list delimiter,
and "Yorkshire; East Riding" would split into two parents if that column were ever
mapped to a real one.

## Two checks over our own data

**Disputed grid references are settled by the county, not by a vote.** Six volumes
give Greenhithe a grid reference and they split exactly three to three: II-7, IV-2
and IV-3 say `TA`, III-5, IV-1 and IV-4 say `TQ`. `TA` is the Yorkshire/Humber
100 km square, so that reading puts a place all six headings call "Kent" 300 km up
the coast.

So majority across volumes is not sufficient — here it has no answer at all — and
the county the editors wrote is allowed to *decide*, not merely to report
afterwards. Where no stated county decides, no coordinate is emitted: an arbitrary
tiebreak reads as a decision years later. `grid_ref_conflicts` names every case
either way, with the reasoning.

Two refinements that matter. The arms of an "either X or Y" are excluded from the
comparison — they are candidate identifications, not rival readings of one place.
And within a single square there is no disagreement to resolve at all: `TM 4770` and
`TM 477703` are the same point stated coarsely and finely, so the finer reference
wins on merit however many volumes give the coarse one.

This was also how a third bug surfaced. The grid-reference pattern required three
digits a side, which silently dropped every **4-figure** reference in the sources —
six of them. Fixing it moved no coordinate: for four of those places the 4-figure
reading was an additional, coarser statement of a reference they already had, and
under the precision rule it correctly loses to the 6-figure one. What it did change
is Greenhithe, where the recovered reading turned an apparent 3–2 majority into the
real 3–3 tie, and revealed that the tie was being settled by dictionary insertion
order.

That is worth separating carefully, because the first thing I concluded — that five
places were carrying no coordinate at all — was wrong, and alarming in a way the
truth is not. Six readings were invisible and one tie was being broken arbitrarily.
Both are real; neither had corrupted a published coordinate. The error was inferring
impact from the mechanism instead of comparing two counts, which is exactly the
check the rest of this section argues for.

**Each derived coordinate is tested against the county the editors stated.** Two
independent assertions live in the same heading — the administrative parent and the
grid reference — and when they disagree, one of them is wrong. This is the check
that would have caught Greenhithe, and the reason the earlier bounding box could
not: 54.146 N, 0.433 E is comfortably inside Great Britain.

It is measured against **our own** Kent rows, not a county polygon, and deliberately
so. Resolving a county by name is how you end up testing "Greenhithe is in Kent"
against *West* Suffolk, or against a Yorkshire that contains no ridings — a name
lookup silently returns a *part* of the county, which produces vacuous passes in one
direction and false rejections in the other. If this check is ever rebuilt against
real polygons, the county must be resolved by identifier, never by name.

## Still open

- **Whether these artefacts should stay published.** `index.json`,
  `index_places.tsv` and `index_ships.tsv` are served today; the new files are not
  yet in `TOOL_DATA` either way. That is a decision about what the advisory board
  should see, not an engineering one.
- **Three place names remain genuinely ambiguous** and are refused rather than
  guessed: `Orewelle` (Orewell/Orwell), `de Port` (Oporto/Porto), and
  `strictus de Marrocke`. They are candidates for the `Merge_Into` column.
- **`cluster_ipa.py` cannot run** on this machine — `panphon.distance.Distance()`
  raises `NameError: name 'fn' is not defined` inside the installed panphon. That is
  a library bug, pre-existing and unrelated.
- **`build_ipa.py` and `cluster_ipa.py` both write `config.ipa_path`**, so whichever
  runs second wins. Nothing reads either file.
- **`update_inventory.py` still mislabels the combined files.** The parser no longer
  trusts that label — it reads the document's structure — but the inventory is still
  wrong for II-4, II-5, II-8, III-3 and IV-6, and IV-9 and IV-18 title their
  home-port index "Index of ships by name" in the source itself.
