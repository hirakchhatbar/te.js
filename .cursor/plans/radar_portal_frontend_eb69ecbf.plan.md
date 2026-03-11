---
name: Radar Portal Frontend
overview: Frontend for radar.tejas.dev — the observability dashboard for te.js apps. Vite + React + TypeScript + shadcn/ui + ECharts. Pages are organized by feature, each with its own route, hooks, and components. Project is a header-level filter (multi-select, URL-driven); all pages show data across whichever projects the user selects. Follows DESIGN_GUIDELINES.md and CODE_PRACTICES.md throughout.
todos:
  - id: foundation
    content: '--- Foundation ---'
    status: completed
  - id: foundation-auth-layout
    content: 'Auth layout: full-screen radar background (SVG) + centered glass panel; used by login and signup'
    status: completed
  - id: foundation-api-client
    content: 'API client (lib/api.ts): typed fetch wrapper, auth headers, base URL, Zod response validation, VITE_USE_DUMMY toggle'
    status: completed
  - id: foundation-api-types
    content: 'API types (lib/api-types.ts): Zod schemas + inferred TS types for every API response'
    status: completed
  - id: foundation-query-keys
    content: 'Query key factory (lib/query-keys.ts): all keys accept projectIds[] for list queries, single projectId for detail queries'
    status: completed
  - id: foundation-dummy-layer
    content: 'Dummy data layer (lib/dummy/): generators + fixtures that mirror real API types; activated by VITE_USE_DUMMY=true'
    status: completed
  - id: foundation-zustand
    content: 'Zustand store (stores/radar-store.ts): theme, sidebarCollapsed, refreshInterval only — no project state (project is URL)'
    status: completed
  - id: foundation-utils
    content: 'Utilities: format.ts (duration, date, number), colors.ts (status code colors, span type colors), constants.ts (polling intervals)'
    status: completed
  - id: login
    content: '--- Page: Login (/login) ---'
    status: completed
  - id: login-route
    content: 'Login: route file + auth layout; redirect to /dashboard if already authenticated'
    status: completed
  - id: login-form
    content: 'Login: Shadcn Form, Field, Input, Label, Button — email + password'
    status: completed
  - id: login-validation
    content: 'Login: Zod schema, field-level and form-level error display'
    status: completed
  - id: login-submit
    content: 'Login: submit → store JWT (httpOnly cookie), redirect to /dashboard'
    status: completed
  - id: login-design
    content: 'Login: glass panel, aviation copy per DESIGN_GUIDELINES ("Cleared for approach"), theme tokens only'
    status: completed
  - id: login-states
    content: 'Login: loading spinner on submit, API error display, a11y (labels, focus rings)'
    status: completed
  - id: signup
    content: '--- Page: Signup (/signup) ---'
    status: completed
  - id: signup-route
    content: 'Signup: route file + same auth layout as login'
    status: completed
  - id: signup-form
    content: 'Signup: Shadcn Form — email, password, confirm password; Zod validation'
    status: completed
  - id: signup-submit-design
    content: 'Signup: submit + redirect; aviation copy ("Ready for takeoff"); loading/error/a11y'
    status: completed
  - id: shell
    content: '--- App Shell (shared by all data pages) ---'
    status: completed
  - id: shell-layout
    content: 'AppShell: SidebarProvider + collapsible Sidebar + SidebarInset layout'
    status: completed
  - id: shell-sidebar
    content: 'Sidebar: logo, nav links (Dashboard, Metrics, Logs, Traces, Errors, Runtime, Live, Profiler, Alerts, Settings); active state from pathname'
    status: completed
  - id: shell-header
    content: 'Header: ProjectFilter (multi-select, URL-synced) + user menu (avatar, sign out)'
    status: completed
  - id: shell-project-filter
    content: 'ProjectFilter component: multi-select; options from useProjects(); writes ?project=id to URL; "Select a project" empty stateheader on small screens'
    status: completed
  - id: shell-error-boundaries
    content: 'Error boundaries: one per major section so a failing query does not crash the whole page'
    status: completed
  - id: shared
    content: '--- Shared Components ---'
    status: completed
  - id: shared-time-range
    content: 'TimeRangeSelector: presets (5m, 15m, 1h, 6h, 24h, 7d) + custom range; syncs to URL ?from=&to='
    status: completed
  - id: shared-metric-card
    content: 'MetricCard: label, large value, optional trend indicator and sparkline'
    status: completed
  - id: shared-status-badge
    content: 'StatusBadge: HTTP status color coding — green 2xx, yellow 4xx, red 5xx'
    status: completed
  - id: shared-endpoint-pill
    content: 'EndpointPill: METHOD /path formatted display'
    status: completed
  - id: shared-duration
    content: 'DurationDisplay: human-readable duration (0.3ms, 127ms, 2.1s)'
    status: completed
  - id: shared-empty-state
    content: 'EmptyState: icon + title + description; used when query returns no data'
    status: completed
  - id: shared-error-panel
    content: 'ErrorPanel: error message + retry button; used in every data surface'
    status: completed
  - id: shared-connection-status
    content: 'ConnectionStatus: shows Radar Cloud connection health in the shell footer'
    status: completed
  - id: shared-data-table
    content: 'DataTable: Shadcn Table wrapper with sort, optional virtualization (@tanstack/react-virtual)'
    status: completed
  - id: shared-echarts
    content: 'TimeSeriesChart: ECharts wrapper — shared dark/light theme, lazyUpdate, responsive resize'
    status: completed
  - id: dashboard
    content: '--- Page: Dashboard (/dashboard) ---'
    status: completed
  - id: dashboard-route
    content: 'Dashboard: route + app shell; / redirects here when authenticated'
    status: completed
  - id: dashboard-timerange
    content: 'Dashboard: TimeRangeSelector in URL (?from, ?to)'
    status: completed
  - id: dashboard-aggregate
    content: 'Dashboard: aggregate stat cards row — total requests, error rate, P95 latency across selected projects'
    status: completed
  - id: dashboard-health-cards
    content: 'Dashboard: per-project health card grid — name, key metrics, health status; click → /metrics filtered to that project'
    status: completed
  - id: dashboard-errors-strip
    content: 'Dashboard: recent critical errors across selected projects — message, project, count, last seen; links to /errors/:groupId'
    status: completed
  - id: dashboard-typed-links
    content: 'Dashboard: once /metrics and /errors/$groupId routes exist, switch health cards and errors strip to typed Link (from <a href>) so build passes and SPA navigation works'
    status: in_progress
  - id: dashboard-alerts-strip
    content: 'Dashboard: active triggered alerts across selected projects; links to /alerts'
    status: completed
  - id: dashboard-hooks-states
    content: 'Dashboard: useDashboard(projectIds, timeRange); loading skeletons per section; EmptyState when no projects selected; per-section error boundaries'
    status: completed
  - id: metrics
    content: '--- Page: Metrics (/metrics) ---'
    status: completed
  - id: metrics-route
    content: 'Metrics: route + app shell + ProjectFilter + TimeRangeSelector wired to URL'
    status: completed
  - id: metrics-hooks
    content: 'Metrics: useStatsRealtime(projectIds), useStatsHistorical(projectIds, range) — polling intervals from constants'
    status: completed
  - id: metrics-cards
    content: 'Metrics: stat cards — total requests, error rate, avg latency, P95; polling every 3s'
    status: completed
  - id: metrics-charts
    content: 'Metrics: ECharts line charts — requests/sec, error rate, P50/P95/P99 latency; keepPreviousData on filter change'
    status: completed
  - id: metrics-table
    content: 'Metrics: top endpoints table — sortable by requests, latency, error rate; project column when multiple selected'
    status: completed
  - id: metrics-states
    content: 'Metrics: Skeleton, ErrorPanel, EmptyState (no project / no data)'
    status: completed
  - id: logs
    content: '--- Page: Log Explorer (/logs) ---'
    status: completed
  - id: logs-route
    content: 'Logs: route; project + time range + all filters in URL search params'
    status: pending
  - id: logs-hooks
    content: 'Logs: useLogs(projectIds, filters) — cursor-based pagination, refetch every 10s'
    status: pending
  - id: logs-filter-bar
    content: 'Logs: filter bar — status code, method, endpoint search, IP, free-text search; Shadcn Select/Input; sync to URL'
    status: pending
  - id: logs-table
    content: 'Logs: virtualized table — timestamp, method, path, StatusBadge, duration, IP; project column when multi-project'
    status: pending
  - id: logs-detail-drawer
    content: 'Logs: row click → Shadcn Sheet; full log detail — request/response headers, payload sizes, error message'
    status: pending
  - id: logs-pagination
    content: 'Logs: cursor-based "load more" via TanStack Query; cursor in URL'
    status: pending
  - id: logs-states
    content: 'Logs: Skeleton, ErrorPanel, EmptyState'
    status: pending
  - id: traces-list
    content: '--- Page: Traces (/traces) ---'
    status: pending
  - id: traces-route
    content: 'Traces: route; project + time range + filters in URL'
    status: pending
  - id: traces-hooks
    content: 'Traces: useTraces(projectIds, filters); refetch every 10s'
    status: pending
  - id: traces-table
    content: 'Traces: table — root endpoint, total duration, span count, status; sortable by duration; project column when multi'
    status: pending
  - id: traces-filters
    content: 'Traces: filter bar — endpoint, min duration, status; sync to URL; row click → /traces/:traceId?project=id'
    status: pending
  - id: traces-states
    content: 'Traces: Skeleton, ErrorPanel, EmptyState'
    status: pending
  - id: trace-detail
    content: '--- Page: Trace Detail (/traces/:traceId) ---'
    status: pending
  - id: trace-detail-route
    content: 'Trace detail: route; reads ?project=id from URL; useTrace(projectId, traceId)'
    status: pending
  - id: trace-detail-header
    content: 'Trace detail: breadcrumb + summary header — endpoint, total duration, timestamp, status'
    status: pending
  - id: trace-detail-waterfall
    content: 'Trace detail: waterfall chart — nested horizontal bars per span, color-coded by type (middleware/handler/db/http); lazy-loaded'
    status: pending
  - id: trace-detail-span-panel
    content: 'Trace detail: span click → side panel — name, duration, status, metadata key-value pairs'
    status: pending
  - id: trace-detail-bottleneck
    content: 'Trace detail: bottleneck table — span name, avg/P95 duration, occurrence count, % of total request time'
    status: pending
  - id: trace-detail-states
    content: 'Trace detail: Skeleton, ErrorPanel; link to related log entry via traceId'
    status: pending
  - id: errors-list
    content: '--- Page: Errors (/errors) ---'
    status: pending
  - id: errors-route
    content: 'Errors: route; project + time range in URL'
    status: pending
  - id: errors-hooks
    content: 'Errors: useErrors(projectIds, filters); refetch every 10s'
    status: pending
  - id: errors-table
    content: 'Errors: table — message (truncated), count, first seen, last seen, frequency sparkline, status badge (new/recurring); project column when multi'
    status: pending
  - id: errors-sort
    content: 'Errors: sort toggle — most recent vs most frequent; row click → /errors/:groupId?project=id'
    status: pending
  - id: errors-states
    content: 'Errors: Skeleton, ErrorPanel, EmptyState'
    status: pending
  - id: error-detail
    content: '--- Page: Error Detail (/errors/:groupId) ---'
    status: pending
  - id: error-detail-route
    content: 'Error detail: route; reads ?project=id from URL; useErrorGroup(projectId, groupId)'
    status: pending
  - id: error-detail-header
    content: 'Error detail: header — error message, total count, first/last seen'
    status: pending
  - id: error-detail-stack
    content: 'Error detail: stack trace viewer — syntax-highlighted, collapsible frames, monospace font'
    status: pending
  - id: error-detail-occurrences
    content: 'Error detail: occurrences table — timestamp, endpoint, traceId (links to trace detail)'
    status: pending
  - id: error-detail-llm
    content: 'Error detail: LLM insight panel — AI root cause summary when available from withLLMErrors'
    status: pending
  - id: error-detail-chart
    content: 'Error detail: frequency trend chart — error occurrences over time (ECharts)'
    status: pending
  - id: error-detail-states
    content: 'Error detail: Skeleton, ErrorPanel, EmptyState'
    status: pending
  - id: runtime
    content: '--- Page: Runtime (/runtime) ---'
    status: pending
  - id: runtime-route
    content: 'Runtime: route; project + time range in URL'
    status: pending
  - id: runtime-hooks
    content: 'Runtime: useRuntimeMetrics(projectIds, timeRange); refetch every 5s'
    status: pending
  - id: runtime-instance
    content: 'Runtime: instance selector — per-instance or aggregated view'
    status: pending
  - id: runtime-charts
    content: 'Runtime: 2×2 ECharts grid — heap memory (used/total/rss), event loop lag, GC pauses, CPU (user + system)'
    status: pending
  - id: runtime-states
    content: 'Runtime: Skeleton, ErrorPanel, EmptyState; chart colors from design tokens'
    status: pending
  - id: live
    content: '--- Page: Live Tail (/live) ---'
    status: pending
  - id: live-route
    content: 'Live: route; project in URL; useLiveTail(projectIds, filters)'
    status: pending
  - id: live-connection
    content: 'Live: WebSocket to /live with project scope; auto-reconnect; ConnectionStatus indicator'
    status: pending
  - id: live-buffer
    content: 'Live: high-frequency buffer — events pushed to useRef, flushed to state every 100ms to avoid render thrashing'
    status: pending
  - id: live-list
    content: 'Live: virtualized event list — type icon (log/span/error), project badge when multi, summary, timestamp; click to expand inline'
    status: pending
  - id: live-filters
    content: 'Live: filter controls — event type checkboxes, endpoint, status code, min duration; sent to server'
    status: pending
  - id: live-pause
    content: 'Live: pause/resume toggle — buffers events while paused, shows "N new events" banner; resumes scrolls to latest'
    status: pending
  - id: live-states
    content: 'Live: EmptyState when no project selected; reconnecting state; a11y (live region for new event count)'
    status: pending
  - id: profiler
    content: '--- Page: Profiler (/profiler) ---'
    status: pending
  - id: profiler-route
    content: 'Profiler: route; project in URL; useProfiles(projectIds)'
    status: pending
  - id: profiler-trigger
    content: 'Profiler: trigger controls — "Start CPU Profile" with duration selector (5s / 10s / 30s), "Capture Heap Snapshot" button; target project selector when multiple selected'
    status: pending
  - id: profiler-history
    content: 'Profiler: history table — type (CPU/Heap), project, timestamp, duration/size, status; row click → /profiler/:profileId?project=id'
    status: pending
  - id: profiler-states
    content: 'Profiler: Skeleton, ErrorPanel, EmptyState; Sonner toast on trigger success/failure'
    status: pending
  - id: flamegraph
    content: '--- Page: Flame Graph (/profiler/:profileId) ---'
    status: pending
  - id: flamegraph-route
    content: 'Flame graph: route; reads ?project=id from URL; useProfile(projectId, profileId); React.lazy for heavy viewer'
    status: pending
  - id: flamegraph-viewer
    content: 'Flame graph: interactive viewer — click to zoom, hover tooltip (function name, file, self/total time), search to highlight frames'
    status: pending
  - id: flamegraph-heap
    content: 'Flame graph: heap mode — top allocations summary table when profile type is heap'
    status: pending
  - id: flamegraph-states
    content: 'Flame graph: Skeleton, ErrorPanel; theme tokens only (no hardcoded colors)'
    status: pending
  - id: alerts
    content: '--- Page: Alerts (/alerts) ---'
    status: pending
  - id: alerts-route
    content: 'Alerts: route; project in URL; useAlerts(projectIds) + useAlertHistory(projectIds) + CRUD mutations'
    status: pending
  - id: alerts-tabs
    content: 'Alerts: Shadcn Tabs — "Rules" and "History"'
    status: pending
  - id: alerts-rules-table
    content: 'Alerts: Rules tab — table (project, metric, condition, threshold, window, channel, status); edit/delete per row'
    status: pending
  - id: alerts-rule-form
    content: 'Alerts: create/edit rule Dialog — project selector, metric (error_rate/p95_latency/request_count), condition, threshold, window, notification channel'
    status: pending
  - id: alerts-history
    content: 'Alerts: History tab — triggered alerts list (timestamp, project, rule name, value, resolved status)'
    status: pending
  - id: alerts-channels
    content: 'Alerts: notification channel config section — webhook URL, Slack webhook, email'
    status: pending
  - id: alerts-states
    content: 'Alerts: Skeleton, ErrorPanel, EmptyState; form validation with Zod; Sonner toasts for mutations'
    status: pending
  - id: settings
    content: '--- Page: Settings (/settings) ---'
    status: completed
  - id: settings-route
    content: 'Settings: route; useApiKeys(), useTeam() hooks'
    status: completed
  - id: settings-api-keys
    content: 'Settings: API keys section — list keys (name, prefix, created, last used), create key (show full key once), revoke with confirmation; keys are account-level, one key works across all te.js projects'
    status: completed
  - id: settings-team
    content: 'Settings: team section — invite member by email, role selector (admin/member/viewer), remove member'
    status: completed
  - id: settings-account
    content: 'Settings: account section — display name, email, password change'
    status: completed
  - id: settings-states
    content: 'Settings: Skeleton, ErrorPanel; destructive actions require confirmation dialog; Sonner toasts'
    status: completed
  - id: billing
    content: '--- Page: Billing (/settings/billing) ---'
    status: pending
  - id: billing-route
    content: 'Billing: route; useBilling() hook'
    status: pending
  - id: billing-plan-usage
    content: 'Billing: current plan card + events usage bar (used / limit)'
    status: pending
  - id: billing-comparison
    content: 'Billing: plan comparison cards — Free, Pro, Team; current plan highlighted'
    status: pending
  - id: billing-stripe
    content: 'Billing: upgrade/downgrade → Stripe Checkout redirect; no card data handled in-app'
    status: pending
  - id: billing-invoices
    content: 'Billing: invoice history list — date, amount, status, PDF download link'
    status: pending
  - id: billing-states
    content: 'Billing: Skeleton, ErrorPanel; clear copy on plan limits'
    status: pending
isProject: false
---

# Radar Portal Frontend

Radar is the observability portal for te.js applications, live at `radar.tejas.dev`. Developers instrument their apps with `app.withRadar({ apiKey })` and this portal shows them everything: request metrics, logs, distributed traces, error groups, runtime health, live event stream, CPU/heap profiles, and alerting — all in one place.

**Codebase location:** `tejas-radar/frontend/`

---

## Product Model

Developers add `withRadar({ apiKey })` to their te.js app and put the API key in their project's `package.json`. The portal backend discovers which projects exist by reading the `name` field from `package.json` whenever a te.js app sends its first ingestion event — no manual project setup required.

**API keys are account-level.** One key can be used across any number of projects. Users manage their keys in Settings.

The portal shows data across all of a user's projects simultaneously. Project is a **header-level filter** (multi-select dropdown), not a route segment. Selecting one or more projects scopes every page — Dashboard, Metrics, Logs, Traces, Errors, Runtime, Live, Profiler, and Alerts — to that set. The selection is stored in URL search params (`?project=id1&project=id2`) so any view can be bookmarked or shared.

---

## Tech Stack

| Layer         | Choice                                                                     |
| ------------- | -------------------------------------------------------------------------- |
| Build         | Vite + React + TypeScript (strict mode)                                    |
| UI components | shadcn/ui (base-nova style, neutral base, OKLCH variables)                 |
| Styling       | Tailwind CSS — theme tokens only, no hardcoded hex/rgb                     |
| Charts        | Apache ECharts via `echarts-for-react`                                     |
| Server state  | TanStack Query — typed hooks only; no raw `useQuery` in components         |
| Routing       | TanStack Router — file-based routes, type-safe search params               |
| Client state  | Zustand (devtools + persist) — theme, sidebar state, refresh interval only |
| Validation    | Zod — API responses and form inputs                                        |
| Icons         | Lucide React — `size-4` inline, `size-5` standalone                        |
| Font          | Geist Variable via `@fontsource-variable/geist`                            |

---

## Mandatory Guidelines

Read these two documents before implementing any page or component. They are the single source of truth for all decisions.

| Document              | Path                                             | Covers                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design Guidelines** | `tejas-radar/frontend/docs/DESIGN_GUIDELINES.md` | Product identity, aviation theme, Shadcn-first rules, color system (OKLCH tokens), typography (Geist), iconography, dark/light mode, spacing, borders, responsive approach, what belongs in `index.css`                       |
| **Code Practices**    | `tejas-radar/frontend/docs/CODE_PRACTICES.md`    | Component layer separation, file organization, naming conventions, TypeScript rules, state management strategy, data-fetching pattern (hooks only), loading/error/empty states, accessibility, performance, quality checklist |

**Key rules:**

- **Shadcn first.** Use Shadcn components for every UI primitive. Install via CLI (`npx shadcn@latest add <name>`). Never write custom CSS for elements Shadcn provides.
- **Theme tokens only.** `bg-background`, `text-primary`, `border-border`, etc. No hardcoded hex, rgb, or rgba anywhere.
- **Three states on every data surface.** Loading → `Skeleton`. Error → `ErrorPanel` (with retry). Empty → `EmptyState`.
- **Data via hooks only.** Route components and feature components never call `useQuery` directly. All API access goes through typed hooks in `hooks/`.
- **Quality bar.** Before marking any task done: `lint` passes, `build` passes, both dark and light modes look correct, keyboard navigation works, no new `index.css` classes.

---

## Folder Structure

```
tejas-radar/frontend/src/
├── components/
│   ├── ui/              # shadcn/ui — CLI-generated, never manually edited
│   ├── layout/          # AppShell, Sidebar, Header, ProjectFilter, PageContainer
│   ├── shared/          # MetricCard, StatusBadge, EndpointPill, DurationDisplay,
│   │                    # TimeRangeSelector, DataTable, EmptyState, ErrorPanel, ConnectionStatus
│   ├── charts/          # TimeSeriesChart, WaterfallChart, FlameGraph (ECharts wrappers)
│   └── [feature]/       # dashboard/, metrics/, logs/, traces/, errors/,
│                        # runtime/, live/, profiler/, alerts/
├── routes/              # TanStack Router file-based routes
│   ├── __root.tsx       # Auth layout (radar SVG bg) for /login + /signup; plain Outlet for rest
│   ├── index.tsx        # / → redirect to /dashboard
│   ├── login.tsx
│   ├── signup.tsx
│   ├── dashboard.tsx
│   ├── metrics.tsx
│   ├── logs.tsx
│   ├── traces/
│   │   ├── index.tsx
│   │   └── $traceId.tsx
│   ├── errors/
│   │   ├── index.tsx
│   │   └── $groupId.tsx
│   ├── runtime.tsx
│   ├── live.tsx
│   ├── profiler/
│   │   ├── index.tsx
│   │   └── $profileId.tsx
│   ├── alerts.tsx
│   └── settings/
│       ├── index.tsx
│       └── billing.tsx
├── hooks/
│   ├── use-projects.ts       # useProjects() — populates the ProjectFilter
│   ├── use-stats.ts          # useStatsRealtime(), useStatsHistorical()
│   ├── use-logs.ts
│   ├── use-traces.ts         # useTraces(), useTrace()
│   ├── use-errors.ts         # useErrors(), useErrorGroup()
│   ├── use-runtime.ts
│   ├── use-live-tail.ts      # WebSocket + ref buffer
│   ├── use-profiles.ts       # useProfiles(), useProfile(), useTriggerProfile()
│   ├── use-alerts.ts         # useAlerts(), useAlertHistory() + mutations
│   ├── use-settings.ts       # useApiKeys(), useCreateApiKey(), useRevokeApiKey(), useTeam()
│   └── use-billing.ts
├── stores/
│   └── radar-store.ts        # Zustand: theme, sidebarCollapsed, refreshInterval
├── lib/
│   ├── api.ts                # Typed fetch wrapper; delegates to dummy/ when VITE_USE_DUMMY=true
│   ├── api-types.ts          # Zod schemas + z.infer<> TypeScript types
│   ├── query-keys.ts         # radarKeys factory — list keys take string[], detail keys take string
│   ├── auth.ts               # isAuthenticated(), getToken()
│   └── dummy/                # Mock API matching real api.ts interface
│       ├── index.ts
│       ├── generators/       # metrics.ts, logs.ts, traces.ts, errors.ts, runtime.ts, profiles.ts, alerts.ts
│       ├── fixtures/         # endpoints.ts, stack-traces.ts, user-agents.ts
│       └── utils.ts          # randomBetween, gaussianDuration, timeSeriesGenerator
└── utils/
    ├── format.ts             # formatDuration, formatDate, formatNumber
    ├── colors.ts             # statusColor, spanTypeColor
    └── constants.ts          # POLLING_INTERVALS, DEFAULT_TIME_RANGE
```

Route files stay under ~150 lines. Any section exceeding that gets extracted to `components/[feature]/`.

---

## State Architecture

| State type            | Tool                          | Examples                                                  |
| --------------------- | ----------------------------- | --------------------------------------------------------- |
| Server data           | TanStack Query                | Metrics, logs, traces, errors, runtime, alerts            |
| URL state             | TanStack Router search params | Selected projects, time range, filters, pagination cursor |
| Client preferences    | Zustand (persist)             | Theme, sidebar open/closed, refresh interval              |
| Component-local       | `useState`                    | Form inputs, dialog open state, hover                     |
| High-frequency buffer | `useRef` + periodic flush     | WebSocket events in Live Tail                             |

**Rules:**

- Never put API response data in Zustand.
- Never put project selection in Zustand — it lives in `?project=` URL params.
- Never put shareable state (filters, time range, selected tab) in Zustand — use URL search params so links work.

### Project filter pattern

Every data hook reads `projectIds: string[]` from the page's URL search params and includes them in the query key and API call. When the array is empty the query is disabled and the page shows `EmptyState` prompting the user to select a project.

```typescript
// hooks/use-stats.ts
export function useStatsRealtime(projectIds: string[]) {
  return useQuery({
    queryKey: radarKeys.statsRealtime(projectIds),
    queryFn: () => api.getStatsRealtime(projectIds[0]), // backend aggregation when ready
    refetchInterval: POLLING_INTERVALS.realtime,
    enabled: projectIds.length > 0,
  });
}
```

### Query key convention

- **List keys** take `projectIds: string[]` — array is sorted before use so `['a','b']` and `['b','a']` share the same cache entry.
- **Detail keys** take `projectId: string` — a trace, error group, or profile always belongs to one project, passed via `?project=id` in the URL.

---

## Routing and URL Shape

All routes are flat. Project is never a URL segment.

```
/login
/signup
/dashboard             ?project=id1&project=id2&from=1h
/metrics               ?project=id1&from=1h
/logs                  ?project=id1&from=1h&status=500&method=POST
/traces                ?project=id1&from=1h&minDurationMs=100
/traces/:traceId       ?project=id1
/errors                ?project=id1&from=24h&sort=recent
/errors/:groupId       ?project=id1
/runtime               ?project=id1&from=1h
/live                  ?project=id1
/profiler              ?project=id1
/profiler/:profileId   ?project=id1
/alerts                ?project=id1
/settings
/settings/billing
```

Detail pages (`:traceId`, `:groupId`, `:profileId`) require `?project=id` in the URL because the backend scopes those resources per project. List pages always link to detail with `?project=id` included.

---

## Dummy Data Mode

```
VITE_USE_DUMMY=true   →  lib/api.ts uses lib/dummy/ (no network)
VITE_USE_DUMMY=false  →  lib/api.ts hits the real Radar Cloud API
```

Dummy generators return the same TypeScript types as the real API so switching is a single env var change. Optional `VITE_DUMMY_SEED=42` makes output deterministic.

```json
{
  "dev": "VITE_USE_DUMMY=true vite",
  "dev:api": "vite",
  "seed": "tsx scripts/seed-dev-data.ts"
}
```

---

## Pages

---

### 1. Login — `/login`

**Purpose:** Authenticate user and redirect to the dashboard.

**Implementation:**

- Route: `routes/login.tsx`. Auth layout (no sidebar). If already authenticated, redirect to `/dashboard` in `beforeLoad`.
- Form: email + password. Shadcn `Form`, `Field`, `Input`, `Label`, `Button`.
- Validation: Zod. Show field-level and form-level errors inline.
- On success: store JWT (httpOnly cookie per backend), redirect to `/dashboard`.
- Design: glass panel, aviation copy per DESIGN_GUIDELINES ("Cleared for approach", "Your instruments are standing by."), theme tokens only.
- States: loading spinner on submit, API error message, a11y labels and focus rings.

---

### 2. Signup — `/signup`

**Purpose:** Register a new account and onboard to the portal.

**Implementation:**

- Route: `routes/signup.tsx`. Same auth layout as login.
- Form: email, password, confirm password. Shadcn components, Zod validation.
- Design: aviation copy per DESIGN_GUIDELINES ("Ready for takeoff", "Configure once. Fly forever.").
- States: loading, error, a11y.

---

### 3. App Shell (shared layout for all data pages)

**Purpose:** Consistent navigation and project filter surrounding every data page.

**Implementation:**

- `AppShell`: `SidebarProvider` + collapsible `Sidebar` + `SidebarInset`. Width 18rem expanded, icon-only when collapsed.
- Sidebar header: Tejas Radar logo + `SidebarTrigger`.
- Sidebar nav: Dashboard, Metrics, Logs, Traces, Errors, Runtime, Live, Profiler, Alerts, Settings. Active state from `useLocation()`.
- Main header: `ProjectFilter` (multi-select; `useProjects()` options; writes `?project=` to URL) + user menu (avatar, sign out).
- Error boundaries: one per page section so a failing query does not break the entire view.
- Responsive: sidebar collapses to icon strip on mobile.

---

### 4. Dashboard — `/dashboard`

**Purpose:** Single-pane overview — health, errors, and alerts across all selected projects.

**Implementation:**

- Route: `routes/dashboard.tsx`. Protected. `routes/index.tsx` redirects `/` here.
- `TimeRangeSelector` in URL. `ProjectFilter` in header.
- **Aggregate stats row:** Total requests, error rate, P95 latency across selected projects. `MetricCard` components.
- **Project health cards:** One card per selected project — name, key metrics, health status (healthy/degraded/critical). Click → `/metrics?project=id`.
- **Critical errors strip:** Recent error groups across selected projects — message, project name, count, last seen. Links to `/errors/:groupId?project=id`.
- **Active alerts strip:** Triggered alerts across selected projects. Links to `/alerts?project=id`.
- Hooks: `useDashboard(projectIds, timeRange)` or per-section hooks; all take projectIds from URL.
- States: per-section skeletons; `EmptyState` when no project selected ("Select a project to see your flight deck."); "All clear" when no errors/alerts.

---

### 5. Metrics — `/metrics`

**Purpose:** Request performance overview — traffic, error rate, latency, top endpoints.

**Implementation:**

- Route: `routes/metrics.tsx`. `ProjectFilter` + `TimeRangeSelector` in URL.
- **Stat cards:** Total requests, error rate, avg latency, P95 — `useStatsRealtime(projectIds)`, polls every 3s.
- **Charts (ECharts):** Requests/sec line chart, error rate line chart, latency percentiles (P50/P95/P99) — `useStatsHistorical(projectIds, range)`, polls every 30s. `keepPreviousData` on filter change.
- **Top endpoints table:** Sortable by requests, avg latency, error rate. Project column when multiple projects selected. Virtualized for large sets.
- States: Skeleton, ErrorPanel, EmptyState (no project / no data).

---

### 6. Log Explorer — `/logs`

**Purpose:** Search, filter, and inspect individual request logs.

**Implementation:**

- Route: `routes/logs.tsx`. All filters in URL: `?project`, `?from`, `?to`, `?status`, `?method`, `?endpoint`, `?ip`, `?search`, `?cursor`.
- **Filter bar:** Status code, HTTP method, endpoint text search, IP address, free-text search. Shadcn Select/Input components. Syncs to URL.
- **Table:** Timestamp, method, path, `StatusBadge`, duration, IP. Project column when multi-project. Virtualized via `@tanstack/react-virtual`.
- **Detail drawer:** Row click → Shadcn Sheet. Full log: all request/response headers, payload size, response size, error message.
- **Pagination:** Cursor-based "Load more" via TanStack Query. Cursor in URL.
- Hook: `useLogs(projectIds, filters)`, polls every 10s.
- States: Skeleton, ErrorPanel, EmptyState.

---

### 7. Traces — `/traces`

**Purpose:** List distributed traces and drill into individual request waterfalls.

**Trace list:**

- Route: `routes/traces/index.tsx`. Filters in URL: `?project`, `?from`, `?to`, `?endpoint`, `?minDurationMs`, `?status`.
- Table: root endpoint, total duration, span count, status badge. Project column when multi-project. Sortable by duration.
- Filter bar: endpoint search, min duration input, status selector. Sync to URL.
- Row click → `/traces/:traceId?project=id`.
- Hook: `useTraces(projectIds, filters)`, polls every 10s.

**Trace detail:**

- Route: `routes/traces/$traceId.tsx`. Reads `?project=id`. Hook: `useTrace(projectId, traceId)`.
- Breadcrumb + header: endpoint, total duration, timestamp, status.
- **Waterfall:** Horizontal timing bars nested by parent-child relationship. Color-coded by span type: middleware (blue), handler (green), db (purple), http (orange). Lazy-loaded component (`React.lazy`).
- **Span detail panel:** Click any span → side panel showing name, duration, status, metadata key-value pairs (Redis key, Mongo query, SQL, HTTP target, etc.).
- **Bottleneck table:** Span name, avg duration, P95 duration, occurrence count, % of total request time. Helps find consistent slow points.
- Link to related log entry (same traceId) in the log explorer.
- States: Skeleton, ErrorPanel.

---

### 8. Errors — `/errors`

**Purpose:** Group, track, and investigate application errors.

**Error groups list:**

- Route: `routes/errors/index.tsx`. Filters in URL: `?project`, `?from`, `?to`, `?sort`.
- Table: error message (truncated), occurrence count, first seen, last seen, frequency sparkline (last 24h), status badge (new/recurring/resolved). Project column when multi-project.
- Sort: most recent (default) or most frequent.
- Row click → `/errors/:groupId?project=id`.
- Hook: `useErrors(projectIds, filters)`, polls every 10s.

**Error group detail:**

- Route: `routes/errors/$groupId.tsx`. Reads `?project=id`. Hook: `useErrorGroup(projectId, groupId)`.
- Header: error message, total count, first/last seen.
- **Stack trace viewer:** Syntax-highlighted frames, collapsible. Monospace font, theme tokens.
- **Occurrences table:** Timestamp, endpoint, traceId (links to trace waterfall).
- **LLM insight panel:** When a root cause analysis is available from `withLLMErrors`, displays it with a clear "AI Analysis" label.
- **Frequency chart:** Error occurrences over time (ECharts line chart).
- States: Skeleton, ErrorPanel, EmptyState.

---

### 9. Runtime — `/runtime`

**Purpose:** Node.js process health over time — memory, CPU, event loop, garbage collection.

**Implementation:**

- Route: `routes/runtime.tsx`. `ProjectFilter` + `TimeRangeSelector` in URL.
- **Instance selector:** Dropdown to view a specific process instance or aggregated across all instances.
- **2×2 chart grid (ECharts):**
  - Heap memory: `heapUsed`, `heapTotal`, `rss` as stacked/multi-line area.
  - Event loop lag: line chart; spikes highlighted.
  - GC pauses: bar chart; pause duration per event.
  - CPU usage: `user` + `system` stacked area.
- Hook: `useRuntimeMetrics(projectIds, timeRange)`, polls every 5s.
- States: Skeleton, ErrorPanel, EmptyState; chart series colors from design tokens.

---

### 10. Live Tail — `/live`

**Purpose:** Real-time stream of events from the selected projects as they happen.

**Implementation:**

- Route: `routes/live.tsx`. `ProjectFilter` in URL.
- **WebSocket:** Connects to `/live?project=id1&project=id2`. Auto-reconnects on drop. `ConnectionStatus` indicator.
- **Buffer:** Incoming events written to `useRef`; flushed to `useState` every 100ms via `setInterval` to avoid re-rendering on every individual event. Max 500 visible events.
- **Event list:** Virtualized. Each row: type icon (log / span / error), project badge when multi-project, summary line, timestamp. Click to expand inline.
- **Filter controls:** Event type checkboxes (log / span / error), endpoint text filter, status code filter, min duration. Sent to server as WebSocket filter config.
- **Pause/resume:** Stops auto-scroll, buffers new events. "N new events" banner when paused; clicking resumes and scrolls to bottom.
- Hook: `useLiveTail(projectIds, filters)` encapsulates WebSocket + buffer logic.
- States: EmptyState when no project selected; reconnecting indicator.

---

### 11. Profiler — `/profiler`

**Purpose:** Trigger and inspect CPU profiles and heap snapshots.

**Profile list:**

- Route: `routes/profiler/index.tsx`. `ProjectFilter` in URL.
- **Trigger controls:** "Start CPU Profile" with duration (5s / 10s / 30s) and "Capture Heap Snapshot". When multiple projects are selected, a project selector within the form targets which instance receives the command.
- **History table:** Type (CPU/Heap), project, timestamp, duration/size, status (recording / processing / ready). Row click → `/profiler/:profileId?project=id`.
- Hook: `useProfiles(projectIds)`, `useTriggerProfile(projectId)` (mutation). Sonner toast on trigger success/failure.

**Flame graph:**

- Route: `routes/profiler/$profileId.tsx`. Reads `?project=id`. `React.lazy` for the viewer.
- **CPU profile:** Interactive flame graph. Click to zoom into a frame. Hover tooltip: function name, file, line, self time, total time. Search bar highlights matching function names.
- **Heap snapshot:** Top allocations summary table — constructor name, count, retained size.
- Hook: `useProfile(projectId, profileId)`.
- States: Skeleton, ErrorPanel; theme tokens for all colors.

---

### 12. Alerts — `/alerts`

**Purpose:** Configure alert rules and view triggered alert history.

**Implementation:**

- Route: `routes/alerts.tsx`. `ProjectFilter` in URL.
- **Tabs:** "Rules" and "History" (Shadcn Tabs).
- **Rules tab:** Table — project, metric, condition, threshold, window, notification channel, status (active/paused). Edit and delete actions per row. "Create Rule" button → Shadcn Dialog.
- **Create/edit rule form:** Project selector (within form), metric selector (`error_rate`, `p95_latency`, `request_count`, etc.), condition (`>`, `<`, `=`), threshold value, evaluation window (5m / 15m / 1h), notification channel.
- **History tab:** Triggered alerts — timestamp, project, rule name, metric value at trigger, resolved status.
- **Notification channels section:** Add/edit webhook URL, Slack webhook, email address per project or account.
- Hooks: `useAlerts(projectIds)`, `useAlertHistory(projectIds)`, CRUD mutations. Sonner toasts on success/failure.
- States: Skeleton, ErrorPanel, EmptyState; Zod validation on rule form.

---

### 13. Settings — `/settings`

**Purpose:** Manage API keys, team members, and account details.

**Implementation:**

- Route: `routes/settings/index.tsx`. Account-level — no project filter needed.
- **API keys section:**
  - List: key name, prefix (e.g. `rdr_abc...`), created date, last used date.
  - Create: "New API Key" → Dialog → generates key → shows full key once with copy button and "Store this now" warning.
  - Revoke: confirmation Dialog before deletion.
  - Keys are account-level — one key authenticates ingestion from any number of te.js projects.
- **Team section:** Invite by email, role selector (admin / member / viewer), remove member with confirmation.
- **Account section:** Display name, email address, password change.
- Hooks: `useApiKeys()`, `useCreateApiKey()`, `useRevokeApiKey()`, `useTeam()` in `hooks/use-settings.ts`.
- States: Skeleton, ErrorPanel; destructive actions require confirmation; Sonner toasts.

---

### 14. Billing — `/settings/billing`

**Purpose:** View plan, usage, and manage subscription.

**Implementation:**

- Route: `routes/settings/billing.tsx`. Account-level.
- **Current plan:** Plan name, billing period, next renewal date. Usage bar: events ingested / plan limit.
- **Plan comparison cards:** Free, Pro, Team — limits and features per tier. Current plan highlighted.
- **Upgrade/downgrade:** CTA redirects to Stripe Checkout. No card data in-app.
- **Invoice history:** Date, amount, status (paid/pending/failed), PDF download link.
- Hook: `useBilling()` in `hooks/use-billing.ts`.
- States: Skeleton, ErrorPanel; clear copy on what each limit means.

---

## Polling Intervals

Defined in `utils/constants.ts`. Hooks import these constants — no magic numbers in hook files.

| Feature                                   | Interval             |
| ----------------------------------------- | -------------------- |
| Realtime stats (Dashboard, Metrics cards) | 3s                   |
| Runtime metrics                           | 5s                   |
| Logs, Traces, Errors lists                | 10s                  |
| Historical charts                         | 30s                  |
| Alerts rules                              | On window focus only |
| Profiles list                             | On window focus only |

---

## Production Checklist (per task)

Before marking any todo complete:

- Looks consistent with rest of portal — same card style, spacing, type scale.
- Desktop and mobile both correct. No broken layouts.
- Loading, error, and empty states implemented using `Skeleton`, `ErrorPanel`, `EmptyState`.
- No hardcoded colors — only theme token Tailwind classes.
- No new custom CSS classes added to `index.css`.
- All Shadcn components installed via CLI, not copy-pasted.
- Keyboard navigation works. Focus rings visible. Icon-only buttons have `aria-label`.
- `lint` and `build` pass with no new errors.
- Both dark and light modes look correct.
