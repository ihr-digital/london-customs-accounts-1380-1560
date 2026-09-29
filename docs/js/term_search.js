// term_search.js
//
// Search by what the cargos are tagged with -- goods, measures, qualities -- with
// typeahead. Step 3 of documentation/search_plan.md.
//
// "Filter text" matches the raw transcription only, so "wine" never found "vinum" and a
// glossary term could not be searched at all (user feedback, 29 Sep 2026). This box
// searches the vocabulary built by process/build_search_vocab.py: every concept, unit
// and qualifier the cargos are tagged with, with all its spellings (glossary forms,
// qualifier forms, AAT labels, the spellings actually tagged) and the number of ladings
// it selects. Choosing a suggestion adds a chip; chips filter the table on the
// per-lading `terms` (db_operations.js _collectLadingTerms, filter_and_sort.js) and are
// highlighted in the cargo text (annotations.js data-term, chart_and_table.js).
//
// Ranking, best tier first, then by ladings selected, then by the shorter spelling:
//   0 a spelling equals the query      2 a word in a spelling starts with it
//   1 a spelling starts with it        3 a spelling contains it
// Folding for matching: lower case, accents stripped, j->i and v->u (Latin spelling).
// The vocabulary is 0.15 MB and ~30k spellings, so this runs on the page, per keystroke.
// 4 a close spelling, by the project's character bi-encoder (step 4; fuzzy_encoder.js):
//   added below the text tiers when they give fewer than MAX_SUGGEST, cosine >= FUZZY_MIN,
//   loaded on first need (~3.2 MB once), marked "similar spelling". It was measured best of
//   every candidate on held-out glossary spellings (search_plan.md, step 0).

const TermSearch = (() => {
    const URL = "data/search/vocab.json.gz";
    const MAX_SUGGEST = 12;
    const FUZZY_MIN = 0.6;     // cosine floor for a "similar spelling" suggestion
    const FUZZY_MAX = 6;       // at most this many of them
    let fz = null, fzLoading = null, fzBroken = false;
    let headingPlaces = {};
    const headingMemo = new Map();          // lading_id -> Set of "pp:" / "s:" ids

    // process/build_search_vocab.py _norm and ship_key, exactly: the ids must agree.
    const normNFC = s => String(s || "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
    const shipKey = s => String(s || "").normalize("NFD").replace(/\p{Mn}/gu, "")
        .replace(/\s+/g, " ").trim().toLowerCase();

    // The ship and port named in a lading's heading, as term ids (search_plan.md step 8).
    // From the heading's annotations in the page rather than stored at load, so a gazetteer change needs no
    // database bump. Empty until the vocabulary is loaded (applyFilters awaits it first).
    function headingTerms(v) {
        let out = headingMemo.get(v.lading_id);
        if (out) return out;
        out = new Set();
        // The loader (db_operations.js) moves the heading's annotations from `label` to
        // `annotations` and deletes `label`; reading `label` found no ship or port at all
        // (harness `terms`, 29 Sep: page 0 against 190 ladings for the ship Mary).
        for (const a of (v.annotations || (v.label || {}).annotations || [])) {
            if (a.type === "place") {
                const key = headingPlaces[normNFC(a.text)];
                if (key) out.add("pp:" + key);
            } else if (a.type === "ship" && a.text) {
                const k = shipKey(a.text);
                if (k) out.add("s:" + k);
            }
        }
        if (vocab) headingMemo.set(v.lading_id, out);
        return out;
    }
    let vocab = null;          // [{id, kind, label, note, n, forms, folded}]
    let byId = null;
    let loading = null;
    let seq = 0;               // a stale answer never overwrites a newer one
    let active = -1;           // highlighted suggestion
    let shown = [];            // suggestions currently in the dropdown

    function fold(s) {
        return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
            .toLowerCase().replace(/j/g, "i").replace(/v/g, "u").replace(/\s+/g, " ").trim();
    }

    function load() {
        if (!loading) {
            loading = _fetchGzippedJson(URL, {revalidate: true}).then(data => {
                vocab = data.terms.map(t => ({...t, folded: t.forms.map(fold)}));
                byId = new Map(vocab.map(t => [t.id, t]));
                headingPlaces = data.heading_places || {};
                headingMemo.clear();
            }).catch(err => { loading = null; throw err; });
        }
        return loading;
    }

    function _rankTerm(t, q) {
        let best = null;
        t.folded.forEach((f, i) => {
            let tier = f === q ? 0 : f.startsWith(q) ? 1
                : f.split(/[\s-]+/).some(w => w.startsWith(q)) ? 2
                : f.includes(q) ? 3 : 9;
            if (tier < 9 && (!best || tier < best.tier ||
                             (tier === best.tier && f.length < best.form.length))) {
                best = {tier, form: t.forms[i]};
            }
        });
        return best;
    }

    async function _fetchGzBytes(url) {
        const resp = await fetch(url, {cache: "no-cache"});
        if (!resp.ok) throw new Error(`${url}: ${resp.status}`);
        const stream = resp.body.pipeThrough(new DecompressionStream("gzip"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    function loadFuzzy() {
        if (!fzLoading) {
            fzLoading = Promise.all([load(),
                _fetchGzippedJson("data/search/encoder.json.gz", {revalidate: true}),
                _fetchGzippedJson("data/search/fuzzy.json.gz", {revalidate: true}),
                _fetchGzBytes("data/search/fuzzy.i8.gz")])
            .then(([, model, meta, bytes]) => {
                const i8 = new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
                if (i8.length !== meta.n * meta.dim) throw new Error(`fuzzy.i8: ${i8.length} bytes for ${meta.n} x ${meta.dim}`);
                // THE ROWS POINT INTO vocab.json.gz BY POSITION. Built from another
                // vocabulary, they would name the wrong terms and still look plausible, so
                // spot-check that each sampled row's spelling is a spelling of its term.
                const enc = FuzzyEncoder.create(model);
                for (let k = 0; k < meta.rows.length; k += Math.max(1, Math.floor(meta.rows.length / 50))) {
                    const [ti, form] = meta.rows[k];
                    const t = vocab[ti];
                    if (!t || !t.forms.some(f => FuzzyEncoder.norm0(f) === form)) {
                        throw new Error(`fuzzy index row ${k} (${form}) is not a spelling of vocabulary term ${ti}: built from another vocabulary`);
                    }
                }
                fz = {enc, rows: meta.rows, i8, n: meta.n, dim: meta.dim, scale: meta.scale};
            })
            .catch(err => { fzBroken = true; console.warn("Fuzzy search disabled:", err); throw err; });
        }
        return fzLoading;
    }

    function fuzzy(query, exclude) {
        const q = FuzzyEncoder.norm0(query) || String(query).toLowerCase();
        if (Array.from(q).length < 3) return [];
        const z = fz.enc.embed(q);
        const cos = FuzzyEncoder.cosines(z, fz.i8, fz.n, fz.dim, fz.scale);
        const best = new Map();                          // term index -> {c, form}
        for (let r = 0; r < fz.n; r++) {
            const c = cos[r];
            if (c < FUZZY_MIN) continue;
            const ti = fz.rows[r][0];
            const b = best.get(ti);
            if (!b || c > b.c) best.set(ti, {c, form: fz.rows[r][1]});
        }
        return [...best.entries()]
            .map(([ti, b]) => ({t: vocab[ti], tier: 4, form: b.form, cos: b.c}))
            .filter(s => s.t && !exclude.has(s.t.id))
            .sort((a, b) => b.cos - a.cos)
            .slice(0, FUZZY_MAX);
    }

    async function suggest(query, limit = MAX_SUGGEST) {
        await load();
        const q = fold(query);
        if (q.length < 2) return [];
        const chosen = new Set([...(filterState.termFilter || []).map(t => t.id),
                                ...(filterState.groupFilter || []).map(g => "g:" + g)]);
        const out = [];
        for (const t of vocab) {
            if (chosen.has(t.id)) continue;
            const r = _rankTerm(t, q);
            if (r) out.push({t, ...r});
        }
        out.sort((a, b) => (a.tier - b.tier) || (b.t.n - a.t.n) || (a.form.length - b.form.length));
        return out.slice(0, limit);
    }

    // ---- UI: one search box for everything (search_plan.md step 8) ------------------
    //
    // Suggestions come in sections -- a lading reference, Goods (goods, groups, measures,
    // qualities), Places, Ships, People -- narrowed by the tabs at the top of the list.
    // People come from person_index.js (start of forename / surname) and, with the ear
    // switched on, from name_phonetic.js ("sounds like"). A plain click or Enter chooses and
    // closes; Ctrl/Cmd-click or Space on a person ticks them and KEEPS THE LIST OPEN, so
    // several people can be chosen at once (Stephen, 29 Sep). Groups go to the commodity-
    // group filter (commodity_filter.js), people to the person filter (name-picker.js),
    // everything else to the term filter; all their chips share the one Filters row.
    const esc = s => $("<div>").text(s == null ? "" : String(s)).html();
    const TABS = [["all", "All"], ["goods", "Goods"], ["places", "Places"], ["ships", "Ships"], ["people", "People"]];
    const TAB_KINDS = {goods: ["goods", "group", "measure", "quality"], places: ["place"], ships: ["ship"]};
    const LADING_RE = /^\s*(\d{1,2}-\d{1,2}-[A-Za-z]-\d{3,4})\s*$/;
    let tab = "all";
    let lastQuery = "";

    function _soundsLike() {
        try { return localStorage.getItem("mlca_sounds_like") === "1"; } catch (e) { return false; }
    }

    function _position() {
        const wrap = document.getElementById("termSearchWrap");
        const out = document.getElementById("termSearchResults");
        if (!wrap || !out) return;
        const r = wrap.getBoundingClientRect();
        out.style.top = `${r.bottom}px`;
        out.style.left = `${r.left}px`;
        out.style.minWidth = `${Math.max(r.width, 360)}px`;
    }

    function _personLabel(p) {
        const status = p.status && p.status !== "unknown" ? ` (${p.status})` : "";
        return `${p.forename || ""} ${p.surname || ""}${status}`.trim();
    }
    const _chosenPids = () => new Set((filterState.personFilter || []).map(e => String(e.pid)));

    function _itemHtml(s, i) {
        const cls = `term-suggestion${i === active ? " active" : ""}`;
        const aria = `data-i="${i}" role="option" aria-selected="${i === active}"`;
        if (s.type === "lading") {
            return `<button type="button" class="${cls}" ${aria}><i class="fas fa-arrow-right me-1"></i>
                Go to lading <strong>${esc(s.id)}</strong></button>`;
        }
        if (s.type === "person") {
            const p = s.p;
            const ticked = _chosenPids().has(String(p.pid));
            const via = s.h ? `<span class="term-via" title="sounds like: ${Math.round(s.h.score * 100)}%">&asymp; ${esc(s.h.form)} &rarr;</span> ` : "";
            const years = p.year_min ? `<span class="term-note-inline">${p.year_min}${p.year_max && p.year_max !== p.year_min ? "&ndash;" + p.year_max : ""}</span>` : "";
            return `<div class="${cls} term-person" ${aria}>
                <input type="checkbox" class="form-check-input me-2 term-person-tick" tabindex="-1" ${ticked ? "checked" : ""}
                       title="Tick to add without closing (or Ctrl/Cmd-click, or Space)">
                ${via}<strong>${esc(_personLabel(p))}</strong> ${years}
                <span class="term-kind term-kind-person">person</span>
                <span class="term-count">${(p.count || 0).toLocaleString()}&times;</span>
                <a href="#" class="term-similar ms-2" data-pid="${esc(p.pid)}" title="Similar names, weighted by when they were active">similar&hellip;</a>
            </div>`;
        }
        const t = s.t;
        const via = s.tier === 4
            ? `<span class="term-via" title="a similar spelling (${Math.round(s.cos * 100)}% alike)">&asymp; ${esc(s.form)} &rarr;</span> `
            : fold(s.form) !== fold(t.label) ? `<span class="term-via">${esc(s.form)} &rarr;</span> ` : "";
        return `<button type="button" class="${cls}" ${aria}>
                ${via}<strong>${esc(t.label)}</strong>
                <span class="term-kind term-kind-${esc(t.kind)}">${esc(t.kind)}</span>
                <span class="term-count">${t.n.toLocaleString()} lading${t.n === 1 ? "" : "s"}</span>
                ${t.note && fold(t.note) !== fold(t.label) ? `<div class="term-note">${esc(t.note)}</div>` : ""}
            </button>`;
    }

    const _section = s => s.type === "lading" ? "" : s.type === "person" ? "People"
        : s.t.kind === "place" ? "Places" : s.t.kind === "ship" ? "Ships" : "Goods";

    function _render(note) {
        const $out = $("#termSearchResults");
        const tabs = `<div class="term-tabs" role="tablist">${TABS.map(([k, l]) =>
            `<button type="button" class="term-tab${k === tab ? " active" : ""}" data-tab="${k}">${l}</button>`).join("")}
            <label class="term-sounds ms-auto" title="People: also names that sound alike (loads ~28 MB once)">
                <input type="checkbox" class="form-check-input me-1" id="termSoundsLike" ${_soundsLike() ? "checked" : ""}>
                <i class="fas fa-ear-listen"></i> sounds like</label></div>`;
        let body = "", sec = null;
        shown.forEach((s, i) => {
            const h = _section(s);
            if (h && h !== sec && tab === "all") body += `<div class="term-section">${h}</div>`;
            sec = h;
            body += _itemHtml(s, i);
        });
        if (!shown.length) body = `<div class="person-search-empty">${note || "Nothing matches."}</div>`;
        else if (note) body += `<div class="person-search-empty">${note}</div>`;
        $out.html(tabs + body);
        _position();
        $out.show();
    }

    function _close() {
        shown = []; active = -1;
        $("#termSearchResults").hide().empty();
    }

    async function _people(q, mine) {
        if (!(tab === "all" || tab === "people") || q.trim().length < 2) return [];
        let rows = [];
        try { rows = await PersonIndex.search(q, tab === "people" ? 25 : 6); } catch (e) { return []; }
        const out = rows.map(p => ({type: "person", p}));
        if (_soundsLike() && q.trim().length >= 3) {
            try {
                const hits = await NamePhonetic.search(q, 10);
                if (mine !== seq) return out;
                const seen = new Set(rows.map(p => String(p.pid)));
                for (const h of hits) {
                    for (const p of await PersonIndex.byPart(h.form, 5)) {
                        if (seen.has(String(p.pid))) continue;
                        seen.add(String(p.pid));
                        out.push({type: "person", p, h});
                    }
                    if (out.length >= (tab === "people" ? 40 : 12)) break;
                }
            } catch (e) { /* sounds-like unavailable: prefix matches stand */ }
        }
        return out;
    }

    async function _onInput() {
        const q = $("#termSearchInput").val();
        lastQuery = q;
        const mine = ++seq;
        if (fold(q).length < 2) { _close(); return; }
        if (!vocab) { shown = []; _render("Loading the vocabulary…"); }
        let terms;
        try { terms = await suggest(q, 40); }
        catch (err) { _render(`The vocabulary could not be loaded: ${esc(err.message)}`); return; }
        if (mine !== seq) return;
        const kinds = TAB_KINDS[tab];
        terms = (tab === "people") ? [] : terms.filter(s => !kinds || kinds.includes(s.t.kind))
            .map(s => ({type: "term", ...s}));
        const lading = LADING_RE.test(q) ? [{type: "lading", id: q.trim().toUpperCase()}] : [];
        const cap = tab === "all" ? 10 : MAX_SUGGEST * 2;
        const assemble = (people, fuzzyTerms = []) => {
            const t = terms.slice(0, cap).concat(fuzzyTerms);
            // Sections ordered by their BEST match, so an exact place ("calais": the port,
            // 1,753 ladings) is not listed below goods that merely begin alike; ties in the
            // fixed order Goods, Places, Ships, People. People are start-of-name (tier 1)
            // or sounds-like (tier 4) matches.
            const fixed = {Goods: 0, Places: 1, Ships: 2, People: 3};
            const items = t.concat(people);
            const tierOf = x => x.type === "person" ? (x.h ? 4 : 1) : x.tier;
            const best = {};
            for (const x of items) { const k = _section(x); best[k] = Math.min(best[k] ?? 9, tierOf(x)); }
            items.sort((a, b) => (best[_section(a)] - best[_section(b)])
                || ((fixed[_section(a)] ?? 0) - (fixed[_section(b)] ?? 0)));
            return lading.concat(items);
        };
        shown = assemble([]); active = shown.length ? 0 : -1;
        _render(shown.length ? "" : "Looking…");
        const people = await _people(q, mine);
        if (mine !== seq) return;
        shown = assemble(people); active = shown.length ? Math.min(Math.max(active, 0), shown.length - 1) : -1;
        _render(shown.length ? "" : (fold(q).length >= 3 && !fzBroken ? "Looking for similar spellings…" : "Nothing matches."));
        // Nothing matches exactly or at the start of a spelling: add close spellings (the
        // bi-encoder), once loaded. Not otherwise -- for "calais" they were steel, caul and
        // chalk, listed above the place itself (29 Sep).
        const direct = terms.some(s => s.tier <= 1) || people.some(x => !x.h);
        if (tab !== "people" && tab !== "ships" && !direct && fold(q).length >= 3 && !fzBroken) {
            try { await loadFuzzy(); } catch (err) { if (mine === seq) _render(shown.length ? "" : "Nothing matches."); return; }
            if (mine !== seq) return;
            const have = new Set([...terms.map(s => s.t.id), ...(filterState.termFilter || []).map(t => t.id)]);
            const more = fuzzy(q, have).filter(s => !kinds || kinds.includes(s.t.kind)).map(s => ({type: "term", ...s}));
            shown = assemble(people, more); active = shown.length ? Math.max(active, 0) : -1;
            _render(shown.length ? "" : "Nothing matches.");
        }
    }

    async function _commit() {
        renderChips();
        if (typeof renderPersonChips === "function") renderPersonChips();
        if (typeof syncCommodityFilterUI === "function") syncCommodityFilterUI();
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    }

    // Choose suggestion i. `keepOpen` (Ctrl/Cmd-click, Space) is for people: tick, stay open.
    async function pick(i, keepOpen = false) {
        const s = shown[i];
        if (!s) return;
        if (s.type === "lading") {
            $("#termSearchInput").val(""); _close();
            $("#advancedRow").removeClass("d-none");
            $("#searchInput").val(s.id);
            await applyFilters();
            return;
        }
        if (s.type === "person") {
            const pid = String(s.p.pid);
            let list = filterState.personFilter || [];
            if (list.some(e => String(e.pid) === pid)) {
                if (keepOpen) list = list.filter(e => String(e.pid) !== pid);   // untick
            } else {
                list = list.concat([{pid, label: _personLabel(s.p)}]);
            }
            filterState.personFilter = list;
            if (keepOpen) { _render(); } else { $("#termSearchInput").val(""); _close(); }
            await _commit();
            if (keepOpen) _render();
            return;
        }
        await choose(s.t.id);
    }

    async function choose(id) {
        await load();
        const t = byId.get(id);
        if (!t) return;
        if (id.startsWith("g:")) {
            const g = id.slice(2);
            const sel = new Set(filterState.groupFilter || []);
            sel.add(g);
            filterState.groupFilter = [...sel];
        } else {
            const list = filterState.termFilter || [];
            if (!list.some(e => e.id === id)) list.push({id, label: t.label});
            filterState.termFilter = list;
        }
        $("#termSearchInput").val("");
        _close();
        await _commit();
    }

    async function remove(id) {
        filterState.termFilter = (filterState.termFilter || []).filter(e => e.id !== id);
        await _commit();
    }

    async function clearAll() {
        if (!(filterState.termFilter || []).length) return;
        filterState.termFilter = [];
        await _commit();
    }

    // The Filters row shows whenever any of its three groups has chips.
    function updateFiltersRow() {
        const any = ["#termFilterRow", "#personFilterRow", "#commodityFilterRow"]
            .some(sel => { const el = document.querySelector(sel); return el && !el.classList.contains("d-none"); });
        $("#filtersRow").toggleClass("d-none", !any);
    }

    function renderChips() {
        const list = filterState.termFilter || [];
        const $row = $("#termFilterRow");
        const $chips = $("#termFilterChips");
        if (!list.length) { $chips.empty(); $row.addClass("d-none"); updateFiltersRow(); return; }
        $chips.html(list.map(e => {
            const t = byId && byId.get(e.id);
            const kind = t ? t.kind : "";
            const role = t && t.kind === "place" ? ` <span class="chip-role">${esc(t.note)}</span>` : "";
            return `<span class="badge term-filter-chip term-chip-${esc(kind)} me-1 mb-1" data-term-id="${esc(e.id)}"
                          title="${esc(t ? `${t.kind}${t.kind === "place" ? " (" + t.note + ")" : ""}: ${t.n.toLocaleString()} ladings` : e.id)}">
                        ${esc(e.label)}${role}
                        <button type="button" class="btn-close btn-close-white btn-sm ms-2 term-chip-remove" aria-label="Remove"></button>
                    </span>`;
        }).join(""));
        // all/any only matters when some kind has two or more chips
        const counts = {};
        list.forEach(e => { const k = termKind(e.id); counts[k] = (counts[k] || 0) + 1; });
        $("#termModeToggle").toggleClass("d-none", !Object.values(counts).some(n => n > 1))
            .find("input[value='" + (filterState.termMode === "AND" ? "AND" : "OR") + "']").prop("checked", true);
        $row.removeClass("d-none");
        updateFiltersRow();
    }

    // Labels for terms that arrived by URL or saved state carry only their id.
    async function hydrate() {
        if (!(filterState.termFilter || []).length) { renderChips(); return; }
        try { await load(); } catch (err) { renderChips(); return; }
        filterState.termFilter = filterState.termFilter.map(e => {
            const t = byId.get(e.id);
            return t ? {id: e.id, label: t.label} : e;
        });
        renderChips();
    }

    // ---- wiring --------------------------------------------------------------------
    $(document).on("input", "#termSearchInput", _onInput);
    $(document).on("focus", "#termSearchInput", () => {
        load().catch(() => {});
        if (typeof PersonIndex !== "undefined") PersonIndex.load().catch(() => {});
        if (shown.length) _render();
    });
    $(document).on("keydown", "#termSearchInput", function (e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (!shown.length) return;
            e.preventDefault();
            active = (active + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
            _render();
        } else if (e.key === " " && active >= 0 && shown[active] && shown[active].type === "person") {
            e.preventDefault();                       // Space ticks a person, list stays open
            pick(active, true);
        } else if (e.key === "Enter" || (e.key === "Tab" && shown.length && $(this).val())) {
            if (active >= 0 && shown[active]) { e.preventDefault(); pick(active, e.ctrlKey || e.metaKey); }
        } else if (e.key === "Escape") {
            _close();
        }
    });
    $(document).on("mousedown", "#termSearchResults .term-suggestion", function (e) {
        if ($(e.target).closest(".term-similar").length) return;
        e.preventDefault();                           // keep focus in the input
        const i = +this.dataset.i;
        const tick = $(e.target).is(".term-person-tick");
        pick(i, tick || e.ctrlKey || e.metaKey);
    });
    $(document).on("mousedown", "#termSearchResults .term-tab", function (e) {
        e.preventDefault();
        tab = this.dataset.tab;
        _onInput();
    });
    $(document).on("mousedown", "#termSearchResults .term-similar", function (e) {
        e.preventDefault();
        const pid = this.dataset.pid;
        _close();
        if (typeof openNamePicker === "function") openNamePicker(pid);
    });
    $(document).on("change", "#termSoundsLike", function () {
        try { localStorage.setItem("mlca_sounds_like", this.checked ? "1" : "0"); } catch (e) { /* per visit */ }
        if (this.checked && typeof NamePhonetic !== "undefined") NamePhonetic.load().catch(() => {});
        $("#termSearchInput").trigger("focus");
        _onInput();
    });
    $(document).on("mousedown", "#termSearchResults .term-sounds", e => e.stopPropagation());
    $(document).on("click", ".term-chip-remove", function (e) {
        e.stopPropagation();
        remove($(this).closest(".term-filter-chip").attr("data-term-id"));
    });
    $(document).on("click", "#clearTermsBtn", function (e) { e.preventDefault(); $(this).tooltip("hide"); clearAll(); });
    $(document).on("click", "#clearTermSearchBtn", function () { $("#termSearchInput").val("").trigger("focus"); _close(); });
    $(document).on("click", "#advancedToggle", function () {
        $(this).tooltip("hide");
        $("#advancedRow").toggleClass("d-none");
        $(this).toggleClass("active", !$("#advancedRow").hasClass("d-none"));
    });
    $(document).on("change", "#termModeToggle input", async function () {
        filterState.termMode = this.value === "AND" ? "AND" : "OR";
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    });
    $(document).on("click", e => { if (!$(e.target).closest("#termSearchWrap, #termSearchResults").length) _close(); });
    window.addEventListener("scroll", () => { if (shown.length) _position(); }, true);
    $(window).on("resize", () => { if (shown.length) _position(); });
    // The person and group modules toggle their own chip groups; keep the row in step.
    $(() => {
        ["personFilterRow", "commodityFilterRow"].forEach(id => {
            const el = document.getElementById(id);
            if (el) new MutationObserver(updateFiltersRow).observe(el, {attributes: true, attributeFilter: ["class"]});
        });
        // Advanced opens by itself when something in it is in force.
        if ((filterState.searchQuery || "").trim()) { $("#advancedRow").removeClass("d-none"); $("#advancedToggle").addClass("active"); }
        updateFiltersRow();
    });

    return {load, suggest, choose, pick, remove, clearAll, renderChips, hydrate, fold, loadFuzzy, headingTerms,
            updateFiltersRow, get ready() { return vocab !== null; }};
})();
