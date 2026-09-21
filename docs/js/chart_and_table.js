// chart_and_table.js

// --- Function to render the list of cargos ---
function renderCargosList(cargosListElement, cargos) {
    cargosListElement.empty(); // Clear existing cargos
    const footnotes = cargosListElement.data("footnotes") || [];

    const date = cargosListElement.parents("tr").data("date") || "";
    const type = cargosListElement.parents("tr").data("type") || "";

    if (cargos.length === 0) {
        cargosListElement.append('<li>No cargo entries for this lading.</li>');
        return;
    }

    // When a commodity-group filter is active, highlight the cargos that carry a
    // selected group and dim the rest, so it's obvious which cargos matched.
    const groupSel = new Set(filterState.groupFilter || []);
    const groupFiltering = groupSel.size > 0;

    cargos.forEach(c => {
        const listItem = $(`
            <li>
                <i class="fas fa-clipboard copy-icon text-muted me-1" title="Copy cargo text"></i>
                <i class="fas fa-table record-icon text-muted me-1" title="Show what the tools read out of this cargo: goods, quantity, measure, concept"></i>
                <span class="cargo-text-content">${applyOffsetAnnotations(c.cargo || "", c.annotations, footnotes)}</span>
                <div class="cargo-record-slot"></div>
            </li>
        `);

        // The record is fetched per volume on first use (see cargo_record.js) and the
        // panel is built once, so a second click just hides it.
        listItem.find(".record-icon").on('click', async function () {
            const slot = listItem.find(".cargo-record-slot");
            if (slot.children().length) { slot.toggle(); return; }
            slot.html('<div class="cr-none">reading…</div>').show();
            try {
                slot.html(CargoRecord.render(await CargoRecord.forCargo(c)));
            } catch (err) {
                slot.html('<div class="cr-none">the record for this volume could not be loaded</div>');
                console.error('cargo record:', err);
            }
        });

        if (groupFiltering) {
            const relevant = _collectLadingGroups([c]).some(g => groupSel.has(g));
            listItem.addClass(relevant ? "cargo-group-match" : "cargo-group-dim");
        }

        listItem.find(".copy-icon")
            .data('original-icon-class', 'fa-clipboard')
            .data('original-color-class', 'text-muted')
            .on('click', function() {
                copyToClipboard(`${upperFirst(type)} ${c.id} [${date}]: "${c.cargo}"` || "", $(this));
            });

        cargosListElement.append(listItem);
    });

    $(".cargo-text-content").each(function () {
        highlightMatches($(this), filterState.searchQuery);
    });
}

const $ladingTableTbody = $("#ladingTable tbody");
const $resultCountSpan = $("#resultCount");

// One row of the table, lifted out of renderTable so the virtual window can
// build the twenty rows it is about to show instead of the five thousand it
// is not.
function ladingRowHtml(v, shortToColour, isSingleLading) {

        const date = v.date?.dates ? formatDate(v.date.dates[0]) : "";
        const dowNum = v.date?.dow?.[0];
        const dow = dowNum ? `${abbrIsoDow[dowNum]}, ` : "";
        const tooltipText = `
            <strong>Lading ID:</strong> ${v.lading_id}<br>
            <strong>Page:</strong> ${v.page?.number || 'N/A'}
            ${v.pdf_link ? '<br><em>Click to open PDF</em>' : '<br><em>(No PDF link available)</em>'}
        `;
        const typeInitial = v.customs_type ? v.customs_type.charAt(0).toUpperCase() : '';

        const exporting = (v.export === undefined || v.export === null) ?
            `<i class="fas fa-repeat text-muted me-1" data-bs-toggle="tooltip" title="Indeterminate Import/Export"></i>`
         : v.export ?
            `<i class="fas fa-right-from-bracket text-muted me-1" data-bs-toggle="tooltip" title="Export"></i>` :
            `<i class="fas fa-right-to-bracket fa-rotate-180 text-muted me-1" data-bs-toggle="tooltip" title="Import"></i>`;

        const overland = v.overland ?
            `<i class="fas fa-horse text-muted me-1" data-bs-toggle="tooltip" title="Overland (at least in part)"></i>` :
            "";

        // Build the HTML string for the row
        let tableHtml = `
            <tr data-id="${v.lading_id}" data-date="${date}" data-type="${v.customs_type}">
                <td class="text-end">
                    <div class="justify-content-between align-items-center w-100">
                        <div class="align-items-center">
                            ${dow}${date}
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        ${overland}
                        <span class="type-badge btn btn-sm btn-outline-secondary px-1 py-0"
                                style="background-color: ${shortToColour[v.customs_type] || "rgba(0,0,0,0.5)"};"
                                data-bs-toggle="tooltip"
                                title="Customs Type: ${upperFirst(v.customs_type)}">
                            ${typeInitial}
                        </span>
                    </div>
                </td>
                <td>
                    <div class="align-items-center">
                        ${exporting}
                        <i class="fas fa-file-pdf text-muted me-1" data-pdf-link="${v.pdf_link}" data-bs-toggle="tooltip" title="${tooltipText}"></i>
                        <i class="fas fa-clipboard copy-icon text-muted me-1" data-bs-toggle="tooltip" title="Copy lading text"></i>
                        <button class="btn btn-sm btn-success toggleCargosBtn me-1 ${isSingleLading ? 'single-lading-auto-click' : ''}"
                                data-bs-toggle="tooltip"
                                title="Click to toggle display of cargos for this lading"
                                data-footnotes='${JSON.stringify(v.footnotes || [])}'>
                            cargos
                        </button>
                        <span class="lading-text">${applyOffsetAnnotations(v.text || "", v.annotations, v.footnotes || [])}</span>
                    </div>
                    <ul class="cargos-list mt-2" style="display: none;"></ul>
                </td>
            </tr>
        `;
    return tableHtml;
}

// ---------------------------------------------------------------------------
// Virtual table.
//
// Rows are not all in the document: only those near the viewport, with a spacer
// row above and below standing in for the rest. Five thousand ladings were
// 90,517 DOM nodes; a window is a few hundred.
//
// Heights vary -- a lading's text wraps to as many lines as it needs, and an
// expanded row carries its cargos -- so this cannot assume a fixed row height
// the way the concepts list does. Heights are estimated, then measured as rows
// are drawn, and the spacers are corrected from the measurements.
// ---------------------------------------------------------------------------
let VT = null;
let _vtRaf = 0;

function startVirtualTable(items, shortToColour) {
    const box = document.getElementById('tableScrollContainer');
    const keepExpanded = (VT && VT.expanded) || new Set();
    // Carry the measured row height across rebuilds. Rows do not change height
    // because a filter changed, but starting from the 48px guess every time made
    // the first draw after a filter short by a third -- 22 rows where 30 fit --
    // until a measure corrected it. What the table already knows about itself is
    // better than a constant.
    const est = (VT && VT.est) || 48;
    VT = {
        items,
        shortToColour,
        single: items.length === 1,
        heights: new Float64Array(items.length).fill(est),  // replaced on first measure
        est,
        // Which rows are open, by lading_id rather than by DOM node: a row that
        // scrolls out of the window loses its element, and must come back open.
        expanded: keepExpanded,
        offsets: null,
        dirty: true,
        refills: 0,
        start: 0,
        end: 0,
    };
    if (box && !box._vtBound) {
        box.addEventListener('scroll', () => {
            if (_vtRaf) return;
            _vtRaf = requestAnimationFrame(() => { _vtRaf = 0; drawTableWindow(); });
        }, {passive: true});
        // Scroll anchoring fights a resizing spacer: without this one wheel nudge
        // flings the list to the far end. Learned from the concepts list.
        box.style.overflowAnchor = 'none';
        box._vtBound = true;
    }

    // The first draw happens while the table is still hidden and the container
    // has not reached its height, so the window was sized against about 200px
    // and stopped at ten rows -- which reads as "that is all there is" until
    // something nudges the scroll. Watch the box instead of assuming it: this
    // fires when the content is revealed, when the viewport changes, and when
    // the view tabs bring the table back.
    if (box && !box._vtResize && typeof ResizeObserver !== 'undefined') {
        box._vtResize = new ResizeObserver(() => {
            if (!VT || box.clientHeight === VT.lastViewH) return;  // no loop on our own spacers
            // Replace any queued frame rather than skipping this one: a draw
            // already scheduled was scheduled against the size we have just
            // stopped having.
            if (_vtRaf) cancelAnimationFrame(_vtRaf);
            _vtRaf = requestAnimationFrame(() => { _vtRaf = 0; drawTableWindow(); });
        });
        box._vtResize.observe(box);
    }
    if (box) box.scrollTop = 0;
    drawTableWindow();
}

function vtOffsets() {
    if (!VT.offsets || VT.dirty) {
        const n = VT.items.length;
        const off = new Float64Array(n + 1);
        for (let i = 0; i < n; i++) off[i + 1] = off[i] + VT.heights[i];
        VT.offsets = off;
        VT.dirty = false;
    }
    return VT.offsets;
}

function vtSpacer(px) {
    return '<tr class="vt-spacer" aria-hidden="true"><td colspan="3" style="padding:0;border:0;height:'
        + Math.max(0, Math.round(px)) + 'px"></td></tr>';
}

function drawTableWindow() {
    if (!VT || !$ladingTableTbody) return;
    const box = document.getElementById('tableScrollContainer');
    const tbody = $ladingTableTbody[0];
    if (!tbody) return;
    const n = VT.items.length;

    if (!n) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">'
            + '<i class="fas fa-info-circle text-danger"></i>&nbsp;&nbsp;'
            + 'No ladings match the current filters.</td></tr>';
        return;
    }

    const off = vtOffsets();
    const scrollTop = box ? box.scrollTop : 0;

    // SIZE THE WINDOW BY THE SPACE AVAILABLE, NOT BY THE SPACE IN USE.
    //
    // #tableScrollContainer is `max-height: 80vh` with no height, so its height
    // comes from its content -- which is what this function is deciding. Asking
    // it how tall it is makes the calculation circular: draw few rows, the box
    // is short, so few rows is the right number, and that is a stable answer
    // rather than a transient one. Measured on a Categories change: the box was
    // 129px when the window was computed and 760px a moment later, and the table
    // sat at nine ladings until a scroll nudged it.
    //
    // 80vh is the ceiling the stylesheet imposes, so that is the most the box can
    // ever be. Sizing to it draws a few rows more than strictly fit when the box
    // is genuinely short, which costs nothing and cannot deadlock.
    const ceiling = Math.round(window.innerHeight * 0.8);
    const viewH = Math.max((box && box.clientHeight) || 0, ceiling, 600);
    VT.lastViewH = box ? box.clientHeight : 0;
    const OVER = 6;

    // First row whose bottom edge is below the top of the viewport.
    let lo = 0, hi = n;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (off[mid + 1] <= scrollTop) lo = mid + 1; else hi = mid;
    }
    const start = Math.max(0, lo - OVER);
    let end = lo;
    const limit = scrollTop + viewH;
    while (end < n && off[end] < limit) end++;
    end = Math.min(n, end + OVER);

    let html = vtSpacer(off[start]);
    for (let i = start; i < end; i++) {
        html += ladingRowHtml(VT.items[i], VT.shortToColour, VT.single);
    }
    html += vtSpacer(off[n] - off[end]);
    tbody.innerHTML = html;
    VT.start = start;
    VT.end = end;

    measureWindow();
    restoreExpanded();
}

// Rows are the size the browser made them, not the size we guessed. Correct the
// record, and the spacers with it, or the scrollbar lies by more and more the
// further down the list you go.
function measureWindow() {
    // These were used below without being declared here -- `box` and `viewH` are
    // locals of drawTableWindow, and the checks at the foot of this function
    // referenced them across the boundary. Guarded by an early `return` on the
    // common path, so it threw only when heights actually changed, and nothing
    // in a run of the site happened to catch it.
    const box = document.getElementById('tableScrollContainer');
    const viewH = Math.max((box && box.clientHeight) || 0,
                           Math.round(window.innerHeight * 0.8), 600);
    const tbody = $ladingTableTbody[0];
    const rows = tbody.querySelectorAll('tr[data-id]');
    let changed = false;
    rows.forEach((tr, k) => {
        const i = VT.start + k;
        const h = tr.offsetHeight;
        if (h && Math.abs(h - VT.heights[i]) > 0.5) { VT.heights[i] = h; changed = true; }
    });
    if (!changed) return;
    // The first honest measurement is a better estimate for everything unmeasured
    // than the guess it replaces. Tested against the measurement rather than
    // against the sentinel 48: the estimate is now carried across rebuilds, so
    // "have we measured yet" is no longer the question. "Is what we are assuming
    // still true" is, and it keeps working when rows genuinely change height --
    // switching to Footnotes, or a single-lading view.
    if (rows.length && Math.abs(VT.heights[VT.start] - VT.est) > 2) {
        VT.est = VT.heights[VT.start];
        for (let i = 0; i < VT.heights.length; i++) {
            if (i < VT.start || i >= VT.end) VT.heights[i] = VT.est;
        }
    }
    VT.dirty = true;
    const off = vtOffsets();
    const spacers = tbody.querySelectorAll('tr.vt-spacer td');
    if (spacers.length === 2) {
        spacers[0].style.height = Math.max(0, Math.round(off[VT.start])) + 'px';
        spacers[1].style.height = Math.max(0, Math.round(off[VT.items.length] - off[VT.end])) + 'px';
    }

    // THE INVARIANT: IF ROWS REMAIN, THE DRAWN WINDOW MUST REACH THE BOTTOM OF
    // THE VIEWPORT. Anything else is a short table, and a short table looks
    // exactly like a complete one -- which is why the Categories bug survived a
    // ResizeObserver written to catch it.
    //
    // This is the check rather than a "more below" row in the table, because the
    // table is virtual and there is ALWAYS more below: such a row would show
    // permanently and say nothing. Here the healthy case is silent and the
    // unhealthy one repairs itself.
    //
    // Bounded, because a redraw that changes nothing would otherwise schedule
    // another for ever. Each pass measures real heights, so a genuine shortfall
    // is normally corrected on the first retry.
    const drawnPx = off[VT.end] - off[VT.start];
    if (VT.end < VT.items.length && drawnPx < viewH && (VT.refills || 0) < 3) {
        VT.refills = (VT.refills || 0) + 1;
        if (!_vtRaf) {
            _vtRaf = requestAnimationFrame(() => { _vtRaf = 0; drawTableWindow(); });
        }
    } else if (drawnPx >= viewH) {
        VT.refills = 0;
    }

    // DRAW AGAIN IF THE VIEWPORT WAS NOT ITS FULL SIZE WHEN WE MEASURED IT.
    //
    // Re-running the filters empties the table, so the container collapses while
    // the new rows are being built. Measured on a Categories change: the window
    // was sized against a 129px box that was 760px by the time the rows landed,
    // and stopped at nine ladings -- which reads as "that is all there is" until
    // a scroll nudges it back to thirty.
    //
    // The ResizeObserver above was meant to catch exactly this and could not: it
    // drops the notification when a frame is already queued, and on this path one
    // always is. Self-correcting here needs no observer and no guessing about
    // when layout settles -- if the box is a different size now than when the
    // window was computed, the window is wrong, so compute it again.
    const settled = box ? box.clientHeight : 0;
    if (box && settled !== VT.lastViewH && !_vtRaf) {
        _vtRaf = requestAnimationFrame(() => { _vtRaf = 0; drawTableWindow(); });
    }
}

// A row that was open when it scrolled away comes back open.
async function restoreExpanded() {
    if (!VT.expanded.size) return;
    const tbody = $ladingTableTbody[0];
    for (const tr of tbody.querySelectorAll('tr[data-id]')) {
        const id = tr.getAttribute('data-id');
        if (!VT.expanded.has(id)) continue;
        const $list = $(tr).find('ul.cargos-list');
        if (!$list.length || $list.is(':visible')) continue;
        const cargos = await db.cargos.where('lading_id').equals(id).toArray();
        $list.data('footnotes', $(tr).find('.toggleCargosBtn').data('footnotes'));
        renderCargosList($list, cargos);
        $list.show();
        $(tr).find('.toggleCargosBtn').removeClass('btn-success').addClass('btn-danger');
    }
    measureWindow();
}

function renderTable(data, undatedHeldBack = 0) {
    // 1. Clear tbody once
    $ladingTableTbody.empty();

    const shortToColour = customsTypes.reduce((acc, type) => {
        acc[type.short] = type.colour;
        return acc;
    }, {});

    const resultCount = data.length;
    // The count, and — when the date filter is holding some back — what it is not
    // showing and a way to see it. A table that silently reported 33,415 of 33,548 was
    // the complaint in #41; a count that admits the gap is the answer to it.
    let countHtml = `(${plurals(resultCount, 'lading', 'ladings')})`;
    if (filterState.showUndated) {
        countHtml += ` <span class="undated-note">&mdash; undated only. `
            + `<a href="#" id="showDatedLink">Back to dated ladings</a></span>`;
    } else if (undatedHeldBack > 0) {
        countHtml += ` <span class="undated-note" data-bs-toggle="tooltip"`
            + ` title="These ladings match your filters but carry no usable date`
            + ` — either none at all or the 0000-01-01 placeholder — so no year range`
            + ` can include them.">&mdash; ${undatedHeldBack.toLocaleString()} undated not shown`
            + ` (<a href="#" id="showUndatedLink">show</a>)</span>`;
    }
    $resultCountSpan.html(countHtml);

    const displayData = data;

    // Hand the rows to the virtual window rather than building them all. The
    // cap existed because five thousand rows was already ninety thousand DOM
    // nodes; with only the visible ones in the document there is nothing to cap.
    startVirtualTable(displayData, shortToColour);

    $resultCountSpan.off('click', '#showUndatedLink, #showDatedLink')
        .on('click', '#showUndatedLink, #showDatedLink', function (e) {
            e.preventDefault();
            filterState.showUndated = this.id === 'showUndatedLink';
            applyFilters();
        });

    // 2. Use Event Delegation for all events

    // Clear previous event handlers to prevent duplicates if renderTable is called multiple times
    $ladingTableTbody.off('click', '.fa-file-pdf');
    $ladingTableTbody.off('click', '.copy-icon');
    $ladingTableTbody.off('click', '.toggleCargosBtn');

    $ladingTableTbody.on('click', '.fa-file-pdf', function () {
        const pdfLink = $(this).data("pdf-link");
        if (pdfLink) {
            window.open(pdfLink, "_blank");
        }
    });

    // Only handle lading-level copy icons; cargo copy icons inside
    // .cargos-list have their own handler bound in renderCargosList().
    $ladingTableTbody.on('click', '.copy-icon', function () {
        if ($(this).closest('.cargos-list').length) return; // cargo icon — skip
        $(this).tooltip('hide');
        const $this = $(this);
        const $row = $this.closest('tr');
        const ladingId = $row.data('id');
        const customsType = $row.data('type');
        const date = $row.data('date');
        const text = $row.find('.lading-text').text(); // Get text directly from the span

        copyToClipboard(`${upperFirst(customsType)} ${ladingId} [${date}]: "${text}"` || "", $this);
    });

    $ladingTableTbody.on('click', '.toggleCargosBtn', async function () {
        const cargosButton = $(this);
        cargosButton.tooltip('hide');
        const cargosList = cargosButton.parents("td").find("ul.cargos-list");
        // Retrieve footnotes from the button's data attribute
        const footnotes = cargosButton.data("footnotes");
        cargosList.data("footnotes", footnotes); // Pass footnotes to cargo list

        const ladingId = String(cargosButton.closest('tr').data('id'));

        if (cargosList.is(":visible")) {
            cargosList.hide();
            cargosButton.removeClass("btn-danger").addClass("btn-success");
            if (VT) VT.expanded.delete(ladingId);
        } else {
            const cargos = await db.cargos.where("lading_id").equals(ladingId).toArray();
            renderCargosList(cargosList, cargos);
            cargosList.show();
            cargosButton.removeClass("btn-success").addClass("btn-danger");
            // Remembered by id: the row's element will not survive a scroll.
            if (VT) VT.expanded.add(ladingId);
        }
        // The row just changed height; the spacers have to follow.
        if (VT) measureWindow();
    });

    // Trigger click if only one lading (delegated event).
    // VT.single, not a local: `isSingleLading` became a parameter of ladingRowHtml
    // when the virtual window was lifted out of this function, and its declaration
    // here went with it. The use stayed, so every render threw a ReferenceError at
    // this line -- after the rows were drawn, which is why the table looked fine.
    if (VT && VT.single) {
        $ladingTableTbody.find('.single-lading-auto-click').trigger('click');
    }
}

function populateAccountingYearOptions() {
    const $dateStartSelect = $('#dateStart');
    $dateStartSelect.empty(); // Clear existing options

    // Default selected value
    const defaultSelectedValue = 'mich';

    for (const [value, yearInfo] of Object.entries(accountingYears)) {
        const option = $('<option></option>')
            .val(value)
            .text(yearInfo.name)
            .attr('data-bs-toggle', 'tooltip')
            .attr('title', yearInfo.tooltip);

        if (value === defaultSelectedValue) {
            option.attr('selected', 'selected');
        }
        $dateStartSelect.append(option);
    }
}

function calculateCustomsYearAndPeriod(ladingDate, dateStartType) {
    const date = new Date(ladingDate);
    if (isNaN(date.getTime())) {
        return null; // Invalid date
    }

    const startInfo = accountingYears[dateStartType];
    if (!startInfo) {
        console.warn(`Unknown dateStartType: ${dateStartType}`);
        // Fallback for unknown type: treat as modern year starting Jan 1st
        return {
            customs_year: date.getFullYear(),
            period_index: date.getMonth() + 1 // 1-indexed month
        };
    }

    const currentYear = date.getFullYear();
    const accountingStartDate = new Date(currentYear, startInfo.month, startInfo.day);

    let customsYear;
    // Determine the customs year
    if (date >= accountingStartDate) {
        // If the lading date is on or after the start date of the current calendar year's accounting period
        customsYear = currentYear;
    } else {
        // If the lading date is before the start date of the current calendar year's accounting period,
        // it belongs to the previous accounting year.
        customsYear = currentYear - 1;
    }

    // Calculate period index based on the month relative to the accounting year start
    let monthInAccountingYear = (date.getMonth() - startInfo.month + 12) % 12; // 0-indexed month within the accounting year
    let period_index = monthInAccountingYear + 1; // Convert to 1-indexed (1-12)

    return { customs_year: customsYear, period_index: period_index };
}

let splineDataGlobal = [];
let splineTypes = [];
let splineColors = {};

function generateColorPalette(n) {
    // You can replace this with a better palette generator if needed
    const baseColors = [
        '#1f77b477', '#ff7f0e77', '#2ca02c77', '#d6272877',
        '#9467bd77', '#8c564b77', '#e377c277', '#7f7f7f77',
        '#bcbd2277', '#17becf77'
    ];
    const colors = [];
    for (let i = 0; i < n; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

async function fetchSplineData() {
    if (splineDataGlobal.length === 0) {
        const response = await fetch('data/enrolled/MGG_Enrolled_Customs.json');
        const rawData = await response.json();

        splineDataGlobal = rawData;

        if (rawData.length > 0) {
            const sample = rawData[0];

            // Dynamically get spline keys
            splineTypes = Object.keys(sample).filter(k =>
                k !== 'customs_year' && k !== 'period_index' && k !== 'year'
            );

            const dynamicColors = generateColorPalette(splineTypes.length);
            splineTypes.forEach((type, index) => {
                splineColors[type] = dynamicColors[index];
            });
        }
    }
}

async function renderChart() {
    await fetchSplineData(); // Ensure spline data is loaded

    const jsonData = $('#exportButtons i.fa-file-code').parent('span').data('data-export');

    if (!jsonData || jsonData.length === 0) {
        console.warn("No data found for chart rendering.");
        if (chart) chart.destroy();
        return;
    }

    const selectedDateStart = $('#dateStart').val();
    const selectedPeriod = $('#period').val(); // 'year', 'quarter', 'month'

    const dataForChart = jsonData.map(lading => {
        const dateResult = calculateCustomsYearAndPeriod(lading.primary_date || lading.date, selectedDateStart);
        if (!dateResult) return null;

        const year = dateResult.customs_year;
        const monthIndex = dateResult.period_index; // 1-12 based on accounting year start

        let period_label;
        let sortable_date;

        const startInfo = accountingYears[selectedDateStart]; // Get the start month/day info

        if (selectedPeriod === 'year') {
            period_label = String(year);
            const startMonth = String(startInfo.month + 1).padStart(2, '0');
            const startDay = String(startInfo.day).padStart(2, '0');
            sortable_date = `${year}-${startMonth}-${startDay}`;

        } else if (selectedPeriod === 'quarter') {
            const quarter = Math.ceil(monthIndex / 3);
            period_label = `${year}-Q${quarter}`;

            const monthsIntoAccountingYear = (quarter - 1) * 3;
            let actualMonth = (startInfo.month + monthsIntoAccountingYear) % 12;
            let actualYearForDate = year;
            if (startInfo.month + monthsIntoAccountingYear >= 12) {
                actualYearForDate = year + 1;
            }

            const dummyDate = new Date(actualYearForDate, actualMonth, 1);
            sortable_date = dummyDate.toISOString().split('T')[0];

        } else if (selectedPeriod === 'month') {
            period_label = `${year}-M${monthIndex}`;
            let actualMonth = (startInfo.month + (monthIndex - 1)) % 12;
            let actualYearForDate = year;
            if (actualMonth < startInfo.month && monthIndex > 1) {
                actualYearForDate = year + 1;
            }

            const dummyDate = new Date(actualYearForDate, actualMonth, 1);
            sortable_date = dummyDate.toISOString().split('T')[0];
        }

        return {
            period_key: period_label,
            sortable_date: sortable_date,
            customs_type: lading.customs_type
        };
    }).filter(item => item !== null && item.sortable_date !== undefined);

    const counts = {};
    dataForChart.forEach(item => {
        const periodKey = item.period_key;
        if (!periodKey) return;

        if (!counts[periodKey]) {
            counts[periodKey] = {
                customs_types: {},
                total: 0,
                period_label: item.period_key,
                sortable_date: item.sortable_date
            };
        }
        counts[periodKey].customs_types[item.customs_type] = (counts[periodKey].customs_types[item.customs_type] || 0) + 1;
        counts[periodKey].total++;
    });

    const periodKeysSorted = Object.keys(counts).sort((a, b) => {
        const dateA = new Date(counts[a].sortable_date);
        const dateB = new Date(counts[b].sortable_date);
        return dateA - dateB;
    });

    const labels = periodKeysSorted.map(key => counts[key].period_label);
    const dataPointsForXAxis = periodKeysSorted.map(key => counts[key].sortable_date);

    let chartCustomsTypes = Array.from(new Set(dataForChart.map(d => d.customs_type)));
    const typeToColour = Object.fromEntries(
        customsTypes.map(d => [d.short, d.colour])
    );

    if (visibleTypes.size === 0) {
        visibleTypes = new Set(chartCustomsTypes);
    }

    const barDatasets = chartCustomsTypes.map((type, index) => ({
        type: 'bar', // Explicitly set type for bar datasets
        label: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
        data: periodKeysSorted.map(key => ({
            x: counts[key].sortable_date,
            y: counts[key]?.customs_types[type] || 0
        })),
        borderColor: typeToColour[type] || "rgba(0,0,0,0.5)",
        backgroundColor: typeToColour[type] || "rgba(0,0,0,0.5)",
        fill: false,
        hidden: !visibleTypes.has(type),
        order: 2, // Bars should be drawn behind lines
        yAxisID: 'y' // Assign to the default left Y-axis
    }));

    const splineDatasets = [];
    splineTypes.forEach(type => {
        const data = splineDataGlobal
            .filter(item => item.hasOwnProperty(type) && item[type] !== null)
            .map(item => ({
                x: `${item.year}-${String(accountingYears[selectedDateStart].month + 1).padStart(2, '0')}-${String(accountingYears[selectedDateStart].day).padStart(2, '0')}`, // Align with the accounting year start
                y: item[type]
            }));

        const label_parts = type.split('_');

        splineDatasets.push({
            type: 'line',
            label: label_parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
            data: data,
            borderColor: splineColors[type],
            backgroundColor: splineColors[type],
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0, // No blobs
            pointHitRadius: 0, // No hover interaction on invisible points
            yAxisID: 'ySpline',
            order: 1 // Lines should be drawn on top of bars
        });
    });

    const allDatasets = [...barDatasets, ...splineDatasets];

    const ctx = document.getElementById('ladingChart').getContext('2d');
    if (chart) {
        chart.destroy();
    }
    const logTicks = [1, 5, 10, 25, 50, 100, 250, 500, 1000]; // For left log scale

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: allDatasets
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function (tooltipItems) {
                            return tooltipItems[0].dataset.data[tooltipItems[0].dataIndex].x;
                        },
                        label: function (tooltipItem) {
                            const label = tooltipItem.dataset.label;
                            const count = tooltipItem.raw.y;
                            return `${label}: ${plurals(count, 'lading', 'ladings')}`;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 12,
                        filter: function(item, chart) {
                            return true;
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        drag: {
                            enabled: true,
                            borderColor: 'rgba(255, 0, 0, 0.8)',
                            borderWidth: 1,
                            backgroundColor: 'rgba(255, 0, 0, 0.2)',
                        },
                        mode: 'x',
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: selectedPeriod === 'year' ? 'year' : (selectedPeriod === 'quarter' ? 'quarter' : 'month'),
                        parser: selectedPeriod === 'year'
                            ? 'YYYY'
                            : 'YYYY-MM',
                        displayFormats: {
                            year: 'YYYY',
                            quarter: 'YYYY-[Q]Q',
                            month: 'YYYY-MM'
                        },
                        tooltipFormat: selectedPeriod === 'year'
                            ? 'YYYY'
                            : (selectedPeriod === 'quarter'
                                ? 'YYYY-[Q]Q'
                                : 'YYYY-MM')
                    },
                    ticks: {
                        autoSkip: true,
                        maxRotation: selectedPeriod === 'year' ? 0 : 45,
                        minRotation: 0
                    },
                    title: {
                        display: true,
                        padding: {
                            top: 20
                        }
                    }
                },
                y: { // This is the LEFT (primary) Y-axis for bar data
                    type: 'logarithmic',
                    min: 0.8,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Number of Ladings (Log Scale)'
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            if (logTicks.includes(value)) {
                                return value.toLocaleString();
                            }
                            return null;
                        }
                    }
                },
                ySpline: { // This is the RIGHT Y-axis for spline data
                    type: 'linear',
                    // min: removed for linear auto-scaling from 0
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Cloth & Wool Exports (Normalised 5-Year Exponential Moving Average)*'
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            return value.toLocaleString(); // Standard number formatting
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}