/**
 * Level 3 pipeline: reorder OpenAPI tag groups by importance and generate overview page.
 * Single entry point is runLevel3(spec, options, llm). Runs after the spec is generated (level 2 quality).
 */

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createVerboseLogger } from '../utils/logger.js';

/**
 * Resolve overview file path from option or derive from outputPath.
 * @param {string} [overviewPathOption] - Explicit path for API_OVERVIEW.md
 * @param {string} [outputPath] - OpenAPI spec output path (dir used for default overview)
 * @returns {string} Overview path or ''
 */
export function resolveOverviewPath(overviewPathOption, outputPath) {
  if (overviewPathOption && typeof overviewPathOption === 'string') {
    return overviewPathOption;
  }
  if (outputPath && typeof outputPath === 'string') {
    return path.join(path.dirname(outputPath), 'API_OVERVIEW.md');
  }
  return '';
}

/**
 * Generate overview markdown from the spec (no I/O). Pure except LLM call.
 * @param {object} spec - OpenAPI 3 spec (after reorder)
 * @param {object} options - { info?: { title?, version?, description? } }
 * @param {object} llm - LLM provider with generateOverviewPage(spec, options)
 * @returns {Promise<{ markdown: string }>}
 */
export async function generateOverview(spec, options, llm) {
  if (typeof llm?.generateOverviewPage !== 'function') {
    return { markdown: '' };
  }
  const info = options?.info ?? {};
  const { markdown } = await llm.generateOverviewPage(spec, {
    title: info.title,
    version: info.version,
    description: info.description,
  });
  return { markdown: markdown || '' };
}

/**
 * Write level-3 artifacts: overview file and optionally the spec file.
 * @param {object} spec - OpenAPI 3 spec (may have info.description set)
 * @param {string} overviewPath - Path for API_OVERVIEW.md
 * @param {string} [outputPath] - Path for openapi.json
 * @param {string} [markdown] - Overview markdown content
 * @returns {Promise<void>}
 */
export async function writeLevel3Artifacts(spec, overviewPath, outputPath, markdown) {
  if (overviewPath && markdown) {
    await writeFile(overviewPath, markdown, 'utf8');
  }
  if (outputPath && typeof outputPath === 'string') {
    await writeFile(outputPath, JSON.stringify(spec, null, 2), 'utf8');
  }
}

/**
 * Run the full level-3 pipeline: reorder tags, generate overview, write artifacts.
 * @param {object} spec - OpenAPI 3 spec (mutated: tags reordered, info.description set)
 * @param {object} options - { outputPath?, overviewPath?, info?, verbose?, logger? }
 * @param {object} llm - LLM provider with reorderTagsByImportance and generateOverviewPage
 * @returns {Promise<void>}
 */
export async function runLevel3(spec, options, llm) {
  const { outputPath, overviewPath: overviewPathOption, info = {}, verbose = false, logger = null } = options;
  const log = createVerboseLogger(logger, verbose);

  if (!spec?.tags?.length || !llm) return;

  log('Level 3: reordering tag groups by importance...');
  await reorderSpecTags(spec, llm);

  const overviewPath = resolveOverviewPath(overviewPathOption, outputPath);
  if (!overviewPath) {
    await writeLevel3Artifacts(spec, '', outputPath);
    if (outputPath) log('Spec updated with reordered tags.');
    return;
  }

  log('Level 3: generating overview...');
  const { markdown } = await generateOverview(spec, { info }, llm);
  if (markdown) {
    spec.info = spec.info || {};
    spec.info.description = markdown;
    log('Overview embedded in spec (info.description) for Scalar.');
  }
  log('Overview file written to ' + overviewPath + '.');

  await writeLevel3Artifacts(spec, overviewPath, outputPath, markdown);
  if (outputPath) log('Spec written with reordered tags and overview.');
}

/**
 * Reorder spec.tags by importance using the LLM. Mutates and returns the same spec object.
 * @param {object} spec - OpenAPI 3 spec with tags array
 * @param {object} llm - LLM provider with reorderTagsByImportance(spec)
 * @returns {Promise<object>} The same spec with tags reordered
 */
export async function reorderSpecTags(spec, llm) {
  if (!spec?.tags?.length || typeof llm?.reorderTagsByImportance !== 'function') {
    return spec;
  }
  const result = await llm.reorderTagsByImportance(spec);
  const ordered = result._orderedTags;
  if (Array.isArray(ordered) && ordered.length > 0) {
    spec.tags = ordered;
  }
  return spec;
}

/**
 * Generate overview markdown and write it to overviewPath. (Convenience: generateOverview + write.)
 * @param {object} spec - OpenAPI 3 spec (after reorder)
 * @param {object} options - { overviewPath: string, info?: { title?, version?, description? } }
 * @param {object} llm - LLM provider with generateOverviewPage(spec, options)
 * @returns {Promise<{ markdown: string }>}
 */
export async function generateAndWriteOverview(spec, options, llm) {
  const overviewPath = options?.overviewPath;
  const { markdown } = await generateOverview(spec, options, llm);
  if (overviewPath && markdown) {
    await writeFile(overviewPath, markdown, 'utf8');
  }
  return { markdown };
}
