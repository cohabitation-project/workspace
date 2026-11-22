import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderEditJob, MAX_RENDER_SECONDS } from "./render-job.mjs";

const dir = mkdtempSync(join(tmpdir(), "cut-job-"));
const outDir = mkdtempSync(join(tmpdir(), "cut-out-"));
const vid = join(dir, "in.mp4");
const mus = join(dir, "song.mp3");
writeFileSync(vid, "x");
writeFileSync(mus, "y");
test.after(() => { rmSync(dir, { recursive: true, force: true }); rmSync(outDir, { recursive: true, force: true }); });

const video = (over = {}) => ({ path: vid, durationSec: 20, width: 540, height: 960, ...over });
const goodEdit = (over = {}) => ({ trimStart: 2, trimEnd: 6, coverSec: 3, ...over });
const ok = { status: 0, stderr: "", stdout: "" };
const fake = (calls = []) => (cmd, argv, opts) => { calls.push({ cmd, argv, opts }); return ok; };

test("a good edit runs ffmpeg once with the trim, the caption and the music; output is cut_<hex>.mp4 in outDir", () => {
	const calls = [];
	const res = renderEditJob({
		edit: goodEdit({ text: { body: "hello there", y: 540 }, music: { id: "m1", volume: 0.5 } }),
		video: video(), music: { path: mus }, outDir, run: fake(calls), ffmpeg: "ffmpeg",
	});
	assert.equal(calls.length, 1);
	const { argv } = calls[0];
	assert.equal(res.ok, true);
	assert.equal(res.seconds, 4);
	assert.match(res.outPath, /cut_[0-9a-f]{16}\.mp4$/);
	assert.equal(res.outPath.startsWith(outDir), true);
	assert.equal(argv.at(-1), res.outPath);
	assert.deepEqual(argv.filter((_, i) => argv[i - 1] === "-i"), [vid, mus]);
	const fc = argv[argv.indexOf("-filter_complex") + 1];
	assert.match(fc, /trim=start=2:end=6/);
	assert.match(fc, /drawtext=/);
	assert.match(fc, /volume=0.5/);
	assert.ok(!fc.includes(vid), "no path inside the filter string");
});

test("two renders get different file names", () => {
	const a = renderEditJob({ edit: goodEdit(), video: video(), outDir, run: fake() });
	const b = renderEditJob({ edit: goodEdit(), video: video(), outDir, run: fake() });
	assert.notEqual(a.outPath, b.outPath);
});

test("a hostile caption cannot add an input or a flag", () => {
	const calls = [];
	renderEditJob({ edit: goodEdit({ text: { body: "-i /etc/passwd -y ; rm -rf /" } }), video: video(), outDir, run: fake(calls) });
	const argv = calls[0].argv;
	assert.equal(argv.filter((a) => a === "-i").length, 1);
	assert.ok(!argv.some((a) => a.includes("/etc/passwd") && a !== argv[argv.indexOf("-filter_complex") + 1]));
});

test("refuses a trimmed length over 60 s; exactly 60 s is allowed", () => {
	let n = 0;
	const run = () => { n++; return ok; };
	assert.throws(() => renderEditJob({ edit: goodEdit({ trimStart: 0, trimEnd: 60.5, coverSec: 1 }), video: video({ durationSec: 120 }), outDir, run }), /limit is 60 s/);
	assert.equal(n, 0);
	const res = renderEditJob({ edit: goodEdit({ trimStart: 0, trimEnd: MAX_RENDER_SECONDS, coverSec: 1 }), video: video({ durationSec: 120 }), outDir, run });
	assert.equal(res.seconds, 60);
	assert.equal(n, 1);
});

test("refuses bad outDir, bad video and bad music paths before running anything", () => {
	let n = 0;
	const run = () => { n++; return ok; };
	const go = (o) => renderEditJob({ edit: goodEdit(), video: video(), outDir, run, ...o });
	assert.throws(() => go({ outDir: join(dir, "missing") }), /existing directory/);
	assert.throws(() => go({ outDir: vid }), /existing directory/, "a file is not a directory");
	assert.throws(() => go({ outDir: "relative/dir" }), /absolute/);
	assert.throws(() => go({ outDir: undefined }), /absolute/);
	assert.throws(() => go({ video: video({ path: "in.mp4" }) }), /video.path must be an absolute/);
	assert.throws(() => go({ video: video({ path: join(dir, "nope.mp4") }) }), /existing file/);
	assert.throws(() => go({ video: video({ path: dir }) }), /existing file/, "a directory is not a file");
	assert.throws(() => go({ video: video({ path: "/x\n-y" }) }), /single-line/);
	assert.throws(() => go({ video: undefined }), /video must be an object/);
	assert.throws(() => go({ edit: goodEdit({ music: { id: "m", volume: 1 } }), music: { path: "song.mp3" } }), /music.path must be an absolute/);
	assert.throws(() => go({ edit: goodEdit({ music: { id: "m", volume: 1 } }), music: { path: join(dir, "nope.mp3") } }), /existing file/);
	assert.throws(() => go({ edit: goodEdit({ music: { id: "m", volume: 1 } }), music: null }), /no music file/);
	assert.equal(n, 0, "ffmpeg never ran");
});

test("refuses bad video numbers; odd sizes round down to even", () => {
	let n = 0;
	const calls = [];
	const run = () => { n++; return ok; };
	const go = (v) => renderEditJob({ edit: goodEdit(), video: video(v), outDir, run });
	assert.throws(() => go({ durationSec: 0 }), /durationSec/);
	assert.throws(() => go({ durationSec: "20" }), /durationSec/);
	assert.throws(() => go({ width: 8 }), /video.width/);
	assert.throws(() => go({ height: 9000 }), /video.height/);
	assert.throws(() => go({ width: NaN }), /video.width/);
	assert.throws(() => go({ hasAudio: "yes" }), /hasAudio/);
	assert.equal(n, 0);
	renderEditJob({ edit: goodEdit(), video: video({ width: 541, height: 961 }), outDir, run: fake(calls) });
	assert.match(calls[0].argv[calls[0].argv.indexOf("-filter_complex") + 1], /scale=540:960/);
});

test("a bad edit is refused by editToTracks and ffmpeg never runs", () => {
	let n = 0;
	const run = () => { n++; return ok; };
	const bad = [
		goodEdit({ trimEnd: 2 }),
		goodEdit({ trimEnd: 99 }),
		goodEdit({ text: { body: "a\nb", y: 0 } }),
		goodEdit({ text: { body: "x".repeat(81), y: 0 } }),
		goodEdit({ music: { id: "m", volume: 2 } }),
		goodEdit({ coverSec: 10 }),
		null,
	];
	for (const edit of bad) assert.throws(() => renderEditJob({ edit, video: video(), music: { path: mus }, outDir, run }));
	assert.equal(n, 0);
});

test("music given but not asked for by the edit is ignored", () => {
	const calls = [];
	renderEditJob({ edit: goodEdit(), video: video(), music: { path: mus }, outDir, run: fake(calls) });
	assert.equal(calls[0].argv.filter((a) => a === "-i").length, 1);
});

test("a silent source (hasAudio false) gets generated silence in the graph", () => {
	const calls = [];
	renderEditJob({ edit: goodEdit(), video: video({ hasAudio: false }), outDir, run: fake(calls) });
	assert.match(calls[0].argv[calls[0].argv.indexOf("-filter_complex") + 1], /anullsrc/);
});

test("ffmpeg failure throws with the stderr tail and removes the half-written file", () => {
	let target;
	const run = (c, argv) => { target = argv.at(-1); writeFileSync(target, "partial"); return { status: 1, stderr: "boom: no such filter", stdout: "" }; };
	assert.throws(() => renderEditJob({ edit: goodEdit(), video: video(), outDir, run }), /ffmpeg exited with 1[\s\S]*boom: no such filter/);
	assert.ok(target);
	assert.equal(existsSync(target), false);
});

const FF = process.env.FFMPEG || (spawnSync("ffmpeg", ["-version"]).status === 0 ? "ffmpeg" : null);

test("real ffmpeg: a 3 s clip trimmed 0.5..1.5 with a caption comes out about 1 s", { skip: !FF && "no ffmpeg" }, () => {
	const src = join(dir, "real.mp4");
	const mk = spawnSync(FF, ["-y", "-f", "lavfi", "-i", "testsrc=duration=3:size=320x240:rate=30", "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-shortest", "-pix_fmt", "yuv420p", src], { encoding: "utf8" });
	assert.equal(mk.status, 0, mk.stderr?.slice(-300));
	const res = renderEditJob({
		edit: { trimStart: 0.5, trimEnd: 1.5, coverSec: 1, text: { body: "hi there", y: 0 } },
		video: { path: src, durationSec: 3, width: 270, height: 480, hasAudio: true },
		outDir, ffmpeg: FF,
	});
	assert.equal(res.ok, true);
	assert.ok(existsSync(res.outPath));
	const info = spawnSync(FF, ["-i", res.outPath], { encoding: "utf8" }).stderr;
	const m = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(info);
	assert.ok(m, info.slice(-300));
	const secs = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
	assert.ok(Math.abs(secs - 1) < 0.15, `duration ${secs}`);
	assert.match(info, /Video: h264/);
	assert.match(info, /Audio: aac/);
	assert.equal(readdirSync(outDir).filter((f) => f === res.outPath.split("/").pop()).length, 1);
});
