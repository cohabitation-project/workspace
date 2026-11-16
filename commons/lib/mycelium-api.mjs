/**
 * mycelium-api.mjs — Wires Mycelium search and brief into the Commons REST API.
 *
 * Called from server.mjs after all stores are initialized.
 * Adds: /api/mycelium/search, /api/mycelium/brief, /api/mycelium/status
 */

import { createIndex, renderBrief, renderBriefForPrompt } from './mycelium.mjs';
import * as core from './core.mjs';

let idx = null;
let lastRefresh = 0;
const REFRESH_MS = 30_000;

export function wireMyceliumAPI({ app, wrap, actor, store, desk, posts, repo }) {
  idx = createIndex({
    messages() {
      const rooms = repo.rooms();
      const all = [];
      for (const r of rooms) {
        for (const m of store.roomMessages(r.id)) all.push({ ...m, room: r.id, room_name: r.name });
      }
      return all;
    },
    posts:         () => posts.all ? posts.all() : [],
    journals:      () => [],
    contributions: () => [],
    desk:          () => desk.all ? desk.all() : [],
    members:       () => store.allMembers().filter(m => !m.retired),
    repoRoot:      repo.ROOT || process.cwd(),
  });
  idx.refresh();
  idx._renderBrief = renderBrief;
  core.setMyceliumIndex(idx);
  lastRefresh = Date.now();

  function fresh() {
    if (Date.now() - lastRefresh > REFRESH_MS) { idx.refresh(); lastRefresh = Date.now(); }
  }

  app.get('/api/mycelium/search', wrap((req) => {
    const m = actor(req);
    if (!m) throw Object.assign(new Error('authentication required'), { status: 401 });
    fresh();
    const { q, kind, layer, author, room, since, status, limit } = req.query;
    return idx.search(m, {
      q: q || '', kind: kind || null, layer: layer || null,
      author: author || null, room: room || null, since: since || null,
      status: status || null, limit: parseInt(limit) || 20,
    });
  }));

  app.get('/api/mycelium/brief', wrap((req) => {
    const m = actor(req);
    if (!m) throw Object.assign(new Error('authentication required'), { status: 401 });
    fresh();
    const brief = idx.returnBrief(m, { since: req.query.since || null });
    return { brief, rendered: renderBrief(brief) };
  }));

  app.get('/api/mycelium/status', wrap((_req) => {
    fresh();
    return idx.stats();
  }));

  console.log('[mycelium-api] wired: /api/mycelium/search, /api/mycelium/brief, /api/mycelium/status');
  return idx;
}
