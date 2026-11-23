# Review: `sweepRenders` server wiring

**Scope:** review of `teams/cut/editor/cleanup.mjs` against the current repository server, plus the requested missing-directory test proposal. This is a recommendation, not server wiring or live behavior.

## Where to wire it

Current `commons/server.mjs` has no Cut render route or render-output directory yet. Relevant anchors on the current main snapshot:

- `commons/server.mjs:112` resolves `DATA` from `COMMONS_DATA` (or `<repo>/data/commons`). A stable private output directory can be `path.join(DATA, 'cut-renders')`; do not put ephemeral render files in `commons/public` or the repository.
- `commons/server.mjs:148` calls `videos.init(DATA)`, an early initialization anchor after which the directory can be prepared. Ensure the output directory exists before accepting renders.
- `commons/server.mjs:841–850` contains the existing video upload/delete/serve routes; the future `POST /api/cut/render` and matching credential-free output-serving route will need to be wired in this neighborhood. There is no such route on this main snapshot.
- `commons/server.mjs:2600` starts listening. Put startup cleanup before the server begins accepting requests if practical; otherwise invoke it in the listen callback and log failures without preventing the site from starting.

Recommendation: sweep once during startup, run a periodic hourly sweep for expiry when the server is idle, and enforce the byte cap after a render completes **only when no other render is writing**. A naive sweep after every response or on an unconditional timer can unlink a matching `.mp4` that another active render is still writing, because `render-job.mjs` writes to its final matching filename. Coordinate with the route's in-flight job count (or otherwise make active outputs invisible to the sweeper); the helper currently has no exclusion/lock mechanism. Serialize sweeps as well so two sweeps do not race each other.

## Proposed limits

Use `maxAgeMs: 6 * 60 * 60 * 1000` (6 hours) and `maxBytes: 2_000_000_000` (2,000,000,000 bytes, decimal) initially. These are the helper's documented defaults and the existing Job 4 spec values, not measured production usage or a capacity guarantee. They bound retention and total eligible output size while retaining the agreed prototype defaults. Revisit only with actual disk/output measurements; current evidence provides none.

## Required missing-directory regression

Add a test to `teams/cut/editor/cleanup.test.mjs` that creates a unique path under its temp directory but does not create that child directory, then asserts a sweep is non-throwing and returns the empty result. For example:

```js
test('sweepRenders treats a not-yet-created render directory as empty', async (t) => inTemp(t, async (dir) => {
  const missing = path.join(dir, 'not-created-yet');
  assert.deepEqual(
    await sweepRenders(missing, { maxAgeMs: 60_000, maxBytes: 100, now: NOW }),
    { deleted: 0, keptBytes: 0 },
  );
}));
```

`path` was already imported. I added this case to `teams/cut/editor/cleanup.test.mjs` and changed `cleanup.mjs` to treat only `ENOENT` from the initial `readdir(outDir)` as an empty render directory; other I/O errors still surface. **Measured:** `node --test teams/cut/editor/cleanup.test.mjs` passed 6/6, 0 skipped. The test and helper change are team-local only.

## Evidence and limits

Read `commons/server.mjs` around lines 112, 148, 841–850 and 2600; read `cleanup.mjs` and `cleanup.test.mjs`. **Measured here:** `node --test teams/cut/editor/cleanup.test.mjs` passed 6/6, 0 skipped after the missing-directory case and `ENOENT` behavior were added. No server integration test, browser run, route wiring, or deployed behavior was checked.
