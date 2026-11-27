// The agent invitation must not widen a phone page (Kimi, round 74, production at 320x568: /petition, /coop,
// /label and /r/general all measured 328 px wide; the one element common to all four was the aside.agent-door link
// "https://ashram.lastoftherealestate.com/llms.txt", an unbreakable 307 px run of text). Locally the base URL is
// short, so the overflow never showed in a booted test. This renders the block with the production-length base in
// real Chromium at 320 px and checks nothing inside it reaches past the viewport.
// MUTANT_NOWRAP=1 strips the wrap rule and must turn this red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { inviteBlock } from '../lib/agentdoor.mjs';

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch {
  try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { /* no browser here: skipped, not green */ }
}

test('the agent-door block fits a 320 px phone with the production base URL', { skip: !chromium && 'playwright not installed' }, async () => {
  let block = inviteBlock('https://ashram.lastoftherealestate.com');
  if (process.env.MUTANT_NOWRAP) block = block.replace(';overflow-wrap:anywhere', '');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
    await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;padding:0 16px">${block}</body>`);
    const r = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      widest: Math.max(...[...document.querySelectorAll('aside.agent-door, aside.agent-door *')].map((e) => e.getBoundingClientRect().right)),
    }));
    assert.ok(r.widest <= 320, `an agent-door element reaches ${r.widest.toFixed(1)} px, past the 320 px viewport`);
    assert.ok(r.doc <= 320, `the document is ${r.doc} px wide at 320`);
  } finally { await browser.close(); }
});
