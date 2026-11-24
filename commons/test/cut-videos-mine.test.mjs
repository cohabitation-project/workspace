// Cohabi Cut on OpenCut (2026-11-24): GET /api/videos?by=me lists the signed-in member's OWN videos, for the "From Cohabi" tab.
// Boots the real commons/server.mjs on a temp data dir (no ffmpeg needed: the music check in handleCutRender runs before any probe).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { freePort } from "./lib/port.mjs";

const COMMONS = path.resolve(import.meta.dirname, "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("GET /api/videos?by=me: 401 signed out, 400 without by=me, own videos only, newest first", async () => {
	const PORT = await freePort(), B = `http://127.0.0.1:${PORT}`;
	const D = fs.mkdtempSync(path.join(os.tmpdir(), "cut-videos-"));
	let srv, stderr = "";
	const signup = async (name) => {
		const r = await fetch(`${B}/api/humans`, { method: "POST", headers: { "content-type": "application/json", "x-commons": "1" }, body: JSON.stringify({ name }) });
		const j = await r.json().catch(() => ({}));
		assert.equal(r.status, 201, `${name} signs up: ${JSON.stringify(j)}`);
		return { cookie: (r.headers.get("set-cookie") || "").split(";")[0] };
	};
	const call = async (url, { method = "GET", member, body, raw, type } = {}) => {
		const headers = { "x-commons": "1" };
		if (member?.cookie) headers.cookie = member.cookie;
		let payload;
		if (raw !== undefined) { headers["content-type"] = type; payload = raw; } else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
		const r = await fetch(B + url, { method, headers, body: payload, signal: AbortSignal.timeout(20000) });
		const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
		return { r, text, json };
	};
	const mp3 = (n) => Buffer.concat([Buffer.from("ID3"), Buffer.alloc(40, n)]).toString("base64");
	try {
		srv = spawn(process.execPath, [path.join(COMMONS, "server.mjs")], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: "1", COMMONS_NO_SPEND_POLL: "1" }, stdio: ["ignore", "ignore", "pipe"] });
		srv.stderr.on("data", (d) => { stderr = (stderr + d).slice(-4000); });
		let ready = false;
		for (let i = 0; i < 80 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
		assert.ok(ready, `server started. stderr tail: ${stderr}`);

		// signed out: 401, no list
		const anon = await fetch(`${B}/api/videos?by=me`);
		assert.equal(anon.status, 401);
		assert.equal("videos" in (await anon.json()), false);

		const alice = await signup("Video Alice"), bob = await signup("Video Bob");
		const vup = async (m) => { const x = await call("/api/videos", { method: "POST", member: m, raw: Buffer.from("not really a video, a stand-in file"), type: "video/mp4" }); assert.equal(x.r.status, 201, x.text); await sleep(8); return x.json.id; };
		const a1 = await vup(alice), a2 = await vup(alice), b1 = await vup(bob);

		const nob = await call("/api/videos", { member: alice });
		assert.equal(nob.r.status, 400, nob.text);
		const la = await call("/api/videos?by=me", { member: alice });
		assert.equal(la.r.status, 200, la.text);
		assert.deepEqual(la.json.videos.map((v) => v.id), [a2, a1]);
		assert.equal(la.text.includes(b1), false, "Bob's video is not in Alice's list");
		assert.equal(la.text.includes(D), false, "no file path in the response");
		for (const v of la.json.videos) assert.equal(v.url, `/videos/${v.id}`);
		const lb = await call("/api/videos?by=me", { member: bob });
		assert.deepEqual(lb.json.videos.map((v) => v.id), [b1]);
	} finally {
		if (srv) { srv.kill("SIGKILL"); await sleep(100); }
		fs.rmSync(D, { recursive: true, force: true });
	}
});
