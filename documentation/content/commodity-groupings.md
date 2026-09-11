# Commodity Groupings

A briefing note on how the glossary's commodities are sorted into broad
subject groupings — what the groupings are, how they are derived, and why
they replace the project's original ("Jenks") commodity categories.

The short version: every one of the 2,417 curated commodity concepts now
carries one or more **groupings** derived automatically from the Getty *Art &
Architecture Thesaurus* (AAT). A concept can sit in several groupings at once
(a metal cooking-pot is both *Metals* and *Containers*), and the groupings are
computed from each concept's AAT ancestry rather than assigned by hand. This
gives a consistent, vocabulary-aligned, multi-faceted way to browse and
analyse the glossary that the older flat categories could not.

## What a grouping is

A grouping is a coarse subject heading — *Textiles & cloth*, *Weapons &
armour*, *Medicines & drugs*, and so on. There are 33 of them. They are not
stored as free choices: each grouping is defined by one or more **root
concepts** in the Getty AAT, and a glossary concept belongs to the grouping
whenever one of those roots appears among its AAT ancestors.

For example, the *Furs, skins & leather* grouping is anchored on the AAT
concepts *pelts (animal skins)*, *fur (hair material)*, *hide (collagenous
material)*, *skin (collagenous material)* and *leather*. Any glossary concept
whose AAT identifier descends from one of those — `calabar` (squirrel pelt),
`budge` (lambskin), a tawed hide — is placed in the grouping automatically.

Because the rule is "does this concept's AAT ancestry pass through one of the
grouping's roots?", the groupings are:

- **reproducible** — re-derivable at any time from the concept's AAT id and the
  published thesaurus, not from a curator's memory;
- **multi-valued** — a concept that descends from two grouping roots belongs to
  both, so cross-cutting commodities are not forced into a single box;
- **interoperable** — anchored in a maintained, multilingual, published
  vocabulary, so the dataset can be aligned with other AAT-indexed resources.

:::{note}
The groupings are *facet tags*, not a partition. 645 of the 2,417 concepts
(27%) belong to two or more groupings; the average is 1.3 groupings per
concept.
:::

## Why we superseded Jenks's categories

The glossary inherited a set of commodity categories with Stuart Jenks's
transcriptions of the Books of Rates and London Customs Accounts — a list of
22 headings (`industrial & artisanal goods`, `household goods`, `metals &
ores`, `weights & measures`, and so on), held in each entry's `c` field. Like
the new groupings, they are already multi-valued: an entry could carry several
categories (`amber` is both `industrial & artisanal goods` and `jewels &
precious stones`), and 40% of entries do. The change is not from single- to
multi-valued. It is in three other respects:

1. **Incomplete and uneven coverage.** The categories did not cover the
   glossary consistently. 487 entries (20%) carried *no* category at all, and a
   further bucket — `unknown` — held 290 more. Meanwhile the distribution of
   what *was* categorised was very lopsided: `industrial & artisanal goods`
   alone held 707 entries (nearly a quarter of the glossary) and `household
   goods` 509, while `wine` held 2 and `nuts` 7. The big buckets were too
   coarse to support analysis; the catch-alls absorbed anything awkward. The
   AAT groupings, by contrast, cover every concept (100%), with an explicit,
   honestly-labelled *Unidentified* grouping for the curation backlog rather
   than an `unknown` bucket mixed in among the subject headings.

2. **No external alignment.** The categories were project-local labels. They
   could not be matched against any controlled vocabulary, so the data could
   not interoperate with other catalogues, gazetteers, or commodity
   ontologies, and the same commodity in another dataset could not be found by
   shared identifier. Every grouping, by contrast, resolves to public Getty
   AAT URIs.

3. **Hand-assigned, not reproducible.** Each category was an editorial choice
   recorded on the entry, so the scheme could drift as it grew and could not be
   regenerated or audited against a definition. The groupings are *derived*:
   each is defined by AAT root concepts, and the whole mapping is recomputed
   from the AAT ancestry rather than curated entry by entry, so it can be
   refreshed and checked at any time.

The legacy categories have now been removed entirely (the `c` field is dropped
from every entry): they were not consistently preserved through editing and had
become misleading. The groupings (the `groups` field) are the sole subject
index.

## The 33 groupings

Sizes count multi-membership (a concept in two groupings is counted in both).
"Anchored on" lists the principal AAT root concepts that define each grouping.

| Grouping | Concepts | Anchored on (AAT roots) |
|---|---:|---|
| Tools & equipment | 315 | equipment; tools |
| Textiles & cloth | 221 | textile materials; cloth; fibre & fibre products |
| Units, weights & measures | 217 | weights and measures; size/dimensions |
| Clothing, costume & accessories | 212 | costume; costume components; personal accessories |
| Containers & vessels | 189 | containers (receptacles); container components |
| Food, spices & comestibles | 184 | food; spices; beverages; herbs; grain; seed |
| Weapons & armour | 149 | edged/projectile/firearm/percussive weapons; armor; components |
| Plants & plant products | 124 | plant material; plant components; nonwoody plants |
| Minerals, stone & chemicals | 117 | mineral; inorganic material; rock |
| Furnishings & household goods | 108 | furnishings (works) |
| Furs, skins & leather | 107 | pelts; fur; hide; skin; leather |
| Medicines & drugs | 83 | medicines (material); drugs; ointment |
| Visual works & writing | 72 | visual works; information artifacts |
| Fish | 67 | fish (meat); fish (animals) |
| Metals & ores (material) | 65 | metal |
| Live animals, birds & livestock | 60 | Vertebrata; Aves; Mammalia; living organisms |
| Hardware & fasteners | 56 | fasteners |
| Animal materials (horn, hair, bone) | 54 | horn; hair; keratinous material; bone |
| Wood & wood products | 53 | wood (plant material); boards |
| Dyestuffs, pigments & mordants | 49 | dye; colorant; pigments; mordant |
| Ecclesiastical & religious objects | 33 | religious/liturgical/devotional objects; ecclesiastical vestments; religious fixtures; incense |
| Jewellery & precious stones | 31 | gems; gemstone; precious & semiprecious stone; jewelry |
| Musical instruments | 31 | musical instruments; chordophone/aerophone components; bells |
| Wax, resin & gums | 29 | wax; resin |
| Oils, fats & tallow | 27 | oil; fat; lipid; vegetable oil; tallow |
| Toys, games & recreation | 22 | recreational artifacts; game pieces |
| Lighting & household devices | 19 | lighting devices |
| Naval stores & shipping | 6 | tar; pitch; watercraft equipment; nautical rigging |
| Building materials & ceramics | 5 | building materials; ceramic; tile; brick; plaster |
| Cosmetics & toiletries | 4 | cosmetics; toiletries; perfume |
| Transport & vehicles | 3 | vehicles (transportation) |
| Explosives & gunpowder | 2 | gunpowder; propellant |
| Unidentified | 412 | unidentified (information indicator) |

The smallest groupings (Building materials, Cosmetics, Transport, Explosives,
Naval stores) are deliberately fine-grained. They were added so that a handful
of concepts — `tile`, `perfume`, `cart`, `gunpowder`, `tar` — could be homed
precisely rather than approximated into a larger neighbour.

## How the mapping is derived

The mapping is computed by walking each concept's AAT ancestry. Four rules
make the result accurate:

- **All AAT references are scanned, not just the first.** A product concept is
  often tagged both with the product and with the live species it comes from —
  a squirrel pelt carries *pelts* and *squirrels*. Reading every reference (and
  the rule below) keeps the pelt in *Furs* rather than misfiling it under live
  animals.

- **Species before product.** *Live animals, birds & livestock* is applied only
  to concepts that descend from a living organism **and** are not already in a
  product grouping (Furs, Fish, Food, Animal materials). So squirrel pelts are
  furs, not live animals, while genuine livestock and hawking birds remain
  live animals.

- **One AAT quirk is excluded.** In the thesaurus, *pelts (animal skins)* sits
  under *natural visual works*, which would otherwise pull every skin into
  *Visual works & writing*. That subtree is excluded from the Visual works
  grouping.

- **Precise roots over broad ones.** Where a broad AAT root would over-collect
  — *ceremonial objects*, for instance, sweeps in plain robes, gowns and
  ceremonial polearms alongside genuine liturgical items — it is replaced by
  narrower roots (*ecclesiastical vestments*, *liturgical objects*, *incense*)
  so the grouping stays clean.

A small number of concepts (about 200) whose AAT identifier does not descend
from any grouping root are assigned to their nearest grouping by hand. The
*Unidentified* grouping (412 concepts) is not a failure of the scheme: these
carry the AAT placeholder *unidentified (information indicator)* and represent
the precision-curation backlog — commodities not yet pinned to a specific
concept.

## Where the data lives

- **On each glossary entry** — a `groups` field listing the entry's groupings,
  in `docs/data/glossary_data.json`. The self-describing `key_mappings` block
  records `groups` → `groupings`.
- **As a standalone map** — `AAT_GROUPING_MAP.json` holds the full
  `concept → [groupings]` mapping plus a `_meta` block documenting the model
  and every grouping's AAT root and exclude ids, so the scheme is reproducible.
- **In the Linked Data API** — each commodity's JSON-LD document carries its
  groupings under `groups` (`mlca:grouping`), generated by
  `process/generate_jsonld.py`.

The groupings are the project's primary subject index, replacing the legacy
categories throughout the public glossary and the curation editor. Because they
are derived rather than authored, neither tool lets a curator edit grouping
membership: the public glossary and the editor both *display* and *filter* by
groupings, but the membership itself is recomputed from the AAT ancestry on the
repository (re-run after AAT-curation passes).

The grouping set is intended to align, in due course, with HECTOR (Historical
Economic Commodities: Terminologies, Ontologies, & Rates), the project's
Linked Data commodity taxonomy.
