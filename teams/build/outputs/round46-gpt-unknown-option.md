# Round 46 — GPT: reject unknown merch options

**Status: source/test already present in this snapshot; no code change made.** Assignment: unknown colour/size options must be refused with 400 naming unknown values and listing offered options; known selections remain unchanged. Target suite: `node --test commons/test/merch-*.mjs`.

## Source inspection

`commons/lib/merchsets.mjs` already computes the requested options absent from the product's offered options before filtering/saving. It raises `CommonsError(400, ...)`, names each distinct unknown value, and lists the available colours or sizes. The existing focused test, `commons/test/merch-draft-unknown-option.mjs`, covers unknown colour (`Chartreuse`), unknown wall-art size (`Poster XXL`), and all-known colour and size requests returning 200 with unchanged choices. These satisfy the assigned behavior in the readable source. I made no source/test edits to avoid duplicating the implementation.

## Verification and limits

- **Syntax checked:** `node --check commons/lib/merchsets.mjs` and `node --check commons/test/merch-draft-unknown-option.mjs` both exit 0 (Node v24.22.3).
- **Targeted integration attempted:** `node --test commons/test/merch-draft-unknown-option.mjs` fails before assertions because the spawned Commons server does not start; test reports `AssertionError: test server started` after its 15-second wait. Directly starting `commons/server.mjs` identifies missing dependency `dotenv` (`ERR_MODULE_NOT_FOUND`).
- **Install blocked by checkout contents:** `npm ci` cannot run because this runner's repository copy has no `package.json` or `package-lock.json` (npm reports EUSAGE: no package-lock). The copy is not a Git checkout either. Thus I could not run the assigned complete `node --test commons/test/merch-*.mjs` suite or trace the already-present edits to a commit/branch.

**Conclusion:** The required change and focused test are present in the supplied source snapshot, but runtime behavior is not verified here. No claim of a green test, merge, staging, or production behavior.
