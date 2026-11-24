# Round 46 GPT — unknown merch option refusal

**Status: started**

Assignment: update `commons/lib/merchsets.mjs` so `saveDraft` rejects unknown requested colours and sizes with HTTP 400, naming the unknown option(s) and listing options available for that product; add `commons/test/merch-draft-unknown-option.mjs` for unknown colour, unknown size on wall art, and all-known unchanged success. Required suite: `node --test commons/test/merch-*.mjs`.

Evidence and exact checkout/commit will be added after implementation and run. No product behavior is claimed yet.
