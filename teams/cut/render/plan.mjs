// Cohabi Cut render plan, slice 1: cuts and concatenation only.
//
// Input : a SceneTracks object in the shape of commons/lib/cut/model.mjs
//         ({ overlay: Track[], main: Track, audio: Track[] }), times in integer ticks
//         (120,000 per second), plus a `sources` map { [src]: { hasAudio } }.
// Output: { inputs, filterComplex, maps, args, durationTicks, ignored } where `args` is an
//         ffmpeg argument ARRAY (never a shell string): ['-i', a, '-i', b, '-filter_complex', fc, '-map', '[vout]', '-map', '[aout]'].
//
// What this slice does: every clip on the MAIN track becomes trim (+ retime) -> normalise to one
// size/fps/format -> concat. Gaps between clips become black video + silence. Audio is always
// produced (silence for a source with hasAudio:false) so every segment has the same streams.
// What it does NOT do (reported in `ignored`, never silently dropped): overlay tracks, audio-track
// elements (music), text, effects, transitions. Those plug in later (effects through Kimi's registry).
//
// ASSUMPTION (ours, not classic's): a clip's media file is named by element.params.src. The
// caller must replace client-supplied names with server-side file paths BEFORE calling; this module
// puts `src` only in the `inputs` array, never inside a filter string.
//
// One -i per clip, not one -i per file plus split: ffmpeg allows a pad to be used once, and a
// split would buffer frames between far-apart trims.
//
// Import paths: written to run from teams/cut/render/. When placed at commons/lib/cut/plan.mjs,
// change "../port/time.mjs" to "./time.mjs", and "./registry.mjs" to "./effects.mjs" (where the
// registry is placed, beside it).

import { TICKS_PER_SECOND, clampRetimeRate, getSourceSpanAtClipTime } from "../port/time.mjs";
import { registry } from "./registry.mjs";

export const AUDIO_RATE = 48000;

export class RenderPlanError extends Error {}

// Ticks -> ffmpeg seconds text. 6 decimals = 1 microsecond, far under one frame; trailing zeros trimmed.
export function secs(ticks) {
	if (!Number.isInteger(ticks)) throw new RenderPlanError(`ticks must be an integer, got ${ticks}`);
	const s = (ticks / TICKS_PER_SECOND).toFixed(6);
	return s.replace(/\.?0+$/, "") || "0";
}

function num(n) {
	return String(Number(n.toFixed(6)));
}

// ffmpeg's atempo takes 0.5..2 per instance; chain instances for the rest of the 0.01..5 range.
export function atempoChain(rate) {
	const parts = [];
	let r = rate;
	while (r > 2) { parts.push(2); r /= 2; }
	while (r < 0.5) { parts.push(0.5); r *= 2; }
	parts.push(r);
	return parts.map((p) => `atempo=${num(p)}`);
}

function requireInt(name, v, { min }) {
	if (!Number.isInteger(v) || v < min) throw new RenderPlanError(`${name} must be an integer >= ${min}, got ${v}`);
}

function checkSrc(src) {
	if (typeof src !== "string" || src.length === 0 || /[\0\r\n]/.test(src)) {
		throw new RenderPlanError("each main-track clip needs params.src: a non-empty single-line string");
	}
}

// Per-clip effects (Job 3 integration). ASSUMPTION (ours, not classic's): a clip carries
// `effects: [{ id: "crop"|"fade"|"text", params }]`. The registry works in SECONDS; the plan works in
// TICKS, so the fade's `startTicks`/`durationTicks` (relative to the clip's start on the output) are
// converted here. Stages: crop runs on the SOURCE frame (before scale/pad); fade and text run on the
// finished output frame (after format), so text coordinates are output pixels. Within a stage, list order.
// An unknown effect id or a bad param THROWS; effects are never silently dropped.
const PRE_SCALE = new Set(["crop"]);

function effectFragments(clip) {
	const pre = [];
	const post = [];
	const list = clip.effects ?? [];
	if (!Array.isArray(list)) throw new RenderPlanError(`clip ${clip.id}.effects must be an array`);
	for (const fx of list) {
		const entry = Object.hasOwn(registry, fx?.id) ? registry[fx.id] : undefined;
		if (!entry) throw new RenderPlanError(`clip ${clip.id}: unknown effect ${JSON.stringify(fx?.id)}`);
		let params = { ...(fx.params ?? {}) };
		if (fx.id === "fade") {
			const { startTicks = 0, durationTicks, direction = "in" } = params;
			requireInt(`${clip.id} fade.startTicks`, startTicks, { min: 0 });
			requireInt(`${clip.id} fade.durationTicks`, durationTicks, { min: 1 });
			if (startTicks + durationTicks > clip.duration) {
				throw new RenderPlanError(`clip ${clip.id}: fade ${secs(startTicks)}s+${secs(durationTicks)}s runs past the clip (${secs(clip.duration)}s)`);
			}
			params = { direction, start: Number(secs(startTicks)), duration: Number(secs(durationTicks)) };
		}
		let frag;
		try {
			frag = entry.toFilter(params);
		} catch (e) {
			throw new RenderPlanError(`clip ${clip.id}: ${fx.id} effect: ${e.message}`);
		}
		(PRE_SCALE.has(fx.id) ? pre : post).push(frag);
	}
	return { pre, post };
}

export function buildRenderPlan({ tracks, sources = {}, width = 1080, height = 1920, fps = 30 }) {
	if (!tracks?.main || !Array.isArray(tracks.main.elements)) throw new RenderPlanError("tracks.main is required");
	for (const [k, v] of Object.entries({ width, height, fps })) {
		if (!Number.isInteger(v) || v <= 0 || (k !== "fps" && v % 2)) {
			throw new RenderPlanError(`${k} must be a positive integer${k === "fps" ? "" : " and even (yuv420p)"}, got ${v}`);
		}
	}
	const ignored = [];
	for (const t of [...(tracks.overlay ?? []), ...(tracks.audio ?? [])]) {
		for (const e of t.elements) ignored.push({ trackId: t.id, elementId: e.id, reason: `${t.type} track elements are not rendered in this slice` });
	}

	const clips = tracks.main.elements.filter((e) => {
		if (e.type === "video") return true;
		ignored.push({ trackId: tracks.main.id, elementId: e.id, reason: `${e.type} element on the main track is not rendered in this slice` });
		return false;
	}).sort((a, b) => a.startTime - b.startTime);
	if (clips.length === 0) throw new RenderPlanError("the main track has no video clips to render");

	const inputs = [];
	const chains = [];
	const labels = []; // per segment: ['[v0]','[a0]']
	let cursor = 0;

	const gap = (ticks) => {
		const i = labels.length;
		const d = secs(ticks);
		chains.push(`color=c=black:s=${width}x${height}:r=${fps}:d=${d},setsar=1,format=yuv420p[v${i}]`);
		chains.push(`anullsrc=r=${AUDIO_RATE}:cl=stereo,atrim=duration=${d},asetpts=PTS-STARTPTS[a${i}]`);
		labels.push(`[v${i}][a${i}]`);
	};

	for (const clip of clips) {
		requireInt(`${clip.id}.startTime`, clip.startTime, { min: 0 });
		requireInt(`${clip.id}.duration`, clip.duration, { min: 1 });
		requireInt(`${clip.id}.trimStart`, clip.trimStart ?? 0, { min: 0 });
		checkSrc(clip.params?.src);
		if (clip.startTime < cursor) throw new RenderPlanError(`clip ${clip.id} overlaps the previous clip on the main track`);
		if (clip.startTime > cursor) gap(clip.startTime - cursor);

		const rate = clampRetimeRate({ rate: clip.retime?.rate ?? 1 });
		const trimStart = clip.trimStart ?? 0;
		const span = Math.round(getSourceSpanAtClipTime({ clipTime: clip.duration, retime: clip.retime }));
		const trimEnd = trimStart + span;
		if (typeof clip.sourceDuration === "number" && trimEnd > clip.sourceDuration + Math.ceil(rate) + 1) {
			throw new RenderPlanError(`clip ${clip.id} asks for source up to ${secs(trimEnd)}s but the source is ${secs(clip.sourceDuration)}s long`);
		}

		const fx = effectFragments(clip);
		const i = labels.length;
		const n = inputs.length;
		inputs.push(clip.params.src);
		const d = secs(clip.duration);
		const setpts = rate === 1 ? "setpts=PTS-STARTPTS" : `setpts=(PTS-STARTPTS)/${num(rate)}`;
		chains.push(
			`[${n}:v]trim=start=${secs(trimStart)}:end=${secs(trimEnd)},${setpts},trim=end=${d},` +
			[...fx.pre,
				`scale=${width}:${height}:force_original_aspect_ratio=decrease`,
				`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
				"setsar=1", `fps=${fps}`, "format=yuv420p", ...fx.post].join(",") +
			`[v${i}]`,
		);
		if (sources[clip.params.src]?.hasAudio === false) {
			chains.push(`anullsrc=r=${AUDIO_RATE}:cl=stereo,atrim=duration=${d},asetpts=PTS-STARTPTS[a${i}]`);
		} else {
			const tempo = rate === 1 ? [] : atempoChain(rate);
			chains.push(
				`[${n}:a]atrim=start=${secs(trimStart)}:end=${secs(trimEnd)},asetpts=PTS-STARTPTS,` +
				[...tempo, `atrim=end=${d}`, `aresample=${AUDIO_RATE}`, "aformat=sample_fmts=fltp:channel_layouts=stereo"].join(",") +
				`[a${i}]`,
			);
		}
		labels.push(`[v${i}][a${i}]`);
		cursor = clip.startTime + clip.duration;
	}

	chains.push(`${labels.join("")}concat=n=${labels.length}:v=1:a=1[vout][aout]`);
	const filterComplex = chains.join(";");
	const args = [];
	for (const src of inputs) args.push("-i", src);
	args.push("-filter_complex", filterComplex, "-map", "[vout]", "-map", "[aout]");
	return { inputs, filterComplex, maps: { video: "[vout]", audio: "[aout]" }, args, durationTicks: cursor, ignored };
}
