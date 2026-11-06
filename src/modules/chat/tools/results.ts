import { z } from 'zod';

import {
  chatOutputMetricSchema,
  chatResultReferenceSchema,
} from '@/modules/chat/output-schema';
import { periodSchema } from '@/modules/reporting/contract';

const nonEmptyText = (maximum: number) =>
  z.string().min(1).max(maximum).refine((value) => value.trim().length > 0, 'no puede estar vacío');

export const turnResultValueSchema = z
  .strictObject({
    ...chatResultReferenceSchema.shape,
    kind: z.enum(['observed_value', 'period_bound', 'coverage_count']),
    value: nonEmptyText(256),
    metric: chatOutputMetricSchema.nullable(),
    unit: nonEmptyText(40),
    currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
    account_ref: nonEmptyText(200),
    period: periodSchema.strict(),
  })
  .superRefine((value, context) => {
    if (value.kind === 'observed_value') {
      if (value.metric === null) {
        context.addIssue({ code: 'custom', path: ['metric'], message: 'métrica requerida' });
      }
      if (value.metric === 'spend' && value.currency === null) {
        context.addIssue({ code: 'custom', path: ['currency'], message: 'moneda requerida' });
      }
      if (value.metric === 'impressions' && value.currency !== null) {
        context.addIssue({ code: 'custom', path: ['currency'], message: 'moneda no permitida' });
      }
      const pattern = value.metric === 'impressions' ? /^-?\d+$/ : /^-?\d+(?:\.\d+)?$/;
      if (!pattern.test(value.value)) {
        context.addIssue({ code: 'custom', path: ['value'], message: 'valor numérico inválido' });
      }
    }
    if (value.kind === 'period_bound' && !z.iso.date().safeParse(value.value).success) {
      context.addIssue({ code: 'custom', path: ['value'], message: 'fecha inválida' });
    }
    if (value.kind === 'coverage_count' && !/^\d+$/.test(value.value)) {
      context.addIssue({ code: 'custom', path: ['value'], message: 'conteo inválido' });
    }
  });

export type TurnResultValue = Readonly<z.infer<typeof turnResultValueSchema>>;

export const executedChatToolResultSchema = z.strictObject({
  tool_call_id: nonEmptyText(128),
  tool_name: z.enum(['connection_status', 'coverage', 'daily_series', 'total']),
  coverage: z.enum(['complete', 'partial']),
  values: z.array(z.unknown()),
});

export type ExecutedChatToolResult = Readonly<z.infer<typeof executedChatToolResultSchema>>;

export type AdaptedTurnResults =
  | Readonly<{ success: true; values: readonly TurnResultValue[]; partialToolCallIds: readonly string[] }>
  | Readonly<{ success: false; reason: 'invalid_tool_results' }>;

const invalidResults = (): AdaptedTurnResults =>
  Object.freeze({ success: false, reason: 'invalid_tool_results' });

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pathKey(value: TurnResultValue): string {
  return JSON.stringify(value.path);
}

export function adaptExecutedToolResults(results: readonly unknown[]): AdaptedTurnResults {
  const values: TurnResultValue[] = [];
  const partialToolCallIds: string[] = [];
  const seenToolCalls = new Set<string>();

  for (const rawResult of results) {
    const parsedResult = executedChatToolResultSchema.safeParse(rawResult);
    if (!parsedResult.success) return invalidResults();
    const result = parsedResult.data;

    if (seenToolCalls.has(result.tool_call_id)) return invalidResults();
    seenToolCalls.add(result.tool_call_id);
    if (result.tool_name === 'connection_status' && result.values.length > 0) return invalidResults();

    const seenPaths = new Set<string>();
    for (const rawValue of result.values) {
      if (!isRecord(rawValue) || Object.hasOwn(rawValue, 'tool_call_id')) return invalidResults();
      const parsedValue = turnResultValueSchema.safeParse({
        tool_call_id: result.tool_call_id,
        ...rawValue,
      });
      if (!parsedValue.success) return invalidResults();
      const key = pathKey(parsedValue.data);
      if (seenPaths.has(key)) return invalidResults();
      seenPaths.add(key);
      values.push(Object.freeze(parsedValue.data));
    }

    if (result.coverage === 'partial') partialToolCallIds.push(result.tool_call_id);
  }

  return Object.freeze({
    success: true,
    values: Object.freeze(values),
    partialToolCallIds: Object.freeze(partialToolCallIds),
  });
}
