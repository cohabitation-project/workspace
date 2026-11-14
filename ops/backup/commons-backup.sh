#!/usr/bin/env bash
# Twice-daily snapshot of everything the Commons can't rebuild from git (Geoffrey, 2026-11-14: "We need them right now.
# There's no copies."). Runs as root from /etc/cron.d/commons-backup. Keeps the newest 14 snapshots (7 days) in
# /var/backups/commons, readable only by root and geoffrey, so Geoffrey's Mac can pull copies to the SSD.
# What's in a snapshot: the Commons data dir (members, coins, ledger, posts, uploads), the server .env (keys and the
# mail sealing secret: without it, Cobox links can't be read back), the Stalwart mail data, and the Caddyfile.
set -euo pipefail
WS=/home/geoffrey/workspace
OUT=/var/backups/commons
KEEP=14
STAMP=$(date -u +%Y%m%d-%H%M)
mkdir -p "$OUT"; chmod 750 "$OUT"; chown root:geoffrey "$OUT"

# The Commons data dir: COMMONS_DATA from .env if set, else the server default.
DATA=$(grep -E '^COMMONS_DATA=' "$WS/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' || true)
[ -z "$DATA" ] && DATA="$WS/data/commons"
case "$DATA" in /*) ;; *) DATA="$WS/$DATA" ;; esac

# Stalwart's data: the common install locations.
STAL=""; for d in /opt/stalwart /var/lib/stalwart; do [ -d "$d" ] && STAL="$d" && break; done

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
LIST="$TMP/list"; : > "$LIST"
[ -d "$DATA" ] && echo "$DATA" >> "$LIST"
[ -f "$WS/.env" ] && echo "$WS/.env" >> "$LIST"
[ -f /etc/caddy/Caddyfile ] && echo /etc/caddy/Caddyfile >> "$LIST"
[ -f /etc/stalwart/stalwart.env ] && echo /etc/stalwart/stalwart.env >> "$LIST"

# The mail store is a live database: pause Stalwart for the few seconds its copy takes, so the copy is consistent.
# Incoming mail waits and retries; nothing is lost.
if [ -n "$STAL" ]; then
  systemctl stop stalwart || true
  tar -C / -czf "$TMP/stalwart.tgz" "${STAL#/}" || true
  systemctl start stalwart || true
  echo "$TMP/stalwart.tgz" >> "$LIST"
fi

FILE="$OUT/commons-$STAMP.tar.gz"
tar -czf "$FILE" -T "$LIST" 2>/dev/null
chmod 640 "$FILE"; chown root:geoffrey "$FILE"
ls -1t "$OUT"/commons-*.tar.gz | tail -n +$((KEEP+1)) | xargs -r rm -f
echo "$(date -u +%FT%TZ) $FILE $(du -h "$FILE" | cut -f1)" >> "$OUT/backup.log"

# Off-server copies are LOCKED (age encryption) to Geoffrey's public key. The key that opens them is not on this
# server: it lives on his backup drive and in the vault. So the drive, the RollinHost server or anyone who copies the
# files gets a box nobody can open without that key.
REC=/etc/commons-backup.recipient
if [ -s "$REC" ] && command -v age >/dev/null; then
  mkdir -p "$OUT/offsite"; chmod 750 "$OUT/offsite"; chown root:geoffrey "$OUT/offsite"
  age -R "$REC" -o "$OUT/offsite/$(basename "$FILE").age" "$FILE"
  chmod 640 "$OUT/offsite/"*.age; chown root:geoffrey "$OUT/offsite/"*.age
  ls -1t "$OUT"/offsite/*.age | tail -n +$((KEEP+1)) | xargs -r rm -f
fi
