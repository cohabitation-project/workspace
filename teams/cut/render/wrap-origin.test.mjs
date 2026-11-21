// Top/left-edge tests for teams/cut/render/wrap.mjs and its planner wiring.
// Run: cd teams/cut/render && node --test wrap-origin.test.mjs
// Found 2026-11-21 (probe): wrapCaptionParams accepted y=-10, x=-30 and y=-1e9 without complaint, and a
// negative x widened maxWidth so a wrapped caption was laid out as if the frame were wider than it is.
import test from "node:test";
import assert from "node:assert/strict";
import { wrapCaptionParams, WRAP_FONT } from "./wrap.mjs";
import { buildRenderPlan, RenderPlanError } from "./plan.mjs";
import { createEmptyTracks, createElement, createTrack } from "../port/model.mjs";

const T = 120000;
const FRAME = { width: 540, height: 960 };
const LONG = "A fairly long caption that wraps over lines";

function planWithCaption(content, x, y) {
	const tracks = createEmptyTracks();
	tracks.main.elements.push(createElement({ id: "c1", type: "video", startTime: 0, duration: 2 * T, params: { src: "/m/a.mp4" } }));
	const words = createTrack({ type: "text", name: "Words", id: "words" });
	words.elements.push(createElement({
		id: "cap1", type: "text", startTime: T / 2, duration: T,
		params: { content, fontSize: 48, color: "white", "transform.positionX": x, "transform.positionY": y },
	}));
	tracks.overlay.push(words);
	return () => buildRenderPlan({ tracks, ...FRAME, fps: 30 });
}

const refuses = (e) => e instanceof RangeError && /outside the frame/.test(e.message);

test("origin (0, 0) is accepted and pinned", () => {
	const out = wrapCaptionParams({ text: "Hi", x: 0, y: 0, fontSize: 48 }, FRAME);
	assert.equal(out.length, 1);
	assert.equal(out[0].font, WRAP_FONT);
});

test("negative y is refused, one-line and wrapped, including an absurd value", () => {
	for (const y of [-1, -10, -1e9]) {
		assert.throws(() => wrapCaptionParams({ text: "Hi", x: 24, y, fontSize: 48 }, FRAME), refuses);
		assert.throws(() => wrapCaptionParams({ text: LONG, x: 24, y, fontSize: 48 }, FRAME), refuses);
	}
});

test("negative x is refused, one-line and wrapped (it used to widen the wrap box)", () => {
	for (const x of [-1, -30, -200]) {
		assert.throws(() => wrapCaptionParams({ text: "Hi", x, y: 100, fontSize: 48 }, FRAME), refuses);
		assert.throws(() => wrapCaptionParams({ text: LONG, x, y: 100, fontSize: 48 }, FRAME), refuses);
	}
});

test("planner: a Words caption positioned off the top or left becomes a RenderPlanError", () => {
	assert.throws(planWithCaption("Hi", 24, -10), (e) => e instanceof RenderPlanError && /outside the frame/.test(e.message));
	assert.throws(planWithCaption("Hi", -30, 100), (e) => e instanceof RenderPlanError && /outside the frame/.test(e.message));
	assert.doesNotThrow(planWithCaption("Hi", 0, 0));
});

test("non-finite coordinates still fall through to the registry's own error, not this check", () => {
	const out = wrapCaptionParams({ text: "Hi", x: NaN, y: 0, fontSize: 48 }, FRAME);
	assert.equal(out.length, 1);
	assert.ok(Number.isNaN(out[0].x));
});
