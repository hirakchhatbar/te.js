import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

/**
 * Read the framework's own package.json version.
 * Resolves relative to the framework source, not the user's app.
 * @returns {Promise<string>}
 */
export async function readFrameworkVersion() {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const raw = await readFile(path.join(dir, '..', 'package.json'), 'utf8');
    return JSON.parse(raw).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Format milliseconds into a compact human-readable string. */
export function fmtMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

const SPINNER = [
  '\u280B',
  '\u2819',
  '\u2839',
  '\u2838',
  '\u283C',
  '\u2834',
  '\u2826',
  '\u2827',
  '\u2807',
  '\u280F',
];

/**
 * Create a live status line writer for startup progress.
 * On TTY terminals, shows a spinning animation that gets overwritten in-place
 * when the step completes. On non-TTY (piped, CI), only prints the final result.
 * @param {boolean} isTTY
 */
export function statusLine(isTTY) {
  let timer = null;

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    start(feature, message) {
      if (!isTTY) return;
      let frame = 0;
      const render = () => {
        const s = SPINNER[frame % SPINNER.length];
        process.stdout.write(
          `\r\x1b[K  ${feature.padEnd(14)}  \x1b[36m${s}\x1b[0m  \x1b[2m${message}\x1b[0m`,
        );
        frame++;
      };
      render();
      timer = setInterval(render, 80);
    },
    finish(feature, ok, detail) {
      stop();
      if (isTTY) process.stdout.write('\r\x1b[K');
      const icon =
        ok === true
          ? '\x1b[32m\u2713\x1b[0m'
          : ok === false
            ? '\x1b[31m\u2717\x1b[0m'
            : '\x1b[2m\u2014\x1b[0m';
      process.stdout.write(`  ${feature.padEnd(14)}  ${icon}  ${detail}\n`);
    },
  };
}
