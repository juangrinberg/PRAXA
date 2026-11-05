import { z } from 'zod';

import {
  turnResultValueSchema,
  type TurnResultValue,
} from '@/modules/chat/guard';

const nonEmptyText = (maximum: number) =>
  z
    .string()
    .min(1)
    .max(maximum)
    .refine((value) => value.trim().length > 0, 'no puede estar vacío');

export const executedChatToolResultSchema = z.strictObject({
  tool_call_id: nonEmptyText(128),
  tool_name: z.enum(['connection_status', 'coverage', 'daily_series', 'total']),
  coverage: z.enum(['complete', 'partial']),
  values: z.array(z.unknown()),
});

export type ExecutedChatToolResult = Readonly<z.infer<typeof executedChatToolResultSchema>>;

export type AdaptedTurnResults =
  | Readonly<{
      success: true;
      values: readonly TurnResultValue[];
      partialToolCallIds: readonly string[];
    }>
  | Readonly<{
      success: false;
      reason: 'invalid_tool_results';
    }>;

const invalidResults = (): AdaptedTurnResults =>
  Object.freeze({ success: false, reason: 'invalid_tool_results' });

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pathKey(value: TurnResultValue): string {
  return JSON.stringify(value.path);
}

/**
 * Adapta únicamente valores que forman parte de resultados ejecutados en este turno. El
 * llamador no puede agregar un `tool_call_id` dentro de cada valor: se toma del sobre real.
 */
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
    if (result.tool_name === 'connection_status' && result.values.length > 0) {
      return invalidResults();
    }

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
