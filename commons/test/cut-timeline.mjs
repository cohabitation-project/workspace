import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	TICKS_PER_SECOND, roundMediaTime, mediaTimeFromSeconds, addMediaTime, getSnapThresholdInTicks,
	timelineTimeToPixels, clampRetimeRate,
} from "../lib/cut/time.mjs";
import {
	createTrack, createElement, createEmptyTracks, createScene, ensureMainScene, deleteScene,
	applyElementUpdate, trimElement, findElement, getAllTracks,
} from "../lib/cut/model.mjs";
import {
	splitElements, computeRippleAdjustments, applyRippleAdjustments, buildSnapPoints,
	resolveSnap, resolveElementSnap,
} from "../lib/cut/ops.mjs";

const S = TICKS_PER_SECOND;
const ids = () => { let n = 0; return () => `r${++n}`; };

function mainWith(elements) {
	const t = createEmptyTracks();
	t.main = { ...t.main, id: "main", elements };
	return t;
}

test("media time: round half away from zero, -0 normalised, integers only", () => {
	assert.equal(roundMediaTime({ time: 1.5 }), 2);
	assert.equal(roundMediaTime({ time: -1.5 }), -2);
	assert.equal(roundMediaTime({ time: -0.4 }), 0);
	assert.ok(Object.is(roundMediaTime({ time: -0.4 }), 0));
	assert.equal(mediaTimeFromSeconds({ seconds: 2 }), 240000);
	assert.throws(() => addMediaTime({ a: 1.5, b: 1 }));
	assert.throws(() => roundMediaTime({ time: NaN }));
});

test("split: halves add up to the total at rate 1.5 with odd ticks", () => {
	const el = createElement({ id: "a", type: "video", startTime: 0, duration: 100001, sourceDuration: 150002, retime: { rate: 1.5 } });
	const tracks = mainWith([el]);
	const { tracks: out, rightSideElements } = splitElements({
		tracks, elements: [{ trackId: "main", elementId: "a" }], splitTime: 33333, idFactory: ids(),
	});
	const [l, r] = out.main.elements;
	assert.equal(l.duration + r.duration, 100001);
	assert.equal(r.startTime, 33333);
	const leftSource = r.trimStart - el.trimStart;
	const rightSource = l.trimEnd - el.trimEnd;
	assert.equal(leftSource + rightSource, roundMediaTime({ time: 100001 * 1.5 }));
	assert.deepEqual(rightSideElements, [{ trackId: "main", elementId: "r1" }]);
	assert.equal(l.name, "video (left)");
	assert.equal(r.name, "video (right)");
});

test("split at an edge or outside does nothing; retainSide works; old tracks untouched (undo)", () => {
	const el = createElement({ id: "a", type: "video", startTime: 1000, duration: 5000 });
	const tracks = mainWith([el]);
	const t = [{ trackId: "main", elementId: "a" }];
	for (const splitTime of [1000, 6000, 10, 99999]) {
		const res = splitElements({ tracks, elements: t, splitTime });
		assert.equal(res.tracks.main.elements.length, 1);
		assert.equal(res.rightSideElements.length, 0);
	}
	const left = splitElements({ tracks, elements: t, splitTime: 3000, retainSide: "left" });
	assert.equal(left.tracks.main.elements.length, 1);
	assert.equal(left.tracks.main.elements[0].duration, 2000);
	const right = splitElements({ tracks, elements: t, splitTime: 3000, retainSide: "right", idFactory: ids() });
	assert.equal(right.tracks.main.elements[0].startTime, 3000);
	assert.equal(right.tracks.main.elements[0].duration, 3000);
	assert.equal(tracks.main.elements.length, 1); // original value unchanged
	assert.equal(tracks.main.elements[0].duration, 5000);
});

test("split carries animation keys: left keeps <= split, right keeps >= split, shifted", () => {
	const el = createElement({
		id: "a", type: "text", duration: 1000,
		animations: { opacity: [{ time: 0, value: 0 }, { time: 400, value: 1 }, { time: 900, value: 0 }] },
	});
	const { tracks } = splitElements({ tracks: mainWith([el]), elements: [{ trackId: "main", elementId: "a" }], splitTime: 400, idFactory: ids() });
	const [l, r] = tracks.main.elements;
	assert.deepEqual(l.animations.opacity.map((k) => k.time), [0, 400]);
	assert.deepEqual(r.animations.opacity.map((k) => k.time), [0, 500]);
});

test("ripple: deleting a middle clip pulls later clips left, never right", () => {
	const A = createElement({ id: "A", type: "video", startTime: 0, duration: 10 });
	const B = createElement({ id: "B", type: "video", startTime: 10, duration: 10 });
	const C = createElement({ id: "C", type: "video", startTime: 20, duration: 10 });
	const before = mainWith([A, B, C]);
	const after = mainWith([A, C]);
	const adj = computeRippleAdjustments({ beforeTracks: before, afterTracks: after });
	assert.deepEqual(adj, [{ trackId: "main", afterTime: 20, shiftAmount: 10 }]);
	const out = applyRippleAdjustments({ tracks: after, adjustments: adj });
	assert.equal(out.main.elements.find((e) => e.id === "C").startTime, 10);
	assert.equal(out.main.elements.find((e) => e.id === "A").startTime, 0);
});

test("ripple: shortening a clip closes the gap; adding or lengthening makes no adjustment", () => {
	const A = createElement({ id: "A", type: "video", startTime: 0, duration: 10 });
	const B = createElement({ id: "B", type: "video", startTime: 10, duration: 10 });
	const before = mainWith([A, B]);
	const shorter = mainWith([{ ...A, duration: 6 }, B]);
	const adj = computeRippleAdjustments({ beforeTracks: before, afterTracks: shorter });
	assert.deepEqual(adj, [{ trackId: "main", afterTime: 10, shiftAmount: 4 }]);
	assert.equal(applyRippleAdjustments({ tracks: shorter, adjustments: adj }).main.elements[1].startTime, 6);
	const longer = mainWith([{ ...A, duration: 15 }, B]);
	assert.deepEqual(computeRippleAdjustments({ beforeTracks: before, afterTracks: longer }), []);
	const added = mainWith([A, B, createElement({ id: "N", type: "video", startTime: 20, duration: 5 })]);
	assert.deepEqual(computeRippleAdjustments({ beforeTracks: before, afterTracks: added }), []);
});

test("ripple: a clip moved to another track is not a gap; a replacement fills the gap", () => {
	const A = createElement({ id: "A", type: "video", startTime: 0, duration: 10 });
	const B = createElement({ id: "B", type: "video", startTime: 10, duration: 10 });
	const before = mainWith([A, B]);
	const afterMoved = mainWith([A]);
	afterMoved.overlay = [createTrack({ id: "ov", type: "graphic", elements: [B] })];
	assert.deepEqual(computeRippleAdjustments({ beforeTracks: before, afterTracks: afterMoved }), []);
	const afterReplaced = mainWith([A, createElement({ id: "N", type: "video", startTime: 10, duration: 10 })]);
	assert.deepEqual(computeRippleAdjustments({ beforeTracks: before, afterTracks: afterReplaced }), []);
});

test("snapping: threshold is 10 px, 50 px/s base: 24000 ticks at zoom 1, 240 ticks at zoom 100", () => {
	assert.equal(getSnapThresholdInTicks({ zoomLevel: 1 }), 24000);
	assert.equal(Math.round(getSnapThresholdInTicks({ zoomLevel: 100 })), 240);
	assert.equal(timelineTimeToPixels({ time: S, zoomLevel: 2 }), 100);
});

test("snapping: snaps inside the threshold to the nearest point, not outside it", () => {
	const A = createElement({ id: "A", type: "video", startTime: 0, duration: S });
	const B = createElement({ id: "B", type: "video", startTime: 2 * S, duration: S });
	const tracks = mainWith([A, B]);
	const points = buildSnapPoints({ tracks, playhead: 5 * S });
	const near = resolveSnap({ targetTime: S + 20000, snapPoints: points, zoomLevel: 1 });
	assert.equal(near.snappedTime, S);
	assert.equal(near.snapPoint.type, "element-end");
	const far = resolveSnap({ targetTime: S + 30000, snapPoints: points, zoomLevel: 1 });
	assert.equal(far.snapPoint, null);
	assert.equal(far.snappedTime, S + 30000);
	const ex = buildSnapPoints({ tracks, excludeElementIds: ["A"] });
	assert.ok(ex.every((p) => p.elementId !== "A"));
	const drag = resolveElementSnap({ startTime: 2 * S - 100000 - 5000, duration: 100000, snapPoints: points, zoomLevel: 1 });
	assert.equal(drag.edge, "end");
	assert.equal(drag.startTime, 2 * S - 100000);
});

test("update pipeline: retime 1.5 rounds duration, clamps the rate", () => {
	const el = createElement({ id: "v", type: "video", startTime: 0, duration: 100000, sourceDuration: 100000 });
	const tracks = mainWith([el]);
	const next = applyElementUpdate({ element: el, patch: { retime: { rate: 1.5 } }, context: { tracks, trackId: "main" } });
	assert.equal(next.duration, 66667); // 66666.67 rounded
	assert.equal(next.retime.rate, 1.5);
	const wild = applyElementUpdate({ element: el, patch: { retime: { rate: 50 } }, context: { tracks, trackId: "main" } });
	assert.equal(wild.retime.rate, 5);
	assert.equal(clampRetimeRate({ rate: 0 }), 0.01);
});

test("update pipeline: main track startTime rule", () => {
	const A = createElement({ id: "A", type: "video", startTime: 0, duration: 100 });
	const B = createElement({ id: "B", type: "video", startTime: 100, duration: 100 });
	const tracks = mainWith([A, B]);
	const ctx = { tracks, trackId: "main" };
	assert.equal(applyElementUpdate({ element: B, patch: { startTime: -50 }, context: ctx }).startTime, 0);
	assert.equal(applyElementUpdate({ element: B, patch: { startTime: 0 }, context: ctx }).startTime, 0); // would come first-tied
	assert.equal(applyElementUpdate({ element: B, patch: { startTime: 300 }, context: ctx }).startTime, 300);
	const overlay = { tracks, trackId: "ov" };
	assert.equal(applyElementUpdate({ element: B, patch: { startTime: -50 }, context: overlay }).startTime, 0);
	assert.equal(applyElementUpdate({ element: B, patch: { startTime: -50 }, context: overlay }).duration, 100);
});

test("trim: start trim moves the clip and the source offset; end trim shortens; limits hold", () => {
	const el = createElement({ id: "v", type: "video", startTime: 1000, duration: 10000, trimStart: 500 });
	const s = trimElement({ element: el, side: "start", delta: 2000 });
	assert.equal(s.startTime, 3000);
	assert.equal(s.duration, 8000);
	assert.equal(s.trimStart, 2500);
	const e = trimElement({ element: el, side: "end", delta: 4000 });
	assert.equal(e.duration, 6000);
	assert.equal(e.trimEnd, 4000);
	const over = trimElement({ element: el, side: "start", delta: 999999 });
	assert.equal(over.duration, 1); // never under one tick
	const unTrim = trimElement({ element: el, side: "start", delta: -999999 });
	assert.equal(unTrim.trimStart, 0); // cannot un-trim past the source start
	assert.equal(unTrim.startTime, 500);
	const fast = createElement({ id: "f", type: "video", duration: 9000, retime: { rate: 2 } });
	assert.equal(trimElement({ element: fast, side: "end", delta: 1000 }).trimEnd, 2000);
});

test("scenes: one main scene; it cannot be deleted; others can", () => {
	const scenes = ensureMainScene([]);
	assert.equal(scenes.length, 1);
	assert.equal(scenes[0].isMain, true);
	assert.equal(ensureMainScene(scenes), scenes);
	assert.throws(() => deleteScene({ scenes, sceneId: scenes[0].id }));
	const extra = createScene({ name: "Intro" });
	const two = [...scenes, extra];
	assert.equal(deleteScene({ scenes: two, sceneId: extra.id }).length, 1);
	assert.equal(findElement({ tracks: scenes[0].tracks, elementId: "none" }), null);
	assert.equal(getAllTracks(scenes[0].tracks).length, 1);
});

test("no React or DOM in the port", () => {
	for (const f of ["time.mjs", "model.mjs", "ops.mjs"]) {
		const src = readFileSync(new URL(`../lib/cut/${f}`, import.meta.url), "utf8");
		assert.ok(!/from\s+["'](react|react-dom|zustand)/.test(src), f);
		assert.ok(!/\b(document|window|navigator)\./.test(src), f);
		assert.ok(!/from\s+["']@\//.test(src), f + " still has an @/ alias");
	}
});