# Glossary Curation

> **Where things stand (June 2026)**
>
> *Done so far.* The glossary has been consolidated into ~2,400 concepts, each
> with its attested spellings gathered as forms and tagged by source volume.
> Concepts are being aligned to the Getty AAT controlled vocabulary and grouped
> into AAT-derived subject groupings (which supersede the older hand-assigned
> categories). The whole corpus of ~210,000 cargo descriptions has been
> automatically annotated against the glossary — commodities, units/containers
> and qualifiers tagged and linked back to concepts — and is browsable in the
> public glossary and the cargo explorer.
>
> *Being done now.* The live work is **pushing up annotation coverage** (around
> 92% of content words are currently accounted for) by feeding the un-annotated
> near-misses through a [human review queue](https://docuracy.github.io/London_Customs_Accounts/commodity-review.html),
> adding the missing spellings and concepts they reveal, and re-running the
> annotation. Concept curation (AAT alignment and descriptions) is being opened
> up to collaborators through a focused, restricted
> [Concept, Qualifier & Leftover Review tool](concept-review-tool.md)
> ([`glossary-concepts.html`](https://docuracy.github.io/London_Customs_Accounts/glossary-concepts.html)).
> In parallel we are **watching the various browser tools in use and adjusting
> them** as rough edges surface — the editors, the public glossary, the cargo
> views and the review queue — and refining the parser where it mis-reads the records.
>
> *Now under way.* Work on the **qualifiers** — the modifiers of colour, origin,
> treatment and quality (*white*, *Westphalian*, *dried*, *broken*) — has begun:
> their many spellings are being collapsed into a shared controlled vocabulary,
> reviewed batch by batch and aligned to AAT. See
> [Rationalising the Qualifiers](qualifier-rationalisation.md) for the process and
> progress.
>
> *Health warning.* The glossary is still **rough**: spellings are missing,
> some qualifiers remain baked into forms, and a few identifications are
> provisional. It is deliberately not yet polished, because the final step is a
> **reverse-rebuild of the glossary from the annotated accounts** — keeping only
> what the records actually attest and dropping speculative or redundant
> material. Treat the current state as a working draft converging on the
> evidence, not a finished reference.

## Why Glossary Curation Is Slow

A briefing note on what it actually takes to turn the raw commodity
glossary into a set of clean, well-defined concepts, each aligned to a
controlled vocabulary (the Getty Art & Architecture Thesaurus, AAT). It is
written for colleagues and collaborators who reasonably ask why a task that
sounds like "tidying a word-list" is measured in months rather than days.

The short answer: the glossary is not a word-list. It is a record of how
several thousand commodities were *named* — in Latin, Middle English, and
Anglo-Norman French, by many hands, over 180 years (1380–1560), with no
spelling standard and heavy abbreviation. Turning that into clean concepts
means making a long series of small scholarly judgements, each of which can
ripple across dozens of other entries. The machine can do the bookkeeping;
it cannot make the judgements.

## What a "clean concept" looks like

The goal for each headword is an entry that is:

- **one concept, not several** — a single commodity, not a spelling that
  happens to cover two unrelated things;
- **complete in its attestations** — every spelling actually found in the
  accounts is recorded as a *form*, each tagged with the source volume(s)
  it appears in, so no witness is silently dropped;
- **atomised in its qualifiers** — modifiers (colour, treatment, origin,
  quality) held separately and grouped, rather than baked into compound
  spellings;
- **aligned to AAT** — pointed at the Getty concept that best matches, with
  the *kind* of match recorded (exact, close, or broader) when it is not a
  perfect fit;
- **linked, not duplicated** — cross-references and "compound-of" / "related"
  links to neighbouring concepts, with no second entry saying the same thing.

Most entries arrive meeting *none* of these criteria. The work is getting
them there without losing information.

## The seven kinds of mess

### 1. Polysemy — one spelling, several things

The same medieval spelling routinely denotes unrelated commodities. These
must be split into distinct concepts, each keeping only its own spellings
and sources.

- `hake` is both a firearm (a 16th-century hand-gun) **and** a fish.
- `plate` is sheet metal, a tableware dish, *and* armour plate.
- `pyx` (the vessel that holds the host of the sacrament) collided with
  `pitch` (pine tar) because both are spelled `pix` / `picis` in Latin — to
  the point that two of the commonest pitch spellings (`piccis`, `pictis`)
  had been filed as *qualifiers of the sacred vessel*.

Untangling polysemy is irreversible-feeling and slow precisely because
getting it wrong scatters a commodity's records across the wrong concept.

### 2. Spelling, scribal, and multilingual variation

A single sense can wear dozens of surface forms. "Fox-skin" alone appears as
`vulpium`, `vulpinis`, `vulpyn`, and `wlpium`; "out of Brussels" as some
seventeen spellings (`brusselles`, `brushille`, `brusshell`, `brissyll`…).
Each must be recognised as the *same* thing and grouped — a task that needs
a reader who knows the Latin declensions and the period's orthographic
habits, not just string similarity (which would happily merge `cork` the
bark with `cork` measured in feet, a different and still-unidentified item).

### 3. Compound attestations

The accounts very often write the qualifier into the noun, so a single
"form" actually contains a noun plus one or more modifiers:

- `pannus depictus` = cloth + "painted"
- `cuniculorum stage hibernie` = rabbit-skin + "out of season" + "Irish"
- `pyn case`, `paynted dissh`, `pirling wier` — each a base commodity plus a
  modifier fused into one entry.

Cleaning these means splitting the compound into a bare form plus separate
qualifiers — while making sure the source volume that witnessed the compound
is transferred onto the bare form, so the evidence survives the split.

### 4. Fragmentation and conflation at once

The same concept is often scattered across numbered sibling keys
(`pece`, `pece_2`, `pecia_2`…`pecia_5`) while, simultaneously, a single key
hoards dozens of distinct senses. The clearest case: one "pelts" concept had
accumulated **634 qualifiers**, conflating four different axes —

> animal type (rabbit, fox, calf, lamb, deer, cat, marten…)
> × treatment (raw, tanned, tawed)
> × colour (white, black, grey, silver)
> × origin & quality (Irish, Prussian, out-of-season, "morkin" = died of
> disease)

— frequently several at once in a single qualifier. Atomising that list and
routing each animal to its proper concept reduced it to 87 generic
qualifiers and enriched 28 separate animal-skin concepts.

### 5. Qualifiers that are really concepts

Some "qualifiers" are not modifiers at all but commodities in their own
right that were mis-filed. The animal types above (`vulpium` = fox skin) are
qualifiers only by accident of encoding; they belong to the `fox`,
`rabbit skin`, `marten` … concepts. Deciding *which* qualifiers to promote,
and to which home — and which genuinely have no home and should stay put —
is a per-item judgement.

### 6. Cross-language duplication

Because Latin and English names were entered separately, the *same*
commodity can exist as two concepts. `pannus` (Latin) and `cloth` (English)
are one thing; so are `pelt` and the formal "pelts (animal skins)". Merging
them means reconciling two qualifier sets that express the same distinctions
in different languages — e.g. recognising that Latin `nigra` and English
`blacke` are one "black" qualifier — and is only safe after both sides have
been cleaned.

### 7. Disambiguation by orthography

Sometimes two concepts can *only* be told apart by a spelling detail, and
the rule has to be stated explicitly. A "pin case" and a "pen case" are
different objects but were jumbled together; the workable rule turned out to
be the second letter — **i/y → pin case, e → pen case** — applied form by
form across both entries.

## The caveats that slow everything down

:::{note}
These are not edge cases. They apply to essentially every entry and are the
reason careful curation cannot be rushed or fully automated.
:::

**Nothing may be lost.** Every spelling is a witness to a place and date.
Each merge, split, or reduction is checked to confirm that no source volume
silently disappears — the most common way to do real damage. This safety
check runs on every change.

**The matcher reads one word at a time.** The annotation engine that links
cargo text to the glossary matches single words by their Latin root. This
has two consequences curators must hold in mind: a bare adjective like
`depictus` cannot simply be added as a form (it would mis-tag *painted
tables* and *painted images* as well as painted cloth); and multi-word
forms such as `cloth pictorum` function as scholarly documentation rather
than as live match targets. Decisions about where a spelling "lives" have to
respect how the machine will read it.

**AAT alignment is itself interpretive.** Often no Getty concept exactly
fits. The thesaurus distinguishes, for instance, "pelt (animal material)"
from "pelts (animal skins)"; choosing between them — or recording a *close*
or *broader* match rather than pretending to an exact one — is an editorial
act, not a lookup. Machine-proposed AAT concepts are therefore stored as
**suggestions** that a human reviews and confirms or rejects, never as
finished data.

**The uncertain is left alone.** Where the evidence does not support a
confident decision — an animal with no clear home concept, a fur-trade grade
of disputed meaning, a spelling that fits no rule — the item is left where it
is rather than guessed at. Restraint is part of the method; a wrong tidy is
worse than an untidy entry.

**Some noise is deleted, not resolved.** A few entries have accreted
qualifiers that plainly belong to an unrelated commodity — for example
`salmon` had picked up a cluster of textile qualifiers (crimson, silk,
figured, "of Bruges", "of Turkey") describing a crimson silk cloth, not a
fish. Where such qualifiers are obviously mis-attached, the pragmatic choice
is simply to **delete** them rather than spend effort re-homing every stray
token. Two things make this safe: the word-level cargo classifier would not
match them to the entry in any case (so nothing downstream depends on them),
and the glossary is intended to be **refined against the actual attestations
once the concept-curation pass is complete** — at which point genuinely
needed senses will reappear from the evidence and can be added deliberately.
Deletion here is housekeeping, not loss.

**Changes ripple.** Because concepts are cross-linked, one decision pulls in
others: merging `pannus` into `cloth` meant reconciling ~250 qualifiers and
re-pointing related-links; splitting `pin`/`pen case` touched a third entry's
cross-reference. A single "tidy" is rarely confined to a single entry.

**Everything is reversible and logged.** Merges, re-keys, and deletions are
recorded with timestamps and rationales, so the editorial history can be
audited and, if needed, undone.

## A worked example, end to end

Taking the "pelts" concept from raw to clean involved, in sequence:

1. reading all 634 qualifiers and splitting each compound into atoms;
2. grouping spelling variants of each atom (so the four spellings of
   "fox-skin" become one);
3. deciding, per animal, whether a home concept already exists — `fox`,
   `rabbit skin`, `calfskin`, `marten`, `basan` (sheepskin)… — and routing
   the spellings there as forms;
4. leaving genuinely homeless animals (deer, seal, wolf, dogfish, and some
   Baltic squirrel-fur grades) on the parent concept rather than inventing
   homes for them;
5. folding in nineteen single-line `pellis <animal>` entries that were the
   same skins recorded as standalone keys;
6. finally merging a near-duplicate parent concept and re-keying the result,
   then confirming no source volume had been lost anywhere.

That is *one* concept family. The glossary holds 3,333 headwords (7,387
including variant forms) across 22 commodity categories. The arithmetic of
why this takes time is not complicated.

## What it means for planning

Curation speed is bounded not by typing but by *reading and deciding*: each
concept must be understood in its 15th-century context, checked against the
actual cargo records, aligned to an external vocabulary that rarely fits
perfectly, and reconciled with its neighbours — all without dropping a
single witness. Machine assistance genuinely helps with the bookkeeping
(atomising, grouping, proposing routes and AAT matches, and verifying that
nothing is lost), but the scholarly judgements remain human, one concept at
a time. That is why the work is slower than "tidying a word-list" suggests —
and why the result is a research dataset rather than merely a tidier file.

## Beyond the entry: classification, annotation, and sanitisation

Cleaning each entry is only the first half. Three further phases turn a set of
clean concepts into a connected, evidence-checked dataset — and each has its own
reasons for being slow.

### Aligning to the Getty AAT and deriving subject groupings

Every concept is pointed at one or more Getty *Art & Architecture Thesaurus*
(AAT) concepts. That alignment then does more than label the entry: a set of
**33 subject groupings** (*Textiles & cloth*, *Weapons & armour*, *Medicines &
drugs*, …) is *derived* from where each concept sits in the AAT hierarchy, so
the groupings are reproducible from the thesaurus rather than hand-assigned.
These replaced the project's original ("Jenks") commodity categories, which were
project-local labels with uneven, incomplete coverage and no link to any
controlled vocabulary; the legacy categories have now been dropped entirely. The
groupings flow through the whole stack — the public glossary, the curation
editor, and the Linked Data (JSON-LD) output all display and filter by them. The
companion note *Commodity Groupings* describes the scheme in full.

### Reading the groupings back into the accounts

The point of a clean, AAT-aligned glossary is to **annotate the cargo records**:
to recognise, in 212,000 cargo descriptions, which words name a commodity, which
name a unit or package, and which are qualifiers (colour, origin, treatment,
quality). This is hard for the same reasons the entries were hard — the same
spelling appears in dozens of forms; qualifiers pile up in any order and on
*both sides* of the noun (`tele Westfale crude`, `panni largi sine grano`); long
multi-word phrases must be preferred over their parts; and a single word can
match several concepts. The annotator therefore matches against every attested
form, assembles a head term with its surrounding qualifiers, prefers the longest
combination, resolves ambiguity by looking at which subject groupings co-occur
in the *same* cargo (commodities shipped together overlap in kind), and falls
back to scored *close* matches for spellings that were dropped or never
recorded — preferring a close match that lets a whole cargo be accounted for
with no words left over. The glossary's coverage and the accounts' coverage are
two sides of one task: a missing spelling shows up as an un-annotated word.

The grouping-cohesion step earns its keep on genuinely ambiguous spellings. Take
`pannis`: it is a real form of both *cloth* (Latin *pannus*) and *pan* (the
cooking vessel), and cloth is roughly twenty-five times the commoner word, so on
frequency alone every `pannis` would be read as cloth. Tested against the live
data, the annotator instead lets the rest of the cargo decide. In `20 pannis
sine grano` — "sine grano" being a cloth qualifier and nothing else in the
cargo suggesting metalware — `pannis` is read as **cloth**; but in `6 ollis, 12
pannis` (pots and …), where the unambiguous *ollis* (pots) pins the cargo to the
*Containers & vessels* grouping, the same `pannis` is read as **pan**. The word
is identical; the surrounding commodities tip the balance. This is exactly the
kind of judgement the cohesion check is meant to make automatically, and
spot-testing it on real cargos is part of the routine adjustment work.

Done this way the matcher accounts for around 92% of the content words across
the whole corpus — some 899,000 of 977,000 — and fully annotates nearly three
cargos in every four. (Coverage runs higher still in the earlier, more
formulaic volumes.) The remaining words are where the scholarship concentrates.

### Closing the gap: reviewing the near-misses

The residual un-annotated words are not random noise; auditing them shows a few
recurring kinds. Many are simply spellings the glossary never recorded — common
Latin inflections of known goods (`alnis` for ell, `pisarum` for peas,
`cultellorum` for knives, `cirotecarum` for gloves). Some are the scaffolding of
the accounts that is not commodity text at all — grammatical words, clerks'
formulae, and the names and *roles* of the people involved (`mercator` a
merchant, `marinariis` mariners). And a stubborn few are genuinely new senses
that deserve their own concept.

These are surfaced automatically as a **ranked review queue**: each unmatched
near-miss is paired with its closest glossary candidate, scored, counted across
the whole corpus so the most consequential rise to the top, and shown with
several real cargos for context. A curator then judges each one in a dedicated
browser tool — *accept* the proposed match, *reassign* it to the correct concept
(the automatic guess is often a plausible-looking false friend — `alnis` offered
as "line", `pisarum` as "fish"), or *reject* it, flagging whether it is "not
commodity text" or a "person qualifier" and leaving a note explaining why. The
judgements cannot be automated because they are exactly the period-knowledge
decisions the whole project turns on: that `pisarum` is peas not fish, that
`egri` is wine-vinegar beside *vini* but beer-vinegar beside *byer*, that a
"powder for worms" is a medicine in its own right.

The review feeds back two ways. Accepted and reassigned spellings are added to
the glossary as forms or qualifiers, which immediately lifts both the glossary's
completeness and the accounts' coverage — the loop tightening on itself. The
accept/reject decisions also become training data for a learned match-scorer, so
the close-matching grows more discerning over time instead of relying on a fixed
cut-off. Because the queue is corpus-wide and frequency-ranked, the effort goes
where it pays: a single accepted inflection can resolve hundreds of cargos.

### Sanitising the glossary against the evidence

The final step closes the loop. Once the annotation is as thorough as it can be,
the glossary is **sanitised against the actual attestations**: forms and
qualifiers that never appear in the annotated accounts — redundant particles,
speculative spellings, qualifiers mis-filed during earlier cleaning — are
dropped, so the published glossary records only what the records actually
witness. This is deliberately left until last, because deleting a spelling
before the matcher has had its best chance to use it would discard evidence;
done afterwards, it is housekeeping. It is the same principle stated throughout:
nothing is removed until we are sure it is genuinely redundant, and every
decision is checked against the witnesses rather than guessed at.
