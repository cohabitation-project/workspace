# Round 64 — DeepSeek: "Send it again" works (the handler)

Job (Setu, Round 64, Tier 2, carried from round 63 made smaller): the `Send it again` button that round 62
put on `/label/sales` for a *refused* printer order had no script behind it. Add the delegated click handler
in `commons/public/market.js` only. No test this round (GPT writes one next round from this handler).

## What changed — one file

`commons/public/market.js`, appended at the end (14183 → 15927 bytes; nothing above it touched):

```js
const PRINTER_NAMES = { printful: 'Printful', printify: 'Printify', lulu: 'Lulu' };
document.addEventListener('click', (ev) => {
  const btn = ev.target && ev.target.closest ? ev.target.closest('[data-printer-send]') : null;
  if (!btn) return;
  ev.preventDefault();
  const box = btn.parentElement;
  const say = (text) => { const s = box && box.querySelector('[role=status]'); if (s) s.textContent = text; };
  btn.disabled = true;
  say('Sending…');
  fetch(`/api/orders/${encodeURIComponent(btn.getAttribute('data-printer-send'))}/printer`, { method: 'POST', credentials: 'same-origin', headers: { 'X-Commons': '1' } })
    .then((r) => r.json().catch(() => ({})).then((j) => ({ r, j })))
    .then(({ r, j }) => {
      if (!r.ok) { say(j.error || `The server said no (${r.status}).`); btn.disabled = false; return; }
      const p = j.printer || null;
      const name = p && p.provider ? (PRINTER_NAMES[p.provider] || p.provider) : 'The printer';
      if (p && p.state === 'draft') { say(`Sent to ${name} as a draft.`); return; } // at the printer now: button stays off
      if (p && p.state === 'failed') { say(`${name} refused it again: ${p.error || 'no reason given'}`); btn.disabled = false; return; }
      say('Nothing was sent. Try again in a minute.'); btn.disabled = false;
    })
    .catch(() => { say('Could not reach the server. Try again.'); btn.disabled = false; });
});
```

`textContent` only, never `innerHTML`: the printer's refusal text is the printer's own words.

## The route it calls (read, not changed)

`commons/server.mjs:1846-1852` — `POST /api/orders/:id/printer`. `houseWriter(req)` (so `X-Commons: 1`),
404 unknown order, **403 unless the order's seller or a steward**, then `checkout.sendToPrinter(...)` and it
returns `{ order, printer: { provider, state, provider_order?, error? }, sent }`, where `error` is included
**only** when `state === 'failed'`. That is exactly the shape the handler reads.

Note (round 59's finding, still true): `checkout.printerShown` deliberately strips `error` from the pages; the
route above is the one place the maker sees it. The handler writes it to the page only after the maker
pressed the button, on the maker's own sales page.

## Measured (node 24.22.3, fake DOM + fake `fetch`, no browser)

`node --check commons/public/market.js` → exit 0.

Harness: `new Function('document','window','fetch',…)` evaluating the real file with a stub `document` that
captures the `click` listener, then dispatching a click at a stub button. Evidence files:
`teams/build/outputs/2026-11-26T09-59-39/h4.js` (this run) and `…/2026-11-26T09-59-25/h2.js` (first run,
which also covered the offline and non-button cases).

| case | what the page says | button |
|---|---|---|
| printer returns `state:'draft'` | `Sent to Printful as a draft.` | stays disabled |
| printer returns `state:'failed', error:'base cost is 12.00'` | `Printful refused it again: base cost is 12.00` | re-enabled |
| HTTP 403 `{error:'only the maker or a steward…'}` | the server's own sentence | re-enabled |
| fetch throws (offline) | `Could not reach the server. Try again.` | re-enabled |
| click somewhere else on the page | — (no fetch at all) | untouched |

The request: `POST /api/orders/ord%201%2F2/printer` — the id is URL-encoded (`ord 1/2` → `ord%201%2F2`),
`credentials: 'same-origin'`, header `{'X-Commons': '1'}`. All five rows measured, not inferred.

**Red proof that main has no handler:** the same harness against the file with only my appended block removed
(`…/2026-11-26T09-59-39/market-before.js`, 14183 bytes, byte-identical to the pre-edit file) exits **1** with
`NO HANDLER REGISTERED`; the edited file exits **0**. So the harness can fail, and the button was dead before.

## Limits (say what was not seen)

- **No browser.** No real `document`, no real click, no real page. The DOM contract (the button inside
  `.mk-postto`, the empty `span[role=status]` beside it) was read from `commons/lib/marketpage.mjs:752`, not
  clicked.
- **No booted server.** The sandbox can't boot the Commons server (`src/llm.js` absent). The route was read,
  not called end to end; the fake `fetch` answers with the shapes the route's code produces.
- **No test added**, by the job: GPT writes `commons/test/*` next round from the five strings above.
- If the button's parent ever stops containing the `[role=status]` span, the handler sends and says nothing —
  worth an assertion in GPT's test.

## Next

1. @GPT: the test. Suggested shape: fake DOM + fake `fetch` like the harness above, five cases, and one
   mutant (delete the `p.state === 'failed'` branch → the failed case must go red).
2. @Setu: a browser pass on `/label/sales` with a `failed` fulfillment record would close the last gap — the
   real click, the real route.
