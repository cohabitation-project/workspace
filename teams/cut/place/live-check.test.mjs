// Tests for live-check.mjs. Two layers:
//  1. a tiny fake server (node:http) that answers like a placed Cut, then is broken one way at a time. Needs nothing.
//  2. the REAL commons/server.mjs with route-wire.md's hunk applied to a temp copy (the way cut-route-http.test.mjs does).
//     Runs only where a checkout has commons/server.mjs AND the bundle's commons/lib/cut/route.mjs; elsewhere it SKIPS,
//     and says so in its name. It never changes main's server.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { liveCheck, line } from "./live-check.mjs";

const HERE = import.meta.dirname;
const CLI = path.join(HERE, "live-check.mjs");

// ---- layer 1: a fake placed Cut, and its breakages --------------------------------------------------------------
const GOOD = {
	cut: (res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff" }); res.end('<!doctype html><title>Cut</title><link rel="stylesheet" href="./cut.css"><script type="module" src="./cut.js"></script>'); },
	slash: (res) => { res.writeHead(404, { "x-content-type-options": "nosniff" }); res.end("no"); },
	asset: (res, req) => { const js = req.url === "/cut.js"; res.writeHead(200, { "content-type": js ? "text/javascript; charset=utf-8" : "text/css; charset=utf-8", "x-content-type-options": "nosniff" }); res.end(js ? "export {};" : "body{}"); },
	post: (res) => { res.writeHead(401, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify({ error: "sign in first" })); },
	render: (res) => { res.writeHead(404, { "content-type": "text/plain" }); res.end("Not found"); },
};
async function fake(over = {}) {
	const h = { ...GOOD, ...over }, seen = [];
	const s = http.createServer((req, res) => {
		let body = ""; req.on("data", (d) => { body += d; });
		req.on("end", () => {
			seen.push({ method: req.method, url: req.url, cookie: req.headers.cookie, authorization: req.headers.authorization, body });
			if (req.method === "POST" && req.url === "/api/cut/render") return h.post(res, req);
			if (req.method === "GET" && req.url === "/cut") return h.cut(res, req);
			if (req.method === "GET" && req.url === "/cut/") return h.slash(res, req);
			if (req.method === "GET" && (req.url === "/cut.js" || req.url === "/cut.css")) return h.asset(res, req);
			if (req.method === "GET" && req.url.startsWith("/cut/")) return h.render(res, req);
			res.writeHead(404); res.end("no");
		});
	});
	await new Promise((r) => s.listen(0, "127.0.0.1", r));
	return { base: `http://127.0.0.1:${s.address().port}`, seen, close: () => new Promise((r) => { s.closeAllConnections?.(); s.close(r); }) };
}
const verdicts = (rs) => rs.map((r) => (r.ok ? "P" : "F")).join("");

test("a correctly placed Cut passes all four checks, and the check sends no credentials and starts no render", async () => {
	const f = await fake();
	try {
		const rs = await liveCheck(f.base);
		assert.equal(verdicts(rs), "PPPP", rs.map(line).join("\n"));
		assert.equal(f.seen.length, 5, "/cut, the POST, one unknown render, the script and the stylesheet");
		assert.ok(f.seen.every((s) => !s.cookie && !s.authorization), "no cookie, no authorization header");
		const post = f.seen.find((s) => s.method === "POST");
		assert.deepEqual(JSON.parse(post.body), { videoId: "vid_0000000000000000", edit: {} }, "the POST names a video that cannot exist and carries no edit");
		assert.match(line(rs[0]), /^PASS GET \/cut .*status 200.*nosniff/);
	} finally { await f.close(); }
});

const BREAKS = [
	["/cut has no nosniff", { cut: (res) => { res.writeHead(200, { "content-type": "text/html" }); res.end('<script src="./cut.js"></script>'); } }, "FPPP", /x-content-type-options null/],
	["/cut redirects to /cut/ and /cut/ is a 404 (what the hunk alone does)", { cut: (res) => { res.writeHead(301, { location: "/cut/", "x-content-type-options": "nosniff" }); res.end(); } }, "FPPF", /via 301 to \/cut\/, status 404/],
	["/cut redirects to another site", { cut: (res) => { res.writeHead(302, { location: "https://example.com/cut", "x-content-type-options": "nosniff" }); res.end(); } }, "FPPF", /status 302.*location https:\/\/example.com/],
	["/cut is a 404", { cut: (res) => { res.writeHead(404, { "x-content-type-options": "nosniff" }); res.end("no"); } }, "FPPF", /status 404/],
	["the route is not placed (POST is a 404)", { post: (res) => { res.writeHead(404, { "content-type": "application/json" }); res.end("{}"); } }, "PFPP", /status 404/],
	["a signed-out POST is allowed through (200)", { post: (res) => { res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); } }, "PFPP", /status 200/],
	["the 401 is an HTML page, not JSON", { post: (res) => { res.writeHead(401, { "content-type": "text/html" }); res.end("<h1>no</h1>"); } }, "PFPP", /not JSON/],
	["the 401 says JSON but the body is not", { post: (res) => { res.writeHead(401, { "content-type": "application/json" }); res.end("oops"); } }, "PFPP", /not JSON/],
	["a render that does not exist answers 200", { render: (res) => { res.writeHead(200, { "content-type": "video/mp4" }); res.end("x"); } }, "PPFP", /status 200/],
	["a render that does not exist answers 500", { render: (res) => { res.writeHead(500); res.end("boom"); } }, "PPFP", /status 500/],
	["the script is served as text/html (with nosniff the editor would be blank)", { asset: (res, req) => { const js = req.url === "/cut.js"; res.writeHead(200, { "content-type": js ? "text/html" : "text/css" }); res.end("x"); } }, "PPPF", /script \/cut\.js -> 200 text\/html \(wrong\)/],
	["the stylesheet is a 404", { asset: (res, req) => { if (req.url === "/cut.css") { res.writeHead(404); return res.end("no"); } res.writeHead(200, { "content-type": "text/javascript" }); res.end("x"); } }, "PPPF", /css \/cut\.css -> 404/],
	["the page names no script at all", { cut: (res) => { res.writeHead(200, { "content-type": "text/html", "x-content-type-options": "nosniff" }); res.end("<h1>Cut</h1>"); } }, "PPPF", /no <script src>/],
];
for (const [name, over, want, why] of BREAKS) {
	test(`broken: ${name} -> ${want}`, async () => {
		const f = await fake(over);
		try {
			const rs = await liveCheck(f.base);
			assert.equal(verdicts(rs), want, rs.map(line).join("\n"));
			assert.match(rs.find((r) => !r.ok).detail, why);
		} finally { await f.close(); }
	});
}

test("a server that never answers fails the check in the timeout; a refused connection fails, neither throws", async () => {
	const f = await fake({ cut: () => { /* never answers */ } });
	try {
		const t0 = Date.now();
		const rs = await liveCheck(f.base, { timeoutMs: 400 });
		assert.equal(verdicts(rs), "FPPF");
		assert.match(rs[0].detail, /request failed/);
		assert.match(rs[3].detail, /no page to read/);
		assert.ok(Date.now() - t0 < 5000);
	} finally { await f.close(); }
	const dead = await liveCheck("http://127.0.0.1:1", { timeoutMs: 1000 });
	assert.equal(verdicts(dead), "FFFF");
	assert.ok(dead.slice(0, 3).every((r) => /request failed/.test(r.detail)));
});

test("the base is reduced to its origin; a non-http base is refused; a path or userinfo in the argument is not used", async () => {
	const f = await fake();
	try {
		const u = new URL(f.base);
		const rs = await liveCheck(`http://user:secret@${u.host}/some/path?x=1`);
		assert.equal(verdicts(rs), "PPPP");
		assert.deepEqual(f.seen.map((s) => s.url), ["/cut", "/api/cut/render", "/cut/cut_0000000000000000.mp4", "/cut.js", "/cut.css"]);
		assert.ok(f.seen.every((s) => !s.authorization), "userinfo is not sent as Basic auth");
	} finally { await f.close(); }
	await assert.rejects(() => liveCheck("file:///etc/passwd"), /http/);
	await assert.rejects(() => liveCheck("ftp://example.com"), /http/);
});

test("the CLI: one line per check, exit 0 when all pass, 1 when any fails, 2 with no argument", async () => {
	const good = await fake(), bad = await fake({ post: (res) => { res.writeHead(404); res.end("no"); } });
	const run = (args) => new Promise((resolve) => { const c = spawn(process.execPath, [CLI, ...args], { stdio: ["ignore", "pipe", "pipe"] }); let o = "", e = ""; c.stdout.on("data", (d) => { o += d; }); c.stderr.on("data", (d) => { e += d; }); c.on("close", (code) => resolve({ code, o, e })); });
	try {
		const g = await run([good.base]);
		assert.equal(g.code, 0, g.o + g.e);
		const gl = g.o.trim().split("\n");
		assert.equal(gl.length, 5, "four check lines and one summary");
		assert.ok(gl.slice(0, 4).every((l) => l.startsWith("PASS ")), g.o);
		assert.match(gl[4], /^all 4 checks passed/);
		const b = await run([bad.base]);
		assert.equal(b.code, 1, b.o);
		assert.match(b.o, /^PASS GET \/cut/m);
		assert.match(b.o, /^FAIL signed-out POST/m);
		assert.match(b.o, /1 of 4 checks FAILED/);
		assert.equal((await run([])).code, 2);
		assert.equal((await run(["file:///x"])).code, 2);
	} finally { await good.close(); await bad.close(); }
});

// ---- layer 2: the real server with the hunk -----------------------------------------------------------------------
function findRoot() {
	for (let d = HERE, i = 0; i < 8; i++, d = path.dirname(d)) {
		if (fs.existsSync(path.join(d, "commons/server.mjs")) && fs.existsSync(path.join(d, "commons/lib/cut/route.mjs"))) return d;
	}
	return null;
}
const ROOT = findRoot();
const EDITOR_DIR_ABS = path.resolve(HERE, "..", "editor");
// route-wire.md's hunk (A, B, C, D), as in cut-route-http.test.mjs, with no test injection: nothing here renders.
const HUNK_A = ["import { handleCutRender } from './lib/cut/route.mjs';", "import { makeCutDeps } from './lib/cut/wire.mjs';", "import { sweepRenders } from './lib/cut/cleanup.mjs';"];
const HUNK_B = [
	"const CUT_OUT = path.join(DATA, 'cut'); fs.mkdirSync(CUT_OUT, { recursive: true }); const cutDeps = makeCutDeps({ videos, audio, outDir: CUT_OUT, log: (m) => console.error('[cut]', m) });",
	"const cutSweep = () => sweepRenders(CUT_OUT).catch((e) => console.error('[cut] sweep', e.message)); cutSweep(); setInterval(cutSweep, 3600_000).unref();",
];
const HUNK_C = ["app.post('/api/cut/render', wrap(async (req, res) => { const r = await handleCutRender({ member: houseWriter(req), body: req.body || {}, deps: cutDeps }); res.status(r.status); return r.json; }));"];
const HUNK_D = ["app.use('/cut', express.static(CUT_OUT, { index: false, dotfiles: 'deny', maxAge: '5m' }));"];
function insertAfter(src, anchor, lines) {
	const rows = src.split("\n");
	const at = rows.reduce((a, r, i) => (r.startsWith(anchor) ? [...a, i] : a), []);
	assert.equal(at.length, 1, `anchor ${JSON.stringify(anchor)} appears ${at.length} times`);
	rows.splice(at[0] + 1, 0, ...lines);
	return rows.join("\n");
}
// the candidate fix E: the editor's own folder (cut.html, cut.js, cut.css) mounted at /cut BEFORE the renders mount, with
// cut.html as its index, so /cut -> /cut/ -> the page, and ./cut.js resolves to /cut/cut.js. Same dotfile rule as D.
const hunkE = () => [`app.use('/cut', express.static(${JSON.stringify(EDITOR_DIR_ABS)}, { index: 'cut.html', dotfiles: 'deny', maxAge: '5m' }));`];
const apply = (src, extra) => {
	let s = insertAfter(src, "import * as stock from './lib/stock.mjs';", HUNK_A);
	s = insertAfter(s, "videos.init(DATA);", HUNK_B);
	s = insertAfter(s, "app.delete('/api/videos/:id'", HUNK_C);
	return insertAfter(s, "app.get('/videos/:id/poster.jpg'", extra ? [...hunkE(), ...HUNK_D] : HUNK_D);
};

const EDITOR_DIR = path.join(HERE, "..", "editor");
const realEditor = ["cut.html", "cut.js", "cut.css"].every((f) => fs.existsSync(path.join(EDITOR_DIR, f)));
const realServerTest = (EXTRA) => async () => {
	const COMMONS = path.join(ROOT, "commons");
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cut-live-"));
	const copy = path.join(COMMONS, `server.cut-live-${process.pid}.tmp.mjs`);
	const { freePort } = await import(path.join(COMMONS, "test/lib/port.mjs"));
	const PORT = await freePort(), base = `http://127.0.0.1:${PORT}`;
	let srv, err = "";
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	try {
		fs.writeFileSync(copy, apply(fs.readFileSync(path.join(COMMONS, "server.mjs"), "utf8"), EXTRA));
		srv = spawn(process.execPath, [copy], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: path.join(tmp, "data") }, stdio: ["ignore", "ignore", "pipe"] });
		srv.stderr.on("data", (d) => { err = (err + d).slice(-3000); });
		let ready = false;
		for (let i = 0; i < 80 && !ready; i++) { try { ready = (await fetch(`${base}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
		assert.ok(ready, `the patched server started: ${err}`);
		const rs = await liveCheck(base);
		for (const r of rs) console.log("#   " + line(r));
		assert.equal(rs[1].ok, true, "signed-out POST /api/cut/render is 401 JSON on the real server: " + line(rs[1]));
		assert.equal(rs[2].ok, true, "an unknown render is a 404 on the real server: " + line(rs[2]));
		if (!EXTRA) {
			// PINNED FINDING: route-wire.md's hunk alone mounts the RENDERS directory at /cut with index:false, so /cut
			// redirects to /cut/ and /cut/ is a 404. The editor page is not served. When this assertion starts failing,
			// somebody has added a page route: change it to expect "PPPP".
			assert.equal(verdicts(rs), "FPPF", "the hunk as written does not serve the editor: " + rs.map(line).join(" | "));
			assert.match(rs[0].detail, /via 301 to \/cut\/, status 404/);
		} else {
			assert.equal(verdicts(rs), "PPPP", "with the editor directory mounted at /cut first: " + rs.map(line).join(" | "));
		}
	} finally {
		if (srv) { srv.kill(); await sleep(100); }
		fs.rmSync(copy, { force: true });
		fs.rmSync(tmp, { recursive: true, force: true });
	}
};
const SKIP_WHY = "SKIPPED (no checkout here has commons/server.mjs and commons/lib/cut/route.mjs: copy the bundle over main first)";
test(ROOT ? "REAL server, route-wire.md's hunk as written: 401 and 404 pass; /cut is NOT the editor (301 to /cut/, then 404): FPPF pinned" : SKIP_WHY, { skip: !ROOT }, realServerTest(false));
test(ROOT ? "REAL server, hunk + the editor folder mounted at /cut before the renders mount: all four pass (the candidate fix)" : SKIP_WHY, { skip: !ROOT || !realEditor }, realServerTest(true));
