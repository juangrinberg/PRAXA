import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { CHAT_LIMITS, ChatLimitError, createChatTurnBudget } from '@/modules/chat/limits';
import { chatToolCallSchema } from '@/modules/chat/tools/schema';
import { metricValueSchema } from '@/modules/chat/tools/results';

const period = { from: '2026-01-01', to: '2026-01-31' };

describe('M25a.1: catálogo cerrado (CA-48, CA-49, CA-70)', () => {
  it.each([
    { name: 'connection_status', arguments: {} },
    { name: 'coverage', arguments: { period } },
    ...['spend', 'impressions'].flatMap((metric) => ['total', 'daily_series'].map((name) => ({
      name, arguments: { metric, period },
    }))),
  ])('acepta $name con sus argumentos declarados', (call) => {
    expect(chatToolCallSchema.parse(call)).toEqual(call);
  });

  it.each(['company_id', 'connection_id', 'table', 'sql'])('rechaza %s en cualquier nivel', (key) => {
    const call = { name: 'total', arguments: { metric: 'spend', period } };
    expect(chatToolCallSchema.safeParse({ ...call, [key]: 'invento' }).success).toBe(false);
    expect(chatToolCallSchema.safeParse({ ...call, arguments: { ...call.arguments, [key]: 'invento' } }).success).toBe(false);
    expect(chatToolCallSchema.safeParse({ ...call, arguments: {
      ...call.arguments, period: { ...period, [key]: 'invento' },
    } }).success).toBe(false);
    expect(chatToolCallSchema.safeParse({ name: 'connection_status', arguments: { [key]: 'invento' } }).success).toBe(false);
  });

  it.each([
    { name: 'run_sql', arguments: {} },
    { name: 'total', arguments: { metric: 'roas', period } },
    { name: 'total', arguments: { period } },
    { name: 'connection_status' },
    { name: 'connection_status', arguments: null },
  ])('rechaza una llamada no autorizada o incompleta', (call) => {
    expect(chatToolCallSchema.safeParse(call).success).toBe(false);
  });

  it.each(['coverage', 'total', 'daily_series'])('limita %s a 93 días inclusivos', (name) => {
    const call = (to: string) => ({ name, arguments: {
      ...(name === 'coverage' ? {} : { metric: 'spend' }),
      period: { from: '2026-01-01', to },
    } });
    expect(chatToolCallSchema.safeParse(call('2026-04-03')).success).toBe(true);
    expect(chatToolCallSchema.safeParse(call('2026-04-04')).success).toBe(false);
  });

  it.each([
    { from: '2026-02-29', to: '2026-03-01' },
    { from: '2026-02-31', to: '2026-03-01' },
    { from: '2026-02-02', to: '2026-02-01' },
    { from: '01/02/2026', to: '02/02/2026' },
    { from: '2026-01-01T00:00:00Z', to: '2026-01-02' },
  ])('rechaza fechas inválidas, invertidas o con hora', (period) => {
    expect(chatToolCallSchema.safeParse({ name: 'coverage', arguments: { period } }).success).toBe(false);
  });

  it('admite un solo día y un 29 de febrero válido', () => {
    expect(chatToolCallSchema.safeParse({ name: 'coverage', arguments: {
      period: { from: '2028-02-29', to: '2028-02-29' },
    } }).success).toBe(true);
  });
});

describe('M25a.1: valores exactos (CA-44b)', () => {
  it.each([
    { metric: 'spend', value: '9007199254740993.12345678901234567890' },
    { metric: 'impressions', value: '9007199254740993' },
    { metric: 'spend', value: '0.00' },
    { metric: 'impressions', value: '0' },
  ])('conserva $metric como texto, sin redondear', (data) => {
    expect(metricValueSchema.parse(data)).toEqual(data);
  });

  it.each([
    { metric: 'spend', value: 1.23 }, { metric: 'impressions', value: 12 },
    { metric: 'spend', value: '1e3' }, { metric: 'spend', value: '1,23' },
    { metric: 'impressions', value: '1.2' }, { metric: 'spend', value: 'NaN' },
    { metric: 'spend', value: '' }, { metric: 'roas', value: '2' },
    { metric: 'spend', value: null },
  ])('rechaza un valor sin el formato exacto', (data) => {
    expect(metricValueSchema.safeParse(data).success).toBe(false);
  });
});

describe('M25a.1: presupuesto de herramientas del turno (CA-70)', () => {
  afterEach(() => vi.useRealTimers());

  it('fija los valores iniciales de la spec', () => {
    expect(CHAT_LIMITS).toEqual({ maxPeriodDays: 93, maxToolCallsPerTurn: 4,
      maxModelOutputTokens: 800, maxConcurrentTurnsPerUser: 1, maxTurnDurationMs: 60_000 });
  });

  it('bloquea la quinta llamada antes de iniciarla, aun si son concurrentes', async () => {
    const budget = createChatTurnBudget();
    const operation = vi.fn(async () => 'resultado');
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => budget.run(operation)));
    expect(operation).toHaveBeenCalledTimes(4);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(4);
    expect(results[4]).toMatchObject({ status: 'rejected', reason: { code: 'tool_call_limit' } });
  });

  it('una llamada fallida también consume presupuesto', async () => {
    const budget = createChatTurnBudget({ maxToolCallsPerTurn: 1, maxTurnDurationMs: 60_000 });
    await expect(budget.run(async () => { throw new Error('fallo'); })).rejects.toThrow('fallo');
    await expect(budget.run(async () => 'otro')).rejects.toBeInstanceOf(ChatLimitError);
  });

  it('rechaza una respuesta tardía y aborta a los 60 s desde el inicio del turno', async () => {
    vi.useFakeTimers();
    const budget = createChatTurnBudget();
    let observed: AbortSignal | undefined;
    let finish!: (result: string) => void;
    const pending = budget.run((signal) => {
      observed = signal;
      return new Promise<string>((resolve) => { finish = resolve; });
    });
    const assertion = expect(pending).rejects.toMatchObject({ code: 'turn_timeout' });
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
    expect(observed?.aborted).toBe(true);
    finish('respuesta fuera de plazo');
    const another = vi.fn(async () => 'otra');
    await expect(budget.run(another)).rejects.toMatchObject({ code: 'turn_timeout' });
    expect(another).not.toHaveBeenCalled();
  });

  it('el plazo no se reinicia con cada herramienta y limpia los timers', async () => {
    vi.useFakeTimers();
    const budget = createChatTurnBudget();
    await vi.advanceTimersByTimeAsync(59_900);
    expect(await budget.run(async () => 'a tiempo')).toBe('a tiempo');
    expect(vi.getTimerCount()).toBe(0);
    const pending = budget.run(() => new Promise(() => {}));
    const assertion = expect(pending).rejects.toMatchObject({ code: 'turn_timeout' });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
