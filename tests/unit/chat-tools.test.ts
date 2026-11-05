import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  chatMetricSchema,
  chatPeriodSchema,
  chatToolCallSchema,
  chatToolSelectionSchema,
} from '@/modules/chat/tools/schema';

const period = { from: '2026-01-01', to: '2026-01-31' };

describe('catálogo de entrada de herramientas del chat', () => {
  it('no impone un mínimo no aprobado de llamadas', () => {
    expect(chatToolSelectionSchema.parse({ tool_calls: [] })).toEqual({ tool_calls: [] });
  });

  it('acepta exactamente cuatro llamadas válidas', () => {
    const toolCalls = Array.from({ length: 4 }, () => ({
      name: 'connection_status',
      arguments: {},
    }));

    expect(chatToolSelectionSchema.safeParse({ tool_calls: toolCalls }).success).toBe(true);
  });

  it('rechaza cinco llamadas válidas', () => {
    const toolCalls = Array.from({ length: 5 }, () => ({
      name: 'connection_status',
      arguments: {},
    }));

    expect(chatToolSelectionSchema.safeParse({ tool_calls: toolCalls }).success).toBe(false);
  });

  it.each([
    { name: 'connection_status', arguments: {} },
    { name: 'coverage', arguments: { period } },
    { name: 'daily_series', arguments: { metric: 'spend', period } },
    { name: 'daily_series', arguments: { metric: 'impressions', period } },
    { name: 'total', arguments: { metric: 'spend', period } },
    { name: 'total', arguments: { metric: 'impressions', period } },
  ])('acepta $name únicamente con sus argumentos normativos', (call) => {
    expect(chatToolCallSchema.parse(call)).toEqual(call);
  });

  it.each([
    { name: 'connection_status', arguments: { unexpected: true } },
    { name: 'coverage', arguments: { period, unexpected: true } },
    {
      name: 'daily_series',
      arguments: { metric: 'spend', period, unexpected: true },
    },
    { name: 'total', arguments: { metric: 'spend', period, unexpected: true } },
  ])('rechaza propiedades adicionales en los argumentos de $name', (call) => {
    expect(chatToolCallSchema.safeParse(call).success).toBe(false);
  });

  it.each([
    { name: 'connection_status', arguments: {} },
    { name: 'coverage', arguments: { period } },
    { name: 'daily_series', arguments: { metric: 'spend', period } },
    { name: 'total', arguments: { metric: 'spend', period } },
  ])('rechaza propiedades adicionales en el objeto exterior de $name', (call) => {
    expect(
      chatToolCallSchema.safeParse({ ...call, unexpected: true }).success,
    ).toBe(false);
  });

  it('limita metric a spend o impressions', () => {
    expect(chatMetricSchema.options).toHaveLength(2);
    expect(new Set(chatMetricSchema.options)).toEqual(new Set(['spend', 'impressions']));
    expect(chatMetricSchema.safeParse('spend').success).toBe(true);
    expect(chatMetricSchema.safeParse('impressions').success).toBe(true);
    expect(chatMetricSchema.safeParse('roas').success).toBe(false);
  });

  it.each([
    { name: 'run_sql', arguments: {} },
    { name: 'coverage', arguments: {} },
    { name: 'daily_series', arguments: { metric: 'spend' } },
    { name: 'total', arguments: { period } },
    { name: 'total', arguments: { metric: 'roas', period } },
    { name: 'connection_status' },
    { name: 'connection_status', arguments: null },
  ])('rechaza una herramienta desconocida o una llamada incompleta: %o', (call) => {
    expect(chatToolCallSchema.safeParse(call).success).toBe(false);
  });

  it.each(['sql', 'table', 'company_id', 'connection_id', 'account_id'])(
    'rechaza el argumento autoritativo o peligroso %s en cualquier nivel',
    (key) => {
      const call = { name: 'total', arguments: { metric: 'spend', period } };

      expect(chatToolCallSchema.safeParse({ ...call, [key]: 'no-permitido' }).success).toBe(
        false,
      );
      expect(
        chatToolCallSchema.safeParse({
          ...call,
          arguments: { ...call.arguments, [key]: 'no-permitido' },
        }).success,
      ).toBe(false);
      expect(
        chatToolCallSchema.safeParse({
          ...call,
          arguments: {
            ...call.arguments,
            period: { ...period, [key]: 'no-permitido' },
          },
        }).success,
      ).toBe(false);
      expect(
        chatToolCallSchema.safeParse({
          name: 'connection_status',
          arguments: { [key]: 'no-permitido' },
        }).success,
      ).toBe(false);
    },
  );

  it.each([
    { from: '2026-02-29', to: '2026-03-01' },
    { from: '2026-02-31', to: '2026-03-01' },
    { from: '2026-02-02', to: '2026-02-01' },
    { from: '01/02/2026', to: '02/02/2026' },
    { from: '2026-01-01T00:00:00Z', to: '2026-01-02' },
  ])('reutiliza la validación de periodSchema y rechaza %o', (invalidPeriod) => {
    expect(
      chatToolCallSchema.safeParse({
        name: 'coverage',
        arguments: { period: invalidPeriod },
      }).success,
    ).toBe(false);
  });

  it('mantiene period estricto', () => {
    expect(chatPeriodSchema.safeParse({ ...period, timezone: 'UTC' }).success).toBe(false);
  });

  it.each([
    { from: '2026-05-20', to: '2026-05-20' },
    { from: '2026-01-01', to: '2026-04-03' },
    { from: '2024-01-01', to: '2024-04-02' },
  ])('acepta períodos de hasta 93 días calendario inclusivos: %o', (acceptedPeriod) => {
    expect(chatPeriodSchema.safeParse(acceptedPeriod).success).toBe(true);
  });

  it.each([
    { from: '2026-01-01', to: '2026-04-04' },
    { from: '2024-01-01', to: '2024-04-03' },
  ])('rechaza períodos de 94 días calendario inclusivos: %o', (rejectedPeriod) => {
    expect(chatPeriodSchema.safeParse(rejectedPeriod).success).toBe(false);
  });

  it.each(['coverage', 'daily_series', 'total'] as const)(
    'aplica el máximo de período a %s sin relajar sus argumentos',
    (name) => {
      const argumentsValue =
        name === 'coverage'
          ? { period: { from: '2026-01-01', to: '2026-04-04' } }
          : {
              metric: 'spend',
              period: { from: '2026-01-01', to: '2026-04-04' },
            };

      expect(
        chatToolCallSchema.safeParse({ name, arguments: argumentsValue }).success,
      ).toBe(false);
    },
  );

  it('rechaza fechas inválidas antes de calcular el máximo', () => {
    expect(
      chatToolCallSchema.safeParse({
        name: 'coverage',
        arguments: { period: { from: '2024-02-30', to: '2024-03-01' } },
      }).success,
    ).toBe(false);
  });
});
