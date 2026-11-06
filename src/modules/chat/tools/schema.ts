import { z } from 'zod';

import { CHAT_LIMITS, countCalendarDaysInclusive } from '@/modules/chat/limits';
import { periodSchema } from '@/modules/reporting/contract';

export const chatMetricSchema = z.enum(['spend', 'impressions']);

/**
 * Conserva las reglas de fechas y orden del contrato de reporting, y además rechaza claves
 * que permitirían introducir identidad, SQL u otros datos fuera del período normativo.
 */
export const chatPeriodSchema = periodSchema.strict().refine(
  (period) => countCalendarDaysInclusive(period) <= CHAT_LIMITS.maxPeriodDays,
  {
    message: `El período no puede superar ${CHAT_LIMITS.maxPeriodDays} días calendario inclusivos.`,
    path: ['to'],
  },
);

const metricArgumentsSchema = z.strictObject({
  metric: chatMetricSchema,
  period: chatPeriodSchema,
});

/** CA-48/CA-49: catálogo cerrado; ninguna llamada recibe tenant, conexión, cuenta o SQL. */
export const chatToolCallSchema = z.discriminatedUnion('name', [
  z.strictObject({
    name: z.literal('connection_status'),
    arguments: z.strictObject({}),
  }),
  z.strictObject({
    name: z.literal('coverage'),
    arguments: z.strictObject({ period: chatPeriodSchema }),
  }),
  z.strictObject({
    name: z.literal('daily_series'),
    arguments: metricArgumentsSchema,
  }),
  z.strictObject({
    name: z.literal('total'),
    arguments: metricArgumentsSchema,
  }),
]);

export type ChatToolCall = z.infer<typeof chatToolCallSchema>;

/**
 * Primer paso estructurado del orquestador. El modelo solo selecciona llamadas del catálogo;
 * los identificadores los asigna el servidor después de validar todo el sobre.
 */
export const chatToolSelectionSchema = z.strictObject({
  tool_calls: z.array(chatToolCallSchema),
});

export type ChatToolSelection = z.infer<typeof chatToolSelectionSchema>;
