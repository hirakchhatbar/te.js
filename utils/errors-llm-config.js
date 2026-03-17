/**
 * Resolve and validate errors.llm configuration (LLM-inferred error codes/messages).
 * Uses ERRORS_LLM_* env vars with fallback to LLM_*.
 * Config file keys (e.g. errors.llm.baseURL) are standardized to ERRORS_LLM_BASEURL etc.
 */

import { env } from 'tej-env';
import TejLogger from 'tej-logger';

const logger = new TejLogger('Tejas.ErrorsLlm');

const MESSAGE_TYPES = /** @type {const} */ (['endUser', 'developer']);
const LLM_MODES = /** @type {const} */ (['sync', 'async']);
const LLM_CHANNELS = /** @type {const} */ (['console', 'log', 'both']);

/**
 * Normalize messageType to 'endUser' | 'developer'.
 * @param {string} v
 * @returns {'endUser'|'developer'}
 */
function normalizeMessageType(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (s === 'developer' || s === 'dev') return 'developer';
  return 'endUser'; // endUser, end_user, default
}

/**
 * Normalize mode to 'sync' | 'async'.
 * @param {string} v
 * @returns {'sync'|'async'}
 */
function normalizeMode(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (s === 'async') return 'async';
  return 'sync';
}

/**
 * Normalize channel to 'console' | 'log' | 'both'.
 * @param {string} v
 * @returns {'console'|'log'|'both'}
 */
function normalizeChannel(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (s === 'log') return 'log';
  if (s === 'both') return 'both';
  return 'console';
}

/**
 * Resolve errors.llm config from env (feature-specific then LLM_ fallback).
 * @returns {{
 *   enabled: boolean,
 *   baseURL: string,
 *   apiKey: string,
 *   model: string,
 *   messageType: 'endUser'|'developer',
 *   mode: 'sync'|'async',
 *   timeout: number,
 *   channel: 'console'|'log'|'both',
 *   logFile: string,
 *   rateLimit: number,
 *   cache: boolean,
 *   cacheTTL: number,
 *   verifyOnStart: boolean,
 * }}
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

  const model = env('ERRORS_LLM_MODEL') ?? env('LLM_MODEL') ?? '';

  const messageTypeRaw =
    env('ERRORS_LLM_MESSAGE_TYPE') ??
    env('ERRORS_LLM_MESSAGETYPE') ??
    env('LLM_MESSAGE_TYPE') ??
    env('LLM_MESSAGETYPE') ??
    '';

  const modeRaw = env('ERRORS_LLM_MODE') ?? env('LLM_MODE') ?? '';

  const timeoutRaw = env('ERRORS_LLM_TIMEOUT') ?? env('LLM_TIMEOUT') ?? '';
  const timeoutNum = Number(timeoutRaw);
  const timeout =
    !timeoutRaw || isNaN(timeoutNum) || timeoutNum <= 0 ? 10000 : timeoutNum;

  const channelRaw = env('ERRORS_LLM_CHANNEL') ?? env('LLM_CHANNEL') ?? '';

  const logFile =
    String(env('ERRORS_LLM_LOG_FILE') ?? '').trim() || './errors.llm.log';

  const rateLimitRaw =
    env('ERRORS_LLM_RATE_LIMIT') ?? env('LLM_RATE_LIMIT') ?? '';
  const rateLimitNum = Number(rateLimitRaw);
  const rateLimit =
    !rateLimitRaw || isNaN(rateLimitNum) || rateLimitNum <= 0
      ? 10
      : Math.floor(rateLimitNum);

  const cacheRaw = env('ERRORS_LLM_CACHE') ?? '';
  const cache =
    cacheRaw === false ||
    cacheRaw === 'false' ||
    cacheRaw === '0' ||
    cacheRaw === 0
      ? false
      : true;

  const cacheTTLRaw = env('ERRORS_LLM_CACHE_TTL') ?? '';
  const cacheTTLNum = Number(cacheTTLRaw);
  const cacheTTL =
    !cacheTTLRaw || isNaN(cacheTTLNum) || cacheTTLNum <= 0
      ? 3600000
      : cacheTTLNum;

  const verifyOnStartRaw = env('ERRORS_LLM_VERIFY_ON_START') ?? '';
  const verifyOnStart =
    verifyOnStartRaw === true ||
    verifyOnStartRaw === 'true' ||
    verifyOnStartRaw === '1' ||
    verifyOnStartRaw === 1;

  return Object.freeze({
    enabled: Boolean(enabled),
    baseURL: String(baseURL ?? '').trim(),
    apiKey: String(apiKey ?? '').trim(),
    model: String(model ?? '').trim(),
    messageType: normalizeMessageType(messageTypeRaw || 'endUser'),
    mode: normalizeMode(modeRaw),
    timeout,
    channel: normalizeChannel(channelRaw),
    logFile,
    rateLimit,
    cache,
    cacheTTL,
    verifyOnStart,
  });
}

export { MESSAGE_TYPES, LLM_MODES, LLM_CHANNELS };

/**
 * Fire a lightweight probe to the configured LLM provider and verify it
 * responds correctly. Intended to run once at takeoff when `verifyOnStart: true`.
 *
 * Never throws — a flaky provider does not prevent the server from starting.
 *
 * @returns {Promise<{ ok: boolean, status: { feature: string, ok: boolean, detail: string } }>}
 */
export async function verifyLlmConnection() {
  const { baseURL, apiKey, model, timeout, mode } = getErrorsLlmConfig();

  const { createProvider } = await import('../lib/llm/index.js');
  const provider = createProvider({ baseURL, apiKey, model, timeout });

  const shortModel = model.split('/').pop().split(':')[0] || model;
  const start = Date.now();
  try {
    const { content } = await provider.analyze(
      'Respond with only the JSON object {"status":"ok"}. No explanation.',
    );
    const elapsed = Date.now() - start;

    if (content.includes('"ok"')) {
      return {
        ok: true,
        status: { feature: 'LLM Errors', ok: true, detail: `verified (${shortModel}, ${elapsed}ms, mode: ${mode})` },
      };
    }

    return {
      ok: false,
      status: { feature: 'LLM Errors', ok: false, detail: `unexpected response from ${shortModel} (${elapsed}ms)` },
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    return {
      ok: false,
      status: { feature: 'LLM Errors', ok: false, detail: `${err.message} (${elapsed}ms)` },
    };
  }
}

/**
 * Validate errors.llm when enabled: require baseURL, apiKey, and model (after LLM_ fallback).
 * Also warns about misconfigurations (e.g. channel set with sync mode).
 * Call at takeoff. Throws if enabled but config is invalid; no-op otherwise.
 * @throws {Error} If errors.llm.enabled is true but any of baseURL, apiKey, or model is missing
 */
export function validateErrorsLlmAtTakeoff() {
  const {
    enabled,
    baseURL,
    apiKey,
    model,
    mode,
    channel,
    rateLimit,
    cacheTTL,
  } = getErrorsLlmConfig();
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

  // Warn about channel set while mode is sync (channel only applies in async mode).
  const channelRaw = String(
    env('ERRORS_LLM_CHANNEL') ?? env('LLM_CHANNEL') ?? '',
  ).trim();
  if (mode === 'sync' && channelRaw) {
    logger.warn(
      `errors.llm: channel="${channel}" is set but mode is "sync" — channel output only applies in async mode. Set ERRORS_LLM_MODE=async to use it.`,
    );
  }

  // Warn about invalid numeric values that were silently reset to defaults.
  const rateLimitRaw = String(
    env('ERRORS_LLM_RATE_LIMIT') ?? env('LLM_RATE_LIMIT') ?? '',
  ).trim();
  if (
    rateLimitRaw &&
    (isNaN(Number(rateLimitRaw)) || Number(rateLimitRaw) <= 0)
  ) {
    logger.warn(
      `errors.llm: rateLimit value "${rateLimitRaw}" is invalid; defaulting to 10.`,
    );
  }

  const cacheTTLRaw = String(env('ERRORS_LLM_CACHE_TTL') ?? '').trim();
  if (cacheTTLRaw && (isNaN(Number(cacheTTLRaw)) || Number(cacheTTLRaw) <= 0)) {
    logger.warn(
      `errors.llm: cacheTTL value "${cacheTTLRaw}" is invalid; defaulting to 3600000.`,
    );
  }
}
