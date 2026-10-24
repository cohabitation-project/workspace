/**
 * Unified LLM client — talks to Anthropic, OpenAI, Google, or OpenRouter
 * via their HTTP APIs. No SDK dependencies; just fetch.
 */

const ENDPOINTS = {
  anthropic: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
  google: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

/**
 * @param {object} config - from loadConfig()
 * @param {string} userMessage - the user/channel message
 * @param {Array<{role: string, content: string}>} history - recent conversation context
 * @returns {Promise<string>} the model's reply text
 */
export async function chat(config, userMessage, history = []) {
  const { provider, apiKey, model, systemContext, maxTokens } = config;

  if (provider === 'anthropic') {
    return chatAnthropic(apiKey, model, systemContext, userMessage, history, maxTokens);
  }
  if (provider === 'google') {
    return chatGoogle(apiKey, model, systemContext, userMessage, history, maxTokens);
  }
  // openai and openrouter share the same format
  const endpoint = provider === 'openrouter' ? ENDPOINTS.openrouter : ENDPOINTS.openai;
  return chatOpenAI(apiKey, model, systemContext, userMessage, history, maxTokens, endpoint);
}

async function chatAnthropic(apiKey, model, system, userMessage, history, maxTokens) {
  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await fetch(ENDPOINTS.anthropic, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, system, messages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content.map(b => b.text).join('');
}

async function chatOpenAI(apiKey, model, system, userMessage, history, maxTokens, endpoint) {
  const messages = [
    { role: 'system', content: system },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI-compatible API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function chatGoogle(apiKey, model, system, userMessage, history, maxTokens) {
  const url = ENDPOINTS.google.replace('{model}', model) + `?key=${apiKey}`;

  const contents = [];
  if (system) {
    contents.push({ role: 'user', parts: [{ text: `[System context]\n${system}` }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow this context.' }] });
  }
  for (const m of history) {
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts.map(p => p.text).join('');
}
