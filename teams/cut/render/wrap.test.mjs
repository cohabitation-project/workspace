// Tests for teams/cut/render/wrap.mjs. Run: cd teams/cut/render && node --test wrap.test.mjs
// Real-pixel evidence (estimate vs drawtext, end to end) lives in ffmpeg-smoke-wrap.py.
import test from "node:test";
import assert from "node:assert/strict";
import { estimateTextWidth, wrapLines, wrapCaptionParams, DEJAVU_ADVANCE, WRAP_FONT } from "./wrap.mjs";
import { registry } from "./registry.mjs";
import { buildRenderPlan, RenderPlanError } from "./plan.mjs";
import { createEmptyTracks, createElement, createTrack } from "../port/model.mjs";

const T = 120000;

test("the width table covers ASCII 0x20..0x7e and widths scale with font size", () => {
	assert.equal(DEJAVU_ADVANCE.length, 95);
	assert.equal(estimateTextWidth("W", 1000), 989);
	assert.equal(estimateTextWidth("W", 50), 989 * 50 / 1000);
	assert.equal(estimateTextWidth("\u4e2d", 10), 10); // non-ASCII counts as a full em
});

test("a caption that fits is one line, text unchanged (edge blanks and all), but still font-pinned", () => {
	assert.deepEqual(wrapLines("  hi  ", 20, 500), ["  hi  "]);
	const params = { text: "Hello", x: 10, y: 20, fontSize: 32 };
	assert.deepEqual(wrapCaptionParams(params, { width: 540, height: 960 }), [{ ...params, font: WRAP_FONT }]);
	assert.equal(WRAP_FONT, "DejaVu Sans");
	assert.equal(params.font, undefined, "the caller's params object is not mutated");
});

test("every wrapped line is font-pinned and the pinned plan string ends with :font=DejaVu Sans", () => {
	const out = wrapCaptionParams({ text: "Absolutely nothing about this sentence fits one line", x: 24, y: 36, fontSize: 48, color: "white" }, { width: 540, height: 960 });
	assert.ok(out.length >= 2);
	for (const p of out) {
		assert.equal(p.font, WRAP_FONT);
		assert.ok(registry.text.toFilter(p).endsWith(":fontcolor=white:font=DejaVu Sans"));
	}
});

test("the width table's own font is not the machine default: a plan without the pin would be unsafe", () => {
	// every Words drawtext in a plan carries the pin, wrapped or not
	const tracks = createEmptyTracks();
	tracks.main.elements.push(createElement({ id: "c1", type: "video", startTime: 0, duration: 2 * T, params: { src: "a.mp4" } }));
	const words = createTrack({ type: "text", name: "Words", id: "words" });
	words.elements.push(createElement({ id: "cap1", type: "text", startTime: 0, duration: T, params: { content: "Hi", fontSize: 42, color: "white", "transform.positionX": 24, "transform.positionY": 36 } }));
	tracks.overlay.push(words);
	const plan = buildRenderPlan({ tracks, width: 540, height: 960, fps: 30 });
	const draws = plan.filterComplex.match(/drawtext=[^\[\],;]*(?:\\.[^\[\],;]*)*/g) ?? [];
	assert.equal(draws.length, 1);
	assert.ok(plan.filterComplex.includes(":font=DejaVu Sans"), plan.filterComplex);
});

test("wrapping is greedy, every line fits, and no word is lost or reordered", () => {
	const text = "Absolutely nothing about this sentence fits one line";
	const lines = wrapLines(text, 48, 400);
	assert.ok(lines.length >= 2);
	for (const l of lines) assert.ok(estimateTextWidth(l, 48) <= 400, l);
	assert.equal(lines.join(" "), text);
});

test("a word wider than the line is split by character without losing any", () => {
	const word = "supercalifragilisticexpialidocious";
	const lines = wrapLines(word, 48, 300);
	assert.ok(lines.length >= 2);
	for (const l of lines) assert.ok(l.length >= 1 && estimateTextWidth(l, 48) <= 300);
	assert.equal(lines.join(""), word);
});

test("wrapped params keep timing and style and step down one line height at a time", () => {
	const params = { text: "Absolutely nothing about this sentence fits one line", x: 24, y: 36, fontSize: 48, color: "white", enable: "between(t,1,1.5)" };
	const out = wrapCaptionParams(params, { width: 540, height: 960 });
	assert.ok(out.length >= 2);
	out.forEach((p, i) => {
		assert.equal(p.enable, "between(t,1,1.5)");
		assert.equal(p.color, "white");
		assert.equal(p.x, 24);
		assert.equal(p.y, 36 + i * Math.ceil(48 * 1.2));
	});
});

test("a caption that cannot fit the frame fails closed", () => {
	const long = "word ".repeat(60).trim();
	assert.throws(() => wrapCaptionParams({ text: long, x: 0, y: 900, fontSize: 48 }, { width: 540, height: 960 }), RangeError);
	assert.throws(() => wrapCaptionParams({ text: "hello there", x: 530, y: 0, fontSize: 48 }, { width: 540, height: 960 }), RangeError);
});

test("buildRenderPlan emits one drawtext per wrapped line, all with the same window", () => {
	const tracks = createEmptyTracks();
	tracks.main.elements.push(createElement({ id: "c1", type: "video", startTime: 0, duration: 2 * T, params: { src: "a.mp4" } }));
	const words = createTrack({ type: "text", name: "Words", id: "words" });
	words.elements.push(createElement({ id: "cap1", type: "text", startTime: T, duration: T / 2, params: { content: "Absolutely nothing about this sentence fits one line", fontSize: 48, color: "white", "transform.positionX": 24, "transform.positionY": 36 } }));
	tracks.overlay.push(words);
	const plan = buildRenderPlan({ tracks, width: 540, height: 960, fps: 30 });
	const draws = plan.filterComplex.match(/drawtext=/g) ?? [];
	assert.ok(draws.length >= 2);
	assert.equal((plan.filterComplex.match(/enable='between\(t,1,1\.5\)'/g) ?? []).length, draws.length);
	// a caption that cannot fit becomes a RenderPlanError, not a bad graph
	words.elements[0].params.content = "word ".repeat(80).trim();
	assert.throws(() => buildRenderPlan({ tracks, width: 540, height: 960, fps: 30 }), RenderPlanError);
});
