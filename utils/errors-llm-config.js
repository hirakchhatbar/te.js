/**
 * Resolve and validate errors.llm configuration (LLM-inferred error codes/messages).
 * Uses ERRORS_LLM_* env vars with fallback to LLM_*.
 * Config file keys (e.g. errors.llm.baseURL) are standardized to ERRORS_LLM_BASEURL etc.
 */

import { env } from 'tej-env';

const MESSAGE_TYPES = /** @type {const} */ (['endUser', 'developer']);

/**
 * Normalize messageType to 'endUser' | 'developer'.
 * @param {string} v
 * @returns {'endUser'|'developer'}
 */
function normalizeMessageType(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'developer' || s === 'dev') return 'developer';
  return 'endUser'; // endUser, end_user, default
}

/**
 * Resolve errors.llm config from env (feature-specific then LLM_ fallback).
 * @returns {{ enabled: boolean, baseURL: string, apiKey: string, model: string, messageType: 'endUser'|'developer' }}
 */
export function getErrorsLlmConfig() {
  const enabledRaw = env('ERRORS_LLM_ENABLED') ?? '';
  const enabled =
    enabledRaw === true ||
    enabledRaw === 'true' ||
    enabledRaw === '1' ||
    enabledRaw === 1;

  const baseURL =
    env('ERRORS_LLM_BASE_URL') ??
    env('ERRORS_LLM_BASEURL') ??
    env('LLM_BASE_URL') ??
    env('LLM_BASEURL') ??
    '';

  const apiKey =
    env('ERRORS_LLM_API_KEY') ??
    env('ERRORS_LLM_APIKEY') ??
    env('LLM_API_KEY') ??
    env('LLM_APIKEY') ??
    '';

  const model =
    env('ERRORS_LLM_MODEL') ?? env('LLM_MODEL') ?? '';

  const messageTypeRaw =
    env('ERRORS_LLM_MESSAGE_TYPE') ?? env('ERRORS_LLM_MESSAGETYPE') ?? env('LLM_MESSAGE_TYPE') ?? env('LLM_MESSAGETYPE') ?? '';

  return {
    enabled: Boolean(enabled),
    baseURL: String(baseURL ?? '').trim(),
    apiKey: String(apiKey ?? '').trim(),
    model: String(model ?? '').trim(),
    messageType: normalizeMessageType(messageTypeRaw || 'endUser'),
  };
}

export { MESSAGE_TYPES };

/**
 * Validate errors.llm when enabled: require baseURL, apiKey, and model (after LLM_ fallback).
 * Call at takeoff. Throws if enabled but config is invalid; no-op otherwise.
 * @throws {Error} If errors.llm.enabled is true but any of baseURL, apiKey, or model is missing
 */
export function validateErrorsLlmAtTakeoff() {
  const { enabled, baseURL, apiKey, model } = getErrorsLlmConfig();
  if (!enabled) return;

  const missing = [];
  if (!baseURL) missing.push('baseURL (ERRORS_LLM_BASE_URL or LLM_BASE_URL)');
  if (!apiKey) missing.push('apiKey (ERRORS_LLM_API_KEY or LLM_API_KEY)');
  if (!model) missing.push('model (ERRORS_LLM_MODEL or LLM_MODEL)');

  if (missing.length > 0) {
    throw new Error(
      `errors.llm is enabled but required config is missing: ${missing.join(', ')}. Set these env vars or disable errors.llm.enabled.`,
    );
  }
}
