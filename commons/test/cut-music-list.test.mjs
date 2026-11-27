// Cut: the editor's music list (Job 4, round 20). GET /api/cut/music lists the signed-in member's OWN uploads, and only those.
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
const cutJs = fs.readFileSync(path.join(COMMONS, "public/cut/cut.js"), "utf8");
const cutHtml = fs.readFileSync(path.join(COMMONS, "public/cut/cut.html"), "utf8");

// 5. Static: the editor asks the route that exists, under the label the member sees.
test("cut.js fetches /api/cut/music, never the missing /api/label/tracks", () => {
	assert.ok(cutJs.includes("fetch('/api/cut/music'"), "loadMusic fetches /api/cut/music");
	assert.equal(cutJs.includes("/api/label/tracks"), false, "the dead URL is gone");
	assert.match(cutHtml, />Choose your music</);
	assert.equal(cutHtml.includes("Choose label music"), false);
});

test("GET /api/cut/music: 401 signed out; own uploads only, newest first, no path; ids work in the render route's music rule", async () => {
	const PORT = await freePort(), B = `http://127.0.0.1:${PORT}`;
	const D = fs.mkdtempSync(path.join(os.tmpdir(), "cut-music-"));
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
		// FFMPEG/FFPROBE point nowhere ON PURPOSE: with a real ffmpeg present the store converts this test's stand-in
		// upload, marks it failed, and the render route's 409 readiness guard (Cut round 42) refuses it before the
		// music rule this test is about. Without ffmpeg, publicVideo reports ready and the music rule is reached.
		srv = spawn(process.execPath, [path.join(COMMONS, "server.mjs")], { env: { ...process.env, FFMPEG: "/nonexistent-ffmpeg", FFPROBE: "/nonexistent-ffprobe", ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: "1", COMMONS_NO_SPEND_POLL: "1" }, stdio: ["ignore", "ignore", "pipe"] });
		srv.stderr.on("data", (d) => { stderr = (stderr + d).slice(-4000); });
		let ready = false;
		for (let i = 0; i < 80 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
		assert.ok(ready, `server started. stderr tail: ${stderr}`);

		// 1. signed out: 401 JSON, and no list (signed-out GET /api/audio?by=me lists everyone's, so this route must check itself)
		const anon = await fetch(`${B}/api/cut/music`);
		assert.equal(anon.status, 401);
		assert.match(anon.headers.get("content-type") || "", /json/);
		const anonJson = await anon.json();
		assert.equal(typeof anonJson.error, "string");
		assert.equal("tracks" in anonJson, false);

		const alice = await signup("Music Alice"), bob = await signup("Music Bob"), empty = await signup("Music Empty");
		const up = async (m, title, n) => { const x = await call("/api/audio", { method: "POST", member: m, body: { data: mp3(n), title } }); assert.equal(x.r.status, 201, x.text); await sleep(8); return x.json; };
		const a1 = await up(alice, "Alice first", 1), a2 = await up(alice, "Alice second", 2), b1 = await up(bob, "Bob only", 3);

		// 2. Alice sees exactly hers, newest first, with exactly {id,title,source}, and no path anywhere in the body
		const la = await call("/api/cut/music", { member: alice });
		assert.equal(la.r.status, 200, la.text);
		assert.deepEqual(la.json.tracks.map((t) => t.id), [a2.id, a1.id]);
		for (const t of la.json.tracks) assert.deepEqual(Object.keys(t).sort(), ["id", "source", "title"]);
		assert.deepEqual(la.json.tracks.map((t) => [t.title, t.source]), [["Alice second", "yours"], ["Alice first", "yours"]]);
		assert.equal(la.text.includes(b1.id), false, "Bob's track is not in Alice's list");
		assert.equal(/path|\.mp3|"ext"|"by"|"bytes"/.test(la.text) || la.text.includes(D), false, "no file path or store field in the response: " + la.text);
		const lb = await call("/api/cut/music", { member: bob });
		assert.deepEqual(lb.json.tracks.map((t) => t.id), [b1.id]);
		// 2b. A signed-in member with no uploads gets the exact empty-list shape, not an error or anyone else's track.
		const le = await call("/api/cut/music", { member: empty });
		assert.equal(le.r.status, 200, le.text);
		assert.deepEqual(le.json, { tracks: [] });
		assert.equal("error" in le.json, false);
		assert.equal([a1.id, a2.id, b1.id].some((id) => le.text.includes(id)), false, "no other member's track is exposed in the empty list");

		// 3. round trip into the render route's music rule (which runs before any probe or ffmpeg):
		//    Bob's video + Alice's track id -> 403 "not yours"; unknown id -> 404; Alice's own id gets past the music check.
		const vup = async (m) => { const x = await call("/api/videos", { method: "POST", member: m, raw: Buffer.from("not really a video, a stand-in file"), type: "video/mp4" }); assert.equal(x.r.status, 201, x.text); return x.json.id; };
		const av = await vup(alice), bv = await vup(bob);
		const edit = (id) => ({ trimStart: 0, trimEnd: 2, coverSec: 1, music: { id, volume: 0.5 } });
		const theirs = await call("/api/cut/render", { method: "POST", member: bob, body: { videoId: bv, edit: edit(a1.id) } });
		assert.equal(theirs.r.status, 403, theirs.text); assert.match(theirs.json.error, /music is not yours/);
		const unknown = await call("/api/cut/render", { method: "POST", member: alice, body: { videoId: av, edit: edit("aud_0000000000000000") } });
		assert.equal(unknown.r.status, 404, unknown.text); assert.match(unknown.json.error, /no such music/);
		const mine = await call("/api/cut/render", { method: "POST", member: alice, body: { videoId: av, edit: edit(a2.id) } });
		assert.ok(![403, 404].includes(mine.r.status) && !/music/.test(mine.json?.error || ""), `Alice's own listed id passes the music check (the stand-in video fails later, never on music): ${mine.r.status} ${mine.text}`);
	} finally {
		if (srv) { srv.kill("SIGKILL"); await sleep(100); }
		fs.rmSync(D, { recursive: true, force: true });
	}
});
