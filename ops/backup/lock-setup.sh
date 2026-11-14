#!/usr/bin/env bash
# One-time: make the lock for off-server backups. Run on the Commons server: bash ~/workspace/ops/backup/lock-setup.sh
# It makes a key pair. The PUBLIC half stays on the server (it can only lock). The PRIVATE half (the only thing that
# opens the backups) is written to ~/cohabi-backup-KEY.txt for you to copy to your backup drive, then delete here.
set -euo pipefail
command -v age >/dev/null || sudo apt-get install -y age >/dev/null
[ -e ~/cohabi-backup-KEY.txt ] && { echo "A key file is already here (~/cohabi-backup-KEY.txt). Copy it to your drive first."; exit 1; }
umask 077; age-keygen -o ~/cohabi-backup-KEY.txt 2>/dev/null
grep -o 'age1[0-9a-z]*' ~/cohabi-backup-KEY.txt | sudo tee /etc/commons-backup.recipient >/dev/null
sudo chmod 644 /etc/commons-backup.recipient
sudo install -m 750 -o root -g root ~/workspace/ops/backup/commons-backup.sh /usr/local/bin/commons-backup
sudo /usr/local/bin/commons-backup
echo; echo "Done. Locked copies:"; ls -lh /var/backups/commons/offsite/
echo; echo "NEXT, on your Mac: copy ~/cohabi-backup-KEY.txt to your backup drive (see ops/backup/README.md), then delete it here."
