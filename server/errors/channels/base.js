/**
 * Base class for LLM error output channels.
 * Subclasses implement dispatch() to send the LLM result wherever needed.
 */

/**
 * @typedef {object} ChannelPayload
 * @property {string} timestamp - ISO 8601 timestamp of when the error occurred
 * @property {string} method - HTTP method (e.g. GET, POST)
 * @property {string} path - Request path
 * @property {number} statusCode - LLM-inferred HTTP status code
 * @property {string} message - LLM-inferred message
 * @property {string} [devInsight] - Developer insight from LLM (always included in async mode)
 * @property {{ type: string, message: string } | null} error - Original error summary
 * @property {{ snippets: Array<{ file: string, line: number, snippet: string }> }} codeContext - Source context
 * @property {boolean} [cached] - Whether this result came from the cache
 * @property {boolean} [rateLimited] - Whether LLM was skipped due to rate limiting
 */

export class ErrorChannel {
  /**
   * Dispatch an LLM error result to this channel.
   * @param {ChannelPayload} payload
   * @returns {Promise<void>}
   */
  async dispatch(payload) {
    throw new Error(
      `dispatch() must be implemented by ${this.constructor.name}`,
    );
  }
}
