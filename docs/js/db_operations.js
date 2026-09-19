// db_operations.js

// Dexie DB Version and Upgrade
db.version(62).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB schema upgraded — clearing old data");
    $("#progressBarContainer").show();
    $("#overallProgressBar")
        .css("width", "100%")
        .attr("aria-valuenow", 100)
        .removeClass("progress-bar-animated")
        .text("Database upgrade: Clearing old data...");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
        // persons / personLadings only exist from v62 onward; older DBs won't have them
        if (trans.tables.some(t => t.name === "persons")) {
            await trans.table("persons").clear();
        }
        if (trans.tables.some(t => t.name === "personLadings")) {
            await trans.table("personLadings").clear();
        }
        console.info("Old data cleared successfully.");
    } catch (error) {
        console.error("Error during DB upgrade and clearing:", error);
        $("#overallProgressBar")
            .css("width", "100%")
            .removeClass("progress-bar-animated")
            .addClass("bg-danger")
            .text("Database upgrade failed. Please refresh the page.");
    }
});

// Version 63 — cargos reannotated with the new span-parser (commodity/unit/
// qualifier annotations now carry AAT subject `groups` and nested `qualifiers`).
// Bump to force existing clients to clear and re-fetch the updated ladings .gz.
db.version(63).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v63 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v63 upgrade:", error);
    }
});

// Version 64 — cargos reannotated after conservative single-sense disambiguation
// (one best reading per token; commonness tie-breaker). Re-fetch updated .gz.
db.version(64).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v64 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v64 upgrade:", error);
    }
});

// Version 65 — cargos reannotated after splitting concatenated repeat-word
// attestations and the candle/mustard form rewrites (rebuilt commodity
// dictionary). Re-fetch updated .gz.
db.version(65).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v65 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v65 upgrade:", error);
    }
});

// Version 66 — cargos reannotated after the commodity-review round: applied
// curator accepts/reassigns, reinstated 'florey', added 'felt hat' + egri
// vinegar/beeregar forms, and new parser masking. Re-fetch updated .gz.
db.version(66).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v66 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v66 upgrade:", error);
    }
});

// Version 67 — reannotated after parser fixes (containers typed as units;
// qualifiers no longer cross an intervening anchor), pos.py lower-case merchant
// names after a title, and new concepts (poise, cow, calf, eel inflections).
db.version(67).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v67 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v67 upgrade:", error);
    }
});

// Version 68 — reannotated after review round 2: pannis→cloth disambiguation,
// new 'dozen cloth' concept, book 'ligatorum' qualifier, more parser masking.
db.version(68).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v68 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v68 upgrade:", error);
    }
});

// Version 69 — reannotated after duplici→worsted fix and pos.py numeral parsing
// (Middle English number spellings + compound "one and twentye" = 21).
db.version(69).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v69 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v69 upgrade:", error);
    }
});

// Version 70 — reannotated after review round 4: shortcloth concept, more
// masking + occupational qualifiers, ".."/"..." illegibility rule, filo/lob/
// playing/coal/dozen form & qualifier additions.
db.version(70).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v70 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v70 upgrade:", error);
    }
});

// Version 71 — reannotated after the three deferred parser/glossary fixes:
// et-joined qualifiers, foliis foil/leaf vs parchment-leaves, filo→bowstring.
db.version(71).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v71 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v71 upgrade:", error);
    }
});

// Version 72 — reannotated after the dor name-particle fix and review round 5:
// new 'pound' (lb) weight unit, ell/frying-pan/millstone forms, more masking.
db.version(72).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v72 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v72 upgrade:", error);
    }
});

// Version 73 — reannotated after activating 'pro X' purpose qualifiers (pro is
// now a connective) and fixing doliis/dolio→tun (was fuzzy-matching 'dowel').
db.version(73).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v73 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v73 upgrade:", error);
    }
});

// Version 74 — reannotated after the high-frequency fuzzy-mismatch audit
// (virgis/tele/cere/caligarum/candelarum/cinerum/pair fixes) and review round 6
// (stuff/linseed-oil/chafer/horn attestations + masking).
db.version(74).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v74 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v74 upgrade:", error);
    }
});

// Version 75 — reannotated after clavis/clavus clove-vs-nail disambiguation
// (clavis -> clove weight-unit; clav* ferri -> nail) and rebuilt concept_freq.
db.version(75).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v75 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v75 upgrade:", error);
    }
});

// Version 76 — reannotated after assigning nail its 'nails (fasteners)' AAT
// (group Hardware & fasteners, was Unidentified).
db.version(76).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v76 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v76 upgrade:", error);
    }
});

// Version 77 — reannotated after review batch: new 'back fur' concept, blowing-
// horn / handles-pro-fullers / melyng-niger attestations, bysyd masking; plus
// removal of 19 dangling related references.
db.version(77).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v77 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v77 upgrade:", error);
    }
});

// Version 78 — reannotated after masking clerk's-note/administrative Latin that
// fuzzy-matched commodities above the acceptance floor (annexa->anella etc.).
db.version(78).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v78 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v78 upgrade:", error);
    }
});

// Version 79 — reannotated after the final review batch: new concepts furniture
// foot, sea dog, uter; pyk->pitch, niso->nisus; gosse masked. Queue now empty.
db.version(79).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v79 — clearing cached ladings to load reannotated cargos");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v79 upgrade:", error);
    }
});

db.version(80).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v80 — clearing cached ladings to load qualifier-migrated reannotation");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v80 upgrade:", error);
    }
});

db.version(81).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v81 — clearing cached ladings (one-commodity-per-item reannotation)");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v81 upgrade:", error);
    }
});

db.version(82).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v82 — clearing cached ladings (illegibility-marker fix reannotation)");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v82 upgrade:", error);
    }
});

db.version(83).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v83 — clearing cached ladings (qualifier-aware head disambiguation)");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v83 upgrade:", error);
    }
});

db.version(84).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v84 — clearing cached ladings (Index-of-Subjects per-page disambiguation prior)");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v84 upgrade:", error);
    }
});

// Version 85 — no reannotation; forces a reload so existing clients recompute
// the per-lading commodity `groups` union used by the new commodity-group filter.
db.version(85).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v85 — clearing cached ladings to precompute commodity groups");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v85 upgrade:", error);
    }
});

// Version 86 — no reannotation; forces a reload so existing clients pick up the
// corrected arrival dates for LCA III:4-I import ships 68-137 (Stuart's
// 1477->1478 error; GitHub issue #31).
db.version(86).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v86 — clearing cached ladings to load corrected III:4 import dates (#31)");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v86 upgrade:", error);
    }
});

// Version 87 — index the particle-stripped `surname_key` so a bare-root search
// ("Lazera") finds a stored particle surname ("de Lazera"); clears the person
// index so it re-fetches the rebuilt name_index carrying surname_key (#32/#33).
db.version(87).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v87 — clearing person index to load surname_key + reranked neighbours");
    try {
        await trans.table("persons").clear();
        await trans.table("personLadings").clear();
    } catch (error) {
        console.error("Error clearing data on v87 upgrade:", error);
    }
});

// Version 88 — the ladings cache was written by a build that coerced an unknown
// direction to `export: false`, i.e. to a definite import (#40). The coercion is gone,
// but a browser that already holds those rows would keep showing 1,389 ladings as
// imports for ever, so the lading and cargo stores are dropped and re-fetched once.
// Expensive — it is the whole corpus — but the alternative is a fix that only new
// visitors receive.
db.version(88).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v88 — clearing the ladings cache to pick up undetermined directions");
    try {
        // Both, together: preloadAllLadings decides per volume by counting ladings,
        // so clearing ladings without cargos would re-add every cargo alongside the
        // ones already there.
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v88 upgrade:", error);
    }
});

// Version 89 — the person index was built from Symphonym embeddings produced by a
// tokeniser that disagreed with the model's own vocabulary, so stored "similar people"
// neighbours were computed from the wrong character rows (Ricardo Garrard's nearest
// neighbour was Oliveri van Watirscot). 88.5% of the 110,977 groups have different
// neighbours in the rebuilt name_index. The persons store is only populated when empty,
// so without this clear an existing browser keeps the old suggestions indefinitely.
// personLadings is untouched: pids are unchanged, because group membership did not move.
db.version(89).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v89 — clearing person index to load neighbours from the corrected embeddings");
    try {
        await trans.table("persons").clear();
    } catch (error) {
        console.error("Error clearing data on v89 upgrade:", error);
    }
});

db.version(90).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    // Stored ladings carry a duplicate copy of their cargos, which is 89% of
    // each record and the reason a filter change takes seconds. The population
    // loop no longer writes it, so the ladings have to be rebuilt: clearing
    // them is what makes that happen. The cargos store already holds every one
    // of them and is left alone.
    console.warn("DB v90 — clearing ladings to rebuild them without the duplicated cargos");
    try {
        await trans.table("ladings").clear();
    } catch (error) {
        console.error("Error clearing data on v90 upgrade:", error);
    }
});

db.version(91).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    // Cargo text, lower-cased, one row per lading and nothing else in it. A text
    // search used to fetch every cargo RECORD to read its text, and a cargo
    // record is 1,474 bytes of which the text is 90: the annotations are 94% of
    // what was being deserialised, and none of it was searched. Searching "peat"
    // -- which matches nothing, so nothing short-circuits -- took 22 seconds.
    ladingText: "lading_id",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    console.warn("DB v91 — clearing ladings to build the search text alongside them");
    try {
        await trans.table("ladings").clear();
    } catch (error) {
        console.error("Error clearing data on v91 upgrade:", error);
    }
});

db.version(92).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    ladingText: "lading_id",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    // 54 lading headings gained an annotation: 53 a destination place the date
    // rule had been swallowing ("exeunte versus Calisiam die"), and one a
    // master-surname that a missing space in the transcription had glued to
    // "eodem". Only the headings changed, but a cached lading holds its own
    // annotations, so the cached copies have to go.
    console.warn("DB v92 — clearing ladings to pick up 54 corrected headings");
    try {
        await trans.table("ladings").clear();
    } catch (error) {
        console.error("Error clearing data on v92 upgrade:", error);
    }
});

db.version(93).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    ladingText: "lading_id",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    // Every volume re-annotated: 32,871 quantities that itemised lists had lost,
    // 4,285 word "numerals" that were not quantities (2 dimidiis barellis, dosen,
    // seminis), and the glossary and pos.py work since the last regeneration on
    // 16 Jul. Cargo annotations changed throughout, so both caches have to go.
    console.warn("DB v93 — clearing ladings and cargos to pick up the re-annotated corpus");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v93 upgrade:", error);
    }
});

db.version(94).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    ladingText: "lading_id",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    // The English-format entries (IV-20) and late wool accounts (IV-9) gain their
    // merchants and masters: 3,029 merchant names, 2,302 masters, 978 new person
    // groups. Cargos, ladings and the person tables all changed.
    console.warn("DB v94 — clearing ladings, cargos and persons to pick up the new merchants");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
        await trans.table("persons").clear();
        await trans.table("personLadings").clear();
    } catch (error) {
        console.error("Error clearing data on v94 upgrade:", error);
    }
});

db.version(95).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    ladingText: "lading_id",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    // 996 merchants gain their place of origin ("mercatore Colonie"), a new
    // annotation type in 26 volumes; cached cargos hold their own annotations.
    console.warn("DB v95 — clearing ladings and cargos to pick up merchants' places of origin");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v95 upgrade:", error);
    }
});

db.version(96).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    ladingText: "lading_id",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    // Eliot's span-flag verdicts re-read goods, measures, compounds and statuses
    // in 9,458 cargos across 43 volumes; cached cargos hold their own annotations.
    console.warn("DB v96 — clearing ladings and cargos to pick up the span-flag verdicts");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v96 upgrade:", error);
    }
});

db.version(97).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    ladingText: "lading_id",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id"
}).upgrade(async (trans) => {
    // Surnames no longer end in a dangling particle ("Lane the" -> "Lane", with
    // "the elder" as status); 9 volumes, and the person index gains 9 merchants.
    console.warn("DB v97 — clearing ladings, cargos and persons to pick up corrected surnames");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
        await trans.table("persons").clear();
        await trans.table("personLadings").clear();
    } catch (error) {
        console.error("Error clearing data on v97 upgrade:", error);
    }
});

db.version(98).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    ladingText: "lading_id",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id",
    // The places goods are NAMED with ("fili Colonie"), one row per lading that
    // has any: see _collectLadingProvenance. For the map's Commodity provenance
    // layer, which needs them for the whole corpus and cannot afford to read
    // every cargo to get them.
    provenance: "lading_id"
});
// NO UPGRADE FUNCTION, deliberately. Nothing cached is wrong; a store is missing,
// and everything needed to fill it is already in `cargos`. Clearing the corpus
// to fill it would make every returning visitor download 26MB again for 1MB of
// derived rows, so backfillProvenance() builds it from the cargos store instead,
// once. A later bump that clears ladings and cargos need not clear this too:
// preloadAllLadings empties it whenever it finds no ladings at all, and replaces
// a volume's rows whenever it reloads that volume.

db.version(99).stores({
    ladings: "lading_id, customs_year, volume, primary_date, text, customs_type",
    cargos: "++id, lading_id, cargo",
    ladingText: "lading_id",
    persons: "pid, forename, surname, surname_key, year_min, year_max",
    personLadings: "[pid+lading_id+role], pid, lading_id",
    provenance: "lading_id"
}).upgrade(async (trans) => {
    // 43 "Holande" goods spans restored in 3 volumes ("104 pecias Gente Holande"):
    // cached cargos hold their own annotations. The provenance store refills with
    // the corpus (preloadAllLadings clears it when it finds no ladings).
    console.warn("DB v99 — clearing ladings and cargos to pick up restored Holland cloth");
    try {
        await trans.table("ladings").clear();
        await trans.table("cargos").clear();
    } catch (error) {
        console.error("Error clearing data on v99 upgrade:", error);
    }
});

async function checkDbHealth() {
    try {
        // Quick probe: can we query the ladings table?
        const count = await db.ladings.count();

        // Optionally, sanity-check schema
        if (!db.ladings || !db.cargos) {
            throw new Error("Missing expected stores in DB schema");
        }

        console.info(`DB healthy, ${count} ladings present.`);
        return true;
    } catch (err) {
        console.warn("DB appears corrupted or inaccessible. Resetting…", err);

        try {
            await db.delete();  // Drop the database entirely
            await db.open();    // Re-open clean DB
            console.info("DB successfully reset.");
        } catch (resetErr) {
            console.error("Failed to reset DB:", resetErr);
            throw resetErr; // propagate so init() fails loudly
        }

        return false;
    }
}

async function preloadAllLadings() {
    const invResponse = await fetch("data/inventory.json");
    const inventory = await invResponse.json();

    const totalFiles = inventory.filter(entry => entry.folder_exists).length;
    let loadedFiles = 0;

    let minDate = null;
    let maxDate = null;
    const dateRange = localStorage.getItem("LCA_DateRange");
    if (dateRange) {
        try {
            ({minDate, maxDate} = JSON.parse(dateRange));
        } catch (err) {
            console.warn("Failed to parse date range from localStorage:", err);
        }
    }

    $("#progressBarContainer").show();
    $("#overallProgressBar")
        .css("width", "0%")
        .attr("aria-valuenow", 0)
        .addClass("progress-bar-animated")
        .removeClass("bg-danger")
        .text("0%");

    const updateLoadingProgressText = (loaded, total) => {
        const percentage = Math.round((loaded / total) * 100);
        $("#overallProgressBar").css("width", `${percentage}%`).attr("aria-valuenow", percentage).text(`${percentage}% (${loaded}/${total} files)`);
    };

    // A corpus being loaded from nothing -- a first visit, or a version bump that
    // cleared it -- takes its provenance with it, so rows for ladings that no
    // longer exist cannot outlive them.
    if (await db.ladings.count() === 0) await db.provenance.clear();

    for (const entry of inventory) {
        if (entry.folder_exists) {
            const ref = entry.reference;

            const stored = await db.ladings.where("volume").equals(ref).count();
            if (stored > 0) {
                loadedFiles++;
                updateLoadingProgressText(loadedFiles, totalFiles);
                continue;
            }

            try {
                const ladings = await _fetchGzippedJson(`data/ladings/${ref}.json.gz`,
                                                        {revalidate: true});

                const cargosToBulkAdd = [];
                const searchToBulkAdd = [];
                const provenanceToBulkPut = [];
                ladings.forEach(v => {
                    v.volume = ref;

                    if (v.label) {
                        v.text = v.label.text;
                        v.annotations = v.label.annotations || [];
                        delete v.label;
                    }

                    if (entry.pdf_link) {
                        const pageNum = v.page?.pdf_index || false;
                        v.pdf_link = pageNum ? `${entry.pdf_link}#page=${pageNum + 1}` : null;
                    } else {
                        v.pdf_link = null;
                    }

                    const dates = v.date?.dates || [];
                    v.primary_date = dates[0] || null;
                    v.date_list = dates;
                    // NO COERCION. `v.export || false` turned `undefined` into `false`,
                    // and `false` means import — so 1,389 ladings whose direction was
                    // never determined were shown and filtered as definite imports, and
                    // three branches written for the undefined case could never run:
                    // the "Indeterminate Import/Export" icon (chart_and_table.js), the
                    // undefined-direction arm of the type filter (filter_and_sort.js),
                    // and the '⇄ indeterminate' column in the CSV/JSON export
                    // (export.js). Leaving it undefined is what all three expect (#40).
                    if (v.export !== true && v.export !== false) {
                        v.export = undefined;
                    }
                    v.customs_year = getCustomYear(v.primary_date);

                    if (v.primary_date && !v.primary_date.startsWith("0000-")) {
                        if (minDate === null || v.primary_date < minDate) minDate = v.primary_date;
                        if (maxDate === null || v.primary_date > maxDate) maxDate = v.primary_date;
                    }

                    // Union of AAT subject `groups` across all commodity
                    // annotations in this lading's cargos. Precomputed here so the
                    // commodity-group filter can narrow the in-memory lading list
                    // without re-fetching cargos (mirrors customs_type/date).
                    v.groups = _collectLadingGroups(v.cargos);

                    const places = _collectLadingProvenance(v.cargos);
                    if (places.length) provenanceToBulkPut.push({lading_id: v.lading_id, places});

                    if (v.cargos) {
                        // The searchable text, kept apart from the annotations that
                        // dwarf it. Lower-cased once here rather than on every search.
                        // Held per cargo, not concatenated, so a multi-term query
                        // still has to satisfy itself within ONE cargo, exactly as
                        // when each cargo was fetched and tested separately.
                        searchToBulkAdd.push({
                            lading_id: v.lading_id,
                            texts: v.cargos.map(c => (c.text || '').toLowerCase()),
                        });
                        cargosToBulkAdd.push(...v.cargos.map((cargo, index) => {
                            const paddedIndex = String(index + 1).padStart(4, '0');
                            const cargoId = `${v.lading_id}-${paddedIndex}`;
                            return {
                                lading_id: v.lading_id,
                                id: cargoId,
                                cargo: cargo.text,
                                annotations: cargo.annotations || [],
                            };
                        }));
                    }

                    // The cargos have just been written to their own store, keyed by
                    // lading_id; keeping a second copy inside the lading made every
                    // record 6,868 bytes where 740 would do -- 89% of it cargo text
                    // that the filter never reads. That copy was the whole cost of the
                    // wait after the download bar clears: 229MB deserialised out of
                    // IndexedDB on each filter change, six seconds warm and half a
                    // minute cold, against 0.2s to build the table from it.
                    //
                    // Everything that wants a lading's cargos already asks the store:
                    // the cargos button, the text search, the commodity filter, the
                    // annotations panel, the PDF export. `groups` is computed just
                    // above precisely so the commodity filter need not fetch them.
                    delete v.cargos;
                });

                await db.ladings.bulkAdd(ladings, {allKeys: true, chunked: true, chunkSize: 100});
                if (cargosToBulkAdd.length > 0) {
                    await db.cargos.bulkAdd(cargosToBulkAdd, {allKeys: true, chunked: true, chunkSize: 100});
                }
                if (searchToBulkAdd.length > 0) {
                    await db.ladingText.bulkPut(searchToBulkAdd, {chunked: true, chunkSize: 500});
                }
                // Replace, not add: a volume reloaded on its own must not keep
                // the rows of ladings that have since lost their places.
                await db.provenance.bulkDelete(ladings.map(v => v.lading_id));
                if (provenanceToBulkPut.length > 0) {
                    await db.provenance.bulkPut(provenanceToBulkPut);
                }

                loadedFiles++;
                updateLoadingProgressText(loadedFiles, totalFiles);

            } catch (err) {
                console.warn(`Failed to load ${ref}:`, err);
                loadedFiles++;
                updateLoadingProgressText(loadedFiles, totalFiles);
            }
        }
    }
    $("#progressBarContainer").hide();

    minDate = minDate || globalRange[0] + "-09-29"; // Default start date
    maxDate = maxDate || globalRange[1] + "-09-28"; // Default end date
    globalRange = [minDate, maxDate].map(d => Number(d.split("-")[0]));
    localStorage.setItem('LCA_DateRange', JSON.stringify({minDate, maxDate}));
}

// Collect the unique set of AAT subject `groups` carried by a lading's cargo
// commodity annotations (annotations[].matches[].groups, plus any annotation- or
// qualifier-level groups). Returns a sorted array of fine-group names.
function _collectLadingGroups(cargos) {
    const set = new Set();
    (cargos || []).forEach(cargo => {
        (cargo.annotations || []).forEach(a => {
            if (Array.isArray(a.groups)) a.groups.forEach(g => set.add(g));
            if (Array.isArray(a.matches)) {
                a.matches.forEach(m => {
                    if (Array.isArray(m && m.groups)) m.groups.forEach(g => set.add(g));
                });
            }
            if (Array.isArray(a.qualifiers)) {
                a.qualifiers.forEach(q => {
                    if (Array.isArray(q && q.groups)) q.groups.forEach(g => set.add(g));
                });
            }
        });
    });
    return Array.from(set).sort();
}

// Every place a lading's GOODS are named with: the geo on a qualifier of a
// commodity, unit or commodity-unit annotation ("fili Colonie", "peces Gent").
// One tuple per qualifier, [place id, label, lng, lat, what it qualifies, type].
//
// NOT the merchant-place annotations ("mercatore Colonie"). Those say where the
// MERCHANT was from, which is a different question, and they are left out by
// construction: only qualifiers are read, and a merchant-place has none.
//
// Nor the 31 glossary concepts with an entry-level geo (Holland cloth, dornick):
// that is not on the annotations, so it is not read here.
const PROVENANCE_TYPES = new Set(["commodity", "unit", "commodity-unit"]);

function _collectLadingProvenance(cargos) {
    const out = [];
    (cargos || []).forEach(cargo => _provenanceOf(cargo.annotations, out));
    return out;
}

function _provenanceOf(annotations, out) {
    (annotations || []).forEach(a => {
        if (!PROVENANCE_TYPES.has(a.type) || !Array.isArray(a.qualifiers)) return;
        const match = (a.matches || [])[0];
        const what = (match && (match.headword || match.key)) || a.text || "";
        a.qualifiers.forEach(q => {
            const geo = q && q.geo;
            if (!geo || !geo.id || !Array.isArray(geo.point)) return;
            out.push([geo.id, geo.label || q.text || geo.id,
                      geo.point[0], geo.point[1], what, a.type]);
        });
    });
    return out;
}

// Fill the provenance store from the cargos already cached, for a visitor whose
// corpus was loaded before the store existed. Same shape as backfillSearchText,
// and for the same reason: the loader skips volumes it already holds.
async function backfillProvenance() {
    try {
        if (!await db.ladings.count()) return;       // the loader will do it
        if (await db.provenance.count() > 0) return;
        console.warn("Commodity provenance index missing — building it from the cargos store");
        $("#loadingSpinner .spinner-label").text("indexing the places goods are named with\u2026");
        const byLading = new Map();
        await db.cargos.each(c => {
            const before = (byLading.get(c.lading_id) || []);
            const after = _provenanceOf(c.annotations, before);
            if (after.length) byLading.set(c.lading_id, after);
        });
        const rows = [];
        for (const [lading_id, places] of byLading) rows.push({lading_id, places});
        if (rows.length) await db.provenance.bulkPut(rows, {chunked: true, chunkSize: 500});
        console.info(`Commodity provenance indexed for ${rows.length} ladings`);
    } catch (err) {
        console.error("Could not build the commodity provenance index:", err);
    }
}

// `revalidate` is for the one-shot store populations that follow a db.version()
// upgrade. GitHub Pages serves these files under a fixed name with
// `cache-control: max-age=600`, so for ten minutes after a deploy a browser may
// hand back the previous file from its HTTP cache. Everywhere else that is
// harmless — the next load corrects it — but a population that only runs when
// the store is empty does not get a next load: the stale copy is written to
// IndexedDB and stays there until the next schema bump. `no-cache` forces
// revalidation against the ETag, which is a 304 when nothing changed.
async function _fetchGzippedJson(url, {revalidate = false} = {}) {
    const resp = await fetch(url, revalidate ? {cache: "no-cache"} : undefined);
    if (!resp.ok) throw new Error(`${url}: ${resp.status}`);
    // Decompress via the streams API. Browsers unconditionally decompress
    // a `Content-Encoding: gzip` response themselves, but our static host
    // serves the .gz file as-is, so we drive DecompressionStream manually.
    const stream = resp.body.pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).json();
}

// One full scan, once, after the corpus is loaded. 133 of 33,548 records, and they
// cannot come from an index because a null key is not indexed.
// Backfill for the search text, because the loader skips any volume already in
// `ladings` -- so a store added after the corpus was loaded would never be
// filled, and a schema bump that fails to clear (or a user who arrived between
// two of them) would leave the search silently answering from an empty index.
// Everything needed is already in the cargos store, so no refetch: one pass,
// once, and only when it is actually missing.
async function backfillSearchText() {
    try {
        const ladings = await db.ladings.count();
        if (!ladings) return;                       // nothing loaded yet; the loader will do it
        if (await db.ladingText.count() > 0) return;
        console.warn("Search text index missing — rebuilding it from the cargos store");
        $("#loadingSpinner .spinner-label").text("building the search index\u2026");
        const byLading = new Map();
        await db.cargos.each(c => {
            let a = byLading.get(c.lading_id);
            if (!a) byLading.set(c.lading_id, a = []);
            a.push((c.cargo || "").toLowerCase());
        });
        const rows = [];
        for (const [lading_id, texts] of byLading) rows.push({lading_id, texts});
        if (rows.length) await db.ladingText.bulkPut(rows, {chunked: true, chunkSize: 500});
        console.info(`Search text index rebuilt for ${rows.length} ladings`);
    } catch (err) {
        console.error("Could not rebuild the search text index:", err);
    }
}

async function loadDatelessLadings() {
    try {
        datelessLadings = await db.ladings
            .filter(v => v.customs_year === null || v.customs_year === undefined)
            .toArray();
        if (datelessLadings.length) {
            console.info(`${datelessLadings.length} ladings have no usable date and are held out of the year range.`);
        }
    } catch (err) {
        console.warn("Could not collect the undated ladings:", err);
        datelessLadings = [];
    }
}

async function preloadPersonIndex() {
    const existing = await db.persons.count();
    if (existing > 0) {
        console.info(`Person index already loaded (${existing} groups).`);
        return;
    }

    $("#progressBarContainer").show();
    $("#overallProgressBar")
        .css("width", "0%")
        .attr("aria-valuenow", 0)
        .addClass("progress-bar-animated")
        .removeClass("bg-danger")
        .text("Loading name index...");

    try {
        const [idx, rev] = await Promise.all([
            _fetchGzippedJson("data/name_index.json.gz", {revalidate: true}),
            _fetchGzippedJson("data/name_lading_index.json.gz", {revalidate: true}),
        ]);

        const personRows = Object.entries(idx).map(([pid, v]) => ({pid, ...v}));
        await db.persons.bulkAdd(personRows, {chunked: true, chunkSize: 2000});

        const ladingRows = [];
        for (const [pid, rows] of Object.entries(rev)) {
            for (const [lading_id, role] of rows) {
                ladingRows.push({pid, lading_id, role});
            }
        }
        await db.personLadings.bulkAdd(ladingRows, {chunked: true, chunkSize: 5000});

        console.info(`Person index loaded: ${personRows.length} groups, ${ladingRows.length} pid/lading pairs.`);
    } catch (err) {
        console.warn("Failed to load name index:", err);
    } finally {
        $("#progressBarContainer").hide();
    }
}