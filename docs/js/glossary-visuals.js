/**
 * Glossary Data Visualisations
 * Interactive charts showing category evolution, term relationships, and temporal patterns
 *
 * This module provides:
 * - Data aggregation from glossary JSON (terms, categories, sources, years)
 * - Multiple chart types (pie, bar, line, area, network)
 * - Interactive filtering by year range
 * - Lazy initialisation (only loads when Visualisations tab is opened)
 *
 * Dependencies:
 * - Chart.js 4.4.0+ (for standard charts)
 * - Cytoscape.js 3.26.0+ (for network visualisation)
 *
 * Usage:
 * Call window.initGlossaryVisualisations(glossaryData) after data is loaded
 * Call window.refreshGlossaryVisualisations() to update after filter changes
 */

(function() {
    'use strict';

    let state = {
        glossary: null,
        sourceRegistry: null,
        aggregatedData: null,
        commodityData: null,
        charts: {},
        cy: null,
        filters: {
            yearStart: null,
            yearEnd: null,
            selectedCategories: new Set(),
            minTermCount: 1,
            smoothData: false
        }
    };

    /**
     * Get headword from entry
     */
    function getHeadword(entry, fallbackKey) {
        if (!entry) return fallbackKey || '';
        if (Array.isArray(entry.f) && entry.f.length) {
            const head = entry.f.find(x => x && (x.w === 1 || x.w === '1' || x.w === true));
            if (head) return String(head.t || head);
            return String(entry.f[0].t || entry.f[0]);
        }
        return fallbackKey || '';
    }

    /**
     * Extract year from source date string
     */
    function extractYear(dateStr) {
        if (!dateStr) return null;
        const match = String(dateStr).match(/^(\d{4})/);
        return match ? parseInt(match[1]) : null;
    }

    /**
     * Get year range for a source
     */
    function getSourceYearRange(sourceIdx) {
        const src = state.sourceRegistry[sourceIdx];
        if (!src) return null;

        const fromYear = extractYear(src.date_from);
        const toYear = extractYear(src.date_to);

        if (!fromYear && !toYear) return null;
        return {
            from: fromYear || toYear,
            to: toYear || fromYear,
            mid: Math.floor(((fromYear || toYear) + (toYear || fromYear)) / 2)
        };
    }

    /**
     * Apply moving average smoothing to data array
     */
    function smoothData(dataArray, windowSize = 3) {
        if (!state.filters.smoothData || dataArray.length < windowSize) {
            return dataArray;
        }

        const smoothed = [];
        const halfWindow = Math.floor(windowSize / 2);

        for (let i = 0; i < dataArray.length; i++) {
            let sum = 0;
            let count = 0;

            for (let j = Math.max(0, i - halfWindow); j <= Math.min(dataArray.length - 1, i + halfWindow); j++) {
                sum += dataArray[j];
                count++;
            }

            smoothed.push(sum / count);
        }

        return smoothed;
    }

    /**
     * Aggregate glossary data for visualisation
     */
    function aggregateData() {
        const data = {
            categories: new Map(),
            categoryPairs: new Map(),
            termsByYear: new Map(),
            categoryByYear: new Map(),
            yearRange: { min: Infinity, max: -Infinity }
        };

        Object.entries(state.glossary.entries).forEach(([key, entry]) => {
            const categories = entry.groups || []; // AAT-derived groupings (was entry.c)
            const forms = entry.f || [];

            // Get all years this term appears in
            const years = new Set();
            forms.forEach(form => {
                if (form.s) {
                    form.s.forEach(srcIdx => {
                        const range = getSourceYearRange(srcIdx);
                        if (range) {
                            // Use midpoint year for aggregation
                            years.add(range.mid);
                            data.yearRange.min = Math.min(data.yearRange.min, range.from);
                            data.yearRange.max = Math.max(data.yearRange.max, range.to);
                        }
                    });
                }
            });

            // Track category co-occurrences
            for (let i = 0; i < categories.length; i++) {
                const cat1 = categories[i];

                // Initialize category data
                if (!data.categories.has(cat1)) {
                    data.categories.set(cat1, {
                        name: cat1,
                        count: 0,
                        termsByYear: new Map(),
                        terms: new Set()
                    });
                }

                const catData = data.categories.get(cat1);
                catData.count++;
                catData.terms.add(key);

                // Track by year
                years.forEach(year => {
                    if (!catData.termsByYear.has(year)) {
                        catData.termsByYear.set(year, new Set());
                    }
                    catData.termsByYear.get(year).add(key);

                    // Global year tracking
                    if (!data.categoryByYear.has(year)) {
                        data.categoryByYear.set(year, new Map());
                    }
                    if (!data.categoryByYear.get(year).has(cat1)) {
                        data.categoryByYear.get(year).set(cat1, new Set());
                    }
                    data.categoryByYear.get(year).get(cat1).add(key);
                });

                // Track category pairs
                for (let j = i + 1; j < categories.length; j++) {
                    const cat2 = categories[j];
                    const pairKey = [cat1, cat2].sort().join('|||');

                    if (!data.categoryPairs.has(pairKey)) {
                        data.categoryPairs.set(pairKey, {
                            categories: [cat1, cat2],
                            count: 0,
                            terms: new Set()
                        });
                    }

                    const pairData = data.categoryPairs.get(pairKey);
                    pairData.count++;
                    pairData.terms.add(key);
                }
            }
        });

        state.aggregatedData = data;

        // Set default filter range
        if (data.yearRange.min !== Infinity) {
            state.filters.yearStart = data.yearRange.min;
            state.filters.yearEnd = data.yearRange.max;
        }

        return data;
    }

    /**
     * Create category distribution pie chart
     */
    function createCategoryDistribution(containerId) {
        const canvas = document.getElementById(containerId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Filter categories based on selected categories
        let categories = Array.from(state.aggregatedData.categories.values());

        // Apply category filter if any categories are selected
        if (state.filters.selectedCategories.size > 0) {
            categories = categories.filter(c => state.filters.selectedCategories.has(c.name));
        }

        // Get top 12 categories by count
        categories = categories
            .sort((a, b) => b.count - a.count)
            .slice(0, 12);

        if (state.charts.categoryDist) {
            state.charts.categoryDist.destroy();
        }

        try {
            state.charts.categoryDist = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(c => c.name),
                datasets: [{
                    data: categories.map(c => c.count),
                    backgroundColor: categories.map((_, i) =>
                        `hsl(${(i * 360 / 12)}, 70%, 60%)`
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { size: 11 },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label} (${data.datasets[0].data[i]})`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: false,
                                    index: i
                                }));
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Grouping Distribution (Top 12)',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        });
        } catch (error) {
            // Silent fail - chart creation failed
        }
    }

    /**
     * Create timeline chart showing category evolution
     */
    function createTimelineChart(containerId) {
        const canvas = document.getElementById(containerId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Get filtered year range
        const yearStart = state.filters.yearStart;
        const yearEnd = state.filters.yearEnd;

        // Filter categories based on selected categories
        let categories = Array.from(state.aggregatedData.categories.values());

        // Apply category filter if any categories are selected
        if (state.filters.selectedCategories.size > 0) {
            categories = categories.filter(c => state.filters.selectedCategories.has(c.name));
        }

        // Get top categories
        const topCategories = categories
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        // Build year labels
        const years = [];
        for (let y = yearStart; y <= yearEnd; y += Math.ceil((yearEnd - yearStart) / 50)) {
            years.push(y);
        }

        // Build datasets
        const datasets = topCategories.map((cat, idx) => {
            const rawData = years.map(year => {
                const yearData = cat.termsByYear.get(year);
                return yearData ? yearData.size : 0;
            });

            // Apply smoothing if enabled
            const data = smoothData(rawData, 5);

            return {
                label: cat.name,
                data: data,
                borderColor: `hsl(${(idx * 360 / 8)}, 70%, 50%)`,
                backgroundColor: `hsla(${(idx * 360 / 8)}, 70%, 50%, 0.1)`,
                fill: true,
                tension: 0.4
            };
        });

        if (state.charts.timeline) {
            state.charts.timeline.destroy();
        }

        state.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 } }
                    },
                    title: {
                        display: true,
                        text: 'Grouping Evolution Over Time',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} terms`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Terms'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Create stacked area chart
     */
    function createStackedAreaChart(containerId) {
        const canvas = document.getElementById(containerId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const yearStart = state.filters.yearStart;
        const yearEnd = state.filters.yearEnd;

        // Build comprehensive year range
        const years = [];
        const step = Math.max(1, Math.ceil((yearEnd - yearStart) / 40));
        for (let y = yearStart; y <= yearEnd; y += step) {
            years.push(y);
        }

        // Filter categories based on selected categories
        let categories = Array.from(state.aggregatedData.categories.values());

        // Apply category filter if any categories are selected
        if (state.filters.selectedCategories.size > 0) {
            categories = categories.filter(c => state.filters.selectedCategories.has(c.name));
        }

        // Get top categories
        const topCategories = categories
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const datasets = topCategories.map((cat, idx) => {
            const rawData = years.map(year => {
                // Sum counts in a window around each year
                let count = 0;
                for (let y = year - step; y <= year + step; y++) {
                    const yearData = cat.termsByYear.get(y);
                    if (yearData) count += yearData.size;
                }
                return count;
            });

            // Apply smoothing if enabled
            const data = smoothData(rawData, 5);

            return {
                label: cat.name,
                data: data,
                borderColor: `hsl(${(idx * 360 / 10)}, 70%, 50%)`,
                backgroundColor: `hsla(${(idx * 360 / 10)}, 70%, 60%, 0.7)`,
                fill: true
            };
        });

        if (state.charts.stacked) {
            state.charts.stacked.destroy();
        }

        state.charts.stacked = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 10 } }
                    },
                    title: {
                        display: true,
                        text: 'Stacked Grouping Attestations',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Year' }
                    },
                    y: {
                        stacked: true,
                        title: { display: true, text: 'Attestations' }
                    }
                }
            }
        });
    }

    /**
     * Create category relationship network
     */
    function createCategoryNetwork(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        // Build nodes and edges
        const nodes = [];
        const edges = [];

        // Filter categories based on selected categories
        let categories = Array.from(state.aggregatedData.categories.values());

        // Apply category filter if any categories are selected
        if (state.filters.selectedCategories.size > 0) {
            categories = categories.filter(c => state.filters.selectedCategories.has(c.name));
        }

        // Add category nodes
        const topCategories = categories
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);

        topCategories.forEach((cat, idx) => {
            nodes.push({
                data: {
                    id: cat.name,
                    label: cat.name,
                    type: 'category',
                    size: Math.min(100, 30 + cat.count * 0.5),
                    count: cat.count
                }
            });
        });

        // Add edges for category co-occurrence
        const categorySet = new Set(topCategories.map(c => c.name));
        state.aggregatedData.categoryPairs.forEach((pair, key) => {
            const [cat1, cat2] = pair.categories;
            if (categorySet.has(cat1) && categorySet.has(cat2) && pair.count > 5) {
                edges.push({
                    data: {
                        id: key,
                        source: cat1,
                        target: cat2,
                        weight: pair.count,
                        sharedTerms: pair.terms.size
                    }
                });
            }
        });

        if (state.cy) {
            state.cy.destroy();
        }

        state.cy = cytoscape({
            container: container,
            elements: nodes.concat(edges),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#4299e1',
                        'label': 'data(label)',
                        'width': 'data(size)',
                        'height': 'data(size)',
                        'color': '#2d3748',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '10px',
                        'font-weight': 'bold',
                        'text-outline-width': 2,
                        'text-outline-color': '#fff',
                        'overlay-padding': 4
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 'mapData(weight, 1, 50, 1, 10)',
                        'line-color': '#cbd5e0',
                        'curve-style': 'bezier',
                        'opacity': 0.6
                    }
                },
                {
                    selector: 'node:selected',
                    style: {
                        'background-color': '#f6ad55',
                        'border-width': 3,
                        'border-color': '#dd6b20'
                    }
                }
            ],
            layout: {
                name: 'cose',
                animate: true,
                animationDuration: 1000,
                idealEdgeLength: 100,
                nodeOverlap: 20,
                refresh: 20,
                fit: true,
                padding: 30,
                randomize: false,
                componentSpacing: 100,
                nodeRepulsion: 400000,
                edgeElasticity: 100,
                nestingFactor: 5,
                gravity: 80,
                numIter: 1000,
                initialTemp: 200,
                coolingFactor: 0.95,
                minTemp: 1.0
            }
        });

        // Add tooltips
        state.cy.nodes().forEach(node => {
            node.on('tap', function() {
                const cat = node.data('label');
                const count = node.data('count');
                alert(`${cat}\n${count} terms in this category`);
            });
        });
    }

    /**
     * Create horizontal bar chart of category counts
     */
    function createCategoryBarChart(containerId) {
        const canvas = document.getElementById(containerId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Filter categories based on selected categories
        let categories = Array.from(state.aggregatedData.categories.values());

        // Apply category filter if any categories are selected
        if (state.filters.selectedCategories.size > 0) {
            categories = categories.filter(c => state.filters.selectedCategories.has(c.name));
        }

        categories = categories
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        if (state.charts.categoryBar) {
            state.charts.categoryBar.destroy();
        }

        state.charts.categoryBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories.map(c => c.name),
                datasets: [{
                    label: 'Number of Terms',
                    data: categories.map(c => c.count),
                    backgroundColor: 'rgba(66, 153, 225, 0.6)',
                    borderColor: 'rgba(66, 153, 225, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Top 20 Groupings by Term Count',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Terms'
                        }
                    }
                }
            }
        });
    }

    /**
     * Update all visualisations
     */
    function updateVisualisations() {
        createCategoryDistribution('vis-category-dist');
        createTimelineChart('vis-timeline');
        createStackedAreaChart('vis-stacked');
        createCategoryNetwork('vis-network');
        createCategoryBarChart('vis-bar-chart');
    }

    /**
     * Initialise filters
     */
    function initialiseFilters() {
        const yearStart = document.getElementById('vis-year-start');
        const yearEnd = document.getElementById('vis-year-end');
        const categoryFilter = document.getElementById('vis-category-filter');
        const updateBtn = document.getElementById('vis-update');

        if (!yearStart || !yearEnd) return;

        // Populate category filter
        if (categoryFilter) {
            categoryFilter.innerHTML = '';
            const categories = Array.from(state.aggregatedData.categories.keys()).sort();
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                categoryFilter.appendChild(opt);
            });
        }

        // Populate year dropdowns
        const data = state.aggregatedData;
        yearStart.innerHTML = '';
        yearEnd.innerHTML = '';

        for (let y = data.yearRange.min; y <= data.yearRange.max; y += 10) {
            const opt1 = document.createElement('option');
            opt1.value = y;
            opt1.textContent = y;
            yearStart.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = y;
            opt2.textContent = y;
            yearEnd.appendChild(opt2);
        }

        // Set default values to min and max
        if (yearStart.options.length > 0) {
            yearStart.value = yearStart.options[0].value;
            state.filters.yearStart = parseInt(yearStart.options[0].value);
        }
        if (yearEnd.options.length > 0) {
            yearEnd.value = yearEnd.options[yearEnd.options.length - 1].value;
            state.filters.yearEnd = parseInt(yearEnd.options[yearEnd.options.length - 1].value);
        }

        // Update button handler
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                state.filters.yearStart = parseInt(yearStart.value);
                state.filters.yearEnd = parseInt(yearEnd.value);
                const smoothCheckbox = document.getElementById('vis-smooth-data');
                if (smoothCheckbox) {
                    state.filters.smoothData = smoothCheckbox.checked;
                }
                // Get selected categories
                if (categoryFilter) {
                    state.filters.selectedCategories = new Set(
                        Array.from(categoryFilter.selectedOptions).map(opt => opt.value)
                    );
                }
                updateVisualisations();
            });
        }
    }

    /**
     * Initialise visualisations
     */
    window.initGlossaryVisualisations = function(glossary) {
        state.glossary = glossary;
        state.sourceRegistry = glossary.metadata?.source_registry?.sources || [];

        // Aggregate data
        aggregateData();

        // Initialise filters
        initialiseFilters();

        // Create all visualisations
        updateVisualisations();
    };

    /**
     * Refresh visualisations (e.g., after filter change)
     */
    window.refreshGlossaryVisualisations = function() {
        if (state.aggregatedData) {
            // Update smoothing state from checkbox
            const smoothCheckbox = document.getElementById('vis-smooth-data');
            if (smoothCheckbox) {
                state.filters.smoothData = smoothCheckbox.checked;
            }

            // Update selected categories from filter
            const categoryFilter = document.getElementById('vis-category-filter');
            if (categoryFilter) {
                state.filters.selectedCategories = new Set(
                    Array.from(categoryFilter.selectedOptions).map(opt => opt.value)
                );
            }

            updateVisualisations();
        }
    };

    // ========================================================================
    // COMMODITY ANALYSIS
    // ========================================================================

    /**
     * Aggregate commodity-level data
     */
    function aggregateCommodityData() {
        const data = {
            terms: [],
            termsByYear: new Map(),
            yearRange: { min: Infinity, max: -Infinity },
            headwordsByCategory: new Map()
        };

        Object.entries(state.glossary.entries).forEach(([key, entry]) => {
            const headword = getHeadword(entry, key);
            const forms = entry.f || [];
            const categories = entry.groups || []; // AAT-derived groupings (was entry.c)

            // Get years for this term
            const years = new Set();
            let sourceCount = 0;
            forms.forEach(form => {
                if (form.s) {
                    sourceCount += form.s.length;
                    form.s.forEach(srcIdx => {
                        const range = getSourceYearRange(srcIdx);
                        if (range) {
                            years.add(range.mid);
                            data.yearRange.min = Math.min(data.yearRange.min, range.from);
                            data.yearRange.max = Math.max(data.yearRange.max, range.to);
                        }
                    });
                }
            });

            const yearsList = Array.from(years).sort((a, b) => a - b);
            const firstYear = yearsList.length > 0 ? yearsList[0] : null;
            const lastYear = yearsList.length > 0 ? yearsList[yearsList.length - 1] : null;
            const yearSpan = firstYear && lastYear ? lastYear - firstYear : 0;

            data.terms.push({
                key: key,
                headword: headword,
                formCount: forms.length,
                categories: categories,
                years: yearsList,
                sourceCount: sourceCount,
                yearSpan: yearSpan,
                firstYear: firstYear,
                lastYear: lastYear
            });

            // Track headwords by category
            categories.forEach(cat => {
                if (!data.headwordsByCategory.has(cat)) {
                    data.headwordsByCategory.set(cat, []);
                }
                data.headwordsByCategory.get(cat).push(headword);
            });

            // Track terms by year
            years.forEach(year => {
                if (!data.termsByYear.has(year)) {
                    data.termsByYear.set(year, new Set());
                }
                data.termsByYear.get(year).add(headword);
            });
        });

        state.commodityData = data;
        return data;
    }

    /**
     * Create most attested commodities chart (by source count)
     */
    function createMostAttestedChart(containerId) {
        const canvas = document.getElementById(containerId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Get top 30 terms by source attestations
        const topTerms = state.commodityData.terms
            .filter(t => t.sourceCount > 0)
            .sort((a, b) => b.sourceCount - a.sourceCount)
            .slice(0, 30);

        if (state.charts.mostAttested) {
            state.charts.mostAttested.destroy();
        }

        state.charts.mostAttested = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topTerms.map(t => t.headword),
                datasets: [{
                    label: 'Number of Source Attestations',
                    data: topTerms.map(t => t.sourceCount),
                    backgroundColor: 'rgba(66, 153, 225, 0.6)',
                    borderColor: 'rgba(66, 153, 225, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Top 30 Most Attested Commodities',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Source Attestations' }
                    }
                }
            }
        });
    }

    /**
     * Create temporal span distribution chart
     */
    function createTemporalSpanChart(containerId) {
        const canvas = document.getElementById(containerId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Group terms by temporal span (0, 1-10, 11-25, 26-50, 51-100, 100+)
        const bins = {
            '0 years': 0,
            '1-10 years': 0,
            '11-25 years': 0,
            '26-50 years': 0,
            '51-100 years': 0,
            '100+ years': 0
        };

        state.commodityData.terms.forEach(term => {
            const span = term.yearSpan;
            if (span === 0) bins['0 years']++;
            else if (span <= 10) bins['1-10 years']++;
            else if (span <= 25) bins['11-25 years']++;
            else if (span <= 50) bins['26-50 years']++;
            else if (span <= 100) bins['51-100 years']++;
            else bins['100+ years']++;
        });

        if (state.charts.temporalSpan) {
            state.charts.temporalSpan.destroy();
        }

        state.charts.temporalSpan = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(bins),
                datasets: [{
                    label: 'Number of Terms',
                    data: Object.values(bins),
                    backgroundColor: 'rgba(72, 187, 120, 0.6)',
                    borderColor: 'rgba(72, 187, 120, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Temporal Span Distribution',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y} terms attested over ${context.label}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Attestation Span' } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Terms' }
                    }
                }
            }
        });
    }

    /**
     * Create commodities per year distribution
     */
    function createCommoditiesPerYearChart(containerId) {
        const canvas = document.getElementById(containerId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Count unique headwords per year
        const yearStart = parseInt(document.getElementById('commodity-year-start')?.value || state.filters.yearStart);
        const yearEnd = parseInt(document.getElementById('commodity-year-end')?.value || state.filters.yearEnd);

        const years = [];
        const counts = [];
        const step = Math.max(5, Math.ceil((yearEnd - yearStart) / 40));

        for (let y = yearStart; y <= yearEnd; y += step) {
            years.push(y);
            // Aggregate terms from nearby years (within step range)
            const termsInPeriod = new Set();
            for (let checkYear = y - step; checkYear <= y + step; checkYear++) {
                const termsAtYear = state.commodityData.termsByYear.get(checkYear);
                if (termsAtYear) {
                    termsAtYear.forEach(term => termsInPeriod.add(term));
                }
            }
            counts.push(termsInPeriod.size);
        }


        if (state.charts.commoditiesPerYear) {
            state.charts.commoditiesPerYear.destroy();
        }

        state.charts.commoditiesPerYear = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Unique Commodities',
                    data: counts,
                    borderColor: 'rgba(159, 122, 234, 1)',
                    backgroundColor: 'rgba(159, 122, 234, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Unique Commodities Attested Per Year',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Year' } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Unique Commodities' }
                    }
                }
            }
        });
    }

    /**
     * Create commodity timeline (top terms over time)
     */
    function createCommodityTimelineChart(containerId) {
        const canvas = document.getElementById(containerId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const yearStart = parseInt(document.getElementById('commodity-year-start')?.value || state.filters.yearStart);
        const yearEnd = parseInt(document.getElementById('commodity-year-end')?.value || state.filters.yearEnd);

        // Get top 10 terms with longest temporal span
        const topTerms = state.commodityData.terms
            .filter(t => t.years.length > 0 && t.yearSpan > 0)
            .sort((a, b) => b.yearSpan - a.yearSpan)
            .slice(0, 10);

        if (topTerms.length === 0) {
            return;
        }

        // Build year range
        const years = [];
        const step = Math.max(5, Math.ceil((yearEnd - yearStart) / 40));
        for (let y = yearStart; y <= yearEnd; y += step) {
            years.push(y);
        }

        const datasets = topTerms.map((term, idx) => {
            // Count how many of this term's attestation years fall within each step
            const rawData = years.map(year => {
                const matchingYears = term.years.filter(ty =>
                    Math.abs(ty - year) <= step
                );
                return matchingYears.length;
            });


            // Don't smooth if the data is already sparse
            const data = state.filters.smoothData ? smoothData(rawData, 3) : rawData;

            return {
                label: term.headword,
                data: data,
                borderColor: `hsl(${(idx * 360 / 10)}, 70%, 50%)`,
                backgroundColor: `hsla(${(idx * 360 / 10)}, 70%, 50%, 0.1)`,
                fill: false,
                tension: 0.4,
                pointRadius: 2,
                borderWidth: 2
            };
        });

        if (state.charts.commodityTimeline) {
            state.charts.commodityTimeline.destroy();
        }

        state.charts.commodityTimeline = new Chart(ctx, {
            type: 'line',
            data: { labels: years, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 10 } }
                    },
                    title: {
                        display: true,
                        text: 'Top 10 Commodities with Longest Attestation Spans',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = Math.round(context.parsed.y * 10) / 10;
                                return `${context.dataset.label}: ${value} attestation(s) in period`;
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Year' } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Attestations in Period' }
                    }
                }
            }
        });
    }

    /**
     * Update all commodity visualisations
     */
    function updateCommodityVisualisations() {
        createMostAttestedChart('commodity-freq-chart');
        createTemporalSpanChart('commodity-forms-dist');
        createCommoditiesPerYearChart('commodity-category-dist');
        createCommodityTimelineChart('commodity-timeline');
    }

    /**
     * Initialise commodity filters
     */
    function initialiseCommodityFilters() {
        const yearStart = document.getElementById('commodity-year-start');
        const yearEnd = document.getElementById('commodity-year-end');
        const updateBtn = document.getElementById('commodity-update');

        if (!yearStart || !yearEnd) return;

        // Populate year dropdowns using commodity data year range
        yearStart.innerHTML = '';
        yearEnd.innerHTML = '';

        const minYear = state.commodityData.yearRange.min !== Infinity ? state.commodityData.yearRange.min : state.filters.yearStart;
        const maxYear = state.commodityData.yearRange.max !== -Infinity ? state.commodityData.yearRange.max : state.filters.yearEnd;


        for (let y = minYear; y <= maxYear; y += 10) {
            const opt1 = document.createElement('option');
            opt1.value = y;
            opt1.textContent = y;
            yearStart.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = y;
            opt2.textContent = y;
            yearEnd.appendChild(opt2);
        }

        // Set initial values to the full range
        if (yearStart.options.length > 0) {
            yearStart.value = yearStart.options[0].value;
        }
        if (yearEnd.options.length > 0) {
            yearEnd.value = yearEnd.options[yearEnd.options.length - 1].value;
        }

        // Update button handler
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                updateCommodityVisualisations();
            });
        }
    }

    /**
     * Initialise commodity visualisations
     */
    window.initCommodityVisualisations = function(glossary) {
        state.glossary = glossary;
        state.sourceRegistry = glossary.metadata?.source_registry?.sources || [];

        // Aggregate commodity data
        aggregateCommodityData();

        // Initialise filters
        initialiseCommodityFilters();

        // Create visualisations
        updateCommodityVisualisations();
    };

})();

