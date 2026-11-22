// Tests for plan.mjs captionOrigin:"centre" (Words x/y are centre offsets, fontSize in editor units).
// Source of the convention: teams/cut/NOTE-caption-coordinates.md (upstream pin, NOT confirmed against the live editor).
// Default captionOrigin ("topleft") is unchanged and still covered by plan.test.mjs / wrap*.test.mjs.
// Run: cd teams/cut/render && node --test plan-centre.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildRenderPlan, RenderPlanError } from "./plan.mjs";
import { createEmptyTracks, createElement, createTrack } from "../port/model.mjs";

const T = 120000;

function plan(content, params, opts = {}) {
	const tracks = createEmptyTracks();
	tracks.main.elements.push(createElement({ id: "a", type: "video", startTime: 0, duration: 2 * T, params: { src: "/m/a.mp4" } }));
	const words = createTrack({ type: "text", name: "Words", id: "words" });
	words.elements.push(createElement({
		id: "c1", type: "text", startTime: T / 2, duration: 3 * T / 2,
		params: { content, color: "white", ...params },
	}));
	tracks.overlay.push(words);
	return buildRenderPlan({ tracks, width: 640, height: 360, ...opts });
}

test("centre: default editor caption (fontSize 15, offset 0,0) is 60 px and centred by ffmpeg", () => {
	const fc = plan("Hello", { fontSize: 15, "transform.positionX": 0, "transform.positionY": 0 }, { captionOrigin: "centre" }).filterComplex;
	assert.match(fc, /drawtext=expansion=none:enable='between\(t,0\.5,2\)':text=Hello:x=\(w-text_w\)\/2:y=\(h-text_h\)\/2:fontsize=60:/);
});

test("centre: signed offsets reach drawtext as signed centre offsets", () => {
	const fc = plan("Hi", { fontSize: 5, "transform.positionX": -120, "transform.positionY": 60 }, { captionOrigin: "centre" }).filterComplex;
	assert.match(fc, /x=\(w-text_w\)\/2-120:y=\(h-text_h\)\/2\+60:fontsize=20:/);
});

test("default captionOrigin is still top-left pixels (no silent behaviour change)", () => {
	const dflt = plan("Hello", { fontSize: 42, "transform.positionX": 24, "transform.positionY": 36 }).filterComplex;
	assert.match(dflt, /:x=24:y=36:fontsize=42:/);
	const explicit = plan("Hello", { fontSize: 42, "transform.positionX": 24, "transform.positionY": 36 }, { captionOrigin: "topleft" }).filterComplex;
	assert.equal(explicit, dflt);
});

test("centre: a long caption wraps to one drawtext per line, all with the same window", () => {
	const fc = plan("one two three four five six seven eight nine ten", { fontSize: 9, "transform.positionX": 0, "transform.positionY": 0 }, { captionOrigin: "centre" }).filterComplex;
	const dts = fc.split("drawtext=").slice(1);
	assert.ok(dts.length >= 2, fc);
	assert.ok(dts.every((d) => d.includes("enable='between(t,0.5,2)'")), fc);
});

test("centre: unsupported alignment and an off-frame block become RenderPlanError; bad option is refused", () => {
	assert.throws(() => plan("Hi", { fontSize: 15, textAlign: "left" }, { captionOrigin: "centre" }), (e) => e instanceof RenderPlanError && /textAlign/.test(e.message));
	assert.throws(() => plan("Hi", { fontSize: 15, "transform.positionY": 400 }, { captionOrigin: "centre" }), (e) => e instanceof RenderPlanError);
	assert.throws(() => plan("Hi", { fontSize: 15 }, { captionOrigin: "middle" }), (e) => e instanceof RenderPlanError && /captionOrigin/.test(e.message));
});
