import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { CHAT_LIMITS, countCalendarDaysInclusive } from '@/modules/chat/limits';

describe('configuración compartida de límites del chat', () => {
  it('expone exactamente los cinco valores aprobados de CA-70', () => {
    expect(Object.keys(CHAT_LIMITS)).toHaveLength(5);
    expect(CHAT_LIMITS).toEqual({
      maxPeriodDays: 93,
      maxToolCallsPerTurn: 4,
      maxModelOutputTokens: 800,
      maxConcurrentTurnsPerUser: 1,
      maxTurnDurationMs: 60_000,
    });
  });

  it('queda congelada y no admite modificaciones en ejecución', () => {
    expect(Object.isFrozen(CHAT_LIMITS)).toBe(true);
    expect(Reflect.set(CHAT_LIMITS, 'maxPeriodDays', 365)).toBe(false);
    expect(CHAT_LIMITS.maxPeriodDays).toBe(93);
  });

  it.each([
    [{ from: '2026-05-20', to: '2026-05-20' }, 1],
    [{ from: '2026-01-01', to: '2026-04-03' }, 93],
    [{ from: '2026-01-01', to: '2026-04-04' }, 94],
    [{ from: '2024-02-28', to: '2024-03-01' }, 3],
    [{ from: '2023-02-28', to: '2023-03-01' }, 2],
  ])('cuenta días calendario inclusivos para %o', (period, expectedDays) => {
    expect(countCalendarDaysInclusive(period)).toBe(expectedDays);
  });
});
