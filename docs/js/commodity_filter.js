// commodity_filter.js
//
// Commodity-group filter for the ladings table.
//
// Concepts in the glossary carry fine-grained AAT-derived subject `groups`
// (~35 of them). Those propagate onto cargo commodity annotations
// (annotations[].matches[].groups), and db_operations.js precomputes the union
// per lading as `lading.groups`.
//
// This module provides a two-level picker over those groups: ~10 broad
// super-groups, each expandable to its fine groups. Selection narrows the table
// (OR by default — a lading is kept if it carries ANY selected group; AND keeps
// only ladings carrying ALL selected groups). No selection = all ladings.
//
// Public surface (attached to window):
//   COMMODITY_SUPERGROUPS      — ordered [{name, groups:[...]}]
//   GROUP_TO_SUPERGROUP        — {fineGroup -> superName}
//   initCommodityFilter()      — build the picker tree + wire events (call once)
//   syncCommodityFilterUI()    — repaint tree/chips/label from filterState
//   clearCommodityFilter()     — reset selection (does not call applyFilters)

// --- Roll-up: each fine group maps to exactly one super-group (a partition). ---
// The two trailing entries in several super-groups ("Food, drink & provisions",
// "Metals & metalware") are residual duplicate labels folded in alongside their
// canonical fine group so the picker covers every group string present in data.
const COMMODITY_SUPERGROUPS = [
    {
        name: "Textiles, cloth & clothing",
        groups: ["Textiles & cloth", "Clothing, costume & accessories",
                 "Dyestuffs, pigments & mordants"]
    },
    {
        name: "Animal materials",
        groups: ["Furs, skins & leather", "Animal materials (horn, hair, bone)",
                 "Live animals, birds & livestock"]
    },
    {
        name: "Food, drink & spices",
        groups: ["Food, spices & comestibles", "Fish", "Food, drink & provisions"]
    },
    {
        name: "Medicine, oils & resins",
        groups: ["Medicines & drugs", "Oils, fats & tallow", "Wax, resin & gums",
                 "Cosmetics & toiletries"]
    },
    {
        name: "Plants & wood",
        groups: ["Plants & plant products", "Wood & wood products"]
    },
    {
        name: "Metals, minerals & stone",
        groups: ["Metals & ores (material)", "Minerals, stone & chemicals",
                 "Building materials & ceramics", "Metals & metalware"]
    },
    {
        name: "Tools, weapons & hardware",
        groups: ["Tools & equipment", "Hardware & fasteners", "Weapons & armour",
                 "Explosives & gunpowder", "Naval stores & shipping",
                 "Transport & vehicles"]
    },
    {
        name: "Household goods",
        groups: ["Furnishings & household goods", "Containers & vessels",
                 "Lighting & household devices"]
    },
    {
        name: "Art, luxury & culture",
        groups: ["Jewellery & precious stones", "Musical instruments",
                 "Visual works & writing", "Ecclesiastical & religious objects",
                 "Toys, games & recreation"]
    },
    {
        name: "Measures",
        groups: ["Units, weights & measures"]
    },
    {
        name: "Unidentified",
        groups: ["Unidentified"]
    }
];

const GROUP_TO_SUPERGROUP = (() => {
    const m = {};
    COMMODITY_SUPERGROUPS.forEach(sg => sg.groups.forEach(g => { m[g] = sg.name; }));
    return m;
})();

// Escape a string for safe use inside an HTML attribute / text node.
function _cgEsc(s) {
    return $('<div>').text(s == null ? '' : String(s)).html();
}

// --- Build the picker tree once. ---
function initCommodityFilter() {
    const $tree = $("#commodityGroupTree");
    if (!$tree.length || $tree.data("built")) return;

    const html = COMMODITY_SUPERGROUPS.map((sg, i) => {
        const superId = `cgs-${i}`;
        const fines = sg.groups.map((g, j) => {
            const fid = `cgf-${i}-${j}`;
            return `
                <div class="form-check cg-fine-item">
                    <input class="form-check-input cg-fine-check" type="checkbox"
                           id="${fid}" data-group="${_cgEsc(g)}" data-super="${_cgEsc(sg.name)}">
                    <label class="form-check-label" for="${fid}">${_cgEsc(g)}</label>
                </div>`;
        }).join("");
        // A single-group super-group has no meaningful sub-list — hide the caret.
        const soleGroup = sg.groups.length === 1;
        const caret = soleGroup ? '<span class="cg-caret-spacer"></span>'
                                : '<span class="cg-caret" role="button" title="Expand">▸</span>';
        return `
            <div class="cg-super" data-super="${_cgEsc(sg.name)}">
                <div class="d-flex align-items-center cg-super-row">
                    <input class="form-check-input cg-super-check mt-0" type="checkbox"
                           id="${superId}" data-super="${_cgEsc(sg.name)}">
                    ${caret}
                    <label class="form-check-label ms-1 flex-grow-1 cg-super-label" for="${superId}">
                        ${_cgEsc(sg.name)}
                    </label>
                </div>
                <div class="cg-fine ${soleGroup ? 'd-none cg-sole' : 'd-none'}">${fines}</div>
            </div>`;
    }).join("");

    $tree.html(html).data("built", true);

    // Expand / collapse a super-group's fine list.
    $tree.on("click", ".cg-caret", function () {
        const $fine = $(this).closest(".cg-super").find(".cg-fine");
        const open = $fine.toggleClass("d-none").hasClass("d-none") === false;
        $(this).text(open ? "▾" : "▸");
    });

    // Super checkbox toggles all its fine checkboxes.
    $tree.on("change", ".cg-super-check", function () {
        const on = $(this).prop("checked");
        $(this).closest(".cg-super").find(".cg-fine-check").prop("checked", on);
        _cgCommit();
    });

    // Fine checkbox updates its super's tri-state, then commits.
    $tree.on("change", ".cg-fine-check", function () {
        _cgRefreshSuperState($(this).closest(".cg-super"));
        _cgCommit();
    });

    // Match-mode (Any / All) radios.
    $(document).on("change", 'input[name="groupMatchMode"]', function () {
        filterState.groupMode = $(this).val() === "AND" ? "AND" : "OR";
        _cgCommit(true);
    });

    // Clear button inside the dropdown.
    $(document).on("click", "#clearGroupsBtn", function () {
        clearCommodityFilter();
        _cgCommit(true);
    });

    // Remove a chip from the active-filter row.
    $(document).on("click", "#commodityFilterChips .cg-chip-remove", function () {
        const $chip = $(this).closest(".cg-chip");
        const kind = $chip.data("kind");
        const value = String($chip.data("value"));
        const sel = new Set(filterState.groupFilter || []);
        if (kind === "super") {
            const sg = COMMODITY_SUPERGROUPS.find(s => s.name === value);
            (sg ? sg.groups : []).forEach(g => sel.delete(g));
        } else {
            sel.delete(value);
        }
        filterState.groupFilter = Array.from(sel);
        _cgSyncTreeChecks();
        _cgCommit(true);
    });

    $(document).on("click", "#clearCommoditiesBtn", function () {
        clearCommodityFilter();
        _cgCommit(true);
    });
}

// Set a super checkbox to checked / unchecked / indeterminate from its fines.
function _cgRefreshSuperState($super) {
    const $fines = $super.find(".cg-fine-check");
    const total = $fines.length;
    const checked = $fines.filter(":checked").length;
    const $super_cb = $super.find(".cg-super-check");
    $super_cb.prop("checked", checked === total && total > 0);
    $super_cb.prop("indeterminate", checked > 0 && checked < total);
}

// Read the tree into filterState.groupFilter (array of fine group names).
function _cgReadSelection() {
    const sel = [];
    $("#commodityGroupTree .cg-fine-check:checked").each(function () {
        sel.push($(this).data("group"));
    });
    filterState.groupFilter = sel;
}

// Push filterState checkbox state into the tree (used on load / chip removal).
function _cgSyncTreeChecks() {
    const sel = new Set(filterState.groupFilter || []);
    $("#commodityGroupTree .cg-fine-check").each(function () {
        $(this).prop("checked", sel.has($(this).data("group")));
    });
    $("#commodityGroupTree .cg-super").each(function () {
        _cgRefreshSuperState($(this));
    });
    // Restore match-mode radios.
    const mode = filterState.groupMode === "AND" ? "AND" : "OR";
    $(`input[name="groupMatchMode"][value="${mode}"]`).prop("checked", true);
}

// Commit a selection change: read tree, repaint chips/label, persist, filter.
// When `alreadyRead` is true the caller has set filterState.groupFilter directly.
function _cgCommit(alreadyRead) {
    if (!alreadyRead) _cgReadSelection();
    renderCommodityChips();
    _cgUpdateButtonLabel();
    if (typeof updateURLFromFilterState === "function") updateURLFromFilterState();
    applyFilters();  // persists filterState (incl. group selection) to localStorage on completion
}

function _cgUpdateButtonLabel() {
    const n = (filterState.groupFilter || []).length;
    $("#commodityFilterLabel").text(n > 0 ? `Commodities (${n})` : "Commodities");
    $("#commodityFilterBtn").toggleClass("active", n > 0);
}

// Repaint the active-filter chip row. A fully-selected super-group collapses to
// a single super chip; partial selections show individual fine chips.
function renderCommodityChips() {
    const $chips = $("#commodityFilterChips");
    const $row = $("#commodityFilterRow");
    if (!$chips.length) return;
    const sel = new Set(filterState.groupFilter || []);
    if (sel.size === 0) {
        $chips.empty();
        $row.addClass("d-none");
        return;
    }
    const chips = [];
    const consumed = new Set();
    COMMODITY_SUPERGROUPS.forEach(sg => {
        if (sg.groups.length > 1 && sg.groups.every(g => sel.has(g))) {
            sg.groups.forEach(g => consumed.add(g));
            chips.push({kind: "super", value: sg.name, label: sg.name});
        }
    });
    Array.from(sel).forEach(g => {
        if (!consumed.has(g)) chips.push({kind: "fine", value: g, label: g});
    });
    const html = chips.map(c => `
        <span class="badge commodity-filter-chip me-1 mb-1 cg-chip ${c.kind === 'super' ? 'cg-chip-super' : ''}"
              data-kind="${c.kind}" data-value="${_cgEsc(c.value)}">
            ${_cgEsc(c.label)}
            <button type="button" class="btn-close btn-close-white btn-sm ms-2 cg-chip-remove"
                    aria-label="Remove"></button>
        </span>`).join("");
    $chips.html(html);
    $row.removeClass("d-none");
}

// Repaint the whole picker + chips + label from filterState (no filtering).
function syncCommodityFilterUI() {
    _cgSyncTreeChecks();
    renderCommodityChips();
    _cgUpdateButtonLabel();
}

// Reset selection (leaves match-mode intact). Does not call applyFilters.
function clearCommodityFilter() {
    filterState.groupFilter = [];
    $("#commodityGroupTree .cg-fine-check, #commodityGroupTree .cg-super-check")
        .prop("checked", false).prop("indeterminate", false);
    renderCommodityChips();
    _cgUpdateButtonLabel();
}

window.COMMODITY_SUPERGROUPS = COMMODITY_SUPERGROUPS;
window.GROUP_TO_SUPERGROUP = GROUP_TO_SUPERGROUP;
window.initCommodityFilter = initCommodityFilter;
window.syncCommodityFilterUI = syncCommodityFilterUI;
window.renderCommodityChips = renderCommodityChips;
window.clearCommodityFilter = clearCommodityFilter;
