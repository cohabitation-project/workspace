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

// Escape a drawtext value for filter_complex. expansion=none (set in toFilter) stops user
// text such as %{...} being interpreted by drawtext itself.
// UNQUOTED two-level escaping, measured on ffmpeg n9.0.2 (2026-11-21) against a textfile= render:
// the old quoted form text='it'\''s' exits 0 but DRAWS NOTHING. Level 1 (option parser) escapes \ ' :
// Level 2 (filtergraph parser) escapes \ ' , ; [ ]. Leading/trailing blanks are stripped by the graph
// parser unless written as three backslashes plus the character.
function escapeDrawtext(value) {
	const m = /^([ \t]*)([\s\S]*?)([ \t]*)$/.exec(String(value));
	const edge = (w) => [...w].map((c) => "\\\\\\" + c).join("");
	const mid = m[2].replace(/[\\':]/g, "\\$&").replace(/[\\',;[\]]/g, "\\$&");
	return edge(m[1]) + mid + edge(m[3]);
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

			toFilter({ text = "", x = 0, y = 0, fontSize = 32, color = "white", enable, font } = {}) {
			if (typeof text !== "string") throw new TypeError("text must be a string");
			if (/[\0\r\n]/.test(text)) throw new TypeError("text must not contain NUL or line breaks");
			// Optional fontconfig family pin (opt-in, so existing strings do not change). Without it drawtext
			// uses the machine's default `sans`, which is DejaVu on one box and Inter on another; wrap.mjs's
			// width table is only true for "DejaVu Sans". Name only: no path, no pattern syntax, no edge blanks.
			if (font !== undefined && (typeof font !== "string" || !/^[A-Za-z0-9](?:[A-Za-z0-9 _-]*[A-Za-z0-9])?$/.test(font))) {
				throw new TypeError("font must be a plain fontconfig family name (letters, digits, space, _ or -)");
			}
			if (typeof color !== "string" || !/^[a-zA-Z0-9#@]+$/.test(color)) {
				throw new TypeError("color must be an ffmpeg color name or hex value");
			}
			const left = finiteNumber(x, "x");
			const top = finiteNumber(y, "y");
			const size = positiveNumber(fontSize, "fontSize");
			let enabled = "";
			if (enable !== undefined) {
				// Accept only the generated between(t,start,end) shape, never arbitrary ffmpeg
				// expressions. Decimal seconds are non-negative and exponent-free.
				const match = typeof enable === "string" && /^between\(t,((?:0|[1-9]\d*)(?:\.\d+)?),((?:0|[1-9]\d*)(?:\.\d+)?)\)$/.exec(enable);
				if (!match) throw new RangeError("enable must be between(t,start,end) with non-negative decimal seconds");
				const start = Number(match[1]);
				const end = Number(match[2]);
				if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
					throw new RangeError("enable end must be finite and greater than start");
				}
				enabled = `:enable='${enable}'`;
			}
			// expansion=none MUST come before text=. Measured on ffmpeg n9.0.2: with expansion last, a text
			// containing both an apostrophe and %{...} makes drawtext fail ("%{x} is not known") because the
			// text is evaluated before the option is applied; with it first, the same graph runs and draws literally.
			return `drawtext=expansion=none${enabled}:text=${escapeDrawtext(text)}:x=${left}:y=${top}:fontsize=${size}:fontcolor=${color}${font === undefined ? "" : `:font=${font}`}`;
		},
	},
};
