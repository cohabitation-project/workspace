// Cohabi Cut Job 3: small, server-side ffmpeg effects registry.
// Times are seconds (ffmpeg filter syntax), not timeline MediaTime ticks.
// This module only builds filter fragments; it does not spawn ffmpeg.

function finiteNumber(value, name, { minimum = -Infinity, integer = false } = {}) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || (integer && !Number.isInteger(value))) {
		throw new TypeError(`${name} must be ${integer ? "an integer" : "a finite number"} >= ${minimum}`);
	}
	return String(value);
}

function positiveNumber(value, name) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		throw new TypeError(`${name} must be a finite number > 0`);
	}
	return String(value);
}

// Quote a drawtext value for filter_complex's own parser. A literal apostrophe
// is emitted outside single quotes (close, \', reopen); inside quotes it would
// terminate the value. expansion=none also stops user text such as %{...}
// being interpreted by drawtext itself.
function escapeDrawtext(value) {
	return String(value)
		.replaceAll("\\", "\\\\")
		.replaceAll("'", "'\\''")
		.replaceAll(":", "\\:")
		.replaceAll(",", "\\,")
		.replaceAll(";", "\\;")
		.replaceAll("[", "\\[")
		.replaceAll("]", "\\]");
}

export const registry = {
	fade: {
		id: "fade",
		params: { direction: "in", start: 0, duration: 1 },
		toFilter({ direction = "in", start = 0, duration = 1 } = {}) {
			if (direction !== "in" && direction !== "out") throw new RangeError("direction must be 'in' or 'out'");
			return `fade=t=${direction}:st=${finiteNumber(start, "start", { minimum: 0 })}:d=${positiveNumber(duration, "duration")}`;
		},
	},

	crop: {
		id: "crop",
		params: { width: 1280, height: 720, x: 0, y: 0 },
		toFilter({ width = 1280, height = 720, x = 0, y = 0, frameWidth, frameHeight } = {}) {
			const w = finiteNumber(width, "width", { minimum: 1, integer: true });
			const h = finiteNumber(height, "height", { minimum: 1, integer: true });
			const left = finiteNumber(x, "x", { minimum: 0, integer: true });
			const top = finiteNumber(y, "y", { minimum: 0, integer: true });
			if ((frameWidth === undefined) !== (frameHeight === undefined)) {
				throw new TypeError("frameWidth and frameHeight must be supplied together");
			}
			if (frameWidth !== undefined) {
				const fw = finiteNumber(frameWidth, "frameWidth", { minimum: 1, integer: true });
				const fh = finiteNumber(frameHeight, "frameHeight", { minimum: 1, integer: true });
				if (width + x > frameWidth || height + y > frameHeight) {
					throw new RangeError(`crop rectangle ${w}x${h}+${left}+${top} exceeds frame ${fw}x${fh}`);
				}
			}
			return `crop=w=${w}:h=${h}:x=${left}:y=${top}`;
		},
	},

	text: {
		id: "text",
		params: { text: "", x: 0, y: 0, fontSize: 32, color: "white" },
		toFilter({ text = "", x = 0, y = 0, fontSize = 32, color = "white" } = {}) {
			if (typeof text !== "string") throw new TypeError("text must be a string");
			if (/[\0\r\n]/.test(text)) throw new TypeError("text must not contain NUL or line breaks");
			if (typeof color !== "string" || !/^[a-zA-Z0-9#@]+$/.test(color)) {
				throw new TypeError("color must be an ffmpeg color name or hex value");
			}
			const left = finiteNumber(x, "x");
			const top = finiteNumber(y, "y");
			const size = positiveNumber(fontSize, "fontSize");
			return `drawtext=text='${escapeDrawtext(text)}':x=${left}:y=${top}:fontsize=${size}:fontcolor=${color}:expansion=none`;
		},
	},
};
