// Cohabi Cut, Job 4: the handler POST /api/cut/render calls.
//
// handleCutRender({ member, body, deps }) -> Promise<{ status, json }>
//
//   member  the signed-in member (route already authenticated): { id }. No member id -> 401.
//   body    parsed JSON from the phone: { videoId, edit, musicId? }.
//   deps    everything the handler touches, so server.mjs stays three lines and tests need no server:
//     videos.get(id)   -> null | { owner, path, durationSec, width, height, hasAudio? }
//     music.get(id)    -> null | { owner?, public?, path }     (only needed when music is asked for)
//     probe(path)      -> boolean | { hasAudio }               optional; when absent the video record's hasAudio is used
//     outDir           absolute existing directory (renders go here as cut_<16hex>.mp4)
//     publicUrl(outPath) -> string                              optional; default "/cut/<basename>" (the server must serve it)
//     renderJob(args)  -> result | Promise<result>              optional; default renderEditJob from ./render-job.mjs
//     maxJobs          site-wide simultaneous renders, default 2
//     log(msg)         optional, gets the real error text of a failed render (never sent to the client)
//
// Answers:
//   200 { ok:true, url, seconds }
//   400 bad body / bad ids / the edit refused (the refusal's own message)
//   401 no member
//   403 the video (or music) is not yours
//   404 no such video / music
//   422 the server could not read the video's audio
//   429 "one export at a time" (this member already has a render) | "the editor is busy, try again in a minute" (site cap)
//   500 "the render failed" (the ffmpeg text goes to deps.log only)
//
// Order: validate -> look up + ownership -> concurrency slots -> probe -> render. Slots are always released.
//
// IMPORTANT FOR THE WIRING: renderEditJob / renderTimeline call ffmpeg with spawnSync by default. A synchronous render
// blocks the Node event loop, so while it runs no second request is even read and the 429 guards cannot fire. The
// guards are real only if deps.renderJob runs ffmpeg off the event loop (a child process or worker returning a promise).
// With the default renderJob they are still correct, just idle.

import { basename } from "node:path";
import { renderEditJob } from "./render-job.mjs";

export const DEFAULT_MAX_JOBS = 2;
const MAX_ID_LEN = 200;

// Per-process counters. One map entry per member with a render running; `active` is the site-wide count.
const memberBusy = new Set();
let active = 0;

export function _resetCutRouteState() { memberBusy.clear(); active = 0; }
export function _cutRouteState() { return { members: [...memberBusy], active }; }

const reply = (status, json) => ({ status, json });
const fail = (status, error) => reply(status, { ok: false, error });

function goodId(v) {
	return typeof v === "string" && v.length > 0 && v.length <= MAX_ID_LEN && !/[\0\r\n]/.test(v);
}

export async function handleCutRender({ member, body, deps } = {}) {
	if (!member || !goodId(member.id)) return fail(401, "sign in to export");
	if (!deps || typeof deps !== "object" || !deps.videos || typeof deps.videos.get !== "function") {
		return fail(500, "the editor is not set up on this server");
	}
	if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "send { videoId, edit }");
	const { videoId, edit } = body;
	if (!goodId(videoId)) return fail(400, "videoId is required");
	if (!edit || typeof edit !== "object" || Array.isArray(edit)) return fail(400, "edit is required");
	if (body.musicId !== undefined && body.musicId !== null && !goodId(body.musicId)) return fail(400, "musicId must be a short text id");
	const musicId = body.musicId ?? (edit.music && typeof edit.music === "object" ? edit.music.id : undefined);
	if (musicId !== undefined && musicId !== null && !goodId(musicId)) return fail(400, "music id must be a short text id");
	// Only fetch music when the edit actually mixes it; the job ignores music without edit.music.
	const wantsMusic = edit.music !== undefined && edit.music !== null;
	if (wantsMusic && !musicId) return fail(400, "the edit asks for music but gives no music id");

	const video = await deps.videos.get(videoId); // await: the server's adapter may be async (real stores are sync, fakes too)
	if (!video) return fail(404, "no such video");
	if (video.owner !== member.id) return fail(403, "that video is not yours");
	// Refuse before any probe or ffmpeg: a video still converting (or that failed) can still have its .orig on disk,
	// so the file lookup alone does not say it is usable. Stores that don't report `ready` (older fakes) pass.
	if (video.failed === true) return fail(409, "This video could not be prepared. Upload it again.");
	if (video.ready === false) return fail(409, "This video is still being prepared. Try again when it shows ready.");

	let music = null;
	if (wantsMusic) {
		if (!deps.music || typeof deps.music.get !== "function") return fail(400, "music is not available on this server");
		const m = await deps.music.get(musicId);
		if (!m) return fail(404, "no such music");
		// Label tracks are public: they say so explicitly. Everything else must be the member's own.
		if (m.public !== true && m.owner !== member.id) return fail(403, "that music is not yours");
		music = { path: m.path };
	}

	const maxJobs = Number.isInteger(deps.maxJobs) && deps.maxJobs > 0 ? deps.maxJobs : DEFAULT_MAX_JOBS;
	if (memberBusy.has(member.id)) return fail(429, "one export at a time");
	if (active >= maxJobs) return fail(429, "the editor is busy, try again in a minute");
	memberBusy.add(member.id);
	active += 1;
	try {
		let hasAudio = video.hasAudio;
		const dims = {}; // measured by deps.probe AFTER the ownership check; the store's record has no width/height
		if (typeof deps.probe === "function") {
			try {
				const p = await deps.probe(video.path);
				hasAudio = typeof p === "boolean" ? p : p && typeof p === "object" ? p.hasAudio : undefined;
				if (p && typeof p === "object") for (const k of ["durationSec", "width", "height"]) if (Number.isFinite(p[k]) && p[k] > 0) dims[k] = p[k];
			} catch (err) {
				if (typeof deps.log === "function") deps.log(`cut probe failed: ${err && err.message}`);
				return fail(422, "could not read that video");
			}
			if (typeof hasAudio !== "boolean") return fail(422, "could not read that video");
		}

		const job = {
			edit,
			video: {
				path: video.path, durationSec: video.durationSec, width: video.width, height: video.height,
				...dims,
				...(typeof hasAudio === "boolean" ? { hasAudio } : {}),
			},
			music,
			outDir: deps.outDir,
		};
		let res;
		try {
			res = await (typeof deps.renderJob === "function" ? deps.renderJob(job) : renderEditJob(job));
		} catch (err) {
			// TypeError/RangeError are the job's own refusals (bad edit, bad file, too long): safe to show.
			if (err instanceof TypeError || err instanceof RangeError || (err && err.name === "RenderPlanError")) {
				return fail(400, String(err.message || "the edit was refused"));
			}
			if (typeof deps.log === "function") deps.log(`cut render failed: ${err && err.message}`);
			return fail(500, "the render failed");
		}
		const url = typeof deps.publicUrl === "function" ? deps.publicUrl(res.outPath) : `/cut/${basename(res.outPath)}`;
		return reply(200, { ok: true, url, seconds: res.seconds });
	} finally {
		memberBusy.delete(member.id);
		active -= 1;
	}
}
