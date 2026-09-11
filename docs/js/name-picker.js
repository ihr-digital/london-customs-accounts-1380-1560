// name-picker.js
//
// Modal for picking canonical persons (groups in the reconciliation dataset) and
// turning them into a person-filter on the ladings/cargos table.
//
// Public surface:
//   openNamePicker(pid)            — open the modal seeded with that pid
//   renderPersonChips(container)   — repaint the active filter chips
//   removePersonFromFilter(pid)    — splice and re-apply
//
// Persistence is handled by filter_and_sort.js (URL & localStorage); we just mutate
// filterState.personFilter and call applyFilters().

(function () {
    const MODAL_ID = "namePickerModal";

    let _modalEl = null;
    let _modalInstance = null;
    let _seedPid = null;
    let _checked = new Map();    // pid → label (for ALL ticked candidates including seed)

    function _personLabel(person) {
        const status = person.status && person.status !== "unknown" ? ` (${person.status})` : "";
        return `${person.forename || ""} ${person.surname || ""}${status}`.trim();
    }

    function _scoreBadge(score) {
        if (score >= 0.95) return `<span class="badge bg-success">${score.toFixed(3)}</span>`;
        if (score >= 0.85) return `<span class="badge bg-primary">${score.toFixed(3)}</span>`;
        if (score >= 0.75) return `<span class="badge bg-warning text-dark">${score.toFixed(3)}</span>`;
        return `<span class="badge bg-secondary">${score.toFixed(3)}</span>`;
    }

    function _yearBadge(person) {
        const a = person.year_min, b = person.year_max;
        if (!a && !b) return "";
        const txt = (a === b) ? `${a}` : `${a}–${b}`;
        return `<span class="badge bg-light text-dark border ms-1">${txt}</span>`;
    }

    function _countBadge(person) {
        if (!person.count || person.count <= 1) return "";
        return `<span class="badge bg-light text-dark border ms-1" title="Number of records in this cluster">×${person.count}</span>`;
    }

    function _variantsLine(person) {
        if (!person.variants || person.variants.length <= 1) return "";
        const others = person.variants.slice(1, 4).map(v => `<span class="text-muted">${$('<div>').text(v[0]).html()}</span>`).join(", ");
        return `<div class="small text-muted ms-4">also: ${others}</div>`;
    }

    function _personRowHtml(person, options = {}) {
        const pid = person.pid;
        const checked = _checked.has(pid) ? "checked" : "";
        const seedClass = options.seed ? " name-picker-seed" : "";
        const score = options.score !== undefined ? `${_scoreBadge(options.score)} ` : "";
        const label = $('<div>').text(_personLabel(person)).html();
        return `
            <div class="form-check name-picker-row${seedClass}" data-pid="${pid}">
                <input class="form-check-input name-picker-check" type="checkbox" id="np_${pid}" ${checked}>
                <label class="form-check-label w-100" for="np_${pid}">
                    ${score}<strong>${label}</strong>${_yearBadge(person)}${_countBadge(person)}
                    ${_variantsLine(person)}
                </label>
            </div>
        `;
    }

    function _ensureModal() {
        if (_modalEl) return _modalEl;
        const html = `
        <div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Find similar people</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="name-picker-seed-block mb-3"></div>
                <div class="mb-2">
                  <label class="form-label small text-muted mb-1">Search other people (forename or surname)</label>
                  <input type="search" class="form-control form-control-sm name-picker-search" placeholder="Type at least 2 characters…">
                  <div class="name-picker-search-results mt-2"></div>
                </div>
                <hr>
                <div class="text-muted small mb-1">Closest matches by phonetic and orthographic similarity, weighted by lifespan overlap:</div>
                <div class="name-picker-neighbours"></div>
              </div>
              <div class="modal-footer">
                <span class="me-auto small text-muted name-picker-count">0 selected</span>
                <button type="button" class="btn btn-outline-secondary btn-sm name-picker-clear-btn">Clear all</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary name-picker-apply-btn">Apply filter</button>
              </div>
            </div>
          </div>
        </div>`;
        $("body").append(html);
        _modalEl = document.getElementById(MODAL_ID);
        _modalInstance = new bootstrap.Modal(_modalEl);

        // Delegated checkbox handler
        $(_modalEl).on("change", ".name-picker-check", function () {
            const pid = $(this).closest(".name-picker-row").data("pid");
            const pidStr = String(pid);
            if (this.checked) {
                const label = $(this).closest(".name-picker-row").find("label strong").text() || pidStr;
                _checked.set(pidStr, label);
            } else {
                _checked.delete(pidStr);
            }
            _updateCount();
        });

        // Search box
        let searchDebounce;
        $(_modalEl).on("input", ".name-picker-search", function () {
            const q = $(this).val().trim();
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => _runSearch(q), 250);
        });

        // Apply
        $(_modalEl).on("click", ".name-picker-apply-btn", _applyFilter);

        // Clear all
        $(_modalEl).on("click", ".name-picker-clear-btn", () => {
            _checked.clear();
            $(_modalEl).find(".name-picker-check").prop("checked", false);
            _updateCount();
        });

        return _modalEl;
    }

    function _updateCount() {
        const n = _checked.size;
        $(_modalEl).find(".name-picker-count").text(`${n} selected`);
    }

    async function _runSearch(q) {
        const $out = $(_modalEl).find(".name-picker-search-results");
        if (q.length < 2) { $out.empty(); return; }

        const lower = q.toLowerCase();
        // Dexie's startsWithIgnoreCase requires per-key resolution; chain via .or().
        let rows = [];
        try {
            rows = await db.persons
                .where("forename").startsWithIgnoreCase(q)
                .or("surname").startsWithIgnoreCase(q)
                .or("surname_key").startsWithIgnoreCase(q)
                .limit(50)
                .toArray();
        } catch (err) {
            console.warn("Person search failed:", err);
            $out.html(`<div class="text-danger small">Search error: ${err.message}</div>`);
            return;
        }

        // Exclude the seed and any already-shown neighbours from the search list to avoid clutter
        const neighbourPids = new Set(
            $(_modalEl).find(".name-picker-neighbours .name-picker-row").map(function () {
                return String($(this).data("pid"));
            }).get()
        );
        if (_seedPid !== null) neighbourPids.add(String(_seedPid));

        rows = rows.filter(r => !neighbourPids.has(String(r.pid)));

        if (rows.length === 0) {
            $out.html(`<div class="text-muted small">No matches.</div>`);
            return;
        }
        $out.html(rows.map(p => _personRowHtml(p)).join(""));
    }

    async function _applyFilter() {
        // Build the new personFilter array. Preserve existing entries that weren't touched
        // by this modal session (i.e. selected from another click) by merging with what's
        // already in filterState.
        const next = [];
        const seen = new Set();
        for (const [pid, label] of _checked.entries()) {
            if (seen.has(pid)) continue;
            seen.add(pid);
            next.push({pid, label});
        }
        // Also keep any pre-existing filter entries that the user didn't see in this modal —
        // preserve them so opening the modal twice doesn't reset prior selections.
        for (const entry of (filterState.personFilter || [])) {
            if (!seen.has(String(entry.pid)) && !_uiSawPid(entry.pid)) {
                next.push(entry);
                seen.add(String(entry.pid));
            }
        }
        filterState.personFilter = next;

        _modalInstance.hide();

        renderPersonChips();
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    }

    function _uiSawPid(pid) {
        const pidStr = String(pid);
        return $(_modalEl).find(`.name-picker-row[data-pid="${pidStr}"]`).length > 0;
    }

    async function openNamePicker(pid) {
        if (pid === undefined || pid === null) return;
        _ensureModal();

        _seedPid = String(pid);

        // Seed _checked with whatever is already in filterState.personFilter
        _checked = new Map();
        (filterState.personFilter || []).forEach(e => _checked.set(String(e.pid), e.label));

        $(_modalEl).find(".name-picker-search").val("");
        $(_modalEl).find(".name-picker-search-results").empty();
        $(_modalEl).find(".name-picker-seed-block").html(`<div class="text-muted small">Loading…</div>`);
        $(_modalEl).find(".name-picker-neighbours").empty();

        _modalInstance.show();

        // Look up the seed person
        const seed = await db.persons.get(_seedPid);
        if (!seed) {
            $(_modalEl).find(".name-picker-seed-block").html(
                `<div class="alert alert-warning mb-0">Could not find this person in the index (pid=${_seedPid}).</div>`
            );
            return;
        }

        // Pre-tick the seed
        if (!_checked.has(_seedPid)) {
            _checked.set(_seedPid, _personLabel(seed));
        }

        $(_modalEl).find(".name-picker-seed-block").html(_personRowHtml(seed, {seed: true}));

        // Look up neighbours
        const neighbourMeta = (seed.neighbours || []);
        const ids = neighbourMeta.map(n => n.id);
        let nrows = [];
        if (ids.length > 0) {
            nrows = (await db.persons.bulkGet(ids)).filter(Boolean);
        }
        const byId = new Map(nrows.map(p => [String(p.pid), p]));

        const html = neighbourMeta.map(n => {
            const p = byId.get(String(n.id));
            if (!p) return "";
            return _personRowHtml(p, {score: n.score});
        }).join("");

        if (html) {
            $(_modalEl).find(".name-picker-neighbours").html(html);
        } else {
            $(_modalEl).find(".name-picker-neighbours").html(
                `<div class="text-muted small">No close neighbours found.</div>`
            );
        }
        _updateCount();
    }

    function renderPersonChips() {
        const $chips = $("#personFilterChips");
        const $row = $("#personFilterRow");
        if (!$chips.length) return;
        const list = filterState.personFilter || [];
        if (list.length === 0) {
            $chips.empty();
            $row.addClass("d-none");
            return;
        }
        const html = list.map(e => {
            const label = $('<div>').text(e.label || `pid:${e.pid}`).html();
            const pid = $('<div>').text(e.pid).html();
            return `<span class="badge person-filter-chip me-1 mb-1" data-pid="${pid}">
                ${label}
                <button type="button" class="btn-close btn-close-white btn-sm ms-2 person-chip-remove" aria-label="Remove"></button>
            </span>`;
        }).join("");
        $chips.html(html);
        $row.removeClass("d-none");
    }

    async function removePersonFromFilter(pid) {
        const pidStr = String(pid);
        filterState.personFilter = (filterState.personFilter || []).filter(e => String(e.pid) !== pidStr);
        renderPersonChips();
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    }

    async function clearAllPersonFilters() {
        if (!filterState.personFilter || filterState.personFilter.length === 0) return;
        filterState.personFilter = [];
        renderPersonChips();
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    }

    // ----- Inline person search (filter row alongside "Filter text") -----

    function _personResultHtml(person) {
        const label = $('<div>').text(_personLabel(person)).html();
        return `
            <button type="button" class="person-search-result" data-pid="${person.pid}">
                <strong>${label}</strong>${_yearBadge(person)}${_countBadge(person)}
                ${_variantsLine(person)}
            </button>
        `;
    }

    function _positionInlineDropdown() {
        const wrap = document.getElementById("personSearchWrap");
        const out = document.getElementById("personSearchResults");
        if (!wrap || !out) return;
        const rect = wrap.getBoundingClientRect();
        out.style.top = `${rect.bottom}px`;
        out.style.left = `${rect.left}px`;
        out.style.width = `${rect.width}px`;
    }

    function _showInlineDropdown($out, html) {
        $out.html(html);
        _positionInlineDropdown();
        $out.show();
    }

    async function _runInlineSearch(q, $out) {
        if (q.length < 2) { $out.empty().hide(); return; }

        let rows = [];
        try {
            rows = await db.persons
                .where("forename").startsWithIgnoreCase(q)
                .or("surname").startsWithIgnoreCase(q)
                .or("surname_key").startsWithIgnoreCase(q)
                .limit(50)
                .toArray();
        } catch (err) {
            console.warn("Inline person search failed:", err);
            _showInlineDropdown($out, `<div class="person-search-empty text-danger">Search error: ${err.message}</div>`);
            return;
        }

        const activePids = new Set((filterState.personFilter || []).map(e => String(e.pid)));
        rows = rows.filter(r => !activePids.has(String(r.pid)));

        if (rows.length === 0) {
            _showInlineDropdown($out, `<div class="person-search-empty">No matches.</div>`);
            return;
        }
        _showInlineDropdown($out, rows.map(_personResultHtml).join(""));
    }

    async function _addPersonToFilter(pid, label) {
        const pidStr = String(pid);
        const list = filterState.personFilter || [];
        if (list.some(e => String(e.pid) === pidStr)) return;
        list.push({pid: pidStr, label});
        filterState.personFilter = list;
        renderPersonChips();
        if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
        await applyFilters();
    }

    let _inlineSearchDebounce;
    $(document).on("input", "#personSearchInput", function () {
        const q = $(this).val().trim();
        clearTimeout(_inlineSearchDebounce);
        _inlineSearchDebounce = setTimeout(() => {
            _runInlineSearch(q, $("#personSearchResults"));
        }, 250);
    });

    $(document).on("mousedown", ".person-search-result", async function (e) {
        // mousedown fires before the input loses focus, avoiding a race with the
        // outside-click hide rule below.
        e.preventDefault();
        const pid = $(this).data("pid");
        const label = $(this).find("strong").text();
        $("#personSearchInput").val("");
        $("#personSearchResults").empty().hide();
        await _addPersonToFilter(pid, label);
    });

    $(document).on("click", "#clearPersonSearchBtn", function () {
        $(this).tooltip("hide");
        $("#personSearchInput").val("").trigger("focus");
        $("#personSearchResults").empty().hide();
    });

    $(document).on("click", function (e) {
        if (!$(e.target).closest("#personSearchWrap").length) {
            $("#personSearchResults").hide();
        }
    });

    $(document).on("focus", "#personSearchInput", function () {
        const $out = $("#personSearchResults");
        if ($out.children().length > 0) {
            _positionInlineDropdown();
            $out.show();
        }
    });

    // Reposition (or hide) on any scroll — capture phase catches scrolls inside
    // the table-responsive container, which don't bubble.
    window.addEventListener("scroll", () => {
        const out = document.getElementById("personSearchResults");
        if (out && out.style.display !== "none") _positionInlineDropdown();
    }, true);
    $(window).on("resize", () => {
        const out = document.getElementById("personSearchResults");
        if (out && out.style.display !== "none") _positionInlineDropdown();
    });

    // Delegated handlers — bound once on document
    $(document).on("click", "span.clickable-name[data-pid]", function (e) {
        e.stopPropagation();
        const pid = $(this).attr("data-pid");
        openNamePicker(pid);
    });

    $(document).on("click", "#personFilterChips .person-chip-remove", function (e) {
        e.stopPropagation();
        const pid = $(this).closest(".person-filter-chip").data("pid");
        removePersonFromFilter(pid);
    });

    $(document).on("click", "#clearPeopleBtn", function (e) {
        e.preventDefault();
        $(this).tooltip("hide");
        clearAllPersonFilters();
    });

    // Expose
    window.openNamePicker = openNamePicker;
    window.renderPersonChips = renderPersonChips;
    window.removePersonFromFilter = removePersonFromFilter;
    window.clearAllPersonFilters = clearAllPersonFilters;
})();
