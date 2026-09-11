# Rationalising the Qualifiers

A briefing note on how the glossary's **qualifiers** — the modifiers that refine
a commodity (colour, weave, size, quality, origin, treatment: *white*, *double*,
*narrow*, *coarse*, *Holland*, *embroidered*) — are being turned from a sprawl of
loose spellings into a small, shared, controlled vocabulary. It is a companion to
[Why Glossary Curation Is Slow](glossary-curation-complexity.md): the commodities
have largely been curated and AAT-aligned; the qualifiers are the next layer.

## The problem

Qualifiers had grown the same way the commodity headwords did — by many hands,
over 180 years, with no spelling standard. The result, before this pass:

- ~7,500 qualifier objects across ~1,050 commodity entries, but only **a small
  lexeme set underneath**: *small* alone appeared as ~600 inflected/spelled
  variants (`parvus`, `parva`, `parvi`, `parvum`, `parvuss`…), and the same
  lexeme (white, Holland, coarse) was re-spelled and **re-annotated separately on
  every entry it touched**.
- ~5,700 distinct surface spellings, of which **only ~44% are actually attested**
  in the annotated cargo records — the rest are speculative or never-reached.
- Almost no identifiers: a handful of AAT/geo tags across thousands of
  qualifiers, because there was nowhere to attach them *once*.

## The approach

The design was agreed in discussion and is deliberately simple:

- **A shared canonical store** (`docs/data/qualifiers.json`). Each qualifier
  lemma is defined **once** — its label, its attested spelling *forms*, a gloss,
  and (where appropriate) its Getty **AAT** concept and a geographic identifier.
- **Entries reference canonicals** rather than repeating text: a qualifier
  becomes `{ref: "holland"}`, a compound becomes an ordered
  `{tokens: […]}` sequence (with `{lit}` for connectives like *de*), and an
  un-lemmatised survivor stays as `{raw}`. An identifier set on a canonical then
  **inherits everywhere it is referenced**.
- **Attestation-driven, and merged with sanitisation.** The pass is scoped by
  what the records actually attest; spellings that never appear in the annotated
  cargos are pruning candidates, so tidying and pruning happen together.
- **Compositional compounds are decomposed** into their atoms (*holandie grossa*
  → coarse + Holland); only non-compositional units (place names like *St-Omer*)
  are kept whole.
- Polysemy machinery was deliberately left out — one canonical, one sense — to be
  revisited only if a real case demands it.
- **Prune by corpus-*text* occurrence, never by parser match.** The first prune
  judged "never attested" by whether the *span parser* had tagged the qualifier —
  but a raw form the parser couldn't yet attach counted as zero even when it
  occurs in the records, so ~1,235 genuinely-attested raws were dropped (e.g.
  *muscadell* on wine, *loges* on dudgeon). The metric was corrected to
  **contiguous-n-gram occurrence in the normalised cargo text**; the wrongly-
  pruned, text-attested raws were restored and the genuinely-absent ones left
  pruned.

## How the work is divided

The machine does the bookkeeping; the scholar makes the judgements.

- A **proposer** (`process/qualifiers/cluster_qualifiers.py`) reads the raw
  qualifiers, decomposes compounds, and *clusters* the surface variants into
  proposed canonicals using three composed signals: the curator's existing
  pipe-grouped synonym families, shared spellings that bridge entries, and a
  consonant-stem merge for spelling variants. It harvests any existing
  gloss/AAT/geo, marks corpus attestation, and writes a **reviewable proposal**.
  Nothing it proposes goes live.
- A **tolerant reader** in the cargo parser was added so the new
  `ref`/`tokens`/`raw` forms resolve to spellings exactly as the old text did —
  validated by a self-contained **spike** on the textiles entries that proved no
  attested spelling is lost and the parser's output is unchanged.
- Every **merge, split, relabel, prune and identifier assignment is a human
  decision.** The proposal is reviewed in small thematic batches (colours,
  weaves, sizes, …); each batch is signed off — corrected where the clustering
  over- or under-merged, and given the right AAT concept — before it is written
  into the canonical store. The automated steps exist only to make that review
  tractable; they do not make the scholarly calls. (The planning, clustering and
  drafting here were steered with the project's AI assistant, but the controlled
  vocabulary is the curator's.)

This mirrors the wider lesson of the project: the machine can collapse ten
thousand spellings into candidates and check that nothing was dropped, but it
cannot decide that *murrey* is a mulberry-purple or that *stricta* and *narrow*
are the same idea — those are period-knowledge judgements.

## Why this is now feasible at all

Two things deserve to be stated plainly.

The first is **accuracy at scale.** Reconciling several thousand qualifier
spellings — tracking which surface form belongs to which lemma across more than a
thousand entries, checking after every change that no attested spelling has been
silently dropped, and cross-referencing each against the annotated corpus — is
the kind of exhaustive bookkeeping that is effectively impossible to do reliably
by hand. Done manually it would accrue errors faster than they could be caught.

The second is **speed, and with it feasibility.** When this two-year edition was
proposed and funded, a controlled, identifier-aligned qualifier vocabulary on top
of a cleaned commodity glossary was simply not within scope — there were not the
person-months for it. Large language models have changed that calculus
outright: the clustering, the corpus-wide attestation checks, the drafting and
the validation that would have consumed months are now a matter of hours of
human review over machine-prepared batches. It is no exaggeration to say the
project's AI assistant has been transformative — turning a task that could not
have been contemplated within the original budget into one that is being
completed as a routine part of the work. The scholarship — every identification
and every judgement of sameness — remains, and must remain, human.

## Progress

Reviewed and written into the canonical store (per signed-off batch):

| Batch | Canonicals | Notes |
|---|---|---|
| Spike (textiles) | — | schema + tolerant reader validated; no spelling lost |
| Colours | 20 | white…grey with AAT colour concepts; scarlet/tawny/murrey/russet/columbine/dun via a *broader* AAT |
| Weaves / structure / pattern | 14 | single/double/half/plain/tissue/striped/figured/checked/marble (label-only); ribbed, diaper, damask, embroidered, raised with AAT |
| Sizes | 6 | small/large with AAT; narrow/broad/long/short label-only |
| Quality / grade | 12 | refuse, raw (=unfinished) with AAT; coarse/fine/old/new/wet/worked/counterfeit/royal/bastard label-only |
| Materials | 9 | wool/linen/silk/cotton/hemp/gold/silver/gilt/tinsel, each with its AAT material concept; silver split from gilt |
| Provenance (places) | 99 | every attested place given a Wikidata identifier, a point, and a polygon where one exists (six further towns — Newcastle, Winchester, Lucca, Levant, Montivilliers, Hamburg — added with the long tail) |
| Cloth-type long tail | 102 + 19 merged | named fabrics, threads, paper grades and treatments given a canonical with its gloss; variants folded into existing lemmas; 60 one-off unknowns left to migrate as raw forms |
| Occupational / purpose | 8 | cooper, weaver, shoemaker, tailor, saddler, fuller, cordwainer with AAT occupation concepts, plus *crossbow* (purpose); caught a *sutor* (= shoemaker) mis-glossed as "tailor" |
| Provenance (more places) | +11 / 9 merged | Messina, Toulouse, Nuremberg, Bordeaux, Málaga, Canary Islands, Gascony, Cornwall, Rhineland, Arabia, Berflete etc. added; dup variants merged into Paris/Devon/Burgundy/Portugal/Ireland/Cyprus/France/Norfolk/Winchester |
| Materials (cross-category) | 17 | leather, earthenware, stoneware, bone, iron, wood, ivory, brass, copper, velvet, worsted, wicker, tapestry (with AAT) + mail/thrum/splint/broken; caught a clustering error merging *broken* into "leather" |
| Furs, skins & leather | ~40 | tanned/tawed/untanned split; fur cuts (belly, back, leg, paw, tail, neck, head); sources (squirrel, calaber, marten, fitch, cat, rabbit, lamb, kid, hart, cowhide, …); separated *otter*/*rough* from a garbage "raw" cluster |
| Food & processing | 16 | dried, in/out-of-season, salted, powdered, garbled, sugar-loaf, candy, fresh, comfect, Bay salt; wine-types malmsey/romney/cute/sweet |
| Cross-category sweep | ~50 | dup colour/size/quality variants merged in; new types (covered, empty, bound/unbound, painted, ostrich, knitted, children's, Castile soap, parchment, currants, brazil, …); caught the *kors* garbage cluster (coarse+large+weak+refuse) |

The first themed batches were scoped to **Textiles & cloth**; the sweep above
extended the rationalisation across **all** commodity categories. The all-category
proposer clusters proved noticeably noisier — several garbage super-clusters
(*brok* = broken+skin+leather, *kors* = coarse+large+weak+refuse, *rau* =
raw+rough+otter) had to be caught and unpicked by hand. The vocabulary now stands
at **~384 canonicals**; the remaining ~430 single-attestation one-offs are left to
migrate as raw forms rather than forced into false lemmas.

### Migration and prune

With the vocabulary consolidated, the live entries were **migrated** to reference
the store. Each `entry.q` item became a `{ref}` (3,815), a `{tokens}` compound
(742), or an un-lemmatised `{raw}` survivor — losslessly, with any spelling not
already in its canonical added back so nothing was dropped. The full corpus was
reannotated; qualifier coverage held (109,066 annotations, essentially unchanged,
with slightly more cargos covered), confirming the references resolve to the same
surface forms the legacy text did.

The order mattered: a prune attempted *before* reannotation would have deleted
legitimate paradigms (it wanted to drop *grey*, *hemp*, *damask*) because the
old annotations under-counted qualifiers — the very thing this work fixes. Run
*after* reannotation, the **prune** removed **2,041 never-attested `{raw}`
spellings** — speculative or never-reached forms (*childrens cappes*, *cloth of*,
*of the dedly syns*) that match no cargo — while keeping the 947 attested raw
survivors. Because they never matched, no further reannotation was needed.

Finally, every consumer was repointed through a single shared resolver
(`docs/js/qualifiers.js` for the browser, an equivalent reader in
`generate_jsonld.py`): the public glossary, the main-index cargo popovers (now
showing a qualifier's canonical label, gloss, and linked AAT and geo), the entity
viewer and the editors all resolve `ref`/`tokens`/`raw` against the store, and
the JSON-LD emits the canonical AAT and provenance identifiers — set once, and
inherited everywhere the canonical is referenced.

Canonicals are curated in the Qualifiers mode of the
[Concept, Qualifier & Leftover Review tool](concept-review-tool.md).

### Provenance: places, identifiers and geometry

The largest single group — 84 place-clusters after merging — was the only batch
needing **geographic** identifiers rather than Getty AAT. Each cluster was
reconciled against the **World Historical Gazetteer** (WHG), which returns a
candidate Wikidata identifier per name. That candidate is only a starting point:
WHG scores on the *name string*, so the top hit for *Cologne* was a place in
Italy, *Constance* resolved to Portugal, *Ireland* to Shetland, and *Brunswick*
to a railway station. The decisive check was **geometry** — fetching each
candidate's coordinates and looking at where the dot actually landed exposed
**eighteen** wrong auto-matches, every one corrected by hand to the right entity
(and, for historical territories, to the period polity: the *County* of Holland,
the *Duchy* of Brabant, the *County* of Flanders, the *Kingdom* of England).

Geometry is collected into a single file,
`docs/data/qualifier_places.geojson`: a **point** for every place (Wikidata
`P625`, with the WHG centroid as a fallback) and a **polygon** wherever the place
carries an OpenStreetMap relation (Wikidata `P402`, fetched by exact id so there
is no name-ambiguity). Modern regions and towns yield polygons; the older
polities (which have no OSM relation) keep a representative point. 81 of the 99
places carry a polygon.

```{image} ../_static/qualifier_places_map.png
:alt: Map of the provenance places referenced by glossary qualifiers
:width: 100%
```

Two judgement calls are worth recording. *Vitré* (the canvas *vitry*) is kept as
a qualifier but given **no** geographic identifier: like *Flemish*, it is a
name-derived cloth-type whose provenance is implicit and not always reliable —
the place a cloth is *named* for is not always where it was made. And *bar*
(*barras*, a coarse packing-canvas) was removed from places altogether: it is a
fabric, not an origin.

### The cloth-type long tail, and a three-way split

What remained after the themed batches was a long tail of ~210 low-frequency
qualifiers — many attested only once: named fabrics (*cogware*, *frieze*,
*arras*, *florence*, *pikling*), threads and their purposes (sewing, packthread,
warp), paper grades (writing, printing, pressing), finishing treatments (tawed,
bleached, dyed, moth-eaten) and a residue of genuinely obscure words. These were
imported with the gloss the corpus already carries, variants were folded into the
lemmas they belong to, and **60 one-off unknowns** (*bamme*, *holderne*,
*wysk* …) were deliberately *not* given canonicals — at migration they survive as
raw forms rather than being forced into a false lemma.

The tail also forced a **three-way split** that the consonant-skeleton clustering
had collapsed into one. The skeleton `vtr` had merged three unrelated lexemes:
*vetus* / **old** (on shoes, pots, carpets), *vitrum* / **glass** (on bottles,
beads, paternosters), and *vitry*, the **canvas** named after Vitré. The
glossary's own per-entry descriptions disambiguate them — *veteri* glossed "old"
on a shoe but "a light, durable canvas" on canvas — so each became its own
canonical (*old*, *glass* with its AAT material concept, and *vitry* with no
provenance), with the overlapping spellings free to appear in more than one,
because the parser resolves them from the commodity each qualifies, not the spelling
alone.

A couple of points carried forward for later:

- **Material qualifiers as explicit/implicit.** Material qualifiers (*cloth of
  gold*) are kept in `q` rather than a separate facet, but a later refinement may
  tag them explicit-vs-implicit, so that materials a record *states* and
  materials a concept *implies* can both be aggregated for analysis.
- **Uncertain forms.** A few spellings (e.g. *ronyche*, *tukkid* — "some kind of
  hemp, meaning unknown") have no confident lemma. The form schema does not yet
  carry a per-form uncertainty flag, so these are held aside rather than folded
  in; a flag could be added if the need recurs.
*This document is updated as each batch is signed off.*
