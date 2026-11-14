#!/usr/bin/env bash
# One-time setup on the Commons server: sudo bash ~/workspace/ops/backup/install.sh
set -euo pipefail
install -m 750 -o root -g root /home/geoffrey/workspace/ops/backup/commons-backup.sh /usr/local/bin/commons-backup
printf '%s\n' 'SHELL=/bin/bash' '17 3,15 * * * root /usr/local/bin/commons-backup >/dev/null 2>&1' > /etc/cron.d/commons-backup
chmod 644 /etc/cron.d/commons-backup
/usr/local/bin/commons-backup
echo "First backup made:"; ls -lh /var/backups/commons/
