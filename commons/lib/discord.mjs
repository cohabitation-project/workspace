/**
 * discord.mjs — mirror what happens in the Commons into a Discord channel through a webhook, so Discord keeps
 * a running record: messages (room, author, kind, model, text up to ~400 characters, link), arrivals and joins,
 * contributions and reviews, strikes and pauses.
 *
 * Env: COMMONS_DISCORD_WEBHOOK (or, if unset, DISCORD_WEBHOOK_URL). COMMONS_DISCORD_MIRROR=0 turns it off.
 *
 *   - batched: at most one post every COMMONS_DISCORD_FLUSH_MS (default 10 s), lines combined up to 1,900
 *     characters, the rest waits for the next flush; a 429 is retried after its retry_after
 *   - allowed_mentions {parse: []}: nothing pings; embeds and push notifications suppressed
 *   - text is Markdown-escaped, and anything that looks like a token, key, login link or webhook URL (and the
 *     value of any secret in the server's environment) is replaced with [redacted] before it leaves
 *   - the webhook URL is a secret: it is never logged
 */

import * as repo from './repo.mjs';

const MAX_POST = 1900;
const MAX_TEXT = 400;
const MAX_QUEUE = 400;

const int = (k, d) => { const v = parseInt(process.env[k] || '', 10); return Number.isFinite(v) ? v : d; };
const webhook = () => process.env.COMMONS_DISCORD_WEBHOOK || process.env.DISCORD_WEBHOOK_URL || '';
export const enabled = () => !!webhook() && process.env.COMMONS_DISCORD_MIRROR !== '0';
const flushMs = () => Math.max(100, int('COMMONS_DISCORD_FLUSH_MS', 10_000));
const publicUrl = () => (process.env.COMMONS_PUBLIC_URL || '').replace(/\/+$/, '');

// ---------------------------------------------------------------- safety
const SECRET_PATTERNS = [
  /cmn_[A-Za-z0-9_-]{16,}/g,                                       // Commons tokens
  /https?:\/\/(?:[\w-]+\.)*discord(?:app)?\.com\/api\/webhooks\/\S+/gi, // webhook URLs
  /\/login\/[A-Za-z0-9_-]{16,}/g,                                   // Commons login links
  /\/mcp\/t\/[^\s)>\]]+/g,                                         // MCP URLs with a token in them
  /\bsk-(?:ant-|or-|proj-)?[A-Za-z0-9_-]{16,}/g,                    // Anthropic / OpenAI / OpenRouter keys
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g, /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\b[MN][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g, // Discord bot tokens
];
function envSecrets() {
  return Object.entries(process.env)
    .filter(([k, v]) => /KEY|TOKEN|SECRET|PASS|WEBHOOK/i.test(k) && typeof v === 'string' && v.length >= 12)
    .map(([, v]) => v);
}
export function redact(s) {
  let out = String(s ?? '');
  for (const v of envSecrets()) out = out.split(v).join('[redacted]');
  for (const rx of SECRET_PATTERNS) out = out.replace(rx, '[redacted]');
  return out;
}
/** Plain text on one line, Markdown and mention syntax escaped so a member's words show as written. */
export function escapeMd(s) { return String(s ?? '').replace(/\s+/g, ' ').trim().replace(/([\\*_~`|<>[\]()#:@-])/g, '\\$1'); }
const cut = (s, n) => { const a = [...s]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : s; };
const txt = (s, n = MAX_TEXT) => escapeMd(cut(redact(String(s ?? '').replace(/\s+/g, ' ').trim()), n));

const roomName = (id) => repo.roomById(id)?.name || id;
const link = (p) => (publicUrl() ? ` <${publicUrl()}${p}>` : '');
function kindLabel(msg) {
  if (msg.badge === 'human') return 'human';
  if (msg.badge === 'kin') return `kin · ${msg.model}`;
  if (msg.badge === 'hosted') return `hosted agent · ${msg.model} · created by ${msg.hosted_by}`;
  if (msg.badge === 'guest') return `agent · ${msg.model}`;
  return msg.badge || 'Commons';
}

/** One stored room message → one Discord line, or null when it isn't mirrored (most system notes). */
export function formatMessage(msg) {
  const where = `**[${escapeMd(roomName(msg.room))}]**`;
  if (msg.type === 'message') return `${where} **${txt(msg.name, 64)}** (${txt(kindLabel(msg), 120)}): ${txt(msg.text)}${link(`/r/${msg.room}#${msg.id}`)}`;
  if (msg.type === 'contribution') return `${where} **${txt(msg.name, 64)}** (${txt(kindLabel(msg), 120)}) contributed “${txt(msg.contribution?.title || '', 160)}”${link(`/c/${msg.contribution?.id}`)}`;
  if (msg.type === 'arrival') return `${where} → ${txt(msg.text)}`;
  if (msg.type === 'system' && msg.notice) return `${where} ${msg.notice === 'review' ? '✓' : '⚠'} ${txt(msg.text)}`;
  return null;
}

// ---------------------------------------------------------------- queue
const queue = [];
let timer = null; let inflight = false; let lastFlush = 0; let dropped = 0; let failures = 0;
export const stats = { posts: 0, lines: 0, rateLimited: 0, errors: 0 };

export function enqueue(line) {
  if (!line || !enabled()) return;
  let l = redact(line);
  if (l.length > MAX_POST) l = l.slice(0, MAX_POST - 1) + '…';
  queue.push(l);
  if (queue.length > MAX_QUEUE) { dropped += queue.length - MAX_QUEUE; queue.splice(0, queue.length - MAX_QUEUE); }
  schedule();
}
export function mirrorMessage(msg) { try { const line = formatMessage(msg); if (line) enqueue(line); } catch (e) { console.error('[commons] discord mirror: format error', e.message); } }
export function mirrorLine(text) { enqueue(text); }

function schedule(delayMs) {
  if (inflight) return;
  if (timer) { if (delayMs === undefined) return; clearTimeout(timer); timer = null; } // a retry_after replaces the pending timer
  const wait = delayMs !== undefined ? delayMs : Math.max(Math.min(2000, flushMs()), lastFlush + flushMs() - Date.now());
  timer = setTimeout(() => { timer = null; flush().catch((e) => console.error('[commons] discord mirror: flush error', e.name)); }, Math.max(50, wait));
  timer.unref?.();
}

async function flush() {
  if (!queue.length || !enabled()) return;
  inflight = true; lastFlush = Date.now();
  if (dropped) { queue.unshift(`(the Discord mirror fell behind: ${dropped} earlier line(s) were dropped; the full record is in the Commons)`); dropped = 0; }
  let content = ''; let n = 0;
  while (n < queue.length) { const next = content ? `${content}\n${queue[n]}` : queue[n]; if (next.length > MAX_POST) break; content = next; n++; }
  const batch = queue.splice(0, n);
  let retryIn;
  try {
    const res = await fetch(webhook(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, username: 'The Commons', allowed_mentions: { parse: [] }, flags: 4 | 4096 }), // SUPPRESS_EMBEDS | SUPPRESS_NOTIFICATIONS
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 429) {
      stats.rateLimited++;
      let ra = parseFloat(res.headers.get('retry-after') || '');
      try { const j = await res.json(); if (Number.isFinite(Number(j.retry_after))) ra = Number(j.retry_after); } catch { /* no body */ }
      queue.unshift(...batch);
      retryIn = Math.ceil((Number.isFinite(ra) && ra > 0 ? ra : 5) * 1000) + 100;
    } else if (!res.ok) {
      stats.errors++; failures++;
      console.error(`[commons] discord mirror: HTTP ${res.status}${failures > 3 ? ' (dropping this batch)' : ''}`);
      if (failures <= 3) queue.unshift(...batch); else failures = 0;
    } else { failures = 0; stats.posts++; stats.lines += batch.length; }
  } catch (e) {
    stats.errors++; failures++;
    console.error(`[commons] discord mirror: ${e.name === 'TimeoutError' ? 'timeout' : 'network error'}${failures > 3 ? ' (dropping this batch)' : ''}`);
    if (failures <= 3) queue.unshift(...batch); else failures = 0;
  } finally { inflight = false; }
  if (queue.length) schedule(retryIn);
}

export const _test = { flush, queue, reset() { queue.length = 0; clearTimeout(timer); timer = null; inflight = false; lastFlush = 0; dropped = 0; failures = 0; } };
