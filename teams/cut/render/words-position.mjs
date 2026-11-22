// Cohabi Cut: convert Words caption placement (editor convention) to drawtext placement.
// Source: teams/cut/NOTE-caption-coordinates.md (upstream opencut-classic cf5e79e, NOT the live editor):
//   - transform.positionX/Y are pixel OFFSETS FROM THE FRAME CENTRE, and the text block is centred on that point;
//   - fontSize is not pixels: px = fontSize * canvasHeight / 90.
// Both are unconfirmed against a caption saved by the live editor. Centre alignment only: other textAlign is refused.
// Each returned params object uses the registry's opt-in `anchor: "center"`, so ffmpeg centres every line itself.
import { wrapLines, WRAP_FONT, LINE_HEIGHT_FACTOR, RIGHT_MARGIN_FRACTION } from "./wrap.mjs";

export const FONT_SCALE_REFERENCE = 90;

/** Editor fontSize units -> pixels at this frame height (rounded to a whole pixel, at least 1; the rounding is a guess). */
export function editorFontPx(fontSize, height) {
	return Math.max(1, Math.round((fontSize * height) / FONT_SCALE_REFERENCE));
}

/**
 * params: one descriptor from wordsTrackToTextEffects ({text, x, y, fontSize, color, enable, textAlign?}),
 * where x/y are centre offsets and fontSize is in editor units. Returns one drawtext params object per wrapped line.
 * Throws RangeError when the block cannot fit the frame or alignment is not centre.
 */
export function centreCaptionParams(params, { width, height }) {
	const { text, x = 0, y = 0, fontSize = 15, textAlign } = params;
	if (typeof text !== "string" || ![x, y, fontSize].every(Number.isFinite) || fontSize <= 0) return [params];
	if (textAlign !== undefined && textAlign !== "center") {
		throw new RangeError(`textAlign '${textAlign}' is not supported: only centre-aligned captions are converted`);
	}
	const px = editorFontPx(fontSize, height);
	const margin = Math.round(width * RIGHT_MARGIN_FRACTION);
	const maxWidth = width - 2 * Math.abs(x) - 2 * margin;
	if (maxWidth < px) throw new RangeError(`caption centred at x offset ${x} leaves ${maxWidth}px of a ${width}px frame, less than one ${px}px glyph`);
	const lines = wrapLines(text, px, maxWidth);
	const lh = Math.ceil(px * LINE_HEIGHT_FACTOR);
	const block = lines.length * lh;
	if (block / 2 + Math.abs(y) > height / 2) {
		throw new RangeError(`caption block of ${lines.length} line(s) x ${lh}px centred at y offset ${y} leaves the ${height}px frame`);
	}
	const { textAlign: _drop, ...rest } = params;
	return lines.map((line, i) => ({ ...rest, text: line, x, y: y + (i - (lines.length - 1) / 2) * lh, fontSize: px, anchor: "center", font: WRAP_FONT }));
}
