import { describe, expect, it } from 'vitest';

import { chatToolCallSchema } from '@/modules/chat/tools/schema';

describe('chat tools — CA-48 y CA-49', () => {
  const period = {
    from: '2026-09-01',
    to: '2026-09-30',
  };

  it('acepta coverage con un período', () => {
    const result = chatToolCallSchema.safeParse({
      name: 'coverage',
      arguments: { period },
    });

    expect(result.success).toBe(true);
  });

  it('acepta daily_series solo con spend o impressions', () => {
    const result = chatToolCallSchema.safeParse({
      name: 'daily_series',
      arguments: {
        metric: 'spend',
        period,
      },
    });

    expect(result.success).toBe(true);
  });

  it('acepta total con spend o impressions', () => {
    const result = chatToolCallSchema.safeParse({
      name: 'total',
      arguments: {
        metric: 'impressions',
        period,
      },
    });

    expect(result.success).toBe(true);
  });

  it('acepta connection_status sin argumentos', () => {
    const result = chatToolCallSchema.safeParse({
      name: 'connection_status',
      arguments: {},
    });

    expect(result.success).toBe(true);
  });

  it('rechaza una herramienta inventada', () => {
    const result = chatToolCallSchema.safeParse({
      name: 'run_sql',
      arguments: {
        query: 'select * from companies',
      },
    });

    expect(result.success).toBe(false);
  });

  it('rechaza una métrica inventada', () => {
    const result = chatToolCallSchema.safeParse({
      name: 'total',
      arguments: {
        metric: 'revenue',
        period,
      },
    });

    expect(result.success).toBe(false);
  });

  it('rechaza company_id enviado como argumento', () => {
    const result = chatToolCallSchema.safeParse({
      name: 'total',
      arguments: {
        metric: 'spend',
        period,
        company_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    });

    expect(result.success).toBe(false);
  });
  it('rechaza períodos mayores a 93 días', () => {
    const result = chatToolCallSchema.safeParse({
      name: 'total',
      arguments: {
        metric: 'spend',
        period: {
          from: '2026-01-01',
          to: '2026-04-04',
        },
      },
    });

    expect(result.success).toBe(false);
  });
});