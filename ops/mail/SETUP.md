# Cohabi mail server: setup (Stalwart on its own small server)

Setu, 2026-11-13, for Geoffrey. Plan and reasons: docs/design/cohabi-email-plan-v0.md.
Who gets an address: Commons members and cooperative members get name@cohabi.org; free (social-only) members don't.

Everything below is run from the Mac's Terminal over SSH. No Hetzner web-console terminal needed.

## 1. Order the server (Hetzner Cloud Console)
- Same project as the Commons server. Location: Falkenstein (fsn1), like the Commons.
- Image: Ubuntu 24.04. Type: the cheapest shared-CPU type with at least 2 GB RAM (4 GB is comfortable).
- Networking: public IPv4 on (mail needs it) and IPv6.
- SSH key: the same key the Mac already uses.
- Backups: on (about 20% extra). Mail is the one thing people can't afford to lose.
- Name: `cohabi-mail`. Write down its IPv4 address: called NEWIP below.

## 2. DNS for mail.cohabi.org (Cloudflare → cohabi.org → DNS)
- First check: are there already MX records for cohabi.org? If yes, tell Setu before changing anything.
- Add: type A, name `mail`, value NEWIP, Proxy status **DNS only (grey cloud)**. Mail can't go through Cloudflare's orange cloud.

## 3. Reverse DNS (Hetzner Cloud Console)
- Server `cohabi-mail` → Networking → the IPv4 address → Edit reverse DNS → `mail.cohabi.org`.
- Without this, Gmail treats our mail as suspicious.

## 4. Firewall and install (Mac Terminal)
```
ssh root@NEWIP
ufw allow 22/tcp && ufw allow 25/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 465/tcp && ufw allow 587/tcp && ufw allow 993/tcp && ufw --force enable
curl --proto '=https' --tlsv1.2 -sSf https://get.stalw.art/install.sh -o install.sh
sh install.sh
journalctl -u stalwart -n 200 | grep -A8 -i 'bootstrap\|password'
```
Copy the temporary admin password it shows. Don't paste it in any chat or room.

## 5. The setup wizard (through a private tunnel)
In a second Mac Terminal window:
```
ssh -L 8080:127.0.0.1:8080 root@NEWIP
```
Then open http://localhost:8080/admin in the browser and sign in as `admin` with that password.
- Server hostname: `mail.cohabi.org`
- Default domain: `cohabi.org`
- TLS: Let's Encrypt (automatic)
- Storage and directory: the defaults (the Cohabi sign-in comes later)
- DNS: manual
Change the admin password right away and keep it in a password manager.

## 6. The mail DNS records
Stalwart then lists the records for cohabi.org: MX, SPF (TXT), DKIM (TXT), DMARC (TXT), and a few for mail-app autoconfiguration.
Add every one in Cloudflare, all **DNS only**. Send Setu a screenshot of the list and of Cloudflare afterwards so the two can be checked against each other.

## 7. Ask Hetzner to open outgoing mail (ports 25 and 465)
Hetzner Console → Support → new request about unblocking mail ports (a "limit request"). Suggested text:

> Hello, please unblock outgoing ports 25 and 465 for our cloud server cohabi-mail (IP NEWIP). It runs Stalwart as the mail server for our own domain, cohabi.org: the personal mailboxes of the members of our cooperative, plus support@ and hello@. No newsletters or bulk mail. Expected volume at the start is under 100 messages a day. SPF, DKIM, DMARC and reverse DNS (mail.cohabi.org) are set up, and outgoing mail is rate-limited per account. Thank you.

Receiving works without this. Sending to the outside waits for it.

## 8. First mailboxes
In the admin: Accounts → create `geoffrey@cohabi.org`; then `support@` and `hello@` (as aliases to Geoffrey's mailbox for now). Test: send from Gmail to geoffrey@cohabi.org.

## After this (Setu)
Outgoing limits per account (with a wait for brand-new accounts), the spam filter, backups, then Cohabi sign-in (OIDC), the branded inbox, and member and agent addresses.
