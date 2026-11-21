// Cohabi Cut Job 3 follow-up: wrap long Words captions so they stay inside the frame.
// ffmpeg drawtext never wraps: on 2026-11-21 an 8-word caption's bright pixels reached x=534 of 540.
// This module splits a caption into lines BEFORE ffmpeg, one drawtext per line, so the registry stays
// the only drawtext serializer and never has to accept a line break inside a value.
//
// Width estimate: advance widths of DejaVu Sans (units per 1000 em, ASCII 0x20..0x7e, measured with
// PIL ImageFont.getlength at size 1000 on 2026-11-21). The table fits ONLY DejaVu Sans. An earlier
// version of this comment claimed DejaVu is among the widest sans fonts so an unknown `sans` would err
// toward early wrapping; that was FALSE (measured 2026-11-21, 10 x "W" at 48 px: bright x-extent 2..472
// under DejaVu but 1..495 under a Lato default). So every caption this module returns is PINNED to
// WRAP_FONT (`font=DejaVu Sans`), wrapped or not: the font drawtext uses is then the one measured here,
// whatever the server's fontconfig default is. Characters outside ASCII are assumed 1.0 em (as wide
// as a CJK glyph). The estimate was checked against real drawtext pixel bounds in
// teams/cut/render/ffmpeg-smoke-wrap.py and a test here. The server must have DejaVu Sans installed;
// if fontconfig substitutes another face, the width guarantee is gone (check `fc-match "DejaVu Sans"`).

export const WRAP_FONT = "DejaVu Sans";

export const DEJAVU_ADVANCE = [
	318, 401, 460, 838, 636, 950, 780, 275, 390, 390, 500, 838, 318, 361, 318, 337, 636, 636, 636, 636,
	636, 636, 636, 636, 636, 636, 337, 337, 838, 838, 838, 531, 1000, 684, 686, 698, 770, 632, 575, 775,
	752, 295, 295, 656, 557, 863, 748, 787, 603, 787, 695, 635, 611, 732, 684, 989, 685, 611, 685, 390,
	337, 390, 838, 500, 500, 613, 635, 550, 635, 615, 352, 635, 634, 278, 278, 579, 278, 974, 634, 612,
	635, 635, 411, 521, 392, 634, 592, 818, 592, 592, 525, 636, 337, 636, 838,
];

export const LINE_HEIGHT_FACTOR = 1.2;
export const RIGHT_MARGIN_FRACTION = 0.04;

/** Estimated rendered width in pixels of a single line at `fontSize`. */
export function estimateTextWidth(text, fontSize) {
	let units = 0;
	for (const ch of String(text)) {
		const c = ch.codePointAt(0);
		units += c >= 0x20 && c <= 0x7e ? DEJAVU_ADVANCE[c - 0x20] : 1000;
	}
	return (units * fontSize) / 1000;
}

/** Greedy word wrap to `maxWidth` pixels. A word wider than the line is split by character. */
export function wrapLines(text, fontSize, maxWidth) {
	if (estimateTextWidth(text, fontSize) <= maxWidth) return [text];
	const lines = [];
	let line = "";
	const fits = (s) => estimateTextWidth(s, fontSize) <= maxWidth;
	for (const word of text.split(/ +/).filter((w) => w.length > 0)) {
		let rest = word;
		while (!fits(rest)) {
			// hard split: longest prefix that fits, at least one character
			const chars = [...rest];
			let n = chars.length - 1;
			while (n > 1 && !fits(chars.slice(0, n).join(""))) n--;
			if (line) { lines.push(line); line = ""; }
			lines.push(chars.slice(0, n).join(""));
			rest = chars.slice(n).join("");
		}
		if (!line) line = rest;
		else if (fits(`${line} ${rest}`)) line = `${line} ${rest}`;
		else { lines.push(line); line = rest; }
	}
	if (line) lines.push(line);
	return lines;
}

/**
 * Turn one text-effect params object into one params object per wrapped line.
 * Every returned object carries `font: WRAP_FONT` (see header), including a caption that fits on one line.
 * Throws RangeError when it cannot fit the frame.
 */
export function wrapCaptionParams(params, { width, height }) {
	const { text, x = 0, y = 0, fontSize = 32 } = params;
	if (typeof text !== "string" || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(fontSize) || fontSize <= 0) {
		return [params]; // let the registry produce its own precise error
	}
	// Top-left pixel origin: a negative x or y puts the first glyphs off the left/top edge. Before this check
	// a negative x also WIDENED maxWidth, so a caption at x=-200 wrapped as if the frame were 200 px wider.
	if (x < 0 || y < 0) {
		throw new RangeError(`caption origin (${x}, ${y}) is outside the frame: x and y are top-left pixels and must be >= 0`);
	}
	const margin = Math.round(width * RIGHT_MARGIN_FRACTION);
	const maxWidth = width - x - margin;
	if (estimateTextWidth(text, fontSize) <= maxWidth) {
		// A caption that fits on one line is still checked against the bottom edge (same line-box rule as wrapped lines).
		const oneLine = Math.ceil(fontSize * LINE_HEIGHT_FACTOR);
		if (y + oneLine > height) {
			throw new RangeError(`caption at y=${y} needs a ${oneLine}px line box (bottom edge ${y + oneLine}px) but the frame is ${height}px tall`);
		}
		return [{ ...params, font: WRAP_FONT }];
	}
	if (maxWidth < fontSize) {
		throw new RangeError(`caption at x=${x} leaves ${maxWidth}px of a ${width}px frame, less than one ${fontSize}px glyph`);
	}
	const lines = wrapLines(text, fontSize, maxWidth);
	const lineHeight = Math.ceil(fontSize * LINE_HEIGHT_FACTOR);
	const bottom = y + (lines.length - 1) * lineHeight + lineHeight;
	if (bottom > height) {
		throw new RangeError(`caption needs ${lines.length} lines (bottom edge ${bottom}px) but the frame is ${height}px tall`);
	}
	return lines.map((line, i) => ({ ...params, text: line, y: y + i * lineHeight, font: WRAP_FONT }));
}
