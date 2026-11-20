import test from "node:test";
import assert from "node:assert/strict";
import { registry } from "../lib/cut/effects.mjs";

test("fade emits the exact ffmpeg filter string", () => {
	assert.equal(
		registry.fade.toFilter({ direction: "out", start: 2.5, duration: 0.75 }),
		"fade=t=out:st=2.5:d=0.75",
	);
});

test("crop emits the exact ffmpeg filter string", () => {
	assert.equal(
		registry.crop.toFilter({ width: 640, height: 360, x: 12, y: 8 }),
		"crop=w=640:h=360:x=12:y=8",
	);
});

test("text emits the exact ffmpeg filter string", () => {
	assert.equal(
		registry.text.toFilter({ text: "Hello Cohabi", x: 24, y: 36, fontSize: 42, color: "white" }),
		"drawtext=text='Hello Cohabi':x=24:y=36:fontsize=42:fontcolor=white:expansion=none",
	);
});
