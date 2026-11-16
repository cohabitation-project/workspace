#!/usr/bin/env bash
# Run ONCE on the Commons server, as geoffrey:   bash ~/workspace/scripts/deploy/setup-once.sh
# Sets up (Geoffrey + Setu, 2026-11-16):
#   1. ~/bin/deploy.sh and ~/bin/deploy-gate.sh (pinned copies; rerun this script to update them)
#   2. a staging copy of the site: ~/staging, port 3290, its own empty data, no real keys, staging.cohabi.org
#   3. a deploy key for GitHub that can ONLY run the deploy gate (no shell, no forwarding)
# It changes nothing in ~/workspace and touches no production data. Safe to run again.
set -euo pipefail
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
REPO_URL="https://github.com/cohabitation-project/workspace.git"
SRC="$HOME/workspace/scripts/deploy"

say "Room on this server (staging needs about 250 MB of memory and 1 GB of disk):"
free -m | head -2; df -h "$HOME" | tail -1

say "1. Deploy scripts -> ~/bin"
mkdir -p "$HOME/bin"
install -m 755 "$SRC/deploy.sh" "$HOME/bin/deploy.sh"
install -m 755 "$SRC/deploy-gate.sh" "$HOME/bin/deploy-gate.sh"
echo "ok"

say "2. Staging copy of the site"
if [ ! -d "$HOME/staging/.git" ]; then git clone -q "$REPO_URL" "$HOME/staging"; fi
cd "$HOME/staging" && git checkout -q main && git pull -q --ff-only origin main
[ -d node_modules ] || npm ci --no-audit --no-fund --loglevel=error
if [ ! -f "$HOME/staging/.env" ]; then
  cat > "$HOME/staging/.env" <<'ENV'
# Staging: a separate copy of the site with its own empty data and NO real keys (no mail, no payments, no
# Discord, no paid AI). Real member data never comes here.
ASHRAM_PORT=3290
COMMONS_STAGING=1
COMMONS_FAKE_LLM=1
ENV
fi
if ! pm2 describe commons-staging >/dev/null 2>&1; then pm2 start commons/server.mjs --name commons-staging --cwd "$HOME/staging" >/dev/null; pm2 save >/dev/null; fi
sleep 3; curl -fsS http://127.0.0.1:3290/healthz && echo

say "3. staging.cohabi.org in Caddy"
CF=/etc/caddy/Caddyfile
if ! sudo grep -q '^staging.cohabi.org' "$CF"; then
  sudo cp "$CF" "$CF.before-staging"
  printf '\nstaging.cohabi.org {\n\treverse_proxy 127.0.0.1:3290\n\theader X-Robots-Tag "noindex, nofollow"\n}\n' | sudo tee -a "$CF" >/dev/null
  if sudo caddy validate --config "$CF" >/dev/null 2>&1; then sudo systemctl reload caddy && echo "ok"; else sudo cp "$CF.before-staging" "$CF"; echo "Caddy didn't accept it; put the old file back. Nothing changed."; fi
else echo "already there"; fi

say "4. Deploy key for GitHub (can only run the deploy gate)"
KEY="$HOME/.ssh/cohabi_deploy"; mkdir -p "$HOME/.ssh"; chmod 700 "$HOME/.ssh"
[ -f "$KEY" ] || ssh-keygen -q -t ed25519 -N '' -C cohabi-github-deploy -f "$KEY"
LINE="command=\"$HOME/bin/deploy-gate.sh\",restrict $(cat "$KEY.pub")"
touch "$HOME/.ssh/authorized_keys"; chmod 600 "$HOME/.ssh/authorized_keys"
grep -qF "$(cut -d' ' -f2 "$KEY.pub")" "$HOME/.ssh/authorized_keys" || echo "$LINE" >> "$HOME/.ssh/authorized_keys"
echo "ok"

say "LAST STEP — in your browser, NOT in any chat: github.com/cohabitation-project/workspace -> Settings ->"
say "Secrets and variables -> Actions -> New repository secret. Make these three:"
echo; echo "Name: DEPLOY_HOST     Value: 178.105.104.131"
echo; echo "Name: DEPLOY_KNOWN_HOSTS     Value: the one line below, starting 178.105.104.131:"; echo; ssh-keyscan -t ed25519 127.0.0.1 2>/dev/null | sed 's/^127.0.0.1/178.105.104.131/'
echo; echo "Name: DEPLOY_SSH_KEY     Value: the key itself. Easiest: on your Mac run"; echo "   ssh geoffrey@178.105.104.131 'cat ~/.ssh/cohabi_deploy' | pbcopy"; echo "and paste (it starts -----BEGIN OPENSSH PRIVATE KEY----- and ends -----END OPENSSH PRIVATE KEY-----). It's a secret: paste it nowhere else."
say "Then add a DNS record in Cloudflare: type A, name 'staging', value 178.105.104.131."
