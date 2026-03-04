/**
 * Capture code context from the call stack: surrounding source with line numbers,
 * including upstream callers and downstream code. Used by LLM error inference.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Path segments that identify te.js internals (excluded from "user" stack frames). */
const INTERNAL_PATTERNS = [
  'server/ammo.js',
  'server/handler.js',
  'server/errors/llm-error-service.js',
  'server/errors/code-context.js',
  'node_modules',
];

const LINES_ABOVE = 25;
const LINES_BELOW = 25;
const MAX_FRAMES = 6;

/**
 * Parse a single stack frame line to extract file path, line, and column.
 * Handles "at fn (file:///path:line:col)" and "at file:///path:line:col" and "at /path:line:col".
 * @param {string} line
 * @returns {{ filePath: string, line: number, column: number } | null}
 */
function parseStackFrame(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('at ')) return null;
  // Last occurrence of :number:number is line:column (path may contain colons on Windows/file URL)
  const match = trimmed.match(/:(\d+):(\d+)\s*\)?\s*$/);
  if (!match) return null;
  const lineNum = parseInt(match[1], 10);
  const colNum = parseInt(match[2], 10);
  const before = trimmed.slice(0, trimmed.lastIndexOf(':' + match[1] + ':' + match[2]));
  // Strip "at ... (" or "at " prefix to get path
  let filePath = before.replace(/^\s*at\s+(?:.*?\s+\()?/, '').replace(/\)?\s*$/, '').trim();
  if (filePath.startsWith('file://')) {
    try {
      filePath = fileURLToPath(filePath);
    } catch {
      return null;
    }
  }
  if (!filePath || lineNum <= 0) return null;
  return { filePath, line: lineNum, column: colNum };
}

/**
 * Return true if this file path is internal (te.js / node_modules) and should be skipped for user context.
 * @param {string} filePath - Absolute or relative path
 */
function isInternalFrame(filePath) {
  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  return INTERNAL_PATTERNS.some((p) => normalized.includes(p));
}

/**
 * Read source file and return lines [lineNum - LINES_ABOVE, lineNum + LINES_BELOW] with line numbers.
 * @param {string} filePath - Absolute path
 * @param {number} lineNum - Center line (1-based)
 * @returns {Promise<{ file: string, line: number, snippet: string } | null>}
 */
async function readSnippet(filePath, lineNum) {
  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, lineNum - 1 - LINES_ABOVE);
  const end = Math.min(lines.length, lineNum + LINES_BELOW);
  const snippet = lines
    .slice(start, end)
    .map((text, i) => {
      const num = start + i + 1;
      const marker = num === lineNum ? ' →' : '  ';
      return `${String(num).padStart(4)}${marker} ${text}`;
    })
    .join('\n');

  return {
    file: filePath,
    line: lineNum,
    snippet,
  };
}

/**
 * Capture code context from the current call stack: parse stack, filter to user frames,
 * and read surrounding source (with line numbers) for each frame. First frame is the
 * throw site; remaining frames are upstream callers. Each snippet includes lines
 * above and below (downstream in the same function).
 *
 * @param {string} [stack] - Stack string (e.g. new Error().stack). If omitted, captures current stack.
 * @param {{ maxFrames?: number, linesAround?: number }} [options]
 * @returns {Promise<{ snippets: Array<{ file: string, line: number, snippet: string }> }>}
 */
export async function captureCodeContext(stack, options = {}) {
  const stackStr = typeof stack === 'string' && stack ? stack : new Error().stack;
  if (!stackStr) return { snippets: [] };

  const maxFrames = options.maxFrames ?? MAX_FRAMES;
  const lines = stackStr.split('\n');
  const frames = [];

  for (const line of lines) {
    const parsed = parseStackFrame(line);
    if (!parsed) continue;
    if (isInternalFrame(parsed.filePath)) continue;
    frames.push(parsed);
    if (frames.length >= maxFrames) break;
  }

  const snippets = [];
  for (const { filePath, line } of frames) {
    const one = await readSnippet(filePath, line);
    if (one) snippets.push(one);
  }

  return { snippets };
}
