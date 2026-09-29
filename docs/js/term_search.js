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

    async function suggest(query) {
        await load();
        const q = fold(query);
        if (q.length < 2) return [];
        const chosen = new Set((filterState.termFilter || []).map(t => t.id));
        const out = [];
        for (const t of vocab) {
            if (chosen.has(t.id)) continue;
            const r = _rankTerm(t, q);
            if (r) out.push({t, ...r});
        }
        out.sort((a, b) => (a.tier - b.tier) || (b.t.n - a.t.n) || (a.form.length - b.form.length));
        return out.slice(0, MAX_SUGGEST);
    }

    // ---- UI ------------------------------------------------------------------------
    const esc = s => $("<div>").text(s == null ? "" : String(s)).html();

    function _position() {
        const wrap = document.getElementById("termSearchWrap");
        const out = document.getElementById("termSearchResults");
        if (!wrap || !out) return;
        const r = wrap.getBoundingClientRect();
        out.style.top = `${r.bottom}px`;
        out.style.left = `${r.left}px`;
        out.style.minWidth = `${Math.max(r.width, 320)}px`;
    }

    function _itemHtml(s, i) {
        const t = s.t;
        const via = s.tier === 4
            ? `<span class="term-via" title="a similar spelling (${Math.round(s.cos * 100)}% alike): ${esc(s.form)}">&asymp; ${esc(s.form)} &rarr;</span> `
            : fold(s.form) !== fold(t.label)
            ? `<span class="term-via">${esc(s.form)} &rarr;</span> ` : "";
        return `<button type="button" class="term-suggestion${i === active ? " active" : ""}"
                    data-i="${i}" role="option" aria-selected="${i === active}">
                    ${via}<strong>${esc(t.label)}</strong>
                    <span class="term-kind term-kind-${esc(t.kind)}">${esc(t.kind)}</span>
                    <span class="term-count">${t.n.toLocaleString()} lading${t.n === 1 ? "" : "s"}</span>
                    ${t.note && fold(t.note) !== fold(t.label) ? `<div class="term-note">${esc(t.note)}</div>` : ""}
                </button>`;
    }

    function _render() {
        const $out = $("#termSearchResults");
        if (!shown.length) {
            $out.html(`<div class="person-search-empty">No goods, measures or qualities match.</div>`);
        } else {
            $out.html(shown.map(_itemHtml).join(""));
        }
        _position();
        $out.show();
    }

    function _close() {
        shown = []; active = -1;
        $("#termSearchResults").hide().empty();
    }

    async function _onInput() {
        const q = $("#termSearchInput").val();
        const mine = ++seq;
        if (fold(q).length < 2) { _close(); return; }
        if (!vocab) {
            $("#termSearchResults").html(`<div class="person-search-empty">Loading the vocabulary…</div>`);
            _position(); $("#termSearchResults").show();
        }
        let res;
        try { res = await suggest(q); }
        catch (err) {
            $("#termSearchResults").html(`<div class="person-search-empty text-danger">The vocabulary could not be loaded: ${esc(err.message)}</div>`);
            return;
        }
        if (mine !== seq) return;          // a newer keystroke has already answered
        shown = res; active = res.length ? 0 : -1;
        if (res.length || fold(q).length < 3 || fzBroken) _render();
        else if (!fz) {
            $("#termSearchResults").html(`<div class="person-search-empty">Looking for similar spellings\u2026</div>`);
            _position(); $("#termSearchResults").show();
        }
        // Too few by spelling: add close spellings once the encoder is here. The text
        // answer is already on screen, so the first load (~3.2 MB) never blocks typing.
        if (res.length < MAX_SUGGEST && fold(q).length >= 3 && !fzBroken) {
            try { await loadFuzzy(); } catch (err) { if (mine === seq) _render(); return; }
            if (mine !== seq) return;
            const have = new Set([...res.map(s => s.t.id), ...(filterState.termFilter || []).map(t => t.id)]);
            const more = fuzzy(q, have);
            shown = res.concat(more).slice(0, MAX_SUGGEST);
            active = shown.length ? Math.max(active, 0) : -1;
            _render();
        }
    }

    async function choose(id) {
        await load();
        const t = byId.get(id);
        if (!t) return;
        const list = filterState.termFilter || [];
        if (!list.some(e => e.id === id)) list.push({id, label: t.label});
        filterState.termFilter = list;
        $("#termSearchInput").val("");
        _close();
        renderChips();
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    }

    async function remove(id) {
        filterState.termFilter = (filterState.termFilter || []).filter(e => e.id !== id);
        renderChips();
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    }

    async function clearAll() {
        if (!(filterState.termFilter || []).length) return;
        filterState.termFilter = [];
        renderChips();
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    }

    function renderChips() {
        const list = filterState.termFilter || [];
        const $row = $("#termFilterRow");
        const $chips = $("#termFilterChips");
        if (!list.length) { $chips.empty(); $row.addClass("d-none"); return; }
        $chips.html(list.map(e => {
            const t = byId && byId.get(e.id);
            const kind = t ? t.kind : "";
            return `<span class="badge term-filter-chip term-chip-${esc(kind)} me-1 mb-1" data-term-id="${esc(e.id)}"
                          title="${esc(t ? `${t.kind}: ${t.n.toLocaleString()} ladings` : e.id)}">
                        ${esc(e.label)}
                        <button type="button" class="btn-close btn-close-white btn-sm ms-2 term-chip-remove" aria-label="Remove"></button>
                    </span>`;
        }).join(""));
        $("#termModeToggle").toggleClass("d-none", list.length < 2)
            .find("input[value='" + (filterState.termMode === "OR" ? "OR" : "AND") + "']").prop("checked", true);
        $row.removeClass("d-none");
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
    $(document).on("focus", "#termSearchInput", () => { load().catch(() => {}); if (shown.length) _render(); });
    $(document).on("keydown", "#termSearchInput", function (e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (!shown.length) return;
            e.preventDefault();
            active = (active + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
            _render();
        } else if (e.key === "Enter" || (e.key === "Tab" && shown.length && $(this).val())) {
            if (active >= 0 && shown[active]) { e.preventDefault(); choose(shown[active].t.id); }
        } else if (e.key === "Escape") {
            _close();
        }
    });
    $(document).on("mousedown", ".term-suggestion", function (e) {
        e.preventDefault();                 // keep focus in the input until chosen
        const s = shown[+this.dataset.i];
        if (s) choose(s.t.id);
    });
    $(document).on("click", ".term-chip-remove", function (e) {
        e.stopPropagation();
        remove($(this).closest(".term-filter-chip").attr("data-term-id"));
    });
    $(document).on("click", "#clearTermsBtn", function (e) { e.preventDefault(); $(this).tooltip("hide"); clearAll(); });
    $(document).on("click", "#clearTermSearchBtn", function () { $("#termSearchInput").val("").trigger("focus"); _close(); });
    $(document).on("change", "#termModeToggle input", async function () {
        filterState.termMode = this.value === "OR" ? "OR" : "AND";
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    });
    $(document).on("click", e => { if (!$(e.target).closest("#termSearchWrap, #termSearchResults").length) _close(); });
    window.addEventListener("scroll", () => { if (shown.length) _position(); }, true);
    $(window).on("resize", () => { if (shown.length) _position(); });

    return {load, suggest, choose, remove, clearAll, renderChips, hydrate, fold, loadFuzzy,
            get ready() { return vocab !== null; }};
})();
