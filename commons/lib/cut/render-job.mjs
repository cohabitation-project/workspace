// Cohabi Cut, Job 4: the one call POST /api/cut/render makes.
//
// renderEditJob({ edit, video, music = null, outDir, run = spawnSync, ffmpeg, timeoutMs })
//   edit   what the phone sent: { trimStart, trimEnd, text?{body,y}, music?{id,volume}, coverSec }
//   video  { path, durationSec, width, height, hasAudio? }  looked up BY THE ROUTE from the client's video id.
//          `path` must be an absolute path to an existing file. width/height are the OUTPUT frame
//          (rounded down to even numbers, 16..4096). `hasAudio` defaults to true, as in the planner: a silent
//          source must say `hasAudio: false` or ffmpeg will fail on the missing audio stream (loudly, not silently).
//   music  { path } looked up by the route from edit.music.id, or null. Absolute path to an existing file.
//   outDir an absolute path to an existing directory the route owns. The output is a random cut_<16 hex>.mp4 in it.
//   returns { ok: true, outPath, seconds }   seconds = length of the rendered (trimmed) video.
//
// Order: validate everything and run editToTracks first (so a bad edit never reaches ffmpeg), then renderTimeline.
// Refusals throw TypeError/RangeError with a plain message (the route turns them into a 400); an ffmpeg failure
// throws the runner's Error (the route turns that into a 500) and any half-written output file is removed.
//
// Refuses: a trimmed length over 60 s; an outDir that is not an absolute existing directory; a video.path or
// music.path that is not an absolute existing file; edit.music with no music file given.
// If `music` is given but edit.music is absent, the music is ignored (nothing to mix at, no volume to use).
//
// Import path: same folder as edit.mjs and render-edit.mjs, so placing the three together at commons/lib/cut/
// needs no change here (edit.mjs and render-edit.mjs each have their own one-line import change).

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, statSync, unlinkSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { editToTracks } from "./edit.mjs";
import { renderTimeline } from "./render-edit.mjs";

export const MAX_RENDER_SECONDS = 60;
export const MAX_SIDE_PX = 4096;
export const MIN_SIDE_PX = 16;

function stat(p) {
	try { return statSync(p); } catch { return null; }
}

function absoluteFile(name, p) {
	if (typeof p !== "string" || p.length === 0 || /[\0\r\n]/.test(p)) throw new TypeError(`${name} must be a non-empty single-line path`);
	if (!isAbsolute(p)) throw new TypeError(`${name} must be an absolute path`);
	const s = stat(p);
	if (!s || !s.isFile()) throw new TypeError(`${name} must be an existing file`);
	return p;
}

function side(name, v) {
	if (!Number.isFinite(v)) throw new TypeError(`${name} must be a finite number`);
	const even = Math.floor(v / 2) * 2;
	if (even < MIN_SIDE_PX || even > MAX_SIDE_PX) throw new RangeError(`${name} must be from ${MIN_SIDE_PX} to ${MAX_SIDE_PX} pixels, got ${v}`);
	return even;
}

export function renderEditJob({
	edit,
	video,
	music = null,
	outDir,
	outPath: givenOutPath,
	run = spawnSync,
	ffmpeg = process.env.FFMPEG || "ffmpeg",
	timeoutMs,
} = {}) {
	if (!video || typeof video !== "object") throw new TypeError("video must be an object { path, durationSec, width, height }");
	const videoPath = absoluteFile("video.path", video.path);
	if (!Number.isFinite(video.durationSec) || video.durationSec <= 0) throw new RangeError("video.durationSec must be a number greater than 0");
	const width = side("video.width", video.width);
	const height = side("video.height", video.height);
	if (video.hasAudio !== undefined && typeof video.hasAudio !== "boolean") throw new TypeError("video.hasAudio must be true or false when given");

	if (typeof outDir !== "string" || !isAbsolute(outDir)) throw new TypeError("outDir must be an absolute path");
	const d = stat(outDir);
	if (!d || !d.isDirectory()) throw new TypeError("outDir must be an existing directory");

	let musicPath;
	if (music !== null && music !== undefined) {
		if (typeof music !== "object") throw new TypeError("music must be an object { path } or null");
		musicPath = absoluteFile("music.path", music.path);
	}
	const wantsMusic = edit && typeof edit === "object" && edit.music !== undefined && edit.music !== null;
	if (wantsMusic && musicPath === undefined) throw new TypeError("the edit asks for music but no music file was given");

	// Validates the whole edit (trim, text, music volume, cover) before anything else happens.
	const tracks = editToTracks(edit, {
		durationSec: video.durationSec,
		width,
		height,
		videoSrc: videoPath,
		musicSrc: wantsMusic ? musicPath : undefined,
	});

	const seconds = edit.trimEnd - edit.trimStart;
	if (seconds > MAX_RENDER_SECONDS) throw new RangeError(`the trimmed video is ${seconds.toFixed(1)} s; the limit is ${MAX_RENDER_SECONDS} s`);

	const sources = { [videoPath]: { hasAudio: video.hasAudio !== false, width: video.width, height: video.height } };
	// The caller (forkRenderJob) may choose the name so it can delete the file if it has to kill this process.
	if (givenOutPath !== undefined && (typeof givenOutPath !== "string" || resolve(dirname(givenOutPath)) !== resolve(outDir) || !/^cut_[0-9a-f]{16}\.mp4$/.test(basename(givenOutPath)))) throw new TypeError("outPath must be cut_<16 hex>.mp4 inside outDir");
	const outPath = givenOutPath ?? join(outDir, `cut_${randomBytes(8).toString("hex")}.mp4`);
	try {
		const res = renderTimeline({ tracks, sources, width, height, outPath, run, ffmpeg, ...(timeoutMs ? { timeoutMs } : {}) });
		return { ok: true, outPath: res.outPath, seconds };
	} catch (err) {
		try { if (existsSync(outPath)) unlinkSync(outPath); } catch { /* best effort */ }
		throw err;
	}
}
