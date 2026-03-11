/**
 * Console channel: pretty-prints LLM error results to the terminal using ansi-colors.
 */

import ansi from 'ansi-colors';
import { ErrorChannel } from './base.js';

const { red, yellow, cyan, white, bold, dim, italic } = ansi;

/**
 * Format an HTTP status code with color (red for 5xx, yellow for 4xx, white for others).
 * @param {number} statusCode
 * @returns {string}
 */
function colorStatus(statusCode) {
  if (statusCode >= 500) return red(bold(String(statusCode)));
  if (statusCode >= 400) return yellow(bold(String(statusCode)));
  return white(bold(String(statusCode)));
}

export class ConsoleChannel extends ErrorChannel {
  async dispatch(payload) {
    const {
      timestamp,
      method,
      path,
      statusCode,
      message,
      devInsight,
      error,
      cached,
      rateLimited,
    } = payload;

    const time = dim(italic(new Date(timestamp).toLocaleTimeString()));
    const route = white(`${method} ${path}`);
    const status = colorStatus(statusCode);

    const flags = [];
    if (cached) flags.push(cyan('[CACHED]'));
    if (rateLimited) flags.push(yellow('[RATE LIMITED]'));
    const flagStr = flags.length ? ' ' + flags.join(' ') : '';

    const lines = [
      ``,
      `${time} ${red('[LLM ERROR]')} ${route} → ${status}${flagStr}`,
      `  ${white(message)}`,
    ];

    if (devInsight) {
      lines.push(`  ${cyan('⟶')} ${cyan(devInsight)}`);
    }

    if (error?.message && !rateLimited) {
      lines.push(
        `  ${dim(`original: ${error.type ? error.type + ': ' : ''}${error.message}`)}`,
      );
    }

    lines.push('');

    process.stderr.write(lines.join('\n'));
  }
}
