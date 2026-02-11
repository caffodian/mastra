// packages/core/src/observability/context-factory.ts

import { noOpLoggerContext, noOpMetricsContext, noOpTracingContext } from './no-op';
import type { LoggerContext, MetricsContext, ObservabilityContextMixin, TracingContext } from './types';

// ============================================================================
// Context Factory
// ============================================================================

/**
 * Creates an observability context mixin with real or no-op implementations.
 * Use this when constructing execution contexts for tools, workflow steps, etc.
 *
 * @param tracingContext - TracingContext with current span, or undefined for no-op
 * @param loggerContext - LoggerContext for logging, or undefined for no-op
 * @param metricsContext - MetricsContext for metrics, or undefined for no-op
 * @returns ObservabilityContextMixin with all three contexts
 */
export function createObservabilityContext(
  tracingContext?: TracingContext,
  loggerContext?: LoggerContext,
  metricsContext?: MetricsContext,
): ObservabilityContextMixin {
  const tracing = tracingContext ?? noOpTracingContext;

  return {
    tracing,
    loggerVNext: loggerContext ?? noOpLoggerContext,
    metrics: metricsContext ?? noOpMetricsContext,
    tracingContext: tracing, // alias — preferred at forwarding sites
  };
}

/**
 * Resolves a partial observability context (from execute params) into a
 * complete ObservabilityContextMixin with no-op defaults for any missing fields.
 *
 * @param partial - Partial context from ExecuteFunctionParams
 * @returns Complete ObservabilityContextMixin
 */
export function resolveObservabilityContext(partial: Partial<ObservabilityContextMixin>): ObservabilityContextMixin {
  return createObservabilityContext(partial.tracing ?? partial.tracingContext, partial.loggerVNext, partial.metrics);
}
