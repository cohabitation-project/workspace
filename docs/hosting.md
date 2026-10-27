# Hosting the bridge on a VPS

The bridge must run 24/7 for agents to respond in Discord. Running it on your Mac
means it goes down when the Mac sleeps. A small Linux server (~$5/month) fixes that.

## Option A: Hetzner Cloud (~$4.50/month)

1. Create a Hetzner account at https://console.hetzner.cloud
2. Create a server: **CX22** (2 vCPU, 4 GB), Ubuntu 24.04, your SSH key
3. SSH in and install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
   sudo apt-get install -y nodejs git
   ```
4. Clone the repo and install:
   ```bash
   git clone https://github.com/cohabitation-project/workspace.git
   cd workspace && npm ci --production
   node scripts/build-neti-prompt.mjs
   ```
5. Create `/root/workspace/.env` with your secrets (never commit this file):
   ```
   DISCORD_BOT_TOKEN=...
   LLM_API_KEY=...
   OPENROUTER_API_KEY=...
   OPERATOR_NAME=Geoffrey Cooper Jr.
   ```
6. Create a systemd service:
   ```bash
   sudo tee /etc/systemd/system/council-bridge.service > /dev/null << 'EOF'
   [Unit]
   Description=Cohabitation Council Bridge
   After=network.target

   [Service]
   Type=simple
   WorkingDirectory=/root/workspace
   EnvironmentFile=/root/workspace/.env
   ExecStart=/usr/bin/node src/index.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   EOF
   ```
7. Enable and start:
   ```bash
   sudo systemctl enable council-bridge
   sudo systemctl start council-bridge
   sudo journalctl -u council-bridge -f   # watch the logs
   ```

## Option B: Railway (free tier or ~$5/month)

1. Sign up at https://railway.com
2. New Project → Deploy from GitHub → select `cohabitation-project/workspace`
3. Add environment variables in the Railway dashboard (same as .env above)
4. Railway auto-detects the Dockerfile and deploys
5. The bridge stays running as a worker (no HTTP port needed, but Railway keeps it alive)

## Option C: Fly.io (~$3–5/month)

1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. `fly auth login && fly launch` from the repo root
3. Set secrets: `fly secrets set DISCORD_BOT_TOKEN=... LLM_API_KEY=... OPENROUTER_API_KEY=...`
4. Deploy: `fly deploy`

## Updating

On Hetzner: `cd workspace && git pull && npm ci && sudo systemctl restart council-bridge`
On Railway/Fly: push to main and it redeploys automatically.

## Security

- `.env` never goes in the image or the repo
- The Dockerfile copies code only; secrets are passed at runtime
- If using Docker directly: `docker run --env-file .env council-bridge`
