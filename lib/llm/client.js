/**
 * Generic OpenAI-compatible LLM client for te.js.
 * POSTs to {baseURL}/chat/completions; used by auto-docs, error-inference, and future LLM features.
 * No provider-specific npm dependencies — uses fetch() only.
 */

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * OpenAI-compatible LLM provider. Exposes only constructor and analyze(prompt).
 */
class LLMProvider {
  constructor(options = {}) {
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.model = options.model ?? DEFAULT_MODEL;
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.options = options;
  }

  /**
   * Send a prompt to the LLM and return the raw text response and usage.
   * @param {string} prompt
   * @returns {Promise<{ content: string, usage: { prompt_tokens: number, completion_tokens: number, total_tokens: number } }>}
   */
  async analyze(prompt) {
    const url = `${this.baseURL}/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
    };
    const body = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const rawUsage = data.usage;
    const usage = {
      prompt_tokens: rawUsage?.prompt_tokens ?? 0,
      completion_tokens: rawUsage?.completion_tokens ?? 0,
      total_tokens: rawUsage?.total_tokens ?? (rawUsage?.prompt_tokens ?? 0) + (rawUsage?.completion_tokens ?? 0),
    };
    return { content: text, usage };
  }
}

/**
 * Create an LLM provider from config.
 * @param {object} config - { baseURL?, apiKey?, model? }
 * @returns {LLMProvider}
 */
function createProvider(config) {
  if (!config || typeof config !== 'object') {
    return new LLMProvider({});
  }
  return new LLMProvider(config);
}

export { LLMProvider, createProvider };
