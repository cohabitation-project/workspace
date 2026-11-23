import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleCutRender, _resetCutRouteState, _cutRouteState } from "../lib/cut/route.mjs";

const dir = mkdtempSync(join(tmpdir(), "cut-route-"));
const outDir = mkdtempSync(join(tmpdir(), "cut-route-out-"));
const vid = join(dir, "in.mp4");
const mus = join(dir, "song.mp3");
writeFileSync(vid, "x");
writeFileSync(mus, "y");
test.after(() => { rmSync(dir, { recursive: true, force: true }); rmSync(outDir, { recursive: true, force: true }); });
test.beforeEach(() => _resetCutRouteState());

const alice = { id: "m_alice" };
const bob = { id: "m_bob" };
const goodEdit = (over = {}) => ({ trimStart: 2, trimEnd: 6, coverSec: 3, ...over });
const ok = { status: 0, stderr: "", stdout: "" };

function makeDeps(over = {}) {
	const calls = { probe: [], run: [], log: [] };
	const deps = {
		videos: { get: (id) => (id === "v1" ? { owner: "m_alice", path: vid, durationSec: 20, width: 540, height: 960 } : null) },
		music: {
			get: (id) => (id === "mine" ? { owner: "m_alice", path: mus }
				: id === "bobs" ? { owner: "m_bob", path: mus }
				: id === "label" ? { public: true, path: mus } : null),
		},
		probe: (p) => { calls.probe.push(p); return { hasAudio: true }; },
		outDir,
		log: (m) => calls.log.push(m),
		...over,
	};
	return { deps, calls };
}
// The default job with a fake ffmpeg runner: lets the real renderEditJob run its checks.
const withFakeRun = (calls, over = {}) => ({
	renderJob: async (job) => {
		const { renderEditJob } = await import("../lib/cut/render-job.mjs");
		return renderEditJob({ ...job, run: (c, argv, o) => { calls.run.push({ c, argv, o }); return ok; }, ffmpeg: "ffmpeg" });
	},
	...over,
});

test("a good edit by the owner answers 200 { ok, url, seconds } and ffmpeg is asked once", async () => {
	const { deps, calls } = makeDeps();
	Object.assign(deps, withFakeRun(calls));
	const r = await handleCutRender({ member: alice, body: { videoId: "v1", edit: goodEdit({ text: { body: "hi", y: 540 } }) }, deps });
	assert.equal(r.status, 200);
	assert.equal(r.json.ok, true);
	assert.equal(r.json.seconds, 4);
	assert.match(r.json.url, /^\/cut\/cut_[0-9a-f]{16}\.mp4$/);
	assert.equal(calls.run.length, 1);
	assert.deepEqual(calls.probe, [vid]);
	assert.deepEqual(_cutRouteState(), { members: [], active: 0 });
});

test("hasAudio from the probe reaches the job; a silent video renders without an audio map", async () => {
	const seen = [];
	const { deps } = makeDeps({ probe: () => false, renderJob: async (j) => { seen.push(j); return { ok: true, outPath: join(outDir, "cut_0123456789abcdef.mp4"), seconds: 4 }; } });
	const r = await handleCutRender({ member: alice, body: { videoId: "v1", edit: goodEdit() }, deps });
	assert.equal(r.status, 200);
	assert.equal(seen[0].video.hasAudio, false);
	assert.equal(seen[0].outDir, outDir);
	assert.equal(seen[0].music, null);
});

test("someone else's video is 403 and nothing is probed or rendered; unknown video is 404", async () => {
	const { deps, calls } = makeDeps();
	Object.assign(deps, withFakeRun(calls));
	const r = await handleCutRender({ member: bob, body: { videoId: "v1", edit: goodEdit() }, deps });
	assert.equal(r.status, 403);
	assert.equal(calls.probe.length, 0);
	assert.equal(calls.run.length, 0);
	const r2 = await handleCutRender({ member: alice, body: { videoId: "nope", edit: goodEdit() }, deps });
	assert.equal(r2.status, 404);
});

test("someone else's music is 403; a public label track and your own music are allowed; unknown music is 404", async () => {
	const { deps, calls } = makeDeps();
	Object.assign(deps, withFakeRun(calls));
	const go = (id) => handleCutRender({ member: alice, body: { videoId: "v1", edit: goodEdit({ music: { id, volume: 0.5 } }) }, deps });
	assert.equal((await go("bobs")).status, 403);
	assert.equal(calls.run.length, 0);
	assert.equal((await go("nope")).status, 404);
	assert.equal((await go("mine")).status, 200);
	assert.equal((await go("label")).status, 200);
	assert.equal(calls.run.length, 2);
});

test("body.musicId wins over edit.music.id when both are given; music asked for with no id is 400", async () => {
	const asked = [];
	const { deps } = makeDeps({ renderJob: async () => ({ ok: true, outPath: join(outDir, "cut_0123456789abcdef.mp4"), seconds: 4 }) });
	const orig = deps.music.get;
	deps.music.get = (id) => { asked.push(id); return orig(id); };
	const r = await handleCutRender({ member: alice, body: { videoId: "v1", musicId: "mine", edit: goodEdit({ music: { id: "bobs", volume: 0.5 } }) }, deps });
	assert.equal(r.status, 200);
	assert.deepEqual(asked, ["mine"]);
	const r2 = await handleCutRender({ member: alice, body: { videoId: "v1", edit: goodEdit({ music: { volume: 0.5 } }) }, deps });
	assert.equal(r2.status, 400);
});

test("no member is 401; a bad body is 400 and never reaches the lookups", async () => {
	let looked = 0;
	const { deps } = makeDeps();
	deps.videos.get = () => { looked++; return null; };
	assert.equal((await handleCutRender({ member: null, body: { videoId: "v1", edit: goodEdit() }, deps })).status, 401);
	assert.equal((await handleCutRender({ member: {}, body: { videoId: "v1", edit: goodEdit() }, deps })).status, 401);
	for (const body of [null, [], "x", {}, { videoId: "v1" }, { edit: goodEdit() }, { videoId: 5, edit: goodEdit() },
		{ videoId: "a\nb", edit: goodEdit() }, { videoId: "v1", edit: [] }, { videoId: "v1", edit: goodEdit(), musicId: { x: 1 } },
		{ videoId: "x".repeat(201), edit: goodEdit() }]) {
		const r = await handleCutRender({ member: alice, body, deps });
		assert.equal(r.status, 400, JSON.stringify(body));
	}
	assert.equal(looked, 0);
});

test("a bad edit is 400 with the refusal's own message, and ffmpeg never runs", async () => {
	const { deps, calls } = makeDeps();
	Object.assign(deps, withFakeRun(calls));
	const bad = [
		[goodEdit({ trimStart: 6, trimEnd: 2 }), /trimEnd/],
		[goodEdit({ trimEnd: 99 }), /within 0\.\.20/],
		[goodEdit({ text: { body: "a\nb", y: 0 } }), /one line/],
		[goodEdit({ music: { id: "mine", volume: 2 } }), /volume/],
		[goodEdit({ coverSec: 10 }), /coverSec/],
	];
	for (const [edit, re] of bad) {
		const r = await handleCutRender({ member: alice, body: { videoId: "v1", edit }, deps });
		assert.equal(r.status, 400);
		assert.equal(r.json.ok, false);
		assert.match(r.json.error, re);
	}
	assert.equal(calls.run.length, 0);
	assert.deepEqual(_cutRouteState(), { members: [], active: 0 });
});

test("over 60 s is 400 from the job's own limit", async () => {
	const { deps, calls } = makeDeps();
	deps.videos.get = () => ({ owner: "m_alice", path: vid, durationSec: 300, width: 540, height: 960 });
	Object.assign(deps, withFakeRun(calls));
	const r = await handleCutRender({ member: alice, body: { videoId: "v1", edit: goodEdit({ trimStart: 0, trimEnd: 90, coverSec: 1 }) }, deps });
	assert.equal(r.status, 400);
	assert.match(r.json.error, /limit is 60 s/);
	assert.equal(calls.run.length, 0);
});

test("a second export from the same member while one runs is 429 'one export at a time'; another member is fine; the slot frees afterwards", async () => {
	let release;
	const gate = new Promise((r) => { release = r; });
	const out = { ok: true, outPath: join(outDir, "cut_0123456789abcdef.mp4"), seconds: 4 };
	const { deps } = makeDeps({ maxJobs: 5, renderJob: async () => { await gate; return out; } });
	deps.videos.get = (id) => ({ owner: id === "vb" ? "m_bob" : "m_alice", path: vid, durationSec: 20, width: 540, height: 960 });
	const body = (videoId) => ({ videoId, edit: goodEdit() });
	const first = handleCutRender({ member: alice, body: body("va"), deps });
	await new Promise((r) => setImmediate(r));
	assert.deepEqual(_cutRouteState().members, ["m_alice"]);
	const second = await handleCutRender({ member: alice, body: body("va"), deps });
	assert.equal(second.status, 429);
	assert.match(second.json.error, /one export at a time/);
	const other = handleCutRender({ member: bob, body: body("vb"), deps });
	await new Promise((r) => setImmediate(r));
	assert.equal(_cutRouteState().active, 2);
	release();
	assert.equal((await first).status, 200);
	assert.equal((await other).status, 200);
	assert.deepEqual(_cutRouteState(), { members: [], active: 0 });
	deps.renderJob = async () => out;
	assert.equal((await handleCutRender({ member: alice, body: body("va"), deps })).status, 200);
});

test("the site cap (maxJobs, default 2) answers 429 to a third member; a rejected request holds no slot", async () => {
	let release;
	const gate = new Promise((r) => { release = r; });
	const out = { ok: true, outPath: join(outDir, "cut_0123456789abcdef.mp4"), seconds: 4 };
	const { deps } = makeDeps({ renderJob: async () => { await gate; return out; } }); // no maxJobs -> 2
	deps.videos.get = (id) => ({ owner: id, path: vid, durationSec: 20, width: 540, height: 960 });
	const run = (id) => handleCutRender({ member: { id }, body: { videoId: id, edit: goodEdit() }, deps });
	const a = run("m_a");
	const b = run("m_b");
	await new Promise((r) => setImmediate(r));
	const c = await run("m_c");
	assert.equal(c.status, 429);
	assert.match(c.json.error, /busy/);
	assert.equal(_cutRouteState().active, 2);
	release();
	await Promise.all([a, b]);
	assert.equal(_cutRouteState().active, 0);
	deps.renderJob = async () => out;
	assert.equal((await run("m_c")).status, 200);
});

test("an ffmpeg failure is 500 'the render failed', the stderr goes to log only, and slots are released", async () => {
	const { deps, calls } = makeDeps({ renderJob: async () => { throw new Error("ffmpeg exited 1: /srv/secret/path Invalid data"); } });
	const r = await handleCutRender({ member: alice, body: { videoId: "v1", edit: goodEdit() }, deps });
	assert.equal(r.status, 500);
	assert.equal(r.json.error, "the render failed");
	assert.ok(!JSON.stringify(r.json).includes("secret"));
	assert.equal(calls.log.length, 1);
	assert.match(calls.log[0], /secret/);
	assert.deepEqual(_cutRouteState(), { members: [], active: 0 });
});

test("a synchronous throw inside renderJob is also 500 and releases the slots", async () => {
	const { deps } = makeDeps({ renderJob: () => { throw new Error("boom"); } });
	const r = await handleCutRender({ member: alice, body: { videoId: "v1", edit: goodEdit() }, deps });
	assert.equal(r.status, 500);
	assert.deepEqual(_cutRouteState(), { members: [], active: 0 });
});

test("a probe that throws or answers nonsense is 422, never renders, and releases the slots", async () => {
	let ran = 0;
	for (const probe of [() => { throw new Error("no streams"); }, async () => { throw new Error("x"); }, () => ({}), () => "yes"]) {
		const { deps } = makeDeps({ probe, renderJob: async () => { ran++; return {}; } });
		const r = await handleCutRender({ member: alice, body: { videoId: "v1", edit: goodEdit() }, deps });
		assert.equal(r.status, 422);
		assert.deepEqual(_cutRouteState(), { members: [], active: 0 });
	}
	assert.equal(ran, 0);
});

test("without deps.probe the video record's hasAudio is used; publicUrl is honoured", async () => {
	const seen = [];
	const { deps } = makeDeps({
		probe: undefined,
		renderJob: async (j) => { seen.push(j); return { ok: true, outPath: join(outDir, "cut_0123456789abcdef.mp4"), seconds: 4 }; },
		publicUrl: (p) => `https://cdn.example/${p.split("/").pop()}`,
	});
	deps.videos.get = () => ({ owner: "m_alice", path: vid, durationSec: 20, width: 540, height: 960, hasAudio: false });
	const r = await handleCutRender({ member: alice, body: { videoId: "v1", edit: goodEdit() }, deps });
	assert.equal(r.status, 200);
	assert.equal(seen[0].video.hasAudio, false);
	assert.equal(r.json.url, "https://cdn.example/cut_0123456789abcdef.mp4");
});

test("the member cannot choose the path or the output: client-sent path/outDir fields are ignored", async () => {
	const seen = [];
	const { deps } = makeDeps({ renderJob: async (j) => { seen.push(j); return { ok: true, outPath: join(outDir, "cut_0123456789abcdef.mp4"), seconds: 4 }; } });
	await handleCutRender({
		member: alice,
		body: { videoId: "v1", edit: goodEdit(), path: "/etc/passwd", outDir: "/tmp", video: { path: "/etc/shadow" } },
		deps,
	});
	assert.equal(seen[0].video.path, vid);
	assert.equal(seen[0].outDir, outDir);
});
