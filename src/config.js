import fs from 'node:fs';
import path from 'node:path';

const SPEND_LOG = path.join(process.cwd(), 'logs', 'daily-spend.jsonl');

/**
 * Loads the multi-agent council configuration.
 *
 * Returns { discordToken, operatorName, agents[], contextPack, packHash, cooldownMs, maxTokens }
 * Each agent: { name, provider, model, apiKey, dailyTokenCap, systemPrompt, tokensUsedToday, capResetDate }
 */
export function loadConfig() {
  // --- Required env ---
  const discordToken = requireEnv('DISCORD_BOT_TOKEN');
  const operatorName = process.env.OPERATOR_NAME || 'Geoffrey Cooper Jr.';

  // --- Load agents roster ---
  const agentsPath = path.join(process.cwd(), 'config', 'agents.json');
  if (!fs.existsSync(agentsPath)) {
    console.error(`Missing ${agentsPath} — copy config/agents.json.example or create it.`);
    process.exit(1);
  }
  const roster = JSON.parse(fs.readFileSync(agentsPath, 'utf-8'));

  // --- Load context pack ---
  const packPath = path.join(process.cwd(), 'docs', 'context-pack.md');
  const hashPath = path.join(process.cwd(), 'docs', 'context-pack-hash.txt');
  let contextPack = '';
  let packHash = 'no-pack';

  if (fs.existsSync(packPath)) {
    contextPack = fs.readFileSync(packPath, 'utf-8');
    if (fs.existsSync(hashPath)) {
      packHash = fs.readFileSync(hashPath, 'utf-8').trim();
    }
  } else {
    console.warn('WARN: docs/context-pack.md not found. Run: npm run context');
  }

  // --- Load per-agent system prompt overrides ---
  const contextDir = path.join(process.cwd(), 'context');
  let conductRules = '';
  const conductPath = path.join(contextDir, '03-conduct.md');
  if (fs.existsSync(conductPath)) {
    conductRules = fs.readFileSync(conductPath, 'utf-8');
  }

  // --- Build agent configs ---
  const today = utcDateStr();
  const agents = roster.map(a => {
    const apiKey = process.env[a.apiKeyEnv];
    if (!apiKey) {
      console.error(`Missing env var ${a.apiKeyEnv} for agent "${a.name}"`);
      process.exit(1);
    }

    // System prompt: context pack + conduct rules + any per-agent file
    let systemPrompt = contextPack;
    if (conductRules) systemPrompt += '\n\n---\n\n' + conductRules;

    if (a.system_prompt_file) {
      const extra = path.join(process.cwd(), a.system_prompt_file);
      if (fs.existsSync(extra)) {
        systemPrompt += '\n\n---\n\n' + fs.readFileSync(extra, 'utf-8');
      }
    }

    return {
      name: a.name,
      provider: a.provider,
      model: a.model,
      apiKey,
      council: a.council !== false,
      dailyTokenCap: a.dailyTokenCap || 200000,
      systemPrompt,
      tokensUsedToday: 0,
      capResetDate: today,
    };
  });

  return {
    discordToken,
    operatorName,
    agents,
    contextPack,
    packHash,
    cooldownMs: parseInt(process.env.COOLDOWN_MS || '5000', 10),
    maxTokens: parseInt(process.env.MAX_TOKENS || '4096', 10),
  };
}

/** Check daily cap, reset if new day. Returns true if under cap. */
export function checkTokenCap(agent) {
  const today = utcDateStr();
  if (agent.capResetDate !== today) {
    // Log yesterday's spend before resetting
    if (agent.tokensUsedToday > 0) {
      logDailySpend(agent);
    }
    agent.tokensUsedToday = 0;
    agent.capResetDate = today;
  }
  return agent.tokensUsedToday < agent.dailyTokenCap;
}

/** Record token usage. */
export function recordTokens(agent, count) {
  agent.tokensUsedToday += count;
}

/** Log daily spend per agent to JSONL. */
function logDailySpend(agent) {
  try {
    fs.mkdirSync(path.dirname(SPEND_LOG), { recursive: true });
    const entry = {
      date: agent.capResetDate,
      agent: agent.name,
      model: agent.model,
      provider: agent.provider,
      tokens: agent.tokensUsedToday,
      cap: agent.dailyTokenCap,
      pct: Math.round((agent.tokensUsedToday / agent.dailyTokenCap) * 100),
    };
    fs.appendFileSync(SPEND_LOG, JSON.stringify(entry) + '\n');
    console.log(`[Spend] ${agent.name}: ${agent.tokensUsedToday.toLocaleString()} tokens (${entry.pct}% of ${agent.dailyTokenCap.toLocaleString()} cap)`);
  } catch { /* never crash on logging */ }
}

function requireEnv(key) {
  const val = process.env[key];
  if (!val) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
}

function utcDateStr() {
  return new Date().toISOString().slice(0, 10);
}
