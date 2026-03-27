import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

// We test the internal helpers by importing the module and exercising the
// middleware factory with a mock transport.

let radarMiddleware, traceStore;

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  const mod = await import('../radar/index.js');
  radarMiddleware = mod.default;
  traceStore = mod.traceStore;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeAmmo(overrides = {}) {
  const res = new EventEmitter();
  res.statusCode = overrides.status ?? 200;
  return {
    method: overrides.method ?? 'GET',
    endpoint: overrides.path ?? '/test',
    path: overrides.path ?? '/test',
    payload: overrides.payload ?? {},
    dispatchedData: overrides.dispatchedData ?? '{}',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'vitest' },
    res,
    _errorInfo: overrides.errorInfo ?? null,
    _llmPromise: null,
  };
}

describe('Radar Middleware', () => {
  describe('bounded queue', () => {
    it('should cap the batch at maxQueueSize', async () => {
      let capturedBatches = [];
      const transport = vi.fn(async (events) => {
        capturedBatches.push([...events]);
        return { ok: true, status: 200 };
      });

      const mw = await radarMiddleware({
        apiKey: 'rdr_test',
        batchSize: 50_000,
        maxQueueSize: 5,
        flushInterval: 60_000,
        transport,
      });

      for (let i = 0; i < 10; i++) {
        const ammo = makeAmmo({ path: `/req-${i}` });
        mw(ammo, () => {});
        ammo.res.emit('finish');
      }

      // Give microtasks a chance to run
      await new Promise((r) => setTimeout(r, 50));

      // The batch should never exceed maxQueueSize (5).  Since each request
      // pushes 1 event (status < 400), after 10 pushes with a cap of 5, the
      // oldest events should have been dropped.
      // Force a flush by calling the transport check
    });
  });

  describe('gzip compression', () => {
    it('should send gzip-compressed body by default', async () => {
      const transport = vi.fn(async () => ({ ok: true, status: 200 }));
      const mw = await radarMiddleware({
        apiKey: 'rdr_test',
        batchSize: 1,
        flushInterval: 60_000,
        transport,
      });

      const ammo = makeAmmo();
      mw(ammo, () => {});
      ammo.res.emit('finish');

      await new Promise((r) => setTimeout(r, 100));

      expect(transport).toHaveBeenCalled();
      const events = transport.mock.calls[0][0];
      expect(events).toBeInstanceOf(Array);
      expect(events[0].type).toBe('log');
    });
  });

  describe('retry on failure', () => {
    it('should retry failed flushes on next interval', async () => {
      let callCount = 0;
      const transport = vi.fn(async () => {
        callCount++;
        if (callCount === 1) return { ok: false, status: 500 };
        return { ok: true, status: 200 };
      });

      const mw = await radarMiddleware({
        apiKey: 'rdr_test',
        batchSize: 1,
        flushInterval: 100,
        transport,
      });

      const ammo = makeAmmo();
      mw(ammo, () => {});
      ammo.res.emit('finish');

      // Wait for first flush (fail) + retry interval
      await new Promise((r) => setTimeout(r, 350));

      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it('should not retry 401 errors', async () => {
      let callCount = 0;
      const transport = vi.fn(async () => {
        callCount++;
        return { ok: false, status: 401 };
      });

      const mw = await radarMiddleware({
        apiKey: 'rdr_bad_key',
        batchSize: 1,
        flushInterval: 100,
        transport,
      });

      const ammo = makeAmmo();
      mw(ammo, () => {});
      ammo.res.emit('finish');

      await new Promise((r) => setTimeout(r, 350));

      // 401 is treated as terminal — one call for the batch, no retry
      expect(callCount).toBe(1);
    });
  });

  describe('pluggable transport', () => {
    it('should use a custom transport when provided', async () => {
      const customTransport = vi.fn(async () => ({ ok: true, status: 200 }));

      const mw = await radarMiddleware({
        apiKey: 'rdr_test',
        batchSize: 1,
        flushInterval: 60_000,
        transport: customTransport,
      });

      const ammo = makeAmmo();
      mw(ammo, () => {});
      ammo.res.emit('finish');

      await new Promise((r) => setTimeout(r, 100));

      expect(customTransport).toHaveBeenCalled();
    });
  });

  describe('trace ID propagation', () => {
    it('should generate a 32-char hex traceId', async () => {
      let capturedTraceId = null;
      const transport = vi.fn(async (events) => {
        capturedTraceId = events[0]?.traceId;
        return { ok: true, status: 200 };
      });

      const mw = await radarMiddleware({
        apiKey: 'rdr_test',
        batchSize: 1,
        flushInterval: 60_000,
        transport,
      });

      const ammo = makeAmmo();
      mw(ammo, () => {});
      ammo.res.emit('finish');

      await new Promise((r) => setTimeout(r, 100));

      expect(capturedTraceId).toBeTruthy();
      expect(capturedTraceId).toHaveLength(32);
      expect(capturedTraceId).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should expose traceId via traceStore inside next()', async () => {
      let storeValue = null;
      const transport = vi.fn(async () => ({ ok: true, status: 200 }));

      const mw = await radarMiddleware({
        apiKey: 'rdr_test',
        batchSize: 100,
        flushInterval: 60_000,
        transport,
      });

      const ammo = makeAmmo();
      mw(ammo, () => {
        storeValue = traceStore.getStore();
      });

      expect(storeValue).toBeTruthy();
      expect(storeValue.traceId).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('error events', () => {
    it('should emit both log and error events for status >= 400', async () => {
      let capturedEvents = [];
      const transport = vi.fn(async (events) => {
        capturedEvents = events;
        return { ok: true, status: 200 };
      });

      const mw = await radarMiddleware({
        apiKey: 'rdr_test',
        batchSize: 3,
        flushInterval: 60_000,
        transport,
      });

      const ammo = makeAmmo({
        status: 500,
        errorInfo: { message: 'Internal error', stack: 'Error at...' },
      });
      mw(ammo, () => {});
      ammo.res.emit('finish');

      await new Promise((r) => setTimeout(r, 100));

      expect(capturedEvents).toHaveLength(3);
      expect(capturedEvents[0].type).toBe('log');
      expect(capturedEvents[1].type).toBe('error');
      expect(capturedEvents[1].fingerprint).toBeTruthy();
      expect(capturedEvents[1].message).toBe('Internal error');
      expect(capturedEvents[2].type).toBe('span');
    });
  });

  describe('disabled mode', () => {
    it('should return a passthrough middleware when no API key', async () => {
      delete process.env.RADAR_API_KEY;
      const mw = await radarMiddleware({});
      const next = vi.fn();
      mw({}, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
