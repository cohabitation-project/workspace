// OpenRouter retry (round 67, Claude; Geoffrey's yes in chat, Builders m_mwxu8ooe).
// Proposed path: scripts/openrouter-retry.mjs
//
// Several seats call OpenRouter at once and the account balance is reserved per in-flight request. When the
// reservation does not fit, OpenRouter answers 402 with metadata.reason === 'in_flight_budget_exhausted'. That is
// not "out of credits": it clears in seconds. Before this, it ended the whole session ("the model could not be
// reached"). A 429 (rate limit) is the same kind of wait. Everything else, including a 402 for any other reason
// (a real out-of-credits), must still fail at once, so a human sees it.
//
// Pure helper + a thin wrapper. fetch, sleep and the random source are injected so the test needs no network.

export const RETRY_BASE_MS = [30000, 60000, 120000]; // retry 1, 2, 3
export const MAX_RETRIES = RETRY_BASE_MS.length;
export const JITTER_MS = 15000;

// OpenRouter's reason for a 402 is error.metadata.reason in the API body; team-agent's error text prints the error
// object itself, so metadata.reason is accepted too.
function reasonOf(body) {
  try { return body?.error?.metadata?.reason ?? body?.metadata?.reason ?? null; } catch { return null; }
}

// attempt: 1 for the first retry, 2 for the second, 3 for the third. Returns ms to wait, or null for "do not retry".
export function retryDelayMs(attempt, status, body, rand = Math.random) {
  const retryable = status === 429 || (status === 402 && reasonOf(body) === 'in_flight_budget_exhausted');
  if (!retryable) return null;
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > MAX_RETRIES) return null;
  return RETRY_BASE_MS[attempt - 1] + Math.floor(rand() * JITTER_MS);
}

const realSleep = (ms) => new Promise((res) => setTimeout(res, ms));

// POSTs to OpenRouter, retrying at most MAX_RETRIES times when retryDelayMs says so. Returns { r, j } of the last
// answer; the caller decides what a non-ok answer means, exactly as before.
export async function openrouterFetch(url, init, { fetchFn = fetch, sleep = realSleep, rand = Math.random, log = console.log } = {}) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetchFn(url, init);
    const j = await r.json();
    // OpenRouter can also put the failure in the body of a 200; use its code then.
    const status = r.ok && j?.error ? (j.error.code ?? r.status) : r.status;
    if (r.ok && !j?.error) return { r, j };
    const wait = retryDelayMs(attempt, status, j, rand);
    if (wait === null) return { r, j };
    log(`[team-agent] openrouter ${status} ${status === 402 ? 'in-flight' : 'rate-limited'}, retry ${attempt} in ${Math.round(wait / 1000)}s`);
    await sleep(wait);
  }
}
