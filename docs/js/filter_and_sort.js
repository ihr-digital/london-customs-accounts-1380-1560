// filter_and_sort.js

function tokenize(input) {
    const tokens = [];
    // A "quoted phrase" (kept whole), a paren, AND/OR (& |), NOT (!), or a run of
    // chars. `!` is excluded from the bare-word class so that `!Antwerp` tokenises as
    // NOT followed by Antwerp, which is how people actually type it.
    const re = /\s*("(?:[^"\\]|\\.)*"|\(|\)|\bAND\b|\bOR\b|\bNOT\b|&|\||!|[^\s()&|!]+)/gi;
    let match;

    while ((match = re.exec(input)) !== null) {
        const token = match[1].trim();
        if (!token) continue;

        const up = token.toUpperCase();
        if (up === 'AND' || token === '&') { tokens.push('AND'); continue; }
        if (up === 'OR' || token === '|') { tokens.push('OR'); continue; }
        if (up === 'NOT' || token === '!') { tokens.push('NOT'); continue; }
        if (token === '(' || token === ')') { tokens.push(token); continue; }

        if (token[0] === '"') {
            // Quoted phrase -> a single literal term (spaces preserved).
            const phrase = token.replace(/^"|"$/g, '').replace(/\\"/g, '"').trim();
            if (phrase) tokens.push(phrase);
        } else {
            // Bare word -> strip any stray quotes ("de lazera" typed as de lazer").
            const w = token.replace(/"/g, '');
            if (w) tokens.push(w);
        }
    }

    return tokens;
}


// Recursive-descent parser for the filter mini-language. It is deliberately
// forgiving: adjacent terms are joined with an implicit AND (so a plain
// multi-word query like `Marten de Lazera` just works), and it never throws on
// malformed input (unbalanced parens / trailing operators degrade gracefully),
// so a half-typed query can't break the whole filter.
function parse(tokens) {
    let pos = 0;

    function parseExpression() {
        let node = parseTerm();

        while (pos < tokens.length && tokens[pos] !== ')') {
            let op;
            if (tokens[pos] === 'AND' || tokens[pos] === 'OR') {
                op = tokens[pos++];
            } else {
                op = 'AND';   // implicit AND between adjacent terms
            }
            const right = parseTerm();
            node = {type: op, left: node, right};
        }

        return node;
    }

    function parseTerm() {
        // Unary NOT, and `!!x` folds back to `x` rather than being a parse error.
        if (tokens[pos] === 'NOT') {
            pos++;
            return {type: 'NOT', operand: parseTerm()};
        }
        const token = tokens[pos++];

        if (token === '(') {
            const expr = parseExpression();
            if (tokens[pos] === ')') pos++;   // tolerate a missing close paren
            return expr;
        }
        // token may be undefined (dangling operator) -> matches nothing.
        return {type: 'TERM', value: token};
    }

    if (tokens.length === 0) return {type: 'TERM', value: ''};
    return parseExpression();
}

function compileRegex(term) {
    if (!term) return /$a/; // match nothing
    const escaped = term.replace(/([.+^${}()|[\]\\])/g, "\\$1");
    const pattern = "\\b" + escaped.replace(/\*/g, "\\w*").replace(/\?/g, "\\w") + "\\b";
    return new RegExp(pattern, "gi");
}

function evaluate(ast, text) {
    switch (ast.type) {
        case 'TERM':
            const re = compileRegex(ast.value);
            return re.test(text);

        case 'AND':
            return evaluate(ast.left, text) && evaluate(ast.right, text);

        case 'OR':
            return evaluate(ast.left, text) || evaluate(ast.right, text);

        case 'NOT':
            return !evaluate(ast.operand, text);
    }
}

// The negated subtrees of a query, for the record-level exclusion pass.
//
// WHY A SEPARATE PASS. A lading matches if its OWN text matches, or if ANY ONE of its
// cargos does — each evaluated independently. Under that rule `wool & !Antwerp` would
// keep a lading with one cargo of wool and another of Antwerp cloth, because the wool
// cargo satisfies the query on its own. That is not what anyone means by "not
// Antwerp": exclusion is about the record, not about one line of it. So NOT is
// evaluated twice — inside `evaluate` for the text at hand, and again here across the
// lading and every one of its cargos, where a single hit removes the whole record.
function collectNegated(ast, out = []) {
    if (!ast) return out;
    if (ast.type === 'NOT') {
        out.push(ast.operand);
        return out;                 // nested negations belong to this subtree
    }
    if (ast.type === 'AND' || ast.type === 'OR') {
        collectNegated(ast.left, out);
        collectNegated(ast.right, out);
    }
    return out;
}

// Declare a variable outside the function to hold the *current* AbortController.
// This allows subsequent calls to `applyFilters` to abort previous ones.
let currentFilterAbortController = null;

// How many slices to cut the year range into. Twenty gives a percentage that
// moves often enough to read without multiplying the index lookups to a point
// where they show up in the timings.
const LADING_READ_SLICES = 20;

// Cached because the count is an index scan of its own -- 443ms, worth paying
// once for an honest denominator, not on every filter change.
let _ladingRangeCounts = new Map();

async function countLadingsByYear(minYear, maxYear, signal) {
    const key = minYear + ':' + maxYear;
    if (_ladingRangeCounts.has(key)) return _ladingRangeCounts.get(key);
    const n = await db.ladings.where('customs_year').between(minYear, maxYear).count();
    if (!signal || !signal.aborted) _ladingRangeCounts.set(key, n);
    return n;
}

async function readLadingsByYear(minYear, maxYear, passes, signal) {
    const total = await countLadingsByYear(minYear, maxYear, signal);
    if (signal && signal.aborted) return [];
    const span = Math.max(1, maxYear - minYear + 1);
    const step = Math.max(1, Math.ceil(span / LADING_READ_SLICES));
    const out = [];
    let read = 0;
    for (let y = minYear; y <= maxYear; y += step) {
        const hi = Math.min(y + step - 1, maxYear);
        const slice = await db.ladings.where('customs_year')
            .between(y, hi, true, true).toArray({ signal });
        if (signal && signal.aborted) return [];
        read += slice.length;
        for (const v of slice) if (passes(v)) out.push(v);
        setLoadingProgress(total ? read / total : 1,
            read.toLocaleString() + ' of ' + total.toLocaleString() + ' ladings read');
        // Hand the frame back so the label actually paints; without this the
        // percentage is computed and never seen.
        await new Promise(r => setTimeout(r, 0));
    }
    setLoadingProgress(1, 'building the table\u2026');
    return out;
}

// The spinner already says "Loading..."; give it something that changes.
function setLoadingProgress(fraction, label) {
    const el = document.querySelector('#loadingSpinner .spinner-label');
    if (!el) return;
    const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
    el.textContent = label ? pct + '% \u2014 ' + label : pct + '%';
}

// The cargo text for every lading, lower-cased, read once and kept. 33,548 rows
// of nothing but text: about 20MB against the 280MB of cargo records it
// replaces, and only touched when there is a text query to answer.
let _searchText = null;
async function cargoTextIndex(signal) {
    if (_searchText) return _searchText;
    const rows = await db.ladingText.toArray({signal});
    const m = new Map();
    for (const r of rows) m.set(r.lading_id, r.texts || []);
    if (!signal || !signal.aborted) _searchText = m;
    return m;
}

async function applyFilters() {
    // 1. Abort any previous ongoing operation
    if (currentFilterAbortController) {
        currentFilterAbortController.abort();
    }

    // 2. Create a new AbortController for this operation
    currentFilterAbortController = new AbortController();
    const signal = currentFilterAbortController.signal;

    $("#loadingSpinner").show();

    const [minYear, maxYear] = [$("#yearStart").val(), $("#yearEnd").val()].map(Number);
    const showImports = $("#toggleImport").is(":checked");
    const showExports = $("#toggleExport").is(":checked");
    const currentSearchQuery = $("#searchInput").val();
    const selectedAnnotationMode = $('input[name="annotationMode"]:checked').val();

    let finalFilteredLadings = [];
    // How many ladings passed every filter except the date, and so are not shown.
    let undatedHeldBack = 0;

    // Every shape a lading_id actually takes, checked against all 33,548 of them:
    //
    //   `\d+` for volume AND book. A single digit each excluded every book from 10
    //   upwards — II-10 to II-12, IV-10 to IV-25, 18,384 ladings, more than half the
    //   corpus. Those fell through to the text search, which happens to find dated
    //   ladings because the lading_id is folded into its haystack, but is itself
    //   range-filtered and so could never reach one with no usable date (#41).
    //
    //   An optional trailing `-A`. Eight ladings carry an appended letter
    //   (3-5-A-0504-A, 4-25-A-0145-A, …) — real records with dates and cargos,
    //   interpolated into a sequence that was already numbered. Widening the volume
    //   and book alone still left these eight unreachable.
    //
    // A cargo id (2-4-A-0086-0007) deliberately does NOT match: the trailing group is
    // letters, so a cargo falls through to the text search rather than being handed to
    // db.ladings.get, which would find nothing.
    const ladingIdPattern = /^\d+-\d+-[A-Z]-\d{4}(?:-[A-Z]+)?$/i;
    const isLadingIdSearch = currentSearchQuery && ladingIdPattern.test(currentSearchQuery.trim());

    try {
        if (isLadingIdSearch) {
            // Direct lookup by lading_id
            // Pass the signal to the Dexie get() method
            // Upper-cased because the pattern above is case-insensitive but the
            // stored key is not: a lowercase `3-5-a-0504-a` matched the pattern, went
            // to db.ladings.get, missed, and returned "no ladings" without ever
            // reaching the text search that would have found it.
            const lading = await db.ladings.get(currentSearchQuery.trim().toUpperCase(), { signal });
            finalFilteredLadings = lading ? [lading] : [];
        } else {
            // 1. Initial filter: Get all ladings that match customs_year and visibleTypes
            // Pass the signal to the Dexie toArray() method
            // Type and direction, as a named predicate so the undated ladings below can
            // be put through exactly the same test rather than a copy of it.
            const passesTypeAndDirection = v =>
                visibleTypes.has(v.customs_type) &&
                (
                    (v.export === true && showExports) ||
                    (v.export === false && showImports) ||
                    ((v.export === undefined || v.export === null) && showImports && showExports) // Include ladings with no export info
                );

            // Read the range in slices rather than one toArray, so the wait can
            // be reported. This is where the time goes: 33,415 ladings averaging
            // 10kB each is 330MB of objects to deserialise, six seconds on a warm
            // database and half a minute on a cold one -- against 0.2s to build
            // the table HTML from them and 0.3s to insert it. The silence after
            // the download progress bar clears is THIS, not rendering.
            //
            // Slicing costs nothing: measured at 6,394ms in twenty slices against
            // 6,550ms in one, which is noise. The yield between slices is what
            // lets the label repaint.
            let baseFilteredLadings = await readLadingsByYear(
                minYear, maxYear, passesTypeAndDirection, signal);

            // THE UNDATED JOIN THE PIPELINE HERE AND LEAVE IT AT THE END. They cannot
            // come from the range query — a null customs_year is not indexed — but
            // every filter after this one (person, commodity group, text) applies to
            // them exactly as it does to everything else, so the number reported as
            // held back is the number that would have been SHOWN but for the date,
            // rather than a flat 133 that ignores the filters in force. They are
            // partitioned out again just before rendering (#41).
            baseFilteredLadings = baseFilteredLadings.concat(
                datelessLadings.filter(passesTypeAndDirection));

            // Check if the operation was aborted after the first DB call
            if (signal.aborted) return;

            // Apply person filter (selected canonical persons -> ladings via reverse index).
            // This must run before the text-AST stage so subsequent filters narrow further.
            if (filterState.personFilter && filterState.personFilter.length > 0) {
                const pids = filterState.personFilter.map(p => String(p.pid));
                const rows = await db.personLadings.where("pid").anyOf(pids).toArray({ signal });
                if (signal.aborted) return;
                const allowed = new Set(rows.map(r => r.lading_id));
                baseFilteredLadings = baseFilteredLadings.filter(v => allowed.has(v.lading_id));
            }

            // Commodity-group filter (empty selection = all). Runs on the
            // precomputed per-lading `groups` union so no cargo fetch is needed.
            // OR: keep a lading carrying ANY selected group; AND: carrying ALL.
            const groupSel = filterState.groupFilter || [];
            if (groupSel.length > 0) {
                const sel = new Set(groupSel);
                const requireAll = filterState.groupMode === "AND";
                baseFilteredLadings = baseFilteredLadings.filter(v => {
                    const lg = v.groups;
                    if (!lg || lg.length === 0) return false;
                    if (requireAll) {
                        for (const g of sel) if (!lg.includes(g)) return false;
                        return true;
                    }
                    return lg.some(g => sel.has(g));
                });
            }

            if (currentSearchQuery && currentSearchQuery.trim()) {
                const matchedLadingsMap = new Map();

                // Build a matcher from the query. If anything goes wrong, fall
                // back to a plain case-insensitive substring test so the filter
                // still works instead of erroring out.
                let matches;
                let negated = [];
                try {
                    const ast = parse(tokenize(currentSearchQuery));
                    matches = (text) => evaluate(ast, text);
                    negated = collectNegated(ast);
                } catch (e) {
                    const needle = currentSearchQuery.trim().toLowerCase();
                    matches = (text) => text.includes(needle);
                }
                const excluded = (text) => negated.some(n => evaluate(n, text));

                baseFilteredLadings.forEach(v => {
                    const fullText = `${v.text} ${v.customs_type} ${v.lading_id}`.toLowerCase();
                    if (matches(fullText)) {
                        matchedLadingsMap.set(v.lading_id, v);
                    }
                });

                // B. Test the cargo text of everything the lading's own fields did
                //    not already match. This used to be one indexed query per
                //    lading -- 33,415 of them for a term that matches nothing, and
                //    22 seconds -- each one deserialising cargo records whose
                //    annotations are 94% of their weight and are never searched.
                //    One read of the text index answers all of them.
                const searchText = await cargoTextIndex(signal);
                if (signal.aborted) return;
                baseFilteredLadings.forEach(v => {
                    if (matchedLadingsMap.has(v.lading_id)) return;
                    const texts = searchText.get(v.lading_id);
                    if (texts && texts.some(t => matches(t))) {
                        matchedLadingsMap.set(v.lading_id, v);
                    }
                });

                finalFilteredLadings = Array.from(matchedLadingsMap.values());

                // Record-level exclusion, only when the query actually negates
                // something — it costs a cargo fetch per surviving lading, and every
                // query without a `!` should pay nothing for this.
                if (negated.length > 0) {
                    const texts = await cargoTextIndex(signal);
                    if (signal.aborted) return;
                    finalFilteredLadings = finalFilteredLadings.filter(v => {
                        const fullText = `${v.text} ${v.customs_type} ${v.lading_id}`.toLowerCase();
                        if (excluded(fullText)) return false;
                        const ts = texts.get(v.lading_id);
                        return !(ts && ts.some(t => excluded(t)));
                    });
                }

            } else {
                finalFilteredLadings = baseFilteredLadings;
            }

            // Check if the operation was aborted before final sorting/rendering
            if (signal.aborted) return;

            // Partition. An undated lading has no business appearing under a date, so
            // it stays out of the table — but the count now says how many are being
            // held back, and "show them" swaps the two halves so they can actually be
            // read. Sorting by primary_date puts them in an arbitrary order among
            // themselves, which is honest: there is no date to sort them by.
            const isUndated = v => v.customs_year === null || v.customs_year === undefined;
            const undated = finalFilteredLadings.filter(isUndated);
            finalFilteredLadings = filterState.showUndated
                ? undated
                : finalFilteredLadings.filter(v => !isUndated(v));
            undatedHeldBack = filterState.showUndated ? 0 : undated.length;

            finalFilteredLadings.sort((a, b) => {
                const field = currentSort.field;
                const order = currentSort.order === 'asc' ? 1 : -1;
                return a[field] > b[field] ? order : a[field] < b[field] ? -order : 0;
            });
        }

        renderTable(finalFilteredLadings, undatedHeldBack);
        $('#exportButtons i.fa-file-code').parent('span').data('data-export', finalFilteredLadings);

        if (!isLadingIdSearch) {
            $(".lading-text").each(function () {
                highlightMatches($(this), currentSearchQuery);
            })
        }

        filterState.visibleTypes = Array.from(visibleTypes);
        filterState.import = showImports;
        filterState.export = showExports;
        filterState.yearRange = [minYear, maxYear];
        filterState.sort = currentSort;
        filterState.searchQuery = currentSearchQuery;
        filterState.annotationMode = selectedAnnotationMode;
        // Deliberately NOT persisted: "show me the undated ones" is a glance, not a
        // filter to be restored on the next visit or handed to somebody in a link.
        const persistable = {...filterState};
        delete persistable.showUndated;

        localStorage.setItem("LCA_FilterState", JSON.stringify(persistable));

        updateURLFromFilterState();

        // RENDER COUNTER FOR HEADLESS CHECKS (tools/pages/shot.py), behind `?debug`.
        // A filter is applied 1s after typing stops and then renders asynchronously,
        // so a harness that samples the DOM after a fixed sleep reads either the old
        // table or a half-built one. Bumping a counter at the point the table has
        // actually been rewritten lets a check wait on the render it asked for
        // rather than on the clock.
        if (window.mlca) {
            window.mlca.renders = (window.mlca.renders || 0) + 1;
            window.mlca.rows = $("#ladingTable tbody tr").length;
            window.mlca.resultCount = $("#resultCount").text();
        }

    } catch (error) {
        // 3. Catch the AbortError
        if (error.name === 'AbortError') {
            console.log('Filter operation was aborted.');
            return;
        }
        // Handle other unexpected errors
        console.error("Error during filter application:", error);
    } finally {
        // 4. Ensure the spinner is hidden and controller reference cleared
        if (currentFilterAbortController && currentFilterAbortController.signal === signal) {
            $("#loadingSpinner").hide();
            currentFilterAbortController = null; // Clear reference once done
        }
    }
}

// Every customs type on, which is what an unconfigured visit should show. Called
// whenever neither the URL nor localStorage has said otherwise: `visibleTypes` starts
// as an empty Set (globals.js), and applyFilters keeps only ladings whose type is in
// it, so an unseeded Set means an empty table over the whole corpus (#39).
function seedDefaultTypes() {
    filterState.visibleTypes = customsTypes.map(t => t.short);
    visibleTypes = new Set(filterState.visibleTypes);
}

function loadFilterState() {
    if (loadFilterStateFromURL()) {
        return;
    }
    const saved = localStorage.getItem("LCA_FilterState");
    if (!saved) {
        seedDefaultTypes();
        return;
    }
    try {
        const state = JSON.parse(saved);
        filterState = state;
        if (!Array.isArray(filterState.personFilter)) {
            filterState.personFilter = [];
        }
        if (!Array.isArray(filterState.groupFilter)) {
            filterState.groupFilter = [];
        }
        if (filterState.groupMode !== "AND") {
            filterState.groupMode = "OR";
        }
        // A state saved before the defaults existed carries neither direction, and
        // assigning it wholesale above has just replaced them with undefined.
        if (typeof filterState.import !== "boolean") filterState.import = true;
        if (typeof filterState.export !== "boolean") filterState.export = true;
        // A saved state with no types at all is a state from before this was fixed,
        // not a user who deliberately unticked all four — restore the default rather
        // than hand them the empty table again on every visit.
        visibleTypes = new Set(state.visibleTypes || []);
        if (visibleTypes.size === 0) seedDefaultTypes();
        // MIGRATE A STATE SAVED BY THE BROKEN BUILD. Before #39 was fixed, neither
        // year <select> had a selected option, so both reported the first — and the
        // page then SAVED that as a deliberate-looking range of [1380, 1380]. A
        // returning visitor would carry it for ever and keep seeing an empty table,
        // because a zero-width range is perfectly valid and there is nothing in it to
        // tell the difference. Only states written before the version marker existed
        // are touched, and only when the range is zero-width; once migrated, a
        // genuine single-year filter is saved with the marker and respected exactly.
        if (state.v !== FILTER_STATE_VERSION) {
            if (Array.isArray(state.yearRange) && state.yearRange.length === 2
                && state.yearRange[0] === state.yearRange[1]) {
                console.info("Discarding a zero-width year range saved by an earlier build");
                state.yearRange = [];
                filterState.yearRange = [];
            }
            filterState.v = FILTER_STATE_VERSION;
        }
        if (state.yearRange?.length === 2) {
            yearRange = [...state.yearRange];
        }
        if (state.sort) {
            currentSort = state.sort;
        }
        if (state.searchQuery) {
            filterState.searchQuery = state.searchQuery;
            $("#searchInput").val(state.searchQuery);
        }
        if (state.annotationMode) {
            filterState.annotationMode = state.annotationMode;
            $('input[name="annotationMode"][value="' + state.annotationMode + '"]').prop('checked', true);
        }
    } catch (err) {
        console.warn("Failed to load filter state:", err);
        seedDefaultTypes();
    }
}

function updateURLFromFilterState() {
    const params = new URLSearchParams();
    if (filterState.visibleTypes.length > 0) {
        params.set("types", filterState.visibleTypes.join(","));
    }
    if (!filterState.import) {
        params.set("in", "false");
    }
    if (!filterState.export) {
        params.set("out", "false");
    }
    if (filterState.yearRange.length === 2) {
        params.set("range", filterState.yearRange.join(","));
    }
    if (filterState.sort?.field && filterState.sort?.order) {
        params.set("sort", `${filterState.sort.field},${filterState.sort.order}`);
    }
    if (filterState.searchQuery) {
        params.set("q", filterState.searchQuery);
    }
    if (filterState.annotationMode) {
        params.set("mode", filterState.annotationMode);
    }
    if (filterState.personFilter && filterState.personFilter.length > 0) {
        params.set("persons", filterState.personFilter.map(p => p.pid).join(","));
    }
    // Group names contain commas, so join with "~" (never present in a name).
    if (filterState.groupFilter && filterState.groupFilter.length > 0) {
        params.set("groups", filterState.groupFilter.join("~"));
        if (filterState.groupMode === "AND") {
            params.set("gmode", "AND");
        }
    }
    // Which of Table / Chart / Map is open is part of where you are, so it
    // belongs in the link you send someone.
    if (window.mlcaView && window.mlcaView !== "table") {
        params.set("view", window.mlcaView);
    }
    // KEEP THE HASH. This function is called on every filter change and used to
    // write `pathname?params`, discarding the fragment -- which is where MapLibre
    // keeps the map's position, so panning the map and then touching a filter
    // silently threw the view away.
    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    history.replaceState({}, "", newUrl);
}

function loadFilterStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    const types = params.get("types");
    const showImports = params.get("in") !== "false";
    const showExports = params.get("out") !== "false";
    const range = params.get("range");
    const sort = params.get("sort");
    const query = params.get("q");
    const mode = params.get("mode");
    const persons = params.get("persons");
    const groups = params.get("groups");
    const gmode = params.get("gmode");
    // ASK WHETHER THE PARAMETERS ARE PRESENT, not what they evaluate to. `showImports`
    // and `showExports` are `true` precisely when their parameters are ABSENT, so the
    // old form of this guard (`!showImports && !showExports && ...`) could never hold:
    // it always returned true, the localStorage branch of loadFilterState was dead
    // code, and nothing ever seeded visibleTypes on a first visit (#39).
    const KEYS = ["types", "in", "out", "range", "sort", "q", "mode", "persons",
                  "groups", "gmode"];
    if (!KEYS.some(k => params.has(k))) {
        return false;
    }
    if (types) {
        filterState.visibleTypes = types.split(",");
        visibleTypes = new Set(filterState.visibleTypes);
    } else {
        // A shared link like `?q=wool` carries no types; without this it would open
        // on an empty table for the same reason a first visit did.
        seedDefaultTypes();
    }
    filterState.import = showImports;
    filterState.export = showExports;
    if (range) {
        const parts = range.split(",").map(Number);
        if (parts.length === 2 && parts.every(n => !isNaN(n))) {
            filterState.yearRange = parts;
            yearRange = parts;
        }
    }
    if (sort) {
        const [field, order] = sort.split(",");
        if (field && order) {
            filterState.sort = {field, order};
            currentSort = {field, order};
        }
    }
    if (query) {
        filterState.searchQuery = query;
        $("#searchInput").val(query); // Set the input field value
    }
    if (mode) {
        filterState.annotationMode = mode;
        $('input[name="annotationMode"][value="' + mode + '"]').prop('checked', true);
    }
    if (persons) {
        // Hydrate {pid, label} from the persons table once Dexie is ready.
        // We seed with pid-only entries; hydratePersonFilterLabels() upgrades them.
        const pids = persons.split(",").filter(Boolean);
        filterState.personFilter = pids.map(pid => ({pid, label: `pid:${pid}`}));
    }
    if (groups) {
        filterState.groupFilter = groups.split("~").filter(Boolean);
    }
    filterState.groupMode = gmode === "AND" ? "AND" : "OR";
    return true;
}

async function hydratePersonFilterLabels() {
    const list = filterState.personFilter || [];
    if (list.length === 0) return;
    const pids = list.map(e => String(e.pid));
    try {
        const rows = await db.persons.bulkGet(pids);
        const byPid = new Map(rows.filter(Boolean).map(r => [String(r.pid), r]));
        filterState.personFilter = list.map(e => {
            const r = byPid.get(String(e.pid));
            if (!r) return e;
            const status = r.status && r.status !== "unknown" ? ` (${r.status})` : "";
            return {pid: String(e.pid), label: `${r.forename || ""} ${r.surname || ""}${status}`.trim()};
        });
        if (typeof renderPersonChips === "function") renderPersonChips();
    } catch (err) {
        console.warn("Failed to hydrate person filter labels:", err);
    }
}