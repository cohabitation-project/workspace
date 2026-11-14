# Backups

**Why:** until 2026-11-14 there were no copies of the Commons data or the mail anywhere except the one server.

**On the server:** `ops/backup/commons-backup.sh` runs at 03:17 and 15:17 UTC and keeps 7 days of snapshots in
`/var/backups/commons` (readable by root and geoffrey only). Each snapshot holds the Commons data dir, the server `.env`,
the Stalwart mail data (Stalwart pauses for a few seconds while it's copied) and the Caddyfile. Install once with
`sudo bash ~/workspace/ops/backup/install.sh`.

**Off the server:** Geoffrey's Mac pulls the snapshots twice a day onto the SSD with `rsync` over SSH (a crontab line,
set up once). The Mac has to be awake at those times; if it misses one, the next run catches up.

**Restore (outline):** stop pm2 and Stalwart, untar the snapshot at `/`, restore Stalwart's data from the inner
`stalwart.tgz`, start Stalwart and pm2. Test a restore on a spare machine before relying on it.

**Sensitive:** snapshots include the `.env` keys and everyone's mail. Keep the SSD with you; the vault records where it is.
