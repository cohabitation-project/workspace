// handleCutRender -> real renderEditJob, with stores that have the SHAPES of commons/lib/videos.mjs and audio.mjs
// (owner is `by`, no path or size on videos.get) and a fake ffprobe/ffmpeg. Proves the wiring in route-wire.md.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleCutRender, _resetCutRouteState, _cutRouteState } from "./route.mjs";
import { makeCutDeps, parseProbe } from "./wire.mjs";
import { renderEditJob } from "./render-job.mjs";

const dir = mkdtempSync(join(tmpdir(), "cut-real-"));
const outDir = mkdtempSync(join(tmpdir(), "cut-real-out-"));
const vfile = join(dir, "vid_a.mp4"), afile = join(dir, "aud_1.mp3"), bfile = join(dir, "aud_2.mp3");
for (const f of [vfile, afile, bfile]) writeFileSync(f, "x");
test.after(() => { rmSync(dir, { recursive: true, force: true }); rmSync(outDir, { recursive: true, force: true }); });
test.beforeEach(() => _resetCutRouteState());

// store fakes in main's shapes
const videos = {
	get: (id) => (id === "vid_a" ? { id, by: "m_alice", url: `/videos/${id}`, seconds: null, alt: "", ready: true } : null),
	fileFor: (id) => (id === "vid_a" ? { file: vfile, type: "video/mp4" } : null),
};
const items = { aud_1: { id: "aud_1", ext: "mp3", by: "m_alice", title: "mine" }, aud_2: { id: "aud_2", ext: "mp3", by: "m_bob", title: "bobs" } };
const audio = { get: (id) => items[id] || null, fileOf: (it) => (it.id === "aud_1" ? afile : bfile) };

const probeJson = (over = {}) => JSON.stringify({
	streams: [{ codec_type: "video", width: 1080, height: 1920 }, { codec_type: "audio" }], format: { duration: "20.0" }, ...over,
});
function make({ json = probeJson(), fail = false, renderJob } = {}) {
	const seen = { ffprobe: [], run: [], jobs: [] };
	const execFileImpl = (file, args, o, cb) => { seen.ffprobe.push([file, ...args]); fail ? cb(new Error("boom")) : cb(null, json); };
	const deps = makeCutDeps({
		videos, audio, outDir, execFileImpl, ffprobe: "ffprobe", log: () => {},
		renderJob: renderJob || (async (job) => { seen.jobs.push(job); return renderEditJob({ ...job, run: (c, argv) => { seen.run.push(argv); return { status: 0, stderr: "", stdout: "" }; }, ffmpeg: "ffmpeg" }); }),
	});
	return { deps, seen };
}
const alice = { id: "m_alice" }, bob = { id: "m_bob" };
const edit = (o = {}) => ({ trimStart: 2, trimEnd: 6, coverSec: 3, ...o });

test("owner: 200; the video's file comes from fileFor, its size and audio from ffprobe, ffprobe is asked once", async () => {
	const { deps, seen } = make();
	const r = await handleCutRender({ member: alice, body: { videoId: "vid_a", edit: edit() }, deps });
	assert.equal(r.status, 200, JSON.stringify(r.json));
	assert.match(r.json.url, /^\/cut\/cut_[0-9a-f]{16}\.mp4$/);
	assert.equal(r.json.seconds, 4);
	assert.equal(seen.ffprobe.length, 1);
	assert.equal(seen.ffprobe[0].at(-1), vfile);
	assert.deepEqual([seen.jobs[0].video.width, seen.jobs[0].video.height, seen.jobs[0].video.durationSec, seen.jobs[0].video.hasAudio], [1080, 1920, 20, true]);
	assert.equal(seen.run.length, 1);
	assert.deepEqual(_cutRouteState(), { members: [], active: 0 });
});

test("stranger: 403, and ffprobe and ffmpeg are never started", async () => {
	const { deps, seen } = make();
	const r = await handleCutRender({ member: bob, body: { videoId: "vid_a", edit: edit() }, deps });
	assert.equal(r.status, 403);
	assert.equal(seen.ffprobe.length, 0);
	assert.equal(seen.run.length, 0);
});

test("a phone clip flagged as rotated 90 degrees is measured as the frame ffmpeg will see (1920x1080 -> 1080x1920)", () => {
	const p = parseProbe(JSON.stringify({ streams: [{ codec_type: "video", width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] }], format: { duration: "3" } }));
	assert.deepEqual([p.width, p.height, p.hasAudio], [1080, 1920, false]);
	const q = parseProbe(JSON.stringify({ streams: [{ codec_type: "video", width: 1920, height: 1080, tags: { rotate: "90" } }], format: { duration: "3" } }));
	assert.deepEqual([q.width, q.height], [1080, 1920]);
});

test("a video with no audio stream renders with hasAudio:false; no video stream / ffprobe failure is 422", async () => {
	const a = make({ json: probeJson({ streams: [{ codec_type: "video", width: 540, height: 960 }] }) });
	assert.equal((await handleCutRender({ member: alice, body: { videoId: "vid_a", edit: edit() }, deps: a.deps })).status, 200);
	assert.equal(a.seen.jobs[0].video.hasAudio, false);
	const b = make({ json: probeJson({ streams: [{ codec_type: "audio" }] }) });
	assert.equal((await handleCutRender({ member: alice, body: { videoId: "vid_a", edit: edit() }, deps: b.deps })).status, 422);
	const c = make({ fail: true });
	assert.equal((await handleCutRender({ member: alice, body: { videoId: "vid_a", edit: edit() }, deps: c.deps })).status, 422);
	assert.deepEqual(_cutRouteState(), { members: [], active: 0 });
});

test("music from the audio store: your own 200 (its file reaches ffmpeg), someone else's 403, unknown 404", async () => {
	const { deps, seen } = make();
	const go = (id) => handleCutRender({ member: alice, body: { videoId: "vid_a", edit: edit({ music: { id, volume: 0.5 } }) }, deps });
	assert.equal((await go("aud_1")).status, 200);
	assert.ok(seen.run[0].includes(afile));
	assert.equal((await go("aud_2")).status, 403);
	assert.equal((await go("aud_zzz")).status, 404);
	assert.equal(seen.run.length, 1);
});

test("the real child process: a bad edit comes back as 400 with the refusal text (type survives the fork); slots are released", async () => {
	const { deps } = make({ renderJob: undefined });
	delete deps.renderJob; // use wire.mjs's default forkRenderJob
	const d = makeCutDeps({ videos, audio, outDir, execFileImpl: (f, a, o, cb) => cb(null, probeJson()), log: () => {} });
	const r = await handleCutRender({ member: alice, body: { videoId: "vid_a", edit: edit({ trimStart: 5, trimEnd: 5 }) }, deps: d });
	assert.equal(r.status, 400, JSON.stringify(r.json));
	assert.match(r.json.error, /trim/i);
	assert.deepEqual(_cutRouteState(), { members: [], active: 0 });
});
