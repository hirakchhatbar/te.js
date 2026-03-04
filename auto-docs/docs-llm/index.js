/**
 * LLM provider for auto-documentation (docs-specific).
 * Use createProvider(config) with baseURL, apiKey, model.
 * For the generic LLM client only, use lib/llm.
 */

export { LLMProvider, createProvider, extractJSON, extractJSONArray, reconcileOrderedTags } from './provider.js';
