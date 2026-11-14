# Cohabi mail server: setup on the Commons server (Stalwart)

Setu, 2026-11-13, for Geoffrey. Plan and reasons: docs/design/cohabi-email-plan-v0.md.
Who gets an address: Commons members and cooperative members get name@cohabi.org; free (social-only) members don't.

Decision (2026-11-13): run Stalwart on the Commons server (178.105.104.131) for now. It had 2.5 GB memory available,
28 GB disk free, 2 cores, and nothing on the mail ports. When the membership grows, Stalwart moves to its own server
by copying its data and changing two DNS records: addresses, passwords and mail stay the same, nobody re-signs up.
Not on the RollinHost/Firedamm server: different business, paying customers.

Run from the Mac's Terminal. Stop where it says to send Setu a screenshot.

## 1. Cloudflare → cohabi.org → DNS
- Check for existing MX records first. If there are any, tell Setu before changing anything.
- Add: type A, name `mail`, value `178.105.104.131`, Proxy status **DNS only (grey cloud)**.

## 2. Reverse DNS (Hetzner Cloud Console)
Server ubuntu-4gb-fsn1-2 → Networking → the IPv4 address → Edit reverse DNS → `mail.cohabi.org`. The website doesn't use this; mail does.

## 3. Swap, firewall check, install
```
ssh geoffrey@178.105.104.131
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo ufw status
```
If ufw says `Status: active`, also run: `sudo ufw allow 25/tcp && sudo ufw allow 465/tcp && sudo ufw allow 587/tcp && sudo ufw allow 993/tcp`.
If it says `inactive`, leave it. Don't turn it on here: that could lock the server.
Also check the Hetzner Console → Firewalls: if a firewall is attached to this server, add inbound TCP 25, 465, 587 and 993.
```
curl --proto '=https' --tlsv1.2 -sSf https://get.stalw.art/install.sh -o install.sh
sudo sh install.sh
sudo journalctl -u stalwart -n 200 | grep -A8 -i 'bootstrap\|password'
```
Copy the temporary admin password. Don't paste it in any chat or room.

## 4. Caddy: let mail.cohabi.org through to Stalwart's web side
```
cd ~/workspace && git pull && sudo bash ops/caddy/apply.sh
```
(It checks itself and rolls back if the site stops answering.)

## 5. The setup wizard, through a private tunnel
Second Mac Terminal window: `ssh -L 8080:127.0.0.1:8080 geoffrey@178.105.104.131`, then open http://localhost:8080/admin and sign in as `admin`.
- Hostname `mail.cohabi.org`, default domain `cohabi.org`, DNS manual, storage and directory defaults.
- **Stop at the TLS / listener step and send Setu a screenshot.** Caddy already owns ports 80 and 443 on this server, so Stalwart's web side must stay on 127.0.0.1:8080 and its certificate is best fetched through Cloudflare (a "DNS-01" challenge with a Cloudflare API token limited to the cohabi.org DNS). Setu will say exactly what to pick.
- Change the admin password straight away; keep it in a password manager.

## 6. The mail DNS records
Stalwart lists MX, SPF, DKIM, DMARC and autoconfig records. Add each in Cloudflare, **DNS only**. Screenshot both lists for Setu.

## 7. Hetzner: open outgoing mail (ports 25 and 465)
Hetzner Console → Support → new limit request. Text:

> Hello, please unblock outgoing ports 25 and 465 for our cloud server ubuntu-4gb-fsn1-2 (IP 178.105.104.131). It runs Stalwart as the mail server for our own domain, cohabi.org: the personal mailboxes of the members of our cooperative, plus support@ and hello@. No newsletters or bulk mail. Expected volume at the start is under 100 messages a day. SPF, DKIM, DMARC and reverse DNS (mail.cohabi.org) are set up, and outgoing mail is rate-limited per account. Thank you.

## 8. First mailbox
Accounts → `geoffrey@cohabi.org`; `support@` and `hello@` as aliases to it for now. Test from Gmail.

## After this (Setu)
Per-account sending limits (new accounts wait before sending outside), spam filter, backups of Stalwart's data, Cohabi sign-in (OIDC), the branded inbox, member and agent addresses.

## 9. Connect Cobox (cohabi.org/cobox) to the mail server
Two secrets go in the server's `~/workspace/.env` (never in git, never in a chat):
```
ssh geoffrey@178.105.104.131
cd ~/workspace && echo "COMMONS_MAIL_SECRET=$(openssl rand -hex 32)" >> .env
nano .env        # add a line: COMMONS_MAIL_ADMIN_TOKEN=<the API key from Stalwart>
pm2 restart commons
```
- `COMMONS_MAIL_SECRET` locks the stored mailbox credentials. Made on the server, nobody needs to see it.
- `COMMONS_MAIL_ADMIN_TOKEN`: in the Stalwart admin, create an API key (account menu → API keys) for creating
  mailboxes. It is used only to create mailboxes, never to read mail. First version: a key on the admin account;
  next, a narrower "provisioner" role that can only create accounts.
Then open https://cohabi.org/cobox: Geoffrey connects geoffrey@cohabi.org with its password once; every other Commons
member gets "Create name@cohabi.org" with one click. Agents use the mail_status / mail_inbox / mail_read / mail_send tools.
