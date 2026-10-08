import { z } from 'zod';

import { periodSchema } from '@/modules/reporting/contract';

export const CHAT_MAX_PERIOD_DAYS = 93;

function periodLengthInDays(period: { from: string; to: string }): number {
  const from = Date.parse(`${period.from}T00:00:00Z`);
  const to = Date.parse(`${period.to}T00:00:00Z`);

  return Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
}

export const chatPeriodSchema = periodSchema.refine(
  (period) => periodLengthInDays(period) <= CHAT_MAX_PERIOD_DAYS,
  {
    message: `el período no puede superar los ${CHAT_MAX_PERIOD_DAYS} días`,
    path: ['to'],
  },
);

export const chatToolMetricSchema = z.enum(['spend', 'impressions']);

const coverageToolSchema = z.strictObject({
  name: z.literal('coverage'),
  arguments: z.strictObject({
    period: chatPeriodSchema,
  }),
});

const dailySeriesToolSchema = z.strictObject({
  name: z.literal('daily_series'),
  arguments: z.strictObject({
    metric: chatToolMetricSchema,
    period: chatPeriodSchema,
  }),
});

const totalToolSchema = z.strictObject({
  name: z.literal('total'),
  arguments: z.strictObject({
    metric: chatToolMetricSchema,
    period: chatPeriodSchema,
  }),
});

const connectionStatusToolSchema = z.strictObject({
  name: z.literal('connection_status'),
  arguments: z.strictObject({}),
});

export const chatToolCallSchema = z.discriminatedUnion('name', [
  coverageToolSchema,
  dailySeriesToolSchema,
  totalToolSchema,
  connectionStatusToolSchema,
]);

export type ChatToolCall = z.infer<typeof chatToolCallSchema>;
export type ChatToolMetric = z.infer<typeof chatToolMetricSchema>;