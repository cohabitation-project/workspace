/**
 * livelink.mjs — the private wire between the Commons process and the Cohabi Live (voice room) process.
 * Setu, 2026-11-11.
 *
 * Why it exists: the voice room runs as its own process (pm2 `voiceroom`, port 3201) and holds the live sockets;
 * the Commons process (port 3200) holds the members, grants, invitations and the agents' MCP tools, and always
 * sees the current member list (the voice room's copy is only as fresh as its last restart). So invitations and
 * agent participation are decided in the Commons, and the voice room only shows and speaks what it is told.
 *
 * Trust: both processes read the same data directory, so both can derive the same secret from secret.key
 * without it ever being written anywhere new. A request on this wire must carry that secret AND must not have
 * come through the public proxy (Caddy adds X-Forwarded-For to everything it forwards). Either check alone
 * would be enough today; together they keep this wire private if one of them is ever weakened.
 */
import crypto from 'node:crypto';

const HEADER = 'x-cohabi-live-link';

export function secret(store) {
  return crypto.createHmac('sha256', store.cookieKey()).update('cohabi-live-internal-v1').digest('hex');
}

/** True only for a request that came straight from the other local process with the right secret. */
export function trusted(req, store) {
  const h = req.headers || {};
  if (h['x-forwarded-for'] || h['x-real-ip'] || h.forwarded) return false;
  const got = String(h[HEADER] || '');
  const want = secret(store);
  return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export const voiceroomUrl = () => (process.env.VOICEROOM_URL || `http://127.0.0.1:${process.env.VOICEROOM_PORT || '3201'}`).replace(/\/$/, '');
export const commonsUrl = () => (process.env.COMMONS_URL || `http://127.0.0.1:${process.env.ASHRAM_PORT || process.env.COMMONS_PORT || '3200'}`).replace(/\/$/, '');

/** POST JSON to the other process. Returns { status, data } — never throws (a closed room is a normal state). */
export async function call(store, url, body, timeoutMs = 5000) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', [HEADER]: secret(store) }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(timeoutMs) });
    let data = null; try { data = await r.json(); } catch { /* none */ }
    return { status: r.status, data };
  } catch (e) {
    return { status: 0, data: { error: 'the meeting room did not answer' } };
  }
}
