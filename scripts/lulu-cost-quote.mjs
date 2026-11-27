#!/usr/bin/env node
/**
 * lulu-cost-quote.mjs — READ-ONLY Lulu cost calculations for t_dc2ecc2392 (Books & Writing pricing).
 *
 * WHAT IT DOES: asks Lulu's /print-job-cost-calculations/ endpoint what 3 standard book specs would
 * cost to print and ship. That endpoint quotes; it creates NO print job, uploads NO file, moves NO
 * money. The hard test boundary (no paid jobs without council) is untouched by running this.
 *
 * RUN ON THE SERVER (where the keys live), from the repo root:
 *     node --env-file=/home/geoffrey/workspace/.env scripts/lulu-cost-quote.mjs
 * Add --live to force the production API base even when LULU_LIVE is unset (cost quotes are
 * read-only there too; sandbox prices can differ from real ones, so --live is what pricing needs).
 *
 * Output: one summary line per spec+shipping level, then the full JSON per quote for the record.
 */
const env = (k) => process.env[k] || '';
const live = process.argv.includes('--live') || env('LULU_LIVE') === '1';
const base = env('LULU_API_URL') || (live ? 'https://api.lulu.com' : 'https://api.sandbox.lulu.com');

if (!env('LULU_CLIENT_KEY') || !env('LULU_CLIENT_SECRET')) {
  console.error('LULU_CLIENT_KEY / LULU_CLIENT_SECRET are not in the environment. Run with --env-file=<the server env file>.');
  process.exit(2);
}

// The same sign-in fulfillment.mjs uses (client credentials; the token lives only in this process).
const tokenRes = await fetch(`${base}/auth/realms/glasstree/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: 'Basic ' + Buffer.from(`${env('LULU_CLIENT_KEY')}:${env('LULU_CLIENT_SECRET')}`).toString('base64') },
  body: 'grant_type=client_credentials',
});
const tok = (await tokenRes.json().catch(() => ({}))).access_token;
if (!tok) { console.error(`Lulu sign-in failed against ${base} (HTTP ${tokenRes.status}).`); process.exit(2); }
console.log(`Signed in to ${base} (${live ? 'LIVE — real prices' : 'SANDBOX — prices may differ from real'}). Cost calculations only; no print job is created.\n`);

// 3 standard specs for the Books & Writing section. Same pod package, different page counts, plus a
// hardcover. Package ids are Lulu's public SKU grammar: trim 6x9, B&W standard, perfect-bound (PB) /
// casewrap hardcover (CW), 60# white paper.
const SPECS = [
  { name: '6x9 paperback B&W 150pp', pod_package_id: '0600X0900BWSTDPB060UW444MXX', page_count: 150 },
  { name: '6x9 paperback B&W 300pp', pod_package_id: '0600X0900BWSTDPB060UW444MXX', page_count: 300 },
  { name: '6x9 hardcover B&W 300pp', pod_package_id: '0600X0900BWSTDCW060UW444MXX', page_count: 300 },
];
// A US destination for shipping estimation only — nothing ships from a cost calculation.
const DEST = { name: 'Cost Probe', street1: '100 Main St', city: 'Sierra Vista', state_code: 'AZ', country_code: 'US', postcode: '85635', phone_number: '5205550100' };
const LEVELS = ['MAIL', 'EXPEDITED'];

const quotes = [];
for (const spec of SPECS) for (const level of LEVELS) {
  const body = { line_items: [{ pod_package_id: spec.pod_package_id, page_count: spec.page_count, quantity: 1 }], shipping_address: DEST, shipping_level: level };
  const r = await fetch(`${base}/print-job-cost-calculations/`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}` }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.log(`✗ ${spec.name} · ${level}: HTTP ${r.status} ${JSON.stringify(j).slice(0, 300)}`); quotes.push({ spec: spec.name, level, error: { status: r.status, body: j } }); continue; }
  const li = (j.line_item_costs || [])[0] || {};
  console.log(`✓ ${spec.name} · ${level}: print ${li.total_cost_excl_discounts ?? li.total_cost_excl_tax ?? '?'} | shipping ${j.shipping_cost?.total_cost_excl_tax ?? '?'} | fulfillment ${j.fulfillment_cost?.total_cost_excl_tax ?? '?'} | TOTAL excl tax ${j.total_cost_excl_tax ?? '?'} ${j.currency || ''}`);
  quotes.push({ spec: spec.name, level, quote: j });
}
console.log('\n===== FULL JSON (paste this whole block back) =====');
console.log(JSON.stringify({ base, live, ran_at: new Date().toISOString(), quotes }, null, 1));
