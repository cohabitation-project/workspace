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
// ONE audio-track music element is trimmed, delayed to its timeline start, and mixed under that
// main audio with amix duration=first (the main timeline therefore sets the output duration).
// More than one music element is refused for now. Text overlay (Words) tracks become timed
// drawtext filters after concat; other overlay tracks and main-track text are reported in
// `ignored`, never silently dropped. Transitions are not implemented; effects use the registry.
//
// ASSUMPTION (ours, not classic's): a clip's media file is named by element.params.src. The
// caller must replace client-supplied names with server-side file paths BEFORE calling; this module
// puts `src` only in the `inputs` array, never inside a filter string.
//
// One -i per clip, not one -i per file plus split: ffmpeg allows a pad to be used once, and a
// split would buffer frames between far-apart trims.
//
// Import paths: written to run from teams/cut/render/. When placed at commons/lib/cut/plan.mjs,
// change "./time.mjs" to "./time.mjs".

import { TICKS_PER_SECOND, clampRetimeRate, getSourceSpanAtClipTime } from "./time.mjs";
// Effects slice (Job 3): when placed at commons/lib/cut/plan.mjs this becomes "./effects.mjs"
// (Kimi's registry is placed there under that name).
import { registry } from "./effects.mjs";
// Overlay Words tracks become timed drawtext filters after the main concat.
// When placed at commons/lib/cut/plan.mjs this import has the same relative path.
import { wordsTrackToTextEffects } from "./words-to-text.mjs";

export const AUDIO_RATE = 48000;

export class RenderPlanError extends Error {}

// A clip's `params.effects: [{ id, params }]` become video filters, in array order, placed AFTER the
// trim/retime/trim and BEFORE the scale/pad normalise step. So fade times are seconds of the clip's own
// output (0 = the clip's first frame, after retime), and crop/text coordinates are in SOURCE pixels.
// The registry's API is used as-is: registry[id].toFilter(params) -> one filter string.
// - unknown id (checked with Object.hasOwn, so "constructor"/"__proto__" are unknown too) -> RenderPlanError
// - a registry guard that throws TypeError/RangeError is rethrown as RenderPlanError naming the clip and effect
// - crop: if the caller gave `sources[src] = { width, height }` and the effect has no frameWidth/frameHeight,
//   they are filled in so the registry's "rectangle fits the frame" guard runs.
function effectFilters(clip, sources) {
	const list = clip.params?.effects;
	if (list === undefined) return [];
	if (!Array.isArray(list)) throw new RenderPlanError(`clip ${clip.id}: params.effects must be an array`);
	return list.map((fx, k) => {
		const where = `clip ${clip.id} effect #${k}`;
		if (!fx || typeof fx !== "object" || typeof fx.id !== "string") throw new RenderPlanError(`${where}: needs a string id`);
		if (!Object.hasOwn(registry, fx.id)) throw new RenderPlanError(`${where}: unknown effect id ${JSON.stringify(fx.id)}`);
		let params = fx.params ?? {};
		if (typeof params !== "object" || Array.isArray(params)) throw new RenderPlanError(`${where} (${fx.id}): params must be an object`);
		if (fx.id === "crop" && params.frameWidth === undefined && params.frameHeight === undefined) {
			const size = sources[clip.params.src];
			if (Number.isInteger(size?.width) && Number.isInteger(size?.height)) params = { ...params, frameWidth: size.width, frameHeight: size.height };
		}
		try {
			return registry[fx.id].toFilter(params);
		} catch (e) {
			if (e instanceof TypeError || e instanceof RangeError) throw new RenderPlanError(`${where} (${fx.id}): ${e.message}`);
			throw e;
		}
	});
}

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

export function buildRenderPlan({ tracks, sources = {}, width = 1080, height = 1920, fps = 30 }) {
	if (!tracks?.main || !Array.isArray(tracks.main.elements)) throw new RenderPlanError("tracks.main is required");
	for (const [k, v] of Object.entries({ width, height, fps })) {
		if (!Number.isInteger(v) || v <= 0 || (k !== "fps" && v % 2)) {
			throw new RenderPlanError(`${k} must be a positive integer${k === "fps" ? "" : " and even (yuv420p)"}, got ${v}`);
		}
	}
	const ignored = [];
	const wordsFilters = [];
	for (const t of tracks.overlay ?? []) {
		if (t.type === "text") {
			// The adapter validates the Words schema and derives output-second enable windows
			// from timeline ticks. The registry remains the only drawtext serializer.
			let descriptors;
			try {
				descriptors = wordsTrackToTextEffects(t);
				for (const fx of descriptors) wordsFilters.push(registry.text.toFilter(fx.params));
			} catch (e) {
				if (e instanceof TypeError || e instanceof RangeError) {
					throw new RenderPlanError(`overlay Words track ${t.id}: ${e.message}`);
				}
				throw e;
			}
			continue;
		}
		for (const e of t.elements) ignored.push({ trackId: t.id, elementId: e.id, reason: `${t.type} track elements are not rendered in this slice` });
	}

	const music = (tracks.audio ?? []).flatMap((t) => t.elements.map((element) => ({ trackId: t.id, element })));
	if (music.length > 1) throw new RenderPlanError("only one audio-track music element is supported in this slice");
	const musicElement = music[0]?.element;
	const musicVolume = musicElement?.params?.volume === undefined ? 1 : musicElement.params.volume;
	const musicFadeIn = musicElement?.params?.fadeIn === undefined ? 0 : musicElement.params.fadeIn;
	const musicFadeOut = musicElement?.params?.fadeOut === undefined ? 0 : musicElement.params.fadeOut;
	if (musicElement) {
		if (musicElement.type !== "audio") throw new RenderPlanError(`music element ${musicElement.id} must have type audio`);
		requireInt(`${musicElement.id}.startTime`, musicElement.startTime, { min: 0 });
		requireInt(`${musicElement.id}.duration`, musicElement.duration, { min: 1 });
		requireInt(`${musicElement.id}.trimStart`, musicElement.trimStart ?? 0, { min: 0 });
		const src = musicElement.params?.src;
		if (typeof src !== "string" || src.length === 0 || /[\0\r\n]/.test(src)) {
			throw new RenderPlanError(`music element ${musicElement.id} needs params.src: a non-empty single-line string`);
		}
		if (typeof musicVolume !== "number" || !Number.isFinite(musicVolume) || musicVolume < 0 || musicVolume > 2) {
			throw new RenderPlanError(`music element ${musicElement.id} params.volume must be a finite number from 0 to 2, got ${String(musicVolume)}`);
		}
		const musicDurationSeconds = musicElement.duration / TICKS_PER_SECOND;
		for (const [name, value] of [["fadeIn", musicFadeIn], ["fadeOut", musicFadeOut]]) {
			if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > musicDurationSeconds) {
				throw new RenderPlanError(`music element ${musicElement.id} params.${name} must be a finite number from 0 to the element duration (${musicDurationSeconds}s), got ${String(value)}`);
			}
		}
		if (musicFadeIn + musicFadeOut > musicDurationSeconds) {
			throw new RenderPlanError(`music element ${musicElement.id} params.fadeIn + params.fadeOut must not exceed the element duration (${musicDurationSeconds}s)`);
		}
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

		const i = labels.length;
		const n = inputs.length;
		inputs.push(clip.params.src);
		const d = secs(clip.duration);
		const setpts = rate === 1 ? "setpts=PTS-STARTPTS" : `setpts=(PTS-STARTPTS)/${num(rate)}`;
		const fx = effectFilters(clip, sources);
		chains.push(
			`[${n}:v]trim=start=${secs(trimStart)}:end=${secs(trimEnd)},${setpts},trim=end=${d},` +
			(fx.length ? `${fx.join(",")},` : "") +
			`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,` +
			`setsar=1,fps=${fps},format=yuv420p[v${i}]`,
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

	const concatVideo = wordsFilters.length ? "vconcat" : "vout";
	chains.push(`${labels.join("")}concat=n=${labels.length}:v=1:a=1[${concatVideo}][${musicElement ? "amain" : "aout"}]`);
	if (wordsFilters.length) chains.push(`[vconcat]${wordsFilters.join(",")}[vout]`);
	if (musicElement) {
		const n = inputs.length;
		const trimStart = musicElement.trimStart ?? 0;
		const trimEnd = trimStart + musicElement.duration;
		const delay = num((musicElement.startTime / TICKS_PER_SECOND) * 1000);
		const volumeFilter = musicVolume === 1 ? "" : `volume=${num(musicVolume)},`;
		const musicDurationSeconds = musicElement.duration / TICKS_PER_SECOND;
		const fadeFilters = [
			musicFadeIn > 0 ? `afade=t=in:st=0:d=${num(musicFadeIn)}` : "",
			musicFadeOut > 0 ? `afade=t=out:st=${num(musicDurationSeconds - musicFadeOut)}:d=${num(musicFadeOut)}` : "",
		].filter(Boolean).join(",");
		inputs.push(musicElement.params.src);
		chains.push(
			`[${n}:a]atrim=start=${secs(trimStart)}:end=${secs(trimEnd)},asetpts=PTS-STARTPTS,` +
			`${fadeFilters ? `${fadeFilters},` : ""}aresample=${AUDIO_RATE},aformat=sample_fmts=fltp:channel_layouts=stereo,${volumeFilter}adelay=${delay}|${delay}[amusic]`,
		);
		chains.push("[amain][amusic]amix=inputs=2:duration=first:normalize=0[aout]");
	}
	const filterComplex = chains.join(";");
	const args = [];
	for (const src of inputs) args.push("-i", src);
	args.push("-filter_complex", filterComplex, "-map", "[vout]", "-map", "[aout]");
	return { inputs, filterComplex, maps: { video: "[vout]", audio: "[aout]" }, args, durationTicks: cursor, ignored };
}
