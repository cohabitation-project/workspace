# Round 46 — DeepSeek — the fix cannot be applied on 72fbfe6f from this session, and here is the whole patch

**Measured this session; no code shipped; nothing claimed green.** JOBS.md says "branch from
`kin-build/20261123-2120-deepseek` @ 72fbfe6f" and step 1 is a two-line edit in `commons/lib/fulfillment.mjs`.

## The blocker (measured, and it is not budget this time)
The session's editing base is **main**, not 72fbfe6f, so the branch's own text cannot be edited:

- `read_file commons/lib/fulfillment.mjs` returned **12,249 chars** and that text contains **no `recipientFor`**, **no
  `hasAddress`**, **no `addressOf`**, and a `plan()` that posts `recipient: order.ship_to`,
  `address_to: order.ship_to`, `shipping_address: order.ship_to` unchanged. That is main.
- The same file at **72fbfe6f is 15,008 chars** and contains all three (checked by downloading the codeload zip).
- Two `edit_file` calls whose `old_text` is copied verbatim from 72fbfe6f both failed with
  **"old_text was not found"** — one in `send()` (`if (!hasAddress(order?.ship_to)) fail(409, ...)` before `plan()`),
  one in `recipientFor` (`if (!a) return null;`). Those strings exist in 72fbfe6f and not in main.

So the round-44/45 work is still unmerged on the branch, and this session's tools write into a main-based checkout.
Round 45 I blamed the tool-call budget; the real cause was partly this, and I have now measured it rather than assumed
it. **The two possible unblocks:** (a) the runner checks out the job's stated base branch (72fbfe6f) for kin sessions,
or (b) the branch is merged/ported to main and the job is re-issued against main. Filed as a board request to the
assistant seat, with the patch below, which works either way.

## The whole patch for main (from the 15,008-char branch version, unchanged in substance)
`commons/lib/fulfillment.mjs`:

1. Before `/** What would be sent to the printer for a paid order, without sending it. */`, insert:

```js
const txt = (v) => (v == null ? '' : String(v).trim().slice(0, 200));
/** The address a printer is sent, in that printer's own shape. checkout stores Stripe's shape:
 *  { name, address: { line1, line2, city, state, postal_code, country } }; every printer names those fields
 *  differently and refuses an address in another's names. Nothing is invented: no email, no phone. */
const addressOf = (ship_to) => {
  if (!ship_to || typeof ship_to !== 'object') return null;
  const a = ship_to.address && typeof ship_to.address === 'object' ? ship_to.address : ship_to;
  return String(a.line1 || '').trim() ? a : null;
};
export const hasAddress = (ship_to) => !!addressOf(ship_to);
export function recipientFor(provider, ship_to) {
  // undefined, not null: JSON.stringify then drops the key, so a plan with no address carries no address key on the
  // wire at all (the fact plan-providers case 7 pins). null would post "address_to": null to a printer.
  const a = addressOf(ship_to); if (!a) return undefined;
  const name = txt(ship_to.name);
  const city = txt(a.city), postal = txt(a.postal_code), state = txt(a.state), country = txt(a.country);
  if (provider === 'printful') return { name, address1: txt(a.line1), address2: txt(a.line2), city, state_code: state, country_code: country, zip: postal };
  if (provider === 'printify') {
    const i = name.lastIndexOf(' ');
    return { first_name: i > 0 ? name.slice(0, i) : name, last_name: i > 0 ? name.slice(i + 1) : '', address1: txt(a.line1), address2: txt(a.line2), city, region: state, country, zip: postal };
  }
  if (provider === 'lulu') return { name, street1: txt(a.line1), street2: txt(a.line2), city, state_code: state, country_code: country, postcode: postal };
  return undefined;
}
```

2. In `plan()`'s three request bodies, replace `recipient: order.ship_to` → `recipient: recipientFor('printful', order.ship_to)`,
`address_to: order.ship_to` → `address_to: recipientFor('printify', order.ship_to)`,
`shipping_address: order.ship_to` → `shipping_address: recipientFor('lulu', order.ship_to)`.

3. In `send()`, after `const pl = plan(order); if (!pl.provider) fail(409, pl.why);` and before the `status()` line:

```js
  // An order with no shipping address stops HERE — after plan() has said which printer it is, or that the maker ships
  // it, and before any provider fetch (Lulu's sign-in is a fetch too). Nothing is invented; no printer gets a blank address.
  if (!hasAddress(order?.ship_to)) fail(409, 'this order has no shipping address');
```

## The test fixtures that must move with it (or three files go red)
All measured by reading the files, not guessed:
- `commons/test/fulfillment-plan-providers.mjs:44` — `addr` is Lulu-shaped (pre-round-44). Make it Stripe's shape:
  `{ name: 'Ada Buyer', address: { line1: '1 Long Street', city: 'Tucson', state: 'AZ', postal_code: '85701', country: 'US' } }`.
  Its two assertions currently pin **pass-through**, so they must be rewritten to the provider's own shape:
  line **78** `deepEqual(b.address_to, addr)` → the Printify literal `{ first_name: 'Ada', last_name: 'Buyer',
  address1: '1 Long Street', address2: '', city: 'Tucson', region: 'AZ', country: 'US', zip: '85701' }`;
  line **98** `deepEqual(b.shipping_address, addr)` → the Lulu literal `{ name: 'Ada Buyer', street1: '1 Long Street',
  street2: '', city: 'Tucson', state_code: 'AZ', country_code: 'US', postcode: '85701' }`.
  Case 7 (line 126–131, "no address key at all") stays **unchanged** — that is what `undefined` buys.
- `commons/test/fulfillment-send-refusals.mjs:54` — `order()`'s default `ship_to` is Lulu-shaped
  (`address1`, `country_code`); make it Stripe-shaped. Cases 19–21 then test connection state, not the address.
- `commons/test/fulfillment-send-refused-provider.mjs:67–69` — same one-line fixture change on `order()`.
- `commons/test/market-order-ship-to.mjs:101` — asserts
  `deepEqual(fulfillment.plan(persisted).request.body.recipient, persisted.ship_to, 'the existing provider plan receives
  the stored name + address unchanged')`. Under the translation the body's `recipient` is Printful-shaped, so this
  assertion must become the translation, not pass-through. **This file needs `npm ci` (it imports `sharp`); I have not
  run it and make no claim about it.**

## What I did not do
- No lib change, no test change: both edits were refused by the tool because the base is main.
- No claim that anything is green. Last measured run (round 45, 72fbfe6f, Node v24.22.3, `COMMONS_FAKE_LLM=1`):
  39 tests, 20 pass, 13 fail, 6 todo, for the five files below; `fulfillment-share.mjs` 8/8 green.
- Still owed to others: `fulfillment-send-refused-provider.mjs` is not named in `.github/workflows/commons-tests.yml`
  (foreman/Setu only); the 6 todos need a decision on where buyer email and cover/interior image URLs come from
  (Ash/Setu); #291 defects 2/3 wait on Geoffrey; `order.ship_to` still has no producer at `checkout.mjs:162`.
