// map.js

/**
 * The map tab.
 *
 * The view is bounded to the gazetteer's own extent plus a margin, and the
 * projection is the default: a globe is a fine way to show the world and a poor
 * way to show the North Sea.
 *
 * The basemap is CARTO, with the project's own coastline tiles kept as a
 * fallback against the service being withdrawn. Detecting that withdrawal is
 * the awkward part, and the reason for probeCarto() below: CARTO does not fail
 * with an error when a key is absent, wrong, or used from the wrong origin. It
 * returns HTTP 200, correct headers, and the real map with "API KEY REQUIRED"
 * written diagonally across every tile. Nothing a tile-error handler can see.
 *
 * So the probe asks for a tile of open ocean, where a working basemap is a flat
 * wash of one colour, and counts how much of it is that colour. Measured: a
 * valid key gives 0.9996 uniformity over two distinct colours, an invalid one
 * 0.9655 over sixteen, because the watermark is text. The threshold sits between
 * them with room to spare.
 */

const CARTO_BASE = 'https://basemaps.cartocdn.com';

// Voyager without labels, and its labels as a separate overlay, so that the
// labels can be faint. They are anachronistic -- modern names on a map of the
// fifteenth century -- and are here to orient the reader, not to be read first.
const CARTO_STYLE = 'voyager_nolabels';
const CARTO_LABELS = 'voyager_only_labels';
const LABEL_OPACITY = 0.45;

// Open Atlantic at z4: no coastline, no label, nothing but sea.
const PROBE_TILE = '4/6/6';
const UNIFORM_ENOUGH = 0.99;

const seaColour = '#0b3b53';
const landColour = '#849552';

// CARTO Voyager's own sea, sampled from an open-ocean tile: rgb(213,232,235).
// The Viabundus wash has to be painted in the sea colour of whichever basemap is
// underneath it, or 2,559 historic water polygons read as a navy patchwork laid
// over a pale blue sea instead of as the sea itself.
const CARTO_SEA = '#d5e8eb';

const CARTO_ATTRIBUTION =
    '&copy; <a target="_blank" href="https://carto.com/attributions">CARTO</a>, ' +
    '&copy; <a target="_blank" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const FALLBACK_ATTRIBUTION =
    'Land: <a target="_blank" href="https://openstreetmap.org/copyright">OpenStreetMap</a>';


function cartoTiles(style, key) {
    return [`${CARTO_BASE}/rastertiles/${style}/{z}/{x}/{y}@2x.png` +
            (key ? `?key=${encodeURIComponent(key)}` : '')];
}


/**
 * Is CARTO actually serving us a basemap? Resolves true or false, never throws.
 */
async function probeCarto(key) {
    if (!key) return false;
    const url = `${CARTO_BASE}/rastertiles/${CARTO_STYLE}/${PROBE_TILE}@2x.png` +
        `?key=${encodeURIComponent(key)}`;
    try {
        const response = await fetch(url, {mode: 'cors', cache: 'no-store'});
        if (!response.ok) return false;
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        // A sample is enough, and cheaper than the whole tile.
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d', {willReadFrequently: true});
        context.drawImage(bitmap, 0, 0, size, size);
        const {data} = context.getImageData(0, 0, size, size);

        const counts = new Map();
        for (let i = 0; i < data.length; i += 4) {
            const key32 = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
            counts.set(key32, (counts.get(key32) || 0) + 1);
        }
        let commonest = 0;
        for (const n of counts.values()) if (n > commonest) commonest = n;
        const uniformity = commonest / (size * size);
        if (uniformity < UNIFORM_ENOUGH) {
            console.warn(`[map] CARTO tile is not a clean sea tile ` +
                `(uniformity ${uniformity.toFixed(4)}, ${counts.size} colours) — ` +
                `treating the basemap as unavailable and using the fallback.`);
            return false;
        }
        return true;
    } catch (error) {
        console.warn('[map] CARTO probe failed, using the fallback basemap:', error);
        return false;
    }
}


function cartoStyle(key) {
    return {
        version: 8,
        glyphs: `map-resources/{fontstack}/{range}.pbf`,
        sources: {
            basemap: {
                type: 'raster', tiles: cartoTiles(CARTO_STYLE, key), tileSize: 256,
                maxzoom: 20, attribution: CARTO_ATTRIBUTION,
            },
            basemap_labels: {
                type: 'raster', tiles: cartoTiles(CARTO_LABELS, key), tileSize: 256,
                maxzoom: 20,
            },
            viabundus_water: viabundusWaterSource(),
        },
        layers: [
            {id: 'sea-background', type: 'background', paint: {'background-color': CARTO_SEA}},
            {id: 'basemap', type: 'raster', source: 'basemap'},
            viabundusWaterLayer(CARTO_SEA),
            {
                id: 'basemap-labels', type: 'raster', source: 'basemap_labels',
                paint: {'raster-opacity': LABEL_OPACITY},
            },
        ],
    };
}


/**
 * The basemap this project drew for itself, kept against CARTO going away.
 */
function fallbackStyle() {
    return {
        version: 8,
        glyphs: `map-resources/{fontstack}/{range}.pbf`,
        sources: {
            coastlines: {
                type: 'vector',
                tiles: ['https://raw.githubusercontent.com/docuracy/Historical_Sea_Routing/main/osm-countries-tiles/{z}/{x}/{y}.mvt'],
                minzoom: 0, maxzoom: 10, tileSize: 512,
                attribution: FALLBACK_ATTRIBUTION,
            },
            viabundus_water: viabundusWaterSource(),
        },
        layers: [
            {id: 'sea-background', type: 'background', paint: {'background-color': seaColour}},
            {
                id: 'land-polygons', type: 'fill', source: 'coastlines',
                'source-layer': 'coastlines',
                paint: {'fill-color': landColour, 'fill-opacity': 1},
            },
            viabundusWaterLayer(seaColour),
        ],
    };
}


// Viabundus water sits over the basemap as an opaque wash, in both styles: it is
// the one layer here that is actually of the period.
//
// One local file, not remote vector tiles. process/viabundus_water.py drops
// everything east of the North Sea's Baltic approaches -- Lake Ladoga and the
// rivers of Novgorod, which no London customs account mentions -- and dissolves
// what remains into a single polygon. Tiles are simplified per zoom and clipped
// at their boundaries, so adjacent polygons stopped matching at the seams; a
// dissolved shape has no seams to mismatch.
function viabundusWaterSource() {
    return {
        type: 'geojson',
        data: './data/geo/viabundus-water-1500-west.geojson',
        attribution: 'Water c.1500: Holterman/<a target="_blank" href="https://www.landesgeschichte.uni-goettingen.de/handelsstrassen/info.php">Viabundus</a>',
    };
}

function viabundusWaterLayer(sea) {
    return {
        id: 'viabundus-water', type: 'fill', source: 'viabundus_water',
        paint: {'fill-color': sea, 'fill-opacity': 1},
    };
}


/**
 * The corpus gazetteer: every place the accounts name, that we can place.
 *
 * Written by process/gazetteer.py. A row with an outline is drawn as that
 * outline and labelled on it; only rows without one are drawn as points, sized
 * by how often the corpus names them.
 */
async function corpusGazetteer(map) {
    const response = await fetch('./data/geo/corpus-gazetteer.geojson');
    const data = await response.json();

    map.addSource('corpus-gazetteer', {
        type: 'geojson',
        data,
        attribution: 'Historic boundaries: ' +
            '<a target="_blank" href="https://www.openhistoricalmap.org/">' +
            'OpenHistoricalMap</a> (CC0)',
    });

    map.addLayer({
        id: 'gazetteer-areas', type: 'fill', source: 'corpus-gazetteer',
        filter: ['==', ['get', 'has_outline'], true],
        paint: {'fill-color': '#f0c86b', 'fill-opacity': 0.18},
    });
    map.addLayer({
        id: 'gazetteer-areas-outline', type: 'line', source: 'corpus-gazetteer',
        filter: ['==', ['get', 'has_outline'], true],
        paint: {'line-color': '#f0c86b', 'line-width': 1.4, 'line-opacity': 0.85},
    });

    // Radius by attestation count. sqrt, not linear: Calais is named 1,970 times
    // and Pevensey once, and a linear scale would make Calais a disc covering the
    // Channel or Pevensey invisible.
    // The floor matters more than the ceiling. A place named twice was drawing a
    // 3px disc, which is smaller than the cursor and smaller than the polygon it
    // often sits inside -- Amsterdam was unhittable under Holland. Nothing here
    // is below 7px, whatever its count.
    const radius = [
        'interpolate', ['linear'], ['sqrt', ['max', ['get', 'occurrences'], 1]],
        1, 7, 5, 9, 14, 13, 45, 22,
    ];
    map.addLayer({
        id: 'gazetteer-points', type: 'circle', source: 'corpus-gazetteer',
        filter: ['==', ['get', 'has_outline'], false],
        paint: {
            'circle-radius': radius,
            'circle-color': '#f0c86b',
            'circle-opacity': 0.75,
            'circle-stroke-color': '#3d2c00',
            'circle-stroke-width': 1,
        },
    });

    // One label per place, from its own source: see write_map_geojson().
    try {
        mapFilter.forms = await (await fetch('./data/geo/corpus-gazetteer-forms.json')).json();
        mapFilter.total = data.features.length;
        mapFilter.present = new Set(data.features.map(f => f.properties.id));
    } catch (error) {
        console.warn('[map] no corpus form index; filter mode unavailable:', error);
    }

    const labels = await (await fetch('./data/geo/corpus-gazetteer-labels.geojson')).json();
    map.addSource('corpus-gazetteer-labels', {type: 'geojson', data: labels});

    // Two label layers, not one. At the zoom that fits the whole gazetteer there
    // are 234 names inside the Channel and the southern North Sea, and
    // collision-dropping alone leaves an unreadable mat of them. The busiest
    // ports keep their names at every zoom; the rest appear once there is room
    // for them, which is what zooming in is for.
    const labelLayer = (id, filter, minzoom) => ({
        id, type: 'symbol', source: 'corpus-gazetteer-labels', filter,
        ...(minzoom ? {minzoom} : {}),
        layout: {
            'text-field': ['get', 'title'],
            'text-font': [fontName],
            // Bigger names for better-attested places, so the eye finds the ports
            // that matter before the ones mentioned once.
            'text-size': ['interpolate', ['linear'],
                ['sqrt', ['max', ['get', 'occurrences'], 1]], 1, 13, 14, 19, 45, 26],
            'text-offset': [0, 0.9],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'symbol-sort-key': ['-', 0, ['get', 'occurrences']],
        },
        paint: {
            // A heavy halo, because the label has to read over a pale CARTO sea
            // and a dark fallback landmass alike, and over the gazetteer's own
            // discs. Weight is what makes it legible, not colour.
            'text-color': '#fffaf0',
            'text-halo-color': '#1a2630',
            'text-halo-width': 2.2,
            'text-halo-blur': 0.3,
        },
    });

    const BUSY = 25;
    map.addLayer(labelLayer('gazetteer-labels',
        ['>=', ['get', 'occurrences'], BUSY], 0));
    map.addLayer(labelLayer('gazetteer-labels-minor',
        ['<', ['get', 'occurrences'], BUSY], 5.5));

    // ONE handler, with an explicit order of precedence. Registering a handler
    // per layer fires every handler under the cursor, so clicking a port inside
    // a region opened two popups and the region -- registered second -- won.
    // Every point in Normandy was unclickable that way, and the ports inside
    // Spain, Holland and Portugal with them.
    const PICKABLE = ['gazetteer-points', 'gazetteer-areas'];
    {
        map.on('click', event => {
            const here = map.queryRenderedFeatures(event.point, {layers: PICKABLE})
                .filter(f => map.getLayoutProperty(f.layer.id, 'visibility') !== 'none');
            if (!here.length) return;
            // A point beats the area it stands in; between two areas, the smaller.
            const point = here.find(f => f.layer.id === 'gazetteer-points');
            const chosen = point || here[0];
            const p = chosen.properties;
            const volumes = Array.isArray(p.volumes) ? p.volumes : JSON.parse(p.volumes || '[]');
            // The span of the volumes naming this place. One year when they all
            // fall in the same accounting year, which is worth saying plainly
            // rather than printing "1519-1519".
            const span = p.first_year && p.last_year
                ? (String(p.first_year) === String(p.last_year)
                    ? `${p.first_year}` : `${p.first_year}–${p.last_year}`)
                : '';
            new maplibregl.Popup({offset: 10})
                .setLngLat(event.lngLat)
                .setHTML(
                    `<strong>${p.title}</strong><br>` +
                    `${p.occurrences} occurrence${p.occurrences === 1 ? '' : 's'}` +
                    (span ? `, ${span}` : '') +
                    (p.variants ? `<br><small><em>${p.variants}</em></small>` : '') +
                    (volumes.length ? `<br><small>${volumes.join(', ')}</small>` : '') +
                    (p.match ? `<br><small>${p.match}</small>` : ''))
                .addTo(map);
        });
        for (const layer of PICKABLE) {
            map.on('mouseenter', layer, () => map.getCanvas().style.cursor = 'pointer');
            map.on('mouseleave', layer, () => map.getCanvas().style.cursor = '');
        }
    }
}


/**
 * The rectangle the corpus occupies, with room to breathe.
 *
 * Taken from the gazetteer rather than written down, so it follows the data: the
 * western edge is the Azores and the southern is the Moroccan coast, both of
 * which a reader would not guess. Beyond it there is nothing to see, and letting
 * the map roam the whole globe to show empty ocean is what the limit is for.
 */
const BUFFER_DEGREES = 3;

async function gazetteerBounds() {
    try {
        const response = await fetch('./data/geo/corpus-gazetteer-labels.geojson');
        const {features} = await response.json();
        let west = 180, south = 90, east = -180, north = -90;
        for (const feature of features) {
            const [lon, lat] = feature.geometry.coordinates;
            west = Math.min(west, lon); east = Math.max(east, lon);
            south = Math.min(south, lat); north = Math.max(north, lat);
        }
        if (west > east) return null;
        return [
            [Math.max(-180, west - BUFFER_DEGREES), Math.max(-85, south - BUFFER_DEGREES)],
            [Math.min(180, east + BUFFER_DEGREES), Math.min(85, north + BUFFER_DEGREES)],
        ];
    } catch (error) {
        console.warn('[map] could not read the gazetteer bounds:', error);
        return null;
    }
}


/**
 * The key, and the switches that belong with it.
 *
 * A map with five overlays and no legend asks the reader to infer what a small
 * yellow disc means. Customs ports start OFF: they are a different century's
 * administrative geography and they crowd the places the accounts actually name,
 * which is what this map is for.
 *
 * London is listed but has no switch. Every voyage in the corpus touches it, so
 * it is not one layer among others, and it stays visible when everything else is
 * turned off.
 */
const KEY_ENTRIES = [
    {
        label: 'Places named in the accounts', swatch: 'disc', colour: '#f0c86b',
        layers: ['gazetteer-points', 'gazetteer-labels',
                 'gazetteer-labels-minor'], on: true,
        note: 'sized by how often they are named',
    },
    {
        label: 'Regions named in the accounts', swatch: 'area', colour: '#f0c86b',
        layers: ['gazetteer-areas', 'gazetteer-areas-outline'], on: true,
        note: 'historic boundaries, dated where possible',
    },
    {
        label: 'Customs ports, 1566', swatch: 'disc', colour: '#d62f2f',
        layers: ['customs-ports-clusters', 'customs-ports-cluster-count',
                 'customs-ports-unclustered-point', 'customs-ports-labels'],
        on: false, note: 'a later administrative geography',
    },
    {
        label: 'Inland navigation', swatch: 'line', colour: '#0b3b53',
        layers: ['navigable-waterways'], on: true, note: 'Oksanen, 2019',
    },
    {
        label: 'Water, c.1500', swatch: 'area', colour: '#8fb8c4',
        layers: ['viabundus-water'], on: true, note: 'Viabundus',
    },
    {label: 'London', swatch: 'crown', layers: [], on: true, fixed: true},
];

// Not a layer, so not a layer switch: it changes which places every gazetteer
// layer shows, rather than whether one of them is drawn.
const FILTER_MODE = {
    label: 'Follow the table filters',
    note: 'show only places the filtered table evidences',
};

const KEY_CSS = `
.map-key{background:rgba(255,255,255,.93);border-radius:6px;padding:8px 10px;
  font:12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  box-shadow:0 1px 4px rgba(0,0,0,.3);max-width:15rem}
.map-key h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;
  letter-spacing:.07em;color:#666;font-weight:600}
.map-key label{display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;
  cursor:pointer}
.map-key label.fixed{cursor:default;opacity:.85}
.map-key input{margin:2px 0 0;flex:0 0 auto}
.map-key .sw{flex:0 0 14px;width:14px;height:14px;margin-top:1px}
.map-key .sw.disc{border-radius:50%;border:1px solid #3d2c00}
.map-key .sw.area{border-radius:2px;opacity:.55;border:1px solid #3d2c00}
.map-key .sw.line{height:0;border-top:3px solid;margin-top:8px}
.map-key .nm{flex:1}
.map-key .note{display:block;color:#777;font-size:10.5px}`;


function mapKey(map) {
    if (!document.getElementById('map-key-css')) {
        const style = document.createElement('style');
        style.id = 'map-key-css';
        style.textContent = KEY_CSS;
        document.head.appendChild(style);
    }

    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group map-key';
    container.innerHTML = '<h4>Key</h4>';

    const show = (entry, on) => {
        for (const id of entry.layers) {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
            }
        }
    };

    for (const entry of KEY_ENTRIES) {
        const label = document.createElement('label');
        if (entry.fixed) label.className = 'fixed';

        if (!entry.fixed) {
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.checked = entry.on;
            box.addEventListener('change', () => show(entry, box.checked));
            label.appendChild(box);
        } else {
            const spacer = document.createElement('span');
            spacer.style.cssText = 'width:13px;flex:0 0 13px';
            label.appendChild(spacer);
        }

        const swatch = document.createElement('span');
        swatch.className = 'sw ' + entry.swatch;
        if (entry.swatch === 'line') {
            swatch.style.borderTopColor = entry.colour;
        } else if (entry.swatch === 'crown') {
            // The crown stands for a marker, not a colour, so it needs to be
            // read as a shape at swatch size rather than merely seen.
            swatch.textContent = '\u265B';
            swatch.style.cssText = 'flex:0 0 20px;width:20px;color:#e1c060;' +
                'font-size:20px;line-height:1;margin-top:-2px;' +
                'text-shadow:0 0 1px rgba(0,0,0,.55)';
        } else {
            swatch.style.background = entry.colour;
        }
        label.appendChild(swatch);

        const name = document.createElement('span');
        name.className = 'nm';
        name.textContent = entry.label;
        if (entry.note) {
            const note = document.createElement('span');
            note.className = 'note';
            note.textContent = entry.note;
            name.appendChild(note);
        }
        label.appendChild(name);
        container.appendChild(label);

        // Apply the starting state, so "default off" is a fact about the map and
        // not just about the checkbox.
        show(entry, entry.on);
    }

    // Bottom right, stacked above the attribution: the bottom left corner sat
    // over the Channel approaches, which is where this corpus is busiest.
    const rule = document.createElement('div');
    rule.style.cssText = 'border-top:1px solid #e2e2e2;margin:7px 0 6px';
    container.appendChild(rule);

    const mode = document.createElement('label');
    const modeBox = document.createElement('input');
    modeBox.type = 'checkbox';
    modeBox.checked = mapFilter.on;
    modeBox.addEventListener('change', () => {
        mapFilter.on = modeBox.checked;
        applyMapFilter(map);
    });
    mode.appendChild(modeBox);
    const modeName = document.createElement('span');
    modeName.className = 'nm';
    modeName.textContent = FILTER_MODE.label;
    const modeNote = document.createElement('span');
    modeNote.className = 'note';
    modeNote.textContent = FILTER_MODE.note;
    modeName.appendChild(modeNote);
    const count = document.createElement('span');
    count.className = 'note';
    count.id = 'map-filter-count';
    modeName.appendChild(count);
    mode.appendChild(modeName);
    container.appendChild(mode);

    map.addControl({onAdd: () => container, onRemove: () => container.remove()},
        'bottom-right');
}


/**
 * Fit the gazetteer, and forbid wandering away from it.
 *
 * maxBounds cannot simply be the gazetteer's rectangle. MapLibre keeps the
 * VIEWPORT inside maxBounds, and a viewport is a different shape from the data:
 * given a wide box in a tall window it raises the minimum zoom until the box
 * fills the window, so the far edges become unreachable. Passing the data's own
 * bounds therefore produces a map that cannot show all of the data -- which is
 * what Stephen found.
 *
 * So the limit is derived from what a fitted view actually covers. The camera
 * that fits the gazetteer is measured, the ground it shows is read back, and
 * THAT -- padded a little -- becomes the limit. The whole gazetteer is then
 * visible without panning, by construction, and there is a margin to move in.
 */
function limitToGazetteer(map, bounds) {
    if (!bounds) return;
    const before = {center: map.getCenter(), zoom: map.getZoom(),
                    bearing: map.getBearing(), pitch: map.getPitch()};
    const fitted = map.cameraForBounds(bounds, {padding: 40});
    if (!fitted) return;

    // Measure, do not calculate: jump there, read the ground covered, come back.
    map.jumpTo(fitted);
    const shown = map.getBounds();
    const west = shown.getWest(), east = shown.getEast();
    const south = shown.getSouth(), north = shown.getNorth();
    const room = 0.08;
    const padX = (east - west) * room, padY = (north - south) * room;

    map.setMaxBounds([
        [Math.max(-180, west - padX), Math.max(-85, south - padY)],
        [Math.min(180, east + padX), Math.min(85, north + padY)],
    ]);
    map.setMinZoom(Math.max(0, fitted.zoom - 0.35));

    // A hash in the URL is somebody's saved view, and outranks the default fit.
    const restored = location.hash.startsWith('#') && location.hash.length > 3;
    if (restored) {
        map.jumpTo(before);
    } else {
        map.jumpTo(fitted);
    }
    window.mapFitted = fitted.zoom;
}


/**
 * Filter mode: show only the places the filtered table actually evidences.
 *
 * Off by default. The map's usual job is to show the gazetteer, and a map that
 * silently hides most of it because a filter is set elsewhere would be a
 * puzzle rather than a view; switching it on is how you ask the question.
 *
 * A lading names its port in its heading, in the spelling of the account --
 * "Brekilsey", "Pennerke", "London'". corpus-gazetteer-forms.json is what turns
 * those into gazetteer rows; nothing else in the browser can.
 */
const GAZETTEER_LAYERS = {
    'gazetteer-areas': ['==', ['get', 'has_outline'], true],
    'gazetteer-areas-outline': ['==', ['get', 'has_outline'], true],
    'gazetteer-points': ['==', ['get', 'has_outline'], false],
    'gazetteer-labels': ['>=', ['get', 'occurrences'], 25],
    'gazetteer-labels-minor': ['<', ['get', 'occurrences'], 25],
};

const mapFilter = {
    on: false,
    forms: null,          // corpus spelling -> place id
    ladings: null,        // whatever the table last showed
    seen: new WeakMap(),  // lading object -> its place ids, computed once
};


function placesIn(ladings) {
    const ids = new Set();
    if (!mapFilter.forms) return ids;
    for (const lading of ladings) {
        let mine = mapFilter.seen.get(lading);
        if (!mine) {
            mine = [];
            // In the browser a lading is FLAT -- `text` and `annotations` at the
            // top level. The .json.gz on disk nests them under `label`, and
            // reading the file's shape instead of the page's is why the first
            // version of this matched nothing at all while looking as though it
            // worked. The fallback keeps both shapes usable.
            const annotations = lading.annotations
                || (lading.label && lading.label.annotations) || [];
            for (const a of annotations) {
                if (a.type !== 'place') continue;
                const id = mapFilter.forms[a.text] || mapFilter.forms[(a.text || '').toLowerCase()];
                if (id) mine.push(id);
            }
            // Cached on the lading object itself: the same 33,000 objects are
            // re-filtered on every keystroke, and their annotations never change.
            mapFilter.seen.set(lading, mine);
        }
        for (const id of mine) ids.add(id);
    }
    // Only places the map actually draws. The form index covers the whole
    // gazetteer, including London (its own crown), the rows no ship sailed from
    // and the ones a curator refused to place -- so without this the tally read
    // "291 of 235", which is not a number anyone should have to interpret.
    if (mapFilter.present) {
        for (const id of [...ids]) if (!mapFilter.present.has(id)) ids.delete(id);
    }
    return ids;
}


function applyMapFilter(map) {
    if (!map || !map.getLayer('gazetteer-points')) return;
    const active = mapFilter.on && mapFilter.ladings;
    const ids = active ? [...placesIn(mapFilter.ladings)] : null;
    for (const [layer, base] of Object.entries(GAZETTEER_LAYERS)) {
        if (!map.getLayer(layer)) continue;
        map.setFilter(layer, active
            ? ['all', base, ['in', ['get', 'id'], ['literal', ids]]]
            : base);
    }
    const note = document.getElementById('map-filter-count');
    if (note) {
        note.textContent = active
            ? `${ids.length} of ${mapFilter.total || '?'} places in the current table`
            : '';
    }
    window.mapFilterActive = !!active;
    window.mapFilterIds = ids ? ids.length : null;
}


/**
 * Called by the table whenever its filters change. Safe before the map exists.
 */
window.mlcaTableFiltered = function (ladings) {
    mapFilter.ladings = ladings;
    if (window._map) applyMapFilter(window._map);
};


async function initMap() {
    if (window._mapInitialized) return;
    window._mapInitialized = true;

    const key = window.cartoKey ? window.cartoKey() : null;
    const [carto, bounds] = await Promise.all([probeCarto(key), gazetteerBounds()]);
    window.mapBasemap = carto ? 'carto' : 'fallback';
    window.mapBounds = bounds;

    const map = new maplibregl.Map({
        container: 'map',
        style: carto ? cartoStyle(key) : fallbackStyle(),
        hash: true,
        attributionControl: {compact: true},
    });

    window.londonCoordinates = [-0.0817, 51.5084];

    map.on('style.load', async () => {
        londonMarker(map);
        limitToGazetteer(map, bounds);

        await lines(
            './data/geo/oksanen-navigable-waterways-2019.geojson',
            map,
            'navigable-waterways',
            'Inland Navigation: <a target="_blank" href="https://archaeologydataservice.ac.uk/archives/collections/view/1003427/index.cfm">Oksanen, 2019</a>',
            seaColour
        );

        // Customs ports are the one set of place points kept: they are the
        // administrative frame the accounts were kept within. The Viabundus
        // settlements, Index Villaris and landing places came off with the
        // overland routes -- a modern road network and three gazetteers of
        // everywhere were burying the places the corpus actually names.
        await clusterPoints(
            './data/geo/gadd-customs-ports.geojson',
            map,
            'customs-ports',
            'Customs Ports 1566: <a target="_blank" href="https://github.com/docuracy/Elizabethan_Coastal_Surveys_1565">Gadd</a>'
        );

        await corpusGazetteer(map);
        mapKey(map);
        applyMapFilter(map);

        window.mlcaMapReady = true;
    });

    map
        .addControl(new maplibregl.NavigationControl({visualizePitch: true}), 'top-right')
        .addControl(new maplibregl.FullscreenControl(), 'top-right')
        .addControl(new maplibregl.GeolocateControl({
            positionOptions: {enableHighAccuracy: true},
            trackUserLocation: true
        }), 'top-right')
        .addControl(new maplibregl.ScaleControl({maxWidth: 100, unit: 'metric'}));

    window._map = map;
}
