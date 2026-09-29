# Getting Started

**[Open the site](https://ihr-digital.github.io/london-customs-accounts-1380-1560/)** — then come back
here, or press **Tour** in the site's top right-hand corner for a two-minute guided tour.

This page is for researchers who want to **find things in the customs accounts**: a
commodity, a merchant, goods from a place, a period. Each section is one task, done in a
few steps. Counts quoted below were true on 29 September 2026; they change as the edition
is corrected.

## Before you start: the first visit

The first time you open the site, your browser downloads the whole corpus (about 33,500
ladings and 212,000 cargos). This takes **a few minutes**; the tour runs meanwhile.
It happens once: later visits start at once, and the site then works without a
connection. If the table stays empty, wait for the progress bar to finish.

A **lading** is one consignment entered under a ship's heading; its **cargos** are the
goods listed beneath it, each usually with a merchant, a quantity and a value.

## Find every cargo of a commodity, whatever the spelling

The accounts spell the same goods many ways, in Latin, English and French. The search box
"**Search goods, measures, qualities…**" knows the spellings.

1. Type any spelling, for example `cera`.
2. The suggestions say what each one is and how many ladings name it:
   *cera → **wax** · GOODS · 957 ladings*.
3. Press **Enter** (or click) to choose it. It becomes a chip above the table, and the
   table narrows to those ladings.
4. Open a lading (the green button on its row): the wax is outlined in each cargo.

Things to know:

- **Misspellings are caught.** Suggestions marked **≈** are close spellings:
  `saphron` offers *≈ saferon → saffron*.
- **Measures and qualities are searchable too** — `pipe` (a measure of wine),
  `Ghent`, `Spain`, `Holland` (qualities of goods: where they came from, or the kind
  of cloth).
- **Combine terms.** Choose two or more; with **all** the table keeps ladings naming
  every one (cloth *and* Ghent: 330 ladings), with **any** it keeps ladings naming at
  least one.
- Remove a chip with its **×**, or all of them with **Clear terms**.

## Find a merchant or shipmaster, and their other spellings

1. In the box marked with a person ("**Filter by person…**"), type a forename *or* a
   surname — not both.
2. Choose a person from the list. The table narrows to their ladings.
3. Names are spelt many ways. Switch on the **ear** in the same box to include names that
   *sound* alike: `kristofer` then also finds *Cristofer*. The first time, this loads a
   phonetic model of about 28 MB.
4. To gather someone's variants, open any cargo that names them and **click the name**.
   A window lists similar people, weighted by when they were active; tick the ones that are
   the same person and press **Apply filter**.

The site groups a person's mentions automatically by name and date. It does not decide
that two differently spelt names are one person: that is your judgement, made in step 4.

## Search the words of the text itself

**Filter text** searches the transcription as written, lading headings and cargos alike.
Use it for anything the other boxes do not cover: a ship's name, a phrase, a place in the
text. Hover over the box for the full rules. In brief:

- `tim*` matches *timber* and *Timothy*; `j?h*n*` matches *John*, *Johannes*.
- Several words must all appear; `"de Lazera"` in quotes is an exact phrase.
- `wool & !Antwerp`, `fish | salt`, and brackets for grouping.
- A lading's reference (`3-5-A-0485`) shows just that lading.

## Narrow by date, account and direction

At the head of the table:

- **Years** — choose a first and last customs year. Ladings the accounts leave undated
  are held back; a note under the table says how many, and shows them if you ask.
- **Account types** — wool, tunnage, petty, miscellaneous.
- **Direction** — imports, exports, or both.
- **Commodities** — broad groups of goods (textiles, spices, metals…), drawn from the
  Getty Art & Architecture Thesaurus.

Every filter combines with every other, and with the searches above.

## Read a cargo

Open a lading with the green button on its row.

- Coloured words are what the tools recognised: goods, measures, qualities, names, places,
  ships. **Hover** over one to see what it was read as.
- The **table icon** at the start of a cargo shows the tools' full reading of it: each
  commodity with its quantity, measure, qualities and concept, and links to the Getty
  and Wikidata entries for the concept.
- The **page icon** on a row opens the page image of the printed edition.

The readings are made automatically and are not always right: the transcription is the
authority. If you find a mistake, please report it (see below).

## See the same selection as a chart or a map

The **Chart** and **Map** tabs at the top show the ladings the table currently holds: over
time, and on a map of where goods came from. The Map follows the table's filters only when
its *Follow the table filters* switch is on.

## Keep, share and cite what you found

- **Share a search.** The address bar holds every filter you have set: copy it, and
  anyone who opens it sees the same selection.
- **Download it.** The buttons beside the tabs export the current selection, including
  as a **PDF** that leaves out cargos your filters did not ask for.
- **Cite it.** The **quotation-mark** button copies a citation for the edition. The copy
  icon on any lading or cargo copies its text with its reference and date, for example
  `Tunnage 1-5-A-0005-0001 [11 Mar 1390]: "De Nicholao Flanne …"`.

## Found a problem?

Report it on the project's
[issue tracker](https://github.com/docuracy/London_Customs_Accounts/issues), with the
lading's reference.

## Further reading

- [The Table](using-the-table.md), [The Chart](using-the-chart.md),
  [The Map](using-the-map.md) — each view in detail.
- [The More menu](more-resources.md) — the glossary, customs officials and the surviving
  account books.
