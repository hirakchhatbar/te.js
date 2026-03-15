/**
 * Shared LLM module for te.js: generic client and parse utilities.
 * Used by auto-docs, error-inference, and future LLM features.
 */

/**
 * OpenAI-compatible LLM client.
 * @see {@link ./client.js}
 */
export { LLMProvider, createProvider } from './client.js';

/**
 * JSON parsing utilities for LLM responses.
 * @see {@link ./parse.js}
 */
export {
  extractJSON,
  extractJSONArray,
  reconcileOrderedTags,
} from './parse.js';
