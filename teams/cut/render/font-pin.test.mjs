// Cohabi Cut: the optional `font` pin on the text effect (registry.mjs) and what it buys wrap.mjs.
// Run: cd teams/cut/render && node --test font-pin.test.mjs   (FFMPEG=/path/to/ffmpeg if not on PATH)
// The real-render tests skip when there is no ffmpeg or no installed non-DejaVu family to make the default differ.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registry } from "./registry.mjs";
import { estimateTextWidth } from "./wrap.mjs";

const base = { text: "Hi", x: 0, y: 0, fontSize: 32, color: "white" };
const plain = "drawtext=expansion=none:text=Hi:x=0:y=0:fontsize=32:fontcolor=white";

test("no font param: the string is exactly what it was before (nothing existing changes)", () => {
	assert.equal(registry.text.toFilter(base), plain);
	assert.equal(registry.text.toFilter({ ...base, font: undefined }), plain);
});

test("font param is appended as a fontconfig family name, after fontcolor", () => {
	assert.equal(registry.text.toFilter({ ...base, font: "DejaVu Sans" }), `${plain}:font=DejaVu Sans`);
	assert.equal(
		registry.text.toFilter({ ...base, enable: "between(t,1,1.5)", font: "DejaVu Sans" }),
		"drawtext=expansion=none:enable='between(t,1,1.5)':text=Hi:x=0:y=0:fontsize=32:fontcolor=white:font=DejaVu Sans",
	);
});

test("font is refused unless it is a plain family name (no path, pattern syntax, option injection, edge blanks)", () => {
	for (const bad of ["", " DejaVu", "DejaVu ", "a:b", "a,b", "a;b", "a'b", "a/b", "../x.ttf", "Sans:bold", "x:text=y", "a\nb", "a=b", "[x]", 7, null, {}]) {
		assert.throws(() => registry.text.toFilter({ ...base, font: bad }), TypeError, JSON.stringify(bad));
	}
	assert.equal(registry.text.toFilter({ ...base, font: "Noto-Sans_2" }), `${plain}:font=Noto-Sans_2`);
});

// ---- real ffmpeg: does the pin make the drawn width independent of the machine's default `sans`? ----
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const hasFfmpeg = spawnSync(FFMPEG, ["-version"], { encoding: "utf8" }).status === 0;
const dir = mkdtempSync(join(tmpdir(), "font-pin-"));
const env0 = { ...process.env, HOME: dir, XDG_CACHE_HOME: join(dir, "cache") };

function match(family, e = env0) {
	const r = spawnSync("fc-match", [family], { encoding: "utf8", env: e });
	return r.status === 0 ? r.stdout.trim() : "";
}
const alt = ["Lato", "Liberation Sans", "Inter", "Noto Sans"].find((f) => match(f).startsWith(f.replace(/ /g, "")) || match(f).includes(`"${f}"`));
let confPath = null;
if (alt) {
	confPath = join(dir, "alt-default.conf");
	const rule = (n) => `<match target="pattern"><test qual="any" name="family"><string>${n}</string></test><edit name="family" mode="prepend" binding="strong"><string>${alt}</string></edit></match>`;
	writeFileSync(confPath, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><include ignore_missing="yes">/etc/fonts/fonts.conf</include>${["sans", "Sans", "sans-serif"].map(rule).join("")}</fontconfig>`);
}

// x-extent (min, max bright column) of one drawtext line on a 1200x100 black frame.
function extent(filter, e) {
	const r = spawnSync(FFMPEG, ["-v", "error", "-f", "lavfi", "-i", "color=black:s=1200x100", "-frames:v", "1", "-vf", `${filter},format=gray`, "-f", "rawvideo", "-"], { env: e, maxBuffer: 1 << 24 });
	assert.equal(r.status, 0, String(r.stderr));
	const a = r.stdout;
	assert.equal(a.length, 120000);
	let lo = Infinity, hi = -1;
	for (let i = 0; i < a.length; i++) if (a[i] > 128) { const x = i % 1200; if (x < lo) lo = x; if (x > hi) hi = x; }
	assert.ok(hi >= 0, "nothing drawn");
	return [lo, hi];
}

const skipReal = !hasFfmpeg ? "no ffmpeg on PATH (set FFMPEG)" : !alt ? "no non-DejaVu family installed to change the default" : false;
const T = { text: "WWWWWWWWWW", x: 0, y: 10, fontSize: 48, color: "white" };

test("real ffmpeg: changing the machine's default sans changes an UNPINNED caption (the hazard is real)", { skip: skipReal }, () => {
	const envAlt = { ...env0, FONTCONFIG_FILE: confPath };
	const a = extent(registry.text.toFilter(T), env0);
	const b = extent(registry.text.toFilter(T), envAlt);
	console.log(`# unpinned x-extent: system default ${a}, default->${alt} ${b}; fc-match sans (system): ${match("sans")}`);
	assert.notDeepEqual(a, b, "the alt default drew the same pixels, so this machine cannot show the hazard");
});

test("real ffmpeg: a pinned caption draws identical pixels whatever the default sans is, and wrap's estimate covers it", { skip: skipReal }, () => {
	const envAlt = { ...env0, FONTCONFIG_FILE: confPath };
	const f = registry.text.toFilter({ ...T, font: "DejaVu Sans" });
	const a = extent(f, env0);
	const b = extent(f, envAlt);
	console.log(`# pinned x-extent: system default ${a}, default->${alt} ${b}; fc-match "DejaVu Sans": ${match("DejaVu Sans", envAlt)}`);
	assert.deepEqual(a, b);
	const real = b[1] - b[0] + 1;
	const est = estimateTextWidth(T.text, T.fontSize);
	assert.ok(est >= real, `estimate ${est} must be >= real ${real}`);
});

test("the ffmpeg version is printed for the record", { skip: !hasFfmpeg ? "no ffmpeg" : false }, () => {
	console.log(`# ${spawnSync(FFMPEG, ["-version"], { encoding: "utf8" }).stdout.split("\n")[0]}`);
});
