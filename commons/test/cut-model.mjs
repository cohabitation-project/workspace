// Cut port, model.mjs tests, written to kill the survivors of mutation-model.py.
// Same stand-in caveat as cut-timeline.test.mjs: these assert OUR reading of the model, not classic's behaviour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TICKS_PER_SECOND } from "../lib/cut/time.mjs";
import {
	isRetimableElement, createTrack, createElement, createEmptyTracks, createScene, ensureMainScene,
	deleteScene, applyElementUpdate, trimElement, getAllTracks, getTimelineEnd,
	splitAnimationsAtTime, clampAnimationsToDuration,
} from "../lib/cut/model.mjs";

const S = TICKS_PER_SECOND;

function tracksWith({ main = [], overlay = [], audio = [] } = {}) {
	const t = createEmptyTracks();
	t.main = { ...t.main, id: "main", elements: main };
	t.overlay = overlay.length ? [createTrack({ type: "graphic", id: "ov1", elements: overlay })] : [];
	t.audio = audio.length ? [createTrack({ type: "audio", id: "au1", elements: audio })] : [];
	return t;
}

test("factories: unknown types and non-integer ticks are refused", () => {
	assert.throws(() => createTrack({ type: "media" }), /unknown track type/);
	assert.throws(() => createElement({ type: "overlay", duration: 1 }), /unknown element type/);
	for (const k of ["startTime", "duration", "trimStart", "trimEnd"]) {
		assert.throws(() => createElement({ type: "video", duration: 10, [k]: 1.5 }), /integer ticks/, k);
	}
	const e = createElement({ type: "text", duration: 10 });
	assert.equal("retime" in e, false);
	assert.equal("animations" in e, false);
});

test("retimable: video and audio only", () => {
	assert.equal(isRetimableElement({ type: "video" }), true);
	assert.equal(isRetimableElement({ type: "audio" }), true);
	for (const type of ["text", "graphic", "effect"]) assert.equal(isRetimableElement({ type }), false, type);
});

test("track order is overlay, main, audio; timeline end is the latest start + duration on any track", () => {
	const a = createElement({ id: "a", type: "video", startTime: 0, duration: 100 });
	const o = createElement({ id: "o", type: "graphic", startTime: 50, duration: 400 });
	const u = createElement({ id: "u", type: "audio", startTime: 10, duration: 20 });
	const t = tracksWith({ main: [a], overlay: [o], audio: [u] });
	assert.deepEqual(getAllTracks(t).map((x) => x.id), ["ov1", "main", "au1"]);
	assert.equal(getTimelineEnd(t), 450);
	assert.equal(getTimelineEnd(tracksWith()), 0);
});

test("animation keys: exactly 0..duration survive (both ends inclusive)", () => {
	const keys = [-1, 0, 5, 10, 11].map((time) => ({ time, value: time }));
	const out = clampAnimationsToDuration({ animations: { x: keys }, duration: 10 });
	assert.deepEqual(out.x.map((k) => k.time), [0, 5, 10]);
	assert.equal(clampAnimationsToDuration({ animations: undefined, duration: 10 }), undefined);
});

test("splitAnimationsAtTime: no animations in, undefined out; a boundary key lands on both sides when included", () => {
	assert.deepEqual(splitAnimationsAtTime({ animations: undefined, splitTime: 5 }), { leftAnimations: undefined, rightAnimations: undefined });
	const animations = { x: [{ time: 2, value: 1 }, { time: 5, value: 2 }, { time: 9, value: 3 }] };
	const incl = splitAnimationsAtTime({ animations, splitTime: 5, shouldIncludeSplitBoundary: true });
	assert.deepEqual(incl.leftAnimations.x.map((k) => k.time), [2, 5]);
	assert.deepEqual(incl.rightAnimations.x.map((k) => k.time), [0, 4]);
	const excl = splitAnimationsAtTime({ animations, splitTime: 5, shouldIncludeSplitBoundary: false });
	assert.deepEqual(excl.leftAnimations.x.map((k) => k.time), [2]);
	assert.deepEqual(excl.rightAnimations.x.map((k) => k.time), [4]);
});

test("scenes: the main scene is added at the FRONT; deleting an unknown id is a no-op that does not throw", () => {
	const s1 = createScene({ id: "s1", name: "one" });
	const withMain = ensureMainScene([s1]);
	assert.equal(withMain.length, 2);
	assert.equal(withMain[0].isMain, true);
	assert.equal(withMain[1].id, "s1");
	assert.equal(ensureMainScene(withMain), withMain);
	assert.deepEqual(deleteScene({ scenes: withMain, sceneId: "nope" }), withMain);
});

test("update: a duration change clamps animation keys; so does a retime that shortens the clip", () => {
	const animations = { x: [{ time: 0, value: 0 }, { time: 600, value: 1 }, { time: 1000, value: 2 }] };
	const tracks = tracksWith();
	const el = createElement({ id: "a", type: "video", duration: 1000, sourceDuration: 1000, animations });
	const shorter = applyElementUpdate({ element: el, patch: { duration: 500 }, context: { tracks, trackId: "main" } });
	assert.deepEqual(shorter.animations.x.map((k) => k.time), [0]);
	const fast = applyElementUpdate({ element: el, patch: { retime: { rate: 2 } }, context: { tracks, trackId: "main" } });
	assert.equal(fast.duration, 500);
	assert.deepEqual(fast.animations.x.map((k) => k.time), [0], "derived duration must trigger the enforce rule");
});

test("update: a retime patch on a text clip does not derive a duration or clamp the rate", () => {
	const el = createElement({ id: "t", type: "text", duration: 1000 });
	const next = applyElementUpdate({ element: el, patch: { retime: { rate: 9 } }, context: { tracks: tracksWith(), trackId: "main" } });
	assert.equal(next.duration, 1000);
	assert.equal(next.retime.rate, 9);
});

test("update: visible source never goes below 0 when trims exceed the source", () => {
	const el = createElement({ id: "v", type: "video", duration: 100, sourceDuration: 1000 });
	const next = applyElementUpdate({
		element: el, patch: { retime: { rate: 1 }, trimStart: 900, trimEnd: 900 },
		context: { tracks: tracksWith(), trackId: "main" },
	});
	assert.equal(next.duration, 0);
});

test("update: a stored sourceDuration is used; with none, source length is inferred from duration plus both trims", () => {
	const ctx = { tracks: tracksWith(), trackId: "main" };
	// stored 1000, even though duration says 400: rate 2 => 500, not 200
	const stored = createElement({ id: "s", type: "video", duration: 400, sourceDuration: 1000 });
	assert.equal(applyElementUpdate({ element: stored, patch: { retime: { rate: 2 } }, context: ctx }).duration, 500);
	// none stored: 600 visible + 100 + 300 trims = 1000 source; visible 600 at rate 2 => 300
	const inferred = createElement({ id: "i", type: "video", duration: 600, trimStart: 100, trimEnd: 300 });
	assert.equal(applyElementUpdate({ element: inferred, patch: { retime: { rate: 2 } }, context: ctx }).duration, 300);
});

test("update: params merge key by key, they are not replaced", () => {
	const el = createElement({ id: "p", type: "text", duration: 10, params: { color: "red", size: 4 } });
	const next = applyElementUpdate({ element: el, patch: { params: { size: 8 } }, context: { tracks: tracksWith(), trackId: "main" } });
	assert.deepEqual(next.params, { color: "red", size: 8 });
});

test("start-time rule: the main-track 'first clip snaps to 0' rule", () => {
	const a = createElement({ id: "a", type: "video", startTime: 0, duration: 100 });
	const b = createElement({ id: "b", type: "video", startTime: 5000, duration: 100 });
	const c = createElement({ id: "c", type: "video", startTime: 3000, duration: 100 });
	const tracks = tracksWith({ main: [a, b, c] });
	const ctx = { tracks, trackId: "main" };
	// earlier than the earliest OTHER clip => 0; later than the earliest => kept (kills earliest = latest)
	assert.equal(applyElementUpdate({ element: c, patch: { startTime: 100 }, context: ctx }).startTime, 100);
	// negative is clamped to 0
	assert.equal(applyElementUpdate({ element: c, patch: { startTime: -50 }, context: ctx }).startTime, 0);
	// tie with the earliest other clip snaps to 0 too
	const a2 = createElement({ id: "a2", type: "video", startTime: 400, duration: 100 });
	const t2 = tracksWith({ main: [a2, c] });
	assert.equal(applyElementUpdate({ element: c, patch: { startTime: 400 }, context: { tracks: t2, trackId: "main" } }).startTime, 0);
	assert.equal(applyElementUpdate({ element: c, patch: { startTime: 401 }, context: { tracks: t2, trackId: "main" } }).startTime, 401);
});

test("start-time rule: a lone main clip moved right snaps back to 0 (it is never compared with itself)", () => {
	const only = createElement({ id: "o", type: "video", startTime: 1000, duration: 100 });
	const tracks = tracksWith({ main: [only] });
	assert.equal(applyElementUpdate({ element: only, patch: { startTime: 2000 }, context: { tracks, trackId: "main" } }).startTime, 0);
});

test("start-time rule: other tracks only clamp at 0; the main-track snap does not apply to them", () => {
	const m = createElement({ id: "m", type: "video", startTime: 1000, duration: 100 });
	const ov = createElement({ id: "ov", type: "graphic", startTime: 2000, duration: 100 });
	const tracks = tracksWith({ main: [m], overlay: [ov] });
	const ctx = { tracks, trackId: "ov1" };
	assert.equal(applyElementUpdate({ element: ov, patch: { startTime: 500 }, context: ctx }).startTime, 500);
	assert.equal(applyElementUpdate({ element: ov, patch: { startTime: -9 }, context: ctx }).startTime, 0);
});

test("trim: the end edge can un-trim only what was trimmed, and never below 1 tick long", () => {
	const el = createElement({ id: "e", type: "video", startTime: 0, duration: 1000, trimStart: 0, trimEnd: 100 });
	const back = trimElement({ element: el, side: "end", delta: -1000 });
	assert.equal(back.trimEnd, 0);
	assert.equal(back.duration, 1100, "duration may grow by exactly the 100 ticks that were trimmed");
	const crush = trimElement({ element: el, side: "end", delta: 5000 });
	assert.equal(crush.duration, 1);
});

test("trim: bad arguments are refused loudly", () => {
	const el = createElement({ id: "e", type: "video", duration: 1000 });
	assert.throws(() => trimElement({ element: el, side: "start", delta: 1.5 }), /integer/);
	assert.throws(() => trimElement({ element: el, side: "middle", delta: 10 }), /start or end/);
});

test("trim at a retime rate moves the source edge by round(delta * rate)", () => {
	const el = createElement({ id: "r", type: "video", duration: 1000, retime: { rate: 1.5 } });
	const out = trimElement({ element: el, side: "end", delta: 3 });
	assert.equal(out.trimEnd, 5); // round(4.5) = 5, half away from zero
	assert.equal(out.duration, 997);
	assert.equal(S, 120000);
});
