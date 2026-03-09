---
name: 'Radar: te.js Framework Side'
overview: Framework-side implementation for Radar observability in the te.js repo. Covers data collection, auto-tracing, push agent, and the app.withRadar() API. All features collect data in the te.js app process and push to Radar Cloud via HTTPS.
todos:
  - id: p1
    content: '--- Phase 1: Foundation + Performance Metrics ---'
    status: pending
  - id: p1-with-radar
    content: 1.1 app.withRadar({ apiKey }) API on Tejas class — store config, validate API key format, set OBS_ENABLED flag
    status: pending
  - id: p1-push-agent
    content: 1.2 Push agent — in-memory buffer, batched HTTPS POST to Radar Cloud ingestion endpoint, configurable flush interval/batch size, retry with exponential backoff, non-blocking (never delays request handling)
    status: pending
  - id: p1-collect-metrics
    content: 1.3 Hook into handler.js request lifecycle — on res.finish, capture { timestamp, method, path, status, duration_ms, payload_size, response_size } and queue in push agent buffer
    status: pending
  - id: p1-zero-overhead
    content: 1.4 Zero overhead when Radar is not enabled — all collection and tracing code is gated behind OBS_ENABLED check
    status: pending
  - id: p2
    content: '--- Phase 2: Log Analysis ---'
    status: pending
  - id: p2-collect-logs
    content: 2.1 Extend request lifecycle hook — add ip, user-agent, headers, error message to the captured entry, push as 'log' event type
    status: pending
  - id: p3
    content: '--- Phase 3: Traces ---'
    status: pending
  - id: p3-context
    content: 3.1 AsyncLocalStorage trace context — create context per request with traceId + root spanId, enter on request start, exit on finish
    status: pending
  - id: p3-auto-mw
    content: 3.2 Auto-trace middleware chain — in executeChain (handler.js), wrap each middleware call to create a child span (middleware:<name|index>)
    status: pending
  - id: p3-auto-handler
    content: 3.3 Auto-trace handler — wrap handler execution with span (handler:<endpoint>)
    status: pending
  - id: p3-auto-body
    content: 3.4 Auto-trace body parsing — wrap ammo.enhance()/bodyParser with span
    status: pending
  - id: p3-patch-db
    content: 3.5 Module-level DB patching — on withRadar(), detect installed packages (redis, ioredis, mongoose, pg, mysql2, better-sqlite3) and wrap core methods at prototype level with span creation
    status: pending
  - id: p3-patch-http
    content: 3.6 Outbound HTTP patching — patch globalThis.fetch and http.request to create spans with target hostname
    status: pending
  - id: p3-manual-ammo
    content: 3.7 ammo.trace(name, fn) — add method to Ammo class, creates child span under current request, returns fn result
    status: pending
  - id: p3-manual-standalone
    content: 3.8 Standalone trace() export — import { trace } from 'te.js', uses AsyncLocalStorage to find parent context, creates span
    status: pending
  - id: p3-push-spans
    content: 3.9 Push spans alongside metrics/logs in the same batched payload to Radar Cloud
    status: pending
  - id: p4
    content: '--- Phase 4: Error Tracking ---'
    status: pending
  - id: p4-capture
    content: 4.1 Auto-capture errors — hook into ammo.throw() and errorHandler in handler.js, capture error object + stack trace + current traceId
    status: pending
  - id: p4-fingerprint
    content: 4.2 Error fingerprinting — normalize stack trace (strip line numbers, absolute paths) + message to generate stable grouping key
    status: pending
  - id: p4-push
    content: 4.3 Push error events to Radar — { fingerprint, message, stack, endpoint, traceId, timestamp }
    status: pending
  - id: p5
    content: '--- Phase 5: Runtime Metrics ---'
    status: pending
  - id: p5-collectors
    content: 5.1 Collectors — process.memoryUsage() for heap, perf_hooks.monitorEventLoopDelay for event loop lag, PerformanceObserver for GC pauses, process.cpuUsage() for CPU
    status: pending
  - id: p5-sampling
    content: 5.2 Periodic sampling timer — configurable interval (default 5s), collects all runtime metrics, queues in push agent buffer
    status: pending
  - id: p6
    content: '--- Phase 6: Real-time Live Tail ---'
    status: pending
  - id: p6-no-framework-work
    content: 6.1 No additional framework work — live tail is handled cloud-side from the ingestion pipeline. Data already pushed via push agent.
    status: pending
  - id: p7
    content: '--- Phase 7: Profiling ---'
    status: pending
  - id: p7-command-channel
    content: 7.1 Bidirectional command channel — push agent maintains a polling/WebSocket connection to Radar Cloud for receiving commands (e.g. 'start CPU profile')
    status: pending
  - id: p7-cpu-profile
    content: 7.2 CPU profiling — on command from Radar, start node:inspector Session, collect CPU profile for specified duration, upload result to Radar Cloud
    status: pending
  - id: p7-heap-snapshot
    content: 7.3 Heap snapshot — on command from Radar, capture heap snapshot via node:inspector, upload to Radar Cloud
    status: pending
  - id: p8
    content: '--- Phase 8: Alerting ---'
    status: pending
  - id: p8-no-framework-work
    content: 8.1 No additional framework work — alerting is entirely cloud-side (evaluates rules against stored data, sends notifications)
    status: pending
isProject: false
---

# Radar: te.js Framework Side

This plan covers everything that ships with te.js (open source) to support Radar observability. All code lives in the te.js repo under a new `radar/` directory.

## Key Files to Modify/Create

- `te.js` — add `withRadar()` method to Tejas class, export `trace`
- `radar/index.js` — Radar module entry (push agent, config)
- `radar/push-agent.js` — batched HTTPS push to Radar Cloud
- `radar/trace-context.js` — AsyncLocalStorage trace context management
- `radar/auto-instrument.js` — module-level patching for DB/HTTP
- `radar/collectors/metrics.js` — request metrics collection
- `radar/collectors/logs.js` — structured log collection
- `radar/collectors/errors.js` — error capture + fingerprinting
- `radar/collectors/runtime.js` — Node.js runtime metrics
- `radar/collectors/profiler.js` — CPU/heap profiling via node:inspector
- `server/handler.js` — hook in Radar middleware (gated behind OBS_ENABLED)
- `server/ammo.js` — add `ammo.trace()` method

## Developer Experience

```javascript
import Tejas from 'te.js';

const app = new Tejas();

app.withRadar({ apiKey: 'rdr_xxxx' });

app.takeoff();
// That's it. Metrics, logs, traces, errors, runtime — all automatic.
```

## What Each Phase Adds to the Push Payload

| Phase                  | Event types pushed to Radar Cloud                                                     |
| ---------------------- | ------------------------------------------------------------------------------------- |
| 1. Performance Metrics | `{ type: 'metric', method, path, status, duration_ms, sizes, timestamp }`             |
| 2. Log Analysis        | `{ type: 'log', ...metric fields + ip, user_agent, headers, error }`                  |
| 3. Traces              | `{ type: 'span', traceId, spanId, parentSpanId, name, duration, status, metadata }`   |
| 4. Error Tracking      | `{ type: 'error', fingerprint, message, stack, endpoint, traceId }`                   |
| 5. Runtime Metrics     | `{ type: 'runtime', heap_used, rss, event_loop_lag, gc_pause, cpu_user, cpu_system }` |
| 7. Profiling           | `{ type: 'profile', format, data }` (uploaded separately, large payload)              |

Phases 6 (Live Tail) and 8 (Alerting) require no additional framework work — they're handled entirely on the Radar Cloud side.
