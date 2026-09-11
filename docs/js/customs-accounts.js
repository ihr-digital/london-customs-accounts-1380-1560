// Customs Accounts Database JavaScript

let allData = [];
let filteredData = [];
let currentSort = { column: null, ascending: true };

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
});

async function loadData() {
    const loadingEl = document.getElementById('loading');
    loadingEl.style.display = 'block';

    try {
        const response = await fetch('data/particular_customs_accounts.json');
        const data = await response.json();

        allData = data.accounts || [];
        filteredData = [...allData];

        populateFilters();
        renderTable();
        updateStats();

        loadingEl.style.display = 'none';
    } catch (error) {
        console.error('Error loading data:', error);
        loadingEl.textContent = 'Error loading data. Please refresh the page.';
    }
}

function populateFilters() {
    // Get unique values for each filter
    const ports = [...new Set(allData.map(r => r.Port))].sort();
    const types = [...new Set(allData.map(r => r['Customs Type']))].filter(Boolean).sort();
    const archives = [...new Set(allData.map(r => r.Archive))].filter(Boolean).sort();

    const portSelect = document.getElementById('filter-port');
    const typeSelect = document.getElementById('filter-type');
    const archiveSelect = document.getElementById('filter-archive');

    ports.forEach(port => {
        const option = document.createElement('option');
        option.value = port;
        option.textContent = port;
        portSelect.appendChild(option);
    });

    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        // Truncate long entries for display in dropdown
        option.textContent = type.length > 80 ? type.substring(0, 77) + '...' : type;
        option.title = type; // Full text on hover
        typeSelect.appendChild(option);
    });

    archives.forEach(archive => {
        const option = document.createElement('option');
        option.value = archive;
        option.textContent = archive;
        archiveSelect.appendChild(option);
    });
}

function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search');
    const clearSearchBtn = document.getElementById('clear-search');

    searchInput.addEventListener('input', (e) => {
        if (e.target.value) {
            clearSearchBtn.classList.add('visible');
        } else {
            clearSearchBtn.classList.remove('visible');
        }
        applyFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.remove('visible');
        applyFilters();
    });

    // Filters
    document.getElementById('filter-port').addEventListener('change', applyFilters);
    document.getElementById('filter-type').addEventListener('change', applyFilters);
    document.getElementById('filter-archive').addEventListener('change', applyFilters);

    // Reset filters
    document.getElementById('reset-filters').addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.remove('visible');
        document.getElementById('filter-port').value = '';
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-archive').value = '';
        applyFilters();
    });

    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            sortTable(column);
        });
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const portFilter = document.getElementById('filter-port').value;
    const typeFilter = document.getElementById('filter-type').value;
    const archiveFilter = document.getElementById('filter-archive').value;

    filteredData = allData.filter(record => {
        // Search filter
        if (searchTerm) {
            const searchableText = [
                record.Officials,
                record.Port,
                record['Customs Type'],
                record.Reference,
                record['Years covered (modern)'],
                record['Years covered (regnal years)']
            ].join(' ').toLowerCase();

            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // Port filter
        if (portFilter && record.Port !== portFilter) {
            return false;
        }

        // Type filter
        if (typeFilter && record['Customs Type'] !== typeFilter) {
            return false;
        }

        // Archive filter
        if (archiveFilter && record.Archive !== archiveFilter) {
            return false;
        }

        return true;
    });

    renderTable();
    updateStats();
}

function sortTable(column) {
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));

    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.column = column;
        currentSort.ascending = true;
    }

    filteredData.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';

        // Try to parse as numbers for sorting
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return currentSort.ascending ? aNum - bNum : bNum - aNum;
        }

        // String comparison
        const comparison = aVal.toString().localeCompare(bVal.toString());
        return currentSort.ascending ? comparison : -comparison;
    });

    // Update header indicator
    const activeHeader = document.querySelector(`th[data-sort="${column}"]`);
    activeHeader.classList.add(currentSort.ascending ? 'sorted-asc' : 'sorted-desc');

    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const searchTerm = document.getElementById('search').value.toLowerCase();

    tbody.innerHTML = '';

    filteredData.forEach(record => {
        const row = document.createElement('tr');

        const cells = [
            record.Port,
            record.Officials || '',
            record['Years covered (modern)'] || '',
            record['Years covered (regnal years)'] || '',
            record['Customs Type'] || '',
            record.Reference || '',
            record.Archive || '',
            record.Edition || ''
        ];

        cells.forEach(cellValue => {
            const td = document.createElement('td');

            // Highlight search terms
            if (searchTerm && cellValue) {
                td.innerHTML = highlightText(cellValue, searchTerm);
            } else {
                td.textContent = cellValue;
            }

            row.appendChild(td);
        });

        tbody.appendChild(row);
    });
}

function highlightText(text, searchTerm) {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateStats() {
    document.getElementById('visible-count').innerHTML = '&nbsp;' + filteredData.length + '&nbsp;';
    document.getElementById('total-count').innerHTML = '&nbsp;' + allData.length + '&nbsp;';
}

