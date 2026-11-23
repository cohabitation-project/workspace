import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderTimeline, buildFfmpegArgs, VIDEO_CODEC_ARGS } from "../lib/cut/render-edit.mjs";
import { RenderPlanError } from "../lib/cut/plan.mjs";

const TPS = 120000;
const clip = (over = {}) => ({
	id: "c1", type: "video", startTime: 0, duration: TPS, trimStart: 0, params: { src: "/srv/media/in.mp4" }, ...over,
});
const tracks = (over = {}) => ({ main: { id: "m", type: "video", elements: [clip(over)] }, overlay: [], audio: [] });
const ok = (status = 0, stderr = "") => ({ status, stderr, stdout: "" });

test("runs ffmpeg with an argv array: -y, plan args, codec args, outPath last", () => {
	const calls = [];
	const res = renderTimeline({
		tracks: tracks(), sources: { "/srv/media/in.mp4": { hasAudio: true } }, width: 540, height: 960,
		outPath: "/tmp/out.mp4", ffmpeg: "ffmpeg", run: (cmd, argv, opts) => { calls.push({ cmd, argv, opts }); return ok(); },
	});
	assert.equal(calls.length, 1);
	const { cmd, argv, opts } = calls[0];
	assert.equal(cmd, "ffmpeg");
	assert.ok(Array.isArray(argv));
	assert.equal(argv[0], "-y");
	assert.deepEqual(argv.slice(1, 3), ["-i", "/srv/media/in.mp4"]);
	assert.equal(argv[3], "-filter_complex");
	assert.match(argv[4], /trim=start=0:end=1/);
	assert.match(argv[4], /scale=540:960/);
	assert.deepEqual(argv.slice(5, 9), ["-map", "[vout]", "-map", "[aout]"]);
	assert.deepEqual(argv.slice(9, 9 + VIDEO_CODEC_ARGS.length), ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"]);
	assert.equal(argv.at(-1), "/tmp/out.mp4");
	assert.equal(opts.encoding, "utf8");
	assert.deepEqual(res, { ok: true, outPath: "/tmp/out.mp4", durationTicks: TPS, ignored: [] });
});

test("the music input is passed as a second -i and the result reports ignored overlay tracks", () => {
	let seen;
	const t = tracks();
	t.audio = [{ id: "a", type: "audio", elements: [{ id: "mu", type: "audio", startTime: 0, duration: TPS, trimStart: 0, params: { src: "/srv/media/song.mp3", volume: 0.5 } }] }];
	t.overlay = [{ id: "ov", type: "sticker", elements: [{ id: "s1" }] }];
	const res = renderTimeline({ tracks: t, outPath: "/tmp/o.mp4", run: (c, argv) => { seen = argv; return ok(); } });
	assert.deepEqual(seen.filter((_, i) => seen[i - 1] === "-i"), ["/srv/media/in.mp4", "/srv/media/song.mp3"]);
	assert.equal(res.ignored.length, 1);
	assert.equal(res.ignored[0].elementId, "s1");
});

test("ffmpeg exit != 0 throws with the last 20 stderr lines only", () => {
	const stderr = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
	assert.throws(
		() => renderTimeline({ tracks: tracks(), outPath: "/tmp/o.mp4", run: () => ok(1, stderr) }),
		(e) => {
			assert.match(e.message, /exited with 1/);
			assert.match(e.message, /line 30$/);
			assert.match(e.message, /line 11\b/);
			assert.doesNotMatch(e.message, /line 10\b/);
			return true;
		},
	);
});

test("a failed spawn, a timeout and a signal each throw a clear message", () => {
	const mk = (r) => () => renderTimeline({ tracks: tracks(), outPath: "/tmp/o.mp4", run: () => r });
	assert.throws(mk({ error: Object.assign(new Error("spawn ffmpeg ENOENT"), { code: "ENOENT" }), status: null }), /could not start \(ENOENT\)/);
	assert.throws(mk({ error: Object.assign(new Error("t"), { code: "ETIMEDOUT" }), status: null }), /timed out/);
	assert.throws(mk({ status: null, signal: "SIGKILL", stderr: "x" }), /signal SIGKILL/);
	assert.throws(mk(undefined), /exited with unknown/);
});

test("planner refusals propagate as RenderPlanError and ffmpeg is never run", () => {
	let ran = false;
	assert.throws(
		() => renderTimeline({ tracks: tracks({ duration: 0 }), outPath: "/tmp/o.mp4", run: () => { ran = true; return ok(); } }),
		RenderPlanError,
	);
	assert.throws(
		() => renderTimeline({ tracks: { main: { id: "m", elements: [] } }, outPath: "/tmp/o.mp4", run: () => { ran = true; return ok(); } }),
		RenderPlanError,
	);
	assert.equal(ran, false);
});

test("outPath that is empty, multi-line, or looks like an option is refused before running", () => {
	let ran = false;
	for (const outPath of [undefined, "", "a\nb", "-f", 42]) {
		assert.throws(() => renderTimeline({ tracks: tracks(), outPath, run: () => { ran = true; return ok(); } }), TypeError);
	}
	assert.equal(ran, false);
	assert.throws(() => buildFfmpegArgs({ args: [] }, "-x"), TypeError);
});

const have = (bin) => { const r = spawnSync(bin, ["-version"], { encoding: "utf8" }); return !r.error && r.status === 0; };
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = process.env.FFPROBE || "ffprobe";
const real = have(FFMPEG);
// ffprobe when present; otherwise the "Duration: hh:mm:ss.xx" line that `ffmpeg -i` prints on stderr.
function durationOf(file) {
	if (have(FFPROBE)) {
		const p = spawnSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
		return Number(p.stdout.trim());
	}
	const p = spawnSync(FFMPEG, ["-i", file], { encoding: "utf8" });
	const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(p.stderr);
	return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : NaN;
}

test("real ffmpeg: a clip with audio plus a music element renders 1.0 s with a video and an audio stream", { skip: real ? false : "ffmpeg not available" }, () => {
	const dir = mkdtempSync(join(tmpdir(), "cut-render-edit-"));
	try {
		const src = join(dir, "in.mp4");
		const song = join(dir, "song.wav");
		const g1 = spawnSync(FFMPEG, ["-y", "-f", "lavfi", "-i", "testsrc=d=2:s=320x240:r=30", "-f", "lavfi", "-i", "sine=f=440:d=2", "-shortest", "-pix_fmt", "yuv420p", "-c:a", "aac", src], { encoding: "utf8" });
		const g2 = spawnSync(FFMPEG, ["-y", "-f", "lavfi", "-i", "sine=f=880:d=3", song], { encoding: "utf8" });
		assert.equal(g1.status, 0, g1.stderr?.split("\n").slice(-5).join("\n"));
		assert.equal(g2.status, 0);
		const t = tracks({ params: { src } });
		t.audio = [{ id: "a", type: "audio", elements: [{ id: "mu", type: "audio", startTime: 0, duration: TPS, trimStart: 0, params: { src: song, volume: 0.4, fadeOut: 0.25 } }] }];
		const out = join(dir, "out.mp4");
		renderTimeline({ tracks: t, sources: { [src]: { hasAudio: true } }, width: 320, height: 240, outPath: out, ffmpeg: FFMPEG });
		assert.ok(Math.abs(durationOf(out) - 1.0) <= 0.1);
		const info = spawnSync(FFMPEG, ["-i", out], { encoding: "utf8" }).stderr;
		assert.match(info, /Stream #0:\d.*Video: h264/);
		assert.match(info, /Stream #0:\d.*Audio: aac/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("real ffmpeg: a 2 s testsrc clip trimmed to 1 s renders a 1.0 +/- 0.1 s file", { skip: real ? false : "ffmpeg not available" }, () => {
	const dir = mkdtempSync(join(tmpdir(), "cut-render-edit-"));
	try {
		const src = join(dir, "in.mp4");
		const gen = spawnSync(FFMPEG, ["-y", "-f", "lavfi", "-i", "testsrc=d=2:s=320x240:r=30", "-pix_fmt", "yuv420p", src], { encoding: "utf8" });
		assert.equal(gen.status, 0, gen.stderr?.split("\n").slice(-5).join("\n"));
		const out = join(dir, "out.mp4");
		const res = renderTimeline({
			tracks: tracks({ duration: TPS, trimStart: 0, params: { src } }),
			sources: { [src]: { hasAudio: false } }, width: 320, height: 240, outPath: out, ffmpeg: FFMPEG,
		});
		assert.equal(res.ok, true);
		assert.equal(res.durationTicks, TPS);
		assert.ok(existsSync(out));
		const dur = durationOf(out);
		assert.ok(Math.abs(dur - 1.0) <= 0.1, `duration ${dur}`);
		console.log("ffmpeg:", spawnSync(FFMPEG, ["-version"], { encoding: "utf8" }).stdout.split("\n")[0], "| output duration", dur);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
