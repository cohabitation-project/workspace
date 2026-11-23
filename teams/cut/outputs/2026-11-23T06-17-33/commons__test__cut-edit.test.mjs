import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editToTracks, coverOffsetSec, TICKS_PER_SECOND } from "../lib/cut/edit.mjs";
import { buildRenderPlan } from "../lib/cut/plan.mjs";
import { renderTimeline } from "../lib/cut/render-edit.mjs";

const O = { durationSec: 10, width: 1080, height: 1920 };
const good = () => ({ trimStart: 2, trimEnd: 6, text: { body: "Hello, it's 100%: a, b", y: 540 }, music: { id: "trk-1", volume: 0.5 }, coverSec: 3 });

test("refuses trimEnd <= trimStart", () => {
	assert.throws(() => editToTracks({ ...good(), trimEnd: 2 }, O), /greater than trimStart/);
	assert.throws(() => editToTracks({ ...good(), trimEnd: 1 }, O), /greater than trimStart/);
});

test("refuses a trim outside 0..durationSec", () => {
	assert.throws(() => editToTracks({ ...good(), trimStart: -1, coverSec: 3 }, O), /within 0\.\.10/);
	assert.throws(() => editToTracks({ ...good(), trimEnd: 10.5 }, O), /within 0\.\.10/);
});

test("refuses non-numbers and non-objects", () => {
	assert.throws(() => editToTracks(null, O), /object/);
	assert.throws(() => editToTracks({ ...good(), trimStart: "2" }, O), /finite number/);
	assert.throws(() => editToTracks({ ...good(), trimEnd: NaN }, O), /finite number/);
	assert.throws(() => editToTracks(good(), { ...O, durationSec: 0 }), /greater than 0/);
});

test("refuses text over 80 characters, a newline, or a control character", () => {
	assert.throws(() => editToTracks({ ...good(), text: { body: "x".repeat(81), y: 0 } }, O), /at most 80/);
	assert.throws(() => editToTracks({ ...good(), text: { body: "a\nb", y: 0 } }, O), /one line/);
	assert.throws(() => editToTracks({ ...good(), text: { body: "a\u0000b", y: 0 } }, O), /one line/);
	assert.throws(() => editToTracks({ ...good(), text: { body: 5, y: 0 } }, O), /string/);
	// exactly 80 characters is allowed
	assert.doesNotThrow(() => editToTracks({ ...good(), text: { body: "i".repeat(80), y: 0 } }, O));
});

test("refuses a text line that cannot fit the frame width, or that leaves the frame vertically", () => {
	assert.throws(() => editToTracks({ ...good(), text: { body: "W".repeat(80), y: 0 } }, { ...O, width: 360, height: 640 }), /too long to fit/);
	assert.throws(() => editToTracks({ ...good(), text: { body: "hi", y: 99999 } }, O), /leave the/);
	assert.throws(() => editToTracks({ ...good(), text: { body: "hi", y: Infinity } }, O), /finite/);
});

test("refuses music volume outside 0..1 and a bad music id", () => {
	assert.throws(() => editToTracks({ ...good(), music: { id: "a", volume: 1.01 } }, O), /0 to 1/);
	assert.throws(() => editToTracks({ ...good(), music: { id: "a", volume: -0.1 } }, O), /0 to 1/);
	assert.throws(() => editToTracks({ ...good(), music: { id: "a", volume: "0.5" } }, O), /finite number/);
	assert.throws(() => editToTracks({ ...good(), music: { id: "", volume: 0.5 } }, O), /music\.id/);
	assert.doesNotThrow(() => editToTracks({ ...good(), music: { id: "a", volume: 0 } }, O));
	assert.doesNotThrow(() => editToTracks({ ...good(), music: { id: "a", volume: 1 } }, O));
});

test("refuses coverSec outside the trimmed range (inclusive ends are allowed)", () => {
	assert.throws(() => editToTracks({ ...good(), coverSec: 1.9 }, O), /trimmed range/);
	assert.throws(() => editToTracks({ ...good(), coverSec: 6.1 }, O), /trimmed range/);
	assert.throws(() => editToTracks({ ...good(), coverSec: undefined }, O), /finite number/);
	assert.doesNotThrow(() => editToTracks({ ...good(), coverSec: 2 }, O));
	assert.doesNotThrow(() => editToTracks({ ...good(), coverSec: 6 }, O));
	assert.equal(coverOffsetSec(good()), 1);
});

test("a good edit: integer ticks, the right trim, text and music elements, and buildRenderPlan accepts it", () => {
	const tracks = editToTracks(good(), { ...O, videoSrc: "/srv/v/1.mp4", musicSrc: "/srv/m/1.mp3" });
	const clip = tracks.main.elements[0];
	assert.equal(clip.trimStart, 2 * TICKS_PER_SECOND);
	assert.equal(clip.duration, 4 * TICKS_PER_SECOND);
	assert.equal(clip.params.src, "/srv/v/1.mp4");
	for (const n of [clip.startTime, clip.duration, clip.trimStart, clip.sourceDuration]) assert.ok(Number.isInteger(n));
	const words = tracks.overlay[0].elements[0];
	assert.equal(words.params.content, "Hello, it's 100%: a, b");
	assert.equal(words.duration, clip.duration);
	assert.ok(words.params["transform.positionX"] >= 0 && words.params["transform.positionY"] >= 0);
	const music = tracks.audio[0].elements[0];
	assert.deepEqual([music.params.src, music.params.volume, music.duration], ["/srv/m/1.mp3", 0.5, clip.duration]);
	const plan = buildRenderPlan({ tracks, width: 1080, height: 1920 });
	assert.equal(plan.durationTicks, 4 * TICKS_PER_SECOND);
	assert.deepEqual(plan.ignored, []);
	assert.match(plan.filterComplex, /trim=start=2:end=6/);
	assert.match(plan.filterComplex, /volume=0\.5/);
});

test("no text and no music: only the main clip; blank text body draws nothing", () => {
	const a = editToTracks({ trimStart: 0, trimEnd: 3, coverSec: 0 }, O);
	assert.deepEqual([a.overlay.length, a.audio.length, a.main.elements.length], [0, 0, 1]);
	const b = editToTracks({ trimStart: 0, trimEnd: 3, coverSec: 1, text: { body: "   ", y: 0 } }, O);
	assert.equal(b.overlay.length, 0);
	assert.doesNotThrow(() => buildRenderPlan({ tracks: a }));
});

test("caption placement: middle is centred, top is above middle, bottom below; a long line gets a smaller font", () => {
	const at = (y, body = "Hello") => editToTracks({ ...good(), text: { body, y } }, O).overlay[0].elements[0].params;
	const mid = at(0), top = at(-540), bot = at(540);
	assert.ok(top["transform.positionY"] < mid["transform.positionY"] && mid["transform.positionY"] < bot["transform.positionY"]);
	// the line's vertical centre sits at the frame centre for y=0 (within the 1px rounding)
	const lh = Math.ceil(mid.fontSize * 1.2);
	assert.ok(Math.abs(mid["transform.positionY"] + lh / 2 - 960) <= 1);
	assert.ok(at(0, "x".repeat(80)).fontSize < mid.fontSize);
	// y scales with the frame height: the same +540 on a 960-high frame is half the pixel offset
	const small = editToTracks({ ...good(), text: { body: "Hello", y: 540 } }, { ...O, width: 540, height: 960 }).overlay[0].elements[0].params;
	const lh2 = Math.ceil(small.fontSize * 1.2);
	assert.ok(Math.abs(small["transform.positionY"] + lh2 / 2 - (480 + 270)) <= 1);
});

test("end to end: a good edit -> editToTracks -> renderTimeline with a fake run: trim, text, music and a safe argv", () => {
	const calls = [];
	const run = (cmd, argv) => { calls.push({ cmd, argv }); return { status: 0, stdout: "", stderr: "" }; };
	const tracks = editToTracks(good(), { ...O, videoSrc: "/srv/v/1.mp4", musicSrc: "/srv/m/1.mp3" });
	const r = renderTimeline({ tracks, width: 1080, height: 1920, outPath: "/tmp/out.mp4", run, ffmpeg: "ffmpeg" });
	assert.equal(r.ok, true);
	assert.equal(r.durationTicks, 4 * TICKS_PER_SECOND);
	assert.equal(calls.length, 1);
	const { argv } = calls[0];
	assert.deepEqual(argv.slice(0, 5), ["-y", "-i", "/srv/v/1.mp4", "-i", "/srv/m/1.mp3"]);
	assert.equal(argv.at(-1), "/tmp/out.mp4");
	const fc = argv[argv.indexOf("-filter_complex") + 1];
	assert.match(fc, /trim=start=2:end=6/); // the trim
	assert.match(fc, /drawtext=expansion=none/); // the text
	assert.ok(fc.includes("Hello") && fc.includes("100"));
	assert.ok(!fc.includes("/srv/")); // paths stay in -i, never inside a filter
	assert.match(fc, /amix=inputs=2/); // the music
	// user text never becomes its own argv element, so it cannot be read as an option
	assert.ok(!argv.some((a) => a === "Hello, it's 100%: a, b" || a.startsWith("-text")));
});

test("end to end: a hostile caption stays inside the filter string and never adds an argv flag", () => {
	const calls = [];
	const run = (cmd, argv) => { calls.push(argv); return { status: 0, stdout: "", stderr: "" }; };
	const body = "'; -f lavfi -i x ,drawtext=text=boo:x=0";
	const tracks = editToTracks({ trimStart: 0, trimEnd: 2, coverSec: 1, text: { body, y: 0 } }, { ...O, videoSrc: "/srv/v/1.mp4" });
	renderTimeline({ tracks, outPath: "/tmp/o.mp4", run, ffmpeg: "ffmpeg" });
	const argv = calls[0];
	assert.equal(argv.filter((a) => a === "-i").length, 1);
	assert.equal(argv.filter((a) => a === "lavfi").length, 0);
	const fc = argv[argv.indexOf("-filter_complex") + 1];
	// exactly one real drawtext filter: the injected "drawtext=" is inside the escaped text (its comma is backslash-escaped)
	assert.equal((fc.match(/(?<!\\)[,\]]drawtext=/g) ?? []).length, 1);
	assert.ok(fc.includes("\\,drawtext=text=boo"));
});

// Real ffmpeg (skipped when none is available: set FFMPEG or have ffmpeg on PATH).
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const haveFfmpeg = spawnSync(FFMPEG, ["-version"], { encoding: "utf8" }).status === 0;
const durationOf = (file) => {
	const m = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(spawnSync(FFMPEG, ["-i", file], { encoding: "utf8" }).stderr);
	return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : NaN;
};

test("real ffmpeg: a good edit (trim 2..4 + hostile-ish text + music) renders a ~2 s file", { skip: !haveFfmpeg && "no ffmpeg" }, () => {
	const dir = mkdtempSync(join(tmpdir(), "cut-edit-"));
	try {
		const v = join(dir, "v.mp4"), m = join(dir, "m.wav"), out = join(dir, "out.mp4");
		const mk = (args) => assert.equal(spawnSync(FFMPEG, ["-y", ...args], { encoding: "utf8" }).status, 0);
		mk(["-f", "lavfi", "-i", "testsrc=s=320x240:r=30:d=6", "-f", "lavfi", "-i", "sine=f=440:d=6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", v]);
		mk(["-f", "lavfi", "-i", "sine=f=220:d=6", m]);
		const edit = { trimStart: 2, trimEnd: 4, text: { body: "it's 100%: a, b", y: 540 }, music: { id: "t", volume: 0.5 }, coverSec: 3 };
		const tracks = editToTracks(edit, { durationSec: 6, width: 540, height: 960, videoSrc: v, musicSrc: m });
		const r = renderTimeline({ tracks, width: 540, height: 960, outPath: out, ffmpeg: FFMPEG });
		assert.equal(r.ok, true);
		const d = durationOf(out);
		assert.ok(Math.abs(d - 2) < 0.15, `duration ${d}`);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
