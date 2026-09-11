// Load data from external JSON file
let tableData = null;
let sortColumn = -4;
let sortAscending = true;
let currentData = [];

// Initialize by loading packaged JSON, but allow user import override
function loadPackagedData() {
    fetch('data/customs_officials.json')
        .then(response => response.json())
        .then(data => {
            // support both formats: { headers: [...], data: [...] }
            if (!data.headers && data.columns) data.headers = data.columns;

            tableData = data;

            // Normalise headers to remove trailing spaces / duplicates
            try {
                normalizeHeaders(tableData);
            } catch (e) {
                console.debug('normalizeHeaders error', e);
            }

            // normalize date fields from Period(s) in Office into Start Date / End Date / Days in Office
            normalizeDatesInTableData(tableData);

            // Add "Sources" header if not present (for the Sources button column)
            if (!tableData.headers.some(h => String(h).trim().toLowerCase() === 'sources')) {
                // Find where source columns are in the headers
                const firstSourceIdx = tableData.headers.findIndex(h => isSourceColumn(h));
                if (firstSourceIdx !== -1) {
                    // Insert Sources header before the first source column
                    tableData.headers.splice(firstSourceIdx, 0, 'Sources');
                } else {
                    // No source columns found, add at end
                    tableData.headers.push('Sources');
                }
            }

            // ensure stable ids for packaged data
            try {
                ensureRowIds(tableData);
            } catch (e) { /* ignore */
            }
            currentData = [...tableData.data];
            initTable();
            populateFilters();
            updateRecordCount();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            document.getElementById('noResults').textContent = 'Error loading data. Please ensure customs_officials.json is in the same directory.';
            document.getElementById('noResults').classList.add('show');
        });
}

// Date parsing helpers
function normalizeDatesInTableData(tableDataObj) {
    if (!tableDataObj || !Array.isArray(tableDataObj.data)) return;
    tableDataObj.data.forEach(function (row) {
        if (!row || typeof row !== 'object') return;
        var period = (row['Period(s) in Office '] || row['Period(s) in Office'] || row['Period(s) in Office '] || '').trim();
        if (!period) return;
        var parsed = parsePeriodRange(period);
        if (!row['Start Date'] || row['Start Date'] === '') {
            if (parsed.startISO) row['Start Date'] = parsed.startISO;
        }
        if (!row['End Date'] || row['End Date'] === '') {
            if (parsed.endISO) row['End Date'] = parsed.endISO;
        }
        if ((!row['Days in Office'] || row['Days in Office'] === '') && Number.isFinite(parsed.days)) {
            row['Days in Office'] = String(parsed.days);
        }
    });
}

// Ensure header names are trimmed and unique; rename row keys accordingly
function normalizeHeaders(tableDataObj) {
    if (!tableDataObj || !Array.isArray(tableDataObj.headers) || !Array.isArray(tableDataObj.data)) return;
    const originalHeaders = tableDataObj.headers.slice();
    const newHeaders = [];
    const seen = new Set();
    for (const orig of originalHeaders) {
        const trimmed = String(orig).trim();
        if (!seen.has(trimmed)) {
            seen.add(trimmed);
            newHeaders.push(trimmed);
        }
    }
    // Rename keys in each row from original (with trailing space) to trimmed
    tableDataObj.data.forEach(function (row) {
        if (!row || typeof row !== 'object') return;
        originalHeaders.forEach(function (origKey) {
            const trimmedKey = String(origKey).trim();
            if (origKey === trimmedKey) return;
            if (row.hasOwnProperty(origKey)) {
                if (!row.hasOwnProperty(trimmedKey) || !row[trimmedKey]) {
                    row[trimmedKey] = row[origKey];
                }
                try { delete row[origKey]; } catch (e) {}
            }
        });
    });
    tableDataObj.headers = newHeaders;
}

// Ensure each data row has a stable internal id (_rowId). This id is used to map DOM rows back to data rows
function ensureRowIds(tableDataObj) {
    if (!tableDataObj || !Array.isArray(tableDataObj.data)) return;
    if (!window.__rowIdCounter) {
        // start counter from timestamp to reduce collision risk
        window.__rowIdCounter = Date.now();
    }
    tableDataObj.data.forEach(function (r) {
        if (!r || typeof r !== 'object') return;
        if (!r._rowId) {
            window.__rowIdCounter += 1;
            r._rowId = 'r' + window.__rowIdCounter;
        }
    });
}

function parsePeriodRange(period) {
    // Normalize dashes and whitespace
    var s = String(period).replace(/[\u2012\u2013\u2014\u2015]/g, '-').replace(/\u00A0/g, ' ').trim();
    s = s.replace(/\s+-\s+/g, ' - ');
    // split on hyphen (range)
    var parts = s.split(/\s-\s|\sto\s/i).map(function (p) {
        return p.trim();
    }).filter(Boolean);
    var startPart = parts[0] || '';
    var endPart = parts[1] || parts[0] || '';
    var startDate = parseDatePiece(startPart, false);
    var endDate = parseDatePiece(endPart, true);
    var days = null;
    if (startDate && endDate) {
        var msPerDay = 24 * 60 * 60 * 1000;
        days = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
        if (days < 0) days = null;
    }
    return {startISO: startDate ? toISO(startDate) : null, endISO: endDate ? toISO(endDate) : null, days: days};
}

function toISO(d) {
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth() + 1).padStart(2, '0');
    var day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function parseDatePiece(piece, isEnd) {
    if (!piece) return null;
    var p = piece.replace(/\(.*?\)/g, '').replace(/c\.?\s*/i, '').replace(/circa\s*/i, '').trim();
    // remove ordinal suffixes
    p = p.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');
    // month map
    var months = {
        jan: 1,
        feb: 2,
        mar: 3,
        apr: 4,
        may: 5,
        jun: 6,
        jul: 7,
        aug: 8,
        sep: 9,
        sept: 9,
        oct: 10,
        nov: 11,
        dec: 12
    };

    // try day month year
    var m = p.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{3,4})$/);
    if (m) {
        var day = parseInt(m[1], 10);
        var mon = months[m[2].toLowerCase().slice(0, 3)] || NaN;
        var year = parseInt(m[3], 10);
        if (!isNaN(mon)) return new Date(Date.UTC(year, mon - 1, day));
    }
    // try month year
    m = p.match(/^([A-Za-z]+)\s+(\d{3,4})$/);
    if (m) {
        var mon2 = months[m[1].toLowerCase().slice(0, 3)] || NaN;
        var year2 = parseInt(m[2], 10);
        if (!isNaN(mon2)) {
            if (isEnd) {
                var last = lastDayOfMonth(year2, mon2);
                return new Date(Date.UTC(year2, mon2 - 1, last));
            } else {
                return new Date(Date.UTC(year2, mon2 - 1, 1));
            }
        }
    }
    // try year only or year with extra text
    m = p.match(/(\d{3,4})/);
    if (m) {
        var year3 = parseInt(m[1], 10);
        if (isEnd) return new Date(Date.UTC(year3, 11, 31));
        return new Date(Date.UTC(year3, 0, 1));
    }
    return null;
}

function lastDayOfMonth(year, month) { // month 1-12
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Determine whether a column header is a "source" column (collapsed into Sources button)
function isSourceColumn(header) {
    const h = String(header).trim().toLowerCase();
    return h.includes('source') || h.includes('enrolled custom accounts') ||
           h.includes('surviving accounts') || h.includes('tna ');
}

// Badge class helpers (Custom Type)
function getCustomTypeBadgeClass(v) {
    if (!v) return '';
    const s = v.toLowerCase();
    if (s.includes('wool')) return 'badge badge-ct-wool';
    if (s.includes('tunnage') || s.includes('poundage')) return 'badge badge-ct-tunnage';
    if (s.includes('petty')) return 'badge badge-ct-petty';
    if (s.includes('searcher')) return 'badge badge-ct-searcher';
    return 'badge';
}

// Badge class helpers (Role)
function getRoleBadgeClass(v) {
    if (!v) return '';
    const s = v.toLowerCase();
    if (s.includes('collector')) return 'badge badge-role-collector';
    if (s.includes('controller') && s.includes('surveyor')) return 'badge badge-role-surveyor';
    if (s.includes('controller')) return 'badge badge-role-controller';
    if (s.includes('supervisor')) return 'badge badge-role-supervisor';
    if (s.includes('searcher')) return 'badge badge-role-searcher';
    if (s.includes('deput')) return 'badge badge-role-deputy';
    if (s.includes('appraiso') || s.includes('appraise')) return 'badge badge-role-appraiser';
    return 'badge badge-role-default';
}

// Format a name with the surname (everything before the first comma) in bold
function formatNameCell(td, name) {
    td.innerHTML = '';
    if (!name) return;
    const commaIdx = name.indexOf(',');
    if (commaIdx === -1) {
        td.textContent = name;
        return;
    }
    const strong = document.createElement('strong');
    strong.className = 'surname';
    strong.textContent = name.substring(0, commaIdx);
    td.appendChild(strong);
    td.appendChild(document.createTextNode(name.substring(commaIdx)));
}

loadPackagedData();

// Initialize the table
function initTable() {
    // Define columns to hide from display (but keep in data)
    const hiddenColumns = ['Start Date', 'End Date'];

    // Reorder headers to ensure Name, Role, Custom Type are the first three columns (if present)
    const headerRow = document.getElementById('headerRow');
    headerRow.innerHTML = '';
    if (!tableData || !Array.isArray(tableData.headers)) tableData = tableData || {headers: [], data: []};
    const headersCopy = tableData.headers.slice();
    const desiredFirst = ['Name', 'Role', 'Custom Type'];
    const reordered = [];
    // Pull desired headers in order if they exist (case-insensitive match)
    desiredFirst.forEach(function (wanted) {
        const idx = headersCopy.findIndex(h => String(h).trim().toLowerCase() === wanted.toLowerCase());
        if (idx !== -1) {
            reordered.push(headersCopy[idx]);
            headersCopy.splice(idx, 1);
        }
    });
    // Append remaining headers
    headersCopy.forEach(h => reordered.push(h));
    // Assign back to tableData.headers so renderTable uses the ordered headers
    tableData.headers = reordered;

    // Create header cells (skip hidden columns and source columns)
    tableData.headers.forEach(function (header, index) {
        // Skip source columns (they're shown via Sources button)
        if (isSourceColumn(header)) {
            return;
        }

        // Skip hidden columns
        if (hiddenColumns.some(h => String(h).trim().toLowerCase() === String(header).trim().toLowerCase())) {
            return;
        }

        const th = document.createElement('th');
        th.textContent = header;
        th.dataset.column = index;
        th.style.cursor = 'pointer';
        th.title = 'Click to sort / reverse sort';
        th.addEventListener('click', function () {
            sortTable(index);
        });
        headerRow.appendChild(th);
    });

    // Populate table
    renderTable();
    // If there is a sensible default date column try to sort by it
    const dateIdx = tableData.headers.findIndex(h => h.toLowerCase().includes('date'));
    if (dateIdx >= 0) sortTable(dateIdx);
}

// Populate filter dropdowns
function populateFilters() {
    const customTypes = new Set();
    const roles = new Set();

    // tableData.data may contain section objects from imported CSVs
    tableData.data.forEach(row => {
        if (!row || typeof row !== 'object') return;
        if (row.__section__ || row.__category__) return; // skip structural rows
        if (row['Custom Type']) customTypes.add(row['Custom Type']);
        if (row['Role']) roles.add(row['Role']);
    });

    // Populate Custom Type filter
    const customTypeFilter = document.getElementById('customTypeFilter');
    customTypeFilter.innerHTML = '<option value="">All Custom Types</option>';
    Array.from(customTypes).sort().forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        customTypeFilter.appendChild(option);
    });

    // Populate Role filter
    const roleFilter = document.getElementById('roleFilter');
    roleFilter.innerHTML = '<option value="">All Roles</option>';
    Array.from(roles).sort().forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        roleFilter.appendChild(option);
    });
}

// Render table rows
function renderTable() {
    // Define columns to hide from display (but keep in data)
    const hiddenColumns = ['Start Date', 'End Date'];

    // Helper to get row value with fuzzy key matching (handles trailing spaces)
    function getRowValue(row, header) {
        if (!row || !header) return '';

        // Direct match
        if (row.hasOwnProperty(header)) return row[header];

        // Try trimmed header
        const trimmedHeader = String(header).trim();
        if (row.hasOwnProperty(trimmedHeader)) return row[trimmedHeader];

        // Try to find key with same trimmed value
        const headerLower = trimmedHeader.toLowerCase();
        for (const key in row) {
            if (String(key).trim().toLowerCase() === headerLower) {
                return row[key];
            }
        }

        return '';
    }

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    if (!Array.isArray(currentData) || !Array.isArray(tableData.headers)) return;
    currentData.forEach(function(row) {
        if (!row || typeof row !== 'object') return;
        const tr = document.createElement('tr');
        if (row._rowId) tr.dataset.rowId = row._rowId;

        tableData.headers.forEach(function(header) {
            // Skip source columns (they're shown via Sources button)
            if (isSourceColumn(header)) return;

            // Skip hidden date columns
            if (hiddenColumns.some(h => String(h).trim().toLowerCase() === String(header).trim().toLowerCase())) {
                return;
            }

            const td = document.createElement('td');
            if (header === 'Sources') {
                // Gather all source columns from this row
                const sources = {};
                Object.keys(row).forEach(k => {
                    if (isSourceColumn(k)) {
                        const v = row[k];
                        if (v && String(v).trim() && String(v).toUpperCase() !== 'N/A' && v !== '-' && v !== '—') {
                            sources[k] = v;
                        }
                    }
                });

                if (Object.keys(sources).length > 0) {
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-ghost';
                    btn.type = 'button';
                    btn.textContent = 'Sources';
                    btn.addEventListener('click', () => openSourcesModal(sources));
                    td.appendChild(btn);
                } else {
                    td.textContent = '';
                }
            } else {
                const val = getRowValue(row, header) || '';
                const headerNorm = String(header).trim().toLowerCase();
                if (headerNorm === 'name' && val) {
                    formatNameCell(td, val);
                } else if (headerNorm === 'custom type' && val) {
                    const span = document.createElement('span');
                    span.className = getCustomTypeBadgeClass(val);
                    span.textContent = val;
                    td.appendChild(span);
                } else if (headerNorm === 'role' && val) {
                    const span = document.createElement('span');
                    span.className = getRoleBadgeClass(val);
                    span.textContent = val;
                    td.appendChild(span);
                } else {
                    td.textContent = val;
                }
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// Open the sources modal and populate content from the removed object
function openSourcesModal(sources) {
    const content = document.getElementById('sources-modal-content');
    content.innerHTML = '';
    if (!sources || typeof sources !== 'object' || Object.keys(sources).length === 0) {
        content.textContent = 'No sources available.';
        document.getElementById('sources-modal').style.display = 'flex';
        return;
    }
    Object.keys(sources).forEach(function(k) {
        const v = String(sources[k]).trim();
        if (!v || v.toUpperCase() === 'N/A' || v === '-' || v === '—') return;
        const container = document.createElement('div');
        container.style.padding = '8px 0';
        container.style.borderBottom = '1px solid #eef2f7';
        const keyEl = document.createElement('div');
        keyEl.style.fontWeight = '700';
        keyEl.style.marginBottom = '4px';
        keyEl.textContent = k;
        const valEl = document.createElement('div');
        valEl.style.color = '#475569';
        valEl.style.whiteSpace = 'pre-wrap';
        valEl.textContent = v;
        container.appendChild(keyEl);
        container.appendChild(valEl);
        content.appendChild(container);
    });
    document.getElementById('sources-modal').style.display = 'flex';
}

// Check if a column contains dates or numbers
function isDateColumn(header) {
    return /date/i.test(header);
}

function isNumberColumn(header) {
    return /days|number|count|qty|quantity|amount/i.test(header);
}

// Sort table by column
function sortTable(columnIndex) {
    const header = tableData.headers[columnIndex];
    const headers = document.querySelectorAll('th');

    // Toggle sort direction if same column
    if (sortColumn === columnIndex) {
        sortAscending = !sortAscending;
    } else {
        sortAscending = true;
        sortColumn = columnIndex;
    }

    // Update header styles
    headers.forEach((h, i) => {
        h.classList.remove('sort-asc', 'sort-desc');
        if (i === columnIndex) {
            h.classList.add(sortAscending ? 'sort-asc' : 'sort-desc');
        }
    });

    // Sort the data
    currentData.sort((a, b) => {
        let aVal = a[header] || '';
        let bVal = b[header] || '';

        // Special handling for date columns
        if (isDateColumn(header)) {
            if (!aVal && !bVal) return 0;
            if (!aVal) return sortAscending ? 1 : -1;
            if (!bVal) return sortAscending ? -1 : 1;
            if (aVal < bVal) return sortAscending ? -1 : 1;
            if (aVal > bVal) return sortAscending ? 1 : -1;
            return 0;
        }

        // Special handling for number columns
        if (isNumberColumn(header)) {
            const aNum = parseFloat(String(aVal).replace(/[^0-9.\-]/g, '')) || 0;
            const bNum = parseFloat(String(bVal).replace(/[^0-9.\-]/g, '')) || 0;

            if (!aVal && !bVal) return 0;
            if (!aVal) return sortAscending ? 1 : -1;
            if (!bVal) return sortAscending ? -1 : 1;

            return sortAscending ? aNum - bNum : bNum - aNum;
        }

        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (aVal < bVal) return sortAscending ? -1 : 1;
        if (aVal > bVal) return sortAscending ? 1 : -1;
        return 0;
    });

    renderTable();
    applyFilters();
}

// Apply all filters
function applyFilters() {
    const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
    const customType = document.getElementById('customTypeFilter').value;
    const role = document.getElementById('roleFilter').value;
    const rows = Array.from(document.querySelectorAll('#tableBody tr'));
    // First pass: apply filters to normal rows (non-section)
    rows.forEach((row) => {
        if (row.classList.contains('section-row') || row.classList.contains('category-row')) {
            // hide initially; will be toggled in second pass
            row.style.display = 'none';
            return;
        }
        // Determine data object by section-aware index: we map DOM rows to data rows by matching order
        // Simpler: read cell text for filtering
        const text = row.textContent.toLowerCase();
        const cells = row.querySelectorAll('td');
        const obj = {};
        for (let i = 0; i < tableData.headers.length; i++) {
            obj[tableData.headers[i]] = (cells[i] && cells[i].textContent) ? cells[i].textContent : '';
        }

        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesCustomType = !customType || obj['Custom Type'] === customType;
        const matchesRole = !role || obj['Role'] === role;

        if (matchesSearch && matchesCustomType && matchesRole) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    // Second pass: show section/category rows if any child rows in same section are visible
    const sectionRows = document.querySelectorAll('#tableBody tr.section-row, #tableBody tr.category-row');
    sectionRows.forEach(srow => {
        const sec = srow.getAttribute('data-section');
        const memberRows = document.querySelectorAll('#tableBody tr[data-section="' + sec + '"]:not(.section-row):not(.category-row)');
        let anyVisible = false;
        memberRows.forEach(mr => {
            if (mr.style.display !== 'none') anyVisible = true;
        });
        if (anyVisible) {
            srow.style.display = '';
        } else {
            srow.style.display = 'none';
        }
    });

    // Compute visible data-row count
    const visibleCount = document.querySelectorAll('#tableBody tr:not(.section-row):not(.category-row):not([style*="display: none"])').length;
    document.getElementById('visibleCount').textContent = visibleCount;
    document.getElementById('noResults').classList.toggle('show', visibleCount === 0);
}

// Update record count
function updateRecordCount() {
    if (!tableData) return;
    document.getElementById('visibleCount').textContent = document.querySelectorAll('#tableBody tr:not(.section-row):not(.category-row):not([style*="display: none"])').length;
    // totalCount is count of real data rows, excluding section rows
    document.getElementById('totalCount').textContent = tableData.data.filter(r => !(r && (r.__section__ || r.__category__))).length;
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', () => {
    applyFilters();
    updateRecordCount();
});
document.getElementById('customTypeFilter').addEventListener('change', () => {
    applyFilters();
    updateRecordCount();
});
document.getElementById('roleFilter').addEventListener('change', () => {
    applyFilters();
    updateRecordCount();
});

// Sources modal close button
document.getElementById('sources-modal-close').addEventListener('click', function () {
    document.getElementById('sources-modal').style.display = 'none';
});

// Export button wiring: JSON and CSV
document.getElementById('export-btn').addEventListener('click', exportJSON);
document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

// === EXPORT JSON ===
function exportJSON() {
    if (!tableData || !tableData.headers) {
        alert('No data loaded to export.');
        return;
    }

    // Clean data: remove internal fields
    const cleanedData = tableData.data.map(function (row) {
        const cleanRow = {};
        Object.keys(row).forEach(function (key) {
            if (key !== '_removedSources' && key !== '_rowId') {
                cleanRow[key] = row[key];
            }
        });
        return cleanRow;
    });

    // Clean headers: remove 'Sources' button column
    const cleanedHeaders = tableData.headers.filter(h => String(h).trim().toLowerCase() !== 'sources');

    const exportObj = {headers: cleanedHeaders, data: cleanedData};
    const jsonStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([jsonStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    const filename = `officials_export_${ts}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// === EXPORT CSV ===
function exportCSV() {
    if (!tableData || !tableData.headers) {
        alert('No data loaded to export.');
        return;
    }

    // Use all headers except the virtual 'Sources' button column and internal fields
    const headers = tableData.headers.filter(h => String(h).trim().toLowerCase() !== 'sources');

    // Use currentData (respects current sort) and filter by visible rows
    const visibleRowIds = new Set();
    document.querySelectorAll('#tableBody tr:not(.section-row):not(.category-row)').forEach(tr => {
        if (tr.style.display !== 'none' && tr.dataset.rowId) {
            visibleRowIds.add(tr.dataset.rowId);
        }
    });

    const dataToExport = visibleRowIds.size > 0
        ? currentData.filter(r => r._rowId && visibleRowIds.has(r._rowId))
        : currentData;

    const escapeCSV = (val) => {
        const str = String(val == null ? '' : val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const rows = [headers.map(escapeCSV).join(',')];
    for (const row of dataToExport) {
        rows.push(headers.map(h => {
            const val = row[h] || '';
            return escapeCSV(val);
        }).join(','));
    }

    const csvContent = rows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    const filename = `officials_export_${ts}.csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Show Editor link when GitHub token is present
function updateButtonsVisibility() {
    const token = localStorage.getItem('github_token');
    const editorLink = document.getElementById('editor-link');
    if (editorLink) {
        editorLink.style.display = token ? '' : 'none';
    }
}

// call once to set visibility
updateButtonsVisibility();