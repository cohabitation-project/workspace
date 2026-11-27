import test from "node:test";
import assert from "node:assert/strict";
import { handleCutRender, _resetCutRouteState } from "../lib/cut/route.mjs";
import { makeCutDeps } from "../lib/cut/wire.mjs";

// A render must refuse a source video that is not ready, BEFORE any probe or ffmpeg runs (Cut round 42).
// Unit level: fake stores, no HTTP, no ffmpeg. The real store reports { ready, failed } through videos.get (publicVideo);
// wire.mjs's adapter used to drop them, which is why the route could not refuse.
test.beforeEach(() => _resetCutRouteState());

const alice = { id: "m_alice" }, bob = { id: "m_bob" };
const body = { videoId: "v1", edit: { trimStart: 1, trimEnd: 4, coverSec: 2 } };
const NOT_READY = "This video is still being prepared. Try again when it shows ready.";

function routeDeps(rec) {
	const calls = { probe: 0, render: 0 };
	return { calls, deps: {
		videos: { get: (id) => (id === "v1" ? rec : null) },
		probe: async () => { calls.probe++; return { hasAudio: true, width: 540, height: 960, durationSec: 20 }; },
		renderJob: async () => { calls.render++; return { outPath: "/tmp/cut_0123456789abcdef.mp4", seconds: 3 }; },
		outDir: "/tmp",
	} };
}

test("not ready -> 409 with the maker sentence; no probe, no render", async () => {
	const { deps, calls } = routeDeps({ owner: "m_alice", path: "/tmp/x.orig.mp4", ready: false, failed: false });
	const r = await handleCutRender({ member: alice, body, deps });
	assert.equal(r.status, 409);
	assert.equal(r.body.error, NOT_READY);
	assert.deepEqual(calls, { probe: 0, render: 0 });
});

test("failed conversion -> 409 with its own sentence (retrying will never help); render never runs", async () => {
	const { deps, calls } = routeDeps({ owner: "m_alice", path: "/tmp/x.orig.mp4", ready: false, failed: true });
	const r = await handleCutRender({ member: alice, body, deps });
	assert.equal(r.status, 409);
	assert.match(r.body.error, /could not be prepared/);
	assert.equal(calls.render, 0);
});

test("ready -> the render runs (200)", async () => {
	const { deps, calls } = routeDeps({ owner: "m_alice", path: "/tmp/x.mp4", ready: true, failed: false });
	const r = await handleCutRender({ member: alice, body, deps });
	assert.equal(r.status, 200);
	assert.equal(calls.render, 1);
});

test("a store that does not report ready (older fakes) is not refused", async () => {
	const { deps, calls } = routeDeps({ owner: "m_alice", path: "/tmp/x.mp4" });
	const r = await handleCutRender({ member: alice, body, deps });
	assert.equal(r.status, 200);
	assert.equal(calls.render, 1);
});

test("someone else's not-ready video is still 403, so the 409 does not leak another member's state", async () => {
	const { deps, calls } = routeDeps({ owner: "m_alice", path: "/tmp/x.orig.mp4", ready: false });
	const r = await handleCutRender({ member: bob, body, deps });
	assert.equal(r.status, 403);
	assert.equal(calls.render, 0);
});

test("through the real adapter: a pending upload (publicVideo shape) reaches the route as 409; the same upload once ready renders", async () => {
	let rec = { id: "v1", by: "m_alice", ready: false, failed: false };
	const stores = { videos: { get: () => rec, fileFor: () => ({ file: "/tmp/x.orig.mp4" }) }, audio: { get: () => null, fileOf: () => "" } };
	let rendered = 0;
	const deps = makeCutDeps({ ...stores, outDir: "/tmp", renderJob: async () => { rendered++; return { outPath: "/tmp/cut_0123456789abcdef.mp4", seconds: 3 }; } });
	deps.probe = async () => ({ hasAudio: true, width: 540, height: 960, durationSec: 20 });
	const r1 = await handleCutRender({ member: alice, body, deps });
	assert.equal(r1.status, 409);
	assert.equal(rendered, 0);
	rec = { ...rec, ready: true };
	const r2 = await handleCutRender({ member: alice, body, deps });
	assert.equal(r2.status, 200);
	assert.equal(rendered, 1);
});
