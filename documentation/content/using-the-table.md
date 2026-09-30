# The Table

**[Open the Table](https://ihr-digital.github.io/london-customs-accounts-1380-1560/)** — opens in the site itself.

The Table is the edition itself: one row per **lading** — a consignment entered
under a ship's heading — with its cargos beneath. Everything else on the site
shows the same set of ladings in another form, so **the filters described here
govern the Chart and the Map as well**.

- The [Chart](using-the-chart.md) always plots the filtered set.
- The [Map](using-the-map.md) will narrow to it, but only if you ask: its
  *Follow the table filters* switch is off until you turn it on.

## Reading a row

- **Dates** — the lading's date. Ladings the accounts leave undated are held
  back by the date filter; a note below the table says how many.
- **Categories** — the commodity groups the cargos fall into.
- **Ladings** — the heading and, indented under it, each cargo.
- **Annotations / Footnotes** — switches how the editors' apparatus is shown.
  - *Annotations*: names, places, ships, commodities and units highlighted in
    the text.
  - *Footnotes*: the editors' notes, as printed.
- **Source words** — where the accounts point back rather than name someone
  ("De eodem", "de dicto magistro", "Et pro"), the table fills in the person meant,
  underlined with dots; hover to see the words of the source. Switch *Source words*
  on to show those words in place of the names instead. The setting is remembered.
- The **PDF icon** on a row opens the page image for that lading.

## Cargos

- Each lading heading carries a **`cargos` button**. Click it to open the list of
  cargos entered under that heading, and again to close it.
- A row you leave open **stays open** while you scroll, even though the table
  only keeps the visible rows in the page.
- With a kind of goods chosen, the cargos that carry it are highlighted, and a
  chosen commodity, measure or quality is outlined wherever it occurs in the
  cargo text, so you can see which part of a lading matched.
- The clipboard icon beside a cargo copies its text.

## Clicking a name

Merchant and shipmaster names are clickable wherever the person could be
identified. Clicking one opens the **name picker**:

- It shows that person, and **other name forms judged to be the same or similar**
  — the corpus spells a name many ways, and this is where those are gathered.
- Tick any of them to **add them to the Person filter**. The table narrows at
  once.
- Chosen people appear as **chips** above the table; the × on a chip removes
  one, and *clear* removes them all.
- A name the project could not resolve to a person is **not clickable** and is
  shown underlined rather than highlighted.

:::{tip}
This is the way to follow one merchant through the corpus. The search box finds
people by a single forename **or** surname; the name picker starts from an actual
person in an actual lading and gathers their variant spellings for you. It is
also one click away in the search box: *similar…* on any person it offers.
:::

## What the colours mean

In *Annotations* mode each highlight is a kind of thing the pipeline has
identified:

| Colour | |
|---|---|
| **red / pink** | merchant — forename, surname, status (*alienigena*, *indigena*) |
| **blue** | shipmaster — forename, surname, status |
| **orange** | an alias form of a name |
| **purple** | ship name and ship type |
| **green** | place |
| **yellow** | commodity |
| **teal** | unit of measure |
| **light blue** | quantity |
| **lavender** | money |

- Hovering a commodity or unit shows what it was matched to; the tooltip links
  to the [Glossary](more-resources.md#glossary) entry.
- Colours mark what the pipeline **recognised**. Unhighlighted words are text the
  annotation has not claimed — which is itself worth seeing.

## Filters

Everything you choose appears as a **chip** in the *Filters* row above the table;
the × on a chip removes it. Chips of **different kinds** combine — a lading must
satisfy all of them (wine *and* from Spain). Several chips of **one kind** mean
*any* of them; when there are two or more, a switch beside the chips offers *all*
instead. The result count sits beside the *Ladings* heading.

### The search box

One box searches everything the accounts are tagged with. Type two or more
letters and choose from the suggestions, each of which says what it is and how
many ladings it would show:

- **Goods**, by any spelling — `vinum`, `wyne` and `wine` all offer *wine*.
  Misspellings are caught too, marked **≈** (`saphron` → *saffron*).
- **Kinds of goods** — groups such as *Spices* or *Textiles & cloth*, drawn from
  the Getty Art & Architecture Thesaurus.
- **Measures** (`pipe`, `pot`) and **qualities** (`Ghent`, `Spain`, `white`).
- **Places**, in three roles: *goods from* (the place the goods are named from),
  *ship's port* (the place in a lading's heading) and *merchant from*.
- **Ships**, by the name in the lading's heading.
- **People**, by **one forename or one surname** — a full name such as
  `Marten de Lazera` will not match; search `Lazera`.
  - **Ctrl/Cmd-click** (or Space) a person to add them **without closing the
    list**, and so choose several; a plain click chooses one and closes it.
  - The ear in the list's header adds names that **sound** alike (`kristofer`
    finds *Cristofer*). It loads a phonetic model of about 28 MB the first time.
  - *similar…* opens the name picker for that person.
- A **lading reference** (`3-5-A-0485`) offers *Go to lading*, which shows that
  one record.

The tabs at the top of the list — *All, Goods, Places, Ships, People* — narrow
it. ↑/↓ move, **Enter** chooses, **Esc** closes.

### Years and accounts

**Years** — the two selectors set the range. The arrow between them reverses the
sort order.

**Accounts** — wool, tunnage, petty, miscellaneous, and beneath them imports,
exports, or both.

### Advanced

**Advanced** (beside the red *clear* icon) opens two more tools.

**Filter text** — searches the words of the headings and cargos as transcribed.
Searching begins one second after you stop typing.

| Syntax | Meaning | Example |
|---|---|---|
| `*` | any number of characters | `tim*` → *timber*, *Timothy* |
| `?` | any single character | `j?h*n*` → *John*, *Johannes* |
| space | all of these words | `Marten de Lazera` |
| `"…"` | this exact phrase | `"de Lazera"` |
| `&` or `AND` | both terms | `Antwerp & barge` |
| `\|` or `OR` | either term | `Jansson OR silver` |
| `!` or `NOT` | excludes the term anywhere in the lading | `wool & !Antwerp` |
| `( )` | grouping | `(fish\|salt) & Yarm*th` |

A **lading ID** typed here (for example `3-5-A-0485`) shows that one record and
**ignores every other filter**.

**Kinds of goods** — every group as a tree, to browse rather than search.
*Any* keeps ladings carrying any selected group; *All* only those carrying
every one.

**Clear all filters** — the red icon at the right of the filter row.

## Sharing and export

The icons to the left of the tabs act on **the current filtered set**, not on
the whole corpus.

- **Link** — copies the page URL. The URL carries the filters *and* the open
  tab, so a link reproduces exactly what you are looking at.
- **Quotation mark** — copies a citation.
- **CSV** — the filtered ladings as a spreadsheet.
- **JSON** — the filtered ladings as data. *Right-click* to include annotations.
- **PDF** — prints the filtered table, keeping the colour coding. Cargos that
  do not name a chosen term, kind of goods or person are omitted.
