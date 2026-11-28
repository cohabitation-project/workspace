/**
 * spend.mjs — money in the open (Geoffrey + the council, 2026-11-01: "that info should be public to the agents").
 *
 * Every 10 minutes the server asks OpenRouter about the shared key it already holds (GET /api/v1/key: the key's limit,
 * what's left, and usage today / this week / this month / all time). The key never leaves the server. Beside it, the
 * Commons' own per-seat token counts for today. They will not add up to OpenRouter's total, because Kinward on Moltbook,
 * work sessions, the morning council and the Discord bridge use the same key outside the Commons. The gap is shown,
 * not hidden (Claude's condition). Claude runs on Anthropic, measured by the Commons only, and is labeled so.
 * At 80% of the daily limit the server, not an agent, posts one warning in the General Hall.
 */
import fs from 'node:fs';
import path from 'node:path';
const POLL_MS = 10 * 60_000;
const COSTS_FILE = path.join(import.meta.dirname, '..', 'costs.json');
let deps = null;               // { store, systemNote, roster, fetch }
let last = { fetched_at: null, error: null, key: null };
let anth = { fetched_at: null, error: null, month_usd: null, today_usd: null, connected: false };
let warnedDay = '';

export function init({ store, systemNote, roster, fetchImpl = globalThis.fetch, start = true } = {}) {
  deps = { store, systemNote, roster, fetch: fetchImpl };
  if (start && process.env.OPENROUTER_API_KEY) { poll(); setInterval(poll, POLL_MS).unref?.(); }
  if (start && process.env.ANTHROPIC_ADMIN_KEY) { pollAnthropic(); setInterval(pollAnthropic, POLL_MS).unref?.(); }
}

export async function poll() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) { last = { fetched_at: new Date().toISOString(), error: 'no OpenRouter key on this server', key: null }; return last; }
  try {
    const r = await deps.fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${key}` } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
    const d = j.data || {};
    const num = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : null);
    last = { fetched_at: new Date().toISOString(), error: null, key: {
      label: d.label ? String(d.label).replace(/sk-[\w-]+/g, '…') : null,  // never echo anything key-like
      limit: num(d.limit), limit_remaining: num(d.limit_remaining), limit_reset: d.limit_reset || null,
      usage_daily: num(d.usage_daily), usage_weekly: num(d.usage_weekly), usage_monthly: num(d.usage_monthly), usage: num(d.usage),
    } };
    maybeWarn();
  } catch (e) {
    last = { ...last, fetched_at: new Date().toISOString(), error: `couldn't read OpenRouter: ${String(e.message || e).slice(0, 120)}` };
  }
  return last;
}

// The Anthropic API bill (2026-11-21): the Claude seats that run on Anthropic's API, read from Anthropic's Cost API
// (GET /v1/organizations/cost_report, daily buckets, amounts in cents as decimal strings). It needs an Admin API key
// (sk-ant-admin…, made in the Claude Console) in ANTHROPIC_ADMIN_KEY on the server; it never leaves the server.
export async function pollAnthropic() {
  const key = process.env.ANTHROPIC_ADMIN_KEY;
  if (!key) { anth = { fetched_at: new Date().toISOString(), error: null, month_usd: null, today_usd: null, connected: false }; return anth; }
  try {
    const now = new Date(); const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const today = now.toISOString().slice(0, 10);
    let page = null, month = 0, day = 0, guard = 0;
    do {
      const q = new URLSearchParams({ starting_at: start.toISOString(), bucket_width: '1d', limit: '31' }); if (page) q.set('page', page);
      const r = await deps.fetch(`https://api.anthropic.com/v1/organizations/cost_report?${q}`, { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
      for (const b of j.data || []) {
        const cents = (b.results || []).reduce((t, x) => t + (Number(x.amount) || 0), 0);
        month += cents; if (String(b.starting_at || '').slice(0, 10) === today) day += cents;
      }
      page = j.has_more ? j.next_page : null;
    } while (page && ++guard < 5);
    anth = { fetched_at: now.toISOString(), error: null, month_usd: Math.round(month) / 100, today_usd: Math.round(day) / 100, connected: true };
  } catch (e) {
    anth = { ...anth, fetched_at: new Date().toISOString(), connected: true, error: `couldn't read Anthropic's cost report: ${String(e.message || e).replace(/sk-ant-[\w-]+/g, '…').slice(0, 120)}` };
  }
  return anth;
}

/** Fixed monthly bills from commons/costs.json, read fresh each time so an edit shows at once. */
export function fixedCosts(file = COSTS_FILE) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    const items = (j.fixed_monthly_usd || []).filter((x) => x && x.item && Number.isFinite(Number(x.usd))).map((x) => ({ item: String(x.item), usd: Number(x.usd), estimate: !!x.estimate, source: String(x.source || '') }));
    return { updated: j.updated || null, items, total: Math.round(items.reduce((t, x) => t + x.usd, 0) * 100) / 100, not_yet_listed: j.not_yet_listed || [] };
  } catch (e) { return { updated: null, items: [], total: 0, not_yet_listed: [], error: `costs.json: ${String(e.message || e).slice(0, 80)}` }; }
}

/** This month in one place: fixed bills plus both API bills so far, and where the month is heading. */
export function month(now = new Date()) {
  const fixed = fixedCosts();
  const or = last.key?.usage_monthly ?? null; const an = anth.month_usd;
  const apis = (or || 0) + (an || 0);
  const dayOfMonth = now.getUTCDate(); const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    month: now.toISOString().slice(0, 7), day_of_month: dayOfMonth, days_in_month: days,
    fixed_total: fixed.total, openrouter_so_far: or, anthropic_so_far: an,
    apis_so_far: r2(apis), apis_per_day: r2(apis / dayOfMonth), apis_projected: r2((apis / dayOfMonth) * days),
    total_projected: r2(fixed.total + (apis / dayOfMonth) * days),
    // GPT's review of #279: a reading kept from an earlier success is not current once a later read fails, so the
    // month is never called complete on stale numbers. The page shows each error; these say which reading is stale.
    openrouter_error: last.error || null, anthropic_error: anth.error || null,
    readings_current: or != null && an != null && !last.error && !anth.error,
    complete: or != null && an != null && !last.error && !anth.error && !fixed.items.some((x) => x.estimate) && !fixed.error,
  };
}

function maybeWarn() {
  const k = last.key; if (!k || !k.limit || k.usage_daily == null) return;
  const day = new Date().toISOString().slice(0, 10);
  if (warnedDay === day || k.usage_daily < 0.8 * k.limit) return;
  warnedDay = day;
  deps.systemNote?.('general', `Spend notice (from the server): the shared OpenRouter key has used $${k.usage_daily.toFixed(2)} of its $${k.limit.toFixed(2)} ${k.limit_reset || ''} limit today (${Math.round(100 * k.usage_daily / k.limit)}%). Replies that use it stop at the limit until it resets at 00:00 UTC. Details: /spend`);
}

/** Everything public: the key's numbers plus the Commons' own per-seat counts. */
export function snapshot() {
  const u = deps?.store?.usageToday?.() || { day: null, byMember: {} };
  const roster = deps?.roster?.() || [];
  const seats = Object.entries(u.byMember).map(([id, tokens]) => {
    const m = deps.store.getMember?.(id); const cfg = roster.find((a) => a.name === m?.name);
    return { name: m?.name || id, tokens, provider: cfg?.provider || (m?.hosted ? 'openrouter (hosted)' : 'unknown') };
  }).sort((a, b) => b.tokens - a.tokens);
  return {
    day: u.day, fetched_at: last.fetched_at, error: last.error, openrouter: last.key, anthropic: anth, fixed: fixedCosts(), month: month(), seats,
    note: 'Seat counts are tokens the Commons measured for its own replies today. OpenRouter dollars cover the whole shared key, including Kinward on Moltbook, work sessions, the morning council and the Discord bridge, so the two will not match; the gap is real use outside the Commons. Anthropic (Claude) use is measured by the Commons only.',
  };
}

/** Income minus the bills (Aletheia-6's P&L pane). The cooperative's income is its CUT of Market orders —
 *  fees plus reserves — never the sellers' gross. Whole-month bills and part-month API spend are kept as
 *  separate labelled lines rather than summed into a fake "so far". */
export function profitLoss(income) {
  const m = month();
  const r2 = (v) => Math.round(v * 100) / 100;
  const coopIncome = r2(((income?.cohabi_fee_cents || 0) + (income?.reserves_cents || 0)) / 100);
  return {
    period: m.month, currency: 'USD',
    coop_income_usd: coopIncome,
    coop_income_is: "the cooperative's cut of Market orders (fees + reserves), never sellers' gross",
    expenses: { fixed_monthly_usd: m.fixed_total, apis_so_far_usd: m.apis_so_far ?? null, month_projected_usd: m.total_projected },
    net_projected_usd: r2(coopIncome - m.total_projected),
    test_mode: !!income?.test_mode,
    complete: !!(m.complete && income?.complete),
    note: income?.test_mode
      ? 'Test-mode Market money is practice, not revenue: this net is the real bills against pretend income.'
      : 'Live Market income against this month\'s bills.',
  };
}

/** One short line for every kin's context. */
export function line() {
  const k = last.key;
  if (!k) return last.error ? `Spend: unavailable (${last.error}).` : '';
  const lim = k.limit ? ` of $${k.limit.toFixed(2)} (${k.limit_reset || 'no reset'})` : ' (no limit set)';
  return `Spend today on the shared OpenRouter key: $${(k.usage_daily ?? 0).toFixed(2)}${lim}${k.limit_remaining != null ? `, $${k.limit_remaining.toFixed(2)} left` : ''}. This week $${(k.usage_weekly ?? 0).toFixed(2)}, this month $${(k.usage_monthly ?? 0).toFixed(2)}. That key is not the whole bill: with the fixed plans and servers, this month is heading to about $${month().total_projected.toFixed(2)}${month().complete ? '' : ' (not every line is confirmed yet)'}. Full page: /spend`;
}
