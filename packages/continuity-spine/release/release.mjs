/** Continuity Spine package boundary v0.1. Offline verification only; NOT an auth or tenancy implementation. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SHA = /^[a-f0-9]{64}$/i;
const COMMIT = /^[a-f0-9]{40}$/i;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const REQUIRED = ['identity', 'authorization', 'storage', 'audit', 'backup'];
const plain = (x) => x && typeof x === 'object' && !Array.isArray(x);
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const safePath = (s) => typeof s === 'string' && s.length > 0 && s.length <= 240
  && !s.includes('\\') && !s.includes('\0') && !s.startsWith('/') && !s.split('/').some((p) => p === '..' || p === '.' || p === '')
  && !/^[A-Za-z]:/.test(s);
export class PackageError extends Error { constructor(code, detail) { super(`${code}: ${detail}`); this.code = code; } }
const fail = (code, detail) => { throw new PackageError(code, detail); };

export function validateManifest(m) {
  if (!plain(m) || m.schemaVersion !== 1 || m.product !== 'continuity-spine') fail('SCHEMA', 'Expected continuity-spine manifest schemaVersion 1');
  if (!VERSION.test(m.version || '')) fail('VERSION', 'A pinned semantic package version is required');
  if (!COMMIT.test(m.sourceCommit || '')) fail('SOURCE', 'Full 40-hex source commit is required');
  if (!Array.isArray(m.files) || m.files.length === 0) fail('FILES', 'Nonempty file inventory required');
  if (!safePath(m.entrypoint)) fail('ENTRY', 'Unsafe or absent entrypoint');
  if (!Array.isArray(m.adapters) || REQUIRED.some((x) => !m.adapters.includes(x)) || new Set(m.adapters).size !== m.adapters.length) fail('ADAPTERS', `Required interfaces: ${REQUIRED.join(', ')}`);
  if (m.adapters.some((a) => !/^[a-z][a-z0-9-]*$/.test(a))) fail('ADAPTERS', 'Adapter names must be identifiers');
  const names = new Set();
  for (const f of m.files) {
    if (!plain(f) || !safePath(f.path) || !SHA.test(f.sha256 || '')) fail('INVENTORY', 'Every file needs a safe relative path and sha256');
    if (f.path === 'spine-manifest.json') fail('INVENTORY', 'Manifest cannot hash itself');
    if (names.has(f.path)) fail('INVENTORY', `Duplicate file: ${f.path}`);
    names.add(f.path);
  }
  if (!names.has(m.entrypoint)) fail('ENTRY', 'Entrypoint must be in inventory');
  return { product: m.product, schemaVersion: m.schemaVersion, version: m.version, sourceCommit: m.sourceCommit, fileCount: names.size, adapters: [...m.adapters] };
}

function walk(dir, prefix = '') {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${d.name}` : d.name;
    if (!safePath(rel)) fail('PATH', `Unsafe path: ${rel}`);
    if (d.isSymbolicLink()) fail('SYMLINK', `No symlinks in release: ${rel}`);
    if (d.isDirectory()) out.push(...walk(path.join(dir, d.name), rel));
    else if (d.isFile()) out.push(rel);
    else fail('TYPE', `Unsupported filesystem entry: ${rel}`);
  }
  return out;
}

/** Verifies exactly the declared file bytes, with no symlinks, extras, or missing files.
 *  Does NOT certify the code, runtime behavior, signed provenance, or deployment. */
export function verifyBundle(root) {
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('ROOT', 'Release root must be a directory');
  const mf = path.join(root, 'spine-manifest.json');
  if (!fs.existsSync(mf) || !fs.lstatSync(mf).isFile()) fail('SCHEMA', 'Missing regular spine-manifest.json');
  let m; try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch { fail('SCHEMA', 'Manifest is not valid JSON'); }
  const info = validateManifest(m);
  const expected = new Map(m.files.map((f) => [f.path, f.sha256.toLowerCase()]));
  const found = walk(root).filter((p) => p !== 'spine-manifest.json');
  for (const p of found) {
    if (!expected.has(p)) fail('EXTRA', `Unlisted file in release: ${p}`);
    const got = hash(fs.readFileSync(path.join(root, ...p.split('/'))));
    if (got !== expected.get(p)) fail('HASH', `SHA-256 mismatch: ${p}`);
  }
  for (const p of expected.keys()) if (!found.includes(p)) fail('MISSING', `Missing release file: ${p}`);
  return { ...info, integrity: 'verified-offline', securityAssurance: 'not-assessed', deployedVersion: 'not-assessed' };
}

/** A plan schema check, never a connection or secret validator. No secret contents required. */
export function checkInstallPlan(plan) {
  if (!plain(plan)) fail('PLAN', 'Install plan must be an object');
  if (!['single-tenant', 'multi-tenant'].includes(plan.tenancy)) fail('TENANCY', 'Declare single-tenant or multi-tenant');
  if (!plain(plan.adapters) || REQUIRED.some((x) => typeof plan.adapters[x] !== 'string' || !plan.adapters[x].trim())) fail('ADAPTERS', 'Every required adapter needs a nonempty implementation identifier');
  if (typeof plan.baseUrl !== 'string' || !/^https:\/\/[^/?#]+(?:\/[^?#]*)?$/.test(plan.baseUrl)) fail('TRANSPORT', 'Use a real HTTPS base URL');
  if (!Array.isArray(plan.secretRefs) || !plan.secretRefs.length || plan.secretRefs.some((s) => !/^env:[A-Z][A-Z0-9_]*$|^vault:[A-Za-z0-9_/-]+$/.test(s))) fail('SECRETS', 'Supply references to externally managed secrets only (env:NAME or vault:path)');
  const serialized = JSON.stringify(plan);
  if (/"(password|apiKey|accessToken|privateKey|clientSecret|secretValue)"\s*:/i.test(serialized)) fail('SECRETS', 'Literal credential field detected; use references');
  return { planStructure: 'valid', securityAssurance: 'not-assessed', connectivity: 'not-tested', restore: 'not-tested', readiness: 'NOT_READY' };
}
