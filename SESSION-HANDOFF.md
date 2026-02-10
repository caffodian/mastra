# Session Handoff: ObservabilityContextMixin Migration

**Branch:** `esp/obs_core_additions`
**Commit (at sync):** `0b9c466f9bba4947f9bcd0aa95bbd99f350ae270`
**Date:** 2026-02-10
**Scope:** `packages/core/src/` only

---

## What Was Done (Complete)

Multi-phase migration from standalone `tracingContext: TracingContext` to the full `ObservabilityContextMixin` interface across the core package.

### Phase Summary

1. **Created `ObservabilityContextMixin`** in `packages/core/src/observability/types/core.ts`
   - Fields: `tracing: TracingContext`, `logger: LoggerContext`, `metrics: MetricsContext`, `tracingContext: TracingContext` (alias)

2. **Created factory functions** in `packages/core/src/observability/context-factory.ts`
   - `createObservabilityContext(tracingContext?, loggerContext?, metricsContext?)` — fills no-op defaults
   - `resolveObservabilityContext(partial)` — resolves `Partial<ObservabilityContextMixin>` to complete mixin

3. **Migrated all internal interfaces** to use the mixin:
   - Tool execute params, workflow step handlers, eval callbacks, agent internals, LLM types

4. **Renamed `logger: IMastraLogger` to `mastraLogger: IMastraLogger`** in loop system types:
   - `LoopOptions`, destructured as `mastraLogger: logger` (alias) in function bodies to minimize churn
   - This freed up `logger` for `LoggerContext` from the mixin

5. **Replaced individual fields with mixin** on internal types:
   - `LoopOptions`: uses `& Partial<ObservabilityContextMixin>` instead of individual `logger?`, `metrics?`
   - `ModelLoopStreamArgs`: uses `& ObservabilityContextMixin`
   - `MastraCustomLLMOptions` (both `base.types.ts` and `llm/index.ts`): uses `ObservabilityContextMixin &`

6. **Fixed 4 workflow processor sites** that only rebuilt `tracingContext` without logger/metrics when creating child spans:
   - `packages/core/src/workflows/workflow.ts` (2 sites)
   - `packages/core/src/workflows/evented/workflow.ts` (2 sites)

7. **Inlined single-use `createObservabilityContext` variables** (7 sites across 5 files)

8. **All checks pass:** typecheck, lint, prettier

---

## Key Design Decisions

### Naming Convention (documented in the mixin JSDoc)

- **Short names** for **usage sites**: `tracing.createSpan()`, `logger.info()`, `metrics.record()`
- **`tracingContext`** (with "Context" suffix) preferred at **forwarding sites** where it clarifies a structural context is being passed
- `tracingContext` is NOT deprecated — it's an equal alias for `tracing`

### Source vs Derived Relationship

```
tracingContext → create child span → new tracingContext
                                   → new logger  (correlated to child span)
                                   → new metrics (tagged with child span metadata)
```

- `tracingContext` is the **source** — it represents position in the span tree
- `logger` and `metrics` are **derived** — rebuilt from the current span for correlation

### Logger Naming Conflict Resolution

- `IMastraLogger` (infrastructure logger) was `logger` in `LoopOptions` — conflicted with `ObservabilityContextMixin.logger: LoggerContext`
- Resolved by renaming to `mastraLogger: IMastraLogger` in internal types
- `MastraPrimitives.logger: IMastraLogger` (public API) was NOT renamed

### Mastra Class Getter

- `get log(): LoggerContext` on the `Mastra` class — NOT `get logger()` due to conflict with `MastraPrimitives.logger: IMastraLogger`
- Decision: **keep as `get log()`** — public API change not worth it

---

## Open Discussion (Not Started)

The last conversation topic was whether to rename `logger` to `log` in the mixin and everywhere else:

### The Proposal: `logger: LoggerContext` → `log: LoggerContext`

**Motivation:**
- Eliminates ALL naming conflicts with `IMastraLogger` across the codebase
- `log.info()`, `log.warn()` — very natural, matches common patterns (pino, winston)
- Matches the existing `Mastra.get log()` getter
- Could eventually add `get logger(): IMastraLogger` back on Mastra if desired

**Trade-offs:**
- `log` could be confused with `console.log` (though context makes it clear)
- Breaks symmetry slightly: `tracing`, `log`, `metrics` vs `tracing`, `logger`, `metrics`
- More rename churn after we just settled on `logger`

**What would change if proceeding:**
- `ObservabilityContextMixin.logger` → `.log`
- `createObservabilityContext` / `resolveObservabilityContext` — field name
- `ProcessorObservabilityContext.logger` → `.log`
- All destructuring sites using `logger` from the mixin
- `MastraModelOutputOptions.logger` → `.log`
- The naming convention comment on the mixin

**Decision status:** User leaned toward doing it. Also briefly explored further destructuring (`trace, log, counter, histogram, gauge`) but agreed the 3-field grouping (tracing, log/logger, metrics) mapping to the three observability pillars is the right abstraction level. **No code changes were made for this rename yet.**

---

## All Modified Files (Current State)

### Core observability types and factory
- `packages/core/src/observability/types/core.ts` — `ObservabilityContextMixin` definition with JSDoc
- `packages/core/src/observability/context-factory.ts` — `createObservabilityContext()` and `resolveObservabilityContext()`
- `packages/core/src/observability/no-op.ts` — no-op defaults
- `packages/core/src/observability/index.ts` — barrel exports

### Loop system (mastraLogger rename + mixin usage)
- `packages/core/src/loop/types.ts` — `mastraLogger`, `& Partial<ObservabilityContextMixin>`
- `packages/core/src/loop/loop.ts` — destructuring `mastraLogger: logger`, passes `logger`/`metrics` from mixin
- `packages/core/src/loop/workflows/agentic-execution/llm-execution-step.ts` — `mastraLogger: logger` alias
- `packages/core/src/loop/workflows/agentic-execution/tool-call-step.ts` — `mastraLogger: logger` alias
- `packages/core/src/loop/workflows/agentic-execution/llm-mapping-step.ts` — `rest.mastraLogger`
- `packages/core/src/loop/network/index.ts` — inlined `createObservabilityContext` spread

### LLM types (mixin usage)
- `packages/core/src/llm/model/model.loop.types.ts` — `& ObservabilityContextMixin`
- `packages/core/src/llm/model/model.loop.ts` — destructures `logger`/`metrics` from mixin
- `packages/core/src/llm/model/base.types.ts` — `ObservabilityContextMixin &` (v4 AI SDK)
- `packages/core/src/llm/index.ts` — `ObservabilityContextMixin &` (v5 AI SDK)

### Stream/processor system
- `packages/core/src/stream/types.ts` — `MastraModelOutputOptions` uses `logger`/`metrics`
- `packages/core/src/stream/base/output.ts` — passes `logger`/`metrics` to processor calls
- `packages/core/src/processors/runner.ts` — `ProcessorObservabilityContext` with `logger`/`metrics`

### Agent system
- `packages/core/src/agent/agent.ts` — inlined `createObservabilityContext` spreads
- `packages/core/src/agent/agent-legacy.ts` — uses `observabilityContext` variable (multi-use)
- `packages/core/src/agent/workflows/prepare-stream/map-results-step.ts` — inlined spreads

### Workflow system (child span fixes)
- `packages/core/src/workflows/workflow.ts` — 2 processor sites use full `createObservabilityContext()`
- `packages/core/src/workflows/evented/workflow.ts` — 2 processor sites use full `createObservabilityContext()`

### Mastra class
- `packages/core/src/mastra/index.ts` — `get log(): LoggerContext` and `get metrics(): MetricsContext` getters (unchanged from previous phase)

---

## Verification Status

- **typecheck:** PASSING
- **lint:** PASSING
- **prettier:** PASSING
- **unit/integration tests:** Not run (requires LLM API credentials not available in sandbox)

---

## How to Resume

1. Open the branch `esp/obs_core_additions`
2. Read this file for full context
3. The next decision point is: **rename `logger` → `log` in the mixin?** (user was leaning yes)
4. If proceeding with the rename, update all files listed above that reference `logger: LoggerContext`
5. After that, the migration is essentially complete — consider running the full test suite
