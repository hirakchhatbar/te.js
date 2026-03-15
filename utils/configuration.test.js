/**
 * @fileoverview Tests for utils/configuration.js
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('loadConfigFile', () => {
  let loadConfigFile;

  beforeEach(async () => {
    // Use dynamic import and mock fs to avoid hitting real filesystem
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a null-prototype object on file not found', async () => {
    vi.doMock('node:fs', () => ({
      default: {},
      promises: {
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
      },
    }));
    const mod = await import('./configuration.js');
    const result = await mod.loadConfigFile();
    expect(Object.getPrototypeOf(result)).toBeNull();
  });

  it('should parse valid JSON config file', async () => {
    const config = { port: 8080, db: { url: 'mongodb://localhost' } };
    vi.doMock('node:fs', () => ({
      default: {},
      promises: {
        readFile: vi.fn().mockResolvedValue(JSON.stringify(config)),
      },
    }));
    const mod = await import('./configuration.js');
    const result = await mod.loadConfigFile();
    expect(result.port).toBe(8080);
  });
});

describe('standardizeObj', () => {
  it('should uppercase keys and flatten nested objects', async () => {
    vi.resetModules();
    const { standardizeObj } = await import('./configuration.js');
    const result = standardizeObj({ db: { url: 'test', port: 5432 } });
    expect(result['DB_URL']).toBe('test');
    expect(result['DB_PORT']).toBe(5432);
  });

  it('should handle null/undefined gracefully', async () => {
    const { standardizeObj } = await import('./configuration.js');
    expect(() => standardizeObj(null)).not.toThrow();
    expect(() => standardizeObj(undefined)).not.toThrow();
  });
});
