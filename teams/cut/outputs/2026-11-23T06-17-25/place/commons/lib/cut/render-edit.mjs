// Cohabi Cut, Job 4: the render runner.
//
// renderTimeline({ tracks, sources, width, height, outPath, run, ffmpeg, timeoutMs })
//   1. buildRenderPlan() (the planner on main) turns `tracks` into ffmpeg input args + a filter graph.
//   2. ffmpeg -y <plan.args> -c:v libx264 -pix_fmt yuv420p -c:a aac <outPath> is run with an ARGV
//      ARRAY (never a shell string). `run` defaults to child_process.spawnSync and is injectable for tests.
//   3. Returns { ok: true, outPath, durationTicks, ignored }. On ffmpeg exit != 0 (or a failed spawn, or
//      a timeout) it throws an Error whose message ends with the last 20 stderr lines.
//
// The caller owns the paths: `tracks` must already carry SERVER-SIDE file paths in params.src (the
// planner's own contract), and `outPath` must be a server-chosen path. This module refuses an outPath
// that is not a non-empty single-line string or that starts with "-" (it would be read as an option).
// No server.mjs, no network, no file reads: this module only builds argv and runs the process.
//
// Import path: written to run from teams/cut/editor/. When placed at commons/lib/cut/render-edit.mjs
// change the plan import to "./plan.mjs".

import { spawnSync } from "node:child_process";
import { buildRenderPlan } from "./plan.mjs";

export const VIDEO_CODEC_ARGS = Object.freeze(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"]);
export const STDERR_TAIL_LINES = 20;

function tail(text, n = STDERR_TAIL_LINES) {
	const lines = String(text ?? "").split(/\r?\n/);
	while (lines.length && lines[lines.length - 1] === "") lines.pop();
	return lines.slice(-n).join("\n");
}

// The full ffmpeg argv for a plan (exported so tests and callers can inspect it without running anything).
export function buildFfmpegArgs(plan, outPath) {
	if (typeof outPath !== "string" || outPath.length === 0 || /[\0\r\n]/.test(outPath) || outPath.startsWith("-")) {
		throw new TypeError("outPath must be a non-empty single-line path that does not start with '-'");
	}
	return ["-y", ...plan.args, ...VIDEO_CODEC_ARGS, outPath];
}

export function renderTimeline({
	tracks,
	sources = {},
	width = 1080,
	height = 1920,
	outPath,
	run = spawnSync,
	ffmpeg = process.env.FFMPEG || "ffmpeg",
	timeoutMs = 10 * 60 * 1000,
} = {}) {
	// Planner errors (RenderPlanError) propagate unchanged: they are the user-facing refusals.
	const plan = buildRenderPlan({ tracks, sources, width, height });
	const argv = buildFfmpegArgs(plan, outPath);
	const r = run(ffmpeg, argv, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs });
	if (r?.error) {
		const why = r.error.code === "ETIMEDOUT" ? `timed out after ${timeoutMs} ms` : `could not start (${r.error.code ?? r.error.message})`;
		throw new Error(`ffmpeg ${why}`);
	}
	if (!r || r.status !== 0) {
		const code = r?.status ?? (r?.signal ? `signal ${r.signal}` : "unknown");
		throw new Error(`ffmpeg exited with ${code}\n${tail(r?.stderr)}`);
	}
	return { ok: true, outPath, durationTicks: plan.durationTicks, ignored: plan.ignored };
}
