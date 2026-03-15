import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    // Adjacent test files (implementation-colocated, per CODING_PRACTICES.md)
    // and legacy centralized test directory both supported.
    include: [
      'tests/**/*.test.js',
      'server/**/*.test.js',
      'rate-limit/**/*.test.js',
      'database/**/*.test.js',
      'utils/**/*.test.js',
      'cors/**/*.test.js',
      'radar/**/*.test.js',
      'lib/**/*.test.js',
      'auto-docs/**/*.test.js',
      'cli/**/*.test.js',
    ],

    testTimeout: 10000,

    globals: true,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'server/**/*.js',
        'database/**/*.js',
        'rate-limit/**/*.js',
        'utils/**/*.js',
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        'example/**',
        'docs/**',
        '**/*.test.js',
      ],
    },

    reporters: ['verbose'],

    isolate: true,

    retry: 0,

    setupFiles: [],

    deps: {
      interopDefault: true,
    },
  },
});
