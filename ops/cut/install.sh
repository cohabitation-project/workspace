#!/usr/bin/env bash
# Install (or update) full Cohabi Cut on the Commons server, at cohabi.org/cut-new (Setu, 2026-11-24).
# GitHub builds it (cohabi-cut repo, "Build preview"); this only downloads that one file, unpacks it next to the
# last version, and restarts the pm2 app "cohabi-cut" on 127.0.0.1:3330. It never builds on this 4 GB server.
#   bash ops/cut/install.sh            (if the repo is private: GH_TOKEN=<read-only token> bash ops/cut/install.sh)
set -euo pipefail
URL="https://github.com/cohabitation-project/cohabi-cut/releases/download/preview/cohabi-cut.tgz"
ROOT="$HOME/cohabi-cut"; PORT=3330   # 3310 is taken on the server by a python service (found 2026-11-24)
mkdir -p "$ROOT/releases"
new="$ROOT/releases/$(date +%Y%m%d-%H%M%S)"; mkdir -p "$new"
echo "Downloading the latest build…"
if [ -n "${GH_TOKEN:-}" ]; then
  api="https://api.github.com/repos/cohabitation-project/cohabi-cut/releases/tags/preview"
  asset=$(curl -fsS -H "Authorization: Bearer $GH_TOKEN" "$api" | grep -o '"url": *"[^"]*/assets/[0-9]*"' | head -1 | sed 's/.*"\(http[^"]*\)"/\1/')
  curl -fsSL -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/octet-stream" "$asset" -o "$new.tgz"
else
  curl -fsSL "$URL" -o "$new.tgz"
fi
tar -xzf "$new.tgz" -C "$new" && rm -f "$new.tgz"
[ -f "$new/apps/web/server.js" ] || { echo "The download doesn't look like a Cut build; nothing changed."; rm -rf "$new"; exit 1; }
prev="$(readlink -f "$ROOT/current" 2>/dev/null || true)"
ln -sfn "$new" "$ROOT/current"
start_app() {  # always a fresh pm2 entry, so the port and folder are exactly the ones above
  pm2 delete cohabi-cut >/dev/null 2>&1 || true
  PORT=$PORT HOSTNAME=127.0.0.1 NODE_ENV=production pm2 start "$ROOT/current/apps/web/server.js" --name cohabi-cut \
    --cwd "$ROOT/current/apps/web" --max-memory-restart 400M >/dev/null
  pm2 save >/dev/null
}
start_app
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/cut-new/projects" || true)
  [ "$code" = 200 ] && break; sleep 1
done
if [ "$code" = 200 ]; then
  echo "Cohabi Cut is running ($(cat "$ROOT/current/apps/web/COMMIT" 2>/dev/null | cut -c1-7)). Open https://cohabi.org/cut-new"
  ls -1dt "$ROOT"/releases/*/ | tail -n +4 | xargs -r rm -rf   # keep the last 3
else
  echo "It didn't answer (got $code). Putting the previous version back." >&2
  if [ -n "$prev" ] && [ "$prev" != "$new" ]; then ln -sfn "$prev" "$ROOT/current" && start_app; else pm2 delete cohabi-cut >/dev/null 2>&1 || true; pm2 save >/dev/null; fi
  tail -n 20 "$HOME/.pm2/logs/cohabi-cut-error.log" 2>/dev/null; exit 1
fi
