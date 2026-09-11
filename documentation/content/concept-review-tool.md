# Concept, Qualifier & Leftover Review Tool

`glossary-concepts.html` is a focused, **restricted** review tool — a companion to
the full [Glossary Editor](glossary-editor.md). Where the full editor exposes
every field, this one deliberately narrows the surface to the high-value review
tasks and is safe to hand to collaborators. A segmented control in the header
switches it between three modes — **Concepts**, **Qualifiers** and
**Leftovers** — that share one list pane, one detail pane, and one GitHub push.

Like the other editors it is a self-contained single-page app: it loads the data
files directly, keeps a personal "checked by me" flag in the browser, and pushes
changes back to GitHub through the same authenticated flow.

## Common features (all three modes)

- A searchable, badge-annotated list on the left; a detail/editor pane on the right.
- **Keyboard navigation.** The list is virtualised and can be thousands of rows
  tall, which makes its scrollbar thumb tiny and awkward. Step through the
  *currently filtered* list with **↑ / ↓** (or **j / k**), or the **↑ Prev /
  Next ↓** buttons above it — the intended workflow is to tick a filter (e.g.
  *Unreviewed*) to shrink the list, then arrow through it. Keys are ignored
  while a text field is focused or a dialog is open. (The list also sets
  `overflow-anchor: none` to prevent a scroll-anchoring feedback loop that would
  otherwise fling a wheel-nudge to the far end of the list.)
- **Reviewed**, **Help wanted** and **Checked by me** flags, each with a matching
  list filter (Reviewed locks editing; Checked-by-me is personal to the browser
  and never pushed). Filters with **counts** narrow the list; with no filter
  ticked the list shows everything.
- **★ Added since leftovers** — a shared review flag (`sinceLeftovers`) on every
  concept and qualifier created during leftover processing. It shows a ★ badge,
  has its own filter+count in both Concepts and Qualifiers, and is cleared by
  unticking it in the item's editor once reviewed (it round-trips out of the
  data when cleared). Lets a curator sweep the recent additions before other
  work.
- The **Leftovers tab disables itself** (greyed, with an explanatory tooltip)
  once nothing in the worklist is left undecided — re-run the leftover harvester
  to refresh it.
- **Processing Instructions** — a concise, free-text instruction to the
  maintainer (aggregated and actioned in batches) — and **Notes**, sparse shared
  remarks for fellow curators.
- A **hash URL** that carries both the mode and the item (`#concepts:cloth`,
  `#qualifiers:salted`, `#leftovers:thomas`) so a view is shareable and the
  last-edited item resumes on reload; back/forward navigate.
- **Undo all** and a single **Push** that bundles every pending change across the
  modes (glossary entries, qualifier canonicals, instructions, leftover
  decisions) into the appropriate files.

### Attestation

A concept is **attested** when at least one cargo in the annotated corpus is
tagged with it. The tool loads a committed count file
(`docs/data/concept_attestation.json`, produced by
`python -m process.commodity_parser.attestation`) so attestation is known
independently of whether this browser has cached any cargos. In Concepts mode a
**Hide unattested** filter (defaulting **on**) removes the ~200 reference-only
headwords that never occur as goods, and unattested concepts carry a grey **∅**
badge when shown. The Sample-cargos panel uses the same data to distinguish a
genuinely unattested concept ("no cargo in the corpus is tagged with this
concept") from a mere browser cache gap ("*N* corpus cargos… but none cached in
this browser").

## Concepts mode

Edits the commodity glossary entries (`docs/data/glossary_data.json`), restricted
to the review-relevant fields: the **headword** (chosen from the entry's forms,
or a new form typed in — the identifier never changes), **AAT / Wikidata
concepts** and **materials** (via the shared AAT Tree Picker, with match types
and scope-note tooltips), **related (LCA) concepts**, and the **description**.
The description has undo / restore-original / clear controls and an
"insert the AAT scope note" composer that pulls a concept's Getty scope note
straight into the text.

## Qualifiers mode

Edits the canonical qualifier store (`docs/data/qualifiers.json`) produced by the
[qualifier rationalisation](qualifier-rationalisation.md). For each canonical:
its **label** (chosen from the attested forms, or a new one), its **kind**
(general / place / occupation), its **attested forms** (added/removed as chips),
its **AAT concept** (reusing the picker), its **geographic identifier** (shown
with point coordinates; removable), and a **description** with the same toolset as
Concepts. Up to ten **sample cargos** are shown with the qualifier highlighted.
An **Attested on** row lists the glossary concepts whose qualifier set includes
this canonical (the mirror of each concept's read-only qualifier list) — click a
concept to jump to it.

### Raw (un-promoted) qualifiers

The tab also surfaces the **`{raw}` qualifiers** still attached to concepts that
have not yet been promoted to canonicals — the rationalisation backlog. They
appear in the list with an amber **raw** badge and their corpus-attestation count,
and, like Concepts, a **Hide unattested** filter (default **on**, using
`qualifier_attestation.json`) plus a **Show raw (unpromoted)** toggle and an
**Only multi-attested** filter. Selecting a raw shows its attestation, the
concepts carrying it, and its sample cargos, with two promotion actions:

- **Promote to new canonical** — creates a canonical from the raw (you name it),
  then retags every concept carrying it to reference the new canonical; you land
  in the canonical's editor to add a gloss / AAT / geo.
- **Fold into existing…** — pick an existing canonical; the raw spelling is added
  as one of its forms and every carrier concept is retagged.

Both edit `glossary_data.json` (the `entry.q` references) and `qualifiers.json`
together and are saved by the usual **Push**; a maintainer then reannotates so the
change takes effect in the corpus. (`qualifier_attestation.json` is produced
alongside `concept_attestation.json` by
`python -m process.commodity_parser.attestation`.)

## Leftovers mode

A triage worklist for **untagged words** — cargo content the annotator left
uncovered (`docs/data/commodity_leftovers.json`, produced by the leftover
harvester). It exists because much "untagged" text is not missing concepts but
ordinary prose, names and places; this mode separates the genuine gaps from the
noise. Each candidate is bucketed (commodity / qualifier / name-or-place /
noise), ranked by frequency, and shown with its commodity/qualifier signals and
its sample cargos (the token highlighted).

For each word the curator chooses one action:

- **Map → concept / qualifier** — add the word (or, via the editable *Form to
  add* field, the **whole phrase** when the word is only part of a multi-word
  concept, e.g. *seint thomas worstid*) as a form of an existing entry, so it
  matches on the next reannotation. The picker shows a description excerpt to
  separate polysemous concepts, and the closest existing concept/qualifier is
  offered for **one-click** mapping. A leftover may map to **several** concepts —
  different attestations of one word can point to different entries (e.g. *eger*
  → beeregar and vinegar); the decision stores a `maps[]` list, each with its own
  form, and legacy single-map records are read transparently.
- **+ New qualifier** — create a new canonical from the word.
- **Mask as Forename / Surname / Place / Other** — record that the word is not a
  commodity. The mask is read by the parser (it stops trying to tag the word).
  The nearest known place/surname/forename is shown as a *hint* only: its exact
  canonical is often wrong and cannot be corrected here, so reconciling a masked
  word to a specific place or surname is left to the name/place pipeline.
  - For a **Place** mask, an extra **Provenance qualifier** checkbox appears. Tick
    it only when the place qualifies a commodity (e.g. *Rochelle* in *Rochelle
    wine*) — it flags the decision (`provenance: true`) so the place can be
    promoted to a geo-tagged provenance qualifier. Leave it unticked for places
    in other roles (a destination, a person's origin, part of a ship name), which
    must **not** become provenance qualifiers. Flagged masks are turned into
    qualifiers by `python -m process.commodity_parser.promote_places --apply`,
    which creates a provenance-qualifier stub per flagged place (no geo — never
    auto-guessed; set it via the WHG picker) and *suggests* a merge in the memo
    when the place looks like a variant of an existing one (never auto-merged,
    since e.g. Boulogne and Bologna are indistinguishable to a matcher).

Decisions are written to `docs/data/leftover_decisions.json`; the typed masks and
instructions accumulate into a dataset for later improving the name/place
detectors (`pos.py`) and the glossary.

## Related tools (command line)

The Leftovers worklist and two companion audits are generated by the parser
package:

- `python -m process.commodity_parser.leftovers` — harvest uncovered words into
  the worklist.
- `python -m process.commodity_parser.index_disambig` — flag ambiguous tokens
  whose tagged sense disagrees with the Index of Subjects' per-page sense.
- `python -m process.commodity_parser.index_prior` — build the per-page sense
  prior the annotator uses to disambiguate (e.g. *pannis* → cloth, not the unit
  *pan*, on a cloth page).
