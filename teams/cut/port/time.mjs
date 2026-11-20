// Cohabi Cut timeline port, part 1: integer media time + scale + retime math.
// Ported from OpenCut classic (MIT), pinned commit cf5e79e919144200294fb9fed22a222592a0aeea.
// Reimplements the WASM MediaTime layer in plain JS. No React, no DOM.

export const TICKS_PER_SECOND = 120000;
export const ZERO_MEDIA_TIME = 0;

export const BASE_TIMELINE_PIXELS_PER_SECOND = 50;
export const TIMELINE_ZOOM_MIN = 0.1;
export const TIMELINE_ZOOM_MAX = 100;
export const DEFAULT_SNAP_THRESHOLD_PX = 10;

export const RETIME_RATE_MIN = 0.01;
export const RETIME_RATE_MAX = 5;

export function isMediaTime(value) {
	return Number.isInteger(value);
}

export function requireMediaTime({ value, context }) {
	if (!isMediaTime(value)) {
		throw new Error(`${context}: expected an integer tick count, got ${value}`);
	}
	return value;
}

export function mediaTime({ ticks }) {
	return requireMediaTime({ value: ticks, context: "mediaTime()" });
}

// Round half away from zero; normalise -0 to 0 (same rule as classic).
export function roundMediaTime({ time }) {
	const magnitude = Math.round(Math.abs(time));
	if (magnitude === 0) return ZERO_MEDIA_TIME;
	return requireMediaTime({
		value: time < 0 ? -magnitude : magnitude,
		context: "roundMediaTime()",
	});
}

export function mediaTimeFromSeconds({ seconds }) {
	return roundMediaTime({ time: seconds * TICKS_PER_SECOND });
}

export function mediaTimeToSeconds({ time }) {
	return time / TICKS_PER_SECOND;
}

export function addMediaTime({ a, b }) {
	return requireMediaTime({ value: a + b, context: "addMediaTime()" });
}

export function subMediaTime({ a, b }) {
	return requireMediaTime({ value: a - b, context: "subMediaTime()" });
}

// --- scale / pixels ---

export function clampZoom({ zoomLevel }) {
	return Math.min(TIMELINE_ZOOM_MAX, Math.max(TIMELINE_ZOOM_MIN, zoomLevel));
}

export function getTimelinePixelsPerSecond({ zoomLevel }) {
	return BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel;
}

export function timelineTimeToPixels({ time, zoomLevel }) {
	return (time / TICKS_PER_SECOND) * getTimelinePixelsPerSecond({ zoomLevel });
}

export function pixelsToTimelineTime({ pixels, zoomLevel }) {
	return roundMediaTime({
		time: (pixels / getTimelinePixelsPerSecond({ zoomLevel })) * TICKS_PER_SECOND,
	});
}

export function getSnapThresholdInTicks({
	zoomLevel,
	snapThresholdPx = DEFAULT_SNAP_THRESHOLD_PX,
}) {
	return (snapThresholdPx / getTimelinePixelsPerSecond({ zoomLevel })) * TICKS_PER_SECOND;
}

// --- retime (a single rate, clamped) ---

export function clampRetimeRate({ rate }) {
	return Math.min(RETIME_RATE_MAX, Math.max(RETIME_RATE_MIN, rate));
}

function safeRate(retime) {
	return clampRetimeRate({ rate: retime?.rate ?? 1 });
}

export function getSourceTimeAtClipTime({ clipTime, retime }) {
	return clipTime * safeRate(retime);
}

export function getClipTimeAtSourceTime({ sourceTime, retime }) {
	return sourceTime / safeRate(retime);
}

export function getSourceSpanAtClipTime({ clipTime, retime }) {
	return Math.max(0, getSourceTimeAtClipTime({ clipTime, retime }));
}

export function getTimelineDurationForSourceSpan({ sourceSpan, retime }) {
	if (sourceSpan <= 0) return 0;
	return sourceSpan / safeRate(retime);
}
