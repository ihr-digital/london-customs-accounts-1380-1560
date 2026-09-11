/**
 * name-clusters.js — Candidate-match explorer for medieval name clusters.
 *
 * Two-panel layout:
 *   Left:  searchable/filterable person list
 *   Right: candidate matches panel with multi-signal scores and timeline
 *
 * Data schema (name_cluster_viz.json):
 *   persons[]: {fn, sn, st, yr[], n, fnC}
 *   surnameGraph: { surname: [{form, jw, skelJw, sdxJw}, …] }
 *   forenameGroups: { canonical: [member_forms] }
 *   blockIndex: { blockingKey: [person_indices] }
 *   meta: { totalPersons, totalSurnames, totalForenameGroups, totalBlockingKeys, yearRange }
 */

/* global d3 */

(function () {
    "use strict";

    // ---------------------------------------------------------------
    // State
    // ---------------------------------------------------------------
    let DATA = null;
    let selectedPersonIdx = null;
    let personListFiltered = [];   // indices into DATA.persons
    let personListPage = 0;
    const PAGE_SIZE = 200;

    // Pre-built indexes
    let snToPersons = {};   // surname → Set of person indices
    let fnCToPersons = {};  // canonical forename → Set of person indices

    const tooltip = d3.select("#vizTooltip");

    // ---------------------------------------------------------------
    // Load data
    // ---------------------------------------------------------------
    d3.json("data/name_cluster_viz.json").then(data => {
        DATA = data;
        buildIndexes();
        renderSummary();
        populateForenameDropdown();
        setupEventListeners();
        filterAndRenderList();
        setupOverviewTab();
    }).catch(err => {
        console.error("Failed to load viz data:", err);
        document.getElementById("summaryStats").innerHTML =
            '<div class="col"><div class="alert alert-danger">Failed to load data: ' + err.message + '</div></div>';
    });

    // ---------------------------------------------------------------
    // Build in-memory indexes
    // ---------------------------------------------------------------
    function buildIndexes() {
        snToPersons = {};
        fnCToPersons = {};
        DATA.persons.forEach((p, i) => {
            // Surname index
            if (!snToPersons[p.sn]) snToPersons[p.sn] = [];
            snToPersons[p.sn].push(i);
            // Forename canonical index
            const fnC = p.fnC || p.fn;
            if (!fnCToPersons[fnC]) fnCToPersons[fnC] = [];
            fnCToPersons[fnC].push(i);
        });
    }

    // ---------------------------------------------------------------
    // Summary
    // ---------------------------------------------------------------
    function renderSummary() {
        const m = DATA.meta;
        const html = [
            statCard(m.totalPersons.toLocaleString(), "Person records"),
            statCard(m.totalSurnames.toLocaleString(), "Unique surnames"),
            statCard(m.totalForenameGroups.toLocaleString(), "Forename groups"),
            statCard(Object.keys(DATA.surnameGraph).length.toLocaleString(), "Surname graph entries"),
            statCard(m.yearRange.join("–"), "Year range"),
        ].map(h => '<div class="col">' + h + '</div>').join("");
        document.getElementById("summaryStats").innerHTML = html;
    }

    function statCard(num, label) {
        return '<div class="stat-card card p-2"><div class="stat-num">' + num +
               '</div><div class="stat-label">' + label + '</div></div>';
    }

    // ---------------------------------------------------------------
    // Forename dropdown
    // ---------------------------------------------------------------
    function populateForenameDropdown() {
        const sel = document.getElementById("fnGroupFilter");
        // Sort alphabetically by canonical name
        const groups = Object.entries(DATA.forenameGroups)
            .map(([canon, members]) => ({
                canon,
                count: (fnCToPersons[canon] || []).length
            }))
            .filter(g => g.count > 0)
            .sort((a, b) => a.canon.localeCompare(b.canon));

        groups.forEach(g => {
            const opt = document.createElement("option");
            opt.value = g.canon;
            opt.textContent = g.canon + " (" + g.count + ")";
            sel.appendChild(opt);
        });
    }

    // ---------------------------------------------------------------
    // Event listeners
    // ---------------------------------------------------------------
    function setupEventListeners() {
        document.getElementById("searchBox").addEventListener("input", debounce(filterAndRenderList, 250));
        document.getElementById("fnGroupFilter").addEventListener("change", filterAndRenderList);
        document.getElementById("statusFilter").addEventListener("change", filterAndRenderList);
        document.getElementById("yearMin").addEventListener("input", debounce(filterAndRenderList, 400));
        document.getElementById("yearMax").addEventListener("input", debounce(filterAndRenderList, 400));

        // Clear buttons for search inputs
        document.querySelectorAll(".search-clear").forEach(btn => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            // Toggle visibility based on input content
            function updateClearBtn() {
                btn.classList.toggle("visible", input.value.length > 0);
            }
            input.addEventListener("input", updateClearBtn);
            updateClearBtn();

            btn.addEventListener("click", function () {
                input.value = "";
                updateClearBtn();
                input.dispatchEvent(new Event("input", {bubbles: true}));
                input.focus();
            });
        });
    }

    // ---------------------------------------------------------------
    // Filter + render person list
    // ---------------------------------------------------------------
    function filterAndRenderList() {
        const q = (document.getElementById("searchBox").value || "").toLowerCase().trim();
        const fnGroup = document.getElementById("fnGroupFilter").value;
        const statusFilter = document.getElementById("statusFilter").value;
        const yearMinVal = parseInt(document.getElementById("yearMin").value) || 0;
        const yearMaxVal = parseInt(document.getElementById("yearMax").value) || 9999;

        let indices;

        // Start with forename group filter if set (fast path via index)
        if (fnGroup) {
            indices = fnCToPersons[fnGroup] || [];
        } else {
            // All person indices
            indices = Array.from({length: DATA.persons.length}, (_, i) => i);
        }

        // Apply filters
        personListFiltered = indices.filter(i => {
            const p = DATA.persons[i];
            if (statusFilter && p.st !== statusFilter) return false;
            if (yearMinVal > 0 && (!p.yr.length || Math.max(...p.yr) < yearMinVal)) return false;
            if (yearMaxVal < 9999 && (!p.yr.length || Math.min(...p.yr) > yearMaxVal)) return false;
            if (q) {
                const name = (p.fn + " " + p.sn).toLowerCase();
                if (!name.includes(q)) return false;
            }
            return true;
        });

        // Sort by occurrence count descending
        personListFiltered.sort((a, b) => DATA.persons[b].n - DATA.persons[a].n);

        personListPage = 0;
        renderPersonList();
    }

    function renderPersonList() {
        const container = document.getElementById("personList");
        const start = 0;
        const end = Math.min((personListPage + 1) * PAGE_SIZE, personListFiltered.length);
        const showing = personListFiltered.slice(start, end);

        document.getElementById("listCount").textContent =
            personListFiltered.length.toLocaleString() + " persons" +
            (personListFiltered.length > end ? " (showing " + end + ")" : "");

        let html = "";
        for (const idx of showing) {
            const p = DATA.persons[idx];
            const sel = idx === selectedPersonIdx ? " selected" : "";
            const statusHtml = p.st
                ? ' <span class="status-badge status-' + p.st + '">' + p.st + '</span>'
                : "";
            const yrStr = p.yr.length ? p.yr[0] + (p.yr.length > 1 ? "–" + p.yr[p.yr.length - 1] : "") : "?";
            // Show neighbour count hint
            const nbrs = DATA.surnameGraph[p.sn];
            const nbrHint = nbrs ? ' · <span class="text-success">' + nbrs.length + ' sn-nbrs</span>' : "";

            html += '<div class="person-item' + sel + '" data-idx="' + idx + '">' +
                '<div class="person-name">' + p.fn + ' ' + p.sn + statusHtml + '</div>' +
                '<div class="person-meta">' + yrStr + ' · ' + p.n + ' occ.' + nbrHint + '</div>' +
                '</div>';
        }

        // "Load more" button
        if (end < personListFiltered.length) {
            html += '<div class="text-center py-2"><button class="btn btn-sm btn-outline-secondary" id="loadMore">' +
                'Load more (' + (personListFiltered.length - end) + ' remaining)</button></div>';
        }

        container.innerHTML = html;

        // Click handlers
        container.querySelectorAll(".person-item").forEach(el => {
            el.addEventListener("click", function () {
                const idx = parseInt(this.dataset.idx);
                selectPerson(idx);
                container.querySelectorAll(".person-item").forEach(e => e.classList.remove("selected"));
                this.classList.add("selected");
            });
        });

        const loadMoreBtn = document.getElementById("loadMore");
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener("click", () => {
                personListPage++;
                renderPersonList();
            });
        }
    }

    // ---------------------------------------------------------------
    // Select person → show detail + candidates
    // ---------------------------------------------------------------
    function selectPerson(idx) {
        selectedPersonIdx = idx;
        const p = DATA.persons[idx];

        document.getElementById("emptyState").style.display = "none";
        document.getElementById("detailContent").style.display = "block";

        // Header
        document.getElementById("detailName").textContent = p.fn + " " + p.sn;
        const statusBadge = p.st
            ? '<span class="status-badge status-' + p.st + '">' + p.st + '</span>'
            : "";
        document.getElementById("detailStatusBadge").innerHTML = statusBadge;

        const yrStr = p.yr.length
            ? "Years: " + p.yr.join(", ")
            : "No years";
        document.getElementById("detailMeta").innerHTML =
            yrStr + " · " + p.n + " occurrence(s) · Forename group: <strong>" + (p.fnC || p.fn) + "</strong>";

        // Build candidates
        const candidates = buildCandidates(idx);
        renderCandidates(candidates, idx);
        drawTimeline(idx, candidates.slice(0, 10));
    }

    // ---------------------------------------------------------------
    // Build candidate matches for a person
    // ---------------------------------------------------------------
    function buildCandidates(personIdx) {
        const p = DATA.persons[personIdx];
        const fnC = p.fnC || p.fn;
        const candidateSet = new Set();
        const candidates = [];

        // 1. Same blocking key (same forename group + same Soundex first digit of surname)
        const bk = fnC + ":" + soundexFirst(p.sn);
        const blockMembers = DATA.blockIndex[bk] || [];
        for (const ci of blockMembers) {
            if (ci === personIdx) continue;
            candidateSet.add(ci);
        }

        // 2. Surname graph neighbours (1-hop): find persons with same forename group
        const surnameNbrs = DATA.surnameGraph[p.sn] || [];
        const nbrSurnames = new Set();
        for (const nbr of surnameNbrs) {
            nbrSurnames.add(nbr.form);
            const personsWithSn = snToPersons[nbr.form] || [];
            for (const ci of personsWithSn) {
                if (ci === personIdx || candidateSet.has(ci)) continue;
                const cp = DATA.persons[ci];
                if ((cp.fnC || cp.fn) === fnC) {
                    candidateSet.add(ci);
                }
            }
        }

        // 3. Surname graph 2-hop: for each 1-hop neighbour, check ITS neighbours
        for (const nbrSn of nbrSurnames) {
            const hop2 = DATA.surnameGraph[nbrSn] || [];
            for (const nbr2 of hop2) {
                if (nbr2.form === p.sn || nbrSurnames.has(nbr2.form)) continue;
                const personsWithSn2 = snToPersons[nbr2.form] || [];
                for (const ci of personsWithSn2) {
                    if (ci === personIdx || candidateSet.has(ci)) continue;
                    const cp = DATA.persons[ci];
                    if ((cp.fnC || cp.fn) === fnC) {
                        candidateSet.add(ci);
                    }
                }
            }
        }

        // Build scored candidate list
        for (const ci of candidateSet) {
            const cp = DATA.persons[ci];
            const score = computeMatchScore(p, cp);
            candidates.push({
                idx: ci,
                person: cp,
                score: score,
            });
        }

        // Sort by composite score descending
        candidates.sort((a, b) => b.score.composite - a.score.composite);

        return candidates;
    }

    // ---------------------------------------------------------------
    // Surname trimming — strip particle prefix and patronymic suffix
    // ---------------------------------------------------------------
    const PARTICLE_RE = /^(van|de|del|den|der|le|la|atte?)\s+/i;
    const PATRON_SUFFIX_RE = /(ss?on|sson)$/i;

    function trimSurname(sn) {
        let particle = '', core = sn;
        const pm = PARTICLE_RE.exec(sn);
        if (pm) {
            particle = pm[1].toLowerCase();
            core = sn.slice(pm[0].length).trim();
        }
        let isPat = false, root = core;
        const sk = skeleton(core);
        if (sk.endsWith('sn')) {
            const sm = PATRON_SUFFIX_RE.exec(core);
            if (sm && core.slice(0, sm.index).length >= 2) {
                isPat = true;
                root = core.slice(0, sm.index);
            }
        }
        return { trimmed: root, particle, isPat };
    }

    // ---------------------------------------------------------------
    // Compute match scores between two persons (ML-based)
    // ---------------------------------------------------------------
    function computeMatchScore(p1, p2) {
        const samesSn = p1.sn === p2.sn;

        // Trim both surnames
        const t1 = trimSurname(p1.sn);
        const t2 = trimSurname(p2.sn);
        const ta = t1.trimmed.toLowerCase();
        const tb = t2.trimmed.toLowerCase();

        // Compute string metrics on trimmed forms
        let snJw, snSkelJw, snSdxJw, levNorm, lenRatio, lenDiff, sdxMatch, ngramJacc;
        if (ta === tb) {
            snJw = 1.0; snSkelJw = 1.0; snSdxJw = 1.0;
            levNorm = 0.0; lenRatio = 1.0; lenDiff = 0;
            sdxMatch = 1.0; ngramJacc = 1.0;
        } else {
            snJw = jaroWinkler(ta, tb);
            snSkelJw = jaroWinkler(skeleton(t1.trimmed), skeleton(t2.trimmed));
            const sdxA = t1.trimmed.split(/\s+/).map(soundexFull).join(" ");
            const sdxB = t2.trimmed.split(/\s+/).map(soundexFull).join(" ");
            snSdxJw = jaroWinkler(sdxA, sdxB);
            sdxMatch = (sdxA === sdxB) ? 1.0 : 0.0;

            // Levenshtein (normalised)
            const maxLen = Math.max(ta.length, tb.length);
            levNorm = maxLen > 0 ? levenshteinDist(ta, tb) / maxLen : 0.0;

            // Length metrics
            lenDiff = Math.abs(ta.length - tb.length);
            lenRatio = maxLen > 0 ? Math.min(ta.length, tb.length) / maxLen : 1.0;

            // N-gram Jaccard (trigram)
            ngramJacc = ngramJaccard(ta, tb, 3);
        }

        // Symphonym cosine — look up from surname graph if available
        let symCos = 0.0;
        const nbrs = DATA.surnameGraph[p1.sn];
        if (nbrs) {
            for (const nbr of nbrs) {
                if (nbr.form === p2.sn) {
                    // Use JW as proxy for cosine since we stripped cos from graph
                    // The graph was built with cosine ANN; the JW is the filtered score
                    symCos = Math.max(snJw, snSkelJw);  // approximate
                    break;
                }
            }
        }
        if (symCos === 0.0) {
            symCos = Math.max(snJw * 0.9, snSkelJw * 0.85);  // heuristic proxy
        }

        // Structural flags
        const bothPat = (t1.isPat && t2.isPat) ? 1.0 : 0.0;
        const bothPart = (t1.particle && t2.particle) ? 1.0 : 0.0;
        const samePart = (t1.particle && t2.particle && t1.particle === t2.particle) ? 1.0 : 0.0;

        // Year overlap
        const yrs1 = p1.yr, yrs2 = p2.yr;
        let yearOverlap = 0;
        if (yrs1.length && yrs2.length) {
            const min1 = Math.min(...yrs1), max1 = Math.max(...yrs1);
            const min2 = Math.min(...yrs2), max2 = Math.max(...yrs2);
            const overlapStart = Math.max(min1, min2);
            const overlapEnd = Math.min(max1, max2);
            if (overlapEnd >= overlapStart) {
                yearOverlap = 1.0;
            } else {
                const gap = overlapStart - overlapEnd;
                yearOverlap = Math.max(0, 1 - gap / 50);
            }
        }

        // Status match
        let statusMatch;
        if (!p1.st && !p2.st) {
            statusMatch = 0.75;
        } else if (!p1.st || !p2.st) {
            statusMatch = 0.75;
        } else if (p1.st === p2.st) {
            statusMatch = 1.0;
        } else {
            statusMatch = 0.3;
        }

        // ML-based composite score using logistic regression
        let composite;
        const sm = DATA.scorerMeta;
        if (sm && sm.coefficients && sm.scaler_mean && sm.scaler_scale) {
            const rawFeatures = {
                symphonym_cosine: symCos,
                jaro_winkler: snJw,
                skeleton_jw: snSkelJw,
                levenshtein_norm: levNorm,
                length_ratio: lenRatio,
                length_diff: lenDiff,
                soundex_match: sdxMatch,
                soundex_jw: snSdxJw,
                ngram_jaccard: ngramJacc,
                both_patronymic: bothPat,
                both_particle: bothPart,
                same_particle: samePart,
            };

            // StandardScaler transform + logistic sigmoid
            let z = sm.intercept;
            for (const fname of sm.feature_names) {
                const raw = rawFeatures[fname] || 0;
                const mean = sm.scaler_mean[fname] || 0;
                const scale = sm.scaler_scale[fname] || 1;
                const scaled = (raw - mean) / scale;
                z += scaled * (sm.coefficients[fname] || 0);
            }
            // Sigmoid
            const prob = 1 / (1 + Math.exp(-z));

            // Blend ML probability with year/status context
            composite = prob * 0.75 + yearOverlap * 0.15 + statusMatch * 0.05 +
                        (samesSn ? 0.05 : 0);
        } else {
            // Fallback: ad-hoc weighted formula
            const stringScore = snJw * 0.30 + snSkelJw * 0.25 + snSdxJw * 0.15;
            const structBonus = bothPat * 0.02 + samePart * 0.03;
            composite = stringScore + yearOverlap * 0.15 + statusMatch * 0.05 +
                        (samesSn ? 0.05 : 0) + structBonus;
        }

        return {
            snJw, snSkelJw, snSdxJw,
            yearOverlap, statusMatch, sameSurname: samesSn,
            bothPat, bothPart, samePart,
            composite: Math.round(Math.min(composite, 1.0) * 1000) / 1000,
        };
    }

    // ---------------------------------------------------------------
    // Render candidates
    // ---------------------------------------------------------------
    function renderCandidates(candidates, personIdx) {
        const container = document.getElementById("candidateList");
        document.getElementById("candidateCount").textContent =
            "(" + candidates.length + " found)";

        if (!candidates.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-users-slash"></i>No candidate matches found</div>';
            return;
        }

        const showing = candidates.slice(0, 100);
        let html = "";

        for (const c of showing) {
            const cp = c.person;
            const sc = c.score;
            const sameSn = sc.sameSurname ? " same-person" : "";
            const statusHtml = cp.st
                ? ' <span class="status-badge status-' + cp.st + '">' + cp.st + '</span>'
                : "";
            const yrStr = cp.yr.length
                ? cp.yr[0] + (cp.yr.length > 1 ? "–" + cp.yr[cp.yr.length - 1] : "")
                : "?";

            // Year overlap indicator
            const yrClass = sc.yearOverlap >= 0.8 ? "yes" : sc.yearOverlap >= 0.4 ? "partial" : "no";

            // Signal meters
            const signals =
                signalMeter(sc.snJw, "JW") + " " +
                signalMeter(sc.snSkelJw, "Skel") + " " +
                signalMeter(sc.snSdxJw, "Sdx") + " " +
                signalMeter(sc.yearOverlap, "Yr");

            // Structural badges
            let structBadges = "";
            if (sc.bothPat) structBadges += ' <span class="badge bg-info text-dark" style="font-size:.65em;">patronymic</span>';
            if (sc.samePart) structBadges += ' <span class="badge bg-warning text-dark" style="font-size:.65em;">same particle</span>';
            else if (sc.bothPart) structBadges += ' <span class="badge bg-secondary" style="font-size:.65em;">particle</span>';

            // Show trimmed forms being compared if different from originals
            const selP = DATA.persons[personIdx];
            const t1 = trimSurname(selP.sn);
            const t2 = trimSurname(cp.sn);
            let trimHint = "";
            if (t1.trimmed !== selP.sn || t2.trimmed !== cp.sn) {
                trimHint = ' <span class="text-muted" style="font-size:.7em;">(' +
                    t1.trimmed + ' ↔ ' + t2.trimmed + ')</span>';
            }

            html += '<div class="candidate-card' + sameSn + '" data-idx="' + c.idx + '">' +
                '<div class="d-flex justify-content-between align-items-center">' +
                '<div class="candidate-name">' + cp.fn + ' ' + cp.sn + statusHtml + trimHint + '</div>' +
                '<div><span class="yr-overlap ' + yrClass + '"></span>' +
                '<span class="text-muted" style="font-size:.75em;">' +
                Math.round(sc.composite * 100) + '%</span></div>' +
                '</div>' +
                '<div class="candidate-meta">' + yrStr + ' · ' + cp.n + ' occ.' + structBadges + '</div>' +
                '<div class="signals-row mt-1">' + signals + '</div>' +
                '</div>';
        }

        if (candidates.length > 100) {
            html += '<div class="text-muted text-center small py-1">… and ' +
                (candidates.length - 100) + ' more</div>';
        }

        container.innerHTML = html;
    }

    // ---------------------------------------------------------------
    // Timeline: selected person + top candidates
    // ---------------------------------------------------------------
    function drawTimeline(personIdx, topCandidates) {
        const svg = d3.select("#detailTimeline");
        svg.selectAll("*").remove();

        const p = DATA.persons[personIdx];
        const entries = [{person: p, label: p.fn + " " + p.sn + " (selected)", isSelected: true}];

        for (const c of topCandidates) {
            entries.push({
                person: c.person,
                label: c.person.fn + " " + c.person.sn,
                isSelected: false,
                score: c.score.composite
            });
        }

        const width = svg.node().getBoundingClientRect().width;
        const margin = {top: 24, right: 16, bottom: 20, left: 160};
        const rowHeight = 18;
        const barHeight = 12;
        const height = Math.max(60, margin.top + margin.bottom + entries.length * rowHeight);
        svg.attr("height", height);

        // Collect all years
        const allYears = entries.flatMap(e => e.person.yr);
        if (!allYears.length) return;
        const yearMin = Math.min(...allYears) - 3;
        const yearMax = Math.max(...allYears) + 3;

        const xScale = d3.scaleLinear().domain([yearMin, yearMax]).range([margin.left, width - margin.right]);

        svg.append("g")
            .attr("class", "axis-year")
            .attr("transform", "translate(0," + margin.top + ")")
            .call(d3.axisTop(xScale).tickFormat(d3.format("d")).ticks(Math.min(10, yearMax - yearMin)));

        const colours = d3.scaleOrdinal(d3.schemeTableau10);

        entries.forEach((e, i) => {
            const y = margin.top + i * rowHeight;
            const yrs = e.person.yr;
            if (!yrs.length) return;

            const yMin = Math.min(...yrs);
            const yMax = Math.max(...yrs);
            const x1 = xScale(yMin);
            const x2 = xScale(yMax);
            const barW = Math.max(4, x2 - x1 + 2);

            const colour = e.isSelected ? "#333" : colours(i);
            const opacity = e.isSelected ? 0.9 : 0.6;

            svg.append("rect")
                .attr("x", x1 - 1)
                .attr("y", y + (rowHeight - barHeight) / 2)
                .attr("width", barW)
                .attr("height", barHeight)
                .attr("fill", colour)
                .attr("opacity", opacity)
                .attr("rx", 2)
                .on("mouseover", (event) => {
                    showTooltip(
                        '<div style="font-weight:600;">' + e.label + '</div>' +
                        '<div style="color:#ccc;">' + e.person.n + ' occ. · ' + yMin + '–' + yMax + '</div>' +
                        (e.score !== undefined ? '<div style="color:#ccc;">Score: ' + Math.round(e.score * 100) + '%</div>' : ''),
                        event);
                })
                .on("mousemove", (event) => positionTooltip(event))
                .on("mouseout", hideTooltip);

            // Label
            svg.append("text")
                .attr("x", margin.left - 4)
                .attr("y", y + rowHeight / 2)
                .attr("dominant-baseline", "middle")
                .attr("text-anchor", "end")
                .attr("font-size", e.isSelected ? "11px" : "10px")
                .attr("font-weight", e.isSelected ? "bold" : "normal")
                .attr("fill", e.isSelected ? "#333" : "#666")
                .text(e.label.length > 22 ? e.label.slice(0, 20) + "…" : e.label);
        });
    }

    // ---------------------------------------------------------------
    // Helpers — string metrics (browser-side)
    // ---------------------------------------------------------------

    /**
     * Jaro-Winkler similarity (standard implementation).
     */
    function jaroWinkler(s1, s2) {
        if (s1 === s2) return 1.0;
        const len1 = s1.length, len2 = s2.length;
        if (!len1 || !len2) return 0.0;

        const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
        const s1Matches = new Array(len1).fill(false);
        const s2Matches = new Array(len2).fill(false);

        let matches = 0, transpositions = 0;
        for (let i = 0; i < len1; i++) {
            const start = Math.max(0, i - matchDist);
            const end = Math.min(i + matchDist + 1, len2);
            for (let j = start; j < end; j++) {
                if (s2Matches[j] || s1[i] !== s2[j]) continue;
                s1Matches[i] = true;
                s2Matches[j] = true;
                matches++;
                break;
            }
        }
        if (matches === 0) return 0.0;

        let k = 0;
        for (let i = 0; i < len1; i++) {
            if (!s1Matches[i]) continue;
            while (!s2Matches[k]) k++;
            if (s1[i] !== s2[k]) transpositions++;
            k++;
        }

        const jaro = (matches / len1 + matches / len2 +
                      (matches - transpositions / 2) / matches) / 3;

        // Winkler bonus (up to 4 chars of common prefix)
        let prefix = 0;
        for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
            if (s1[i] === s2[i]) prefix++;
            else break;
        }
        return jaro + prefix * 0.1 * (1 - jaro);
    }

    /**
     * Skeleton: lowercase, collapse adjacent duplicate consonants, strip vowels.
     */
    function skeleton(text) {
        let t = text.toLowerCase();
        t = t.replace(/([^aeiouy ])\1+/g, "$1");
        t = t.replace(/[aeiouy]/g, "");
        return t;
    }

    /**
     * Levenshtein edit distance.
     */
    function levenshteinDist(a, b) {
        const m = a.length, n = b.length;
        if (m === 0) return n;
        if (n === 0) return m;
        const d = Array.from({length: m + 1}, (_, i) => i);
        for (let j = 1; j <= n; j++) {
            let prev = d[0];
            d[0] = j;
            for (let i = 1; i <= m; i++) {
                const temp = d[i];
                d[i] = a[i - 1] === b[j - 1]
                    ? prev
                    : 1 + Math.min(prev, d[i], d[i - 1]);
                prev = temp;
            }
        }
        return d[m];
    }

    /**
     * Character n-gram Jaccard similarity.
     */
    function ngramJaccard(a, b, n) {
        if (a.length < n && b.length < n) return 1.0;
        if (a.length < n || b.length < n) return 0.0;
        const setA = new Set(), setB = new Set();
        for (let i = 0; i <= a.length - n; i++) setA.add(a.slice(i, i + n));
        for (let i = 0; i <= b.length - n; i++) setB.add(b.slice(i, i + n));
        let inter = 0;
        for (const g of setA) if (setB.has(g)) inter++;
        const union = setA.size + setB.size - inter;
        return union > 0 ? inter / union : 1.0;
    }

    /**
     * Soundex code (American Soundex).
     */
    function soundexFull(word) {
        if (!word) return "0000";
        const upper = word.toUpperCase().replace(/[^A-Z]/g, "");
        if (!upper) return "0000";
        const map = {
            B:1,F:1,P:1,V:1, C:2,G:2,J:2,K:2,Q:2,S:2,X:2,Z:2,
            D:3,T:3, L:4, M:5,N:5, R:6
        };
        let code = upper[0];
        let lastDigit = map[upper[0]] || 0;
        for (let i = 1; i < upper.length && code.length < 4; i++) {
            const d = map[upper[i]];
            if (d && d !== lastDigit) {
                code += d;
            }
            lastDigit = d || 0;
        }
        return (code + "000").slice(0, 4);
    }

    function soundexFirst(name) {
        if (!name) return "0";
        const ch = name[0].toUpperCase();
        const map = {"B":"1","F":"1","P":"1","V":"1",
                     "C":"2","G":"2","J":"2","K":"2","Q":"2","S":"2","X":"2","Z":"2",
                     "D":"3","T":"3","L":"4","M":"5","N":"5","R":"6"};
        return map[ch] || "0";
    }

    var signalExplainers = {
        "JW":   "Jaro-Winkler similarity on surname strings",
        "Skel": "Skeleton Jaro-Winkler (vowels removed, double consonants collapsed)",
        "Sdx":  "Soundex Jaro-Winkler (phonetic code similarity)",
        "Yr":   "Temporal overlap (year-range proximity, 0 = distant, 1 = overlapping)",
        "Sym":  "Symphonym embedding cosine similarity (learned phonetic model)",
        "Lev":  "Normalised Levenshtein distance (lower = more similar)"
    };

    function signalMeter(value, label) {
        const pct = Math.round(value * 100);
        const cls = pct >= 90 ? "green" : pct >= 75 ? "yellow" : "red";
        const tip = signalExplainers[label] || label;
        return '<span class="signal-group" title="' + tip + " — " + pct + '%">' +
            '<span class="signal-label">' + label + '</span>' +
            '<span class="signal-meter"><span class="signal-meter-fill ' + cls + '" style="width:' + pct + '%"></span></span>' +
            '<span class="signal-label">' + pct + '%</span>' +
            '</span>';
    }

    function showTooltip(html, event) {
        tooltip.html(html).classed("show", true);
        positionTooltip(event);
    }
    function positionTooltip(event) {
        tooltip.style("left", (event.pageX + 14) + "px").style("top", (event.pageY - 10) + "px");
    }
    function hideTooltip() {
        tooltip.classed("show", false);
    }

    function debounce(fn, ms) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    // ---------------------------------------------------------------
    // Overview tab — charts + searchable cluster lists
    // ---------------------------------------------------------------
    let overviewRendered = false;

    function setupOverviewTab() {
        // Render on first tab show
        const tabEl = document.getElementById("tab-overview");
        if (tabEl) {
            tabEl.addEventListener("shown.bs.tab", () => {
                if (!overviewRendered) {
                    renderOverviewCharts();
                    overviewRendered = true;
                }
            });
        }
    }

    function renderOverviewCharts() {
        // --- Forename group sizes ---
        const fnGroups = Object.entries(DATA.forenameGroups)
            .map(([canon, members]) => ({
                canon,
                size: members.length,
                occ: (fnCToPersons[canon] || []).length
            }))
            .sort((a, b) => b.size - a.size);

        const multiMemberFn = fnGroups.filter(g => g.size > 1);
        const singletonFn = fnGroups.filter(g => g.size === 1);

        document.getElementById("fnChartSubtitle").textContent =
            "(" + fnGroups.length + " groups, " + multiMemberFn.length + " multi-member, " + singletonFn.length + " singleton)";

        // Size distribution histogram
        drawSizeHistogram("#fnChartContainer", multiMemberFn.map(g => g.size),
            "Number of variant forms per forename group", "#4e79a7");

        // Searchable list
        renderFnClusterList(fnGroups, "");
        document.getElementById("fnClusterSearch").addEventListener("input",
            debounce(() => {
                const q = document.getElementById("fnClusterSearch").value.toLowerCase().trim();
                renderFnClusterList(fnGroups, q);
            }, 250));

        // --- Surname neighbour counts ---
        const snGraph = DATA.surnameGraph;
        const snEntries = Object.entries(snGraph)
            .map(([sn, nbrs]) => ({
                sn,
                nbrCount: nbrs.length,
                occ: (snToPersons[sn] || []).length
            }))
            .sort((a, b) => b.nbrCount - a.nbrCount);

        const withNbrs = snEntries.filter(e => e.nbrCount > 0);

        document.getElementById("snChartSubtitle").textContent =
            "(" + snEntries.length + " surnames in graph, " + withNbrs.length + " with neighbours)";

        // Neighbour-count histogram
        drawSizeHistogram("#snChartContainer", snEntries.map(e => e.nbrCount),
            "Number of surname neighbours per form", "#e15759");

        // Searchable list
        renderSnClusterList(snEntries, "");
        document.getElementById("snClusterSearch").addEventListener("input",
            debounce(() => {
                const q = document.getElementById("snClusterSearch").value.toLowerCase().trim();
                renderSnClusterList(snEntries, q);
            }, 250));
    }

    /**
     * Draw a horizontal histogram of sizes into a container.
     */
    function drawSizeHistogram(containerSel, values, title, colour) {
        const container = document.querySelector(containerSel);
        if (!container || !values.length) return;

        // Build bins
        const maxVal = Math.max(...values);
        const binEdges = [];
        if (maxVal <= 10) {
            for (let i = 1; i <= maxVal; i++) binEdges.push({label: String(i), lo: i, hi: i});
        } else {
            binEdges.push({label: "1", lo: 1, hi: 1});
            binEdges.push({label: "2", lo: 2, hi: 2});
            binEdges.push({label: "3-5", lo: 3, hi: 5});
            binEdges.push({label: "6-10", lo: 6, hi: 10});
            if (maxVal > 10) binEdges.push({label: "11-20", lo: 11, hi: 20});
            if (maxVal > 20) binEdges.push({label: "21-50", lo: 21, hi: 50});
            if (maxVal > 50) binEdges.push({label: "51+", lo: 51, hi: Infinity});
        }

        const bins = binEdges.map(b => ({
            label: b.label,
            count: values.filter(v => v >= b.lo && v <= b.hi).length
        })).filter(b => b.count > 0);

        const width = container.clientWidth || 500;
        const barHeight = 28;
        const margin = {top: 28, right: 50, bottom: 10, left: 60};
        const height = margin.top + margin.bottom + bins.length * barHeight;

        const svg = d3.select(containerSel).html("").append("svg")
            .attr("width", width)
            .attr("height", height);

        svg.append("text")
            .attr("x", width / 2).attr("y", 16)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px").attr("fill", "#666")
            .text(title);

        const maxCount = Math.max(...bins.map(b => b.count));
        const xScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, width - margin.left - margin.right]);

        const g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        bins.forEach((bin, i) => {
            const y = i * barHeight;
            g.append("rect")
                .attr("x", 0).attr("y", y + 2)
                .attr("width", Math.max(2, xScale(bin.count)))
                .attr("height", barHeight - 4)
                .attr("fill", colour)
                .attr("opacity", 0.8)
                .attr("rx", 2);

            g.append("text")
                .attr("x", -6).attr("y", y + barHeight / 2)
                .attr("dominant-baseline", "middle")
                .attr("text-anchor", "end")
                .attr("font-size", "11px").attr("fill", "#555")
                .text(bin.label);

            g.append("text")
                .attr("x", Math.max(2, xScale(bin.count)) + 4)
                .attr("y", y + barHeight / 2)
                .attr("dominant-baseline", "middle")
                .attr("font-size", "11px").attr("fill", "#333")
                .text(bin.count.toLocaleString());
        });
    }

    function renderFnClusterList(allGroups, query) {
        const container = document.getElementById("fnClusterList");
        let groups = allGroups;
        if (query) {
            groups = groups.filter(g => {
                if (g.canon.toLowerCase().includes(query)) return true;
                // Also search within members
                const members = DATA.forenameGroups[g.canon] || [];
                return members.some(m => m.toLowerCase().includes(query));
            });
        }

        // Show top 100
        const showing = groups.slice(0, 100);
        let html = "";
        for (const g of showing) {
            const members = DATA.forenameGroups[g.canon] || [];
            const memberStr = members.join(", ");
            html += '<div class="cluster-list-item">' +
                '<span class="canon">' + g.canon + '</span> ' +
                '<span class="count">(' + g.size + ' forms, ' + g.occ + ' persons)</span>' +
                '<div class="text-muted" style="font-size:.78em;">' + memberStr + '</div>' +
                '</div>';
        }
        if (groups.length > 100) {
            html += '<div class="text-muted text-center small py-1">… ' + (groups.length - 100) + ' more</div>';
        }
        if (!groups.length) {
            html = '<div class="text-muted text-center small py-2">No matching groups</div>';
        }
        container.innerHTML = html;
    }

    function renderSnClusterList(allEntries, query) {
        const container = document.getElementById("snClusterList");
        let entries = allEntries;
        if (query) {
            entries = entries.filter(e => {
                if (e.sn.toLowerCase().includes(query)) return true;
                // Also search neighbours
                const nbrs = DATA.surnameGraph[e.sn] || [];
                return nbrs.some(n => n.form.toLowerCase().includes(query));
            });
        }

        const showing = entries.slice(0, 100);
        let html = "";
        for (const e of showing) {
            const nbrs = DATA.surnameGraph[e.sn] || [];
            const nbrStr = nbrs.map(n => n.form).join(", ");
            html += '<div class="cluster-list-item">' +
                '<span class="canon">' + e.sn + '</span> ' +
                '<span class="count">(' + e.nbrCount + ' nbrs, ' + e.occ + ' persons)</span>' +
                '<div class="text-muted" style="font-size:.78em;">' + (nbrStr || '(no neighbours)') + '</div>' +
                '</div>';
        }
        if (entries.length > 100) {
            html += '<div class="text-muted text-center small py-1">… ' + (entries.length - 100) + ' more</div>';
        }
        if (!entries.length) {
            html = '<div class="text-muted text-center small py-2">No matching surnames</div>';
        }
        container.innerHTML = html;
    }

})();

