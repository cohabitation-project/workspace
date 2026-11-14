# Account settings: research and plan (2026-11-14)

*Setu, for Geoffrey: "we're gonna have to make settings on there like any other social site... privacy settings,
download your data, delete your account."*

## What the rules require

- **Apple (App Store guideline 5.1.1(v)):** an app that lets people make an account must let them start deleting it
  inside the app, easy to find. Deactivating is not enough. This matters for Wake Up & Write and any Cohabi app.
  [Apple](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
- **Google Play (user data policy, since 2024):** the same in the app, **plus a web link** where someone can ask for
  deletion without installing the app. The link goes in the Play Console Data safety form, has to work, has to make the
  deletion path easy to find, and has to name the app or developer. Deleting an account must delete its data.
  [Google](https://support.google.com/googleplay/android-developer/answer/13327111)
- **GDPR (people in Europe):** a right to a copy of your data, and to take it elsewhere "in a structured, commonly
  used, machine-readable format" (JSON or CSV), and a right to erasure. Answer within one month. Backups must be
  handled by their retention policy. California's law is similar.

## How the big networks group settings

- **Instagram/Facebook (Accounts Center):** personal details; password and security (2FA, login alerts, where you're
  logged in); your information and permissions (download, transfer, search history); ad preferences; payments.
  Download comes as HTML or JSON.
- **Bluesky:** account; privacy and security (2FA by email code, app passwords, hide posts from signed-out viewers);
  moderation (content filters, muted words, block lists); content and media; languages. Export is a single file.
- **Mastodon:** profile; preferences; account (sessions you can revoke, move, delete); import and export (CSV per kind).

## Recommended settings for Cohabi, and status

| Group | Setting | Status |
|---|---|---|
| Notifications | On/off per device, what pings you, quiet hours | **Built** (🔔 in header, Account settings) |
| Your data | Download your data (one JSON file, no secrets) | **Built** `/account/data` |
| Your data | Delete your account (type your name, happens at once) | **Built** `/account/delete` |
| Your data | Public deletion page for app stores | **Built** `/delete-account` (the Google Play link) |
| Privacy | Who can message you: everyone / friends only | Next (needs your yes) |
| Privacy | Who can see your profile: everyone / signed-in people | Next (needs your yes) |
| Privacy | Show me in the Members list: yes / no | Next |
| Privacy | Who can tag you | Next |
| Security | Where you're signed in, with "sign out everywhere" | Next |
| Security | Two-step sign-in | Later |
| Security | How Cohabi protects you (the continuity spine explainer) | When the spine is finished |
| Profile | Name, picture, bio | Exists on your profile page |

## What delete does (built and tested)

Erased from the files, not hidden: profile (becomes "Deleted member"), sign-in (all devices signed out; password and
Google/GitHub links stop working), posts and the comments under them, your comments, reactions, shares, friendships,
the words of messages you sent, journals, pictures, notification devices, and your name in the join notices.
Kept, and said so on the page: coin entries (the cooperative's books, pointing at "Deleted member") and the other
person's own words in conversations. Backups roll over in 7 days. Anything not reached automatically (Commons room
messages, hosted agents) is written to a deletion record for a steward to finish within 30 days.

## Open questions for Geoffrey

1. Privacy defaults: should new people be messageable by everyone (today) or friends only?
2. Should profiles stay visible to signed-out visitors (today) by default?
3. The `support@cohabi.org` address is named as the way to ask for deletion if you can't sign in. It needs to reach a
   person once mail works.
