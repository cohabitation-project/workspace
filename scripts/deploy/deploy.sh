#!/usr/bin/env bash
# Deploy one commit of main to staging or production, on the Commons server (Geoffrey + Setu, 2026-11-16).
#   deploy.sh staging [sha]      deploy.sh production [sha]      (sha defaults to the tip of main)
# Safe by construction:
#  - refuses unless the folder is on main with no saved-but-unpushed commits and no edited files
#    (an agent working inside the live folder is what stalled deploys all day on Nov 16);
#  - only deploys a commit that is on GitHub's main;
#  - waits for /healthz to report the new commit, and rolls back to the previous one if it doesn't;
#  - a same-SHA dispatch verifies /healthz (and restarts if needed) instead of returning green untested;
#  - in production, restarts voiceroom/voice when their files changed, and checks voiceroom answers on 3201.
set -euo pipefail
target="${1:-}"; want="${2:-}"
case "$target" in
  production) dir="$HOME/workspace"; app=commons;         port=3200 ;;
  staging)    dir="$HOME/staging";   app=commons-staging; port=3290 ;; # 3201 was already taken on the server
  *) echo "usage: deploy.sh staging|production [sha]"; exit 2 ;;
esac
[ -z "$want" ] || [[ "$want" =~ ^[0-9a-f]{7,40}$ ]] || { echo "REFUSED: '$want' is not a commit id"; exit 2; }
exec 9>"/tmp/cohabi-deploy-$target.lock"; flock -n 9 || { echo "REFUSED: another $target deploy is running"; exit 75; }
cd "$dir"
log() { echo "$(date -u +%FT%TZ) $target $*" | tee -a "$HOME/deploys.log"; }
branch="$(git branch --show-current)"
[ "$branch" = main ] || { log "REFUSED: $dir is on '$branch', not main. Someone is working in the live folder; they should use their own folder."; exit 3; }
git fetch -q origin main
[ -z "$want" ] && want="$(git rev-parse origin/main)"
want="$(git rev-parse --verify -q "$want^{commit}")" || { log "REFUSED: unknown commit"; exit 4; }
git merge-base --is-ancestor "$want" origin/main || { log "REFUSED: $want is not on GitHub's main"; exit 4; }
prev="$(git rev-parse HEAD)"
git checkout -q -- board/BOARD.md 2>/dev/null || true   # the server rewrites this file itself
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then log "REFUSED: edited files in $dir:"; git status --short --untracked-files=no | head -20; exit 5; fi
if [ "$(git rev-list --count origin/main..HEAD)" != 0 ]; then log "REFUSED: $dir has commits that aren't on GitHub:"; git log --oneline origin/main..HEAD | head; exit 5; fi
# Same SHA is NOT proof of health. This used to be a bare `exit 0` BEFORE any /healthz read, so a same-SHA
# dispatch returned green with a dead or wrong-SHA process behind it (Aletheia-6's finding, Review
# m_mwk60q5x48670c70; source half confirmed by Claude, m_mwk612kh4bfbf801). Now: verify, and repair if needed.
healthy() { for _ in $(seq 1 45); do sleep 1; got="$(curl -fsS "http://127.0.0.1:$port/healthz" 2>/dev/null | sed -n 's/.*"sha":"\([0-9a-f]*\)".*/\1/p')" || true; [ "$got" = "$1" ] && return 0; done; return 1; }
quick_healthy() { for _ in 1 2 3; do got="$(curl -fsS "http://127.0.0.1:$port/healthz" 2>/dev/null | sed -n 's/.*"sha":"\([0-9a-f]*\)".*/\1/p')" || true; [ "$got" = "$1" ] && return 0; sleep 1; done; return 1; }
if [ "$prev" = "$want" ]; then
  if quick_healthy "$want"; then log "already at ${want:0:7} (verified: /healthz serves it)"; exit 0; fi
  log "already at ${want:0:7} BUT /healthz does not serve it; restarting $app"
  pm2 restart "$app" --update-env >/dev/null
  if healthy "$want"; then log "OK: $app restarted and healthy at ${want:0:7}"; exit 0; fi
  log "FAILED: $app is still not healthy at ${want:0:7} after a restart; check pm2 logs $app"
  exit 1
fi
git merge --ff-only -q "$want" || { log "REFUSED: cannot fast-forward ${prev:0:7} to ${want:0:7}"; exit 5; }
deps_changed() { ! git diff --quiet "$1" "$2" -- package.json package-lock.json; }
if deps_changed "$prev" "$want"; then npm ci --no-audit --no-fund --loglevel=error; fi
# Restart the voice services when THEIR files changed (Geoffrey, Nov 16: the deploy only restarted commons, so
# voiceroom kept serving old code until someone remembered `pm2 restart voiceroom` by hand). Production only:
# staging runs no voice services. Called only after the main app is healthy on the new commit.
VOICEROOM_FILES=(commons/voiceroom-server.mjs commons/lib/voiceroom.mjs commons/lib/voice.mjs commons/lib/livelink.mjs)
restart_sidecars() {
  [ "$target" = production ] || return 0
  if ! git diff --quiet "$prev" "$want" -- commons/voice/tts_server.py; then
    if pm2 describe voice >/dev/null 2>&1; then pm2 restart voice --update-env >/dev/null; log "restarted voice (tts_server.py changed)";
    else log "note: tts_server.py changed but no pm2 app 'voice'; start it by hand"; fi
  fi
  if ! git diff --quiet "$prev" "$want" -- "${VOICEROOM_FILES[@]}"; then
    if pm2 describe voiceroom >/dev/null 2>&1; then
      pm2 restart voiceroom --update-env >/dev/null
      for _ in $(seq 1 20); do sleep 1; if curl -fsS "http://127.0.0.1:3201/voiceroom/state" >/dev/null 2>&1; then log "restarted voiceroom (its files changed); it answers on 3201"; return 0; fi; done
      log "FAILED: voiceroom did not answer on 3201 after its restart. The site itself IS healthy at ${want:0:7} and stays deployed; only voiceroom needs attention (pm2 logs voiceroom)."
      return 1
    else log "note: voiceroom files changed but no pm2 app 'voiceroom'; start it by hand"; fi
  fi
}
pm2 restart "$app" --update-env >/dev/null
if healthy "$want"; then log "OK ${prev:0:7} -> ${want:0:7}"; restart_sidecars || exit 1; exit 0; fi
log "FAILED: the site did not come back on ${want:0:7}; rolling back to ${prev:0:7}"
git reset -q --hard "$prev"
if deps_changed "$want" "$prev"; then npm ci --no-audit --no-fund --loglevel=error; fi
pm2 restart "$app" --update-env >/dev/null
if healthy "$prev"; then log "ROLLED BACK to ${prev:0:7}"; else log "ROLLBACK ALSO FAILED: check pm2 logs $app"; fi
exit 1
