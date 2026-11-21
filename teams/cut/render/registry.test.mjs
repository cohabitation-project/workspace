import test from "node:test";
import assert from "node:assert/strict";
import { registry } from "./registry.mjs";

test("fade emits the exact ffmpeg filter string", () => {
	assert.equal(registry.fade.toFilter({ direction: "out", start: 2.5, duration: 0.75 }), "fade=t=out:st=2.5:d=0.75");
});

test("crop emits the exact ffmpeg filter string", () => {
	assert.equal(registry.crop.toFilter({ width: 640, height: 360, x: 12, y: 8 }), "crop=w=640:h=360:x=12:y=8");
});

test("text emits the exact ffmpeg filter string", () => {
	assert.equal(registry.text.toFilter({ text: "Hello Cohabi", x: 24, y: 36, fontSize: 42, color: "white" }), "drawtext=expansion=none:text='Hello Cohabi':x=24:y=36:fontsize=42:fontcolor=white");
});

test("fade rejects a zero or negative duration", () => {
	assert.throws(() => registry.fade.toFilter({ duration: 0 }), /duration.*> 0/);
	assert.throws(() => registry.fade.toFilter({ duration: -0.1 }), /duration.*> 0/);
});

test("crop rejects a rectangle outside a supplied frame and incomplete dimensions", () => {
	assert.equal(registry.crop.toFilter({ width: 640, height: 360, x: 12, y: 8, frameWidth: 1280, frameHeight: 720 }), "crop=w=640:h=360:x=12:y=8");
	assert.throws(() => registry.crop.toFilter({ width: 641, height: 360, x: 640, y: 0, frameWidth: 1280, frameHeight: 720 }), /exceeds frame/);
	assert.throws(() => registry.crop.toFilter({ width: 640, height: 361, x: 0, y: 360, frameWidth: 1280, frameHeight: 720 }), /exceeds frame/);
	assert.throws(() => registry.crop.toFilter({ frameWidth: 1280 }), /supplied together/);
});

test("text escapes apostrophe, colon, backslash and filtergraph delimiters exactly", () => {
	assert.equal(
		registry.text.toFilter({ text: "it's: a,b;[c]\\d %{x}" }),
		"drawtext=expansion=none:text='it'\\''s\\: a\\,b\\;\\[c\\]\\\\d %{x}':x=0:y=0:fontsize=32:fontcolor=white",
	);
});

test("text puts expansion=none before text= (real ffmpeg rejects the reverse for apostrophe + %{x})", () => {
	const f = registry.text.toFilter({ text: "it's %{x}" });
	assert.ok(f.indexOf("expansion=none") < f.indexOf(":text='"), f);
	assert.ok(f.startsWith("drawtext=expansion=none:text='"), f);
});

test("text accepts only a finite decimal between(t,start,end) and emits it before text", () => {
	assert.equal(
		registry.text.toFilter({ text: "it's %{x}", enable: "between(t,0.5,2)" }),
		"drawtext=expansion=none:enable='between(t,0.5,2)':text='it'\\''s %{x}':x=0:y=0:fontsize=32:fontcolor=white",
	);
});

test("text rejects arbitrary, malformed, negative, non-finite, and empty enable expressions", () => {
	for (const enable of [
		"1+1",
		"between(t,-1,2)",
		"between(t,1e2,200)",
		"between(t,1,1)",
		"between(t,2,1)",
		"between(t,0,1),drawbox=x=0:y=0:w=iw:h=ih:color=red",
		"",
		42,
	]) {
		assert.throws(() => registry.text.toFilter({ text: "caption", enable }), RangeError, String(enable));
	}
});

test("text rejects NUL and line breaks instead of emitting a malformed graph", () => {
	assert.throws(() => registry.text.toFilter({ text: "two\nlines" }), /NUL or line breaks/);
	assert.throws(() => registry.text.toFilter({ text: "bad\0text" }), /NUL or line breaks/);
});
