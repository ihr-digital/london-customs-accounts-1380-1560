// main.js

async function init() {

    showGenericSpinner();
    $("#progressBarContainer").hide();

    loadFilterState(); // loadFilterState is from filter_and_sort.js

    // Commodity-group filter: build the picker tree (DOM-only, no data needed)
    // before the long preload so the control is usable immediately, then paint
    // it from the loaded filter state.
    if (typeof initCommodityFilter === "function") initCommodityFilter();
    if (typeof syncCommodityFilterUI === "function") syncCommodityFilterUI();

    await db.open(); // db is from globals.js
    await checkDbHealth();
    await preloadAllLadings(); // preloadAllLadings is from db_operations.js
    await backfillSearchText(); // no-op unless the search index is missing
    await loadDatelessLadings(); // loadDatelessLadings is from db_operations.js
    await preloadPersonIndex(); // preloadPersonIndex is from db_operations.js
    await hydratePersonFilterLabels(); // hydratePersonFilterLabels is from filter_and_sort.js
    if (typeof renderPersonChips === "function") renderPersonChips();
    if (typeof syncCommodityFilterUI === "function") syncCommodityFilterUI();

    // THE WHOLE RANGE UNLESS SOMETHING SAYS OTHERWISE. `filterState.yearRange` starts
    // as `[]` (globals.js), so with no saved state and no `range` parameter neither
    // <select> had a `selected` option — and a <select> with none selected reports its
    // FIRST option. Both ends therefore read 1380, giving a range of [1380, 1380] and
    // an all-but-empty table on a first visit. That was the other half of #39: seeding
    // visibleTypes alone left the table empty for this reason instead.
    const effectiveRange = (Array.isArray(filterState.yearRange) && filterState.yearRange.length === 2)
        ? filterState.yearRange
        : [globalRange[0], globalRange[1]];
    filterState.yearRange = effectiveRange;
    yearRange = [...effectiveRange];

    $("#dateSelectors select.year-list").each(function (index) {
        const $select = $(this);
        for (let year = globalRange[0]; year <= globalRange[1]; year++) {
            $select.append(`<option value="${year}" ${effectiveRange[index] === year ? "selected" : ""}>${year}</option>`);
        }
    }).on("change", function () {
        applyFilters();
    });

    if (currentSort.order === 'desc') {
        $("#sortToggle i").removeClass("fa-arrow-right").addClass("fa-arrow-left");
    }
    await applyFilters(); // applyFilters is from filter_and_sort.js

    hideGenericSpinner();
    $(".content-hidden").addClass("content-visible").removeClass("content-hidden");

    // READINESS FLAG FOR HEADLESS CHECKS (tools/pages/shot.py), behind `?debug`.
    // The page is the only thing that knows when it is interactive: the ladings
    // fetch finishes long before the rows exist, so `networkidle` and the load
    // event both report ready while the table is still empty. This is the last
    // statement of the boot, so a harness that waits on it waits on the truth.
    // `window.__mlcaDebug` is injected by the harness before any script runs
    // (page.add_init_script). It is checked FIRST and separately from the query
    // parameter because applyFilters() -> updateURLFromFilterState() rewrites the
    // location to `pathname?params` and drops `?debug` before this line is reached,
    // so a URL-only flag is gone by the time the boot ends.
    if (window.__mlcaDebug || new URLSearchParams(location.search).has("debug")) {
        window.mlca = Object.assign(window.mlca || {}, {
            ready: true,
            rows: $("#ladingTable tbody tr").length,
            resultCount: $("#resultCount").text(),
        });
    }
}

$(() => {
    init();

    $('table#ladingTable, #viewTabs, #chart-container').tooltip({
        selector: '[data-bs-toggle="tooltip"]',
        html: true,
        placement: 'top',
    });

    $('#tablePane, #chartPane').popover({
        selector: '[data-bs-toggle="popover"]',
        html: true,
        placement: 'top',
        trigger: 'hover',
        container: 'body',
        sanitize: false,
    });

    $('#resetZoomButton').on('click', function () {
        $(this).popover('hide');
        if (chart) {
            chart.resetZoom();
        }
    });

    $("#dateSelectors select").on("focus click", function (event) {
        $(this).tooltip('hide');
    });

    $("#sortToggle").on("click", function () {
        $(this).tooltip('hide');
        const icon = $(this).find("i");
        icon.toggleClass("fa-arrow-left fa-arrow-right");
        currentSort.order = icon.hasClass("fa-arrow-right") ? 'asc' : 'desc';
        applyFilters();
    });

    customsTypes.forEach(customType => {
        const id = "toggle" + customType.initial
        const typeOn = visibleTypes.has(customType.short);

        // Create the checkbox and label
        const $input = $(`
            <input type="checkbox" class="btn-check" id="${id}" autocomplete="off" value="${customType.short}" ${typeOn ? "checked" : ""}>
          `);
        const $label = $(`
            <label class="btn btn-outline-secondary" for="${id}" data-bs-toggle="tooltip" title="${customType.label}">${customType.initial}</label>
          `);

        // Append to container
        $("#customsTypes").append($input, $label);

        // Bind change event directly
        $input.on("change", function () {
            const typeOn = $(this).is(":checked");
            $(this).next("label").tooltip('hide');

            if (typeOn) {
                visibleTypes.add(customType.short);
            } else {
                visibleTypes.delete(customType.short);
            }
            filterState.visibleTypes = Array.from(visibleTypes);
            applyFilters();
        });
    });

    [
        {id: "Import", iconClass: "fa-right-to-bracket fa-rotate-180"},
        {id: "Export", iconClass: "fa-right-from-bracket"}
    ].forEach(({id, iconClass}) => {
        const input = $(`
        <input type="checkbox" class="btn-check" id="toggle${id}" autocomplete="off" ${filterState[id.toLowerCase()] ? "checked" : ""}>
      `);

        const label = $(`
        <label class="btn btn-outline-secondary" for="toggle${id}" data-bs-toggle="tooltip" title="${id}">
          <i class="fas ${iconClass}"></i>
        </label>
      `);
        $("#directionControls").append(input, label);
        input.on("change", function () {
            const checkboxes = $("#directionControls input[type='checkbox']");
            if (checkboxes.filter(":checked").length === 0) {
                checkboxes.not(this).prop("checked", true);
            }
            applyFilters();
        });
    });

    let searchDebounceTimeout;
    $("#searchInput")
        // .on("click", function () {
        //     $(this).tooltip('hide');
        // })
        .on("keyup", function () {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(async () => {
                await applyFilters();
            }, 1000); // Debounce for 1s
        });
    $("#clearSearchBtn").on("click", function () {
        $(this).tooltip('hide');
        if ($("#searchInput").val() === "") return; // No action if input is already empty
        $("#searchInput").val(""); // Clear the input field
        clearTimeout(searchDebounceTimeout); // Clear any pending search debounce
        applyFilters(); // Apply filters to refresh table with empty search
    });

    initializeExportButtons();

    $('input[name="annotationMode"]').on('change', function () {
        const selectedMode = $(this).val();
        handleAnnotationModeChange(selectedMode);
    });


    const $scrollBtn = $('#scrollTbodyTopBtn');
    const $scrollContainer = $('#tableScrollContainer');

    // Click to scroll to top of tbody
    $scrollBtn.on('click', function () {
        $scrollContainer.animate({ scrollTop: 0 }, 300); // Smooth scroll
    });

    // Show/hide the button based on scroll position
    $scrollContainer.on('scroll', function () {
        if ($scrollContainer.scrollTop() >= 100) {
            $scrollBtn.removeClass('d-none');
        } else {
            $scrollBtn.addClass('d-none');
        }
    });


    $('#clearAllFiltersBtn').on('click', function () {
        $(this).tooltip('hide');

        $('#yearStart').prop('selectedIndex', 0);
        $("#sortToggle i").removeClass("fa-arrow-left").addClass("fa-arrow-right");
        $('#yearEnd').prop('selectedIndex', $('#yearEnd option').length - 1);

        $('#customsTypes input[type="checkbox"], #directionControls input[type="checkbox"], input[name="annotationMode"]').each(function () {
            $(this).prop('checked', true);
        });

        visibleTypes = new Set(customsTypes.map(type => type.short));
        currentSort.order = 'asc';

        $('#searchInput').val('');
        filterState.personFilter = [];
        if (typeof renderPersonChips === "function") renderPersonChips();
        if (typeof clearCommodityFilter === "function") clearCommodityFilter();

        applyFilters();
    });

    $('#chart-tab').on('shown.bs.tab', function () {
        renderChart();
    })

    populateAccountingYearOptions();

    $('#dateStart, #period').on('change', function() {
        renderChart();
    }).on('click', function () {
        $(this).tooltip('hide');
    });

    // The open tab is URL state: record it when it changes, and restore it on
    // arrival, so a link to the map opens the map.
    const VIEWS = {'table-tab': 'table', 'chart-tab': 'chart', 'map-tab': 'map'};
    $('#table-tab, #chart-tab, #map-tab').on('shown.bs.tab', function () {
        window.mlcaView = VIEWS[this.id] || 'table';
        if (typeof updateURLFromFilterState === 'function') updateURLFromFilterState();
    });

    $('#map-tab').on('shown.bs.tab', function () {
        // initMap probes the basemap service before building the map, so it is
        // async now. Nothing waits on it, but an unhandled rejection would be
        // invisible, and a map that silently fails to appear is the whole
        // problem this tab has had.
        Promise.resolve(initMap()).catch(error =>
            console.error('[map] initialisation failed:', error));
    });

    // RESTORE THE TAB LAST, once every shown.bs.tab handler above is registered.
    // Showing a tab fires the event immediately, so doing this earlier fired it
    // into nothing: arriving at ?view=map gave an empty map tab that only built
    // itself when you switched away and back.
    const wanted = new URLSearchParams(location.search).get('view');
    if (wanted && wanted !== 'table') {
        const button = document.getElementById(`${wanted}-tab`);
        // The map and chart both build themselves on first show, so triggering
        // the tab is the whole restoration: their own handlers do the rest.
        if (button) new bootstrap.Tab(button).show();
    }
});