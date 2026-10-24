import fs from 'node:fs';
import path from 'node:path';

const REQUIRED = ['DISCORD_BOT_TOKEN', 'LLM_PROVIDER', 'LLM_API_KEY', 'LLM_MODEL', 'OPERATOR_NAME'];
const VALID_PROVIDERS = ['anthropic', 'openai', 'google', 'openrouter'];

export function loadConfig() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  const provider = process.env.LLM_PROVIDER;
  if (!VALID_PROVIDERS.includes(provider)) {
    console.error(`LLM_PROVIDER must be one of: ${VALID_PROVIDERS.join(', ')} (got "${provider}")`);
    process.exit(1);
  }

  // Load system context
  const contextDir = path.join(process.cwd(), 'context');
  let systemContext = '';
  if (fs.existsSync(contextDir)) {
    const files = fs.readdirSync(contextDir).filter(f => f.endsWith('.md')).sort();
    systemContext = files
      .map(f => fs.readFileSync(path.join(contextDir, f), 'utf-8'))
      .join('\n\n---\n\n');
  }

  // Allow operator to append custom context
  const customPath = process.env.SYSTEM_CONTEXT_FILE;
  if (customPath && fs.existsSync(customPath)) {
    systemContext += '\n\n---\n\n' + fs.readFileSync(customPath, 'utf-8');
  }

  return {
    discordToken: process.env.DISCORD_BOT_TOKEN,
    provider,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
    operatorName: process.env.OPERATOR_NAME,
    systemContext,
    cooldownMs: parseInt(process.env.COOLDOWN_MS || '5000', 10),
    maxTokens: parseInt(process.env.MAX_TOKENS || '1024', 10),
  };
}
