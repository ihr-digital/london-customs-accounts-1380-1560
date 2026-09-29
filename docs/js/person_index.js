// person_index.js
//
// The person index, held in memory. Replaces the `persons` and `personLadings`
// IndexedDB tables (dropped in DB v109).
//
// WHY. A first visit used to write 111,964 persons, each carrying 30 neighbours
// (122 MB unpacked), and 214,025 person-lading rows into IndexedDB, and the table
// waited for it: 7.8 minutes of a ~14-minute first load, measured 29 Sep 2026, with
// the progress bar at 0% throughout. Only the person filter and the name picker read
// them. Now persons.json.gz (2.3 MB; each person carries its own ladings) is read into
// memory after the table appears -- a second or two, and HTTP-cached thereafter -- and
// a seed's neighbours come from one of 256 small shards when the picker opens it.
// Built by process/build_person_files.py; SHARDS must match its value.
//
// Public surface (all async; each waits for the load, starting it if need be):
//   PersonIndex.load()               -- start or join the load; resolves when ready
//   PersonIndex.get(pid)             -- one person, or undefined
//   PersonIndex.bulkGet(pids)        -- array aligned with pids (undefined where absent)
//   PersonIndex.search(q, limit)     -- forename / surname / surname_key starting with q
//   PersonIndex.ladingIds(pids)      -- Set of lading_ids naming any of those persons
//   PersonIndex.neighbours(pid)      -- [{id, score}], fetched from the pid's shard
//   PersonIndex.ready                -- true once loaded (synchronous)
//
// A person is {pid, forename, surname, surname_key?, status, year_min, year_max,
// count, variants, ladings: [[lading_id, role], ...]}.

const PersonIndex = (() => {
    const SHARDS = 256;
    let byPid = null;       // Map pid -> person
    let keys = null;        // [[lowercased name part, pid]], sorted by the name part
    let loading = null;
    const shardCache = new Map();

    function _build(data) {
        const map = new Map();
        const k = [];
        for (const [pid, p] of Object.entries(data)) {
            p.pid = pid;
            map.set(pid, p);
            const seen = new Set();
            for (const part of [p.forename, p.surname, p.surname_key]) {
                const lc = (part || "").toLowerCase();
                if (lc && !seen.has(lc)) { seen.add(lc); k.push([lc, pid]); }
            }
        }
        k.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        byPid = map;
        keys = k;
    }

    function load() {
        if (!loading) {
            loading = _fetchGzippedJson("data/persons.json.gz", {revalidate: true})
                .then(data => {
                    _build(data);
                    console.info(`Person index in memory: ${byPid.size} persons.`);
                })
                .catch(err => {
                    loading = null;   // let a later call try again
                    throw err;
                });
        }
        return loading;
    }

    async function get(pid) {
        await load();
        return byPid.get(String(pid));
    }

    async function bulkGet(pids) {
        await load();
        return pids.map(p => byPid.get(String(p)));
    }

    // First index whose name part is >= q.
    function _lowerBound(q) {
        let lo = 0, hi = keys.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (keys[mid][0] < q) lo = mid + 1; else hi = mid;
        }
        return lo;
    }

    // Same answer as the Dexie query it replaces -- forename, surname or surname_key
    // starting with q, ignoring case -- ordered with exact name parts first, then by
    // how many times the person is recorded.
    async function search(q, limit = 50) {
        await load();
        const lq = String(q || "").toLowerCase().trim();
        if (!lq) return [];
        const hits = new Map();   // pid -> exact?
        for (let i = _lowerBound(lq); i < keys.length && keys[i][0].startsWith(lq); i++) {
            const [part, pid] = keys[i];
            hits.set(pid, hits.get(pid) || part === lq);
        }
        return [...hits.entries()]
            .map(([pid, exact]) => ({p: byPid.get(pid), exact}))
            .sort((a, b) => (b.exact - a.exact) || ((b.p.count || 0) - (a.p.count || 0)))
            .slice(0, limit)
            .map(x => x.p);
    }

    async function ladingIds(pids) {
        await load();
        const out = new Set();
        for (const pid of pids) {
            const p = byPid.get(String(pid));
            if (p) for (const [lid] of p.ladings || []) out.add(lid);
        }
        return out;
    }

    async function neighbours(pid) {
        const s = Number(pid) % SHARDS;
        if (!Number.isInteger(s)) return [];
        if (!shardCache.has(s)) {
            const name = String(s).padStart(3, "0");
            shardCache.set(s, _fetchGzippedJson(`data/person_neighbours/${name}.json.gz`)
                .catch(err => { shardCache.delete(s); throw err; }));
        }
        const shard = await shardCache.get(s);
        return (shard[String(pid)] || []).map(([id, score]) => ({id: String(id), score}));
    }

    return {
        load, get, bulkGet, search, ladingIds, neighbours,
        get ready() { return byPid !== null; },
        get size() { return byPid ? byPid.size : 0; },
    };
})();
