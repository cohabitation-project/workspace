// Cohabi Cut timeline port, part 2: model, factories, scenes, update pipeline, trim.
// Source: OpenCut classic (MIT) at cf5e79e919144200294fb9fed22a222592a0aeea, apps/web/src/timeline/.
// Track types in classic: "video" | "text" | "audio" | "graphic" | "effect"
// (Ash's step-0 note said media|text|audio|overlay; the code says otherwise).
// SceneTracks = { overlay: Track[], main: Track, audio: Track[] }.
//
// STAND-INS (not ported line for line; behaviour is ours, labelled so):
//  - animations: classic's animation module was not ported. Here animations is
//    { [channel]: [{ time, value }] } with keys in element-local ticks.
//  - scenes + trim: reimplemented from a read of scenes.ts / the resize idea,
//    not copied. classic's compute-resize.ts was not read.

import {
	ZERO_MEDIA_TIME,
	roundMediaTime,
	clampRetimeRate,
	getSourceSpanAtClipTime,
	getTimelineDurationForSourceSpan,
} from "./time.mjs";

export const TRACK_TYPES = ["video", "text", "audio", "graphic", "effect"];

let counter = 0;
export function generateId() {
	if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
	counter += 1;
	return `id_${Date.now().toString(36)}_${counter}`;
}

export function isRetimableElement(element) {
	return element.type === "video" || element.type === "audio";
}

export function createTrack({ type, name, id = generateId(), elements = [] }) {
	if (!TRACK_TYPES.includes(type)) throw new Error(`unknown track type: ${type}`);
	return { id, type, name: name ?? type, elements };
}

export function createElement({
	type,
	name,
	startTime = 0,
	duration,
	trimStart = 0,
	trimEnd = 0,
	sourceDuration,
	retime,
	animations,
	params = {},
	id = generateId(),
}) {
	if (!TRACK_TYPES.includes(type)) throw new Error(`unknown element type: ${type}`);
	for (const [k, v] of Object.entries({ startTime, duration, trimStart, trimEnd })) {
		if (!Number.isInteger(v)) throw new Error(`${k} must be integer ticks, got ${v}`);
	}
	const element = { id, type, name: name ?? type, startTime, duration, trimStart, trimEnd, params };
	if (sourceDuration !== undefined) element.sourceDuration = sourceDuration;
	if (retime !== undefined) element.retime = retime;
	if (animations !== undefined) element.animations = animations;
	return element;
}

export function createEmptyTracks() {
	return { overlay: [], main: createTrack({ type: "video", name: "Main" }), audio: [] };
}

export function getAllTracks(tracks) {
	return [...tracks.overlay, tracks.main, ...tracks.audio];
}

export function findElement({ tracks, elementId }) {
	for (const track of getAllTracks(tracks)) {
		const element = track.elements.find((e) => e.id === elementId);
		if (element) return { track, element };
	}
	return null;
}

export function getTimelineEnd(tracks) {
	let end = 0;
	for (const track of getAllTracks(tracks)) {
		for (const e of track.elements) end = Math.max(end, e.startTime + e.duration);
	}
	return end;
}

// Map every track of a SceneTracks through fn (keeps the overlay/main/audio shape).
export function mapTracks(tracks, fn) {
	return { overlay: tracks.overlay.map(fn), main: fn(tracks.main), audio: tracks.audio.map(fn) };
}

// --- animations stand-in ---

export function splitAnimationsAtTime({ animations, splitTime, shouldIncludeSplitBoundary = true }) {
	if (!animations) return { leftAnimations: undefined, rightAnimations: undefined };
	const left = {};
	const right = {};
	for (const [channel, keys] of Object.entries(animations)) {
		left[channel] = keys.filter((k) =>
			shouldIncludeSplitBoundary ? k.time <= splitTime : k.time < splitTime);
		right[channel] = keys
			.filter((k) => (shouldIncludeSplitBoundary ? k.time >= splitTime : k.time > splitTime))
			.map((k) => ({ ...k, time: k.time - splitTime }));
	}
	return { leftAnimations: left, rightAnimations: right };
}

export function clampAnimationsToDuration({ animations, duration }) {
	if (!animations) return animations;
	const out = {};
	for (const [channel, keys] of Object.entries(animations)) {
		out[channel] = keys.filter((k) => k.time >= 0 && k.time <= duration);
	}
	return out;
}

// --- scenes (stand-in) ---

export function createScene({ name, isMain = false, id = generateId() }) {
	return { id, name, isMain, tracks: createEmptyTracks(), bookmarks: [] };
}

export function getMainScene(scenes) {
	return scenes.find((s) => s.isMain) ?? null;
}

export function ensureMainScene(scenes) {
	if (getMainScene(scenes)) return scenes;
	return [createScene({ name: "Main scene", isMain: true }), ...scenes];
}

export function deleteScene({ scenes, sceneId }) {
	const scene = scenes.find((s) => s.id === sceneId);
	if (!scene) return scenes;
	if (scene.isMain) throw new Error("the main scene cannot be deleted");
	return scenes.filter((s) => s.id !== sceneId);
}

// --- update pipeline: derive rules, then enforce rules ---

function sourceDurationOf(element) {
	if (typeof element.sourceDuration === "number") return element.sourceDuration;
	// Inferred when no stored source length: visible source + both trims.
	const visible = getSourceSpanAtClipTime({ clipTime: element.duration, retime: element.retime });
	return element.trimStart + element.trimEnd + visible;
}

const deriveRules = [
	{
		triggers: ["retime"],
		apply({ element, originalElement, patch }) {
			if (!("retime" in patch) || !isRetimableElement(element)) return { element };
			const nextRetime = patch.retime
				? { ...patch.retime, rate: clampRetimeRate({ rate: patch.retime.rate }) }
				: undefined;
			const visible = Math.max(0, sourceDurationOf(originalElement) - element.trimStart - element.trimEnd);
			const duration = roundMediaTime({
				time: getTimelineDurationForSourceSpan({ sourceSpan: visible, retime: nextRetime }),
			});
			return { element: { ...element, retime: nextRetime, duration }, changedFields: ["retime", "duration"] };
		},
	},
];

const enforceRules = [
	{
		triggers: ["duration"],
		apply: ({ element }) => ({
			element: element.animations
				? { ...element, animations: clampAnimationsToDuration({ animations: element.animations, duration: element.duration }) }
				: element,
		}),
	},
	{
		triggers: ["startTime"],
		apply({ element, context }) {
			const requested = Math.max(ZERO_MEDIA_TIME, element.startTime);
			if (context.trackId !== context.tracks.main.id) {
				return { element: { ...element, startTime: requested } };
			}
			// On the main track an element that would come first snaps to 0.
			let earliest = null;
			for (const c of context.tracks.main.elements) {
				if (c.id === element.id) continue;
				if (!earliest || c.startTime < earliest.startTime) earliest = c;
			}
			const startTime = !earliest || requested <= earliest.startTime ? ZERO_MEDIA_TIME : requested;
			return { element: { ...element, startTime } };
		},
	},
];

export function applyElementUpdate({ element, patch, context }) {
	let next = { ...element, ...patch, params: { ...element.params, ...(patch.params ?? {}) } };
	const changed = new Set(Object.keys(patch));
	for (const rule of deriveRules) {
		if (!rule.triggers.some((t) => changed.has(t))) continue;
		const result = rule.apply({ element: next, originalElement: element, patch, context });
		next = result.element;
		for (const f of result.changedFields ?? []) changed.add(f);
	}
	for (const rule of enforceRules) {
		if (!rule.triggers.some((t) => changed.has(t))) continue;
		next = rule.apply({ element: next, originalElement: element, patch, context }).element;
	}
	return next;
}

// --- trim (stand-in). delta is TIMELINE ticks; positive shrinks the clip. ---
// Source-side trim moves by round(delta * rate). Never below 0 trim, never under 1 tick long.

export function trimElement({ element, side, delta }) {
	if (!Number.isInteger(delta)) throw new Error("delta must be integer ticks");
	const rate = clampRetimeRate({ rate: element.retime?.rate ?? 1 });
	if (side === "start") {
		const minDelta = -Math.floor(element.trimStart / rate); // can only un-trim what was trimmed
		const d = Math.min(Math.max(delta, minDelta), element.duration - 1);
		const sourceDelta = Math.max(-element.trimStart, roundMediaTime({ time: d * rate }));
		return { ...element, startTime: element.startTime + d, duration: element.duration - d, trimStart: element.trimStart + sourceDelta };
	}
	if (side === "end") {
		const minDelta = -Math.floor(element.trimEnd / rate);
		const d = Math.min(Math.max(delta, minDelta), element.duration - 1);
		const sourceDelta = Math.max(-element.trimEnd, roundMediaTime({ time: d * rate }));
		return { ...element, duration: element.duration - d, trimEnd: element.trimEnd + sourceDelta };
	}
	throw new Error("side must be start or end");
}
