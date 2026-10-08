import { describe, expect, it } from 'vitest';

import {
  chatToolResultSchema,
} from '@/modules/chat/tools/results';

describe('chat tool results — CA-44b', () => {
  it('mantiene spend como texto decimal', () => {
    const result = chatToolResultSchema.safeParse({
      name: 'total',
      data: {
        metric: 'spend',
        value: '123456.78',
      },
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(typeof result.data.data.value).toBe('string');
    }
  });

  it('mantiene impressions como texto entero', () => {
    const result = chatToolResultSchema.safeParse({
      name: 'total',
      data: {
        metric: 'impressions',
        value: '987654',
      },
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(typeof result.data.data.value).toBe('string');
    }
  });

  it('rechaza valores numéricos', () => {
    const result = chatToolResultSchema.safeParse({
      name: 'total',
      data: {
        metric: 'spend',
        value: 123456.78,
      },
    });

    expect(result.success).toBe(false);
  });
});