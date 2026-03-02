/**
 * Resolves downstream dependency sources for level-2 documentation (handler + deps context).
 * Reads a target file, extracts relative imports, and returns their source code.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DEPENDENCY_CONTEXT_MAX_CHARS } from '../constants.js';

/** Match ES module imports: import x from './...' or import { x } from '../...' or import '...' */
const IMPORT_REGEX = /import\s+(?:(?:\{[^}]*\}|\w+)(?:\s*,\s*(?:\{[^}]*\}|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;

/**
 * Extract import specifiers that are relative paths (./ or ../).
 * @param {string} source - File source code
 * @returns {string[]} Relative paths (e.g. ['../services/user.service.js'])
 */
function extractRelativeImports(source) {
  const out = [];
  let match;
  IMPORT_REGEX.lastIndex = 0;
  while ((match = IMPORT_REGEX.exec(source)) !== null) {
    const spec = match[1];
    if (spec.startsWith('./') || spec.startsWith('../')) {
      out.push(spec);
    }
  }
  return [...new Set(out)];
}

/**
 * Resolve target file path from groupId and DIR_TARGETS.
 * @param {string} groupId - e.g. 'users' or 'subdir/users'
 * @param {string} dirTargets - e.g. 'targets'
 * @returns {string} Absolute path to the target file
 */
function resolveTargetFilePath(groupId, dirTargets = 'targets') {
  const baseDir = path.join(process.cwd(), dirTargets);
  const relative = groupId.replace(/\//g, path.sep) + '.target.js';
  return path.join(baseDir, relative);
}

/**
 * Read a target file and all its relative-import dependencies (one level deep).
 * @param {string} groupId - Source group id (e.g. 'users')
 * @param {string} [dirTargets] - DIR_TARGETS (default from process.env or 'targets')
 * @returns {Promise<Map<string, string>>} Map of absolute file path -> source code
 */
export async function resolveDependencySources(groupId, dirTargets = process.env.DIR_TARGETS || 'targets') {
  const targetPath = resolveTargetFilePath(groupId, dirTargets);
  const result = new Map();

  let targetSource;
  try {
    targetSource = await readFile(targetPath, 'utf8');
  } catch {
    return result;
  }

  result.set(targetPath, targetSource);
  const targetDir = path.dirname(targetPath);
  const relativeImports = extractRelativeImports(targetSource);

  for (const rel of relativeImports) {
    const resolvedPath = path.resolve(targetDir, rel);
    try {
      const code = await readFile(resolvedPath, 'utf8');
      result.set(resolvedPath, code);
    } catch {
      // Skip missing or unreadable files
    }
  }

  return result;
}

/**
 * Format resolved dependency sources as a single string for LLM context.
 * @param {Map<string, string>} sources - Map of file path -> source
 * @param {string} [targetPath] - Path to the target file (excluded from "dependencies" label)
 * @param {number} [maxChars] - Max total characters to include (default: DEPENDENCY_CONTEXT_MAX_CHARS)
 * @returns {string}
 */
export function formatDependencyContext(sources, targetPath, maxChars = DEPENDENCY_CONTEXT_MAX_CHARS) {
  if (!sources || sources.size === 0) return '';
  const lines = [];
  let total = 0;
  for (const [filePath, code] of sources) {
    const label = filePath === targetPath ? 'Target' : path.relative(process.cwd(), filePath);
    const block = `\n// --- ${label} ---\n${code}`;
    if (total + block.length > maxChars) {
      lines.push(block.slice(0, maxChars - total) + '\n// ... (truncated)');
      break;
    }
    lines.push(block);
    total += block.length;
  }
  return lines.join('\n');
}

export { extractRelativeImports, resolveTargetFilePath };
