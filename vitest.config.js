import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use ESM modules
    environment: 'node',

    // Test file patterns
    include: ['tests/**/*.test.js'],

    // Global test timeout (ms)
    testTimeout: 10000,

    // Enable globals (describe, it, expect, etc.)
    globals: true,

    // Coverage configuration
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
      ],
    },

    // Reporter options
    reporters: ['verbose'],

    // Isolation mode - each test file runs in its own context
    isolate: true,

    // Retry failed tests
    retry: 0,

    // Setup files to run before tests
    setupFiles: [],

    // Dependencies to inline (necessary for some ESM modules)
    deps: {
      interopDefault: true,
    },
  },
});


