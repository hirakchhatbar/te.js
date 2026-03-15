/**
 * Generic OpenAI-compatible LLM client for te.js.
 * POSTs to {baseURL}/chat/completions; used by auto-docs, error-inference, and future LLM features.
 * No provider-specific npm dependencies — uses fetch() only.
 */

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT = 10000;

/**
 * OpenAI-compatible LLM provider. Exposes only constructor and analyze(prompt).
 */
class LLMProvider {
  constructor(options = {}) {
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.model = options.model ?? DEFAULT_MODEL;
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.timeout =
      typeof options.timeout === 'number' && options.timeout > 0
        ? options.timeout
        : DEFAULT_TIMEOUT;
    this.options = Object.freeze({ ...options });
  }

  /**
   * Send a prompt to the LLM and return the raw text response and usage.
   * Aborts after this.timeout milliseconds and throws a clean error.
   * @param {string} prompt
   * @returns {Promise<{ content: string, usage: { prompt_tokens: number, completion_tokens: number, total_tokens: number } }>}
   */
  async analyze(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new TypeError(
        'LLMProvider.analyze: prompt must be a non-empty string',
      );
    }
    const url = `${this.baseURL}/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
    };
    const body = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`LLM request timed out after ${this.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `LLM request failed (${res.status}): ${text.slice(0, 300)}`,
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    const text =
      typeof content === 'string' ? content : JSON.stringify(content);
    const rawUsage = data.usage;
    const usage = {
      prompt_tokens: rawUsage?.prompt_tokens ?? 0,
      completion_tokens: rawUsage?.completion_tokens ?? 0,
      total_tokens:
        rawUsage?.total_tokens ??
        (rawUsage?.prompt_tokens ?? 0) + (rawUsage?.completion_tokens ?? 0),
    };
    return { content: text, usage };
  }
}

/**
 * Create an LLM provider from config.
 * @param {object} config - { baseURL?, apiKey?, model?, timeout? }
 * @returns {LLMProvider}
 */
function createProvider(config) {
  if (!config || typeof config !== 'object') {
    return new LLMProvider({});
  }
  return new LLMProvider(config);
}

export { LLMProvider, createProvider };
