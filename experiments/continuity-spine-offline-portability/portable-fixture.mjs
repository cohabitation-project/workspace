/** Synthetic-only reference fixture for portability tests; NOT authentication, encryption or production tenancy. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const code = (c) => Object.assign(new Error(c), { code: c });
const id = (s) => typeof s === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(s);
const digest = (s) => createHash('sha256').update(s).digest('hex');
const clone = (o) => structuredClone(o);
const stable = (o) => JSON.stringify(o);

export class SyntheticPortabilityFixture {
  constructor(directory) {
    if (typeof directory !== 'string' || !directory) throw code('DIR');
    this.directory = path.resolve(directory);
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    this.file = path.join(this.directory, 'synthetic-state.json');
    this.state = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : { version: 1, tenants: {} };
    if (this.state.version !== 1 || !this.state.tenants || Array.isArray(this.state.tenants)) throw code('SCHEMA');
  }
  save() {
    const temp = path.join(this.directory, `.synthetic-${randomUUID()}.tmp`);
    try {
      fs.writeFileSync(temp, stable(this.state), { flag: 'wx', mode: 0o600 });
      fs.renameSync(temp, this.file);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  addTenant(tenant, owner) {
    if (!id(tenant) || !id(owner)) throw code('IDENTIFIER');
    if (this.state.tenants[tenant]) throw code('EXISTS');
    this.state.tenants[tenant] = { owner, grants: {}, records: {} };
    this.save();
  }
  tenant(tenant) {
    if (!id(tenant) || !Object.hasOwn(this.state.tenants, tenant)) throw code('NOT_FOUND');
    return this.state.tenants[tenant];
  }
  requireOwner(tenant, actor) {
    if (!id(actor) || this.tenant(tenant).owner !== actor) throw code('DENIED');
  }
  grant(tenant, owner, actor, record) {
    this.requireOwner(tenant, owner);
    if (!id(actor) || !id(record) || !Object.hasOwn(this.tenant(tenant).records, record)) throw code('NOT_FOUND');
    const t = this.tenant(tenant);
    t.grants[actor] ??= [];
    if (!t.grants[actor].includes(record)) t.grants[actor].push(record);
    this.save();
  }
  revoke(tenant, owner, actor, record) {
    this.requireOwner(tenant, owner);
    if (!id(actor) || !id(record)) throw code('IDENTIFIER');
    const t = this.tenant(tenant);
    t.grants[actor] = (t.grants[actor] || []).filter((x) => x !== record);
    this.save();
  }
  put(tenant, actor, record, text) {
    this.requireOwner(tenant, actor);
    if (!id(record) || typeof text !== 'string' || text.length > 10000) throw code('CONTENT');
    this.tenant(tenant).records[record] = { text };
    this.save();
  }
  read(tenant, actor, record) {
    const t = this.tenant(tenant);
    if (!id(actor) || !id(record) || (t.owner !== actor && !(t.grants[actor] || []).includes(record))) throw code('DENIED');
    if (!Object.hasOwn(t.records, record)) throw code('NOT_FOUND');
    return t.records[record].text;
  }
  exportSnapshot(tenant, actor) {
    this.requireOwner(tenant, actor);
    const payload = { format: 'spine.synthetic.portability.v1', tenant, state: clone(this.tenant(tenant)) };
    return { payload, sha256: digest(stable(payload)) };
  }
  importSnapshot(tenant, actor, envelope) {
    this.requireOwner(tenant, actor);
    if (!envelope || !envelope.payload || typeof envelope.sha256 !== 'string' || digest(stable(envelope.payload)) !== envelope.sha256) throw code('CHECKSUM');
    const p = envelope.payload;
    if (p.format !== 'spine.synthetic.portability.v1' || p.tenant !== tenant || p.state?.owner !== actor || !p.state.grants || !p.state.records) throw code('SCOPE');
    if (Object.keys(this.tenant(tenant).records).length) throw code('NOT_EMPTY');
    this.state.tenants[tenant] = clone(p.state);
    this.save();
  }
}
