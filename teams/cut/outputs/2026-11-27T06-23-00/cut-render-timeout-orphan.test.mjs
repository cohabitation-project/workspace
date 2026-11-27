// Cut: a render that times out must not leave ffmpeg running (round 72, Claude).
// forkRenderJob kills the render child at timeoutMs, but the child runs ffmpeg through spawnSync, so ffmpeg is the
// child's own child: killing the child alone orphans it (ppid 1), it runs to the end, and its output file stays in CUT_OUT.
// Uses a fake ffmpeg shell script (sleeps, holds its output open, writes its pid). Linux only.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { forkRenderJob } from "../lib/cut/wire.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cut-orphan-"));
const outDir = path.join(dir, "out"); fs.mkdirSync(outDir);
const src = path.join(dir, "src.mp4"); fs.writeFileSync(src, "x");
const pidFile = path.join(dir, "ffmpeg.pid");
function fake(sleepSec) {
	const f = path.join(dir, `ffmpeg-${sleepSec}`);
	fs.writeFileSync(f, `#!/bin/sh\necho $$ > "${pidFile}"\nfor last; do :; done\nexec 3>"$last"\necho partial >&3\nsleep ${sleepSec}\n`, { mode: 0o755 });
	return f;
}
const job = () => ({ edit: { trimStart: 0.5, trimEnd: 1.5, coverSec: 1 }, video: { path: src, durationSec: 10, width: 720, height: 1280, hasAudio: false }, outDir });
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("a timed-out render leaves no ffmpeg process running", async () => {
	process.env.FFMPEG = fake(20);
	await assert.rejects(forkRenderJob(job(), { timeoutMs: 1500 }), /render timed out/);
	const pid = Number(fs.readFileSync(pidFile, "utf8"));
	await wait(400);
	const still = alive(pid);
	if (still) process.kill(pid, "SIGKILL"); // tidy up either way
	assert.equal(still, false, "ffmpeg pid " + pid + " survived the render timeout");
});

test("a render that finishes in time still resolves", async () => {
	process.env.FFMPEG = fake(0);
	const r = await forkRenderJob(job(), { timeoutMs: 20000 });
	assert.equal(r.ok, true);
	assert.match(path.basename(r.outPath), /^cut_[0-9a-f]{16}\.mp4$/);
});
