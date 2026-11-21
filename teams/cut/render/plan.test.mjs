// Tests for teams/cut/render/plan.mjs. Run: cd teams/cut/render && node --test plan.test.mjs
// Timelines are built with the real model factories (../port/model.mjs), not hand-written objects.
import test from "node:test";
import assert from "node:assert/strict";
import { buildRenderPlan, atempoChain, secs, RenderPlanError } from "./plan.mjs";
import { createEmptyTracks, createElement, createTrack } from "../port/model.mjs";

const T = 120000; // ticks per second

function clip(id, src, startTime, duration, extra = {}) {
	return createElement({ id, type: "video", startTime, duration, params: { src }, ...extra });
}
function timeline(...clips) {
	const tracks = createEmptyTracks();
	tracks.main.elements.push(...clips);
	return tracks;
}

// Parse a filter_complex into chains: { ins:[labels], outs:[labels] }.
function parse(fc) {
	return fc.split(";").map((c) => ({
		ins: (c.match(/^(?:\[[^\]]+\])*/)[0].match(/\[[^\]]+\]/g) ?? []).map((l) => l.slice(1, -1)),
		outs: (c.match(/(?:\[[^\]]+\])+$/)[0].match(/\[[^\]]+\]/g) ?? []).map((l) => l.slice(1, -1)),
	}));
}
// ffmpeg rule: every pad is produced once and consumed once (final outputs excepted).
function assertLabelsClosed(fc, inputCount) {
	const chains = parse(fc);
	const produced = new Map();
	const consumed = new Map();
	for (const c of chains) {
		for (const o of c.outs) produced.set(o, (produced.get(o) ?? 0) + 1);
		for (const i of c.ins) consumed.set(i, (consumed.get(i) ?? 0) + 1);
	}
	for (const [l, n] of produced) assert.equal(n, 1, `label ${l} produced ${n} times`);
	for (const [l, n] of consumed) {
		assert.equal(n, 1, `label ${l} consumed ${n} times`);
		const isInput = /^\d+:[va]$/.test(l);
		if (isInput) assert.ok(Number(l.split(":")[0]) < inputCount, `input ${l} out of range`);
		else assert.ok(produced.has(l), `label ${l} consumed but never produced`);
	}
	for (const l of produced.keys()) {
		if (l !== "vout" && l !== "aout") assert.ok(consumed.has(l), `label ${l} produced but never consumed`);
	}
}

const NORM = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p";

test("two-clip sample: exact trim + concat plan", () => {
	const tracks = timeline(
		clip("a", "/media/a.mp4", 0, 1 * T),
		clip("b", "/media/b.mp4", 1 * T, 2 * T, { trimStart: T / 2 }),
	);
	const plan = buildRenderPlan({ tracks });
	assert.deepEqual(plan.inputs, ["/media/a.mp4", "/media/b.mp4"]);
	assert.equal(plan.durationTicks, 3 * T);
	assert.deepEqual(plan.ignored, []);
	const expected = [
		`[0:v]trim=start=0:end=1,setpts=PTS-STARTPTS,trim=end=1,${NORM}[v0]`,
		"[0:a]atrim=start=0:end=1,asetpts=PTS-STARTPTS,atrim=end=1,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a0]",
		`[1:v]trim=start=0.5:end=2.5,setpts=PTS-STARTPTS,trim=end=2,${NORM}[v1]`,
		"[1:a]atrim=start=0.5:end=2.5,asetpts=PTS-STARTPTS,atrim=end=2,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a1]",
		"[v0][a0][v1][a1]concat=n=2:v=1:a=1[vout][aout]",
	].join(";");
	assert.equal(plan.filterComplex, expected);
	assert.deepEqual(plan.args, [
		"-i", "/media/a.mp4", "-i", "/media/b.mp4",
		"-filter_complex", expected, "-map", "[vout]", "-map", "[aout]",
	]);
	assertLabelsClosed(plan.filterComplex, 2);
});

test("retime 1.5: source span is duration*rate, video setpts divides, audio gets atempo", () => {
	// 80000 timeline ticks at rate 1.5 = 120000 source ticks = 1 s of source
	const tracks = timeline(clip("a", "/m/a.mp4", 0, 80000, { retime: { rate: 1.5 } }));
	const { filterComplex } = buildRenderPlan({ tracks });
	assert.match(filterComplex, /\[0:v\]trim=start=0:end=1,setpts=\(PTS-STARTPTS\)\/1\.5,trim=end=0\.666667,/);
	assert.match(filterComplex, /\[0:a\]atrim=start=0:end=1,asetpts=PTS-STARTPTS,atempo=1\.5,atrim=end=0\.666667,/);
});

test("retime with a trim: source window starts at trimStart and is duration*rate long", () => {
	const tracks = timeline(clip("a", "/m/a.mp4", 0, 1 * T, { retime: { rate: 0.5 }, trimStart: 2 * T }));
	const { filterComplex } = buildRenderPlan({ tracks });
	assert.match(filterComplex, /trim=start=2:end=2\.5,setpts=\(PTS-STARTPTS\)\/0\.5,trim=end=1,/);
});

test("a rate outside 0.01..5 is clamped the same way the model clamps it (video and audio agree)", () => {
	const fast = buildRenderPlan({ tracks: timeline(clip("a", "/m/a.mp4", 0, T, { retime: { rate: 10 } })) });
	assert.match(fast.filterComplex, /setpts=\(PTS-STARTPTS\)\/5,/);
	assert.match(fast.filterComplex, /asetpts=PTS-STARTPTS,atempo=2,atempo=2,atempo=1\.25,/);
	assert.match(fast.filterComplex, /trim=start=0:end=5,/); // 1 s of timeline at the clamped 5x = 5 s of source
	const slow = buildRenderPlan({ tracks: timeline(clip("a", "/m/a.mp4", 0, T, { retime: { rate: 0.001 } })) });
	assert.match(slow.filterComplex, /setpts=\(PTS-STARTPTS\)\/0\.01,/);
	assert.match(slow.filterComplex, /trim=start=0:end=0\.01,/);
});

test("plan.maps names the concat outputs, video first", () => {
	const plan = buildRenderPlan({ tracks: timeline(clip("a", "/m/a.mp4", 0, T)) });
	assert.deepEqual(plan.maps, { video: "[vout]", audio: "[aout]" });
	assert.ok(plan.filterComplex.endsWith("[vout][aout]"));
});

test("atempoChain: every instance in 0.5..2 and the product equals the rate (seeded sweep over 0.01..5)", () => {
	let seed = 12345;
	const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
	let chained = 0;
	for (let k = 0; k < 500; k++) {
		const rate = 0.01 + rnd() * 4.99;
		const parts = atempoChain(rate).map((s) => Number(s.split("=")[1]));
		for (const p of parts) assert.ok(p >= 0.5 && p <= 2, `instance ${p} out of range for rate ${rate}`);
		const product = parts.reduce((a, b) => a * b, 1);
		assert.ok(Math.abs(product / rate - 1) < 1e-4, `product ${product} != rate ${rate}`);
		if (parts.length > 1) chained++;
	}
	assert.ok(chained > 100, "sweep must include rates that need more than one atempo");
	assert.deepEqual(atempoChain(5), ["atempo=2", "atempo=2", "atempo=1.25"]);
	assert.deepEqual(atempoChain(0.01).length, 7);
});

test("gap between clips becomes black video + silence of the gap length", () => {
	const tracks = timeline(clip("a", "/m/a.mp4", 0, T), clip("b", "/m/b.mp4", 2 * T, T));
	const plan = buildRenderPlan({ tracks, width: 720, height: 1280, fps: 24 });
	assert.match(plan.filterComplex, /color=c=black:s=720x1280:r=24:d=1,setsar=1,format=yuv420p\[v1\]/);
	assert.match(plan.filterComplex, /anullsrc=r=48000:cl=stereo,atrim=duration=1,asetpts=PTS-STARTPTS\[a1\]/);
	assert.match(plan.filterComplex, /\[v0\]\[a0\]\[v1\]\[a1\]\[v2\]\[a2\]concat=n=3:v=1:a=1\[vout\]\[aout\]/);
	assert.equal(plan.durationTicks, 3 * T);
	assert.equal(plan.inputs.length, 2); // gaps add no input file
	assertLabelsClosed(plan.filterComplex, 2);
});

test("a gap before the first clip is filled too", () => {
	const plan = buildRenderPlan({ tracks: timeline(clip("a", "/m/a.mp4", T / 2, T)) });
	assert.match(plan.filterComplex, /^color=c=black:s=1080x1920:r=30:d=0\.5,/);
	assert.equal(plan.durationTicks, T / 2 + T);
});

test("clips are placed by startTime, not by array order", () => {
	const tracks = timeline(clip("b", "/m/b.mp4", T, T), clip("a", "/m/a.mp4", 0, T));
	const plan = buildRenderPlan({ tracks });
	assert.deepEqual(plan.inputs, ["/m/a.mp4", "/m/b.mp4"]);
});

test("a source with hasAudio:false gets silence, and no [n:a] pad is read", () => {
	const tracks = timeline(clip("a", "/m/mute.mp4", 0, T), clip("b", "/m/b.mp4", T, T));
	const { filterComplex } = buildRenderPlan({ tracks, sources: { "/m/mute.mp4": { hasAudio: false } } });
	assert.ok(!filterComplex.includes("[0:a]"));
	assert.ok(filterComplex.includes("[1:a]"));
	assert.match(filterComplex, /anullsrc=r=48000:cl=stereo,atrim=duration=1,asetpts=PTS-STARTPTS\[a0\]/);
	assertLabelsClosed(filterComplex, 2);
});

test("the same file used twice gets two inputs, so no pad is reused", () => {
	const tracks = timeline(clip("a", "/m/a.mp4", 0, T), clip("b", "/m/a.mp4", T, T, { trimStart: 5 * T }));
	const plan = buildRenderPlan({ tracks });
	assert.deepEqual(plan.inputs, ["/m/a.mp4", "/m/a.mp4"]);
	assertLabelsClosed(plan.filterComplex, 2);
});

test("nothing silently dropped: overlay and main-track text elements are reported in `ignored`", () => {
	const tracks = timeline(clip("a", "/m/a.mp4", 0, T));
	const overlay = createTrack({ type: "video", name: "ov", id: "ov1" });
	overlay.elements.push(clip("o", "/m/o.mp4", 0, T));
	tracks.overlay.push(overlay);
	tracks.main.elements.push(createElement({ id: "t", type: "text", startTime: 0, duration: T, params: { content: "hi" } }));
	const plan = buildRenderPlan({ tracks });
	assert.deepEqual(plan.ignored.map((x) => x.elementId).sort(), ["o", "t"]);
	assert.deepEqual(plan.inputs, ["/m/a.mp4"]); // the ignored ones add no input
});

test("one music element: exact trim + delay + amix plan; a second is refused", () => {
	const tracks = timeline(clip("a", "/m/a.mp4", 0, 2 * T));
	const music = createTrack({ type: "audio", name: "music", id: "au1" });
	music.elements.push(createElement({
		id: "m", type: "audio", startTime: T / 2, duration: T, trimStart: 2 * T,
		params: { src: "/m/song.mp3" },
	}));
	tracks.audio.push(music);
	const plan = buildRenderPlan({ tracks });
	assert.deepEqual(plan.inputs, ["/m/a.mp4", "/m/song.mp3"]);
	assert.equal(plan.durationTicks, 2 * T);
	assert.deepEqual(plan.ignored, []);
	const expected = [
		`[0:v]trim=start=0:end=2,setpts=PTS-STARTPTS,trim=end=2,${NORM}[v0]`,
		"[0:a]atrim=start=0:end=2,asetpts=PTS-STARTPTS,atrim=end=2,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a0]",
		"[v0][a0]concat=n=1:v=1:a=1[vout][amain]",
		"[1:a]atrim=start=2:end=3,asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=500|500[amusic]",
		"[amain][amusic]amix=inputs=2:duration=first:normalize=0[aout]",
	].join(";");
	assert.equal(plan.filterComplex, expected);
	assertLabelsClosed(plan.filterComplex, 2);

	music.elements.push(createElement({
		id: "m2", type: "audio", startTime: 0, duration: T, trimStart: 0,
		params: { src: "/m/other.mp3" },
	}));
	assert.throws(() => buildRenderPlan({ tracks }), (e) => e instanceof RenderPlanError && /only one audio-track music element/.test(e.message));
});

test("music volume: 0.5 is emitted before adelay, default/explicit 1 is omitted, invalid values are refused", () => {
	const makeTracks = (volume, include = true) => {
		const tracks = timeline(clip("a", "/m/a.mp4", 0, T));
		const music = createTrack({ type: "audio", name: "music", id: "au1" });
		music.elements.push(createElement({
			id: "m", type: "audio", startTime: 0, duration: T, trimStart: 0,
			params: { src: "/m/song.mp3", ...(include ? { volume } : {}) },
		}));
		tracks.audio.push(music);
		return tracks;
	};
	const musicChain = (volume, include = true) => buildRenderPlan({ tracks: makeTracks(volume, include) }).filterComplex.split(";").at(-2);
	const unchanged = "[1:a]atrim=start=0:end=1,asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=0|0[amusic]";
	assert.equal(musicChain(0.5), unchanged.replace(",adelay=", ",volume=0.5,adelay="));
	assert.equal(musicChain(1), unchanged);
	assert.equal(musicChain(undefined, false), unchanged);
	for (const volume of [3, -0.01, NaN, Infinity, "0.5", null]) {
		assert.throws(
			() => buildRenderPlan({ tracks: makeTracks(volume) }),
			(e) => e instanceof RenderPlanError && /params\.volume/.test(e.message),
			`volume ${String(volume)} must be refused`,
		);
	}
});

test("music fades: exact afade chain, zero omitted, invalid timings refused", () => {
	const makeTracks = (params) => {
		const tracks = timeline(clip("a", "/m/a.mp4", 0, 3 * T));
		const music = createTrack({ type: "audio", name: "music", id: "au1" });
		music.elements.push(createElement({
			id: "m", type: "audio", startTime: T / 2, duration: 2 * T, trimStart: 2 * T,
			params: { src: "/m/song.mp3", ...params },
		}));
		tracks.audio.push(music);
		return tracks;
	};
	const musicChain = (params) => buildRenderPlan({ tracks: makeTracks(params) }).filterComplex.split(";").at(-2);
	const unchanged = "[1:a]atrim=start=2:end=4,asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=500|500[amusic]";
	const withFadesAndVolume = unchanged
		.replace(",aresample=", ",afade=t=in:st=0:d=0.25,afade=t=out:st=1.5:d=0.5,aresample=")
		.replace(",adelay=", ",volume=0.5,adelay=");
	assert.equal(musicChain({ fadeIn: 0.25, fadeOut: 0.5, volume: 0.5 }), withFadesAndVolume);
	assert.equal(musicChain({ fadeIn: 0, fadeOut: 0 }), unchanged);
	for (const params of [
		{ fadeIn: -0.01 }, { fadeOut: -0.01 },
		{ fadeIn: 2.01 }, { fadeOut: 2.01 },
		{ fadeIn: 1.25, fadeOut: 0.76 },
		{ fadeIn: NaN }, { fadeOut: Infinity },
		{ fadeIn: "0.5" }, { fadeOut: null },
	]) {
		assert.throws(
			() => buildRenderPlan({ tracks: makeTracks(params) }),
			(e) => e instanceof RenderPlanError && /params\.fade/.test(e.message),
			`fade params ${JSON.stringify(params)} must be refused`,
		);
	}
});

test("overlay Words track: exact timed drawtext chain after concat, not ignored", () => {
	const tracks = timeline(clip("a", "/m/a.mp4", 0, 2 * T));
	const words = createTrack({ type: "text", name: "Words", id: "words" });
	words.elements.push(createElement({
		id: "caption-1", type: "text", startTime: T / 2, duration: 3 * T / 2,
		params: {
			content: "Hello Cohabi", fontSize: 42, color: "white",
			"transform.positionX": 24, "transform.positionY": 36,
		},
	}));
	tracks.overlay.push(words);
	const plan = buildRenderPlan({ tracks });
	const drawtext = "drawtext=expansion=none:enable='between(t,0.5,2)':text=Hello Cohabi:x=24:y=36:fontsize=42:fontcolor=white";
	const expected = [
		`[0:v]trim=start=0:end=2,setpts=PTS-STARTPTS,trim=end=2,${NORM}[v0]`,
		"[0:a]atrim=start=0:end=2,asetpts=PTS-STARTPTS,atrim=end=2,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a0]",
		"[v0][a0]concat=n=1:v=1:a=1[vconcat][aout]",
		`[vconcat]${drawtext}[vout]`,
	].join(";");
	assert.equal(plan.filterComplex, expected);
	assert.deepEqual(plan.inputs, ["/m/a.mp4"]);
	assert.deepEqual(plan.ignored, []);
	assert.deepEqual(plan.maps, { video: "[vout]", audio: "[aout]" });
	assertLabelsClosed(plan.filterComplex, 1);
});

test("a hostile src stays one argv element and never enters a filter string", () => {
	const src = "x';movie=/etc/passwd[bad];-i y";
	const plan = buildRenderPlan({ tracks: timeline(clip("a", src, 0, T)) });
	assert.ok(!plan.filterComplex.includes("passwd"));
	assert.equal(plan.args[1], src);
	assert.equal(plan.args.filter((a) => a === "-i").length, 1);
});

test("refuses what it cannot plan, with a RenderPlanError", () => {
	const bad = (tracks, opts, re) => assert.throws(() => buildRenderPlan({ tracks, ...opts }), (e) => e instanceof RenderPlanError && re.test(e.message));
	bad(createEmptyTracks(), {}, /no video clips/);
	bad(timeline(clip("a", "/m/a.mp4", 0, 2 * T), clip("b", "/m/b.mp4", T, T)), {}, /overlaps/);
	bad(timeline(createElement({ id: "x", type: "video", duration: T })), {}, /params\.src/);
	bad(timeline(clip("x", "a\nb", 0, T)), {}, /params\.src/);
	bad(timeline(clip("a", "/m/a.mp4", 0, 0)), {}, /duration/);
	bad(timeline(clip("a", "/m/a.mp4", 0, T)), { width: 1081 }, /even/);
	bad(timeline(clip("a", "/m/a.mp4", 0, T)), { fps: 0 }, /fps/);
	bad(timeline(clip("a", "/m/a.mp4", 0, 2 * T, { trimStart: 5 * T, sourceDuration: 6 * T })), {}, /source is 6s long/);
});

test("an element asking for slightly past the source end by rounding is allowed", () => {
	// duration 66667 at 1.5 = 100000.5 -> 100001 source ticks; source is 100000 long
	const tracks = timeline(clip("a", "/m/a.mp4", 0, 66667, { retime: { rate: 1.5 }, sourceDuration: 100000 }));
	assert.doesNotThrow(() => buildRenderPlan({ tracks }));
});

test("secs: exact text for common ticks, and always within a microsecond of the tick (seeded sweep)", () => {
	assert.equal(secs(0), "0");
	assert.equal(secs(T), "1");
	assert.equal(secs(10 * T), "10");
	assert.equal(secs(T / 2), "0.5");
	assert.equal(secs(1), "0.000008");
	assert.throws(() => secs(1.5), RenderPlanError);
	let seed = 7;
	const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
	for (let k = 0; k < 1000; k++) {
		const t = Math.floor(rnd() * 3600 * T);
		assert.ok(Math.abs(Number(secs(t)) - t / T) <= 5e-7 + 1e-12, `secs(${t})`);
	}
});

test("seeded sweep: random timelines always yield a closed label graph and the right total length", () => {
	let seed = 99;
	const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
	let withGap = 0;
	let withRetime = 0;
	for (let k = 0; k < 60; k++) {
		const n = 1 + Math.floor(rnd() * 6);
		const clips = [];
		let cursor = 0;
		for (let i = 0; i < n; i++) {
			const gap = rnd() < 0.3 ? Math.floor(rnd() * T) + 1 : 0;
			if (gap) withGap++;
			const duration = Math.floor(rnd() * 3 * T) + 1;
			const extra = {};
			if (rnd() < 0.4) { extra.retime = { rate: 0.05 + rnd() * 4.9 }; withRetime++; }
			clips.push(clip(`c${i}`, `/m/${i % 3}.mp4`, cursor + gap, duration, extra));
			cursor += gap + duration;
		}
		const plan = buildRenderPlan({ tracks: timeline(...clips), sources: { "/m/1.mp4": { hasAudio: false } } });
		assert.equal(plan.durationTicks, cursor);
		assert.equal(plan.inputs.length, n);
		assertLabelsClosed(plan.filterComplex, n);
		const concat = plan.filterComplex.match(/concat=n=(\d+)/);
		assert.equal(Number(concat[1]), n + clips.filter((c, i) => i === 0 ? c.startTime > 0 : c.startTime > clips[i - 1].startTime + clips[i - 1].duration).length);
	}
	assert.ok(withGap > 10 && withRetime > 10, "sweep must exercise gaps and retime");
});

// ---- effects slice: params.effects -> registry filters, after trim/retime and before normalise ----

function fxClip(effects, extra = {}, src = "/m/a.mp4", dur = 2 * T) {
	return clip("a", src, 0, dur, { ...extra, params: { src, effects } });
}

test("fade in + crop + fade out on one clip: exact string, in array order, between trim and scale", () => {
	const tracks = timeline(fxClip([
		{ id: "fade", params: { direction: "in", start: 0, duration: 0.5 } },
		{ id: "crop", params: { width: 640, height: 360, x: 10, y: 20 } },
		{ id: "fade", params: { direction: "out", start: 1.5, duration: 0.5 } },
	]));
	const plan = buildRenderPlan({ tracks });
	assert.equal(
		plan.filterComplex.split(";")[0],
		"[0:v]trim=start=0:end=2,setpts=PTS-STARTPTS,trim=end=2," +
		"fade=t=in:st=0:d=0.5,crop=w=640:h=360:x=10:y=20,fade=t=out:st=1.5:d=0.5," +
		`${NORM}[v0]`,
	);
	assertLabelsClosed(plan.filterComplex, 1);
	assert.deepEqual(plan.ignored, []);
});

test("effects are per clip: the clip next to an effect clip is unchanged, and the audio chain never gets a video filter", () => {
	const tracks = timeline(
		fxClip([{ id: "fade", params: { duration: 1 } }], {}, "/m/a.mp4", T),
		clip("b", "/m/b.mp4", T, T),
	);
	const [v0, a0, v1] = buildRenderPlan({ tracks }).filterComplex.split(";");
	assert.match(v0, /,trim=end=1,fade=t=in:st=0:d=1,scale=/);
	assert.ok(!a0.includes("fade"));
	assert.ok(!v1.includes("fade"));
});

test("effects with retime: the fade time is measured on the clip's output, after setpts", () => {
	const tracks = timeline(fxClip([{ id: "fade", params: { direction: "out", start: 0.5, duration: 0.5 } }], { retime: { rate: 2 } }, "/m/a.mp4", T));
	const fc = buildRenderPlan({ tracks }).filterComplex;
	assert.match(fc, /trim=start=0:end=2,setpts=\(PTS-STARTPTS\)\/2,trim=end=1,fade=t=out:st=0\.5:d=0\.5,scale=/);
});

test("an empty or missing effects list changes nothing; an effect with no params uses the registry defaults", () => {
	const plain = buildRenderPlan({ tracks: timeline(clip("a", "/m/a.mp4", 0, T)) }).filterComplex;
	assert.equal(buildRenderPlan({ tracks: timeline(fxClip([], {}, "/m/a.mp4", T)) }).filterComplex, plain);
	const dflt = buildRenderPlan({ tracks: timeline(fxClip([{ id: "fade" }], {}, "/m/a.mp4", T)) }).filterComplex;
	assert.match(dflt, /trim=end=1,fade=t=in:st=0:d=1,scale=/);
});

test("a source size with only one dimension is ignored, not half-applied", () => {
	const crop = [{ id: "crop", params: { width: 640, height: 360, x: 700, y: 0 } }];
	assert.doesNotThrow(() => buildRenderPlan({ tracks: timeline(fxClip(crop)), sources: { "/m/a.mp4": { width: 1280 } } }));
	assert.doesNotThrow(() => buildRenderPlan({ tracks: timeline(fxClip(crop)), sources: { "/m/a.mp4": { height: 720 } } }));
});

test("an unknown effect id is a RenderPlanError naming the clip and the id (prototype keys included)", () => {
	const bad = (effects, re) => assert.throws(() => buildRenderPlan({ tracks: timeline(fxClip(effects)) }), (e) => e instanceof RenderPlanError && re.test(e.message));
	bad([{ id: "sparkle" }], /clip a effect #0: unknown effect id "sparkle"/);
	bad([{ id: "fade" }, { id: "blur" }], /effect #1: unknown effect id "blur"/);
	bad([{ id: "constructor" }], /unknown effect id "constructor"/);
	bad([{ id: "__proto__" }], /unknown effect id "__proto__"/);
	bad([{ id: "toString" }], /unknown effect id "toString"/);
});

test("malformed effects entries are refused, not skipped", () => {
	const bad = (effects, re) => assert.throws(() => buildRenderPlan({ tracks: timeline(fxClip(effects)) }), (e) => e instanceof RenderPlanError && re.test(e.message));
	bad("fade", /must be an array/);
	bad(null, /must be an array/);
	bad({ id: "fade" }, /must be an array/);
	bad([null], /needs a string id/);
	bad([{ id: 5 }], /needs a string id/);
	bad([{ params: {} }], /needs a string id/);
	bad([{ id: "fade", params: [1] }], /params must be an object/);
	bad([{ id: "fade", params: "x" }], /params must be an object/);
});

test("a registry guard failure comes out as a RenderPlanError that names the effect", () => {
	const bad = (effects, opts, re) => assert.throws(() => buildRenderPlan({ tracks: timeline(fxClip(effects)), ...opts }), (e) => e instanceof RenderPlanError && re.test(e.message));
	bad([{ id: "fade", params: { duration: 0 } }], {}, /effect #0 \(fade\).*duration/);
	bad([{ id: "fade", params: { direction: "sideways" } }], {}, /\(fade\).*direction/);
	bad([{ id: "crop", params: { width: 0 } }], {}, /\(crop\).*width/);
	bad([{ id: "text", params: { text: "a\nb" } }], {}, /\(text\).*line breaks/);
});

test("crop is checked against the source size when the caller supplies it, and not when it doesn't", () => {
	const crop = [{ id: "crop", params: { width: 640, height: 360, x: 700, y: 0 } }];
	assert.throws(
		() => buildRenderPlan({ tracks: timeline(fxClip(crop)), sources: { "/m/a.mp4": { width: 1280, height: 720 } } }),
		(e) => e instanceof RenderPlanError && /exceeds frame 1280x720/.test(e.message),
	);
	assert.doesNotThrow(() => buildRenderPlan({ tracks: timeline(fxClip(crop)) })); // size unknown: no check (as the registry does)
	assert.doesNotThrow(() => buildRenderPlan({
		tracks: timeline(fxClip([{ id: "crop", params: { width: 640, height: 360, x: 640, y: 360 } }])),
		sources: { "/m/a.mp4": { width: 1280, height: 720 } },
	}));
	// an explicit frame size in the effect wins over the source map
	assert.doesNotThrow(() => buildRenderPlan({
		tracks: timeline(fxClip([{ id: "crop", params: { width: 640, height: 360, x: 700, y: 0, frameWidth: 1920, frameHeight: 1080 } }])),
		sources: { "/m/a.mp4": { width: 1280, height: 720 } },
	}));
});

test("a half-given frame size in the effect still fails, even when the source map has a size", () => {
	const sources = { "/m/a.mp4": { width: 1280, height: 720 } };
	assert.throws(
		() => buildRenderPlan({ tracks: timeline(fxClip([{ id: "crop", params: { width: 64, height: 36, frameWidth: 1280 } }])), sources }),
		(e) => e instanceof RenderPlanError && /supplied together/.test(e.message),
	);
});

test("an error that is not a registry guard (a bug) is rethrown as itself, not hidden", () => {
	const params = { get text() { throw new Error("boom"); } };
	assert.throws(
		() => buildRenderPlan({ tracks: timeline(fxClip([{ id: "text", params }])) }),
		(e) => !(e instanceof RenderPlanError) && e.message === "boom",
	);
});

test("text effect: hostile text is escaped by the registry and stays inside one filter in one chain", () => {
	const text = "it's 5:00, [live]; \\n %{pts}";
	const fc = buildRenderPlan({ tracks: timeline(fxClip([{ id: "text", params: { text, x: 10, y: 20, fontSize: 40 } }])) }).filterComplex;
	const v0 = fc.split(/(?<!\\);/)[0]; // split on ';' not preceded by a backslash
	assert.ok(v0.endsWith("[v0]") && v0.includes(String.raw`drawtext=expansion=none:text=it\\\'s 5\\:00\, \[live\]\; \\\\n %{pts}:x=10:y=20:fontsize=40:fontcolor=white,scale=`), v0);
	assert.equal(fc.split(/(?<!\\);/).length, 3); // video chain, audio chain, concat: the text did not add a chain
});

