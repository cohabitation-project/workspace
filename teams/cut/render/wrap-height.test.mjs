// Vertical-fit tests for teams/cut/render/wrap.mjs and its planner wiring.
// Run: cd teams/cut/render && node --test wrap-height.test.mjs
// Real-pixel evidence lives in ffmpeg-smoke-height.py.
import test from "node:test";
import assert from "node:assert/strict";
import { wrapCaptionParams, WRAP_FONT } from "./wrap.mjs";
import { buildRenderPlan, RenderPlanError } from "./plan.mjs";
import { createEmptyTracks, createElement, createTrack } from "../port/model.mjs";

const T = 120000;
const FRAME = { width: 540, height: 960 };

function planWithCaption(content, fontSize, y, x = 24) {
	const tracks = createEmptyTracks();
	tracks.main.elements.push(createElement({ id: "c1", type: "video", startTime: 0, duration: 2 * T, params: { src: "/m/a.mp4" } }));
	const words = createTrack({ type: "text", name: "Words", id: "words" });
	words.elements.push(createElement({
		id: "cap1", type: "text", startTime: T / 2, duration: T,
		params: { content, fontSize, color: "white", "transform.positionX": x, "transform.positionY": y },
	}));
	tracks.overlay.push(words);
	return () => buildRenderPlan({ tracks, ...FRAME, fps: 30 });
}

test("single-line caption: the last line box that fits is accepted, one pixel lower is refused", () => {
	const fontSize = 48;
	const lineBox = Math.ceil(fontSize * 1.2);
	const ok = wrapCaptionParams({ text: "Hi", x: 24, y: FRAME.height - lineBox, fontSize }, FRAME);
	assert.equal(ok.length, 1);
	assert.equal(ok[0].font, WRAP_FONT);
	assert.throws(
		() => wrapCaptionParams({ text: "Hi", x: 24, y: FRAME.height - lineBox + 1, fontSize }, FRAME),
		(e) => e instanceof RangeError && /bottom edge/.test(e.message),
	);
});

test("planner: a one-line caption below the frame becomes a RenderPlanError naming the clip and effect", () => {
	assert.throws(planWithCaption("Hi", 48, 940), (e) => e instanceof RenderPlanError && /bottom edge/.test(e.message));
});

test("planner: a long caption whose wrapped lines would run off the bottom becomes a RenderPlanError", () => {
	const long = "Absolutely nothing about this sentence fits one line";
	assert.throws(planWithCaption(long, 48, 880), (e) => e instanceof RenderPlanError && /bottom edge/.test(e.message));
});

test("planner: a caption that leaves less than one glyph of width becomes a RenderPlanError", () => {
	assert.throws(planWithCaption("Hello", 48, 36, 520), (e) => e instanceof RenderPlanError && /glyph/.test(e.message));
});

test("planner: a wrapped caption that exactly fits at the bottom still plans, one drawtext per line, all pinned", () => {
	const long = "Absolutely nothing about this sentence fits one line";
	const lines = wrapCaptionParams({ text: long, x: 24, y: 0, fontSize: 48 }, FRAME).length;
	assert.ok(lines >= 2);
	const y = FRAME.height - lines * Math.ceil(48 * 1.2);
	const plan = planWithCaption(long, 48, y)();
	const draws = plan.filterComplex.split("drawtext=").length - 1;
	assert.equal(draws, lines);
	assert.equal(plan.filterComplex.split(":font=DejaVu Sans").length - 1, lines);
	assert.throws(planWithCaption(long, 48, y + 1), (e) => e instanceof RenderPlanError);
});

test("characterization: a caller-supplied font is overridden by the pin, not honoured (the width table is DejaVu's)", () => {
	const out = wrapCaptionParams({ text: "Hi", x: 0, y: 0, fontSize: 32, font: "Comic Neue" }, FRAME);
	assert.equal(out[0].font, WRAP_FONT);
});
