// name_phonetic.js
//
// "Sounds like" search of person names: Symphonym v8 in the page, blended with character
// trigrams. Step 5 of documentation/search_plan.md.
//
// Measured 29 Sep 2026 (process/search_matcher_eval.py persons, n=500): 0.5 Symphonym v8
// ('la') + 0.5 trigram Jaccard puts the right forename variant first 0.866 of the time,
// against 0.836 for trigrams and 0.784 for Symphonym alone.
//
// OPT-IN. Nothing here loads until the reader switches "sounds like" on: the model (8.5 MB),
// its character vocabulary (2.1 MB), the ONNX runtime (13.5 MB of WebAssembly, self-hosted
// in js/libs/onnxruntime-web-1.27.0) and the name vectors (4.4 MB). The browser caches them.
//
// The tokeniser is deep's port of the canonical Python (docs/symphonym/preprocess.js,
// unmodified; its any-ascii import is redirected to js/libs by the import map in
// index.html). The name vectors were made by process/build_name_phonetic.py with the same
// ONNX graph, the canonical Python tokeniser and the golden fixture passing 8/8.
//
// Public: NamePhonetic.load(), NamePhonetic.search(query, limit) -> [{form, score, cos, tri}]

const NamePhonetic = (() => {
    const ORT = "js/libs/onnxruntime-web-1.27.0/";
    const W_SYM = 0.5, W_TRI = 0.5;
    const MIN_SCORE = 0.55;        // blended; below this a form is not offered
    let S = null, loading = null;

    function trigrams(s) {                    // process/place_index.py trigrams
        s = `  ${s} `;
        const out = new Set();
        for (let i = 0; i + 3 <= s.length; i++) out.add(s.slice(i, i + 3));
        return out;
    }

    async function _gzBytes(url) {
        const r = await fetch(url, {cache: "no-cache"});
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return new Uint8Array(await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    }

    function load(onProgress) {
        if (!loading) {
            loading = (async () => {
                const step = m => { if (onProgress) onProgress(m); };
                step("loading the name vectors…");
                const [meta, bytes] = await Promise.all([
                    _fetchGzippedJson("data/search/names.json.gz", {revalidate: true}),
                    _gzBytes("data/search/names.i8.gz")]);
                const i8 = new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
                if (i8.length !== meta.n * meta.dim) throw new Error(`names.i8: ${i8.length} bytes for ${meta.n} x ${meta.dim}`);
                step("loading the phonetic model…");
                const base = new URL(".", location.href).href;
                const [ort, pre, cv, sv, lv, onnx] = await Promise.all([
                    import(base + ORT + "ort.wasm.min.mjs"),
                    import(base + "symphonym/preprocess.js"),
                    fetch("symphonym/char_vocab.json").then(r => r.json()),
                    fetch("symphonym/script_vocab.json").then(r => r.json()),
                    fetch("symphonym/lang_vocab.json").then(r => r.json()),
                    fetch("symphonym/symphonym.onnx").then(r => r.arrayBuffer())]);
                ort.env.wasm.wasmPaths = {wasm: base + ORT + "ort-wasm-simd-threaded.wasm",
                                          mjs: base + ORT + "ort-wasm-simd-threaded.mjs"};
                ort.env.wasm.numThreads = 1;     // no cross-origin isolation on Pages
                const session = await ort.InferenceSession.create(new Uint8Array(onnx), {executionProviders: ["wasm"]});
                const vocabs = {charToId: cv.char_to_id || cv, scriptToId: sv.script_to_id || sv,
                                langToId: lv.lang_to_id || lv};
                if (!(meta.lang in vocabs.langToId)) throw new Error(`language tag '${meta.lang}' is not in lang_vocab`);
                S = {ort, session, tokenise: pre.tokenise, vocabs, lang: meta.lang, forms: meta.forms,
                     tris: meta.forms.map(trigrams), i8, n: meta.n, dim: meta.dim, scale: meta.scale};
                step("");
            })().catch(err => { loading = null; throw err; });
        }
        return loading;
    }

    async function embed(text) {
        const t = S.tokenise(text, S.lang, S.vocabs);
        const n = t.charIds.length;
        const i64 = v => BigInt64Array.from([BigInt(v)]);
        const out = await S.session.run({
            char_ids: new S.ort.Tensor("int64", BigInt64Array.from(t.charIds, v => BigInt(v)), [1, n]),
            script_id: new S.ort.Tensor("int64", i64(t.scriptId), [1]),
            lang_id: new S.ort.Tensor("int64", i64(t.langId), [1]),
            length: new S.ort.Tensor("int64", i64(n), [1]),
        });
        return out.embedding.data;           // Float32Array(128), L2-normalised
    }

    async function search(query, limit = 20) {
        await load();
        const q = String(query || "").toLowerCase().replace(/\s+/g, " ").trim();
        if (q.length < 2) return [];
        const z = await embed(q);
        const qt = trigrams(q);
        const hits = [];
        for (let r = 0; r < S.n; r++) {
            let s = 0;
            const o = r * S.dim;
            for (let d = 0; d < S.dim; d++) s += z[d] * S.i8[o + d];
            const cos = s / S.scale;
            const ft = S.tris[r];
            let inter = 0;
            for (const g of qt) if (ft.has(g)) inter++;
            const tri = inter / (qt.size + ft.size - inter);
            const score = W_SYM * cos + W_TRI * tri;
            if (score >= MIN_SCORE) hits.push({form: S.forms[r], score, cos, tri});
        }
        hits.sort((a, b) => b.score - a.score);
        return hits.slice(0, limit);
    }

    return {load, search, get ready() { return S !== null; }};
})();
