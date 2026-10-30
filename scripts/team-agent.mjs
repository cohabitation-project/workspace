#!/usr/bin/env node
/**
 * team-agent.mjs — a team member's work session, with real tools.
 *
 * Delegation: delegations/team-tools.json (sponsor Geoffrey Cooper Jr., 2026-10-30:
 * "lets get them all the tools they need and yes give them what they need").
 *
 * One session = one kin, one team, up to MAX_STEPS tool calls. The kin reads the mission, its team's
 * brief, ship list, recent standups, the board, and its own memory; picks the next most valuable step;
 * does it with tools; and ends by writing a standup entry (and optionally a memory entry).
 *
 * Tools: web_search, fetch_url, list_files, read_file, write_file (only inside the kin's own team
 * folders), run_python (sandboxed: no API keys, no repo credentials, time-limited), board_request,
 * board_log, finish.
 *
 * Usage:
 *   node scripts/team-agent.mjs --team rnd [--kin GPT] [--steps 14]
 *   node scripts/team-agent.mjs --due            run every team whose schedule says it's due now
 *   node scripts/team-agent.mjs --team rnd --dry-run   build the prompt and print it; call nothing
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
import 'dotenv/config';
import { createTask, appendLog, rebuildBoard } from './board.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const DRY = args.includes('--dry-run');
const MAX_STEPS = parseInt(opt('steps') || process.env.TEAM_MAX_STEPS || '14', 10);
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };
const now = () => new Date().toISOString();
const tail = (s, n) => (s.length > n ? '…' + s.slice(-n) : s);
const MEMORY_FILE = { Claude: 'claude-council', GPT: 'gpt-conference', Gemini: 'gemini', DeepSeek: 'deepseek' };

function active() {
  try { const d = JSON.parse(read('delegations/team-tools.json')); return d.status === 'active' && (!d.dueDate || new Date() <= new Date(d.dueDate + 'T23:59:59Z')); } catch { return false; }
}
const TEAMS = () => JSON.parse(read('teams/teams.json'));
const roster = () => JSON.parse(read('config/agents.json'));

// ---------------------------------------------------------------- tools
const TOOL_DEFS = [
  { name: 'web_search', description: 'Search the web. Returns titles, URLs and snippets. Use fetch_url to read a result.', params: { query: { type: 'string' } }, required: ['query'] },
  { name: 'fetch_url', description: 'Fetch a public web page or file and return its text (HTML stripped, up to ~12k chars). Use offset to read further.', params: { url: { type: 'string' }, offset: { type: 'integer' } }, required: ['url'] },
  { name: 'list_files', description: 'List files under a repository path (recursive, up to 300 entries).', params: { path: { type: 'string' } }, required: ['path'] },
  { name: 'read_file', description: 'Read a repository file (up to ~20k chars from offset).', params: { path: { type: 'string' }, offset: { type: 'integer' } }, required: ['path'] },
  { name: 'write_file', description: "Create or overwrite a file inside your own team folder(s) (teams/<team>/...). Use it for designs, research notes, code, data, models. Everything you write is committed to the public record.", params: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
  { name: 'run_python', description: "Run Python 3 in a sandbox (no API keys, no repo credentials, 120 s limit). numpy and mujoco are installed. The repository is readable at the path in the REPO environment variable (e.g. os.environ['REPO'] + '/teams/rnd/kodama/simulation'). The working directory is a scratch folder that is discarded; print what you need, then save results with write_file.", params: { code: { type: 'string' }, timeout_s: { type: 'integer' } }, required: ['code'] },
  { name: 'board_request', description: 'File a task on the shared board. Set for_assistant=true to ask the Claude assistant seat (it can use a browser while Geoffrey is present, open pull requests on the site repo, and set up infrastructure).', params: { title: { type: 'string' }, details: { type: 'string' }, for_assistant: { type: 'boolean' } }, required: ['title', 'details'] },
  { name: 'board_log', description: 'Add a line to a board task: CLAIM, PLAN: ..., DOING, BLOCKED: ..., DONE: <evidence link>, NOTE: ...', params: { id: { type: 'string' }, line: { type: 'string' } }, required: ['id', 'line'] },
  { name: 'finish', description: 'End your session. Write your standup entry (what you shipped with file links, what is next, what is blocked) and optionally a memory entry for your next self.', params: { shipped: { type: 'string' }, next: { type: 'string' }, blocked: { type: 'string' }, memory: { type: 'string' } }, required: ['shipped', 'next', 'blocked'] },
];

function safeRepoPath(p) {
  const abs = path.resolve(ROOT, String(p || '').replace(/^\/+/, ''));
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) throw new Error('path outside the repository');
  const rel = path.relative(ROOT, abs);
  if (/(^|\/)(\.git|\.env|node_modules)(\/|$)/.test(rel) || /\.env(\.|$)/.test(path.basename(rel))) throw new Error('that path is not readable');
  return { abs, rel };
}

function htmlToText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|p|div|li|h[1-6]|tr)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

async function webSearch(query) {
  // Primary: DuckDuckGo's HTML endpoint (no key). Fallback: OpenRouter's web plugin.
  try {
    const r = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), { headers: { 'User-Agent': 'Mozilla/5.0 (cohabitation-project team agent)' } });
    const html = await r.text();
    const out = []; const rx = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m; while ((m = rx.exec(html)) && out.length < 8) {
      let url = m[1]; const u = url.match(/uddg=([^&]+)/); if (u) url = decodeURIComponent(u[1]);
      out.push(`- ${htmlToText(m[2])}\n  ${url}\n  ${htmlToText(m[3])}`);
    }
    if (out.length) return out.join('\n');
  } catch {}
  const key = process.env.OPENROUTER_API_KEY; if (!key) return 'Search unavailable.';
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/gpt-4.1-mini', plugins: [{ id: 'web', max_results: 6 }], max_tokens: 900, messages: [{ role: 'user', content: `Search the web for: ${query}\nList the most relevant results as: title, URL, one-line snippet. No commentary.` }] }) });
  const j = await r.json(); return j.choices?.[0]?.message?.content || 'No results.';
}

function sandboxPython(code, timeoutS) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kin-py-'));
  fs.writeFileSync(path.join(dir, 'main.py'), code);
  // The sandbox gets a COPY of teams/ and context/ (never .git, never .env), so kin code can read the
  // simulation and team files but can't touch credentials or the real working tree.
  const repo = path.join(dir, 'repo'); for (const d of ['teams', 'context']) if (fs.existsSync(path.join(ROOT, d))) fs.cpSync(path.join(ROOT, d), path.join(repo, d), { recursive: true });
  execSync(`chmod -R a+rwX ${JSON.stringify(dir)}`);
  const env = { PATH: '/usr/local/bin:/usr/bin:/bin', HOME: dir, REPO: repo, PYTHONUNBUFFERED: '1', MPLBACKEND: 'Agg' };
  const py = process.env.TEAM_PYTHON || 'python3';
  let res;
  // Run as an unprivileged user so the code can't read this process's environment (API keys).
  if (process.getuid && process.getuid() === 0) {
    const nobody = parseInt(execSync('id -u nobody').toString(), 10), nogroup = parseInt(execSync('id -g nobody').toString(), 10);
    res = spawnSync(py, ['main.py'], { cwd: dir, env, uid: nobody, gid: nogroup, timeout: timeoutS * 1000, encoding: 'utf8', maxBuffer: 4e6 });
  } else {
    res = spawnSync('sudo', ['-n', '-u', 'nobody', 'env', '-i', ...Object.entries(env).map(([k, v]) => `${k}=${v}`), py, 'main.py'], { cwd: dir, timeout: timeoutS * 1000, encoding: 'utf8', maxBuffer: 4e6 });
  }
  fs.rmSync(dir, { recursive: true, force: true });
  const out = `${res.stdout || ''}${res.stderr ? '\n[stderr]\n' + res.stderr : ''}`;
  return `exit ${res.status ?? 'timeout'}${res.error ? ' (' + res.error.code + ')' : ''}\n${tail(out, 8000)}`;
}

function makeTools(ctx) {
  return {
    web_search: async ({ query }) => webSearch(query),
    fetch_url: async ({ url, offset = 0 }) => {
      const u = new URL(url); if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1)/.test(u.hostname)) throw new Error('only public http(s) URLs');
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (cohabitation-project team agent)' }, redirect: 'follow' });
      const type = r.headers.get('content-type') || ''; const body = await r.text();
      const text = /html/.test(type) ? htmlToText(body) : body;
      return `HTTP ${r.status} · ${type} · ${text.length} chars\n` + text.slice(offset, offset + 12000);
    },
    list_files: async ({ path: p }) => {
      const { abs } = safeRepoPath(p); const out = [];
      const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (out.length >= 300 || /^(\.git|node_modules)$/.test(f.name)) continue; const full = path.join(d, f.name); if (f.isDirectory()) walk(full); else out.push(path.relative(ROOT, full)); } };
      if (fs.statSync(abs).isDirectory()) walk(abs); else out.push(path.relative(ROOT, abs));
      return out.join('\n') || '(empty)';
    },
    read_file: async ({ path: p, offset = 0 }) => { const { abs } = safeRepoPath(p); const t = fs.readFileSync(abs, 'utf8'); return `${t.length} chars\n` + t.slice(offset, offset + 20000); },
    write_file: async ({ path: p, content }) => {
      const { abs, rel } = safeRepoPath(p);
      if (!ctx.teams.some((t) => rel.startsWith(`teams/${t}/`))) throw new Error(`you may write only inside your team folder(s): ${ctx.teams.map((t) => 'teams/' + t + '/').join(', ')}`);
      if (/(^|\/)STANDUP\.md$/.test(rel)) throw new Error('STANDUP.md is append-only; use finish() to add your entry');
      if ((content || '').length > 300000) throw new Error('file too large (300k chars max)');
      fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, content); ctx.written.add(rel);
      return `wrote ${rel} (${content.length} chars)`;
    },
    run_python: async ({ code, timeout_s = 120 }) => sandboxPython(code, Math.min(Math.max(timeout_s, 5), 120)),
    board_request: async ({ title, details, for_assistant }) => { const t = createTask({ title, by: ctx.kin, owner: for_assistant ? 'Claude (assistant seat)' : null, body: details, source: `teams/${ctx.team}/STANDUP.md` }); rebuildBoard(); return `created board task ${t.id}`; },
    board_log: async ({ id, line }) => { const r = appendLog(id, line, ctx.kin, `teams/${ctx.team}/STANDUP.md`); rebuildBoard(); if (!r.ok) throw new Error(r.reason); return `logged ${r.verb} on ${r.file}`; },
  };
}

// ---------------------------------------------------------------- model adapters
async function callModel(agent, system, messages) {
  if (agent.provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.LLM_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: agent.model, system, max_tokens: 8000, messages: messages.anthropic,
        tools: TOOL_DEFS.map((t) => ({ name: t.name, description: t.description, input_schema: { type: 'object', properties: t.params, required: t.required } })) }) });
    const j = await r.json(); if (!r.ok) throw new Error(`Anthropic ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
    messages.anthropic.push({ role: 'assistant', content: j.content });
    return { text: j.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n'), calls: j.content.filter((c) => c.type === 'tool_use').map((c) => ({ id: c.id, name: c.name, args: c.input })), usage: j.usage };
  }
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: agent.model, max_tokens: 6000, messages: [{ role: 'system', content: system }, ...messages.openai],
      tools: TOOL_DEFS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: { type: 'object', properties: t.params, required: t.required } } })) }) });
  const j = await r.json(); if (!r.ok || j.error) throw new Error(`OpenRouter ${r.status}: ${JSON.stringify(j.error || j).slice(0, 300)}`);
  const m = j.choices[0].message; messages.openai.push(m);
  return { text: m.content || '', calls: (m.tool_calls || []).map((c) => { let a = {}; try { a = JSON.parse(c.function.arguments || '{}'); } catch {} return { id: c.id, name: c.function.name, args: a }; }), usage: j.usage };
}
function pushResults(agent, messages, results) {
  if (agent.provider === 'anthropic') messages.anthropic.push({ role: 'user', content: results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.out })) });
  else for (const r of results) messages.openai.push({ role: 'tool', tool_call_id: r.id, content: r.out });
}

// ---------------------------------------------------------------- live feed
// Work is announced in Discord as it happens (Geoffrey 2026-10-30: "I'm not seeing any work being
// done anywhere live"). Uses the same DISCORD_WEBHOOK_URL the morning council posts with.
const GH = 'https://github.com/cohabitation-project/workspace/blob/main/';
async function announce(text) {
  const url = process.env.DISCORD_WEBHOOK_URL; if (!url || DRY) return;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'Team Sessions', content: text.slice(0, 1990), allowed_mentions: { parse: [] } }) }); } catch (e) { console.error('[team-agent] discord:', e.message); }
}

// ---------------------------------------------------------------- session
function memoryOf(kin) { return MEMORY_FILE[kin] ? read(`memory/kin/${MEMORY_FILE[kin]}.md`) : ''; }

function buildSystem(kin, team, teams) {
  const t = (f) => read(`teams/${team}/${f}`);
  return [
    read('context/00-mission.md'),
    `# Who you are\nYou are ${kin.name} (model ${kin.model}), an AI kin on the ${team} team. Your team folders: ${teams.map((x) => 'teams/' + x + '/').join(', ')}. This is a scheduled work session: nobody prompted you. Work, then call finish().`,
    `# Your team's brief\n${t('BRIEF.md')}`,
    `# Your team's 30-day ship list\n${t('SHIPLIST.md')}`,
    `# Recent standups (newest last)\n${tail(t('STANDUP.md'), 6000)}`,
    `# Your memory (your own file)\n${tail(memoryOf(kin.name), 5000) || '(empty)'}`,
    `# The board (shared to-do list)\n${tail(read('board/BOARD.md'), 5000)}`,
    `# How to work this session
- You have up to ${MAX_STEPS} tool calls. Pick the single most valuable next step on your ship list and make real progress on it: produce or improve a file, not a plan about a plan.
- Use web_search and fetch_url for sources; cite URLs in what you write. Use run_python to compute, check numbers, and run simulations. Save results with write_file inside your team folder.
- Label every number: measured, simulated, inferred, or guessed. Never present simulated as demonstrated.
- If you need something you can't do (infrastructure, a browser, a purchase, a human), file it with board_request.
- Before you run out of steps, call finish() with what you shipped (with file paths), what's next, and what's blocked.`,
  ].join('\n\n---\n\n');
}

async function session(teamName, kinName) {
  const agent = roster().find((a) => a.name === kinName);
  if (!agent) throw new Error(`${kinName} is not on the roster`);
  const memberOf = Object.entries(TEAMS()).filter(([, v]) => (v.members || []).includes(kinName)).map(([k]) => k);
  const ctx = { kin: kinName, team: teamName, teams: memberOf.length ? memberOf : [teamName], written: new Set() };
  const system = buildSystem(agent, teamName, ctx.teams);
  const kickoff = `Work session · ${now()} · team ${teamName}. Begin.`;
  if (DRY) { console.log(`--- DRY: ${kinName} on ${teamName} · system ${system.length} chars ---\n${system.slice(0, 1500)}\n…`); return; }

  const logDir = path.join(ROOT, 'teams', teamName, 'sessions'); fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `${now().slice(0, 10)}-${kinName.toLowerCase()}.jsonl`);
  const log = (e) => fs.appendFileSync(logPath, JSON.stringify({ ts: now(), ...e }) + '\n');
  const messages = { openai: [{ role: 'user', content: kickoff }], anthropic: [{ role: 'user', content: kickoff }] };
  const tools = makeTools(ctx);
  let finished = null; let tokens = 0;
  log({ event: 'start', kin: kinName, model: agent.model, team: teamName, max_steps: MAX_STEPS });
  const teamLabel = (TEAMS()[teamName] || {}).name || teamName;
  await announce(`🔨 **${kinName}** started a work session in **${teamLabel}** · ${agent.model} · AI agent`);

  for (let step = 1; step <= MAX_STEPS + 1 && !finished; step++) {
    if (step === MAX_STEPS + 1) {
      const nudge = 'You are out of tool steps. Call finish() now with your standup.';
      if (agent.provider === 'anthropic') messages.anthropic.push({ role: 'user', content: nudge }); else messages.openai.push({ role: 'user', content: nudge });
    }
    let res; try { res = await callModel(agent, system, messages); } catch (e) { log({ event: 'model-error', error: e.message }); break; }
    tokens += (res.usage?.total_tokens || (res.usage?.input_tokens || 0) + (res.usage?.output_tokens || 0));
    if (res.text) log({ event: 'say', text: res.text.slice(0, 4000) });
    if (!res.calls.length) { log({ event: 'no-tool-call' }); if (step > 1) break; else { const n = 'Use your tools to make progress, then call finish().'; if (agent.provider === 'anthropic') messages.anthropic.push({ role: 'user', content: n }); else messages.openai.push({ role: 'user', content: n }); continue; } }
    const results = [];
    for (const c of res.calls) {
      if (c.name === 'finish') { finished = c.args; results.push({ id: c.id, out: 'Session ended.' }); continue; }
      let out; try { out = String(await tools[c.name](c.args || {})); } catch (e) { out = 'ERROR: ' + e.message; }
      log({ event: 'tool', name: c.name, args: JSON.stringify(c.args).slice(0, 600), result: out.slice(0, 600) });
      results.push({ id: c.id, out: out.slice(0, 16000) });
    }
    pushResults(agent, messages, results);
  }

  const f = finished || { shipped: '(session ended without finish())', next: '', blocked: '' };
  const files = [...ctx.written].map((p) => `\`${p}\``).join(', ') || 'none';
  fs.appendFileSync(path.join(ROOT, 'teams', teamName, 'STANDUP.md'),
    `\n## ${now()} · ${kinName} (${agent.model})\n**Shipped:** ${f.shipped}\n**Files written:** ${files}\n**Next:** ${f.next}\n**Blocked:** ${f.blocked}\n_Session log: teams/${teamName}/sessions/${path.basename(logPath)} · ~${tokens} tokens_\n`);
  if (f.memory && MEMORY_FILE[kinName]) {
    fs.appendFileSync(path.join(ROOT, 'memory', 'kin', MEMORY_FILE[kinName] + '.md'), `\n\n## ${now()} · team ${teamName} work session\nSource: teams/${teamName}/STANDUP.md\n\n${String(f.memory).slice(0, 6000)}\n`);
  }
  log({ event: 'end', finished: !!finished, tokens, files: [...ctx.written] });
  const fileLinks = [...ctx.written].map((p) => `<${GH}${p.split('/').map(encodeURIComponent).join('/')}>`).join('\n') || 'none';
  await announce(`✅ **${kinName}** finished in **${teamLabel}**\n**Shipped:** ${String(f.shipped).slice(0, 700)}\n**Next:** ${String(f.next).slice(0, 400)}\n**Blocked:** ${String(f.blocked).slice(0, 200)}\n**Files:**\n${fileLinks}\n_Standup: <${GH}teams/${teamName}/STANDUP.md>_`);
  console.log(`[team-agent] ${kinName} on ${teamName}: ${finished ? 'finished' : 'ended'} · files ${files} · ~${tokens} tokens`);
}

// ---------------------------------------------------------------- scheduling
// teams/schedule.json is the teams' own: sessions_per_day (capped) and which hours (UTC) to wake.
function dueTeams() {
  const sched = JSON.parse(read('teams/schedule.json') || '{}'); const cap = sched.max_sessions_per_team_per_day || 4;
  const hour = new Date().getUTCHours(); const due = [];
  for (const [team, t] of Object.entries(TEAMS())) {
    const s = sched.teams?.[team]; if (!s || !(t.members || []).length) continue;
    if ((s.hours_utc || []).slice(0, cap).includes(hour)) due.push(team);
  }
  return due;
}
function nextMember(team) {
  const members = TEAMS()[team].members.filter((m) => roster().some((a) => a.name === m));
  const st = read(`teams/${team}/STANDUP.md`); const last = [...st.matchAll(/^## \S+ · (\w+) /gm)].map((m) => m[1]).pop();
  const i = members.indexOf(last); return members[(i + 1) % members.length];
}

async function main() {
  if (!active() && !DRY) { console.log('[team-agent] delegations/team-tools.json is not active; nothing to do.'); return; }
  const teamsToRun = args.includes('--due') ? dueTeams() : [opt('team')].filter(Boolean);
  if (!teamsToRun.length) { console.log('[team-agent] no team due this hour.'); return; }
  for (const team of teamsToRun) {
    const kin = opt('kin') || nextMember(team);
    if (!kin) { console.log(`[team-agent] ${team}: no members on the roster`); continue; }
    try { await session(team, kin); } catch (e) { console.error(`[team-agent] ${team}/${kin}: ${e.message}`); }
  }
  rebuildBoard();
}
export { sandboxPython, makeTools };
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main().catch((e) => { console.error(e); process.exit(1); });
