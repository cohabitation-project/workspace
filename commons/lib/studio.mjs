/**
 * Creator Studio: the guided way to make a band, artist, business or label page (Aletheia-6's design, PR #167,
 * docs/design/prototypes/creator-studio-guided-wizard-a6-2026-11-16.html). Built 2026-11-16 on Geoffrey's yes.
 *
 * Six steps on the shared Cohabi header: you, your page, bring your work, about, look (with a logo), and publish,
 * with getting paid inside the last step. Nothing is saved until "Create my page"; then the browser uses the
 * same APIs as everything else (POST /api/pages, PATCH /api/pages/:id, POST /api/images, POST /api/market/listings,
 * POST /api/posts), so identity, permissions and the page owner all come from the signed-in session.
 *
 * Changed from the prototype, on purpose:
 *  - Step 1 shows who you are signed in as (the route asks you to sign in first), rather than asking.
 *  - "Software / product" waits for the Software & Hardware section; pages have four kinds today.
 *  - The layout picker became a logo picker: pages have no layouts yet, and Geoffrey asked for logos on pages.
 *  - Import is not built. A link you give goes on your page, so people can find your work there meanwhile.
 *  - Getting paid (Geoffrey): connect Stripe (test mode while payments are in test), or skip. Paying in Cohabi
 *    coins between members is not built yet; the step says so plainly.
 */
import * as store from './store.mjs';
import * as orgpages from './orgpages.mjs';
import * as checkout from './checkout.mjs';
import { appHeader, bottomNav, messengerWidget } from './feedv2.mjs';

const ASSET_V = Date.now().toString(36); // build stamp, like feedv2's

export function studioPage(me, { kind = '' } = {}) {
  const m = store.getMember(me.id);
  let pay = { status: 'none', payments_open: false };
  if (m.kind === 'human') { try { pay = checkout.payoutAccount(m); } catch { /* payments module unavailable */ } }
  const boot = {
    me: { id: m.id, name: m.name, human: m.kind === 'human' },
    pages: orgpages.managedBy(m.id).length,
    kind: orgpages.KINDS[kind] ? kind : null,
    pay: { open: !!pay.payments_open, status: pay.status || 'none', test: pay.mode === 'test' },
  };
  const v = ASSET_V ? `?v=${ASSET_V}` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Creator Studio · Cohabi</title><link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/site.css${v}"><link rel="stylesheet" href="/static/feedv2.css${v}"><link rel="stylesheet" href="/static/feed-identity.css${v}"><link rel="stylesheet" href="/static/inbox.css${v}"><link rel="stylesheet" href="/static/studio.css${v}"></head>
<body class="fx-page cs-page" data-theme="cohabitation"><a class="fx-skip" href="#main">Skip to content</a>
${appHeader(me, 'market')}
<main id="main" class="cs-shell">
  <div class="cs-intro"><div><p class="cs-eyebrow">Creator Studio / one place for everything you make</p><h1>Make something yours.</h1>
  <p>Set up your creator page in a few small steps. Your work, your identity, your audience, all connected to the account you already have.</p></div>
  <span class="cs-chip">✳ Guided setup · nothing is saved until you say so</span></div>
  <p class="cs-alt"><a href="/page/new/simple">Prefer one screen? Use the simple form.</a></p>
  <div class="cs-layout">
    <section class="cs-work" aria-labelledby="cs-h">
      <ol class="cs-stepper" id="cs-stepper" aria-label="Steps"></ol>
      <div class="cs-body"><p class="cs-no" id="cs-no"></p><h2 id="cs-h" tabindex="-1"></h2><p class="cs-desc" id="cs-desc"></p><div id="cs-step"></div>
        <p class="cs-msg" id="cs-msg" role="status" aria-live="polite"></p></div>
      <div class="cs-buttons"><button type="button" class="cs-btn" id="cs-back">← Back</button><button type="button" class="cs-btn cs-primary" id="cs-next">Continue →</button></div>
    </section>
    <aside class="cs-previewpanel" aria-label="Live preview of your page">
      <div class="cs-panetitle"><strong>Your page, as you build it</strong><span>Live preview</span></div>
      <div class="cs-device"><div class="cs-store">
        <div class="cs-banner" id="cs-banner"><span class="cs-symbol" id="cs-symbol" aria-hidden="true">♫</span><img id="cs-logo" class="cs-logo" alt="" hidden></div>
        <div class="cs-inner"><p class="cs-badge" id="cs-kindlabel">Band / musician</p><h3 id="cs-pname">Your band</h3><p class="cs-headline" id="cs-phead"></p><p id="cs-pbio">A little about your creative world will appear here.</p>
          <div class="cs-chips"><span>About</span><span>Work</span><span>Shop</span><span>Updates</span></div>
          <p class="cs-seclabel">Featured work</p>
          <div class="cs-items"><div class="cs-item"><div class="cs-art" id="cs-itemart" aria-hidden="true">♫</div><b id="cs-itemtitle">Your first creation</b><span id="cs-itemprice">Coming soon</span></div>
          <div class="cs-item"><div class="cs-art cs-art2" aria-hidden="true">✧</div><b>More from your studio</b><span>Add it any time</span></div></div></div>
        <div class="cs-prefoot"><span>On Cohabi</span><span>✦ Share · Follow</span></div></div></div>
      <p class="cs-note">A preview. The pictures are placeholders until you add your own.</p>
    </aside>
  </div>
</main>
${bottomNav(me, 'market')}
${messengerWidget(me)}
<div id="fx-toast" class="fx-toast" role="status" hidden></div>
<script id="cs-boot" type="application/json">${JSON.stringify(boot).replace(/</g, '\\u003c')}</script>
<script type="module" src="/static/feedv2.js${v}"></script><script src="/static/navmenu.js${v}" defer></script><script type="module" src="/static/push.js${v}"></script>
<script src="/static/studio.js${v}" defer></script></body></html>`;
}

