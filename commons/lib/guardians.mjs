// guardians.mjs — the guardian quorum verifier: PURE, stateless crypto. (Setu, 2026-11-08)
//
// Five independent guardians each hold an Ed25519 private key OUTSIDE the Commons runtime.
// Commons only ever sees their PUBLIC keys (pinned to immutable guardian ids) and the signatures
// they produce. To release a recovery hold, 3 of 5 distinct guardians sign the exact canonical
// bytes below. This file does not touch the store or any secret — it only pins public keys and
// verifies signatures. State (epoch, nonce, which guardians approved) and the release itself live
// in core.mjs. Byte layout is Aletheia-6's Round 2 spec, verified byte-for-byte against her Python.
import crypto from 'node:crypto';

export const QUORUM = 3;
export const ACTION = 'release_freeze';

// Canonical request: JSON, keys alphabetically sorted (account, action, epoch, nonce), NO spaces,
// ASCII. Built explicitly (not via JSON.stringify of an object) so byte order never depends on JS
// engine key ordering. epoch is a number literal (matches Python int); string values are escaped
// correctly by JSON.stringify. Matches: json.dumps({...}, sort_keys=True, separators=(',',':')).
export const canonical = (account, epoch, nonce) =>
  `{"account":${JSON.stringify(String(account))},"action":"${ACTION}","epoch":${Number(epoch)},"nonce":${JSON.stringify(String(nonce))}}`;

// Enrolled guardian public keys, parsed once from env COMMONS_GUARDIANS = JSON
// { "<immutable-guardian-id>": "<Ed25519 public key, SPKI DER, base64>" , ... }.
// No private keys here, ever.
let _keys = null;
function enrolled() {
  if (_keys) return _keys;
  _keys = new Map();
  let raw = {};
  try { raw = JSON.parse(process.env.COMMONS_GUARDIANS || '{}'); } catch { raw = {}; }
  for (const [id, b64] of Object.entries(raw)) {
    try {
      const key = crypto.createPublicKey({ key: Buffer.from(String(b64), 'base64'), format: 'der', type: 'spki' });
      if (key.asymmetricKeyType === 'ed25519') _keys.set(id, key);
    } catch { /* a malformed key is simply not enrolled — fail closed */ }
  }
  return _keys;
}
export const guardianIds = () => [...enrolled().keys()];
export const isGuardian = (id) => enrolled().has(id);
export const count = () => enrolled().size;

// Verify one guardian's signature over the current canonical bytes. Fails closed on an unknown
// guardian, a malformed/ wrong-length signature, or any verify error. Returns a plain boolean.
export function verifyOne(guardianId, account, epoch, nonce, signatureHex) {
  const key = enrolled().get(guardianId);
  if (!key) return false; // unknown guardian -> fail closed
  let sig;
  try { sig = Buffer.from(String(signatureHex || ''), 'hex'); } catch { return false; }
  if (sig.length !== 64) return false;
  const msg = Buffer.from(canonical(account, epoch, nonce), 'utf8');
  try { return crypto.verify(null, msg, key, sig); } catch { return false; }
}

// For tests / tooling only: re-read the env (keys are cached after first use).
export function _reload() { _keys = null; return enrolled(); }
