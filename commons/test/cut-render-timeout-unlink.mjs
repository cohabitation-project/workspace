// Cohabi Cut: a render that times out (or dies) leaves no half-written cut_*.mp4 behind. Server-free: a fake render child.
// Place as commons/test/cut-render-timeout-unlink.mjs. Needs wire-killtree.diff and timeout-unlink.patch applied.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { forkRenderJob } from "../lib/cut/wire.mjs";
import { renderEditJob } from "../lib/cut/render-job.mjs";

const dir = mkdtempSync(join(tmpdir(), "cut-unlink-"));
const mk = (name, body) => { const f = join(dir, name); writeFileSync(f, body); return pathToFileURL(f); };
// Each fake child writes the file the parent named in job.outPath (the same place the real renderer writes), then behaves.
const WRITE = `import { writeFileSync } from "node:fs"; process.once("message", (job) => { writeFileSync(job.outPath ?? job.outDir + "/cut_0000000000000000.mp4", "half"); `;
const hang = mk("hang.mjs", WRITE + `setInterval(() => {}, 1000); });`);
const crash = mk("crash.mjs", WRITE + `process.exit(1); });`);
const okay = mk("ok.mjs", WRITE + `process.send({ ok: true, result: { ok: true, outPath: job.outPath, seconds: 1 } }, () => process.exit(0)); });`);
const mkOut = () => { const o = join(dir, "out-" + Math.random().toString(36).slice(2)); mkdirSync(o); return o; };
const cuts = (o) => readdirSync(o).filter((f) => /^cut_.*\.mp4$/.test(f));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("timeout: the half file is there while it runs, gone after the timeout", async () => {
	const out = mkOut();
	const p = forkRenderJob({ outDir: out }, { timeoutMs: 800, child: hang }).then(() => "resolved", (e) => e.message);
	await sleep(400);
	assert.equal(cuts(out).length, 1, "precondition: the fake child must have written its half file by now");
	assert.equal(await p, "render timed out");
	assert.deepEqual(cuts(out), [], "a timed-out render's file must be removed by the parent");
});

test("child dies without an answer: its file is removed too", async () => {
	const out = mkOut();
	const msg = await forkRenderJob({ outDir: out }, { timeoutMs: 5000, child: crash }).then(() => "resolved", (e) => e.message);
	assert.equal(msg, "render process exited");
	assert.deepEqual(cuts(out), []);
});

test("success: the finished file is kept", async () => {
	const out = mkOut();
	const r = await forkRenderJob({ outDir: out }, { timeoutMs: 5000, child: okay });
	assert.equal(r.ok, true);
	assert.equal(cuts(out).length, 1, "the parent must not delete a render that succeeded");
	assert.equal(r.outPath, join(out, cuts(out)[0]));
});

test("a path arriving in the job is ignored: the parent only ever deletes a name it chose", async () => {
	const out = mkOut(), victim = join(dir, "precious.txt");
	writeFileSync(victim, "keep me");
	await forkRenderJob({ outDir: out, outPath: victim }, { timeoutMs: 600, child: hang }).catch(() => {});
	assert.equal(existsSync(victim), true);
});

test("render-job: uses the outPath it is given, refuses one outside outDir or off-pattern", () => {
	const out = mkOut(), src = join(dir, "src.mp4"); writeFileSync(src, "x");
	const edit = { trimStart: 0, trimEnd: 1, coverSec: 0 };
	const video = { path: src, durationSec: 5, width: 320, height: 240, hasAudio: false };
	const run = (_c, args) => { writeFileSync(args[args.length - 1], "mp4"); return { status: 0, stdout: "", stderr: "" }; };
	const want = join(out, "cut_0123456789abcdef.mp4");
	const r = renderEditJob({ edit, video, outDir: out, outPath: want, run });
	assert.equal(r.outPath, want);
	for (const bad of [join(dir, "cut_0123456789abcdef.mp4"), join(out, "evil.mp4"), join(out, "..", "cut_0123456789abcdef.mp4"), 42]) {
		assert.throws(() => renderEditJob({ edit, video, outDir: out, outPath: bad, run }), TypeError, String(bad));
	}
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
