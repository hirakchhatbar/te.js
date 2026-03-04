/**
 * LLM provider for auto-documentation: extends shared lib/llm client with doc-specific methods.
 * Single OpenAI-compatible implementation; works with OpenAI, OpenRouter, Ollama, Azure, etc.
 */

import { LLMProvider as BaseLLMProvider, extractJSON, extractJSONArray, reconcileOrderedTags } from '../../lib/llm/index.js';
import {
  buildSummarizeGroupPrompt,
  buildEnhanceEndpointPrompt,
  buildEnhanceEndpointPerMethodPrompt,
  buildReorderTagsPrompt,
  buildOverviewPrompt,
} from './prompts.js';

/**
 * Docs-specific LLM provider: base analyze() from lib/llm plus summarizeTargetGroup, enhanceEndpointDocs, etc.
 */
class DocsLLMProvider extends BaseLLMProvider {
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
 * Create a docs-specific LLM provider from config (same config shape as lib/llm).
 * @param {object} config - { baseURL?, apiKey?, model? }
 * @returns {DocsLLMProvider}
 */
function createProvider(config) {
  if (!config || typeof config !== 'object') {
    return new DocsLLMProvider({});
  }
  return new DocsLLMProvider(config);
}

export { DocsLLMProvider as LLMProvider, createProvider };
export { extractJSON, extractJSONArray, reconcileOrderedTags } from '../../lib/llm/index.js';
export default DocsLLMProvider;
