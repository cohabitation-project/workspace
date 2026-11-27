// Cohabi Cut, Job 4: the glue between route.mjs and the server's real stores. Pure functions of the stores handed in,
// so a test can pass stores with the same SHAPES as commons/lib/videos.mjs and commons/lib/audio.mjs.
//
// What main's stores actually give (read at commons/lib/videos.mjs and audio.mjs, 2026-11-23):
//   videos.get(id)     -> { id, by, url, seconds|null, ready, ... }   owner is `by`; NO file path, NO width/height
//   videos.fileFor(id) -> { file, type } | null                      the file to read (converted mp4, else the original)
//   audio.get(id)      -> { id, ext, by, title, ... } | null         owner is `by`
//   audio.fileOf(item) -> absolute path
// route.mjs wants { owner, path } from videos.get / music.get and { hasAudio, width, height, durationSec } from probe.
import { execFile, fork } from "node:child_process";
import { basename, isAbsolute } from "node:path";

const run = (impl, file, args) => new Promise((res, rej) => {
	impl(file, args, { timeout: 20000, maxBuffer: 1 << 20 }, (e, so) => (e ? rej(e) : res(String(so))));
});

/** Parse `ffprobe -print_format json -show_streams -show_format` output into what the editor needs. */
export function parseProbe(json) {
	const j = typeof json === "string" ? JSON.parse(json) : json;
	const streams = Array.isArray(j?.streams) ? j.streams : [];
	const v = streams.find((s) => s.codec_type === "video");
	if (!v) throw new Error("no video stream");
	let w = Number(v.width), h = Number(v.height);
	// Phones record sideways and add a rotation flag; ffmpeg auto-rotates, so the frame the editor sees is swapped.
	const rot = Number((v.side_data_list || []).map((d) => d?.rotation).find((r) => r !== undefined) ?? v.tags?.rotate ?? 0);
	if (Math.abs(rot) % 180 === 90) [w, h] = [h, w];
	const dur = Number(j?.format?.duration ?? v.duration);
	if (!(w > 0) || !(h > 0) || !(dur > 0)) throw new Error("unreadable video");
	return { hasAudio: streams.some((s) => s.codec_type === "audio"), width: w, height: h, durationSec: dur };
}

export function makeCutDeps({ videos, audio, labelTracks = null, outDir, ffprobe = process.env.FFPROBE || "ffprobe", execFileImpl = execFile, maxJobs = 2, renderJob = forkRenderJob, log = () => {} } = {}) {
	return {
		videos: {
			get(id) {
				const v = videos.get(id), f = videos.fileFor(id);
				return v && f ? { owner: v.by, path: f.file } : null;
			},
		},
		music: {
			get(id) {
				if (labelTracks) { const t = labelTracks.get(id); if (t) return { public: true, path: t.path }; }
				const a = audio.get(id);
				return a ? { owner: a.by, path: audio.fileOf(a) } : null;
			},
		},
		async probe(path) {
			if (!isAbsolute(path)) throw new Error("probe wants an absolute path");
			return parseProbe(await run(execFileImpl, ffprobe, ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", path]));
		},
		outDir, maxJobs, renderJob, log,
		publicUrl: (outPath) => `/cut/${basename(outPath)}`,
	};
}

/** Kill the render child AND its ffmpeg. The child runs ffmpeg through spawnSync, so ffmpeg is the child's own child:
 *  p.kill() alone leaves it running (ppid 1) with no timeout and a half-written file in the output folder.
 *  The child is started detached, so it leads its own process group and -pid reaches ffmpeg too. */
function killTree(p) {
	try { process.kill(-p.pid, "SIGKILL"); return; } catch { /* group already gone, or no groups on this OS */ }
	try { p.kill("SIGKILL"); } catch { /* already gone */ }
}

/** Run renderEditJob in a child process so ffmpeg's spawnSync never blocks the server; refusals keep their type. */
export function forkRenderJob(job, { timeoutMs = 150000, child = new URL("./render-child.mjs", import.meta.url) } = {}) {
	return new Promise((resolve, reject) => {
		const p = fork(child, [], { stdio: ["ignore", "ignore", "ignore", "ipc"], execArgv: [], detached: true });
		let done = false;
		const end = (fn, v) => { if (done) return; done = true; clearTimeout(t); killTree(p); fn(v); };
		const t = setTimeout(() => end(reject, new Error("render timed out")), timeoutMs);
		p.once("message", (m) => {
			if (m?.ok) return end(resolve, m.result);
			const e = m?.name === "TypeError" ? new TypeError(m.message) : m?.name === "RangeError" ? new RangeError(m.message) : Object.assign(new Error(m?.message || "render failed"), { name: m?.name || "Error" });
			end(reject, e);
		});
		p.once("error", (e) => end(reject, e));
		p.once("exit", () => end(reject, new Error("render process exited")));
		p.send(job);
	});
}
