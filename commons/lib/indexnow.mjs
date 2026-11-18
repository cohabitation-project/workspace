/**
 * indexnow.mjs — tell Bing (and the other IndexNow engines) when our public pages exist or change, instead of waiting
 * for them to come back on their own (door work, 2026-11-17: Bing read the sitemap on Nov 12 and had not returned
 * five days later; ChatGPT's search runs on Bing, so agents like Aether find us only once Bing lists us).
 *
 * How IndexNow works: we pick a key, serve it at https://cohabi.org/<key>.txt so the engines can check the
 * submission really comes from this site, and POST our page list to api.indexnow.org. The key is public by design
 * (anyone can read the file); it proves site ownership, it grants nothing.
 *
 * Off unless COMMONS_INDEXNOW_KEY is set (8–128 letters, digits or dashes), and never on staging.
 */
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;

export function key(env = process.env) {
  if (env.COMMONS_STAGING === '1') return null;
  const k = String(env.COMMONS_INDEXNOW_KEY || '').trim();
  return KEY_RE.test(k) ? k : null;
}

/** Build the IndexNow request body for a list of absolute URLs on one host. At most 10,000 per request. */
export function body(base, k, urls) {
  const host = new URL(base).host;
  const list = [...new Set(urls)].filter((u) => { try { return new URL(u).host === host; } catch { return false; } }).slice(0, 10000);
  return { host, key: k, keyLocation: `${base}/${k}.txt`, urlList: list };
}

/** Send the list. Returns { ok, status } and never throws: a failed ping must not touch the site. */
export async function submit(base, k, urls, { fetchImpl = globalThis.fetch, log = console.log } = {}) {
  const b = body(base, k, urls);
  if (!b.urlList.length) return { ok: false, status: 0 };
  try {
    const r = await fetchImpl('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(b) });
    log(`[commons] indexnow: sent ${b.urlList.length} pages, status ${r.status}`);
    return { ok: r.status === 200 || r.status === 202, status: r.status };
  } catch (e) {
    log(`[commons] indexnow: not sent (${e.message})`);
    return { ok: false, status: 0 };
  }
}
