/**
 * LLM-based error inference: given code context (surrounding + upstream/downstream),
 * returns statusCode and message (and optionally devInsight in non-production).
 * Uses shared lib/llm with errors.llm config. Developers do not pass an error object;
 * the LLM infers from the code where ammo.throw() was called.
 *
 * Flow: cache check -> rate limit check -> LLM call -> record rate -> store cache -> return.
 */

import { createProvider } from '../../lib/llm/index.js';
import { extractJSON } from '../../lib/llm/parse.js';
import { getErrorsLlmConfig } from '../../utils/errors-llm-config.js';
import { getRateLimiter } from './llm-rate-limiter.js';
import { getCache } from './llm-cache.js';

const DEFAULT_STATUS = 500;
const DEFAULT_MESSAGE = 'Internal Server Error';

const MASKED_FIELDS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'authorization',
  'auth',
  'credit_card',
  'card_number',
  'cvv',
  'ssn',
  'email',
  'phone',
  'mobile',
  'otp',
  'pin',
  'dob',
  'date_of_birth',
  'address',
]);

/**
 * Recursively mask sensitive fields in an object before it reaches the LLM.
 * Returns a new object; the original is never mutated.
 */
function maskForLlm(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(maskForLlm);

  const result = {};
  for (const [k, v] of Object.entries(value)) {
    result[k] = MASKED_FIELDS.has(k.toLowerCase()) ? '[MASKED]' : maskForLlm(v);
  }
  return result;
}

/**
 * Sanitise an error before including it in the LLM prompt.
 * If the error is an object with properties that match the GDPR blocklist,
 * those values are replaced with [MASKED]. If it's a raw string or an Error
 * with only a message, the message is passed through (it's developer-authored
 * code-level text, not user-submitted data).
 */
function sanitiseErrorForPrompt(error) {
  if (error === null || error === undefined) return error;
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    const sanitised = new Error(error.message);
    sanitised.name = error.name;
    return sanitised;
  }
  return maskForLlm(error);
}

/**
 * Build prompt text from code context (and optional error) for the LLM.
 * @param {object} context
 * @param {{ snippets: Array<{ file: string, line: number, snippet: string }> }} context.codeContext - Source snippets with line numbers (first = throw site, rest = upstream).
 * @param {string} [context.method] - HTTP method.
 * @param {string} [context.path] - Request path.
 * @param {boolean} [context.includeDevInsight] - If true, ask for devInsight.
 * @param {'endUser'|'developer'} [context.messageType] - Message tone.
 * @param {string|Error|undefined} [context.error] - Optional error if one was passed (secondary signal).
 * @returns {string}
 */
function buildPrompt(context) {
  const { codeContext, method, path, includeDevInsight, messageType, error } =
    context;
  const forDeveloper = messageType === 'developer';

  const requestPart = [method, path].filter(Boolean).length
    ? `Request: ${[method, path].filter(Boolean).join(' ')}`
    : '';

  let codePart = 'No code context was captured.';
  if (codeContext?.snippets?.length) {
    codePart = codeContext.snippets
      .map((s, i) => {
        const label =
          i === 0
            ? 'Call site (where ammo.throw() was invoked)'
            : `Upstream caller ${i}`;
        return `--- ${label}: ${s.file} (line ${s.line}) ---\n${s.snippet}`;
      })
      .join('\n\n');
  }

  let errorPart = '';
  if (error !== undefined && error !== null) {
    if (error != null && typeof error.message === 'string') {
      errorPart = `\nOptional error message (may be empty): ${error.message}`;
    } else {
      errorPart = `\nOptional error/message: ${String(error)}`;
    }
  }

  const devPart = includeDevInsight
    ? '\nAlso provide a short "devInsight" string (one or two sentences) for the developer: (a) Is this likely a bug in the code or an environment/setup issue? (b) If the developer can fix it, suggest the fix. Be concise.'
    : '';

  const messageInstruction = forDeveloper
    ? '- "message": string (short message for developers: may include technical detail, error type, or cause; do not include raw stack traces)'
    : '- "message": string (short, end-user-facing message: safe for clients; do not expose stack traces, internal details, or technical jargon)';

  return `You are helping map an application error to an HTTP response. The developer called ammo.throw() (or an error was thrown and caught) at the call site below. Use the surrounding code with line numbers and all upstream/downstream context to infer what went wrong and choose an appropriate HTTP status and message.

Consider:
- The code BEFORE the throw (upstream in the same function and in callers) — what led to this point.
- The code AFTER the throw line (downstream) — what would have run next; this shows intent and expected flow.
- The first snippet is the call site (line marked with →); later snippets are upstream callers.

${requestPart ? requestPart + '\n\n' : ''}Code context (with line numbers; → marks the throw line):

${codePart}${errorPart}
${devPart ? '\n' + devPart : ''}

Respond with only valid JSON, no markdown or explanation. Use this shape:
- "statusCode": number (HTTP status, typically 4xx or 5xx; use 500 for generic/server errors)
${messageInstruction}
${includeDevInsight ? '- "devInsight": string (brief note for the developer only)' : ''}

JSON:`;
}

/**
 * Infer HTTP statusCode and message (and optionally devInsight) from code context using the LLM.
 * Checks cache first, then rate limit. On success stores result in cache.
 *
 * @param {object} context - Context for the prompt.
 * @param {{ snippets: Array<{ file: string, line: number, snippet: string }> }} context.codeContext
 * @param {string} [context.method]
 * @param {string} [context.path]
 * @param {boolean} [context.includeDevInsight]
 * @param {'endUser'|'developer'} [context.messageType]
 * @param {string|Error|undefined} [context.error]
 * @returns {Promise<{ statusCode: number, message: string, devInsight?: string, cached?: boolean, rateLimited?: boolean }>}
 */
export async function inferErrorFromContext(context) {
  const config = getErrorsLlmConfig();
  const {
    baseURL,
    apiKey,
    model,
    messageType: configMessageType,
    timeout,
    rateLimit,
    cache: cacheEnabled,
    cacheTTL,
  } = config;

  const isProduction = process.env.NODE_ENV === 'production';
  const includeDevInsight =
    context.includeDevInsight !== false
      ? context.forceDevInsight
        ? true
        : !isProduction
      : false;
  const messageType = context.messageType ?? configMessageType;

  // 1. Cache check
  if (cacheEnabled) {
    const cache = getCache(cacheTTL);
    const key = cache.buildKey(context.codeContext, context.error);
    const cached = cache.get(key);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  // 2. Rate limit check
  const limiter = getRateLimiter(rateLimit);
  if (!limiter.canCall()) {
    return {
      statusCode: DEFAULT_STATUS,
      message: DEFAULT_MESSAGE,
      ...(includeDevInsight && {
        devInsight: 'LLM rate limit exceeded — error was not enhanced.',
      }),
      rateLimited: true,
    };
  }

  // 3. LLM call
  const provider = createProvider({ baseURL, apiKey, model, timeout });

  const prompt = buildPrompt({
    codeContext: context.codeContext,
    method: context.method,
    path: context.path,
    includeDevInsight,
    messageType,
    error: sanitiseErrorForPrompt(context.error),
  });

  const { content } = await provider.analyze(prompt);

  // 4. Record the call against the rate limit
  limiter.record();

  const parsed = extractJSON(content);

  if (!parsed || typeof parsed !== 'object') {
    return {
      statusCode: DEFAULT_STATUS,
      message: DEFAULT_MESSAGE,
      ...(includeDevInsight && { devInsight: 'Could not parse LLM response.' }),
    };
  }

  let statusCode = Number(parsed.statusCode);
  if (Number.isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    statusCode = DEFAULT_STATUS;
  }

  const message =
    typeof parsed.message === 'string' && parsed.message.trim()
      ? parsed.message.trim()
      : DEFAULT_MESSAGE;

  const result = { statusCode, message };
  if (
    includeDevInsight &&
    typeof parsed.devInsight === 'string' &&
    parsed.devInsight.trim()
  ) {
    result.devInsight = parsed.devInsight.trim();
  }

  // 5. Store in cache
  if (cacheEnabled) {
    const cache = getCache(cacheTTL);
    const key = cache.buildKey(context.codeContext, context.error);
    cache.set(key, result);
  }

  return result;
}
