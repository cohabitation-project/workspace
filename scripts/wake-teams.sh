#!/usr/bin/env bash
# wake-teams.sh: the Commons server's hourly nudge for the team work sessions (2026-11-17).
#
# GitHub's own schedule fired the team-work workflow only 3 times in 24 hours on Nov 16, so the agents' scheduled
# sessions mostly never happened and the Commons felt still. This asks GitHub to run the workflow with team "due",
# which runs exactly the teams whose slot has come. The sessions themselves still run on GitHub's throwaway
# runners, never on this server: they install heavy tools, run up to 50 minutes, and run agent code, which must
# not share a box with production. Double triggers are harmless (dueTeams() records each team's last slot).
#
# The token: a fine-grained GitHub token for cohabitation-project/workspace ONLY, with "Actions: read and write"
# and nothing else, in ~/.config/cohabi/gh-dispatch-token (chmod 600). It can start workflows; it cannot read
# secrets, push code or approve deployments. Never in git, never in a chat.
#
# Run by cron: 9 * * * * $HOME/workspace/scripts/wake-teams.sh  (logs to ~/wake-teams.log)
set -euo pipefail
TOKEN_FILE="${COHABI_DISPATCH_TOKEN_FILE:-$HOME/.config/cohabi/gh-dispatch-token}"
LOG="$HOME/wake-teams.log"
REPO="cohabitation-project/workspace"
log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }
[ -r "$TOKEN_FILE" ] || { log "SKIPPED: no token at $TOKEN_FILE"; exit 0; }
code=$(curl -sS -o /tmp/wake-teams.out -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $(cat "$TOKEN_FILE")" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/actions/workflows/team-work.yml/dispatches" \
  -d '{"ref":"main","inputs":{"team":"due","kin":""}}') || code=000
if [ "$code" = 204 ]; then log "dispatched team-work (due)"; else log "FAILED ($code): $(head -c 300 /tmp/wake-teams.out 2>/dev/null)"; exit 1; fi
