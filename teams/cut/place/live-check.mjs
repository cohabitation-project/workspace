// Cohabi Cut: the after-placement live check.
//
//   node teams/cut/place/live-check.mjs https://cohabi.org
//
// Sends NO credentials and starts NO render. Read-only requests:
//   4. the <script src> and stylesheet that the /cut page names, resolved the way a browser resolves them, answer 200
//      with a JavaScript / CSS type (with nosniff, a wrong type means a blank editor). Added beyond the foreman's three.
//   1. GET  /cut                 -> 200 and X-Content-Type-Options: nosniff (the editor is served, safely).
//      One same-origin redirect (/cut -> /cut/) is followed and reported; any other non-200 fails.
//   2. POST /api/cut/render      -> 401 with a JSON body, signed out (the route exists and refuses strangers)
//   3. GET  /cut/cut_<16 zeros>.mp4 -> 404 (a render that does not exist is "not found", never a 200 or a 500)
// One line per check: "PASS <name> <detail>" or "FAIL <name> <detail>". Exit code 1 if any check fails, 2 on bad usage.
//
// A PASS means only what the line says. It does not prove a render works: that needs a signed-in member and ffmpeg
// (route-wire.md's first real run). Redirects are NOT followed: a 301 on /cut is reported as a 301, not as the page.
import { pathToFileURL } from "node:url";

const NONE = "cut_0000000000000000.mp4"; // the shape the route hands out, but never a real render (16 hex digits)

export async function liveCheck(base, { fetchImpl = fetch, timeoutMs = 10000 } = {}) {
	const u = new URL(base);
	if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error(`base must be http(s), got ${u.protocol}`);
	const root = u.origin; // path, query and credentials in the argument are dropped on purpose
	const ask = async (path, init = {}) => {
		const r = await fetchImpl(root + path, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs), ...init, headers: { "x-commons": "1", ...(init.headers || {}) } });
		const text = await r.text();
		return { r, text, nosniff: r.headers.get("x-content-type-options"), type: r.headers.get("content-type") || "", where: r.headers.get("location") };
	};
	const out = [];
	const run = async (name, fn) => {
		try { const [ok, detail] = await fn(); out.push({ name, ok, detail }); }
		catch (e) { out.push({ name, ok: false, detail: `request failed: ${e.name}: ${e.message}` }); }
	};

	let page = null; // the page that /cut ends at, kept for the fourth check
	await run("GET /cut is the editor, with nosniff", async () => {
		let g = await ask("/cut"), via = "", at = "/cut";
		// ONE same-origin redirect is followed (a browser would, and /cut -> /cut/ is normal); it is always reported
		if ([301, 302, 307, 308].includes(g.r.status) && g.where) {
			const t = new URL(g.where, root + "/cut");
			if (t.origin === root) { via = `via ${g.r.status} to ${t.pathname}, `; at = t.pathname + t.search; g = await ask(at); }
		}
		page = { ...g, at };
		const detail = `${via}status ${g.r.status}, content-type ${JSON.stringify(g.type)}, x-content-type-options ${JSON.stringify(g.nosniff)}${g.where ? `, location ${g.where}` : ""}`;
		return [g.r.status === 200 && (g.nosniff || "").toLowerCase() === "nosniff", detail];
	});

	await run("signed-out POST /api/cut/render is 401 JSON", async () => {
		const p = await ask("/api/cut/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId: "vid_0000000000000000", edit: {} }) });
		let json = null; try { json = JSON.parse(p.text); } catch { /* not json */ }
		const isJson = /json/i.test(p.type) && json !== null && typeof json === "object";
		const detail = `status ${p.r.status}, content-type ${JSON.stringify(p.type)}, ${isJson ? `body ${JSON.stringify(json).slice(0, 80)}` : `body is not JSON (${JSON.stringify(p.text.slice(0, 40))})`}`;
		return [p.r.status === 401 && isJson, detail];
	});

	await run("GET /cut/<unknown render> is 404", async () => {
		const g = await ask(`/cut/${NONE}`);
		return [g.r.status === 404, `status ${g.r.status}`];
	});

	await run("the editor's own script and stylesheet load with the right type", async () => {
		if (!page || page.r.status !== 200) return [false, `no page to read (GET /cut ended at ${page ? page.r.status : "no answer"})`];
		// relative references resolve against the URL the page was served from, exactly as a browser does
		const pageUrl = new URL(page.at, root);
		const scripts = [...page.text.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]);
		const sheets = [...page.text.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']|<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']stylesheet["']/gi)].map((m) => m[1] || m[2]);
		if (!scripts.length) return [false, "the page names no <script src>"];
		const rows = [];
		let ok = true;
		for (const [kind, ref, want] of [...scripts.map((x) => ["script", x, /javascript|ecmascript/i]), ...sheets.map((x) => ["css", x, /css/i])]) {
			const target = new URL(ref, pageUrl);
			if (target.origin !== root) { rows.push(`${kind} ${ref} is on another origin`); ok = false; continue; }
			const a = await ask(target.pathname + target.search);
			const good = a.r.status === 200 && want.test(a.type);
			if (!good) ok = false;
			rows.push(`${kind} ${target.pathname} -> ${a.r.status} ${a.type.split(";")[0] || "no type"}${good ? "" : " (wrong)"}`);
		}
		return [ok, rows.join("; ")];
	});

	return out;
}

export const line = (c) => `${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const base = process.argv[2];
	if (!base) { console.error("usage: node live-check.mjs <base url, e.g. https://cohabi.org>"); process.exit(2); }
	let res;
	try { res = await liveCheck(base); } catch (e) { console.error(`live-check: ${e.message}`); process.exit(2); }
	for (const c of res) console.log(line(c));
	const bad = res.filter((c) => !c.ok).length;
	console.log(bad ? `${bad} of ${res.length} checks FAILED for ${base}` : `all ${res.length} checks passed for ${base}`);
	process.exit(bad ? 1 : 0);
}
