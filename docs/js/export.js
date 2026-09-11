// export.js

const exportButtonOptions = [
    {
        iconClass: "fas fa-link",
        title: "Copy URL to clipboard",
        action: "copy-url" // Custom data attribute for action
    },
    {
        iconClass: "fas fa-quote-right",
        title: "Copy citation to clipboard",
        action: "copy-citation"
    },
    {
        iconClass: "fas fa-file-csv",
        title: "Export as CSV",
        action: "export-csv"
    },
    {
        iconClass: "fas fa-file-code",
        title: "Export as JSON (right-click to include annotations)",
        action: "export-json"
    },
    {
        iconClass: "fas fa-file-pdf",
        title: "Download as PDF (keeps colour formatting; hides cargos irrelevant to an active Commodities/People filter)",
        action: "export-pdf"
    }
];

function initializeExportButtons() {
    const $exportButtonsContainer = $("#exportButtons");

    let buttonsHtml = '';

    exportButtonOptions.forEach(option => {
        // Initialize data-data-export only for the JSON button
        const dataAttribute = option.action === 'export-json' ? `data-data-export='[]'` : '';

        buttonsHtml += `
            <span tabindex="0"
                  class="export"
                  data-bs-toggle="tooltip"
                  title="${option.title}"
                  data-action="${option.action}"
                  ${dataAttribute}>
                <i class="${option.iconClass}"></i>
            </span>
        `;
    });

    $exportButtonsContainer.html(buttonsHtml);

    // --- Event Delegation for all button actions ---
    $exportButtonsContainer.on('click contextmenu', '.export', async function (event) {
        // Prevent default browser context menu for right-clicks
        if (event.type === 'contextmenu') {
            event.preventDefault();
        }

        const $clickedSpan = $(this);
        const action = $clickedSpan.data('action');

        $clickedSpan.tooltip('hide');

        switch (action) {
            case 'copy-url':
                copyToClipboard(window.location.href, $clickedSpan.find('i.fas'));
                break;

            case 'copy-citation':
                const today = new Date().toLocaleDateString();
                const citationText = `Jenks, Stuart (ed.) ... Available at: ${window.location.href} (Accessed: ${today}).`;
                copyToClipboard(citationText, $clickedSpan.find('i.fas'));
                break;

            case 'export-csv':
            case 'export-json':
                // For CSV and JSON export, the data is stored on the export-json span.
                const $jsonExportSpan = $exportButtonsContainer.find('[data-action="export-json"]');
                const jsonData = $jsonExportSpan.data('data-export');

                if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
                    console.warn('No valid data to export for CSV/JSON.');
                    // Optionally, provide user feedback (e.g., a toast notification)
                    return;
                }

                const includeAnnotations = (action === 'export-json' && event.type === 'contextmenu');

                // Cargos live in their own store and are no longer kept inside the
                // lading -- that duplicate copy was 89% of every record and the whole
                // reason a filter change took seconds. Fetch them for the filtered set
                // in one query, the same way the PDF export below does, so the exported
                // file still carries what it always carried.
                const cargoRows = await db.cargos
                    .where('lading_id').anyOf(jsonData.map(v => v.lading_id)).toArray();
                const cargosByLading = new Map();
                cargoRows.forEach(c => {
                    if (!cargosByLading.has(c.lading_id)) cargosByLading.set(c.lading_id, []);
                    // Back to the shape the source data had: {text, annotations}.
                    cargosByLading.get(c.lading_id).push({
                        text: c.cargo, annotations: c.annotations || []
                    });
                });
                const withCargos = jsonData.map(v => ({
                    ...v, cargos: cargosByLading.get(v.lading_id) || []
                }));

                // Filter to remove annotations/footnotes/internal fields if not requested
                const exportData = includeAnnotations
                    ? withCargos // If annotations are included, export raw data
                    : withCargos.map(entry => {
                        // Destructure to remove specific fields and keep the rest
                        const {annotations, footnotes, date_list, primary_date, ...rest} = entry;

                        return {
                            ...rest,
                            // Recursively remove annotations from cargos if present
                            cargos: Array.isArray(rest.cargos)
                                ? rest.cargos.map(({annotations: cargoAnnotations, ...cargoRest}) => cargoRest)
                                : rest.cargos // Keep cargos as is if not an array or no annotations
                        };
                    });

                let blob, filename;

                if (action === 'export-csv') {
                    const csvData = convertToCSV(exportData);
                    blob = new Blob(['\uFEFF' + csvData], {type: 'text/csv;charset=utf-8;'});
                    filename = 'LCA_export.csv';
                } else { // export-json
                    blob = new Blob([JSON.stringify(exportData, null, 4)], {type: 'application/json'});
                    filename = 'LCA_export.json';
                }

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                break;

            case 'export-pdf': {
                // Same filtered dataset as CSV/JSON (stashed on the JSON span).
                const pdfData = $exportButtonsContainer.find('[data-action="export-json"]').data('data-export');
                exportFilteredPDF(Array.isArray(pdfData) ? pdfData : []);
                break;
            }

            default:
                console.warn('Unknown action:', action);
        }
    });

    $exportButtonsContainer.on('mouseleave blur', '.export', function () {
        $(this).tooltip('hide');
    });
}

function flattenObject(obj, prefix = '', result = {}) {
    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            flattenObject(value, newKey, result);
        } else {
            result[newKey] = value;
        }
    }
    return result;
}

function convertToCSV(ladings) {
    if (!Array.isArray(ladings) || ladings.length === 0) return '';

    const MLCA_BASE = 'https://w3id.org/mlca/';
    const rows = [];
    const allKeys = new Set();

    for (const lading of ladings) {
        const {cargos = [], ...ladingData} = lading;
        const {footnotes, ...ladingClean} = ladingData;

        // Add persistent identifier URI for the lading
        ladingClean.uri = MLCA_BASE + ladingClean.lading_id;

        if (!Array.isArray(cargos) || cargos.length === 0) {
            // Handle lading with no cargos
            const combined = flattenObject({lading: ladingClean});
            rows.push(combined);
            Object.keys(combined).forEach(k => allKeys.add(k));
            continue;
        }

        for (let i = 0; i < cargos.length; i++) {
            const cargo = {...cargos[i]};
            // Add persistent identifier URI for the cargo
            const cargoSeq = String(i + 1).padStart(4, '0');
            cargo.uri = MLCA_BASE + ladingClean.lading_id + '-' + cargoSeq;

            const combined = flattenObject({
                lading: ladingClean,
                cargo: cargo
            });
            rows.push(combined);
            Object.keys(combined).forEach(k => allKeys.add(k));
        }
    }

    const keys = Array.from(allKeys);
    const header = keys.join(',');
    const lines = rows.map(row => {
        return keys.map(key => {
            let val = row[key];
            if (val == null) return '';
            if (typeof val === 'string') {
                val = val.replace(/"/g, '""'); // escape double quotes
                return `"${val}"`;
            }
            return val;
        }).join(',');
    });

    return [header, ...lines].join('\n');
}

// --------------------------------------------------------------------------
// PDF export of the filtered ladings/cargos.
//
// Rather than add a PDF library (payload-conscious), this opens a print-optimised
// window that reuses the app's own annotation renderer + css/styles.css, so the
// full coloured formatting is preserved exactly, and triggers the browser's
// "Save as PDF". When a Commodities or People filter is active, cargos that don't
// match it are hidden so only the relevant, colour-highlighted cargos appear.
// --------------------------------------------------------------------------
function _pdfEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, m =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

const PDF_PRINT_CSS = `
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { margin: 14mm; }
    html, body.pdf-body { height: auto; overflow: visible; background: #fff; color: #212529;
        font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; margin: 0; }
    .pdf-header { border-bottom: 2px solid #343a40; padding-bottom: 8px; margin-bottom: 14px; }
    .pdf-header h1 { font-size: 18px; margin: 0 0 4px; }
    .pdf-meta { font-size: 11px; color: #6c757d; }
    .pdf-filters { margin: 6px 0 0; padding-left: 18px; font-size: 11px; color: #495057; }
    .pdf-lading { break-inside: avoid; page-break-inside: avoid; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
    .pdf-lading-head { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #495057; margin-bottom: 3px; }
    .pdf-type-badge { display: inline-block; min-width: 16px; text-align: center; font-weight: 700; color: #fff;
        border-radius: 3px; padding: 0 5px; font-size: 11px; }
    .pdf-date { font-weight: 600; }
    .pdf-lid { color: #adb5bd; }
    .pdf-hidden-note, .pdf-no-cargos { font-style: italic; color: #adb5bd; }
    .pdf-body .lading-text { display: block; margin: 2px 0; line-height: 1.5; }
    /* styles.css hides .cargos-list by default (the app toggles it) — force it open for the PDF */
    .pdf-body .cargos-list { display: block !important; margin: 6px 0 0; padding-left: 18px; list-style: none; }
    .pdf-body .cargos-list li { margin: 3px 0; line-height: 1.5; }
`;

async function exportFilteredPDF(ladings) {
    if (!ladings || !ladings.length) {
        alert('No ladings to export — apply filters or wait for the table to finish loading.');
        return;
    }
    if (ladings.length > 1500 &&
        !confirm(`This will render ${ladings.length.toLocaleString()} ladings into one PDF, which may be slow to lay out. Continue?`)) {
        return;
    }

    const groupSel = new Set(filterState.groupFilter || []);
    const pidSel = new Set((filterState.personFilter || []).map(p => String(p.pid)));
    const filterActive = groupSel.size > 0 || pidSel.size > 0;
    const shortToColour = customsTypes.reduce((a, t) => (a[t.short] = t.colour, a), {});

    // One query for every cargo in the filtered set, grouped by lading.
    const cargoRows = await db.cargos.where('lading_id').anyOf(ladings.map(v => v.lading_id)).toArray();
    const cargosByLading = new Map();
    cargoRows.forEach(c => {
        if (!cargosByLading.has(c.lading_id)) cargosByLading.set(c.lading_id, []);
        cargosByLading.get(c.lading_id).push(c);
    });

    // A cargo is relevant if it matches any active per-cargo filter dimension
    // (commodity group via _collectLadingGroups, or a selected person via pid).
    const cargoRelevant = (c) => {
        if (!filterActive) return true;
        if (groupSel.size && _collectLadingGroups([c]).some(g => groupSel.has(g))) return true;
        if (pidSel.size && (c.annotations || []).some(a => a.pid != null && pidSel.has(String(a.pid)))) return true;
        return false;
    };

    let body = '';
    ladings.forEach(v => {
        const date = v.date?.dates ? formatDate(v.date.dates[0]) : '';
        const dowNum = v.date?.dow?.[0];
        const dow = dowNum ? `${abbrIsoDow[dowNum]}, ` : '';
        const typeInitial = v.customs_type ? v.customs_type.charAt(0).toUpperCase() : '';
        const badge = `<span class="pdf-type-badge" style="background-color:${shortToColour[v.customs_type] || 'rgba(0,0,0,0.5)'};" title="${_pdfEsc(upperFirst(v.customs_type))}">${_pdfEsc(typeInitial)}</span>`;
        const dir = (v.export === undefined || v.export === null) ? '⇄ indeterminate' : (v.export ? '→ export' : '← import');

        const allCargos = cargosByLading.get(v.lading_id) || [];
        const shown = allCargos.filter(cargoRelevant);
        const hidden = allCargos.length - shown.length;

        let cargosHtml = '';
        if (shown.length) {
            cargosHtml = '<ul class="cargos-list">' + shown.map(c => {
                const cls = filterActive ? ' class="cargo-group-match"' : '';
                return `<li${cls}><span class="cargo-text-content">${applyOffsetAnnotations(c.cargo || '', c.annotations, v.footnotes || [])}</span></li>`;
            }).join('') + '</ul>';
        } else if (allCargos.length && filterActive) {
            cargosHtml = '<div class="pdf-no-cargos">(cargos present but none match the active filter)</div>';
        }
        const hiddenNote = (filterActive && hidden)
            ? `<span class="pdf-hidden-note">${hidden} other cargo${hidden === 1 ? '' : 's'} hidden</span>` : '';

        body += `
            <div class="pdf-lading">
                <div class="pdf-lading-head">
                    ${badge}
                    <span class="pdf-date">${_pdfEsc(dow + date)}</span>
                    <span>${_pdfEsc(dir)}</span>
                    <span class="pdf-lid">#${_pdfEsc(v.lading_id)}${v.page?.number ? ' · p.' + _pdfEsc(v.page.number) : ''}</span>
                    ${hiddenNote}
                </div>
                <div class="lading-text">${applyOffsetAnnotations(v.text || '', v.annotations, v.footnotes || [])}</div>
                ${cargosHtml}
            </div>`;
    });

    // Header summarising the active filters.
    const bits = [];
    if (typeof visibleTypes !== 'undefined' && visibleTypes.size) bits.push('Customs types: ' + [...visibleTypes].map(upperFirst).join(', '));
    if (Array.isArray(filterState.yearRange) && filterState.yearRange.length === 2) bits.push(`Years: ${filterState.yearRange[0]}–${filterState.yearRange[1]}`);
    if (pidSel.size) bits.push('People: ' + filterState.personFilter.map(p => p.label).join(', '));
    if (groupSel.size) bits.push(`Commodities (${filterState.groupMode}): ` + filterState.groupFilter.join(', '));
    if (filterState.searchQuery) bits.push('Search: “' + filterState.searchQuery + '”');
    const header = `
        <div class="pdf-header">
            <h1>London Customs Accounts — filtered ladings</h1>
            <div class="pdf-meta">${ladings.length.toLocaleString()} ladings${filterActive ? ' · cargos irrelevant to the active filter hidden' : ''} · generated ${_pdfEsc(new Date().toLocaleString())}</div>
            ${bits.length ? '<ul class="pdf-filters"><li>' + bits.map(_pdfEsc).join('</li><li>') + '</li></ul>'
                          : '<div class="pdf-meta">No filters active — showing all ladings.</div>'}
        </div>`;

    const cssHref = new URL('css/styles.css', location.href).href;
    const docHtml = `<!doctype html><html><head><meta charset="utf-8">
        <title>LCA filtered ladings</title>
        <link rel="stylesheet" href="${cssHref}">
        <style>${PDF_PRINT_CSS}</style>
        </head><body class="pdf-body">${header}${body}
        <script>
          (function(){
            function go(){ try { window.focus(); window.print(); } catch(e){} }
            if (document.readyState === 'complete') setTimeout(go, 400);
            else window.addEventListener('load', function(){ setTimeout(go, 400); });
          })();
        <\/script>
        </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { alert('Pop-up blocked — please allow pop-ups for this site, then click Download PDF again.'); return; }
    w.document.open();
    w.document.write(docHtml);
    w.document.close();
}
