import test from "node:test";
import assert from "node:assert/strict";
import { centreCaptionParams, editorFontPx } from "./words-position.mjs";
import { registry } from "./registry.mjs";

const F = { width: 640, height: 360 };

test("default caption: 15 units at 360 high = 60 px, centred, no offsets", () => {
	assert.equal(editorFontPx(15, 360), 60);
	const [p] = centreCaptionParams({ text: "Hi", x: 0, y: 0, fontSize: 15 }, F);
	assert.equal(p.fontSize, 60);
	assert.equal(p.anchor, "center");
	assert.equal(registry.text.toFilter(p), "drawtext=expansion=none:text=Hi:x=(w-text_w)/2:y=(h-text_h)/2:fontsize=60:fontcolor=white:font=DejaVu Sans");
});

test("offsets are signed centre offsets, not top-left", () => {
	const [p] = centreCaptionParams({ text: "Hi", x: 100, y: -50, fontSize: 5 }, F);
	const f = registry.text.toFilter(p);
	assert.match(f, /:x=\(w-text_w\)\/2\+100:y=\(h-text_h\)\/2-50:fontsize=20:/);
});

test("negative offsets are legal here (they are illegal top-left)", () => {
	assert.doesNotThrow(() => centreCaptionParams({ text: "Hi", x: -100, y: -100, fontSize: 5 }, F));
});

test("wrapped lines are spread symmetrically about the offset", () => {
	const ps = centreCaptionParams({ text: "one two three four five six seven eight nine ten", x: 0, y: 20, fontSize: 9 }, F); // 9 units * 360/90 = 36 px: ~900 px of text in a 640 px frame, so it must wrap
	assert.ok(ps.length >= 2);
	const lh = Math.ceil(36 * 1.2);
	assert.equal(ps[1].y - ps[0].y, lh);
	assert.ok(Math.abs(ps.reduce((a, p) => a + p.y, 0) / ps.length - 20) < 1e-9);
});

test("enable and colour survive; non-centre textAlign and overflow are refused", () => {
	const [p] = centreCaptionParams({ text: "a", x: 0, y: 0, fontSize: 5, color: "yellow", enable: "between(t,1,2)" }, F);
	assert.match(registry.text.toFilter(p), /enable='between\(t,1,2\)'.*fontcolor=yellow/);
	assert.throws(() => centreCaptionParams({ text: "a", fontSize: 5, textAlign: "left" }, F), RangeError);
	assert.throws(() => centreCaptionParams({ text: "a", y: 200, fontSize: 5 }, F), RangeError);
	assert.throws(() => centreCaptionParams({ text: "a", x: 400, fontSize: 5 }, F), RangeError);
});

test("registry: anchor is opt-in; bad value refused; default string unchanged", () => {
	assert.match(registry.text.toFilter({ text: "a", x: 5, y: 6 }), /:x=5:y=6:/);
	assert.throws(() => registry.text.toFilter({ text: "a", anchor: "left" }), RangeError);
});
