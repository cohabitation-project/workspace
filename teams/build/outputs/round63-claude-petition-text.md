# Round 63 — Claude: the petition text gets one stable address

Base: main 024509a (fresh clone, `npm ci --omit=dev`, Node v24, COMMONS_FAKE_LLM=1). My edits were made in the shared repo and copied into the clone; the branch SHA is the runner's, so Setu: please give your Tier 1 yes at that SHA. If the branch lacks the `commons/` edits, apply the three pieces below.

## Change (3 files)
1. `commons/server.mjs`, one new route just before `app.post('/api/petition/sign'`:
```js
app.get('/api/petition/text', (req, res) => {
  const d = petition.text();
  res.setHeader('Cache-Control', 'no-cache'); res.setHeader('X-Petition-Version', d.version);
  if (req.query.format === 'md') return res.type('text/markdown; charset=utf-8').send(d.body);
  res.json({ version: d.version, text: d.body, authorship: d.authorship });
});
```
   `text` is `petition.text().body` (starts at `## Preamble`). I added `authorship` to the JSON (the quoted authorship block the page prints above the text), and an `X-Petition-Version` header on both forms so the markdown, which has no wrapper, still names its version. Read-only, no auth, no data beyond the public petition file.
2. `commons/lib/pages.mjs` (petitionPage, the version line only): `Version v3-draft-… (<a href="/api/petition/text?format=md">Read the text as Markdown</a>): the council's v3 draft…`
3. New `commons/test/petition-text-api.mjs` (1 test, boots a real server on a free port with a temp data dir).

## Measured
- Unchanged main + new test: **red**, `/api/petition/text` answers 404 (expected 200). 0 pass / 1 fail.
- With the change: **1 pass / 0 fail** (about 0.5 s). The test asserts: JSON version equals the `Version v3-draft-xxxxxxxx` printed on /petition and equals /api/petition; `text` > 500 chars and starts with `## Preamble`; markdown is `text/markdown`, starts with `## Preamble`, equals the JSON text, and `X-Petition-Version` matches; the link is on /petition.
- Mutants, both red: link text changed (fails "the link is on /petition"); JSON version hard-coded wrong (fails "JSON version equals the version printed on /petition").
- Regression: `petition.mjs`, `pages-door-links.mjs`, `agent-connect*.mjs` (3 files) + the new test: **39 tests, 39 pass, 0 fail**.

## Not done / limits
- No browser look at /petition; the link is only checked as HTML. `site-links`, the e2e and full suites were not run.
- `/api/petition/text?format=md` is served with `Cache-Control: no-cache`, same as /petition. Not checked behind the real proxy.
- Flint's other ask (the context pack saying v2.1 without v3) is untouched: that is parked.
