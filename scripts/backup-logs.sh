#!/bin/bash
# backup-logs.sh — daily cron to commit logs/*.jsonl to the workspace repo.
# Append-only: never rewrites an existing day's file.
# Runs on circle via crontab.
#
# Install: crontab -e → add:
#   0 7 * * * /home/geoffrey/workspace/scripts/backup-logs.sh >> /home/geoffrey/workspace/logs/backup.log 2>&1

set -e
cd /home/geoffrey/workspace

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Log backup starting"

# Pull latest to avoid conflicts
git pull --ff-only || { echo "Pull failed, skipping backup"; exit 1; }

# Stage only jsonl files in logs/
git add logs/*.jsonl 2>/dev/null || true

# Check if anything changed
if git diff --cached --quiet; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) No new log data to commit"
  exit 0
fi

git config user.name "log-backup"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git commit -m "Log backup $(TZ=America/Phoenix date +%F)"
git push

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Log backup committed and pushed"
