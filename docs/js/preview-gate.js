// ---------------------------------------------------------------------------
// Preview gate.
//
// The site is public so that the advisory board and collaborators can assess
// it, and it carries transcriptions and derived data whose rights are not yet
// settled. Anyone arriving should be told that before they read, quote or
// redistribute any of it -- so the gate blocks the page until it is
// acknowledged, rather than sitting in a banner that scrolls away.
//
// It does not block the load. The scripts behind it keep running, so the data
// is ready by the time the gate is dismissed.
//
// The acknowledgement is remembered per browser, keyed on the text: change the
// terms and everyone is asked again, which is the point of versioning it.
// ---------------------------------------------------------------------------
(function () {
  const VERSION = '2026-09-11';
  const KEY = 'lca_preview_ack_' + VERSION;

  try {
    if (localStorage.getItem(KEY)) return;
  } catch (e) {
    /* private mode or blocked storage: show the gate every time, which is the
       safe direction to fail in. */
  }

  const CSS = `
  .pg-veil{position:fixed;inset:0;z-index:2147483647;background:rgba(18,16,14,.72);
    backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;
    padding:1.25rem;overflow-y:auto}
  .pg-box{background:#fffdf9;color:#1e1b18;max-width:40rem;width:100%;border-radius:10px;
    box-shadow:0 18px 50px rgba(0,0,0,.4);padding:1.5rem 1.6rem;
    font:15px/1.55 ui-sans-serif,-apple-system,"Segoe UI",system-ui,sans-serif}
  .pg-box h2{margin:0 0 .2rem;font-size:1.15rem;letter-spacing:.01em}
  .pg-sub{margin:0 0 1rem;color:#6b6560;font-size:.85rem;text-transform:uppercase;
    letter-spacing:.08em}
  .pg-box p{margin:0 0 .8rem}
  .pg-box strong{font-weight:650}
  .pg-terms{background:#f4f0ea;border-left:3px solid #b47a13;border-radius:0 6px 6px 0;
    padding:.7rem .9rem;margin:0 0 1rem;font-size:.92rem}
  .pg-terms ul{margin:.4rem 0 0;padding-left:1.1rem}
  .pg-terms li{margin:.2rem 0}
  .pg-actions{display:flex;justify-content:flex-end;align-items:center;gap:1rem;
    margin-top:1.1rem;flex-wrap:wrap}
  .pg-load{color:#6b6560;font-size:.82rem;margin-right:auto}
  .pg-btn{background:#0b6b4f;color:#fff;border:0;border-radius:6px;padding:.55rem 1.1rem;
    font:inherit;font-weight:600;cursor:pointer}
  .pg-btn:hover{background:#095a42}
  .pg-btn:focus-visible{outline:3px solid #b47a13;outline-offset:2px}
  @media (prefers-color-scheme:dark){
    .pg-box{background:#221f1c;color:#f0ebe4}
    .pg-terms{background:#2c2723;border-left-color:#fbbf24}
    .pg-sub,.pg-load{color:#a49c93}
  }`;

  function build() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const veil = document.createElement('div');
    veil.className = 'pg-veil';
    veil.setAttribute('role', 'dialog');
    veil.setAttribute('aria-modal', 'true');
    veil.setAttribute('aria-labelledby', 'pg-title');
    veil.innerHTML = `
      <div class="pg-box">
        <p class="pg-sub">Preview &mdash; not for redistribution</p>
        <h2 id="pg-title">London Customs Accounts, 1380&ndash;1560</h2>
        <p>This site is published so that the project's advisory board and
           collaborators can assess the data and the methods behind it. It is
           work in progress, and some of what you will see is known to be
           wrong.</p>
        <div class="pg-terms">
          <strong>The rights in this material are not yet settled.</strong>
          <ul>
            <li>The site code is MIT, and data authored by the project is
                CC&nbsp;BY&nbsp;4.0.</li>
            <li>Everything deriving from earlier editions and reference works
                &mdash; which is most of what is here &mdash; carries
                <em>no permission for reuse</em> until one is stated.</li>
            <li>Please do not redistribute, mirror, or cite this data while that
                remains the case.</li>
          </ul>
        </div>
        <p>Persistent identifiers already published will continue to resolve,
           whatever is settled later.</p>
        <div class="pg-actions">
          <span class="pg-load" id="pg-load">Loading data in the background&hellip;</span>
          <button type="button" class="pg-btn" id="pg-ok">I understand &mdash; continue</button>
        </div>
      </div>`;
    document.body.appendChild(veil);

    const scrollY = window.scrollY;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const btn = veil.querySelector('#pg-ok');
    btn.focus();

    // A gate that Tab can escape is not a gate: keep focus inside it.
    veil.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); btn.focus(); }
      if (e.key === 'Escape') e.preventDefault();   // acknowledgement, not a dismissal
    });

    btn.addEventListener('click', () => {
      try { localStorage.setItem(KEY, new Date().toISOString()); } catch (e) { /* ignore */ }
      veil.remove();
      document.documentElement.style.overflow = prevOverflow;
      window.scrollTo(0, scrollY);
    });

    // Say when the page behind has finished, so the wait is legible rather than
    // silent -- but never hold the button hostage to it.
    const label = veil.querySelector('#pg-load');
    const done = () => { label.textContent = 'Data ready.'; };
    if (document.readyState === 'complete') setTimeout(done, 0);
    else window.addEventListener('load', done);
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
