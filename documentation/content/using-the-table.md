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
- The **PDF icon** on a row opens the page image for that lading.

## Cargos

- Each lading heading carries a **`cargos` button**. Click it to open the list of
  cargos entered under that heading, and again to close it.
- A row you leave open **stays open** while you scroll, even though the table
  only keeps the visible rows in the page.
- With a **Commodities** filter active, the cargos that carry a selected group
  are highlighted, so you can see which part of a lading matched.
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
This is the way to follow one merchant through the corpus. The *Person* filter
box searches a single forename **or** surname; the name picker starts from an
actual person in an actual lading and gathers their variant spellings for you.
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

Filters combine: a lading must satisfy **all** of them to appear. The result
count sits beside the *Ladings* heading.

**Dates** — the two year selectors set the range. The arrow between them
reverses the sort order.

**Customs type** — wool, tunnage, petty, miscellaneous. Toggle each on or off.

**Direction** — imports, exports, or both.

**Person** — one **forename** *or* one **surname**.
- Forenames and surnames are indexed separately, so a full name such as
  `Marten de Lazera` will **not** match here.
- For a full name, use *Filter text* instead.

**Commodities** — a dropdown of commodity groups.
- *Any* keeps ladings carrying **any** selected group.
- *All* keeps only ladings carrying **every** selected group.

**Filter text** — searches the whole text of headings and cargos. Searching
begins one second after you stop typing.

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

**Clear all filters** — the red icon at the right of the filter row.

## Sharing and export

The icons to the left of the tabs act on **the current filtered set**, not on
the whole corpus.

- **Link** — copies the page URL. The URL carries the filters *and* the open
  tab, so a link reproduces exactly what you are looking at.
- **Quotation mark** — copies a citation.
- **CSV** — the filtered ladings as a spreadsheet.
- **JSON** — the filtered ladings as data. *Right-click* to include annotations.
- **PDF** — prints the filtered table, keeping the colour coding. Cargos
  irrelevant to an active Commodities or Person filter are omitted.
