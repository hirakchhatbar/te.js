#!/usr/bin/env node

/**
 * CLI entry point for te.js (tejas).
 * Usage: tejas fly [file] | tejas generate:docs [--ci] | tejas docs:on-push
 */

import { runDocsCommand, runDocsCommandCI, runDocsOnPush } from './docs-command.js';
import { runFlyCommand } from './fly-command.js';

const command = process.argv[2];
const ciFlag = process.argv.includes('--ci');

if (command === 'fly') {
  try {
    runFlyCommand();
  } catch (err) {
    console.error(err?.message ?? err);
    process.exit(1);
  }
} else if (command === 'docs:on-push') {
  runDocsOnPush().catch((err) => {
    console.error(err?.message ?? err);
    process.exit(1);
  });
} else if (command === 'generate:docs') {
  if (ciFlag) {
    runDocsCommandCI().catch((err) => {
      console.error(err?.message ?? err);
      process.exit(1);
    });
  } else {
    runDocsCommand().catch((err) => {
      console.error(err?.message ?? err);
      process.exit(1);
    });
  }
} else {
  console.log(`
tejas - te.js framework CLI

Usage: tejas <command> [options]

Commands:
  fly [file]             Start the Tejas server
  generate:docs [--ci]   OpenAPI documentation generator (interactive or CI mode)
  docs:on-push           Generate docs when pushing to production branch (use in pre-push hook)

Examples:
  tejas fly
  tejas fly index.js
  tejas generate:docs
  tejas generate:docs --ci
  tejas docs:on-push
`);
  process.exit(command ? 1 : 0);
}
