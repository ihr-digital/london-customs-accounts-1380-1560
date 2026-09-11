// Shared resolver for the canonical qualifier store (docs/data/qualifiers.json).
//
// One place for every consumer (main index, public glossary, editors) to load
// the canonical store once and resolve a qualifier — whether it arrives as a
// migrated entry.q item ({ref}/{tokens}/{raw}/legacy {t}) or as a cargo
// annotation ({canonical, text}) — to its label, gloss, forms, AAT and geo.
(function (global) {
  'use strict';

  let _store = null;      // { key: {label, lang, forms[], gloss, aat?, geo?} }
  let _index = null;      // norm(form|label|key) -> key
  let _loading = null;

  function norm(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function load(url) {
    if (_store) return _store;
    if (_loading) return _loading;
    _loading = (async () => {
      const res = await fetch(url || 'data/qualifiers.json');
      if (!res.ok) throw new Error('Failed to load qualifiers.json: ' + res.status);
      const j = await res.json();
      _store = (j && j.canonicals) || {};
      _index = Object.create(null);
      for (const [key, c] of Object.entries(_store)) {
        _index[norm(key)] = key;
        if (c.label) _index[norm(c.label)] = key;
        for (const f of (c.forms || [])) {
          const n = norm(f);
          if (!(n in _index)) _index[n] = key;
        }
      }
      return _store;
    })();
    return _loading;
  }

  function isLoaded() { return !!_store; }

  // Resolve a key / canonical-label / surface form to a store record (+key).
  function getCanonical(ref) {
    if (!_store || ref == null) return null;
    if (typeof ref === 'string' && _store[ref]) return Object.assign({ key: ref }, _store[ref]);
    const k = _index && _index[norm(ref)];
    return k ? Object.assign({ key: k }, _store[k]) : null;
  }

  // Resolve an entry.q item to a display object.
  //   {ref}    -> the canonical
  //   {tokens} -> ordered tokens ({ref} resolved, {lit} verbatim)
  //   {raw}    -> un-lemmatised survivor
  //   {t}      -> legacy pipe-delimited text (pre-migration)
  function resolveQ(q) {
    if (!q) return null;
    if (q.ref) {
      const c = getCanonical(q.ref);
      return c
        ? { kind: 'ref', label: c.label, gloss: c.gloss, forms: c.forms, aat: c.aat, geo: c.geo, canonical: c }
        : { kind: 'ref', label: q.ref, forms: [q.ref] };
    }
    if (Array.isArray(q.tokens)) {
      const parts = q.tokens.map(tk => {
        if (tk.lit != null) return { lit: tk.lit };
        const c = getCanonical(tk.ref);
        return c ? { label: c.label, canonical: c } : { label: tk.ref || tk.raw || '' };
      });
      return { kind: 'tokens', label: parts.map(p => p.lit != null ? p.lit : p.label).join(' '), parts: parts };
    }
    if (q.raw != null) return { kind: 'raw', label: q.raw, forms: [q.raw], gloss: q.d };
    if (q.t != null) {
      const first = String(q.t).split('|')[0];
      const c = getCanonical(first);
      return { kind: 'legacy', label: (c && c.label) || first, gloss: (c && c.gloss) || q.d,
               forms: String(q.t).split('|'), aat: c && c.aat, geo: c && c.geo, canonical: c || null };
    }
    return null;
  }

  function aatLink(aat) {
    if (!aat || !aat.specific) return '';
    return `<a href="https://vocab.getty.edu/aat/${aat.specific}" target="_blank" rel="noopener" ` +
           `class="qual-aat-link" title="Getty AAT ${aat.specific}">${aat.label || 'AAT'}</a>`;
  }

  function geoLink(geo) {
    if (!geo) return '';
    const url = geo.wikidata || (geo.id ? 'https://www.wikidata.org/entity/' + geo.id : '');
    const pt = Array.isArray(geo.point) ? ` <span class="qual-geo-pt">(${geo.point[1].toFixed(2)}, ${geo.point[0].toFixed(2)})</span>` : '';
    const label = geo.label || 'place';
    return url
      ? `<a href="${url}" target="_blank" rel="noopener" class="qual-geo-link" title="${geo.id || ''}">${label}</a>${pt}`
      : `${label}${pt}`;
  }

  // Rich popover HTML for a cargo-annotation qualifier {canonical, text, ...}.
  function popoverHTML(q) {
    const c = getCanonical(q && (q.canonical || q.text));
    const name = (c && c.label) || (q && (q.canonical || q.text)) || '';
    let html = `<div class="qual-pop"><div class="qual-pop-name">${escapeHtml(name)}</div>`;
    if (c && c.gloss) html += `<div class="qual-pop-gloss">${escapeHtml(c.gloss)}</div>`;
    const links = [];
    if (c && c.aat) links.push(aatLink(c.aat));
    if (c && c.geo) links.push(geoLink(c.geo));
    if (links.length) html += `<div class="qual-pop-links">${links.join(' · ')}</div>`;
    if (q && q.text && c && norm(q.text) !== norm(c.label))
      html += `<div class="qual-pop-form">as <em>${escapeHtml(q.text)}</em></div>`;
    if (q && q.fuzzy) html += `<div class="qual-pop-fuzzy">≈ fuzzy ${(+q.fuzzy).toFixed(2)}</div>`;
    return html + '</div>';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  global.MLCAQualifiers = { load, isLoaded, getCanonical, resolveQ, popoverHTML, aatLink, geoLink, norm };
})(typeof window !== 'undefined' ? window : this);
