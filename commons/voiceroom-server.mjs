#!/usr/bin/env node
/**
 * voiceroom-server.mjs — standalone HTTP + WebSocket server for the voice room.
 *
 * Runs alongside the main Commons server on a separate port (VOICEROOM_PORT env,
 * default 3201, 127.0.0.1 only). Shares authentication and data directory with
 * the main server.
 *
 *   node commons/voiceroom-server.mjs
 *
 * nginx proxies /voiceroom, /voiceroom-ws, etc. to this process.
 */

import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import dotenv from 'dotenv';
import { URL } from 'node:url';

import * as repo from './lib/repo.mjs';
import * as station from './lib/station.mjs';
import * as voiceroom from './lib/voiceroom.mjs';

dotenv.config({ path: path.join(repo.ROOT, '.env'), quiet: true });

const store = await import('./lib/store.mjs');
const auth = await import('./lib/auth.mjs');

const PORT = parseInt(process.env.VOICEROOM_PORT || '3201', 10);
const HOST = '127.0.0.1';
const DATA = path.resolve(process.env.COMMONS_DATA || path.join(repo.ROOT, 'data', 'commons'));
const PUBLIC = path.join(import.meta.dirname, 'public');

// ---------------------------------------------------------------------------
// Init shared modules
// ---------------------------------------------------------------------------
store.init(DATA);
station.init(DATA);
voiceroom.init(DATA);

const room = voiceroom.build({ auth, store, station });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Authenticate a request: human via cookie, agent via bearer token. */
function authenticateRequest(req) {
  // Try cookie first (humans)
  const human = auth.memberFromCookie(req.headers.cookie);
  if (human) return human;
  // Try bearer token (agents)
  const tok = auth.tokenFrom(req);
  if (tok) return store.memberByToken(tok);
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(filePath, res) {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function jsonResponse(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // GET /voiceroom — serve the HTML page
  if (req.method === 'GET' && pathname === '/voiceroom') {
    return serveStatic(path.join(PUBLIC, 'voiceroom.html'), res);
  }

  // GET /voiceroom/state — JSON room state
  if (req.method === 'GET' && pathname === '/voiceroom/state') {
    return jsonResponse(res, 200, room.getState());
  }

  // POST /voiceroom/turn-credentials — mint TURN credentials (auth required)
  if (req.method === 'POST' && pathname === '/voiceroom/turn-credentials') {
    // Parse body so auth.tokenFrom can read req.body
    req.body = await readBody(req);
    const member = authenticateRequest(req);
    if (!member) return jsonResponse(res, 401, { error: 'authentication required' });
    const creds = voiceroom.mintCredentials(member.id);
    return jsonResponse(res, 200, { iceServers: creds });
  }

  // Static files: voiceroom.js, voiceroom.css, and other public assets
  if (req.method === 'GET' && pathname.startsWith('/voiceroom.')) {
    const basename = path.basename(pathname);
    // Prevent path traversal
    if (basename.includes('..') || basename.includes('/')) {
      res.writeHead(400); return res.end('Bad request');
    }
    return serveStatic(path.join(PUBLIC, basename), res);
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// ---------------------------------------------------------------------------
// WebSocket upgrade on /voiceroom-ws
// ---------------------------------------------------------------------------
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/voiceroom-ws') {
    room.handleUpgrade(req, socket, head);
  } else {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
server.listen(PORT, HOST, () => {
  console.log(`[voiceroom] listening on ${HOST}:${PORT}`);
});
