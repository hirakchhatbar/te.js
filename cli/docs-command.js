/**
 * `tejas generate:docs` — interactive documentation generator.
 * Walks the developer through configuration, loads targets, generates an OpenAPI spec,
 * and optionally serves a live preview.
 *
 * Non-interactive (CI/hooks): use `tejas generate:docs --ci` with options from
 * tejas.config.json "docs" and env (LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, etc.).
 *
 * Trigger on push to production: add `tejas docs:on-push` to your pre-push hook;
 * configure production branch via config.docs.productionBranch or DOCS_PRODUCTION_BRANCH.
 */

import path from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { stdin } from 'node:process';
import c from 'ansi-colors';
import 'tej-env';
import { loadConfigFile } from '../utils/configuration.js';
import { findTargetFiles } from '../utils/auto-register.js';
import targetRegistry from '../server/targets/registry.js';
import { generateDocs } from '../auto-docs/index.js';
import { buildDocsPage } from '../auto-docs/ui/docs-ui.js';

const rl = createInterface({ input: process.stdin, output: process.stdout });

function mask(value) {
  if (!value || value.length < 8) return value;
  return value.slice(0, 4) + '••••' + value.slice(-4);
}

function ask(question, fallback = '') {
  const hint = fallback ? c.dim(` (${fallback})`) : '';
  const { promise, resolve } = Promise.withResolvers();
  rl.question(`${c.cyan('?')} ${question}${hint}${c.dim(': ')}`, (answer) => {
    resolve(answer.trim() || fallback);
  });
  return promise;
}

function askYesNo(question, fallback = false) {
  const hint = fallback ? 'Y/n' : 'y/N';
  const { promise, resolve } = Promise.withResolvers();
  rl.question(
    `${c.cyan('?')} ${question} ${c.dim(`(${hint})`)}${c.dim(': ')}`,
    (answer) => {
      const val = answer.trim().toLowerCase();
      if (!val) return resolve(fallback);
      resolve(val === 'y' || val === 'yes');
    },
  );
  return promise;
}

async function loadTargetFiles(dirTargets = 'targets') {
  if (!process.env.DIR_TARGETS) {
    process.env.DIR_TARGETS = dirTargets;
  }
  const targetFiles = await findTargetFiles();
  if (!targetFiles || targetFiles.length === 0) return 0;

  const baseDir = path.join(process.cwd(), process.env.DIR_TARGETS);
  for (const file of targetFiles) {
    const parentPath = file.path || '';
    const fullPath = path.isAbsolute(parentPath)
      ? path.join(parentPath, file.name)
      : path.join(baseDir, parentPath, file.name);
    const relativePath = path.relative(baseDir, fullPath);
    const groupId =
      relativePath.replace(/\.target\.js$/i, '').replace(/\\/g, '/') || 'index';
    targetRegistry.setCurrentSourceGroup(groupId);
    try {
      await import(pathToFileURL(fullPath).href);
    } finally {
      targetRegistry.setCurrentSourceGroup(null);
    }
  }
  return targetFiles.length;
}

/**
 * Build options for generateDocs from tejas.config.json "docs" and env.
 * Used by --ci and docs:on-push.
 * @param {object} [config] - Full config from loadConfigFile()
 * @returns {{ dirTargets: string, output: string, info: object, llm: object, level: number, overviewPath?: string } | null} null if LLM not configured
 */
function getDocsOptionsFromConfig(config = {}) {
  const docs = config.docs || config.generateDocs || {};
  const e = process.env;
  const baseURL =
    docs.llm?.baseURL ?? e.LLM_BASE_URL ?? 'https://api.openai.com/v1';
  const apiKey = docs.llm?.apiKey ?? e.LLM_API_KEY ?? e.OPENAI_API_KEY;
  const model = docs.llm?.model ?? e.LLM_MODEL ?? 'gpt-4o-mini';
  if (!apiKey && !e.OPENAI_API_KEY) {
    return null;
  }
  const dirTargets =
    docs.dirTargets ?? docs.dir?.targets ?? config.dir?.targets ?? 'targets';
  const output = docs.output ?? './openapi.json';
  const title = docs.title ?? 'API';
  const version = docs.version ?? '1.0.0';
  const description = docs.description ?? '';
  const level = Math.max(1, Math.min(3, parseInt(docs.level, 10) || 1));
  const info = { title, version };
  if (description) info.description = description;
  const llm = { baseURL, apiKey: apiKey || e.OPENAI_API_KEY, model };
  const overviewPath =
    level === 3
      ? docs.overviewPath ?? path.join(path.dirname(output), 'API_OVERVIEW.md')
      : undefined;
  return { dirTargets, output, info, llm, level, overviewPath };
}

/**
 * Run documentation generation in non-interactive (CI) mode.
 * Uses tejas.config.json "docs" and env; exits with message if LLM not configured.
 * @returns {Promise<void>}
 */
export async function runDocsCommandCI() {
  const config = await loadConfigFile();
  const options = getDocsOptionsFromConfig(config);
  if (!options) {
    console.error(
      'Documentation generation in CI mode requires LLM credentials. Set LLM_API_KEY (or OPENAI_API_KEY) and optionally LLM_BASE_URL, LLM_MODEL, or add a "docs" section to tejas.config.json.',
    );
    process.exit(1);
  }
  const { dirTargets, output, info, llm, level, overviewPath } = options;
  process.stdout.write(`${c.yellow('⏳')} Loading targets...`);
  const fileCount = await loadTargetFiles(dirTargets);
  const endpointCount = targetRegistry.targets?.length ?? 0;
  process.stdout.write(
    `\r${c.green('✓')} Loaded ${c.bold(fileCount)} target file(s) — ${c.bold(endpointCount)} endpoint(s)\n`,
  );
  if (endpointCount === 0) {
    console.log(c.yellow('  No endpoints found. Skipping doc generation.\n'));
    return;
  }
  process.stdout.write(`${c.yellow('⏳')} Generating OpenAPI spec...`);
  const spec = await generateDocs(targetRegistry, {
    outputPath: output,
    llm,
    info,
    level,
    dirTargets,
    verbose: false,
    ...(level === 3 && overviewPath && { overviewPath }),
  });
  const pathCount = spec.paths ? Object.keys(spec.paths).length : 0;
  const tagCount = spec.tags?.length ?? 0;
  process.stdout.write(
    `\r${c.green('✓')} OpenAPI spec written to ${c.bold(path.resolve(output))} (${pathCount} paths, ${tagCount} tags)\n`,
  );
}

/**
 * Read git pre-push hook stdin and return the list of remote refs being pushed.
 * Format: first line "<remote> <url>", then for each ref "<local_ref> <local_sha> <remote_ref> <remote_sha>"
 * @returns {Promise<string[]>} e.g. ['refs/heads/main', 'refs/heads/feature/x']
 */
function readPrePushRefs() {
  const { promise, resolve } = Promise.withResolvers();
  const chunks = [];
  stdin.on('data', (chunk) => chunks.push(chunk));
  stdin.on('end', () => {
    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n');
    const refs = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(/\s+/);
      if (parts.length >= 4) refs.push(parts[2]);
    }
    resolve(refs);
  });
  return promise;
}

/**
 * Run doc generation when pushing to the configured production branch.
 * Intended for use in a git pre-push hook. Reads refs from stdin; if any ref
 * is the production branch (e.g. refs/heads/main), runs generate:docs in CI mode.
 * Configure via tejas.config.json docs.productionBranch or env DOCS_PRODUCTION_BRANCH (default: main).
 */
export async function runDocsOnPush() {
  const config = await loadConfigFile();
  const docs = config.docs || config.generateDocs || {};
  const productionBranch =
    docs.productionBranch ?? process.env.DOCS_PRODUCTION_BRANCH ?? 'main';
  const remoteRefs = await readPrePushRefs();
  const productionRef = `refs/heads/${productionBranch}`;
  const isPushingToProduction = remoteRefs.some((ref) => ref === productionRef);
  if (!isPushingToProduction) return;
  console.log(
    c.dim(
      `  Docs: pushing to ${productionBranch} — generating documentation...\n`,
    ),
  );
  await runDocsCommandCI();
}

function serveDocsPreview(spec, port = 3333) {
  const html = buildDocsPage('/docs/openapi.json');
  const server = createServer(async (req, res) => {
    const url = req.url?.split('?')[0] || '';
    if (url === '/docs' || url === '/docs/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
    if (url === '/docs/openapi.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(spec));
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });
  const { promise, resolve } = Promise.withResolvers();
  server.listen(port, () => resolve(server));
  return promise;
}

export async function runDocsCommand() {
  const config = await loadConfigFile();
  const e = process.env;

  console.log();
  console.log(c.bold('  te.js Documentation Generator'));
  console.log(c.dim('  ─────────────────────────────────'));
  console.log();

  const dirTargets = await ask(
    'Targets directory',
    config?.dir?.targets || 'targets',
  );
  const output = await ask('Output file', './openapi.json');
  const title = await ask('API title', 'API');
  const version = await ask('API version', '1.0.0');
  const description = await ask('API description', '');

  console.log();
  console.log(c.dim('  Documentation is generated using an LLM (required).'));
  const envBaseURL = e.LLM_BASE_URL || '';
  const envKey = e.LLM_API_KEY || '';
  const envModel = e.LLM_MODEL || '';
  const baseURL = await ask(
    'LLM provider base URL',
    envBaseURL || 'https://api.openai.com/v1',
  );
  const apiKey = await ask('API key', envKey ? mask(envKey) : '');
  const resolvedKey = apiKey === mask(envKey) ? envKey : apiKey;
  const model = await ask('Model', envModel || 'gpt-4o-mini');
  const llm = { baseURL, apiKey: resolvedKey, model };

  console.log();
  const levelAnswer = await ask(
    'Token usage level (higher = better, more comprehensive documentation)\n    1. Moderate       — handler code only (~few hundred tokens per endpoint)\n    2. High           — handler + full dependency chain (~thousands per endpoint)\n    3. Comprehensive  — same as 2, then reorder API groups by importance + generate project/API overview page\n  Choose level',
    '1',
  );
  const level = Math.max(1, Math.min(3, parseInt(levelAnswer, 10) || 1));

  let overviewPath = '';
  if (level === 3) {
    const defaultOverview = path.join(path.dirname(output), 'API_OVERVIEW.md');
    overviewPath = await ask('Overview page path', defaultOverview);
  }

  const serve = await askYesNo('Preview docs after generation?');
  console.log();

  // --- Load targets ---
  process.stdout.write(`${c.yellow('⏳')} Loading targets...`);
  const fileCount = await loadTargetFiles(dirTargets);
  const endpointCount = targetRegistry.targets?.length ?? 0;
  process.stdout.write(
    `\r${c.green('✓')} Loaded ${c.bold(fileCount)} target file(s) — ${c.bold(endpointCount)} endpoint(s)\n`,
  );

  if (endpointCount === 0) {
    console.log(
      c.yellow(
        '\n  No endpoints found. Make sure your target files are in the correct directory.\n',
      ),
    );
    rl.close();
    return;
  }

  // --- Generate spec ---
  process.stdout.write(`${c.yellow('⏳')} Generating OpenAPI spec...`);

  const info = { title, version };
  if (description) info.description = description;

  const spec = await generateDocs(targetRegistry, {
    outputPath: output,
    llm,
    info,
    level,
    dirTargets,
    verbose: true,
    ...(level === 3 && overviewPath && { overviewPath }),
  });

  const pathCount = spec.paths ? Object.keys(spec.paths).length : 0;
  const tagCount = spec.tags?.length ?? 0;
  process.stdout.write(
    `\r${c.green('✓')} OpenAPI spec written to ${c.bold(path.resolve(output))} (${pathCount} paths, ${tagCount} tags)\n`,
  );

  // --- Optional preview ---
  if (serve) {
    const port = Number(process.env.DOCS_PORT) || 3333;
    await serveDocsPreview(spec, port);
    console.log(
      `${c.green('✓')} Docs preview: ${c.underline(`http://localhost:${port}/docs`)}`,
    );
    console.log(c.dim('  Press Ctrl+C to stop.\n'));
  } else {
    console.log();
    rl.close();
  }
}
