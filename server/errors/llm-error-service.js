/**
 * LLM-based error inference: given code context (surrounding + upstream/downstream),
 * returns statusCode and message (and optionally devInsight in non-production).
 * Uses shared lib/llm with errors.llm config. Developers do not pass an error object;
 * the LLM infers from the code where ammo.throw() was called.
 */

import { createProvider } from '../../lib/llm/index.js';
import { extractJSON } from '../../lib/llm/parse.js';
import { getErrorsLlmConfig } from '../../utils/errors-llm-config.js';

const DEFAULT_STATUS = 500;
const DEFAULT_MESSAGE = 'Internal Server Error';

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
  const { codeContext, method, path, includeDevInsight, messageType, error } = context;
  const forDeveloper = messageType === 'developer';

  const requestPart = [method, path].filter(Boolean).length
    ? `Request: ${[method, path].filter(Boolean).join(' ')}`
    : '';

  let codePart = 'No code context was captured.';
  if (codeContext?.snippets?.length) {
    codePart = codeContext.snippets
      .map((s, i) => {
        const label = i === 0 ? 'Call site (where ammo.throw() was invoked)' : `Upstream caller ${i}`;
        return `--- ${label}: ${s.file} (line ${s.line}) ---\n${s.snippet}`;
      })
      .join('\n\n');
  }

  let errorPart = '';
  if (error !== undefined && error !== null) {
    if (error instanceof Error) {
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
 * Uses errors.llm config (getErrorsLlmConfig). Call only when errors.llm.enabled is true and config is valid.
 * The primary input is codeContext (surrounding + upstream/downstream snippets); error is optional.
 *
 * @param {object} context - Context for the prompt.
 * @param {{ snippets: Array<{ file: string, line: number, snippet: string }> }} context.codeContext - Source snippets with line numbers (from captureCodeContext).
 * @param {string} [context.method] - HTTP method.
 * @param {string} [context.path] - Request path.
 * @param {boolean} [context.includeDevInsight] - In non-production, dev insight is included by default; set to false to disable.
 * @param {'endUser'|'developer'} [context.messageType] - Override config: 'endUser' or 'developer'. Default from errors.llm.messageType.
 * @param {string|Error|undefined} [context.error] - Optional error if the caller passed one (secondary signal).
 * @returns {Promise<{ statusCode: number, message: string, devInsight?: string }>}
 */
export async function inferErrorFromContext(context) {
  const config = getErrorsLlmConfig();
  const { baseURL, apiKey, model, messageType: configMessageType } = config;
  const provider = createProvider({ baseURL, apiKey, model });

  const isProduction = process.env.NODE_ENV === 'production';
  const includeDevInsight = !isProduction && context.includeDevInsight !== false;
  const messageType = context.messageType ?? configMessageType;

  const prompt = buildPrompt({
    codeContext: context.codeContext,
    method: context.method,
    path: context.path,
    includeDevInsight,
    messageType,
    error: context.error,
  });

  const { content } = await provider.analyze(prompt);
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
  if (includeDevInsight && typeof parsed.devInsight === 'string' && parsed.devInsight.trim()) {
    result.devInsight = parsed.devInsight.trim();
  }

  return result;
}
