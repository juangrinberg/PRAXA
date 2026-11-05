import 'server-only';

import { z } from 'zod';

const positiveSafeIntegerSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

const chatLimitsSchema = z.strictObject({
  maxPeriodDays: positiveSafeIntegerSchema,
  maxToolCallsPerTurn: positiveSafeIntegerSchema,
  maxModelOutputTokens: positiveSafeIntegerSchema,
  maxConcurrentTurnsPerUser: positiveSafeIntegerSchema,
  maxTurnDurationMs: positiveSafeIntegerSchema,
});

type ChatLimits = z.infer<typeof chatLimitsSchema>;

/**
 * CA-70: configuración compartida del servidor.
 *
 * M25a.1 aplica únicamente `maxPeriodDays`. Los cuatro límites restantes se exponen para
 * que M25a.2 los aplique en sus componentes autoritativos, sin adelantarlos aquí.
 */
export const CHAT_LIMITS: Readonly<ChatLimits> = Object.freeze(
  chatLimitsSchema.parse({
    maxPeriodDays: 93,
    maxToolCallsPerTurn: 4,
    maxModelOutputTokens: 800,
    maxConcurrentTurnsPerUser: 1,
    maxTurnDurationMs: 60_000,
  }),
);

const MILLISECONDS_PER_CALENDAR_DAY = 86_400_000;

type CalendarPeriod = Readonly<{
  from: string;
  to: string;
}>;

/** Cuenta ambos extremos de un período ISO ya validado, sin usar la zona horaria del host. */
export function countCalendarDaysInclusive(period: CalendarPeriod): number {
  const from = Date.parse(`${period.from}T00:00:00Z`);
  const to = Date.parse(`${period.to}T00:00:00Z`);

  return (to - from) / MILLISECONDS_PER_CALENDAR_DAY + 1;
}
