# The Map

**[Open the Map](https://ihr-digital.github.io/london-customs-accounts-1380-1560/?view=map)** — opens in the site itself.

The Map shows the **corpus gazetteer**: every place the accounts name that can
be placed — 235 of them — drawn from the editors' own indices.

## The key

The key sits at the bottom right and lists every layer, with its source. Each
source name links to where the data came from; the attribution panel beneath the
key follows what you switch on, so it always credits exactly what you can see —
including staying quiet about a layer that is switched on but not yet drawn at
the current zoom.

| Layer | |
|---|---|
| **London** | a crown, always shown. Every voyage in the corpus touches it, so it has no switch. |
| **Places named in the accounts** | one disc per place, **sized by how often the accounts name it**. Calais is named 1,970 times; most places once or twice. |
| **Regions named in the accounts** | sixteen rows are areas rather than ports, drawn as outlines. Where possible the outline is **dated to the period** — the Kingdom of Portugal 1415–1801, not modern Portugal. |
| **Customs hierarchy, 1565** | a later administrative geography: head ports (drawn larger), the ports belonging to them and their creeks, with a dashed arc from each place to its head, as the Exchequer commissioners returned them (TNA E 159/350). The returns as they survive do not reach Wales, and Chester's members are not among them; the rest of the coast is covered in full. **Off by default.** |
| **Inland navigation** | navigable waterways. |
| **Water, c.1500** | the coastline and inland water of the period. |
| **Commodity provenance** | the places the goods are **named with** — a place word written beside them in the entry, as in *fili Colonie* or *pannis … de Vere*. **Off by default.** This is not a claim about where the goods were made: it is what the clerk wrote next to them, and whether it records an origin is a question for the curators, so each is recorded as *undecided* until one rules on it. Goods whose own **name** comes from a place — holland cloth, cambric, osnaburg — carry that place on the glossary concept rather than in the entry, and are deliberately **not** drawn here. |

## Using it

- **Click a place** for its popup: how often the accounts name it, the span of
  the volumes that do, the spellings they use (Calais appears as *Calesiam*,
  *Calisia*, *Caleys*, *Calecium*), and its external identifier.
- **Labels** — the busiest ports are labelled at every zoom; the rest appear as
  you zoom in, to keep the view readable.
- The view is **bounded to the gazetteer**: you cannot pan away from the places
  the accounts mention.

## Two ways to narrow what is shown

Both are at the foot of the key, and both are **off** by default. They answer the
same question — which places should be drawn — so **only one can be on at a
time**; switching one on greys the other out and says why.

### Follow the table filters

- Shows only the places evidenced by the ladings currently passing the
  [Table's](using-the-table.md) filters, and counts them.
- Updates as you change any filter on the Table.
- Switch it off to see the whole gazetteer again.

### Timeline

- Shows the places named in a **sliding ten-year window**.
- Drag the slider to move the window; the count line names the years.
- Where the corpus names no placeable port in a window, the map is empty and the
  key says **"no places named in 1404–1413"** rather than leaving you to wonder.
  There are long stretches like this.
- The slider starts at the first window that has places in it, and ends at the
  last.

:::{note}
A place counts as evidenced only if a **lading heading** names it — that is where
a ship's home port is recorded. A place mentioned only inside a cargo description
will not put a marker on the map.
:::
