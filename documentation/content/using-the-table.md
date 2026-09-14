# The Table

The Table is the edition itself: one row per **lading** — a consignment entered
under a ship's heading — with its cargos beneath. Everything else on the site
shows the same set of ladings in another form, so **the filters described here
govern the Chart and the Map as well**.

## Reading a row

- **Dates** — the lading's date. Ladings the accounts leave undated are held
  back by the date filter; a note below the table says how many.
- **Categories** — the commodity groups the cargos fall into.
- **Ladings** — the heading and, indented under it, each cargo.
- **Annotations / Footnotes** — switches how the editors' apparatus is shown.
  - *Annotations*: names, places, ships, commodities and units highlighted in
    the text. Click a name to open that person; click a commodity for its
    glossary entry.
  - *Footnotes*: the editors' notes, as printed.
- The **PDF icon** on a row opens the page image for that lading.

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
