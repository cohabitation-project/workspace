import test from "node:test";
import assert from "node:assert/strict";
import { registry } from "./registry.mjs";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function ffmpegPath() {
	const p = process.env.FFMPEG || "ffmpeg";
	return spawnSync(p, ["-version"]).status === 0 ? p : null;
}

test("fade emits the exact ffmpeg filter string", () => {
	assert.equal(registry.fade.toFilter({ direction: "out", start: 2.5, duration: 0.75 }), "fade=t=out:st=2.5:d=0.75");
});

test("crop emits the exact ffmpeg filter string", () => {
	assert.equal(registry.crop.toFilter({ width: 640, height: 360, x: 12, y: 8 }), "crop=w=640:h=360:x=12:y=8");
});

test("text emits the exact ffmpeg filter string", () => {
	assert.equal(registry.text.toFilter({ text: "Hello Cohabi", x: 24, y: 36, fontSize: 42, color: "white" }), "drawtext=expansion=none:text=Hello Cohabi:x=24:y=36:fontsize=42:fontcolor=white");
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
		String.raw`drawtext=expansion=none:text=it\\\'s\\: a\,b\;\[c\]\\\\d %{x}:x=0:y=0:fontsize=32:fontcolor=white`,
	);
});

// Measured on ffmpeg n9.0.2 (2026-11-21): each string below, rendered through this escaping, is
// pixel-identical to a textfile= render (which needs no escaping). The old quoted form exited 0 and drew nothing.
test("text uses unquoted two-level escaping: lone apostrophe, colon, edge whitespace, trailing backslash", () => {
	const f = (text) => registry.text.toFilter({ text, x: 1, y: 2, fontSize: 3 });
	const tail = ":x=1:y=2:fontsize=3:fontcolor=white";
	assert.equal(f("'"), String.raw`drawtext=expansion=none:text=\\\'` + tail);
	assert.equal(f("a:b"), String.raw`drawtext=expansion=none:text=a\\:b` + tail);
	assert.equal(f("  hi  "), String.raw`drawtext=expansion=none:text=\\\ \\\ hi\\\ \\\ ` + tail);
	assert.equal(f("trail\\"), String.raw`drawtext=expansion=none:text=trail\\\\` + tail);
	assert.equal(f("100% 'q' \"d\""), String.raw`drawtext=expansion=none:text=100% \\\'q\\\' "d"` + tail);
	assert.ok(!f("it's").includes(":text='"), "text must not be wrapped in quotes");
});

test("text: real ffmpeg draws hostile strings identically to a textfile= render (skipped if no ffmpeg)", { skip: !ffmpegPath() }, () => {
	const ff = ffmpegPath();
	const grab = (vf) => spawnSync(ff, ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=640x120:d=1", "-vf", vf, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 24 });
	const dir = mkdtempSync(join(tmpdir(), "cut-"));
	for (const text of ["it's: a,b;[c]\\d %{x}", "'", "  lead and trail  ", "100% 'q' \"d\"", "trail\\", "a:b"]) {
		const a = grab(registry.text.toFilter({ text, x: 10, y: 60, fontSize: 40 }));
		writeFileSync(join(dir, "t.txt"), text);
		const b = grab(`drawtext=expansion=none:textfile=${join(dir, "t.txt")}:x=10:y=60:fontsize=40:fontcolor=white`);
		assert.equal(a.status, 0, text);
		assert.ok(a.stdout.some((v) => v > 128), `exit 0 is not proof: no text pixels drawn for ${JSON.stringify(text)}`);
		assert.ok(a.stdout.equals(b.stdout), `differs from textfile ground truth: ${JSON.stringify(text)}`);
	}
});

test("text puts expansion=none before text= (real ffmpeg rejects the reverse for apostrophe + %{x})", () => {
	const f = registry.text.toFilter({ text: "it's %{x}" });
	assert.ok(f.indexOf("expansion=none") < f.indexOf(":text="), f);
	assert.ok(f.startsWith("drawtext=expansion=none:text="), f);
});

test("text accepts only a finite decimal between(t,start,end) and emits it before text", () => {
	assert.equal(
		registry.text.toFilter({ text: "it's %{x}", enable: "between(t,0.5,2)" }),
		String.raw`drawtext=expansion=none:enable='between(t,0.5,2)':text=it\\\'s %{x}:x=0:y=0:fontsize=32:fontcolor=white`,
	);
	assert.match(registry.text.toFilter({ text: "x", enable: "between(t,1,1.5)" }), /between\(t,1,1\.5\)/);
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
