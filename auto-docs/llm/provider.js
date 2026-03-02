/**
 * LLM provider for auto-documentation: single OpenAI-compatible implementation.
 * Works with OpenAI, OpenRouter, Ollama (OpenAI-compatible endpoint), Azure, etc.
 * Uses fetch() only — no provider-specific npm dependencies.
 */

import { extractJSON, extractJSONArray, reconcileOrderedTags } from './parse.js';
import {
  buildSummarizeGroupPrompt,
  buildEnhanceEndpointPrompt,
  buildEnhanceEndpointPerMethodPrompt,
  buildReorderTagsPrompt,
  buildOverviewPrompt,
} from './prompts.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * OpenAI-compatible LLM provider. POSTs to {baseURL}/chat/completions.
 */
class LLMProvider {
  constructor(options = {}) {
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.model = options.model ?? DEFAULT_MODEL;
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.options = options;
  }

  /**
   * Send a prompt to the LLM and return the raw text response.
   * @param {string} prompt
   * @returns {Promise<string>}
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

  /**
   * Summarize what a target file (group) does from its endpoints and handler context.
   * @param {string} groupId - Group id (e.g. target file path without .target.js)
   * @param {Array<object>} endpointsInfo - List of { path, methods, summary?, description?, handlerSource?, dependencySources? }
   * @param {string} [dependencySources] - Optional full context (target + dependencies) for Level 3
   * @returns {Promise<{ name: string, description: string }>} Tag name and description for OpenAPI
   */
  async summarizeTargetGroup(groupId, endpointsInfo, dependencySources = '') {
    if (!endpointsInfo?.length) {
      return { name: groupId, description: '', _usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
    }
    const prompt = buildSummarizeGroupPrompt(groupId, endpointsInfo, dependencySources);
    const { content: raw, usage } = await this.analyze(prompt);
    const json = extractJSON(raw);
    if (!json)
      return {
        name: groupId.split('/').pop() || groupId,
        description: '',
        _usage: usage,
      };
    return {
      name: json.name || groupId.split('/').pop() || groupId,
      description: (json.description || '').trim(),
      _usage: usage,
    };
  }

  /**
   * Build enhanced OpenAPI-style metadata for an endpoint from handler info.
   * @param {object} endpointInfo - { path, methods, metadata?, handlerSource?, dependencySources? }
   * @returns {Promise<object>} Enhanced metadata (summary, description, request?, response?)
   */
  async enhanceEndpointDocs(endpointInfo) {
    const { path } = endpointInfo;
    const prompt = buildEnhanceEndpointPrompt(endpointInfo);
    const { content: raw, usage } = await this.analyze(prompt);
    const json = extractJSON(raw);
    if (!json) return { summary: path, description: '', _usage: usage };
    return {
      summary: json.summary || path,
      description: json.description || '',
      ...(json.request && { request: json.request }),
      ...(json.response && { response: json.response }),
      _usage: usage,
    };
  }

  /**
   * Build method-specific OpenAPI metadata so each HTTP method gets its own summary, description, request, and response.
   * Returns an object keyed by lowercase method (get, put, post, delete, patch, head, options). If the LLM
   * returns a flat shape or omits methods, the caller should fall back to shared metadata.
   *
   * @param {object} endpointInfo - { path, methods, metadata?, handlerSource?, dependencySources? }
   * @returns {Promise<object>} Method-keyed metadata, e.g. { get: { summary, description?, response }, put: { summary, request?, response }, ... }
   */
  async enhanceEndpointDocsPerMethod(endpointInfo) {
    const prompt = buildEnhanceEndpointPerMethodPrompt(endpointInfo);
    const { content: raw, usage } = await this.analyze(prompt);
    const json = extractJSON(raw);
    if (!json || typeof json !== 'object') return { _usage: usage, _fallback: true };
    return { ...json, _usage: usage };
  }

  /**
   * Return tag names ordered by importance (most important first) for use in OpenAPI spec.tags.
   * @param {object} spec - OpenAPI 3 spec with spec.tags (array of { name, description? })
   * @returns {Promise<{ orderedTagNames: string[], _usage?: object }>}
   */
  async reorderTagsByImportance(spec) {
    const tags = spec?.tags ?? [];
    if (!tags.length) return { orderedTagNames: [], _usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
    const prompt = buildReorderTagsPrompt(spec);
    const { content: raw, usage } = await this.analyze(prompt);
    const parsed = extractJSON(raw) ?? extractJSONArray(raw);
    const orderedTagNames = Array.isArray(parsed)
      ? parsed.filter((n) => typeof n === 'string').map((n) => String(n).trim()).filter(Boolean)
      : tags.map((t) => t.name);
    const orderedTags = reconcileOrderedTags(orderedTagNames, tags);
    return {
      orderedTagNames: orderedTags.map((t) => t.name),
      _usage: usage,
      _orderedTags: orderedTags,
    };
  }

  /**
   * Generate a comprehensive project/API overview page in Markdown.
   * @param {object} spec - OpenAPI 3 spec (after reorder) with info, tags, paths
   * @param {object} [options] - { title?, version?, description? } (defaults from spec.info)
   * @returns {Promise<{ markdown: string, _usage?: object }>}
   */
  async generateOverviewPage(spec, options = {}) {
    const prompt = buildOverviewPrompt(spec, options);
    const { content: raw, usage } = await this.analyze(prompt);
    const markdown = typeof raw === 'string' ? raw.trim() : '';
    return { markdown, _usage: usage };
  }
}

/**
 * Create an LLM provider from config.
 * Single OpenAI-compatible setup: works with OpenAI, OpenRouter, Ollama (compat), Azure, etc.
 *
 * @param {object} config - { baseURL?, apiKey?, model? }
 *   - baseURL: e.g. 'https://api.openai.com/v1' | 'https://openrouter.ai/api/v1' | 'http://localhost:11434/v1'
 *   - apiKey: optional for local (e.g. Ollama); use OPENAI_API_KEY or OPENROUTER_API_KEY
 *   - model: e.g. 'gpt-4o-mini' | 'openai/gpt-4o-mini' (OpenRouter)
 * @returns {LLMProvider}
 */
function createProvider(config) {
  if (!config || typeof config !== 'object') {
    return new LLMProvider({});
  }
  return new LLMProvider(config);
}

export { LLMProvider, createProvider };
export { extractJSON, extractJSONArray } from './parse.js';
export default LLMProvider;
