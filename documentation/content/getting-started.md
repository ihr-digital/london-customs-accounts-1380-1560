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
"**Search goods, places, ships, people…**" at the head of the table knows the spellings.

1. Type any spelling, for example `cera`.
2. The suggestions say what each one is and how many ladings name it:
   *cera → **wax** · GOODS · 957 ladings*.
3. Press **Enter** (or click) to choose it. It becomes a chip above the table, and the
   table narrows to those ladings.
4. Open a lading (the green button on its row): the wax is outlined in each cargo.

Things to know:

- **Misspellings are caught.** Suggestions marked **≈** are close spellings:
  `saphron` offers *≈ saferon → saffron*.
- **Kinds of goods** too: `spices` offers the group *Spices* as well as each spice.
- **Measures and qualities** — `pipe` (a measure of wine), `Ghent`, `Holland`
  (qualities of goods: where they came from, or the kind of cloth).
- **Combine.** Choices of different kinds must all hold (cloth *and* Ghent: 330
  ladings). Several of one kind mean *any* of them (wine *or* cloth); a switch beside
  the chips changes that to *all*.
- Remove a chip with its **×**, or everything with the red *clear* icon.

## Find a merchant or shipmaster, and their other spellings

1. In the same search box, type a forename *or* a surname — not both — for example
   `Lazera`. People are listed under **People**, with the years they appear and how
   many times.
2. Click a person to choose them. To choose **several**, hold **Ctrl** (**Cmd** on a
   Mac) as you click, or press **Space**: the list stays open and each is ticked.
3. Names are spelt many ways. Tick the **ear** at the top of the list to include
   names that *sound* alike: `kristofer` then also finds *Cristofer*. The first time,
   this loads a phonetic model of about 28 MB.
4. To gather someone's variants, click **similar…** beside them in the list, or click
   their name in any cargo. A window lists similar people, weighted by when they were
   active; tick the ones that are the same person and press **Apply filter**.

The site groups a person's mentions automatically by name and date. It does not decide
that two differently spelt names are one person: that is your judgement, made in step 4.

## Find goods from a place, a ship, or a port

The search box knows places in three roles, and says which it means:

- **goods from** — the place the goods are named from (*Cologne* thread, *Spanish* iron);
- **ship's port** — the place named in a lading's heading, usually the ship's or
  master's home port;
- **merchant from** — where the merchant came from.

Type the place (`Colonie`, `Cologne` and `Coleyn` all work) and choose the role you mean.
Choosing two places, or one place in two roles, keeps ladings that match *either*.

Ships are found by the name in the lading's heading: `Mary` offers the ship *Mary* (and,
separately, people called Mary). In the sixteenth-century accounts a ship is often named
in each cargo instead of the heading; those are not yet searchable by ship, so use
Filter text (below) for them.

## Search the words of the text itself

Press **Advanced**, at the right of the filter row, for **Filter text**. It searches the
transcription as written, lading headings and cargos alike.
Use it for anything the other boxes do not cover: a ship's name, a phrase, a place in the
text. Hover over the box for the full rules. In brief:

- `tim*` matches *timber* and *Timothy*; `j?h*n*` matches *John*, *Johannes*.
- Several words must all appear; `"de Lazera"` in quotes is an exact phrase.
- `wool & !Antwerp`, `fish | salt`, and brackets for grouping.
- A lading's reference (`3-5-A-0485`) shows just that lading. (Typing a reference in
  the main search box does the same: choose *Go to lading*.)

## Narrow by date, account and direction

At the head of the table:

- **Years** — choose a first and last customs year. Ladings the accounts leave undated
  are held back; a note under the table says how many, and shows them if you ask.
- **Accounts** — wool, tunnage, petty, miscellaneous; and beneath them, imports,
  exports, or both.
- **Kinds of goods** — broad groups (textiles, spices, metals…), drawn from the Getty Art
  & Architecture Thesaurus: search for them in the box, or browse them all under
  **Advanced**.

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
