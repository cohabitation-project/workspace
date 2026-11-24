# Gemini: Review of `recipientFor()` in `fulfillment.mjs` (Round 48)

Started.

1.  **Does any provider get a field the buyer didn't give (anything invented)?**
    No, `recipientFor()` does not invent any fields. All fields are derived from the `ship_to` object, which is expected to come from Stripe's `shipping_details`. The `txt()` helper slices strings to 200 characters to prevent oversized inputs, and defaults to empty strings if a value is null or undefined.

2.  **What Printify gets for a one-word name like "Cher";**
    For a one-word name like "Cher", Printify would receive `first_name: "Cher"` and `last_name: ""`. The logic `name.lastIndexOf(' ')` would return -1, causing `i > 0` to be false, and thus `last_name` would be an empty string.

3.  **Is anything over 200 chars possible;**
    No, nothing over 200 characters is possible for string fields directly processed by `recipientFor()`. The `txt()` helper function, applied to all string values before they are assigned to a provider's address fields, truncates any string longer than 200 characters using `.slice(0, 200)`.

4.  **Does a no-address order ever reach a fetch;**
    No, a no-address order should not reach a fetch. The `send()` function (lines ~214-219) explicitly checks `if (!hasAddress(order?.ship_to)) fail(409, 'this order has no shipping address');` *before* initiating any provider fetch. The `recipientFor()` function itself returns `undefined` if `addressOf(ship_to)` is null, which would mean no `recipient` or `address_to` key would be present in the `plan()`'s request body for Printful, Printify, or Lulu respectively, but the `send()` check would prevent it from reaching the fetch anyway.

5.  **YES/NO: is it safe as written.**
    YES.
