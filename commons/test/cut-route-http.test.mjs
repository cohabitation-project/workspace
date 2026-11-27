// Cohabi Cut, Job 4 round 10: the booted-server proof for POST /api/cut/render.
//
// Boots the REAL commons/server.mjs in a child process, with route-wire.md's four-place hunk applied to a TEMP COPY of
// server.mjs (main's file is never touched), then talks to it over HTTP: sign two members up, upload a video as the first,
// and POST /api/cut/render. No ffmpeg and no ffprobe are needed: the temp server is given one extra import
// (cut-http-inject: a fake ffprobe reply and a renderJob that runs the real renderEditJob with a fake `run` that writes
// the output file), spread into makeCutDeps. Everything else is the hunk exactly: real routes, real stores, real
// houseWriter auth, real handleCutRender, real express.static mount, real nosniff header.
//
// Placed at commons/test/cut-route-http.test.mjs. Temp files (commons/server.cut-http-<pid>.tmp.mjs and the inject
// module) are removed in `finally`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { freePort } from "./lib/port.mjs";

const COMMONS = path.resolve(import.meta.dirname, "..");
const SERVER = path.join(COMMONS, "server.mjs");

// The hunk, exactly as teams/cut/editor/route-wire.md lists it (A, B, C, D).
const HUNK = {
	A: [
		"import { handleCutRender } from './lib/cut/route.mjs';",
		"import { makeCutDeps } from './lib/cut/wire.mjs';",
		"import { sweepRenders } from './lib/cut/cleanup.mjs';",
	],
	B: [
		"const CUT_OUT = path.join(DATA, 'cut'); fs.mkdirSync(CUT_OUT, { recursive: true }); const cutDeps = makeCutDeps({ videos, audio, outDir: CUT_OUT, log: (m) => console.error('[cut]', m) });",
		"const cutSweep = () => sweepRenders(CUT_OUT).catch((e) => console.error('[cut] sweep', e.message)); cutSweep(); setInterval(cutSweep, 3600_000).unref();",
	],
	C: [
		"app.post('/api/cut/render', wrap(async (req, res) => { const r = await handleCutRender({ member: houseWriter(req), body: req.body || {}, deps: cutDeps }); res.status(r.status); return r.json; }));",
	],
	// (E) round 13: the editor folder (commons/public/cut/: cut.html, cut.js, cut.css) mounted at /cut BEFORE the renders mount (D),
	// with cut.html as its index, so /cut -> /cut/ -> the page and ./cut.js resolves to /cut/cut.js. Same dotfile rule as D.
	E: [
		"app.use('/cut', express.static(path.join(PUBLIC, 'cut'), { index: 'cut.html', dotfiles: 'deny', maxAge: '5m' }));",
	],
	D: [
		"app.use('/cut', express.static(CUT_OUT, { index: false, dotfiles: 'deny', maxAge: '5m' }));",
	],
};
// The ONE addition the test makes to the hunk: the inject module is imported and spread first into makeCutDeps.
const INJECT_IMPORT = "import CUT_TEST_INJECT from './cut-http-inject.tmp.mjs';";
const B_ORIG = "makeCutDeps({ videos, audio, outDir: CUT_OUT,";
const B_INJECTED = "makeCutDeps({ ...CUT_TEST_INJECT, videos, audio, outDir: CUT_OUT,";

// Insert `lines` after the single line of `src` that starts with `anchor`.
function insertAfter(src, anchor, lines) {
	const rows = src.split("\n");
	const at = rows.reduce((a, r, i) => (r.startsWith(anchor) ? [...a, i] : a), []);
	assert.equal(at.length, 1, `anchor ${JSON.stringify(anchor)} must appear exactly once at the start of a line in server.mjs, found ${at.length}`);
	rows.splice(at[0] + 1, 0, ...lines);
	return rows.join("\n");
}

// Round 13: once placement.patch is applied, server.mjs ALREADY holds the hunk. Then the test must not insert it a second
// time (that is "Identifier 'handleCutRender' has already been declared"); it boots the file as it is, adding only the
// test's own injection (one import + the spread into makeCutDeps).
export const isPlaced = (src) => src.includes("handleCutRender");

export function applyHunk(src) {
	if (isPlaced(src)) {
		const rows = src.split("\n");
		for (const l of [...HUNK.A, ...HUNK.B, ...HUNK.C, ...HUNK.E, ...HUNK.D]) assert.equal(rows.filter((x) => x === l).length, 1, `server.mjs is already placed but does not hold this hunk line exactly once: ${l.slice(0, 70)}`);
		assert.ok(rows.indexOf(HUNK.E[0]) < rows.indexOf(HUNK.D[0]), "the editor mount (E) must come BEFORE the renders mount (D), or /cut/ would never reach the page");
		let s = insertAfter(src, HUNK.A[2], [INJECT_IMPORT]);
		assert.equal(s.split(B_ORIG).length - 1, 1, "makeCutDeps( call to spread the inject into appears once");
		return s.replace(B_ORIG, B_INJECTED);
	}
	let s = insertAfter(src, "import * as stock from './lib/stock.mjs';", [...HUNK.A, INJECT_IMPORT]);
	s = insertAfter(s, "videos.init(DATA);", HUNK.B.map((l) => l.replace(B_ORIG, B_INJECTED)));
	s = insertAfter(s, "app.delete('/api/videos/:id'", HUNK.C);
	s = insertAfter(s, "app.get('/videos/:id/poster.jpg'", [...HUNK.E, ...HUNK.D]);
	return s;
}

const INJECT_SRC = `
import fs from 'node:fs';
import path from 'node:path';
import { renderEditJob } from './lib/cut/render-job.mjs';
const LOG = process.env.CUT_HTTP_LOG, GATE = process.env.CUT_HTTP_GATE;
const note = (o) => fs.appendFileSync(LOG, JSON.stringify(o) + '\\n');
export default {
  ffprobe: 'ffprobe-fake',
  execFileImpl: (file, args, o, cb) => { note({ kind: 'ffprobe', file, args }); cb(null, JSON.stringify({ streams: [{ codec_type: 'video', width: 1080, height: 1920 }, { codec_type: 'audio' }], format: { duration: '20.0' } })); },
  renderJob: async (job) => {
    note({ kind: 'job', video: job.video, outDir: job.outDir });
    while (fs.existsSync(GATE)) await new Promise((r) => setTimeout(r, 25));
    return renderEditJob({ ...job, ffmpeg: 'ffmpeg-fake', run: (cmd, argv) => { note({ kind: 'ffmpeg', cmd, argv }); fs.writeFileSync(argv[argv.length - 1], 'FAKE-MP4-BYTES'); return { status: 0, stdout: '', stderr: '' }; } });
  },
};
`;

test("applyHunk puts all four pieces in, once each, and leaves every other line of server.mjs alone", () => {
	const src = fs.readFileSync(SERVER, "utf8");
	const out = applyHunk(src);
	const a = src.split("\n"), b = out.split("\n");
	const placed = isPlaced(src);
	// unplaced: 8 hunk lines (A 3, B 2, C 1, E 1, D 1) + the inject import. placed: the inject import only.
	assert.equal(b.length, a.length + (placed ? 1 : 3 + 2 + 1 + 1 + 1 + 1), placed ? "placed: only the inject import is added" : "8 hunk lines + the inject import");
	for (const l of [...HUNK.A, ...HUNK.C, ...HUNK.E, ...HUNK.D]) assert.equal(out.split("\n").filter((x) => x === l).length, 1, l.slice(0, 60));
	assert.ok(b.indexOf(HUNK.E[0]) < b.indexOf(HUNK.D[0]), "E before D");
	// removing the inserted lines gives main's file back byte for byte (placed: the file as it was, minus nothing but the inject)
	const inj = HUNK.B.map((l) => l.replace(B_ORIG, B_INJECTED));
	if (placed) assert.equal(out.replace(INJECT_IMPORT + "\n", "").replace(B_INJECTED, B_ORIG), src, "placed: removing the injection gives server.mjs back byte for byte");
	else {
		const added = new Set([...HUNK.A, INJECT_IMPORT, ...inj, ...HUNK.C, ...HUNK.E, ...HUNK.D]);
		assert.equal(b.filter((l) => !added.has(l)).join("\n"), src);
	}
	assert.equal(out.split(B_INJECTED).length - 1, 1, "the inject spread appears once");
});

test("the placed-versus-unplaced switch: a server.mjs that already holds the hunk is not given it twice; an unplaced one gets all of it", () => {
	const unplaced = ["import * as stock from './lib/stock.mjs';", "videos.init(DATA);", "app.delete('/api/videos/:id', x);", "app.get('/videos/:id/poster.jpg', y);"].join("\n");
	assert.equal(isPlaced(unplaced), false);
	const once = applyHunk(unplaced);
	assert.equal(isPlaced(once), true);
	// strip the injection to get what placement.patch would leave behind, then boot-as-is must add only the injection
	const placedSrc = once.replace(INJECT_IMPORT + "\n", "").replace(B_INJECTED, B_ORIG);
	const again = applyHunk(placedSrc);
	assert.equal(again.split("\n").length, placedSrc.split("\n").length + 1);
	assert.equal(again.split("import { handleCutRender }").length - 1, 1, "handleCutRender is imported once, not twice");
	// a half-placed file (the route but not the editor mount) is refused loudly, not silently doubled
	assert.throws(() => applyHunk(placedSrc.replace(HUNK.E[0] + "\n", "")), /already placed but does not hold/);
	// and the order is checked: D before E is refused
	const swapped = placedSrc.replace(HUNK.E[0] + "\n" + HUNK.D[0], HUNK.D[0] + "\n" + HUNK.E[0]);
	assert.notEqual(swapped, placedSrc);
	assert.throws(() => applyHunk(swapped), /BEFORE the renders mount/);
});

test("the hunk in this test is the hunk in route-wire.md (skipped when that note is not in the checkout)", { skip: !fs.existsSync(path.join(COMMONS, "..", "teams/cut/editor/route-wire.md")) }, () => {
	const md = fs.readFileSync(path.join(COMMONS, "..", "teams/cut/editor/route-wire.md"), "utf8");
	for (const l of [...HUNK.A, ...HUNK.B, ...HUNK.C, ...HUNK.E, ...HUNK.D]) assert.ok(md.includes(l), `route-wire.md lacks: ${l.slice(0, 70)}`);
});

test("booted server: owner renders (200, cut_<16hex>.mp4, served with nosniff); signed-out 401; stranger 403; unknown 404; bad edit 400; second export 429", async () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cut-http-"));
	const D = path.join(tmp, "data"); fs.mkdirSync(D);
	const LOG = path.join(tmp, "log.jsonl"), GATE = path.join(tmp, "gate");
	const serverCopy = path.join(COMMONS, `server.cut-http-${process.pid}.tmp.mjs`);
	const injectCopy = path.join(COMMONS, "cut-http-inject.tmp.mjs");
	const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
	let srv, stderr = "";
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	const lines = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
	const call = async (url, { method = "GET", member, body, raw, type, timeoutMs = 20000 } = {}) => {
		const headers = { "x-commons": "1" };
		if (member?.cookie) headers.cookie = member.cookie;
		let payload;
		if (raw !== undefined) { headers["content-type"] = type; payload = raw; } else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
		// a request that is never answered fails the test in `timeoutMs` instead of hanging it
		const r = await fetch(B + url, { method, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
		const text = await r.text();
		let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
		return { r, text, json };
	};
	const signup = async (name) => {
		const r = await fetch(`${B}/api/humans`, { method: "POST", headers: { "content-type": "application/json", "x-commons": "1" }, body: JSON.stringify({ name }) });
		const j = await r.json().catch(() => ({}));
		assert.equal(r.status, 201, `${name} signs up: ${JSON.stringify(j)}`);
		return { cookie: (r.headers.get("set-cookie") || "").split(";")[0], j };
	};
	try {
		fs.writeFileSync(injectCopy, INJECT_SRC);
		fs.writeFileSync(serverCopy, applyHunk(fs.readFileSync(SERVER, "utf8")));
		// FFMPEG/FFPROBE point nowhere ON PURPOSE (this test's header: "No ffmpeg and no ffprobe are needed").
		// With a real ffmpeg on the machine, the store converts the stand-in upload, marks it failed, and the route's
		// 409 readiness guard (Cut round 42) rightly refuses it — green on ffmpeg-less CI, red on a dev box. Without
		// ffmpeg the store serves the original and publicVideo reports ready, which is the path this test means to prove.
		srv = spawn(process.execPath, [serverCopy], { env: { ...process.env, FFMPEG: "/nonexistent-ffmpeg", FFPROBE: "/nonexistent-ffprobe", ASHRAM_PORT: String(PORT), COMMONS_DATA: D, CUT_HTTP_LOG: LOG, CUT_HTTP_GATE: GATE }, stdio: ["ignore", "ignore", "pipe"] });
		srv.stderr.on("data", (d) => { stderr = (stderr + d).slice(-4000); });
		let ready = false;
		for (let i = 0; i < 80 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
		assert.ok(ready, `the patched server started. stderr tail: ${stderr}`);
		assert.ok(fs.existsSync(path.join(D, "cut")), "hunk (B) made the cut output directory");

		const alice = await signup("Cut Alice"), bob = await signup("Cut Bob");
		const up = await call("/api/videos", { method: "POST", member: alice, raw: Buffer.from("not really a video, a stand-in file"), type: "video/mp4" });
		assert.equal(up.r.status, 201, `alice uploads a video: ${up.text}`);
		const vid = up.json.id;
		assert.match(vid, /^vid_[0-9a-f]{16}$/);
		const edit = { trimStart: 2, trimEnd: 6, coverSec: 3, text: { body: "Hello Cut", y: 0 } };

		// signed out: 401 and nothing started
		const out = await call("/api/cut/render", { method: "POST", body: { videoId: vid, edit } });
		assert.equal(out.r.status, 401, out.text);
		assert.equal(lines().length, 0, "a signed-out POST starts no probe and no render");

		// someone else's video: 403, and ffprobe/ffmpeg are never started
		const stranger = await call("/api/cut/render", { method: "POST", member: bob, body: { videoId: vid, edit } });
		assert.equal(stranger.r.status, 403, stranger.text);
		assert.match(stranger.json.error, /not yours/);
		assert.equal(lines().length, 0, "a stranger's POST starts no probe and no render");

		// unknown id: 404
		const nope = await call("/api/cut/render", { method: "POST", member: alice, body: { videoId: "vid_0000000000000000", edit } });
		assert.equal(nope.r.status, 404, nope.text);

		// a refused edit: 400 with the refusal's own words, and no ffmpeg
		const bad = await call("/api/cut/render", { method: "POST", member: alice, body: { videoId: vid, edit: { ...edit, trimStart: 5, trimEnd: 5 } } });
		assert.equal(bad.r.status, 400, bad.text);
		assert.match(bad.json.error, /trimEnd/);
		assert.equal(lines().filter((l) => l.kind === "ffmpeg").length, 0);

		// the owner: 200 and a cut_<16hex>.mp4 path
		const ok = await call("/api/cut/render", { method: "POST", member: alice, body: { videoId: vid, edit } });
		assert.equal(ok.r.status, 200, ok.text + stderr);
		assert.equal(ok.json.ok, true);
		assert.match(ok.json.url, /^\/cut\/cut_[0-9a-f]{16}\.mp4$/);
		assert.equal(ok.json.seconds, 4);
		const log = lines();
		const probe = log.find((l) => l.kind === "ffprobe"), job = log.find((l) => l.kind === "job"), ff = log.find((l) => l.kind === "ffmpeg");
		assert.ok(probe && job && ff, "the route probed, then rendered, then ran ffmpeg (fake)");
		assert.ok(probe.args.at(-1).startsWith(path.join(D, "videos", vid)), "ffprobe was asked about the member's own stored file: " + probe.args.at(-1));
		assert.deepEqual([job.video.width, job.video.height, job.video.durationSec, job.video.hasAudio], [1080, 1920, 20, true], "size and audio come from the probe, not the store");
		assert.equal(job.outDir, path.join(D, "cut"));
		assert.ok(ff.argv.includes(job.video.path), "the uploaded file is ffmpeg's input");
		assert.ok(ff.argv.join(" ").includes("Hello Cut"), "the caption text reached the ffmpeg argv");

		// the returned URL is served: bytes, nosniff, an mp4 type, and it is the file the fake ffmpeg wrote
		const got = await fetch(B + ok.json.url);
		assert.equal(got.status, 200);
		assert.equal(await got.text(), "FAKE-MP4-BYTES");
		assert.equal(got.headers.get("x-content-type-options"), "nosniff");
		assert.match(got.headers.get("content-type") || "", /video\/mp4/);
		// the static mount lists nothing and refuses dotfiles. /cut/ is the EDITOR PAGE (hunk E), not a listing of renders.
		const slash = await fetch(B + "/cut/");
		assert.equal(slash.status, 200, "/cut/ serves the editor page");
		assert.match(slash.headers.get("content-type") || "", /text\/html/);
		assert.equal((await slash.text()).includes("cut_"), false, "no directory listing");
		assert.notEqual((await fetch(B + "/cut/.hidden")).status, 200);

		// one export at a time: with the gate shut, alice's first render waits, her second is 429, and releasing the gate lets the first finish with 200
		fs.writeFileSync(GATE, "");
		const before = lines().filter((l) => l.kind === "job").length;
		const first = call("/api/cut/render", { method: "POST", member: alice, body: { videoId: vid, edit } });
		for (let i = 0; i < 80 && lines().filter((l) => l.kind === "job").length === before; i++) await sleep(50);
		assert.equal(lines().filter((l) => l.kind === "job").length, before + 1, "the first render has started and is held at the gate");
		const second = await call("/api/cut/render", { method: "POST", member: alice, body: { videoId: vid, edit }, timeoutMs: 5000 }).catch((e) => assert.fail(`the second export was not refused, it waited behind the first (${e.name})`));
		assert.equal(second.r.status, 429, second.text);
		assert.match(second.json.error, /one export at a time/);
		// while it waits, the server still answers other requests (the event loop is free)
		assert.equal((await fetch(`${B}/skill.md`)).status, 200);
		fs.rmSync(GATE);
		const done = await first;
		assert.equal(done.r.status, 200, done.text);
		assert.match(done.json.url, /^\/cut\/cut_[0-9a-f]{16}\.mp4$/);
		assert.notEqual(done.json.url, ok.json.url, "each export gets its own random name");
		// the slot is free again afterwards
		assert.equal((await call("/api/cut/render", { method: "POST", member: alice, body: { videoId: vid, edit } })).r.status, 200);
	} finally {
		if (srv) { srv.kill(); await sleep(100); }
		for (const f of [serverCopy, injectCopy]) fs.rmSync(f, { force: true });
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});
