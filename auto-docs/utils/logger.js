/**
 * Verbose logging helper for auto-docs.
 * Returns a no-op when verbose is false or logger has no info method.
 */

/**
 * Create a logger that only logs when verbose is true and logger.info exists.
 * @param {object|null} logger - Logger with .info(msg) method
 * @param {boolean} verbose - Whether to log
 * @returns {(msg: string) => void} Function that logs or does nothing
 */
export function createVerboseLogger(logger, verbose) {
  if (!verbose || !logger || typeof logger.info !== 'function') {
    return () => {};
  }
  return (msg) => logger.info(msg);
}
