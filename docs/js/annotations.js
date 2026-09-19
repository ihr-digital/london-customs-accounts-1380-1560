// annotations.js

const NAME_ANNOTATION_TYPES = new Set([
    "forename", "surname", "master-forename", "master-surname"
]);

const NAME_TYPE_LABEL = {
    "forename":        "Forename",
    "surname":         "Surname",
    "master-forename": "Master forename",
    "master-surname":  "Master surname"
};

function getTitleForAnnotation(annotation, footnotes) {
    if (annotation.type === "footnote") {
        return `${footnotes[annotation.label] || "No label"}`;
    }
    else if (annotation.type === "pence") {
        return `${annotation.label + " pence" || "No label"}`;
    }
    else if (NAME_ANNOTATION_TYPES.has(annotation.type)) {
        const base = NAME_TYPE_LABEL[annotation.type];
        if (annotation.pid !== undefined && annotation.pid !== null) {
            return `${base} — click to find similar people`;
        }
        if (annotation.pidStatus === "unmatched") {
            return `${base} — no cluster match`;
        }
        return base;
    }
    else if (annotation.type === "merchant-place") {
        // "mercatore Colonie": where the merchant came from (not the goods, and
        // not the ship's home port, which is "place" on the lading heading)
        const g = annotation.geo;
        return g ? `Merchant's place of origin: ${g.label} (Wikidata ${g.id})`
                 : "Merchant's place of origin";
    }
    else if (annotation.type === "commodity" || annotation.type === "unit" || annotation.type === "commodity-unit") {
        // For commodity/unit annotations with matches, create HTML tooltip
        // Group by subject grouping (grouping as heading, terms as list)
        if (annotation.matches && annotation.matches.length > 0) {
            const UNIT_GROUP = 'Units, weights & measures';

            // Build map of grouping -> Set of terms
            const groupToTerms = new Map();

            annotation.matches.forEach(match => {
                const groups = (match.groups && match.groups.length) ? match.groups : ['(ungrouped)'];
                groups.forEach(g => {
                    if (!groupToTerms.has(g)) {
                        groupToTerms.set(g, new Set());
                    }
                    groupToTerms.get(g).add(match.headword);
                });
            });

            // Convert Sets to sorted arrays and create term signature
            const groupData = [];
            groupToTerms.forEach((termSet, grouping) => {
                const terms = Array.from(termSet).sort();
                const signature = terms.join('|');
                groupData.push({
                    grouping: grouping,
                    terms: terms,
                    signature: signature,
                    isUnit: grouping === UNIT_GROUP
                });
            });

            // Combine groupings with identical term lists
            const signatureToGroupings = new Map();
            groupData.forEach(data => {
                if (!signatureToGroupings.has(data.signature)) {
                    signatureToGroupings.set(data.signature, {
                        groupings: [],
                        terms: data.terms,
                        isUnit: data.isUnit
                    });
                }
                signatureToGroupings.get(data.signature).groupings.push(data.grouping);
            });

            // Separate commodity and unit groups, sort alphabetically
            const commodityGroups = [];
            const unitGroups = [];

            signatureToGroupings.forEach(group => {
                if (group.isUnit) {
                    unitGroups.push(group);
                } else {
                    commodityGroups.push(group);
                }
            });

            commodityGroups.sort((a, b) => a.groupings[0].localeCompare(b.groupings[0]));
            unitGroups.sort((a, b) => a.groupings[0].localeCompare(b.groupings[0]));

            // Build HTML: commodities first, then units
            let html = '<div class="annotation-tooltip">';
            let isFirst = true;

            [...commodityGroups, ...unitGroups].forEach(group => {
                if (!isFirst) html += '<div class="tooltip-divider"></div>';
                isFirst = false;

                const categoryClass = group.isUnit ? 'tooltip-category-unit' : 'tooltip-category';
                html += `<div class="tooltip-entry ${group.isUnit ? 'tooltip-entry-unit' : ''}">`;
                html += `<div class="${categoryClass}">${group.groupings.join(', ')}</div>`;
                html += `<div class="tooltip-terms">${group.terms.join(', ')}</div>`;
                html += `</div>`;
            });

            // Nested qualifiers (e.g. "white", "sine grano") attached to this commodity
            if (annotation.qualifiers && annotation.qualifiers.length > 0) {
                const qterms = annotation.qualifiers.map(q => q.canonical || q.text);
                if (!isFirst) html += '<div class="tooltip-divider"></div>';
                html += '<div class="tooltip-entry">';
                html += '<div class="tooltip-category">Qualifiers</div>';
                html += `<div class="tooltip-terms">${qterms.join(', ')}</div>`;
                html += '</div>';
            }

            html += '</div>';
            return html;
        }
    }
    return annotation.label || annotation.type;
}

const COMMODITY_ANNOTATION_TYPES = new Set(["commodity", "unit", "commodity-unit"]);

function _escAttr(s) {
    // Escape a string for safe inclusion in an HTML attribute value.
    return $('<div>').text(s).html().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _qualifierTitle(q) {
    const name = q.canonical || q.text || "";
    let t = `Qualifier: ${name}`;
    if (q.attested_on_concept === false) t += " (borrowed)";
    return t;
}

// Render a single commodity/unit head span (with its rich HTML tooltip).
function _renderHeadSpan(text, head, footnotes) {
    const sub = text.substring(head.start, head.end);
    const tooltip = getTitleForAnnotation(head, footnotes);
    return `<span class="anno ${head.type}" data-bs-toggle="tooltip" data-bs-html="true" `
        + `title="${tooltip.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}">`
        + `${$('<div>').text(sub).html()}</span>`;
}

function _renderQualSpan(text, q) {
    const sub = text.substring(q.start, q.end);
    const cls = q.attested_on_concept === false ? "anno qualifier qualifier-borrowed" : "anno qualifier";
    // Rich popover (canonical label + gloss + linked AAT + linked geo) once the
    // shared qualifier store is loaded; falls back to a plain title otherwise.
    if (window.MLCAQualifiers && MLCAQualifiers.isLoaded()) {
        return `<span class="${cls}" data-bs-toggle="tooltip" data-bs-html="true" `
            + `title="${_escAttr(MLCAQualifiers.popoverHTML(q))}">`
            + `${$('<div>').text(sub).html()}</span>`;
    }
    return `<span class="${cls}" data-bs-toggle="tooltip" title="${_escAttr(_qualifierTitle(q))}">`
        + `${$('<div>').text(sub).html()}</span>`;
}

// Load the canonical qualifier store early so qualifier hovers are rich.
if (typeof window !== "undefined" && window.MLCAQualifiers) {
    MLCAQualifiers.load().catch(() => {});
}

// A commodity/unit head with nested qualifiers is rendered as a bounded
// "cluster" so the concept+qualifier(s) grouping boundary is visible: the head
// keeps its strong highlight, each qualifier gets a lighter highlight, and the
// whole run is wrapped in an outlined .anno-cluster box. The parser masks
// names/qty/money, so nothing but the head and its qualifiers can fall inside
// the [cmin, cmax] extent. Returns {start, end, html} or null to fall back.
function _buildClusterOp(text, head, footnotes) {
    const quals = (head.qualifiers || []).filter(q =>
        typeof q.start === "number" && typeof q.end === "number" &&
        q.end > q.start && q.start >= 0 && q.end <= text.length);
    if (!quals.length) return null;

    const subs = [{ start: head.start, end: head.end, kind: "head" }]
        .concat(quals.map(q => ({ start: q.start, end: q.end, kind: "qual", q })))
        .sort((a, b) => a.start - b.start);
    // Reject if any spans overlap (bad offsets) — fall back to a plain head span.
    for (let i = 1; i < subs.length; i++) {
        if (subs[i].start < subs[i - 1].end) return null;
    }

    const cmin = subs[0].start;
    const cmax = subs[subs.length - 1].end;
    let inner = "";
    let cursor = cmin;
    for (const s of subs) {
        if (s.start > cursor) inner += $('<div>').text(text.substring(cursor, s.start)).html();
        inner += s.kind === "head" ? _renderHeadSpan(text, head, footnotes) : _renderQualSpan(text, s.q);
        cursor = s.end;
    }
    const html = `<span class="anno-cluster anno-cluster-${head.type}">${inner}</span>`;
    return { start: cmin, end: cmax, html };
}

function applyOffsetAnnotations(text, annotations, footnotes, mode=filterState.annotationMode) {
    const seen = new Set();
    const ops = [];
    (annotations || [])
        .filter(a => mode === "footnotes" ? a.type === "footnote" : a.type !== "footnote")
        .filter(a => a.type !== "back_reference") // Exclude back_reference annotations - they're metadata only
        .filter(a => typeof a.start === "number" && typeof a.end === "number")
        .filter(a => a.text !== "") // Filter out empty .text annotations: this is a bugfix which might later safely be removed
        .filter(a => {
            const key = `${a.type}-${a.start}-${a.end}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .forEach(a => {
            const tooltipContent = getTitleForAnnotation(a, footnotes);

            // Handle inserted annotations (zero-width, text needs to be inserted)
            if (a.inserted && a.start === a.end) {
                const escapedText = $('<div>').text(a.text).html();
                const escapedTitle = $('<div>').text(tooltipContent).html();
                ops.push({
                    start: a.start, end: a.end,
                    html: ` <span class="anno ${a.type} inserted" data-bs-toggle="tooltip" title="${escapedTitle}">${escapedText}</span>`
                });
                return;
            }

            // Commodity/unit with nested qualifiers → bounded cluster span.
            if (COMMODITY_ANNOTATION_TYPES.has(a.type) && a.qualifiers && a.qualifiers.length) {
                const cluster = _buildClusterOp(text, a, footnotes);
                if (cluster) { ops.push(cluster); return; }
            }

            const escapedText = $('<div>').text(text.substring(a.start, a.end)).html();

            // Use HTML tooltips for commodity/unit annotations, plain text for others
            if (COMMODITY_ANNOTATION_TYPES.has(a.type)) {
                const escapedTooltip = tooltipContent
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                ops.push({
                    start: a.start, end: a.end,
                    html: `<span class="anno ${a.type}" data-bs-toggle="tooltip" data-bs-html="true" title="${escapedTooltip}">${escapedText}</span>`
                });
            } else {
                const escapedTitle = $('<div>').text(tooltipContent).html();
                let extraClass = "";
                let extraAttrs = "";
                if (NAME_ANNOTATION_TYPES.has(a.type)) {
                    if (a.pid !== undefined && a.pid !== null) {
                        extraClass = " clickable-name";
                        extraAttrs = ` data-pid="${$('<div>').text(a.pid).html()}"`;
                    } else if (a.pidStatus === "unmatched") {
                        extraClass = " unmatched-name";
                    }
                }
                ops.push({
                    start: a.start, end: a.end,
                    html: `<span class="anno ${a.type}${extraClass}" data-bs-toggle="tooltip" title="${escapedTitle}"${extraAttrs}>${escapedText}</span>`
                });
            }
        });

    // Resolve overlapping ops (e.g. a qualifier cluster whose extent spans a
    // neighbouring anchor) — splicing overlapping ranges would corrupt the HTML
    // and leak tags into the page. Greedily keep the longest op on any clash
    // (clusters beat the contained standalone spans they already render).
    ops.sort((a, b) => (b.end - b.start) - (a.end - a.start));
    const placed = [];
    for (const op of ops) {
        if (placed.some(p => op.start < p.end && op.end > p.start)) continue;
        placed.push(op);
    }
    // Splice right-to-left so earlier offsets stay valid.
    placed.sort((x, y) => y.start - x.start);
    let annotatedText = text;
    placed.forEach(op => {
        annotatedText = annotatedText.slice(0, op.start) + op.html + annotatedText.slice(op.end);
    });
    return annotatedText;
}

async function handleAnnotationModeChange(mode) {
    showGenericSpinner();
    filterState.annotationMode = mode;

    try {
        const ladingTextPromises = $("#ladingTable tbody tr span.lading-text").map(async function () {
            const $lading = $(this);
            const ladingId = $lading.parents("tr").data("id");
            const lading = await db.ladings.get(ladingId);
            if (lading) {
                $lading.html(applyOffsetAnnotations(lading.text || "", lading.annotations, lading.footnotes || []));
            }
            highlightMatches($lading, filterState.searchQuery);
        }).get();

        const cargoListPromises = $("#ladingTable tbody tr button.toggleCargosBtn.btn-danger").map(async function () {
            const $button = $(this);
            const ladingId = $button.parents("tr").data("id");
            const $cargosList = $button.parents("td").find("ul.cargos-list");
            const cargos = await db.cargos.where("lading_id").equals(ladingId).toArray();
            renderCargosList($cargosList, cargos);
            $cargosList.find(".cargo-text-content").each(function () {
                highlightMatches($(this), filterState.searchQuery);
            });
        }).get();

        await Promise.all([...ladingTextPromises, ...cargoListPromises]);
    } catch (error) {
        console.error("Error during annotation mode change:", error);
    } finally {
        hideGenericSpinner();
        updateURLFromFilterState();
        localStorage.setItem("LCA_FilterState", filterState);
    }
}