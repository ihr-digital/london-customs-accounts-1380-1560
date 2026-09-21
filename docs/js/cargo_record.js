// The cargo record (plan §13): what the tools read out of one cargo -- a row per
// commodity with its quantity, measure, qualifiers and concept, and the frame of
// people and ship around it. Built by process/cargo_records.py.
//
// The records are NOT in the ladings: inside them they add 67% to the corpus every
// visitor downloads. They sit in data/records/<volume>.json.gz, 140-400 KB each, and
// a volume is fetched the first time a reader opens a record in it, then kept for
// the session. Nothing is fetched for a reader who never opens one.
const CargoRecord = (() => {
    const cache = new Map();          // volume -> {ladings: {lading_id: {idx: record}}}
    const pending = new Map();        // volume -> in-flight promise
    const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

    // "4-19-A-0020" is volume IV-19: the lading id counts the volume in arabic.
    function volumeOf(ladingId) {
        const m = /^(\d+)-(\d+)/.exec(ladingId || '');
        return m && ROMAN[+m[1]] ? `${ROMAN[+m[1]]}-${m[2]}` : null;
    }

    function indexOf(cargoId) {
        const m = /-(\d{4})$/.exec(cargoId || '');
        return m ? String(+m[1] - 1) : null;   // the id counts from 1, the record from 0
    }

    async function volume(vol) {
        if (cache.has(vol)) return cache.get(vol);
        if (!pending.has(vol)) {
            pending.set(vol, _fetchGzippedJson(`data/records/${vol}.json.gz`)
                .then(doc => { cache.set(vol, doc); pending.delete(vol); return doc; })
                .catch(err => { pending.delete(vol); throw err; }));
        }
        return pending.get(vol);
    }

    async function forCargo(cargo) {
        const vol = volumeOf(cargo.lading_id), idx = indexOf(cargo.id);
        if (!vol || idx === null) return null;
        const doc = await volume(vol);
        return ((doc.ladings || {})[cargo.lading_id] || {})[idx] || null;
    }

    const esc = s => $('<div>').text(s == null ? '' : s).html();

    // An identifier is worth showing only if a reader can follow it: AAT numbers go
    // to Getty, Q-numbers to Wikidata.
    function idLink(c) {
        if (!c || !c.id) return '';
        const q = /^Q\d+$/.test(c.id);
        const href = q ? `https://www.wikidata.org/entity/${c.id}`
                       : `https://vocab.getty.edu/aat/${c.id}`;
        const note = c.broader ? ' (broader)' : c.match && c.match !== 'exact' ? ` (${esc(c.match)})` : '';
        return `<a href="${href}" target="_blank" rel="noopener" title="${q ? 'Wikidata' : 'Getty AAT'} ${esc(c.id)}">`
             + `${esc(c.label || c.id)}</a>${note}`;
    }

    function person(p) {
        if (!p) return '';
        const name = [p.forename, p.surname].filter(Boolean).join(' ');
        const status = (p.status || []).length ? ` <span class="cr-status">${esc(p.status.join(', '))}</span>` : '';
        const place = p.place && p.place.label ? ` <span class="cr-place">of ${esc(p.place.label)}</span>` : '';
        const from = p.from ? ` <span class="cr-from" title="named in the lading heading, not this cargo">(heading)</span>` : '';
        const inner = p.pid ? `<a href="entity.html?pid=${p.pid}">${esc(name)}</a>` : esc(name);
        return inner + status + place + from;
    }

    function render(record) {
        if (!record) return '<div class="cr-none">No record for this cargo.</div>';
        const f = record.frame || {};
        const frame = [
            f.merchant ? `<span class="cr-role">merchant</span> ${person(f.merchant)}` : '',
            f.master ? `<span class="cr-role">master</span> ${person(f.master)}` : '',
            f.ship ? `<span class="cr-role">ship</span> ${esc(f.ship.name)}`
                     + (f.ship.from ? ' <span class="cr-from">(heading)</span>' : '') : '',
        ].filter(Boolean).join(' · ');

        const rows = (record.rows || []).map(r => {
            const qty = r.quantity ? esc(r.quantity.value != null ? r.quantity.value : r.quantity.w) : '';
            const measure = r.measure ? esc(r.measure.key || r.measure.w) : '<span class="cr-none">counted</span>';
            const extra = (r.also || []).map(a =>
                `<span class="cr-extra">also ${esc((a.quantity || {}).w || '')} ${esc((a.measure || {}).w || '')}</span>`).join(' ');
            const quals = (r.qualifiers || []).map(q => q.geo
                ? `<span class="cr-qual cr-geo" title="a place the goods are named with — not proof of origin (${esc(q.geo.id)})">${esc(q.w)}</span>`
                : `<span class="cr-qual">${esc(q.w)}</span>`).join(' ');
            const concept = r.concept || {};
            const ids = (concept.aat || []).map(idLink).filter(Boolean).join(', ')
                || '<span class="cr-none">no identifier</span>';
            const materials = (concept.materials || []).length
                ? `<div class="cr-materials">material: ${(concept.materials || []).map(idLink).join(', ')}</div>` : '';
            return `<tr>
                <td class="cr-goods">${esc((r.span || {}).w)}${quals ? `<div class="cr-quals">${quals}</div>` : ''}</td>
                <td class="cr-qty">${qty}${extra ? `<div>${extra}</div>` : ''}</td>
                <td class="cr-measure">${measure}</td>
                <td class="cr-concept">${esc(concept.label || concept.key || '—')}
                    <div class="cr-ids">${ids}</div>${materials}</td>
            </tr>`;
        }).join('');

        return `<div class="cargo-record">
            ${frame ? `<div class="cr-frame">${frame}</div>` : ''}
            ${rows ? `<table class="cr-rows"><thead><tr><th>goods</th><th>quantity</th><th>measure</th><th>concept</th></tr></thead><tbody>${rows}</tbody></table>`
                   : '<div class="cr-none">No commodity rows were read in this cargo.</div>'}
            <div class="cr-foot">read from the ${esc(record.from || 'published spans')}; a place on goods is recorded as
                <em>undecided</em> until a curator says whether it is the origin</div>
        </div>`;
    }

    return {forCargo, render, volumeOf, indexOf};
})();
