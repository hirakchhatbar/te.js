/**
 * Resolve response structure configuration.
 * Uses RESPONSE_* env vars (populated from tejas.config.json response section).
 */

import { env } from 'tej-env';

/**
 * Resolve response config from env.
 * @returns {{ enabled: boolean, successKey: string, errorKey: string }}
 */
export function getResponseConfig() {
  // Response envelope: from .env use RESPONSE_ENVELOPE_ENABLED; from config file → RESPONSE_ENVELOPEENABLED; legacy names supported
  const enabledRaw =
    env('RESPONSE_ENVELOPE_ENABLED') ??
    env('RESPONSE_ENVELOPEENABLED') ??
    env('RESPONSE_FORMAT_ENABLED') ??
    env('RESPONSE_FORMATENABLED') ??
    env('RESPONSE_ENABLED') ??
    '';
  const enabled =
    enabledRaw === true ||
    enabledRaw === 'true' ||
    enabledRaw === '1' ||
    enabledRaw === 1;

  const successKey =
    env('RESPONSE_SUCCESSKEY') ?? env('RESPONSE_SUCCESS_KEY') ?? 'data';
  const errorKey =
    env('RESPONSE_ERRORKEY') ?? env('RESPONSE_ERROR_KEY') ?? 'error';

  return {
    enabled:
      enabledRaw === undefined || enabledRaw === '' ? true : Boolean(enabled),
    successKey: String(successKey ?? 'data').trim() || 'data',
    errorKey: String(errorKey ?? 'error').trim() || 'error',
  };
}
