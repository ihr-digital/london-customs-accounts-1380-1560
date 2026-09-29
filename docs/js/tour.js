// tour.js
//
// A guided tour: run once, automatically, on a reader's first visit, and at any time from the
// "Tour" button. Step 6 of documentation/search_plan.md (team meeting, 29 Sep 2026).
//
// A first visit spends minutes downloading the corpus, and the table with every control in it
// is hidden until then. So the tour starts DURING the load: a step whose control is not on
// screen yet is shown beside the view tabs and says the control appears when loading is done;
// a step whose control is visible points at it. On the IHR site it waits for the preview
// notice (preview-gate.js) to be acknowledged.
//
// Built on Bootstrap's popovers, which the page already loads. Steps are data: adding one is
// one entry in STEPS. "Seen" is remembered in localStorage; a browser that blocks storage
// simply sees the tour again next time.
//
// Harness runs (window.__mlcaDebug) never auto-start it, because its popovers would sit over
// the controls other checks click; shot.py `tour` sets window.__mlcaTourTest to test it.

const Tour = (() => {
    const SEEN_KEY = "mlca_tour_seen_v1";
    const DOCS = "documentation/content/getting-started.html";
    const STEPS = [
        {el: "h1", title: "Welcome",
         body: "The London customs accounts, 1380&ndash;1560: every lading and cargo, searchable. "
             + "This short tour shows where things are. <strong>Next</strong> to continue, "
             + "<strong>Esc</strong> to leave; the <strong>Tour</strong> button brings it back."},
        {el: "#progressBarContainer, #loadingSpinner", onlyWhileLoading: true, title: "The first visit takes a few minutes",
         body: "Your browser is downloading the whole corpus, about 33,500 ladings, so that everything after this "
             + "is instant and works offline. It happens once; later visits start straight away. "
             + "The tour carries on meanwhile."},
        {el: "#termSearchWrap", title: "One box for everything",
         body: "Goods by any spelling, Latin, English or French (<code>vinum</code>, <code>wyne</code>, "
             + "<code>wine</code>), and misspellings too (&asymp;); kinds of goods (<code>spices</code>); places "
             + "(goods from, a ship's port, a merchant from); ships; and people by forename or surname. "
             + "Each suggestion says what it is and how many ladings it would show. "
             + "The tabs at the top of the list narrow it."},
        {el: "#termSearchWrap", title: "Choices become filters",
         body: "Each choice becomes a chip in a <strong>Filters</strong> row above the table. Different kinds "
             + "combine (wine <em>and</em> from Spain); several of one kind mean <em>any</em>. "
             + "For people, <strong>Ctrl/Cmd-click</strong> adds several at once, and the ear "
             + "(<i class=\"fas fa-ear-listen\"></i>) adds names that <em>sound</em> alike."},
        {el: "#dateSelectors", title: "Years",
         body: "Narrow to a span of customs years; the arrow between them reverses the order."},
        {el: "#customsTypes", title: "Which accounts",
         body: "Wool, tunnage, petty and miscellaneous accounts, and imports or exports."},
        {el: "#advancedToggle", title: "Advanced",
         body: "<strong>Filter text</strong> searches the words of the transcription itself, with wildcards, "
             + "phrases and AND / OR / NOT; and you can browse every kind of goods as a tree."},
        {el: "#ladingTable tbody tr[data-id] .toggleCargosBtn", title: "Open a lading",
         body: "Shows its cargos. Coloured words are what the tools recognised: hover for what they are, "
             + "click a name to find that person, and use <i class=\"fas fa-table\"></i> for the "
             + "tools' reading of a cargo: goods, quantity, measure, concept."},
        {el: "#viewTabs .nav-item:nth-child(2)", title: "Table, Chart and Map",
         body: "The same selection as a chart over time, or on a map of where the goods came from."},
        {el: "#exportButtons", title: "Take it with you",
         body: "Download the current selection, including as a PDF."},
        {el: "#tourBtn", title: "That's it",
         body: `Run the tour again at any time from here. For worked examples, read the `
             + `<a href="${DOCS}" target="_blank" rel="noopener">Getting Started</a> guide.`},
    ];

    let i = -1, pop = null, anchor = null;

    // THE PAGE IS INERT WHILE THE TOUR RUNS (Stephen, 29 Sep: tooltips appeared and buttons
    // and links could be clicked underneath it). A transparent veil over the whole page takes
    // every pointer event -- clicks, hovers, the wheel -- so nothing beneath reacts; the tour's
    // popover sits above it. The current step's control is shown through a "spot": a frame
    // over it that dims the rest of the page and takes no pointer events itself, so the
    // control is visible but, being under the veil, not clickable.
    let veil = null, spot = null;
    function _veilOn() {
        if (veil) return;
        veil = document.createElement("div");
        veil.className = "tour-veil";
        veil.setAttribute("aria-hidden", "true");
        spot = document.createElement("div");
        spot.className = "tour-spot";
        document.body.append(veil, spot);
        document.querySelectorAll(".tooltip").forEach(t => t.remove());   // any already showing
    }
    function _veilOff() {
        if (veil) veil.remove();
        if (spot) spot.remove();
        veil = spot = null;
    }
    function _placeSpot() {
        if (!spot) return;
        if (!anchor || !anchor.classList.contains("tour-target")) { spot.style.display = "none"; return; }
        const r = anchor.getBoundingClientRect();
        Object.assign(spot.style, {display: "block", top: `${r.top - 6}px`, left: `${r.left - 6}px`,
                                   width: `${r.width + 12}px`, height: `${r.height + 12}px`});
    }

    const visible = el => !!el && el.getClientRects().length > 0 &&
        getComputedStyle(el).visibility !== "hidden" && !el.closest(".content-hidden");
    const loading = () => !!document.querySelector("#ladingTable.content-hidden");

    function _target(step) {
        for (const sel of step.el.split(",").map(s => s.trim())) {
            const el = document.querySelector(sel);
            if (visible(el)) return {el, ready: true};
        }
        return {el: document.getElementById("viewTabs"), ready: false};
    }

    function _skip(step) { return step.onlyWhileLoading && !loading(); }

    function _content(step, ready) {
        const n = STEPS.filter(s => !_skip(s)).length;
        const k = STEPS.slice(0, i + 1).filter(s => !_skip(s)).length;
        const wait = ready ? "" : `<div class="tour-wait"><i class="fas fa-hourglass-half me-1"></i>`
            + `This appears when loading has finished.</div>`;
        return `<div class="tour-body">${step.body}</div>${wait}
            <div class="tour-nav">
                <span class="tour-count">${k} of ${n}</span>
                <button type="button" class="btn btn-link btn-sm" data-tour="close">Close</button>
                ${i > 0 ? '<button type="button" class="btn btn-outline-secondary btn-sm" data-tour="back">Back</button>' : ""}
                <button type="button" class="btn btn-primary btn-sm" data-tour="next">${i === STEPS.length - 1 ? "Done" : "Next"}</button>
            </div>`;
    }

    function _hide() {
        if (pop) { try { pop.dispose(); } catch (e) { /* already gone */ } pop = null; }
        if (anchor) anchor.classList.remove("tour-target");
        anchor = null;
    }

    function _show(dir = 1) {
        _hide();
        while (i >= 0 && i < STEPS.length && _skip(STEPS[i])) i += dir;
        if (i < 0 || i >= STEPS.length) { stop(); return; }
        const step = STEPS[i];
        const {el, ready} = _target(step);
        anchor = el;
        if (ready) {
            el.classList.add("tour-target");
            el.scrollIntoView({block: "nearest"});
        }
        _placeSpot();
        pop = new bootstrap.Popover(el, {
            title: step.title, content: _content(step, ready), html: true, sanitize: false,
            trigger: "manual", placement: ready ? "auto" : "bottom", customClass: "tour-popover",
            container: "body"});
        pop.show();
    }

    function start() {
        try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch (e) { /* per-visit */ }
        _veilOn();
        i = 0;
        _show(1);
        document.addEventListener("keydown", _keys, true);
    }

    function stop() {
        _hide();
        _veilOff();
        i = -1;
        document.removeEventListener("keydown", _keys, true);
    }

    function _keys(e) {
        if (i < 0) return;
        if (e.key === "Escape") { e.preventDefault(); stop(); }
        else if (e.key === "ArrowRight" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { i++; _show(1); }
        else if (e.key === "ArrowLeft" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { i--; _show(-1); }
    }

    $(document).on("click", "[data-tour]", function (e) {
        e.preventDefault();
        const a = this.getAttribute("data-tour");
        if (a === "close") stop();
        else if (a === "next") { i++; _show(1); }
        else if (a === "back") { i--; _show(-1); }
    });
    $(document).on("click", "#tourBtn", function (e) { e.preventDefault(); $(this).tooltip("hide"); stop(); start(); });
    // When loading finishes, a step shown beside the tabs can move to its real control.
    $(window).on("resize", () => { if (pop) pop.update(); _placeSpot(); });
    window.addEventListener("scroll", () => { if (spot) _placeSpot(); }, true);
    $(() => {
        const table = document.getElementById("ladingTable");
        if (!table) return;
        new MutationObserver(() => {
            if (i >= 0 && !table.classList.contains("content-hidden")) setTimeout(() => _show(1), 900);
        }).observe(table, {attributes: true, attributeFilter: ["class"]});
    });

    function _seen() { try { return !!localStorage.getItem(SEEN_KEY); } catch (e) { return false; } }

    // FIRST VISIT: start once the preview notice (if any) is out of the way.
    function autostart() {
        if (window.__mlcaDebug && !window.__mlcaTourTest) return;
        if (_seen()) return;
        const go = () => setTimeout(() => { if (i < 0) start(); }, 600);
        if (!document.querySelector(".pg-veil")) { go(); return; }
        const mo = new MutationObserver(() => {
            if (!document.querySelector(".pg-veil")) { mo.disconnect(); go(); }
        });
        mo.observe(document.body, {childList: true});
    }
    $(autostart);

    return {start, stop, get step() { return i; }, get steps() { return STEPS.length; }, SEEN_KEY};
})();
