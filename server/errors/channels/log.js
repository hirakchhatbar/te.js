/**
 * Log channel: appends a full JSONL entry to a log file for each LLM error result.
 * Each line is a self-contained JSON object with all fields for post-mortem debugging.
 */

import { appendFile } from 'node:fs/promises';
import { ErrorChannel } from './base.js';

export class LogChannel extends ErrorChannel {
  /**
   * @param {string} logFile - Absolute or relative path to the JSONL log file.
   */
  constructor(logFile) {
    super();
    this.logFile = logFile;
  }

  async dispatch(payload) {
    const line = JSON.stringify(payload) + '\n';
    try {
      await appendFile(this.logFile, line, 'utf-8');
    } catch {
      // Silently ignore write failures (e.g. permissions, disk full) so logging never
      // crashes the process or blocks error handling.
    }
  }
}
