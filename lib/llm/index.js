/**
 * Shared LLM module for te.js: generic client and parse utilities.
 * Used by auto-docs, error-inference, and future LLM features.
 */

export { LLMProvider, createProvider } from './client.js';
export { extractJSON, extractJSONArray, reconcileOrderedTags } from './parse.js';
