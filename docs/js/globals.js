// globals.js

const db = new Dexie("LCA_DB");
let chart = null;
var visibleTypes = new Set(); // Set to track visible customs types
var currentSort = {field: "primary_date", order: "asc"}; // Default sort field and order

// Slider specific globals
var globalRange = [1380, 1560]; // Default global range
var yearRange = globalRange; // Default range if not set

// The ladings with no usable date, held in memory because they cannot be queried for.
// `customs_year` is null for them, and IndexedDB does not index null keys, so the
// range query that drives the table structurally cannot see them (#41). They are
// deliberately still excluded from a year-ranged table — a lading with no date has no
// business appearing under a date — but the table now says how many it is holding back
// and will show them on request, instead of quietly reporting 33,415 of 33,548.
var datelessLadings = [];

// General constants
const MAX_TABLE_ROWS = 5000;
const abbrIsoDow = [null, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

var customsTypes = [
    {"label": "Wool Custom", "colour": "rgba(228,188,88,0.8)"},
    {"label": "Tunnage & Poundage", "colour": "rgba(190,68,234,0.8)"},
    {"label": "Petty Custom", "colour": "rgba(0,178,255,0.8)"},
    {"label": "Miscellaneous Custom", "colour": "rgba(255,102,102,0.8)"}
];
let css = "";
customsTypes.forEach(customType => {
    customType.short = customType.label.split(" ")[0].toLowerCase();
    customType.initial = customType.label[0];

    const id = "toggle" + customType.initial;
    css += `
        #${id}:checked + label {
            background-color: ${customType.colour} !important;
            color: white !important;
        }
    `;
})
// Inject styles once
if (!document.getElementById("customs-toggle-styles")) {
    const styleTag = document.createElement("style");
    styleTag.id = "customs-toggle-styles";
    styleTag.textContent = css;
    document.head.appendChild(styleTag);
}

// Filter state for persistence
// Bumped when a saved filter state needs migrating on load. A state written without
// it came from a build that could save a filter nobody chose (see loadFilterState).
const FILTER_STATE_VERSION = 2;

let filterState = {
    v: FILTER_STATE_VERSION,
    visibleTypes: [],
    yearRange: [],
    // Both directions on. These were absent from this object entirely, so on a first
    // visit `filterState.import` was `undefined`, both direction checkboxes rendered
    // unticked, and applyFilters kept nothing — the third of the three reasons a new
    // visitor met an empty table (#39). The other two were an unseeded `visibleTypes`
    // and an unseeded `yearRange`.
    import: true,
    export: true,
    sort: {field: "primary_date", order: "asc"},
    searchQuery: "",
    annotationMode: "annotations",
    personFilter: [],  // [{pid, label}] — selected canonical persons used to narrow the table
    groupFilter: [],   // [fineGroupName] — selected commodity subject groups (empty = all)
    groupMode: "OR"    // "OR" (any selected group) | "AND" (all selected groups)
};

const accountingYears = {
    'modern': { name: 'Modern', month: 0, day: 1, tooltip: '1 January' },
    'lady': { name: 'Lady Day', month: 2, day: 22, tooltip: '22 March' },
    'mich': { name: 'Michaelmas', month: 8, day: 29, tooltip: '29 September' },
    'xmas': { name: 'Christmas', month: 11, day: 25, tooltip: '25 December' }
};