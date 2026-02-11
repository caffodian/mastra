# Session Handoff: ObservabilityContextMixin Migration

**Branch:** `esp/obs_core_additions`
**Commit (at sync):** `a94eda1aa4e8092c39bd368324956e9a9a477923`
**Date:** 2026-02-11
**Scope:** `packages/core/src/` only
**PR:** https://github.com/mastra-ai/mastra/pull/12839

---

## What Was Done (Complete)

Multi-phase migration from standalone `tracingContext: TracingContext` to the full `ObservabilityContextMixin` interface across the core package.

### Phase Summary

1. **Created `ObservabilityContextMixin`** in `packages/core/src/observability/types/core.ts`
   - Fields: `tracing: TracingContext`, `loggerVNext: LoggerContext`, `metrics: MetricsContext`, `tracingContext: TracingContext` (alias)

2. **Created factory functions** in `packages/core/src/observability/context-factory.ts`
   - `createObservabilityContext(tracingContext?, loggerContext?, metricsContext?)` — fills no-op defaults
   - `resolveObservabilityContext(partial)` — resolves `Partial<ObservabilityContextMixin>` to complete mixin

3. **Migrated all internal interfaces** to use the mixin:
   - Tool execute params, workflow step handlers, eval callbacks, agent internals, LLM types

4. **Used `loggerVNext` naming** (VNext pattern) to avoid conflict with `logger: IMastraLogger`:
   - The mixin field is `loggerVNext: LoggerContext`
   - The existing `logger: IMastraLogger` in `LoopOptions`, `MastraPrimitives`, etc. is unchanged
   - No `mastraLogger` rename was needed — `loggerVNext` eliminates the collision entirely

5. **Replaced individual fields with mixin** on internal types:
   - `LoopOptions`: uses `& Partial<ObservabilityContextMixin>`
   - `ModelLoopStreamArgs`: uses `& ObservabilityContextMixin`
   - `MastraCustomLLMOptions` (both `base.types.ts` and `llm/index.ts`): uses `ObservabilityContextMixin &`

6. **Fixed 4 workflow processor sites** that only rebuilt `tracingContext` without logger/metrics when creating child spans:
   - `packages/core/src/workflows/workflow.ts` (2 sites)
   - `packages/core/src/workflows/evented/workflow.ts` (2 sites)

7. **Inlined single-use `createObservabilityContext` variables** (7 sites across 5 files)

8. **All checks pass:** typecheck, lint, prettier

---

## Key Design Decisions

### VNext Naming Pattern

The mixin uses `loggerVNext: LoggerContext` instead of `logger` to avoid conflict with the existing `logger: IMastraLogger` infrastructure logger used throughout the codebase (`MastraPrimitives.logger`, `LoopOptions.logger`, `MastraBase.logger`).

The `VNext` suffix follows an established codebase pattern: `MastraLLMVNext`, `streamVNext`, `generateVNext`, `resumeStreamVNext`, `updateWorkingMemoryVNext`.

### Naming Convention (documented in the mixin JSDoc)

- **Short names** for **usage sites**: `tracing.createSpan()`, `loggerVNext.info()`, `metrics.record()`
- **`tracingContext`** (with "Context" suffix) preferred at **forwarding sites** where it clarifies a structural context is being passed
- `tracingContext` is NOT deprecated — it's an equal alias for `tracing`

### Source vs Derived Relationship

```
tracingContext → create child span → new tracingContext
                                   → new loggerVNext (correlated to child span)
                                   → new metrics     (tagged with child span metadata)
```

- `tracingContext` is the **source** — it represents position in the span tree
- `loggerVNext` and `metrics` are **derived** — rebuilt from the current span for correlation

### Mastra Class Getter

- `get loggerVNext(): LoggerContext` on the Mastra class — matches the mixin field name
- `get metrics(): MetricsContext` on the Mastra class

---

## All Modified Files (Current State)

### Core observability types and factory

- `packages/core/src/observability/types/core.ts` — `ObservabilityContextMixin` with `loggerVNext`
- `packages/core/src/observability/context-factory.ts` — factory returns `loggerVNext` field
- `packages/core/src/observability/context-factory.test.ts` — tests use `ctx.loggerVNext`
- `packages/core/src/observability/no-op.ts` — no-op defaults (unchanged, type name `LoggerContext` same)
- `packages/core/src/observability/index.ts` — barrel exports

### Loop system

- `packages/core/src/loop/types.ts` — `logger: IMastraLogger` (kept as-is), `& Partial<ObservabilityContextMixin>`
- `packages/core/src/loop/loop.ts` — passes `loggerVNext` from mixin to `MastraModelOutput`
- `packages/core/src/loop/workflows/agentic-execution/llm-execution-step.ts` — destructures `logger` (IMastraLogger)
- `packages/core/src/loop/workflows/agentic-execution/tool-call-step.ts` — destructures `logger` (IMastraLogger)
- `packages/core/src/loop/workflows/agentic-execution/llm-mapping-step.ts` — `rest.logger` (IMastraLogger)
- `packages/core/src/loop/network/index.ts` — inlined `createObservabilityContext` spread

### LLM types (mixin usage)

- `packages/core/src/llm/model/model.loop.types.ts` — `& ObservabilityContextMixin`, Omit uses `'logger'`
- `packages/core/src/llm/model/model.loop.ts` — destructures `loggerVNext: observabilityLogger`
- `packages/core/src/llm/model/base.types.ts` — `ObservabilityContextMixin &` (v4 AI SDK)
- `packages/core/src/llm/index.ts` — `ObservabilityContextMixin &` (v5 AI SDK)

### Stream/processor system

- `packages/core/src/stream/types.ts` — `MastraModelOutputOptions` uses `loggerVNext`/`metrics`
- `packages/core/src/stream/base/output.ts` — passes `loggerVNext`/`metrics` to processor calls
- `packages/core/src/processors/runner.ts` — `ProcessorObservabilityContext` with `loggerVNext`/`metrics`

### Agent system

- `packages/core/src/agent/agent.ts` — inlined `createObservabilityContext` spreads
- `packages/core/src/agent/agent-legacy.ts` — uses `observabilityContext` variable (multi-use)
- `packages/core/src/agent/workflows/prepare-stream/map-results-step.ts` — inlined spreads

### Workflow system

- `packages/core/src/workflows/workflow.ts` — processor sites use `createObservabilityContext()`
- `packages/core/src/workflows/evented/workflow.ts` — processor sites use `createObservabilityContext()`
- `packages/core/src/workflows/handlers/entry.ts` — passes `loggerVNext` through entry execution
- `packages/core/src/workflows/handlers/step.ts` — passes `loggerVNext` through step execution

### Evals system

- `packages/core/src/evals/hooks.ts` — passes `loggerVNext` in scorer hook payload

### Mastra class

- `packages/core/src/mastra/index.ts` — `get loggerVNext(): LoggerContext` and `get metrics(): MetricsContext` getters

---

## Verification Status

- **typecheck:** PASSING (only pre-existing `@mastra/editor` errors unrelated to this work)
- **build:core:** PASSING
- **lint:** PASSING
- **prettier:** PASSING
- **unit/integration tests:** Not run (requires LLM API credentials not available in sandbox)

---

## No Pending Tasks

All requested changes are complete. The migration is done.
