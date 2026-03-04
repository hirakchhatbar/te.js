/**
 * Auto-docs orchestrator.
 *
 * Module layout:
 * - index.js (this file) — generateDocs(registry, options): orchestration, config, spec write, level-3 dispatch
 * - openapi/generator.js — build OpenAPI spec from registry (levels 1–2: handler analysis, LLM enhancement)
 * - openapi/level3.js — level-3 pipeline: reorder tags by importance, generate and write overview page
 * - analysis/handler-analyzer.js — detect HTTP methods from handler source
 * - analysis/source-resolver.js — resolve target file and dependencies (for level 2 context)
 * - docs-llm/ — Docs-specific LLM provider (enhanceEndpointDocs, summarizeTargetGroup, reorderTagsByImportance, generateOverviewPage)
 * - ui/docs-ui.js — build Scalar docs HTML, registerDocRoutes
 */

import { writeFile } from 'node:fs/promises';
import TejLogger from 'tej-logger';
import { createProvider } from './docs-llm/index.js';
import { generateOpenAPISpec } from './openapi/generator.js';
import { runLevel3 } from './openapi/level3.js';
import targetRegistry from '../server/targets/registry.js';

const logger = new TejLogger('Tejas.AutoDocs');

/**
 * Validate llm config, warn if no API key, create and return LLM provider.
 * @param {object} llmConfig - options.llm
 * @returns {object} LLM provider instance
 */
function validateAndCreateLlm(llmConfig) {
  if (!llmConfig || typeof llmConfig !== 'object') {
    throw new Error(
      'Documentation generation requires an LLM. Provide options.llm with { baseURL?, apiKey?, model? }.',
    );
  }
  const hasApiKey = llmConfig.apiKey || process.env.OPENAI_API_KEY;
  if (!hasApiKey) {
    logger.warn(
      'No API key set. Provide options.llm.apiKey or OPENAI_API_KEY. Local providers (e.g. Ollama) may work without a key.',
    );
  }
  return createProvider(llmConfig);
}

/**
 * Log start summary when verbose (endpoints count, model, title, output file, building message).
 * @param {object} options - { info?, outputPath? }
 * @param {number} targetCount
 * @param {object} log - logger
 * @param {boolean} verbose
 */
function logStartSummary(options, targetCount, log, verbose) {
  if (!verbose) return;
  const { info, outputPath } = options;
  log.info('OpenAPI documentation generation started.');
  log.info(`  Endpoints in registry: ${targetCount}`);
  log.info(`  LLM model: ${options.llm?.model ?? 'default'}`);
  if (info?.title) log.info(`  API title: ${info.title}`);
  if (outputPath) log.info(`  Output file: ${outputPath}`);
  if (targetCount === 0) {
    log.warn('No endpoints in registry; OpenAPI spec will be minimal.');
  } else {
    log.info('Building OpenAPI spec (analyzing handlers, LLM enhancement)...');
  }
}

/**
 * Log result summary when verbose (paths count, tags).
 * @param {object} spec - OpenAPI spec
 * @param {object} log - logger
 * @param {boolean} verbose
 */
function logResultSummary(spec, log, verbose) {
  if (!verbose) return;
  const pathCount = spec.paths ? Object.keys(spec.paths).length : 0;
  const tagList = Array.isArray(spec.tags) ? spec.tags.map((t) => t.name).join(', ') : '';
  log.info(`  Paths: ${pathCount}`);
  log.info(`  Tags (groups): ${spec.tags?.length ?? 0} [ ${tagList || '—'}]`);
}

/**
 * Write spec JSON to outputPath if path is set. Logs when verbose.
 * @param {object} spec - OpenAPI spec
 * @param {string|undefined} outputPath
 * @param {object} log - logger
 * @param {boolean} verbose
 */
async function writeSpecIfNeeded(spec, outputPath, log, verbose) {
  if (!outputPath || typeof outputPath !== 'string') return;
  if (verbose) log.info(`Writing spec to ${outputPath}...`);
  await writeFile(outputPath, JSON.stringify(spec, null, 2), 'utf8');
  if (verbose) log.info(`OpenAPI spec written to ${outputPath}.`);
}

/**
 * Generate OpenAPI 3.0 spec from the target registry using an LLM.
 *
 * @param {object} [registry] - Target registry with .targets (default: app registry)
 * @param {object} [options] - llm (required), info, servers, outputPath, level, dirTargets, overviewPath, verbose
 * @returns {Promise<object>} OpenAPI 3.0 spec object
 */
export async function generateDocs(registry = targetRegistry, options = {}) {
  const {
    llm: llmConfig,
    info,
    servers,
    outputPath,
    level,
    dirTargets,
    overviewPath: overviewPathOption,
    verbose = false,
  } = options;
  const targets = registry?.targets ?? [];

  const llm = validateAndCreateLlm(llmConfig);
  logStartSummary({ ...options, llm: llmConfig }, targets.length, logger, verbose);

  const spec = await generateOpenAPISpec(registry, {
    llm,
    info,
    servers,
    level,
    dirTargets,
    verbose,
    logger,
  });

  logResultSummary(spec, logger, verbose);
  await writeSpecIfNeeded(spec, outputPath, logger, verbose);

  if (level === 3 && llm) {
    await runLevel3(spec, {
      outputPath,
      overviewPath: overviewPathOption,
      info,
      verbose,
      logger,
    }, llm);
  }

  if (verbose) logger.info('OpenAPI documentation generation completed.');
  return spec;
}

export { generateOpenAPISpec } from './openapi/generator.js';
export { createProvider } from './docs-llm/index.js';
export { buildDocsPage } from './ui/docs-ui.js';
export { analyzeHandler, detectMethods } from './analysis/handler-analyzer.js';
