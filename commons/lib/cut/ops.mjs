// Cohabi Cut timeline port, part 3: split, ripple, snapping.
// Split and ripple are ported from OpenCut classic (MIT) at
// cf5e79e919144200294fb9fed22a222592a0aeea:
//   src/commands/timeline/element/split-elements.ts, src/ripple/{apply,diff,shift}.ts.
// The Command/EditorCore wrapper is dropped: functions take tracks and return new tracks.
// Undo = keep the old tracks. Snapping is a STAND-IN: the 10 px threshold is classic's,
// the nearest-point resolve is ours (resolve.ts was not read in full).

import {
	roundMediaTime,
	subMediaTime,
	addMediaTime,
	getSourceSpanAtClipTime,
	getSnapThresholdInTicks,
} from "./time.mjs";
import { getAllTracks, generateId, isRetimableElement, mapTracks, splitAnimationsAtTime } from "./model.mjs";

// ---------- split ----------

export function splitElements({
	tracks,
	elements,
	splitTime,
	retainSide = "both",
	idFactory = generateId,
}) {
	const rightSideElements = [];
	const splitTrack = (track) => {
		const targets = elements.filter((t) => t.trackId === track.id);
		if (targets.length === 0) return track;
		const next = track.elements.flatMap((element) => {
			if (!targets.some((t) => t.elementId === element.id)) return [element];
			const end = element.startTime + element.duration;
			if (splitTime <= element.startTime || splitTime >= end) return [element];

			const relative = subMediaTime({ a: splitTime, b: element.startTime });
			const leftVisible = relative;
			const rightVisible = subMediaTime({ a: element.duration, b: relative });
			const retime = isRetimableElement(element) ? element.retime : undefined;

			// Snap the source-side split once; derive the right half from it, so
			// leftSourceSpan + rightSourceSpan == totalSourceSpan exactly.
			const leftSource = roundMediaTime({ time: getSourceSpanAtClipTime({ clipTime: leftVisible, retime }) });
			const totalSource = roundMediaTime({ time: getSourceSpanAtClipTime({ clipTime: element.duration, retime }) });
			const rightSource = subMediaTime({ a: totalSource, b: leftSource });

			const { leftAnimations, rightAnimations } = splitAnimationsAtTime({
				animations: element.animations,
				splitTime: relative,
				shouldIncludeSplitBoundary: true,
			});
			const leftTrimEnd = addMediaTime({ a: element.trimEnd, b: rightSource });
			const rightTrimStart = addMediaTime({ a: element.trimStart, b: leftSource });
			const withAnim = (e, anim) => (anim === undefined ? e : { ...e, animations: anim });

			const left = withAnim(
				{ ...element, duration: leftVisible, trimEnd: leftTrimEnd, name: `${element.name} (left)` },
				leftAnimations,
			);
			const newId = idFactory();
			const right = withAnim(
				{
					...element,
					id: newId,
					startTime: splitTime,
					duration: rightVisible,
					trimStart: rightTrimStart,
					name: `${element.name} (right)`,
				},
				rightAnimations,
			);
			if (retainSide === "left") return [left];
			rightSideElements.push({ trackId: track.id, elementId: newId });
			return retainSide === "right" ? [right] : [left, right];
		});
		return { ...track, elements: next };
	};
	return { tracks: mapTracks(tracks, splitTrack), rightSideElements };
}

// ---------- ripple ----------

export function rippleShiftElements({ elements, afterTime, shiftAmount }) {
	return elements.map((e) => (e.startTime >= afterTime ? { ...e, startTime: e.startTime - shiftAmount } : e));
}

export function applyRippleAdjustments({ tracks, adjustments }) {
	const byTrack = new Map();
	for (const a of adjustments) {
		if (!byTrack.has(a.trackId)) byTrack.set(a.trackId, []);
		byTrack.get(a.trackId).push(a);
	}
	return mapTracks(tracks, (track) => {
		const list = byTrack.get(track.id) ?? [];
		if (list.length === 0) return track;
		let elements = track.elements;
		// latest gap first, so earlier shifts do not move later thresholds
		for (const a of [...list].sort((x, y) => y.afterTime - x.afterTime)) {
			elements = rippleShiftElements({ elements, afterTime: a.afterTime, shiftAmount: a.shiftAmount });
		}
		return { ...track, elements };
	});
}

function pushInterval(list, startTime, endTime) {
	if (endTime <= startTime) return;
	list.push({ startTime, endTime });
}

function normalizeIntervals(intervals) {
	const valid = [];
	for (const i of intervals) pushInterval(valid, i.startTime, i.endTime);
	valid.sort((a, b) => a.startTime - b.startTime);
	if (valid.length === 0) return [];
	const merged = [{ ...valid[0] }];
	for (const i of valid.slice(1)) {
		const prev = merged[merged.length - 1];
		if (i.startTime <= prev.endTime) prev.endTime = Math.max(prev.endTime, i.endTime);
		else merged.push({ ...i });
	}
	return merged;
}

function subtractIntervals(sources, overlaps) {
	const ov = normalizeIntervals(overlaps);
	return normalizeIntervals(sources).flatMap((source) => {
		let remaining = [{ ...source }];
		for (const o of ov) {
			remaining = remaining.flatMap((r) => {
				if (o.endTime <= r.startTime || o.startTime >= r.endTime) return [r];
				const out = [];
				pushInterval(out, r.startTime, o.startTime);
				pushInterval(out, o.endTime, r.endTime);
				return out;
			});
			if (remaining.length === 0) return [];
		}
		return remaining;
	});
}

// Gaps left by removed or shortened elements become left-shifts. Nothing ever shifts right.
export function computeRippleAdjustments({ beforeTracks, afterTracks }) {
	const afterById = new Map(getAllTracks(afterTracks).map((t) => [t.id, t]));
	const allAfterIds = new Set(getAllTracks(afterTracks).flatMap((t) => t.elements.map((e) => e.id)));
	return getAllTracks(beforeTracks).flatMap((beforeTrack) => {
		const afterEls = afterById.get(beforeTrack.id)?.elements ?? [];
		const span = (e) => ({ startTime: e.startTime, endTime: e.startTime + e.duration });
		const afterMap = new Map(afterEls.map((e) => [e.id, span(e)]));
		const beforeMap = new Map(beforeTrack.elements.map((e) => [e.id, span(e)]));
		const vacated = [];
		const joined = [];
		for (const [id, b] of beforeMap) {
			const a = afterMap.get(id);
			if (!a) {
				if (!allAfterIds.has(id)) pushInterval(vacated, b.startTime, b.endTime); // moved to another track: not a gap
				continue;
			}
			if (b.endTime > a.endTime) pushInterval(vacated, a.endTime, b.endTime);
		}
		for (const [id, a] of afterMap) {
			if (!beforeMap.has(id)) pushInterval(joined, a.startTime, a.endTime);
		}
		const freed = subtractIntervals(normalizeIntervals(vacated), normalizeIntervals(joined));
		return freed
			.filter((i) => i.endTime - i.startTime > 0)
			.map((i) => ({ trackId: beforeTrack.id, afterTime: i.endTime, shiftAmount: i.endTime - i.startTime }));
	});
}

// ---------- snapping (stand-in resolve) ----------

export function buildSnapPoints({ tracks, playhead, bookmarks = [], excludeElementIds = [] }) {
	const points = [];
	for (const track of getAllTracks(tracks)) {
		for (const e of track.elements) {
			if (excludeElementIds.includes(e.id)) continue;
			points.push({ time: e.startTime, type: "element-start", elementId: e.id, trackId: track.id });
			points.push({ time: e.startTime + e.duration, type: "element-end", elementId: e.id, trackId: track.id });
		}
	}
	if (playhead !== undefined) points.push({ time: playhead, type: "playhead" });
	for (const b of bookmarks) points.push({ time: b, type: "bookmark" });
	return points;
}

export function resolveSnap({ targetTime, snapPoints, zoomLevel, snapThresholdPx }) {
	const threshold = getSnapThresholdInTicks({ zoomLevel, snapThresholdPx });
	let best = null;
	let bestDistance = Infinity;
	for (const p of snapPoints) {
		const d = Math.abs(p.time - targetTime);
		if (d <= threshold && d < bestDistance) {
			best = p;
			bestDistance = d;
		}
	}
	if (!best) return { snappedTime: targetTime, snapPoint: null, snapDistance: 0 };
	return { snappedTime: best.time, snapPoint: best, snapDistance: bestDistance };
}

// Snap a clip being dragged by whichever of its two edges is closer to a point.
export function resolveElementSnap({ startTime, duration, snapPoints, zoomLevel, snapThresholdPx }) {
	const a = resolveSnap({ targetTime: startTime, snapPoints, zoomLevel, snapThresholdPx });
	const b = resolveSnap({ targetTime: startTime + duration, snapPoints, zoomLevel, snapThresholdPx });
	if (!a.snapPoint && !b.snapPoint) return { startTime, snapPoint: null, edge: null };
	if (a.snapPoint && (!b.snapPoint || a.snapDistance <= b.snapDistance)) {
		return { startTime: a.snappedTime, snapPoint: a.snapPoint, edge: "start" };
	}
	return { startTime: b.snappedTime - duration, snapPoint: b.snapPoint, edge: "end" };
}