// Server-free contract check: the phone editor's Export POST body versus the
// /api/cut/render wiring and handleCutRender's actual body reads.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const cut = read("public/cut/cut.js");
const server = read("server.mjs");
const route = read("lib/cut/route.mjs");

function objectKeys(source) {
	return source.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
		assert.ok(!part.startsWith("..."), `a spread in the Export body needs an explicit contract check: ${part}`);
		const match = /^([A-Za-z_$][\w$]*)\s*(?::|$)/.exec(part);
		assert.ok(match, `cannot identify the Export body key in: ${part}`);
		return match[1];
	}).sort();
}

function sentBodyKeys(source) {
	const marker = "fetch('/api/cut/render'";
	const at = source.indexOf(marker);
	assert.notEqual(at, -1, "the editor must POST to /api/cut/render");
	assert.equal(source.indexOf(marker, at + marker.length), -1, "there must be one Export render call");
	const body = /\bbody\s*:\s*JSON\.stringify\(\s*\{([^{}]*)\}\s*\)/.exec(source.slice(at));
	assert.ok(body, "the Export call must use a literal JSON object whose top-level keys can be audited");
	return objectKeys(body[1]);
}

function readBodyKeys(source) {
	const keys = new Set();
	for (const match of source.matchAll(/\bbody\s*\.\s*([A-Za-z_$][\w$]*)/g)) keys.add(match[1]);
	for (const match of source.matchAll(/\bbody\s*\[\s*['"]([^'"]+)['"]\s*\]/g)) keys.add(match[1]);
	for (const match of source.matchAll(/\bconst\s*\{([^}]+)\}\s*=\s*body\s*;/g)) {
		for (const key of objectKeys(match[1])) keys.add(key);
	}
	return [...keys].sort();
}

function compare(cutSource, routeSource) {
	const sent = sentBodyKeys(cutSource);
	const read = readBodyKeys(routeSource);
	return { sent, read, ignored: sent.filter((key) => !read.includes(key)) };
}

test("every top-level key in the editor's Export body is read by the render handler", () => {
	const contract = compare(cut, route);
	assert.deepEqual(contract.sent, ["edit", "videoId"]);
	assert.deepEqual(contract.read, ["edit", "musicId", "videoId"]);
	assert.deepEqual(contract.ignored, [], "the browser must not send a key the handler silently ignores");
	// musicId is an optional alias for other callers, not a missing browser field:
	// the editor supplies its music choice as edit.music.id and the route falls back to it.
	const musicId = /const\s+musicId\s*=\s*([^;]+);/.exec(route);
	assert.ok(musicId, "the route must derive its optional music id");
	assert.match(musicId[1], /body\.musicId\s*\?\?/);
	assert.match(musicId[1], /edit\.music\.id/);
});

test("the server forwards the parsed request body without renaming or dropping keys", () => {
	assert.equal(server.split("app.post('/api/cut/render'").length - 1, 1);
	assert.match(server, /app\.post\('\/api\/cut\/render'[\s\S]*?handleCutRender\(\{\s*member:\s*houseWriter\(req\),\s*body:\s*req\.body\s*\|\|\s*\{\},\s*deps:\s*cutDeps\s*\}\)/);
});

test("the complete edit object reaches the render job; no nested edit keys are picked off", () => {
	assert.match(route, /const\s*\{\s*videoId,\s*edit\s*\}\s*=\s*body\s*;/);
	assert.match(route, /const\s+job\s*=\s*\{\s*edit,/);
	assert.match(route, /deps\.renderJob\(job\)\s*:\s*renderEditJob\(job\)/);
});

test("the comparison detects a future browser key that the route does not read", () => {
	const mutant = cut.replace(
		"JSON.stringify({ videoId, edit })",
		"JSON.stringify({ videoId, edit, ignoredByRoute })",
	);
	assert.notEqual(mutant, cut, "the source anchor used by the mutant check must still exist");
	assert.deepEqual(compare(mutant, route).ignored, ["ignoredByRoute"]);
});
