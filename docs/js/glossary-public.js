/**
 * Public-Facing Historical Commodity Glossary
 * Read-only dictionary-style presentation with polysemy support
 */

// ============================================================================
// GitHub Repository Constants
// ============================================================================

const REPO_OWNER = 'docuracy';
const REPO_NAME = 'London_Customs_Accounts';

// ============================================================================
// State Management
// ============================================================================

const state = {
    glossary: null,         // full JSON
    allCategories: [],
    currentFilter: { search: '', categories: [], letter: '' },
    displayedEntries: []
};

// Expose state globally for visualisations
window.state = state;

// ============================================================================
// Data Loading
// ============================================================================

async function loadGlossary() {
    try {
        const res = await fetch('data/glossary_data.json');
        if (!res.ok) throw new Error('Failed to load glossary JSON');

        const data = await res.json();

        state.glossary = data;

        // Canonical qualifier store (entry.q now references it via ref/tokens/raw)
        try { if (window.MLCAQualifiers) await MLCAQualifiers.load(); }
        catch (e) { console.warn('qualifier store load failed:', e); }

        // AAT label + scope-note lookup for granular concept display (hover).
        // Compact side-file of only the AAT ids the glossary references.
        try {
            const nres = await fetch('data/aat_glossary_notes.json');
            state.aatNotes = nres.ok ? await nres.json() : {};
        } catch (_) { state.aatNotes = {}; }

        // Groupings (entry.groups) — AAT-derived subject groupings that supersede
        // the legacy `c` categories. From metadata if available, else computed.
        if (data.metadata && Array.isArray(data.metadata.groups) && data.metadata.groups.length) {
            state.allCategories = data.metadata.groups.slice().sort();
        } else {
            const set = new Set();
            Object.values(data.entries || {}).forEach(e => { if (Array.isArray(e.groups)) e.groups.forEach(x => set.add(x)); });
            state.allCategories = Array.from(set).sort();
        }

        initializeInterface();
        // handle URL hash if present
        handleUrlHashOnLoad();
        displayGlossary();

        // Initialise visualisations if tab is already open
        if (typeof window.initialiseVisualisationsTab === 'function') {
            const visTab = document.getElementById('tab-visualisations');
            if (visTab && visTab.classList.contains('active')) {
                window.initialiseVisualisationsTab();
            }
        }

        // Check version sync
        checkVersionSync();
    } catch (err) {
        // Error loading glossary
        showError('Could not load glossary data.');
    }
}

// ============================================================================
// Interface Initialization
// ============================================================================

function initializeInterface() {
    const cat = document.getElementById('category-filter');
    if (cat) {
        // clear existing options
        cat.innerHTML = '';
        state.allCategories.forEach(c => {
            const opt = document.createElement('option'); opt.value = c; opt.textContent = c; cat.appendChild(opt);
        });
    }

    const search = document.getElementById('search-input');
    if (search) search.addEventListener('input', handleSearch);

    // exact-search checkbox already present in DOM; no extra wiring needed except update on hash
}

// ============================================================================
// Rendering Helpers
// ============================================================================

function escapeHtml(s){ const d=document.createElement('div'); d.textContent = s; return d.innerHTML; }
function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function highlightText(text, term){
    if(!term||term.length<2) return text;
    const re = new RegExp('(' + escapeRegex(term) + ')','gi');
    return text.replace(re, '<span class="highlight">$1</span>');
}

function getHeadwordFromEntry(entry, fallbackKey){
    if(!entry) return fallbackKey || '';
    if(Array.isArray(entry.f) && entry.f.length){
        const head = entry.f.find(x => x && (x.w === 1 || x.w === '1' || x.w === true));
        if(head) return String(head.t || head);
        return String(entry.f[0].t || entry.f[0]);
    }
    return fallbackKey || '';
}

function getFormTexts(entry){
    if(!entry || !Array.isArray(entry.f)) return [];
    return entry.f.map(x => (typeof x === 'string' ? x : (x.t || ''))).filter(Boolean);
}

function getFormPhonetics(entry){
    if(!entry || !Array.isArray(entry.f)) return [];
    return entry.f.map(x => (typeof x === 'string' ? phonetic(x) : (x.p || phonetic(x.t || ''))));
}

// lightweight phonetic normalisation (browser-side)
function phonetic(word){
    if(!word) return '';
    let s = String(word).toLowerCase().trim();
    s = s.replace(/[^a-z]/g,'');
    s = s.replace(/[uy]/g,'v');
    s = s.replace(/[ij]/g,'i');
    s = s.replace(/gh/g,'');
    s = s.replace(/ph/g,'f');
    s = s.replace(/ck/g,'k');
    s = s.replace(/c([eiy])/g,'s$1');
    s = s.replace(/c/g,'k');
    s = s.replace(/qu/g,'kw');
    s = s.replace(/x/g,'ks');
    s = s.replace(/th/g,'t');
    s = s.replace(/ae/g,'e');
    s = s.replace(/oe/g,'e');
    s = s.replace(/ou/g,'o');
    s = s.replace(/([a-z])\1+/g,'$1');
    s = s.replace(/e$/,'');
    return s;
}

// ============================================================================
// A–Z Bar
// ============================================================================

function renderAZBar(entries){
    const az = document.getElementById('az-bar');
    if(!az) return;

    // Always get all possible letters from all entries, not just filtered ones
    const allEntries = state.glossary && state.glossary.entries ?
        Object.entries(state.glossary.entries).map(([k,e])=>({key:k,entry:e})) : [];

    const letters = new Set();
    allEntries.forEach(it => {
        const hw = getHeadwordFromEntry(it.entry, it.key)||it.key||'';
        const first = String(hw).charAt(0).toUpperCase();
        if(/^[A-Z]$/.test(first)) letters.add(first);
    });

    const list = Array.from(letters).sort();

    // Show A-Z bar if we have multiple letters, regardless of current filter
    if(list.length<=1){
        az.style.display='none';
        az.innerHTML='';
        return;
    }

    const cur = state.currentFilter.letter||'';
    az.innerHTML = '<div class="az-label">Filter by initial letter:</div><div class="az-inner">' +
        list.map(l=>`<button class="az-letter${l===cur?' active':''}" onclick="filterByLetter('${l}')" aria-label="Filter by ${l}">${l}</button>`).join(' ') +
        ' <button class="az-clear" onclick="filterByLetter(\'\')">Clear</button></div>';
    az.style.display='';
}

function filterByLetter(letter){
    state.currentFilter.letter = letter||'';
    if(letter){
        state.currentFilter.search='';
        const s=document.getElementById('search-input');
        if(s) s.value='';
        // Clear exact match checkbox when clicking a letter
        const ex=document.getElementById('exact-search');
        if(ex) ex.checked = false;
    }
    displayGlossary();
}

// ============================================================================
// Tooltip for Form Date Ranges (Lazy)
// ============================================================================

function computeFormTooltip(el){
    if(!el || el.getAttribute('data-tooltip')) return;
    try{
        const s = el.getAttribute('data-source-ids');
        const ids = s? JSON.parse(s): [];
        if(!ids || ids.length===0 || !state.glossary || !state.glossary.metadata || !state.glossary.metadata.source_registry) {
            el.setAttribute('data-tooltip', 'no attestations noted');
            return;
        }
        const regs = state.glossary.metadata.source_registry.sources || [];
        let min=Infinity,max=-Infinity;
        ids.forEach(i=>{ const src = regs[i]; if(src){ if(src.date_from && src.date_from<min) min=src.date_from; if(src.date_to && src.date_to>max) max=src.date_to; } });
        if(min!==Infinity && max!==-Infinity) {
            el.setAttribute('data-tooltip', `attested ${min}–${max}`);
        } else {
            el.setAttribute('data-tooltip', 'no attestations noted');
        }
    }catch(e){
        console.error('tooltip',e);
        el.setAttribute('data-tooltip', 'error computing dates');
    }
}

// ============================================================================
// Citation Modal + Clipboard
// ============================================================================

function showCitation(key){
    const entry = state.glossary.entries[key]; if(!entry) return;
    const hw = getHeadwordFromEntry(entry,key) || key;
    const base = window.location.origin + window.location.pathname;
    const url = `${base}#${encodeURIComponent(hw)}`;
    // aggregate date range
    let dateText='';
    try{
        const ids = new Set();
        (entry.f||[]).forEach(f=>{ if(f && Array.isArray(f.s)) f.s.forEach(i=>ids.add(i)); });
        const regs = (state.glossary.metadata && state.glossary.metadata.source_registry && state.glossary.metadata.source_registry.sources) || [];
        let min=Infinity,max=-Infinity; ids.forEach(i=>{ const s=regs[i]; if(s){ if(s.date_from && s.date_from<min) min=s.date_from; if(s.date_to && s.date_to>max) max=s.date_to; } });
        if(min!==Infinity && max!==-Infinity) dateText = ` (attested ${min}–${max})`;
    }catch(e){/*ignore*/}
    const today = new Date(); const access = today.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
    const citation = `"${hw}"${dateText}, Historical Commodity Glossary, accessed ${access}, ${url}`;

    const modal = document.createElement('div'); modal.className='citation-modal';
    modal.innerHTML = `
        <div class="citation-modal-content">
            <div class="citation-modal-header"><h3>Citation</h3><button class="citation-close" aria-label="Close">×</button></div>
            <div class="citation-modal-body">
                <p class="citation-text">${escapeHtml(citation)}</p>
                <div class="citation-actions">
                    <button class="btn-copy" id="citation-copy-btn">Copy to Clipboard</button>
                    <button class="btn-secondary" id="citation-close-btn">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.citation-close').addEventListener('click',()=>modal.remove());
    modal.querySelector('#citation-close-btn').addEventListener('click',()=>modal.remove());
    modal.querySelector('#citation-copy-btn').addEventListener('click', (e)=>{ copyCitation(citation, e.target); });
}

function copyCitation(text, btn){
    if(!navigator.clipboard){ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove(); showCopyFeedback(btn); return; }
    navigator.clipboard.writeText(text).then(()=>showCopyFeedback(btn)).catch(err=>{ console.error('copy',err); showCopyFeedback(btn,false); });
}

function showCopyFeedback(btn, success=true){ if(btn){ const orig=btn.textContent; btn.textContent = success?'Copied!':'Failed'; setTimeout(()=>btn.textContent=orig,2000);} const fb=document.createElement('div'); fb.className='copy-feedback'; fb.textContent = success?'Citation copied to clipboard':'Failed to copy citation'; document.body.appendChild(fb); setTimeout(()=>fb.remove(),2000); }

// ============================================================================
// Rendering Entries
// ============================================================================

// Render one granular AAT/Wikidata concept chip with match-type indicator and a
// hover tooltip carrying the Getty scope note (+ any curator note).
function renderAatChip(a){
    const id = a.id || '';
    const isWd = a.source === 'wikidata' || /^Q\d+$/i.test(id);
    const note = (state.aatNotes && state.aatNotes[id]) || null;
    const label = a.label || (note && note.label) || id;

    let sym, parts = [];
    if (a.broader) { sym = '≈'; parts.push('broader'); }
    else if (a.match === 'close') { sym = '≊'; parts.push('close'); }
    else { sym = '='; parts.push('exact'); }
    if (a.uncertain) { sym += '?'; parts.push('uncertain'); }
    if (a.suggested) { parts.push('suggested'); }
    const mt = parts.join(', ');

    const titleParts = [];
    if (note && note.scope) titleParts.push(note.scope);
    titleParts.push('Match: ' + mt + (isWd ? ' (Wikidata)' : ''));
    if (a.note) titleParts.push('Note: ' + a.note);
    // attribute-safe: escapeHtml does not escape quotes
    const title = escapeHtml(titleParts.join('\n\n')).replace(/"/g, '&quot;');

    const url = isWd
        ? `https://www.wikidata.org/wiki/${escapeHtml(id)}`
        : `https://vocab.getty.edu/aat/${escapeHtml(id)}`;
    const cls = ['aat-chip', 'aat-' + (a.broader ? 'broader' : (a.match === 'close' ? 'close' : 'exact'))];
    if (a.uncertain) cls.push('aat-uncertain');
    if (a.suggested) cls.push('aat-suggested');
    const badge = isWd ? '<span class="aat-src">W</span>' : '';
    return `<a href="${url}" target="_blank" rel="noopener" class="${cls.join(' ')}" title="${title}">`
        + `${badge}<span class="aat-sym">${sym}</span> ${escapeHtml(label)}</a>`;
}

function renderEntry(item, senseNumber){
    const entry = item.entry;
    const key = item.key;
    const rawSearch = (state.currentFilter.search||'').trim();
    const searchTerm = rawSearch.toLowerCase();
    const exact = document.getElementById('exact-search')?.checked || false;
    const head = escapeHtml(getHeadwordFromEntry(entry,key) || key);
    const safeKey = String(key).replace(/'/g,"\\'");

    let html = `<div class="entry">`;

    // Compute attested date range
    let attestedHtml = '';
    try {
        const ids = new Set();
        (entry.f||[]).forEach(f=>{ if(f && Array.isArray(f.s)) f.s.forEach(i=>ids.add(i)); });
        if(ids.size && state.glossary && state.glossary.metadata && state.glossary.metadata.source_registry && Array.isArray(state.glossary.metadata.source_registry.sources)){
            const regs = state.glossary.metadata.source_registry.sources;
            let min=Infinity, max=-Infinity;
            ids.forEach(i=>{ const s=regs[i]; if(s){ if(s.date_from && s.date_from<min) min=s.date_from; if(s.date_to && s.date_to>max) max=s.date_to; } });
            if(min!==Infinity && max!==-Infinity) {
                attestedHtml = `<span class="attested-dates">attested ${min}–${max}</span>`;
            } else {
                attestedHtml = `<span class="attested-dates">no attestations noted</span>`;
            }
        } else {
            attestedHtml = `<span class="attested-dates">no attestations noted</span>`;
        }
    } catch(e) {
        attestedHtml = `<span class="attested-dates">no attestations noted</span>`;
    }

    // Headword with optional number, attested dates, and citation button
    html += `<div class="entry-headword">`;
    html += `<div class="headword-main">`;
    if (senseNumber !== null) {
        html += `<span class="entry-number">${senseNumber}.</span>`;
    }
    // For exact searches, don't highlight the headword
    const hwDisplay = exact ? head : (searchTerm && searchTerm.length>=2 ? highlightText(head, searchTerm) : head);
    html += hwDisplay;
    html += attestedHtml;
    html += `</div>`;
    html += `<button class="btn-citation" onclick="showCitation('${safeKey}')">Citation</button>`;
    html += `</div>`;

    // Forms (include headword so its attestation dates can be probed separately)
    const forms = getFormTexts(entry);
    if(forms.length){
        html+=`<div class="entry-forms"><span class="forms-label">Forms:</span><div class="forms-list">`;
        forms.forEach(f=>{
            let sids=[];
            if(Array.isArray(entry.f)){
                const m = entry.f.find(ff => ( (typeof ff==='string')? ff : (ff.t||'') )===f);
                if(m && Array.isArray(m.s)) sids = m.s;
            }
            const sjson = JSON.stringify(sids||[]);
            // Don't highlight forms for exact searches
            const formDisplay = (exact || !searchTerm || searchTerm.length<2) ? escapeHtml(f) : highlightText(escapeHtml(f), searchTerm);
            html += `<span class="form-badge" data-source-ids='${sjson}' onmouseenter="computeFormTooltip(this)">${formDisplay}</span>`;
        });
        html += `</div></div>`;
    }

    // Description
    const d = entry.d || '';
    if(d && String(d).trim()){
        const parts = String(d).split(' | ').map(x=>x.trim()).filter(Boolean);
        html += `<div class="entry-description">`;
        if(parts.length>1){
            parts.forEach((p,i)=>{
                html += `<div style="margin-bottom: 8px;"><strong>${String.fromCharCode(97+i)})</strong> `;
                // Don't highlight description for exact searches
                const descDisplay = (exact || !searchTerm || searchTerm.length<2) ? escapeHtml(p) : highlightText(escapeHtml(p), searchTerm);
                html += descDisplay;
                html += `</div>`;
            });
        } else {
            // Don't highlight description for exact searches
            const descDisplay = (exact || !searchTerm || searchTerm.length<2) ? escapeHtml(d) : highlightText(escapeHtml(d), searchTerm);
            html += descDisplay;
        }
        html += `</div>`;
    } else {
        html += `<div class="entry-description placeholder">No description available</div>`;
    }

    // Groupings (AAT-derived; supersede legacy categories)
    const cats = Array.isArray(entry.groups)? entry.groups : [];
    if(cats.length){
        html += `<div class="entry-categories"><span class="categories-label">Groupings:</span><div class="categories-list">`;
        cats.forEach(c=>{
            html += `<span class="category-badge">${escapeHtml(c)}</span>`;
        });
        html += `</div></div>`;
    } else {
        html += `<div class="entry-categories"><span class="categories-label">Groupings:</span><div class="categories-placeholder">No groupings assigned</div></div>`;
    }

    // Granular AAT concepts (commodity types) with scope notes on hover and a
    // match-type indicator (exact / close ≊ / broader ≈ / uncertain ?).
    const aats = Array.isArray(entry.aat)? entry.aat : [];
    if(aats.length){
        html += `<div class="entry-aat"><span class="categories-label">AAT concepts:</span><div class="aat-list">`;
        aats.forEach(a=>{ html += renderAatChip(a); });
        html += `</div></div>`;
    }
    // Materials (also AAT concepts)
    const mats = Array.isArray(entry.materials)? entry.materials : [];
    if(mats.length){
        html += `<div class="entry-aat"><span class="categories-label">Materials:</span><div class="aat-list">`;
        mats.forEach(m=>{ html += renderAatChip({id:m.id, label:m.label}); });
        html += `</div></div>`;
    }

    // Qualifiers
    const qs = Array.isArray(entry.q)? entry.q : [];
    if(qs.length){
        const qid = `qualifiers-${key.replace(/[^a-z0-9]/gi,'-')}`;
        const qualLabel = qs.length === 1 ? 'Qualifier' : 'Qualifiers';
        html += `<div class="qualifiers-container"><div class="qualifiers-heading">${qualLabel} (${qs.length}): <button class="qualifiers-toggle" onclick="toggleQualifiers('${qid}')" aria-expanded="false" aria-controls="${qid}">Show</button></div><div class="entry-qualifiers" id="${qid}">`;

        // AAT type badge lookup for public display
        const _QT = {
            '300010358': '🟤', '300056130': '🔵', '300266035': '📏',
            '300179462': '⭐', '300257285': '🔧', '300417459': '📍'
        };

        qs.forEach(q=>{
            // Resolve the qualifier through the canonical store
            // (entry.q now references it via ref/tokens/raw; legacy {t} still works).
            const r = (window.MLCAQualifiers && MLCAQualifiers.resolveQ(q)) || null;
            const aat = r && r.aat;
            const semantic = aat && aat.semantic;
            const typeBadge = semantic && _QT[semantic] ? `<span class="qualifier-type-icon" title="AAT ${semantic}">${_QT[semantic]}</span> ` : '';
            html += `<div class="qualifier"><div class="qualifier-term">${typeBadge}`;

            // Canonical label, with attested variant forms in parentheses
            const label = (r && r.label) || (q.t || '').split('|')[0] || '';
            const forms = (r && r.forms) || (q.t ? q.t.split('|') : []);
            const others = forms.filter(f => MLCAQualifiers && MLCAQualifiers.norm(f) !== MLCAQualifiers.norm(label));
            const qualTermText = others.length ? `${label} (${others.slice(0, 8).join(', ')}${others.length > 8 ? '…' : ''})` : label;

            // Don't highlight qualifiers for exact searches
            const qualTermDisplay = (exact || !searchTerm || searchTerm.length<2) ? escapeHtml(qualTermText) : highlightText(escapeHtml(qualTermText), searchTerm);
            html += qualTermDisplay;
            if (aat && aat.specific) html += ` ${MLCAQualifiers.aatLink(aat)}`;
            else if (q.a) html += ` <a href="https://vocab.getty.edu/aat/${escapeHtml(q.a)}" target="_blank" class="qualifier-aat-link" title="View AAT concept">[AAT]</a>`;
            if (r && r.geo) html += ` <span class="qualifier-geo">${MLCAQualifiers.geoLink(r.geo)}</span>`;
            html += `</div>`;
            const desc = (q.d) || (r && r.gloss) || '';
            if(desc){
                html += `<div class="qualifier-description">`;
                // Don't highlight qualifier descriptions for exact searches
                const qualDescDisplay = (exact || !searchTerm || searchTerm.length<2) ? escapeHtml(desc) : highlightText(escapeHtml(desc), searchTerm);
                html += qualDescDisplay;
                html += `</div>`;
            }
            html += `</div>`;
        });
        html += `</div></div>`;
    }

    // Sources
    if(entry.sources && entry.sources.length > 0) {
        html += `<div class="entry-sources">Sources: ${escapeHtml(entry.sources.join(', '))}</div>`;
    }

    html += `</div>`;
    return html;
}

function renderPolysemyGroup(base, items){ const baseHw = escapeHtml(base); let out = `<div class="polysemy-group"><h3 class="poly-headword">${baseHw}</h3>`; items.forEach((it,idx)=>{ out += `<div class="poly-sense">${renderEntry(it, idx+1)}</div>`; }); out += `</div>`; return out; }

// ============================================================================
// Filtering & Display
// ============================================================================

function getFilteredEntries(){
    if(!state.glossary || !state.glossary.entries) return [];
    const raw = (state.currentFilter.search||'').trim(); const searchTerm = raw.toLowerCase(); const categories = state.currentFilter.categories || []; const letter = state.currentFilter.letter||''; const exact = document.getElementById('exact-search')?.checked || false;
    let arr = Object.entries(state.glossary.entries).map(([k,e])=>({key:k,entry:e}));
    if(searchTerm){ const searchPhon = exact? null : phonetic(searchTerm); arr = arr.filter(({key,entry})=>{
        const hw = (getHeadwordFromEntry(entry,key)||key).toLowerCase();
        if(exact) return hw===searchTerm;
        if(hw.includes(searchTerm)) return true;
        const forms = getFormTexts(entry).map(f=> (f||'').toLowerCase()); if(forms.some(f=>f.includes(searchTerm))) return true;
        if(searchPhon){ const phs = getFormPhonetics(entry); if(phs.some(p=>p && p.includes(searchPhon))) return true; }
        if(entry.d && String(entry.d).toLowerCase().includes(searchTerm)) return true;
        const qs = Array.isArray(entry.q)? entry.q: []; for(const q of qs){ const r=(window.MLCAQualifiers&&MLCAQualifiers.resolveQ(q))||null; const hay=((r&&r.label)||q.t||'')+' '+((r&&(r.forms||[]).join(' '))||'')+' '+(q.d||(r&&r.gloss)||''); if(hay.toLowerCase().includes(searchTerm)) return true; }
        return false;
    }); }
    if(categories.length > 0) arr = arr.filter(({entry})=> Array.isArray(entry.groups) && categories.some(cat => entry.groups.includes(cat)));
    if(letter) arr = arr.filter(({key,entry})=>{ const hw=(getHeadwordFromEntry(entry,key)||key).toString(); return hw.charAt(0).toUpperCase()===letter; });
    arr.sort((a,b)=>{ const A=(getHeadwordFromEntry(a.entry,a.key)||a.key).toLowerCase(); const B=(getHeadwordFromEntry(b.entry,b.key)||b.key).toLowerCase(); return A.localeCompare(B); });
    return arr;
}

function displayGlossary(){ const container = document.getElementById('glossary-content'); const entries = getFilteredEntries(); state.displayedEntries = entries; renderAZBar(entries); if(!entries.length){ container.innerHTML = `<div class="no-results"><div class="no-results-icon">📖</div><h3>No entries found</h3><p>Try adjusting your search or filter criteria.</p></div>`; updateResultsCount(); return; }
    // group by base headword
    const groups = {}; entries.forEach(it=>{ const hw = (getHeadwordFromEntry(it.entry,it.key)||it.key).toLowerCase().replace(/_\d+$/,''); if(!groups[hw]) groups[hw]=[]; groups[hw].push(it); });
    let html = ''; Object.keys(groups).forEach(base=>{ const group = groups[base]; if(group.length===1) html += renderEntry(group[0], null); else html += renderPolysemyGroup(base, group); });
    container.innerHTML = html; updateResultsCount(); }

// ============================================================================
// Search/Controls
// ============================================================================

function handleSearch(){ const s = document.getElementById('search-input'); state.currentFilter.search = s? s.value.trim() : ''; const clearBtn = document.getElementById('search-clear'); if(clearBtn) clearBtn.style.display = state.currentFilter.search ? 'block':'none'; displayGlossary(); }
function clearSearch(){ const s=document.getElementById('search-input'); if(s) s.value=''; state.currentFilter.search=''; const clearBtn=document.getElementById('search-clear'); if(clearBtn) clearBtn.style.display='none'; displayGlossary(); }
function applyFilters(){
    const cat = document.getElementById('category-filter');
    state.currentFilter.categories = [];
    if(cat) {
        const selected = Array.from(cat.selectedOptions).map(opt => opt.value);
        state.currentFilter.categories = selected;
    }
    const clearBtn = document.getElementById('clear-grouping-filter');
    if(clearBtn) clearBtn.hidden = state.currentFilter.categories.length === 0;
    displayGlossary();
}
function clearGroupingFilter(){
    const cat = document.getElementById('category-filter');
    if(cat) Array.from(cat.options).forEach(opt => { opt.selected = false; });
    applyFilters();
}
function updateResultsCount(){ const el=document.getElementById('results-count'); const total = state.glossary? Object.keys(state.glossary.entries||{}).length : 0; const shown = state.displayedEntries.length || 0; el.textContent = (state.currentFilter.search||state.currentFilter.categories.length>0) ? `Showing ${shown} of ${total} entries` : `${total} entries`; }

// ============================================================================
// URL Hash Handling
// ============================================================================

function handleUrlHashOnLoad(){ const h = window.location.hash.substring(1); if(!h) return; try{ const decoded = decodeURIComponent(h); const s=document.getElementById('search-input'); const ex=document.getElementById('exact-search'); if(s) s.value = decoded; if(ex) ex.checked = true; state.currentFilter.search = decoded; }catch(e){console.warn('hash decode',e);} }

// ============================================================================
// Qualifiers Toggle
// ============================================================================

function toggleQualifiers(id){ const el=document.getElementById(id); const btn=event.target; if(!el) return; const expanded = el.classList.contains('expanded'); if(expanded){ el.classList.remove('expanded'); btn.textContent='Show'; btn.setAttribute('aria-expanded','false'); } else { el.classList.add('expanded'); btn.textContent='Hide'; btn.setAttribute('aria-expanded','true'); } }

// ============================================================================
// Error / Init
// ============================================================================

function showError(msg){ const c=document.getElementById('glossary-content'); if(c) c.innerHTML = `<div class="no-results"><div class="no-results-icon">⚠️</div><h3>Error</h3><p>${escapeHtml(msg)}</p></div>`; }

// ============================================================================
// Scroll to Top Button
// ============================================================================

function initScrollToTop() {
    // Create scroll-to-top button
    const btn = document.createElement('button');
    btn.className = 'scroll-to-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    // Show/hide button based on scroll position
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (window.pageYOffset > 300) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }, 100);
    });
}

function saveGlossaryToFile() {
    try {
        if (!state.glossary) {
            alert('No glossary data loaded');
            return;
        }

        // Create blob with glossary data
        const dataStr = JSON.stringify(state.glossary, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Get version from metadata (check both possible locations)
        let version = 'unknown';
        if (state.glossary.version) {
            version = state.glossary.version;
        } else if (state.glossary.metadata && state.glossary.metadata.version) {
            version = state.glossary.metadata.version;
        }

        // Filename format: lca_glossary_v<version>.json
        a.download = `lca_glossary_v${version}.json`;

        // Trigger download
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('Glossary saved to file');
    } catch (error) {
        console.error('Error saving glossary:', error);
        alert('Failed to save glossary: ' + error.message);
    }
}

function downloadFilteredCSV() {
    try {
        if (!state.glossary || !state.displayedEntries || state.displayedEntries.length === 0) {
            alert('No entries to download');
            return;
        }

        // CSV header
        const headers = ['Headword', 'URI', 'Forms', 'Groupings', 'Description', 'Qualifiers', 'Sources'];
        const rows = [headers];

        // Get source registry
        const sourceRegistry = state.glossary?.metadata?.source_registry?.sources || [];

        // Process each displayed entry
        state.displayedEntries.forEach(({key, entry}) => {
            const headword = getHeadwordFromEntry(entry, key) || key;
            const uri = 'https://w3id.org/mlca/glossary/' + key;

            // Get all forms
            const forms = getFormTexts(entry).join('; ');

            // Get groupings
            const categories = Array.isArray(entry.groups) ? entry.groups.join('; ') : '';

            // Get description
            const description = entry.d || '';

            // Get qualifiers
            let qualifiers = '';
            if (Array.isArray(entry.q) && entry.q.length > 0) {
                qualifiers = entry.q.map(q => {
                    const r = (window.MLCAQualifiers && MLCAQualifiers.resolveQ(q)) || null;
                    const terms = (r && r.label) || (q.t || '');
                    const desc = q.d || (r && r.gloss) || '';
                    return desc ? `${terms}: ${desc}` : terms;
                }).join('; ');
            }

            // Get sources - collect all unique source IDs from forms
            const sourceIds = new Set();
            if (Array.isArray(entry.f)) {
                entry.f.forEach(form => {
                    if (form.s && Array.isArray(form.s)) {
                        form.s.forEach(id => sourceIds.add(id));
                    }
                });
            }

            // Map source IDs to source labels
            const sources = Array.from(sourceIds)
                .map(id => {
                    const src = sourceRegistry[id];
                    if (!src) return null;
                    return src.label || `Source ${id}`;
                })
                .filter(Boolean)
                .join('; ');

            // Escape CSV fields (wrap in quotes if they contain commas, quotes, or newlines)
            const escapeCSV = (field) => {
                const str = String(field || '');
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            };

            rows.push([
                escapeCSV(headword),
                escapeCSV(uri),
                escapeCSV(forms),
                escapeCSV(categories),
                escapeCSV(description),
                escapeCSV(qualifiers),
                escapeCSV(sources)
            ]);
        });

        // Convert to CSV string
        const csvContent = rows.map(row => row.join(',')).join('\n');

        // Create blob and download
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Generate filename with timestamp and filter info
        const timestamp = new Date().toISOString().split('T')[0];
        let filename = `glossary_${timestamp}`;
        if (state.currentFilter.search) {
            filename += `_search`;
        }
        if (state.currentFilter.categories.length > 0) {
            filename += `_filtered`;
        }
        filename += '.csv';

        a.download = filename;

        // Trigger download
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`Downloaded ${state.displayedEntries.length} entries as CSV`);
    } catch (error) {
        console.error('Error downloading CSV:', error);
        alert('Failed to download CSV: ' + error.message);
    }
}

async function checkVersionSync() {
    try {
        const localVersion = state.glossary?.metadata?.version;
        if (!localVersion) {
            console.log('No version info, skipping version check');
            return;
        }

        // Fetch latest version from Pages with cache-busting
        const cacheBuster = new Date().getTime();
        const response = await fetch(`data/glossary_data.json?_=${cacheBuster}`);
        if (!response.ok) return;

        const remoteData = await response.json();
        const remoteVersion = remoteData.metadata?.version;

        if (remoteVersion && remoteVersion !== localVersion) {
            if (confirm(`A newer version of the glossary is available (${remoteVersion}). Your current version is ${localVersion}. Reload page to update?`)) {
                location.reload(true);
            }
        }
    } catch (error) {
        console.error('Error checking version sync:', error);
    }
}

// init
document.addEventListener('DOMContentLoaded', ()=>{
    loadGlossary();
    initScrollToTop();
});
