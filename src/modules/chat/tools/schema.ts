import { z } from 'zod';

import { periodSchema } from '@/modules/reporting/contract/primitives';
import { CHAT_LIMITS } from '../limits';

export const chatMetricSchema = z.enum(['spend', 'impressions']);

/** Fechas de calendario de la cuenta, ambos extremos incluidos; sin hora local del host. */
export const chatPeriodSchema = periodSchema.strict().refine((period) => {
  const days = (Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86_400_000 + 1;
  return days <= CHAT_LIMITS.maxPeriodDays;
}, { message: `El período no puede superar ${CHAT_LIMITS.maxPeriodDays} días.`, path: ['to'] });

const metricArguments = z.strictObject({ metric: chatMetricSchema, period: chatPeriodSchema });

/** CA-48/49: rechaza campos extras en todos los niveles; nunca recibe identidad ni SQL. */
export const chatToolCallSchema = z.discriminatedUnion('name', [
  z.strictObject({ name: z.literal('coverage'), arguments: z.strictObject({ period: chatPeriodSchema }) }),
  z.strictObject({ name: z.literal('daily_series'), arguments: metricArguments }),
  z.strictObject({ name: z.literal('total'), arguments: metricArguments }),
  z.strictObject({ name: z.literal('connection_status'), arguments: z.strictObject({}) }),
]);

export type ChatToolCall = z.infer<typeof chatToolCallSchema>;
