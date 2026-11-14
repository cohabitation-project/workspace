# Backups

**Why:** until 2026-11-14 there were no copies of the Commons data or the mail anywhere except the one server.

**On the server:** `ops/backup/commons-backup.sh` runs at 03:17 and 15:17 UTC and keeps 7 days of snapshots in
`/var/backups/commons` (readable by root and geoffrey only). Each snapshot holds the Commons data dir, the server `.env`,
the Stalwart mail data (Stalwart pauses for a few seconds while it's copied) and the Caddyfile. Install once with
`sudo bash ~/workspace/ops/backup/install.sh`.

**Locking:** `ops/backup/lock-setup.sh` (once) makes an age key pair. The server keeps only the public half, so it can
lock copies but never open them. Every run also writes a locked copy to `/var/backups/commons/offsite/*.age`. The
private key goes on Geoffrey's backup drive and in the vault, and is deleted from the server. Lose it and the locked
copies can't be opened, so keep two copies of it.

**Off the server:** Geoffrey's Mac pulls the LOCKED copies (`offsite/*.age`) twice a day onto his 1 TB drive with `rsync` over SSH (a crontab line,
set up once). The Mac has to be awake at those times; if it misses one, the next run catches up.

**Restore (outline):** stop pm2 and Stalwart, untar the snapshot at `/`, restore Stalwart's data from the inner
`stalwart.tgz`, start Stalwart and pm2. Test a restore on a spare machine before relying on it.

**Sensitive:** snapshots include the `.env` keys and everyone's mail. Keep the SSD with you; the vault records where it is.

**Set up 2026-11-14 (done):** lock key made, first locked copy on Geoffrey's Seagate drive (`cohabi-backups/`), key
deleted from the server (it lives on the drive; a second copy goes in Geoffrey's password manager). His Mac pulls new
locked copies at 9:30 and 21:30 Phoenix time via crontab, logging to `~/cohabi-backup-pull.log`. Check that log after
the first scheduled run: if macOS blocks cron from the external drive, give `cron` Full Disk Access in System Settings.
