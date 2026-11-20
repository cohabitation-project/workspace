// Job 3 integration tests: per-clip effects through registry.mjs in plan.mjs.
// Run from this folder: node --test plan.test.mjs plan-effects.test.mjs registry.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildRenderPlan, RenderPlanError } from "./plan.mjs";
import { TICKS_PER_SECOND as T } from "../port/time.mjs";

const clip = (over = {}) => ({
	id: "c1", type: "video", startTime: 0, duration: 2 * T, trimStart: 0,
	params: { src: "a.mp4" }, ...over,
});
const plan = (c, extra = {}) =>
	buildRenderPlan({ tracks: { overlay: [], audio: [], main: { id: "m", type: "video", elements: [c] } }, width: 540, height: 960, fps: 30, ...extra });

test("no effects: the video chain is unchanged", () => {
	const p = plan(clip());
	assert.match(p.filterComplex, /^\[0:v\]trim=start=0:end=2,setpts=PTS-STARTPTS,trim=end=2,scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:\(ow-iw\)\/2:\(oh-ih\)\/2,setsar=1,fps=30,format=yuv420p\[v0\];/);
});

test("crop goes before scale; fade and text go after format; ticks become seconds", () => {
	const p = plan(clip({
		effects: [
			{ id: "text", params: { text: "Hi", x: 10, y: 20, fontSize: 40 } },
			{ id: "fade", params: { direction: "out", startTicks: 1.5 * T, durationTicks: 0.5 * T } },
			{ id: "crop", params: { width: 640, height: 360, x: 0, y: 0 } },
		],
	}));
	assert.equal(
		p.filterComplex.split(";")[0],
		"[0:v]trim=start=0:end=2,setpts=PTS-STARTPTS,trim=end=2,crop=w=640:h=360:x=0:y=0," +
		"scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p," +
		"drawtext=expansion=none:text='Hi':x=10:y=20:fontsize=40:fontcolor=white,fade=t=out:st=1.5:d=0.5[v0]",
	);
});

test("fade defaults to direction in at the clip start", () => {
	const p = plan(clip({ effects: [{ id: "fade", params: { durationTicks: T } }] }));
	assert.match(p.filterComplex, /format=yuv420p,fade=t=in:st=0:d=1\[v0\]/);
});

test("a fade that runs past the clip is refused", () => {
	assert.throws(() => plan(clip({ effects: [{ id: "fade", params: { startTicks: 1.5 * T, durationTicks: T } }] })), RenderPlanError);
	assert.throws(() => plan(clip({ effects: [{ id: "fade", params: { startTicks: 0 } }] })), /durationTicks/);
	assert.throws(() => plan(clip({ effects: [{ id: "fade", params: { startTicks: 0, durationTicks: 0 } }] })), /durationTicks/);
	assert.throws(() => plan(clip({ effects: [{ id: "fade", params: { startTicks: 0, durationTicks: 1.5 } }] })), /durationTicks/);
});

test("unknown, inherited-property and non-array effects throw, never drop", () => {
	for (const id of ["blur", "toFilter", "constructor", "__proto__", undefined]) {
		assert.throws(() => plan(clip({ effects: [{ id }] })), /unknown effect/, String(id));
	}
	assert.throws(() => plan(clip({ effects: "fade" })), /must be an array/);
	assert.throws(() => plan(clip({ effects: [null] })), /unknown effect/);
});

test("registry errors are re-thrown as RenderPlanError naming the clip and effect", () => {
	assert.throws(() => plan(clip({ effects: [{ id: "text", params: { text: "a\nb" } }] })),
		(e) => e instanceof RenderPlanError && /clip c1: text effect/.test(e.message));
	assert.throws(() => plan(clip({ effects: [{ id: "crop", params: { width: 0 } }] })), RenderPlanError);
});

test("hostile text stays inside the registry's escaping and never changes the other filters", () => {
	const p = plan(clip({ effects: [{ id: "text", params: { text: "it's: a,b;[c]\\d %{x}" } }] }));
	const links = p.filterComplex.split(/(?<!\\);/); // split on UNESCAPED semicolons only
	assert.equal(links.length, 3); // video, audio, concat: the text's `;` added no graph link
	assert.ok(links[0].endsWith("fontcolor=white[v0]"));
	assert.ok(links[0].includes("drawtext=text='it'\\''s\\: a\\,b\\;\\[c\\]\\\\d %{x}'"));
});

test("effects work on a retimed clip and with a gap before it", () => {
	const p = plan(clip({ startTime: T, retime: { rate: 2 }, effects: [{ id: "fade", params: { durationTicks: T / 2 } }] }));
	assert.match(p.filterComplex, /setpts=\(PTS-STARTPTS\)\/2,trim=end=2,.*format=yuv420p,fade=t=in:st=0:d=0\.5\[v1\]/);
	assert.match(p.filterComplex, /^color=c=black/);
});
