/**
 * Unified LLM client — talks to Anthropic, OpenAI, Google, or OpenRouter
 * via their HTTP APIs. No SDK dependencies; just fetch.
 *
 * Accepts per-agent config so each agent can use a different provider/model/key.
 */

// Node 20's fetch (undici) throws "Cannot convert argument to a ByteString"
// when the request body string contains non-ASCII (em dashes, smart quotes, etc.).
// Encoding to a Buffer avoids this.
const jsonBody = (obj) => Buffer.from(JSON.stringify(obj), 'utf-8');

const ENDPOINTS = {
  anthropic: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
  google: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

/**
 * @param {object} agent - { provider, apiKey, model, systemPrompt }
 * @param {string} userMessage
 * @param {Array<{role: string, content: string}>} history
 * @param {number} maxTokens
 * @returns {Promise<{text: string, tokensUsed: number}>}
 */
export async function chat(agent, userMessage, history = [], maxTokens = 1024) {
  const { provider, apiKey, model, systemPrompt } = agent;

  if (provider === 'anthropic') {
    return chatAnthropic(apiKey, model, systemPrompt, userMessage, history, maxTokens);
  }
  if (provider === 'google') {
    return chatGoogle(apiKey, model, systemPrompt, userMessage, history, maxTokens);
  }
  // openai and openrouter share the same format
  const endpoint = provider === 'openrouter' ? ENDPOINTS.openrouter : ENDPOINTS.openai;
  return chatOpenAI(apiKey, model, systemPrompt, userMessage, history, maxTokens, endpoint);
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
    body: jsonBody({ model, system, messages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const stopReason = data.stop_reason ?? 'unknown';
  const text = (data.content ?? []).map(b => b.text ?? '').join('');
  const tokensUsed = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

  console.log(`[Anthropic] model=${model} stop_reason=${stopReason} content_blocks=${(data.content ?? []).length} output_tokens=${data.usage?.output_tokens ?? '?'} text_length=${text.length}`);

  if (stopReason === 'max_tokens') {
    console.warn(`[Anthropic] Response truncated (max_tokens=${maxTokens}). Consider increasing MAX_TOKENS.`);
  }

  return { text, tokensUsed, stopReason };
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
    body: jsonBody({ model, messages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI-compatible API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices[0].message.content ?? '';
  const stopReason = data.choices[0].finish_reason ?? 'unknown';
  const tokensUsed = (data.usage?.total_tokens) ?? (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);
  return { text, tokensUsed, stopReason };
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
    body: jsonBody({
      contents,
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? '').join('');
  const stopReason = data.candidates?.[0]?.finishReason ?? 'unknown';
  const tokensUsed = data.usageMetadata?.totalTokenCount ?? 0;
  return { text, tokensUsed, stopReason };
}
