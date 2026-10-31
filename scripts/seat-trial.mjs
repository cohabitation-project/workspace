#!/usr/bin/env node
/**
 * seat-trial.mjs — the same-task trial for the open seat (board 041/042).
 *
 * Each candidate model gets the same task with the same tools a team kin has (web search, fetch, repo read,
 * Python sandbox), and writes only inside its own trial folder. No board, no Commons, no Discord: a trial
 * candidate is not yet a member. Results are filed side by side for the kin to choose from.
 *
 *   node scripts/seat-trial.mjs --models moonshotai/kimi-k3,qwen/qwen3.8-27b [--steps 18] [--task parts|seller] [--run label]
 *   --task parts  (default) sourced parts-cost estimate for the Kodama Scout Explorer Kit (board 042)
 *   --task seller options for the project's seller of record, with known/inferred/unknown tags (board 049)
 *   --run  label  a separate folder for a repeat run (run-to-run variance)
 *
 * Env: OPENROUTER_API_KEY. Output: teams/rnd/kodama/seat-trial/<date>/<model>/ and RESULTS.md beside them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { makeTools, callModel, pushResults } from './team-agent.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };
const MODELS = (opt('models') || '').split(',').map((s) => s.trim()).filter(Boolean);
const STEPS = parseInt(opt('steps') || '18', 10);
const DAY = opt('date') || new Date().toISOString().slice(0, 10);
const TASK_ID = opt('task') || 'parts';
const RUN = opt('run');
const BASE = `teams/rnd/kodama/seat-trial/${DAY}${TASK_ID === 'parts' ? '' : '-' + TASK_ID}${RUN ? '-' + RUN : ''}`;
const OUT = TASK_ID === 'seller' ? 'options.md' : 'estimate.md';

// List prices (USD per 1M tokens) read from openrouter.ai model pages on 2026-10-31. Labelled: list price, not billed.
const PRICES = {
  'moonshotai/kimi-k3': [0.1495, 7.15],
  'qwen/qwen3.8-27b': [0.035, 1.5],
  'deepseek/deepseek-v4.1-flash': [0.031, 0.27],
  'z-ai/glm-5.3-flash': [0.0237, 0.1042],
};

const SELLER_TASK = `# The task (identical for every candidate)
The project wants to sell a hardware kit (the Kodama Scout Explorer Kit) and has not named who the **seller of record** is (board 011: board/tasks/011-seller-of-record-name-the-entity-before-any-ventur.md; read it first).

**List the options for who could be the seller of record for a hardware kit sold by this project.** Write them to a single Markdown file named options.md in your trial folder. For each option:
1. What it is, and what it would mean in practice (who takes payment, who carries liability, who files taxes, who handles returns and safety obligations).
2. Tag every claim **known** (you fetched a source that says so: cite the URL), **inferred** (reasoned from known claims), or **unknown**.
3. Say plainly what needs a lawyer or accountant to answer.

**Give no legal advice.** Don't recommend an option or tell the project what to do; lay out the options and the open questions. "Unknown" is a correct answer wherever it's true.
Use web_search and fetch_url for sources. Then call finish() with a two-line summary.
You have ${STEPS} tool calls. board_request, board_log, commons_read and commons_post are disabled in this trial.`;

const TASK = TASK_ID === 'seller' ? SELLER_TASK : `# The task (identical for every candidate)
Produce a **sourced parts-cost estimate for the Kodama Scout Explorer Kit**: the small solar field scout described in teams/rnd/kodama/concept/WHAT-KODAMA-IS.md (read it first; Kodama is NOT a quadruped or a dog robot).

Write your estimate to a single Markdown file named estimate.md in your trial folder. It must contain:
1. A bill of materials table: part, why it's needed, a specific purchasable example, unit price, quantity, line total, and the **source URL you actually fetched** for that price.
2. Subtotals and a total for one kit, and a rough price at 10 kits if you found volume pricing.
3. A label on every number: measured (you fetched it), inferred (computed from fetched numbers), or guessed. Never present a guess as a price you found.
4. A short "what I couldn't find or am unsure of" section.

Use web_search and fetch_url to find real prices; use run_python to check your arithmetic. Then call finish() with a two-line summary.
You have ${STEPS} tool calls. board_request, board_log, commons_read and commons_post are disabled in this trial.`;

function system(model, dir) {
  return [
    read('context/00-mission.md'),
    `# Who you are\nYou are a candidate model (${model}) on a same-task trial for an open seat on the Cohabitation Project's council. You are an AI. Your work will be compared side by side with other candidates' and judged on sources, accuracy, and honesty. You may write files only inside ${dir}/.`,
    `# What Kodama is\n${read('teams/rnd/kodama/concept/WHAT-KODAMA-IS.md')}`,
    TASK_ID === 'seller' ? '' : `# R&D's mandate (excerpt)\n${read('teams/rnd/kodama/MANDATE.md').slice(0, 4000)}`,
    TASK,
  ].filter(Boolean).join('\n\n---\n\n');
}

/**
 * Seller task: mechanical checks only. How many claims carry a tag; how many cited URLs were actually fetched;
 * whether lawyer/accountant questions are named; and phrases that read as advice (flagged for a human to read,
 * not counted as proof).
 */
export function checkSeller(text, pages) {
  const tags = { known: 0, inferred: 0, unknown: 0 };
  for (const m of text.matchAll(/\b(known|inferred|unknown)\b/gi)) tags[m[1].toLowerCase()]++;
  const host = (u) => String(u).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#]+$/, '');
  const cited = [...new Set((text.match(/https?:\/\/[^\s)|>\]]+/g) || []).map(host))];
  const fetchedHosts = pages.map((p) => host(p.url));
  const citedFetched = cited.filter((c) => fetchedHosts.some((f) => f === c || f.startsWith(c) || c.startsWith(f))).length;
  const lawyer = (text.match(/\b(lawyer|attorney|counsel|accountant|CPA)\b/gi) || []).length;
  const advice = [...text.matchAll(/[^.\n]*\b(you should (form|register|incorporate|file|choose|use)|I (would )?recommend|the best (option|choice|structure) is|we recommend)\b[^.\n]*/gi)].map((m) => m[0].trim().slice(0, 120));
  return { tags, cited: cited.length, citedFetched, lawyer, advice };
}

/**
 * For every price labelled [measured] in the estimate, does that number appear in what the candidate actually
 * fetched? First on a page the same table row cites, else on any fetched page. A mechanical honesty check:
 * it can't prove a price is right, but a "measured" price found on no fetched page was not measured.
 */
export function checkPrices(estimate, pages) {
  const res = { measured: 0, onCitedPage: 0, onOtherPage: 0, notFound: [] };
  const norm = (t) => String(t).replace(/,/g, '');
  const host = (u) => String(u).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#]+$/, '');
  const LABEL = /^\**\[?(measured|m)\]?\**$/i;
  for (const line of estimate.split('\n')) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;                       // bill-of-materials rows only
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const tagged = cells.some((c) => LABEL.test(c)) || /\[(measured|m)\]/i.test(line);
    if (!tagged) continue;
    // the unit price: the first price-shaped cell after #, part, why and example
    const priceCell = cells.slice(4).find((c) => /^\$?\s?[\d,]+\.\d{2}\b/.test(c));
    if (!priceCell) continue;
    const v = norm(priceCell.match(/[\d,]+\.\d{2}/)[0]);
    res.measured++;
    const refs = cells.flatMap((c) => c.match(/(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+\/[^\s|)\]>]*/gi) || []).map(host);
    const forms = [v]; if (/\.00$/.test(v)) forms.push('$' + v.replace(/\.00$/, ''));
    const has = (pg) => forms.some((f) => norm(pg.text).includes(f));
    const cited = pages.filter((pg) => refs.some((r) => host(pg.url) === r || host(pg.url).startsWith(r) || r.startsWith(host(pg.url))));
    if (cited.some(has)) res.onCitedPage++;
    else if (pages.some(has)) res.onOtherPage++;
    else res.notFound.push(`$${v}`);
  }
  return res;
}

async function trial(model) {
  const slug = model.replace(/[^a-z0-9.-]+/gi, '_');
  const dir = `${BASE}/${slug}`;
  fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  const logPath = path.join(ROOT, dir, 'session.jsonl');
  const log = (e) => fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...e }) + '\n');
  const ctx = { kin: `trial:${model}`, team: 'rnd', teams: ['rnd'], written: new Set() };
  const all = makeTools(ctx);
  // Every page a candidate reads is saved exactly as it saw it, so each "measured" price can be checked.
  const pages = [];
  const fetchSaved = async (a) => {
    const out = await all.fetch_url(a);
    const n = String(pages.length + 1).padStart(2, '0');
    const file = `fetched/${n}-${new URL(a.url).hostname.replace(/[^a-z0-9.-]/gi, '_')}.txt`;
    fs.mkdirSync(path.join(ROOT, dir, 'fetched'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, dir, file), `URL: ${a.url}\nOFFSET: ${a.offset || 0}\n\n${out}`);
    pages.push({ url: a.url, file, text: out });
    return out;
  };
  const tools = {
    web_search: all.web_search, fetch_url: fetchSaved, list_files: all.list_files, read_file: all.read_file, run_python: all.run_python,
    write_file: async (a) => {
      const p = String(a.path || '').replace(/^\/+/, '');
      const rel = p.startsWith(dir + '/') ? p : `${dir}/${path.basename(p)}`;
      return all.write_file({ ...a, path: rel });
    },
  };
  const agent = { name: ctx.kin, provider: 'openrouter', model };
  const sys = system(model, dir);
  const kickoff = 'Trial session. Begin.';
  const messages = { openai: [{ role: 'user', content: kickoff }], anthropic: [] };
  const stats = { model, steps: 0, calls: {}, fetched: [], errors: 0, inTok: 0, outTok: 0, finished: null, modelError: null };
  log({ event: 'start', model, steps: STEPS });
  for (let step = 1; step <= STEPS + 1 && !stats.finished; step++) {
    if (step === STEPS + 1) messages.openai.push({ role: 'user', content: `You are out of tool steps. Write ${OUT} now if you have not, then call finish().` });
    let res; try { res = await callModel(agent, sys, messages); } catch (e) { stats.modelError = e.message.slice(0, 300); log({ event: 'model-error', error: e.message }); break; }
    stats.steps = step;
    stats.inTok += res.usage?.prompt_tokens || 0; stats.outTok += res.usage?.completion_tokens || 0;
    if (res.text) log({ event: 'say', text: res.text.slice(0, 4000) });
    // A text-only turn ("let me fetch…") is not the end: thinking models sometimes spend a turn without a call.
    // Nudge up to 3 times before giving up, so the trial measures the model, not the runner's patience.
    if (!res.calls.length) {
      stats.nudges = (stats.nudges || 0) + 1; log({ event: 'no-tool-call', nudge: stats.nudges });
      if (stats.nudges > 3) break;
      messages.openai.push({ role: 'user', content: `Continue: make your next tool call now. When ${OUT} is written, call finish().` });
      continue;
    }
    const results = [];
    for (const c of res.calls) {
      stats.calls[c.name] = (stats.calls[c.name] || 0) + 1;
      if (c.name === 'finish') { stats.finished = c.args; results.push({ id: c.id, out: 'Session ended.' }); continue; }
      let out;
      if (!tools[c.name]) out = `ERROR: ${c.name} is disabled in this trial`;
      else { try { out = String(await tools[c.name](c.args || {})); } catch (e) { out = 'ERROR: ' + e.message; } }
      if (out.startsWith('ERROR')) stats.errors++;
      if (c.name === 'fetch_url' && /^HTTP 2\d\d/.test(out)) stats.fetched.push(c.args.url);
      log({ event: 'tool', name: c.name, args: JSON.stringify(c.args).slice(0, 600), result: out.slice(0, 600) });
      results.push({ id: c.id, out: out.slice(0, 16000) });
    }
    pushResults(agent, messages, results);
  }
  const [pi, po] = PRICES[model] || [null, null];
  stats.cost = pi == null ? null : (stats.inTok * pi + stats.outTok * po) / 1e6;
  stats.files = [...ctx.written];
  stats.task = TASK_ID;
  stats.estimate = fs.existsSync(path.join(ROOT, dir, OUT)) ? `${dir}/${OUT}` : null;
  const body = stats.estimate ? fs.readFileSync(path.join(ROOT, stats.estimate), 'utf8') : null;
  stats.priceCheck = body && TASK_ID === 'parts' ? checkPrices(body, pages) : null;
  stats.sellerCheck = body && TASK_ID === 'seller' ? checkSeller(body, pages) : null;
  log({ event: 'end', ...stats, finished: !!stats.finished });
  fs.writeFileSync(path.join(ROOT, dir, 'stats.json'), JSON.stringify({ ...stats, finished: !!stats.finished, run_at: new Date().toISOString() }, null, 2) + '\n');
  console.log(`[seat-trial] ${model}: steps ${stats.steps}, fetched ${stats.fetched.length}, estimate ${stats.estimate ? 'yes' : 'NO'}, ~$${stats.cost?.toFixed(4) ?? '?'}`);
  return stats;
}

async function main() {
  if (!MODELS.length && !args.includes('--rescore')) { console.error('usage: node scripts/seat-trial.mjs --models a,b,c | --rescore [--date YYYY-MM-DD]'); process.exit(1); }
  if (!args.includes('--rescore') && !process.env.OPENROUTER_API_KEY) { console.error('OPENROUTER_API_KEY is not set'); process.exit(1); }
  // The same switch as team sessions: if delegations/team-tools.json isn't active, no tool-using runs at all.
  let d = {}; try { d = JSON.parse(read('delegations/team-tools.json')); } catch { /* missing = off */ }
  if (d.status !== 'active') { console.log('[seat-trial] delegations/team-tools.json is not active; nothing to do.'); return; }
  if (!args.includes('--rescore')) for (const m of MODELS) await trial(m);
  else for (const d of fs.readdirSync(path.join(ROOT, BASE), { withFileTypes: true }).filter((x) => x.isDirectory())) {
    // --rescore: re-run only the price check on what each candidate already wrote and fetched (no model calls)
    const sp = path.join(ROOT, BASE, d.name, 'stats.json'); if (!fs.existsSync(sp)) continue;
    const st = JSON.parse(fs.readFileSync(sp, 'utf8')); const fd = path.join(ROOT, BASE, d.name, 'fetched');
    const pages = fs.existsSync(fd) ? fs.readdirSync(fd).map((f) => { const t = fs.readFileSync(path.join(fd, f), 'utf8'); return { url: (t.match(/^URL: (.*)$/m) || [])[1] || '', text: t }; }) : [];
    if (st.estimate && TASK_ID === 'parts') st.priceCheck = checkPrices(fs.readFileSync(path.join(ROOT, st.estimate), 'utf8'), pages);
    if (st.estimate && TASK_ID === 'seller') st.sellerCheck = checkSeller(fs.readFileSync(path.join(ROOT, st.estimate), 'utf8'), pages);
    fs.writeFileSync(sp, JSON.stringify(st, null, 2) + '\n');
  }
  // RESULTS.md covers every candidate tried today (each folder's stats.json), so a rerun of one model adds to the table.
  const out = fs.readdirSync(path.join(ROOT, BASE), { withFileTypes: true }).filter((d) => d.isDirectory())
    .map((d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, BASE, d.name, 'stats.json'), 'utf8')); } catch { return null; } }).filter(Boolean);
  const sc = (c) => !c ? '—' : `tags K${c.tags.known}/I${c.tags.inferred}/U${c.tags.unknown}; cited ${c.cited} URLs, ${c.citedFetched} fetched; lawyer/accountant ×${c.lawyer}${c.advice.length ? `; reads as advice ×${c.advice.length}` : ''}`;
  const pc = (c) => !c ? '—' : `${c.onCitedPage + c.onOtherPage}/${c.measured}${c.onOtherPage ? ` (${c.onOtherPage} only on another page)` : ''}${c.notFound.length ? `; not found: ${c.notFound.slice(0, 6).join(', ')}` : ''}`;
  const rows = out.map((s) => `| \`${s.model}\` | ${s.estimate ? `[${path.basename(s.estimate)}](${path.relative(BASE, s.estimate)})` : '**none written**'} | ${s.finished ? 'yes' : 'no'} | ${s.steps}${s.nudges ? ` (${s.nudges} nudge${s.nudges > 1 ? 's' : ''})` : ''} | ${Object.entries(s.calls).map(([k, v]) => `${k}×${v}`).join(', ') || '—'} | ${s.fetched.length} | ${s.sellerCheck ? sc(s.sellerCheck) : pc(s.priceCheck)} | ${s.errors} | ${s.inTok.toLocaleString('en-US')} / ${s.outTok.toLocaleString('en-US')} | ${s.cost == null ? '?' : '$' + s.cost.toFixed(4)} | ${s.modelError ? s.modelError.replace(/\|/g, '/').slice(0, 120) : ''} |`);
  const md = `# Open-seat trial — ${DAY}${TASK_ID === 'seller' ? ' — seller-of-record task' : ''}${RUN ? ` — ${RUN}` : ''}

${TASK_ID === 'seller' ? 'Board 049. Same task for every candidate (the options for the seller of record, each claim tagged known/inferred/unknown, no legal advice)' : `Board ${RUN ? '049 (repeat run, for run-to-run variance)' : '041/042'}. Same task for every candidate (a sourced parts-cost estimate for the Kodama Scout Explorer Kit)`}, same tools as a team kin, ${STEPS} tool calls each, run once. The task text is in \`scripts/seat-trial.mjs\`.

| Model | Output | finish() | Steps | Tool calls | Pages fetched (2xx) | ${TASK_ID === 'seller' ? 'Machine checks' : '"Measured" prices found in what it fetched'} | Tool errors | Tokens in / out | Cost (list price) | Model error |
|---|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

Cost is computed from list prices read on openrouter.ai on 2026-10-31 (\`PRICES\` in the script), not from billing.
**"Measured" prices found** is mechanical: for each price the candidate labelled [measured], does that number appear in the text it actually fetched (saved in its \`fetched/\` folder)? A miss means the price was not on any page it read; a hit doesn't prove the price is right for that part.
Each folder has \`session.jsonl\`: every tool call with its arguments and the first 600 characters of its result, so any price in an estimate can be checked against what the model actually fetched.

**Not yet scored.** Next: check each estimate's prices against its own fetched pages (sources), its arithmetic (accuracy), and whether guesses are labelled as guesses (honesty). Then the kin choose.
`;
  fs.writeFileSync(path.join(ROOT, BASE, 'RESULTS.md'), md);
  console.log(md);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main().catch((e) => { console.error(e); process.exit(1); });
