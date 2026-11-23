// Cohabi Cut, Job 4: the edit list -> the planner's `tracks`.
//
// editToTracks(edit, { durationSec, width = 1080, height = 1920, videoSrc, musicSrc })
//   edit = what the phone sends (see cut.js buildEdit):
//     { trimStart, trimEnd,            seconds into the SOURCE video
//       text?: { body, y },            one line, y = pixel offset from the frame centre on a 1080x1920 frame
//       music?: { id, volume },        volume 0..1
//       coverSec }                     seconds into the SOURCE video, inside the trimmed range
//   returns the `tracks` object buildRenderPlan() takes: { main, overlay, audio }, integer ticks (120,000/s).
//
// Refusals (RangeError/TypeError with a plain message; the route turns them into a 400):
//   not an object; trimStart/trimEnd not finite numbers; trimEnd <= trimStart; trimStart < 0 or trimEnd > durationSec;
//   text body not a string, over 80 characters, or containing a line break / control character;
//   text.y not finite, or the line would leave the frame; a line that cannot fit the frame width at 16 px;
//   music.id not a non-empty string; music.volume not a number from 0 to 1;
//   coverSec not a finite number inside [trimStart, trimEnd].
//
// PATHS: `videoSrc` / `musicSrc` are SERVER-SIDE file paths the route has already looked up from the client's
// video id and music id. The client never supplies a path. If omitted they default to the placeholder
// names "main-video" and "music-<id>", which ffmpeg cannot open: the route must pass real paths.
//
// CAPTION CONVENTION: the planner on main (commons/lib/cut/plan.mjs) draws a Words caption at x/y = TOP-LEFT
// source pixels with fontSize in pixels, and does not wrap. So this module converts: it picks a font size that
// fits ONE line (<= 84% of the frame width by the DejaVu Sans width table in wrap.mjs, between 16 px and ~4% of
// the frame height), centres the line horizontally by that estimate, and puts its vertical centre at
// height/2 + y * height/1920. The estimate is for DejaVu Sans; the server's default `sans` may be another face
// (Inter on one box), so the line may sit a little off-centre there. That is a known, unmeasured limit.
//
// Import path: written to run from teams/cut/editor/. When placed at commons/lib/cut/edit.mjs change
// "../render/wrap.mjs" to "./wrap.mjs" (wrap.mjs has no imports of its own and must be placed with it).

import { estimateTextWidth, LINE_HEIGHT_FACTOR } from "./wrap.mjs";

export const TICKS_PER_SECOND = 120_000;
export const MAX_TEXT_CHARS = 80;
export const UI_FRAME_HEIGHT = 1920; // the frame height the phone's y offsets (-540 / 0 / +540) assume
export const MIN_FONT_PX = 16;
export const WIDTH_FRACTION = 0.84;

const ticks = (sec) => Math.round(sec * TICKS_PER_SECOND);

function finite(name, v) {
	if (typeof v !== "number" || !Number.isFinite(v)) throw new TypeError(`${name} must be a finite number, got ${String(v)}`);
	return v;
}

function textElement(body, y, { durationTicks, width, height }) {
	if (typeof body !== "string") throw new TypeError("text.body must be a string");
	if (body.length > MAX_TEXT_CHARS) throw new RangeError(`text must be at most ${MAX_TEXT_CHARS} characters, got ${body.length}`);
	if (/[\u0000-\u001f\u007f\u2028\u2029]/.test(body)) throw new RangeError("text must be one line: no line breaks or control characters");
	const yOffset = finite("text.y", y ?? 0);
	let px = Math.max(MIN_FONT_PX, Math.round(height * 0.04));
	const maxWidth = width * WIDTH_FRACTION;
	while (px > MIN_FONT_PX && estimateTextWidth(body, px) > maxWidth) px--;
	const w = estimateTextWidth(body, px);
	if (w > maxWidth) throw new RangeError(`text is too long to fit on one line of a ${width}px frame at ${MIN_FONT_PX}px`);
	const lh = Math.ceil(px * LINE_HEIGHT_FACTOR);
	const centreY = height / 2 + (yOffset * height) / UI_FRAME_HEIGHT;
	if (centreY - lh / 2 < 0 || centreY + lh / 2 > height) throw new RangeError(`text at y offset ${yOffset} would leave the ${height}px frame`);
	return {
		id: "cut-caption-1",
		type: "text",
		name: "Caption",
		startTime: 0,
		duration: durationTicks,
		trimStart: 0,
		trimEnd: 0,
		params: {
			content: body,
			fontSize: px,
			color: "white",
			"transform.positionX": Math.round((width - w) / 2),
			"transform.positionY": Math.round(centreY - lh / 2),
		},
	};
}

export function editToTracks(edit, { durationSec, width = 1080, height = 1920, videoSrc = "main-video", musicSrc } = {}) {
	if (!edit || typeof edit !== "object" || Array.isArray(edit)) throw new TypeError("edit must be an object");
	finite("durationSec", durationSec);
	if (durationSec <= 0) throw new RangeError("durationSec must be greater than 0");
	const trimStart = finite("trimStart", edit.trimStart);
	const trimEnd = finite("trimEnd", edit.trimEnd);
	if (trimEnd <= trimStart) throw new RangeError(`trimEnd (${trimEnd}) must be greater than trimStart (${trimStart})`);
	if (trimStart < 0 || trimEnd > durationSec) throw new RangeError(`trim ${trimStart}..${trimEnd} must lie within 0..${durationSec} seconds of the video`);
	const coverSec = finite("coverSec", edit.coverSec);
	if (coverSec < trimStart || coverSec > trimEnd) throw new RangeError(`coverSec ${coverSec} must lie inside the trimmed range ${trimStart}..${trimEnd}`);

	const startTick = ticks(trimStart);
	const durationTicks = ticks(trimEnd) - startTick;
	if (durationTicks < 1) throw new RangeError("the trimmed clip is shorter than one tick");

	const tracks = {
		overlay: [],
		main: {
			id: "main",
			type: "video",
			elements: [{
				id: "cut-main-1",
				type: "video",
				startTime: 0,
				duration: durationTicks,
				trimStart: startTick,
				sourceDuration: ticks(durationSec),
				params: { src: videoSrc },
			}],
		},
		audio: [],
	};

	if (edit.text !== undefined && edit.text !== null) {
		if (typeof edit.text !== "object" || Array.isArray(edit.text)) throw new TypeError("text must be an object { body, y }");
		// A blank body means "no text" (the page omits it, but a stray empty string must not draw an empty caption).
		if (typeof edit.text.body === "string" && edit.text.body.trim() === "") {
			// nothing to draw
		} else {
			tracks.overlay.push({ id: "words", name: "Words", type: "text", hidden: false, elements: [textElement(edit.text.body, edit.text.y, { durationTicks, width, height })] });
		}
	}

	if (edit.music !== undefined && edit.music !== null) {
		const m = edit.music;
		if (typeof m !== "object" || Array.isArray(m)) throw new TypeError("music must be an object { id, volume }");
		if (typeof m.id !== "string" || m.id.length === 0) throw new TypeError("music.id must be a non-empty string");
		const volume = finite("music.volume", m.volume);
		if (volume < 0 || volume > 1) throw new RangeError(`music.volume must be from 0 to 1, got ${volume}`);
		tracks.audio.push({
			id: "music",
			type: "audio",
			elements: [{
				id: "cut-music-1",
				type: "audio",
				startTime: 0,
				duration: durationTicks,
				trimStart: 0,
				params: { src: musicSrc ?? `music-${m.id}`, volume },
			}],
		});
	}
	return tracks;
}

/** Where the cover frame sits in the RENDERED video, in seconds (coverSec is in the source video). */
export function coverOffsetSec(edit) {
	return finite("coverSec", edit.coverSec) - finite("trimStart", edit.trimStart);
}
