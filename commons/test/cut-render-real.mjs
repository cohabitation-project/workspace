// Real-ffmpeg integration test for timed Words captions through the placed planner.
// Run: node --test commons/test/cut-render-real.mjs (placed from teams/cut/render/render-words.test.mjs, GPT)
// This test intentionally imports product code from commons/lib/cut, not the team prototype.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRenderPlan } from "../lib/cut/plan.mjs";
import { createEmptyTracks, createElement, createTrack } from "../lib/cut/model.mjs";

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const versionResult = spawnSync(ffmpeg, ["-version"], { encoding: "utf8" });
const ffmpegAvailable = !versionResult.error && versionResult.status === 0;
const ffmpegVersion = ffmpegAvailable ? versionResult.stdout.split(/\r?\n/, 1)[0] : "";
const ffmpegSkip = ffmpegAvailable
	? false
	: `real-ffmpeg test requires FFMPEG or ffmpeg on PATH (${versionResult.error?.message ?? versionResult.stderr?.trim() ?? `exit ${versionResult.status}`})`;

function command(file, args, options = {}) {
	const result = spawnSync(file, args, { encoding: "utf8", ...options });
	assert.ifError(result.error);
	assert.equal(result.status, 0, `${file} exited ${result.status}:\n${result.stderr}`);
	return result;
}

function frame(ffmpegPath, videoPath, time, width, height) {
	const result = spawnSync(ffmpegPath, [
		"-v", "error", "-ss", String(time), "-i", videoPath,
		"-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-",
	], { maxBuffer: width * height * 2 });
	assert.ifError(result.error);
	assert.equal(result.status, 0, `frame extraction at ${time}s failed: ${result.stderr?.toString()}`);
	assert.equal(result.stdout.length, width * height, `unexpected frame byte count at ${time}s`);
	return result.stdout;
}

function brightCaptionPixels(image, width) {
	// The caption is placed at y=100. Count bright pixels in a generous band so
	// this tests visible text, not only successful filter parsing.
	let count = 0;
	for (let y = 80; y < 180; y++) {
		for (let x = 0; x < width; x++) if (image[y * width + x] > 128) count++;
	}
	return count;
}

console.log(`Cut Words render test ffmpeg: ${ffmpegVersion || "unavailable (render test will skip)"}`);
const fontMatch = spawnSync("fc-match", ["sans"], { encoding: "utf8" });
console.log(`Cut Words render test fc-match sans: ${!fontMatch.error && fontMatch.status === 0 ? fontMatch.stdout.trim() : "unavailable"}`);

test("placed planner renders a timed Words caption: absent / visible / absent", { skip: ffmpegSkip }, () => {
	const width = 540;
	const height = 960;
	const ticksPerSecond = 120_000;
	const directory = mkdtempSync(join(tmpdir(), "cut-render-words-"));
	try {
		const source = join(directory, "black.mp4");
		const output = join(directory, "words.mp4");
		command(ffmpeg, [
			"-y", "-v", "error", "-f", "lavfi", "-i",
			`color=c=black:s=${width}x${height}:r=30:d=2`, "-an",
			"-c:v", "libx264", "-qp", "0", "-pix_fmt", "yuv420p", source,
		]);

		const tracks = createEmptyTracks();
		tracks.main.elements.push(createElement({
			id: "clip-1", type: "video", startTime: 0, duration: 2 * ticksPerSecond,
			params: { src: source },
		}));
		const words = createTrack({ type: "text", name: "Words", id: "words" });
		words.elements.push(createElement({
			id: "caption-1", type: "text", startTime: ticksPerSecond, duration: ticksPerSecond / 2,
			params: {
				content: "it's %{x}, a: b", fontSize: 48, color: "white",
				"transform.positionX": 24, "transform.positionY": 100,
			},
		}));
		tracks.overlay.push(words);

		const plan = buildRenderPlan({
			tracks, sources: { [source]: { hasAudio: false } }, width, height, fps: 30,
		});
		assert.deepEqual(plan.ignored, [], "Words caption should be consumed, not reported ignored");
		assert.match(plan.filterComplex, /enable='between\(t,1,1\.5\)'/, "plan must carry the 1–1.5s visibility window");
		command(ffmpeg, [
			"-y", "-v", "error", ...plan.args,
			"-an", "-c:v", "libx264", "-qp", "0", "-pix_fmt", "yuv420p", output,
		]);

		const before = brightCaptionPixels(frame(ffmpeg, output, 0.5, width, height), width);
		const during = brightCaptionPixels(frame(ffmpeg, output, 1.25, width, height), width);
		const after = brightCaptionPixels(frame(ffmpeg, output, 1.9, width, height), width);
		assert.equal(before, 0, `caption band should be empty before its window; found ${before} bright pixels`);
		assert.ok(during > 100, `caption should be visible inside its window; found only ${during} bright pixels`);
		assert.equal(after, 0, `caption band should be empty after its window; found ${after} bright pixels`);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
