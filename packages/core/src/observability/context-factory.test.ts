import { describe, it, expect } from 'vitest';

import { createObservabilityContext } from './context-factory';
import { noOpLoggerContext, noOpMetricsContext } from './no-op';
import type { LoggerContext, MetricsContext, TracingContext } from './types';

describe('createObservabilityContext', () => {
  it('returns no-op contexts when called without arguments', () => {
    const ctx = createObservabilityContext();

    expect(ctx.tracing.currentSpan).toBeUndefined();
    expect(ctx.logger).toBe(noOpLoggerContext);
    expect(ctx.metrics).toBe(noOpMetricsContext);
  });

  it('returns deprecated tracingContext alias pointing to tracing', () => {
    const ctx = createObservabilityContext();

    expect(ctx.tracingContext).toBe(ctx.tracing);
  });

  it('uses provided tracing context when passed', () => {
    const mockSpan = { spanId: 'test-span' } as any;
    const mockTracing: TracingContext = { currentSpan: mockSpan };

    const ctx = createObservabilityContext(mockTracing);

    expect(ctx.tracing).toBe(mockTracing);
    expect(ctx.tracing.currentSpan).toBe(mockSpan);
    expect(ctx.tracingContext).toBe(mockTracing);
  });

  it('uses provided logger context when passed', () => {
    const mockLogger: LoggerContext = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    const ctx = createObservabilityContext(undefined, mockLogger);

    expect(ctx.logger).toBe(mockLogger);
    expect(ctx.tracing.currentSpan).toBeUndefined(); // still no-op
  });

  it('uses provided metrics context when passed', () => {
    const mockMetrics: MetricsContext = {
      counter: () => ({ add: () => {} }),
      gauge: () => ({ set: () => {} }),
      histogram: () => ({ record: () => {} }),
    };

    const ctx = createObservabilityContext(undefined, undefined, mockMetrics);

    expect(ctx.metrics).toBe(mockMetrics);
    expect(ctx.tracing.currentSpan).toBeUndefined(); // still no-op
    expect(ctx.logger).toBe(noOpLoggerContext); // still no-op
  });

  it('uses all provided contexts when passed', () => {
    const mockSpan = { spanId: 'test-span' } as any;
    const mockTracing: TracingContext = { currentSpan: mockSpan };
    const mockLogger: LoggerContext = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    const mockMetrics: MetricsContext = {
      counter: () => ({ add: () => {} }),
      gauge: () => ({ set: () => {} }),
      histogram: () => ({ record: () => {} }),
    };

    const ctx = createObservabilityContext(mockTracing, mockLogger, mockMetrics);

    expect(ctx.tracing).toBe(mockTracing);
    expect(ctx.logger).toBe(mockLogger);
    expect(ctx.metrics).toBe(mockMetrics);
  });
});

describe('noOpLoggerContext', () => {
  it('has all required methods', () => {
    expect(typeof noOpLoggerContext.debug).toBe('function');
    expect(typeof noOpLoggerContext.info).toBe('function');
    expect(typeof noOpLoggerContext.warn).toBe('function');
    expect(typeof noOpLoggerContext.error).toBe('function');
  });

  it('debug does not throw', () => {
    expect(() => noOpLoggerContext.debug('test message')).not.toThrow();
    expect(() => noOpLoggerContext.debug('test message', { key: 'value' })).not.toThrow();
  });

  it('info does not throw', () => {
    expect(() => noOpLoggerContext.info('test message')).not.toThrow();
    expect(() => noOpLoggerContext.info('test message', { key: 'value' })).not.toThrow();
  });

  it('warn does not throw', () => {
    expect(() => noOpLoggerContext.warn('test message')).not.toThrow();
    expect(() => noOpLoggerContext.warn('test message', { key: 'value' })).not.toThrow();
  });

  it('error does not throw', () => {
    expect(() => noOpLoggerContext.error('test message')).not.toThrow();
    expect(() => noOpLoggerContext.error('test message', { key: 'value' })).not.toThrow();
  });
});

describe('noOpMetricsContext', () => {
  it('has all required methods', () => {
    expect(typeof noOpMetricsContext.counter).toBe('function');
    expect(typeof noOpMetricsContext.gauge).toBe('function');
    expect(typeof noOpMetricsContext.histogram).toBe('function');
  });

  describe('counter', () => {
    it('returns an object with add method', () => {
      const counter = noOpMetricsContext.counter('test_counter');
      expect(typeof counter.add).toBe('function');
    });

    it('add does not throw', () => {
      const counter = noOpMetricsContext.counter('test_counter');
      expect(() => counter.add(1)).not.toThrow();
      expect(() => counter.add(5, { label: 'value' })).not.toThrow();
    });
  });

  describe('gauge', () => {
    it('returns an object with set method', () => {
      const gauge = noOpMetricsContext.gauge('test_gauge');
      expect(typeof gauge.set).toBe('function');
    });

    it('set does not throw', () => {
      const gauge = noOpMetricsContext.gauge('test_gauge');
      expect(() => gauge.set(42)).not.toThrow();
      expect(() => gauge.set(100, { label: 'value' })).not.toThrow();
    });
  });

  describe('histogram', () => {
    it('returns an object with record method', () => {
      const histogram = noOpMetricsContext.histogram('test_histogram');
      expect(typeof histogram.record).toBe('function');
    });

    it('record does not throw', () => {
      const histogram = noOpMetricsContext.histogram('test_histogram');
      expect(() => histogram.record(0.5)).not.toThrow();
      expect(() => histogram.record(123.45, { label: 'value' })).not.toThrow();
    });
  });
});
