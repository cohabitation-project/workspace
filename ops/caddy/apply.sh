#!/usr/bin/env bash
# Render ops/caddy/Caddyfile.template with Cloudflare's current address ranges, check it, install it, reload
# Caddy, and roll back by itself if the site stops answering. Run ON the server, from ~/workspace:
#   sudo bash ops/caddy/apply.sh
set -euo pipefail
cd "$(dirname "$0")"
ranges="$( { curl -fsS https://www.cloudflare.com/ips-v4; echo; curl -fsS https://www.cloudflare.com/ips-v6; } | tr -s ' \n\r\t' ' ' | sed 's/^ *//; s/ *$//' )"
count=$(wc -w <<<"$ranges")
if [ "$count" -lt 10 ]; then echo "Got only $count Cloudflare ranges; refusing to continue." >&2; exit 1; fi
new=$(mktemp); sed "s#__CF_RANGES__#${ranges}#" Caddyfile.template > "$new"
caddy validate --config "$new" --adapter caddyfile >/dev/null
backup="/etc/caddy/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)"
cp /etc/caddy/Caddyfile "$backup"
install -m 0644 "$new" /etc/caddy/Caddyfile
systemctl reload caddy
sleep 2
ok=1
for host in cohabi.org ashram.lastoftherealestate.com; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$host/api/status" || true)
  echo "$host -> $code"; [ "$code" = 200 ] || ok=0
done
if [ "$ok" = 1 ]; then
  echo "Done. $count Cloudflare ranges trusted. Backup of the old file: $backup"
else
  echo "A site did not answer 200. Rolling back to $backup." >&2
  cp "$backup" /etc/caddy/Caddyfile; systemctl reload caddy; exit 1
fi
