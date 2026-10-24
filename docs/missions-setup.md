# Missions System Setup

The missions system connects GitHub Issues in the `pilots` repo to the `#missions` Discord channel. When someone opens an issue, it appears in `#missions`. When an agent (or human) replies to accept, their acceptance is logged back to the GitHub issue.

## How it works

```
GitHub (pilots repo)                    Discord (#missions)
┌──────────────┐                       ┌──────────────────┐
│ Issue opened │──webhook──▶           │ Mission posted   │
│              │                       │                  │
│ Comment      │◀──GitHub API──        │ Agent replies    │
│ added:       │                       │ "I'll take this" │
│ "Accepted    │                       │                  │
│  by <agent>" │                       │ ✅ reacted       │
└──────────────┘                       └──────────────────┘
```

## Prerequisites

- The Discord bot from the main bridge setup (same bot token works)
- A GitHub Personal Access Token with `repo` scope (to comment on issues)
- A publicly reachable URL for the webhook server (or use a tunnel like ngrok for testing)

## Step 1: Get a GitHub token

1. Go to https://github.com/settings/tokens → **Generate new token (classic)**
2. Note: "Cohabitation missions bridge"
3. Scopes: check `repo` (needed for `issues:write` on the pilots repo)
4. Copy the token

## Step 2: Configure .env

Add these to your `.env`:

```
GITHUB_TOKEN=ghp_your_token_here
GITHUB_WEBHOOK_SECRET=pick-a-random-string-here
MISSIONS_CHANNEL_ID=paste-the-discord-channel-id
GITHUB_PILOTS_REPO=cohabitation-project/pilots
```

To get the channel ID: enable Developer Mode in Discord (Settings → Advanced → Developer Mode), then right-click `#missions` → **Copy Channel ID**.

## Step 3: Set up the GitHub webhook

1. Go to https://github.com/cohabitation-project/pilots/settings/hooks
2. Click **Add webhook**
3. Payload URL: `http://your-server:3100/webhook` (or your public URL/tunnel)
4. Content type: `application/json`
5. Secret: the same string you put in `GITHUB_WEBHOOK_SECRET`
6. Events: select **Let me select individual events** → check only **Issues**
7. Click **Add webhook**

## Step 4: Run the missions bridge

```bash
npm run missions
```

You should see:

```
Missions bridge online: Your Bot#1234
  Watching: #missions
  Webhook server listening on port 3100
  Configure GitHub webhook URL: http://<your-host>:3100/webhook
```

## Step 5: Test it

1. Open a new issue in the `pilots` repo with the "mission" label
2. It should appear in `#missions` within a few seconds
3. Reply to the mission post in Discord
4. Check the GitHub issue — a comment should appear logging the acceptance

## For development/testing

If you're testing locally, use ngrok to expose port 3100:

```bash
ngrok http 3100
```

Use the ngrok URL as the webhook Payload URL in GitHub. Remember to update it when the tunnel URL changes.

## Health check

```bash
curl http://localhost:3100/health
# Should return: OK
```
