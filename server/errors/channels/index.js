/**
 * Channel registry for LLM error output.
 * Maps channel config values ('console' | 'log' | 'both') to channel instances.
 */

import { ConsoleChannel } from './console.js';
import { LogChannel } from './log.js';

/** @type {ConsoleChannel|null} */
let _console = null;

/** @type {Map<string, LogChannel>} */
const _logInstances = new Map();

/**
 * Get (or create) the singleton ConsoleChannel.
 * @returns {ConsoleChannel}
 */
function getConsoleChannel() {
  if (!_console) _console = new ConsoleChannel();
  return _console;
}

/**
 * Get (or create) a LogChannel for the given file path.
 * @param {string} logFile
 * @returns {LogChannel}
 */
function getLogChannel(logFile) {
  if (!_logInstances.has(logFile)) {
    _logInstances.set(logFile, new LogChannel(logFile));
  }
  return _logInstances.get(logFile);
}

/**
 * Resolve channel instances for the given config value and log file.
 * @param {'console'|'log'|'both'} channel
 * @param {string} logFile
 * @returns {import('./base.js').ErrorChannel[]}
 */
export function getChannels(channel, logFile) {
  switch (channel) {
    case 'log':
      return [getLogChannel(logFile)];
    case 'both':
      return [getConsoleChannel(), getLogChannel(logFile)];
    case 'console':
    default:
      return [getConsoleChannel()];
  }
}

/**
 * Build the standard channel payload from available context and LLM result.
 * @param {object} opts
 * @param {string} opts.method
 * @param {string} opts.path
 * @param {Error|string|null|undefined} opts.originalError
 * @param {{ snippets: Array<{ file: string, line: number, snippet: string }> }} opts.codeContext
 * @param {number} opts.statusCode
 * @param {string} opts.message
 * @param {string} [opts.devInsight]
 * @param {boolean} [opts.cached]
 * @param {boolean} [opts.rateLimited]
 * @returns {import('./base.js').ChannelPayload}
 */
export function buildPayload({
  method,
  path,
  originalError,
  codeContext,
  statusCode,
  message,
  devInsight,
  cached,
  rateLimited,
}) {
  let errorSummary = null;
  if (originalError instanceof Error) {
    errorSummary = {
      type: originalError.constructor?.name ?? 'Error',
      message: originalError.message ?? '',
    };
  } else if (originalError != null) {
    errorSummary = { type: 'string', message: String(originalError) };
  }

  return {
    timestamp: new Date().toISOString(),
    method: method ?? '',
    path: path ?? '',
    statusCode,
    message,
    ...(devInsight != null && { devInsight }),
    error: errorSummary,
    codeContext: codeContext ?? { snippets: [] },
    ...(cached != null && { cached }),
    ...(rateLimited != null && { rateLimited }),
  };
}

/**
 * Dispatch a payload to all resolved channels, swallowing individual channel errors.
 * @param {import('./base.js').ErrorChannel[]} channels
 * @param {import('./base.js').ChannelPayload} payload
 * @returns {Promise<void>}
 */
export async function dispatchToChannels(channels, payload) {
  await Promise.allSettled(channels.map((ch) => ch.dispatch(payload)));
}
