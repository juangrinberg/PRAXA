import { z } from 'zod';

import { integrationConnectionDtoSchema } from '@/modules/integrations/contract';
import { knownOr } from '@/modules/reporting/contract/primitives';

/** CA-44b: valida texto de SQL; ninguna coerción a number ni normalización de decimales. */
export const metricValueSchema = z.discriminatedUnion('metric', [
  z.strictObject({ metric: z.literal('spend'), value: z.string().regex(/^-?\d+(?:\.\d+)?$/) }),
  z.strictObject({ metric: z.literal('impressions'), value: z.string().regex(/^-?\d+$/) }),
]);

/** Una sola conexión viva por empresa; se reutiliza el DTO público de K03. */
export const connectionStatusResultSchema = z.strictObject({
  tool_call_id: z.uuid(),
  name: z.literal('connection_status'),
  data: knownOr(integrationConnectionDtoSchema),
});

export type ConnectionStatusResult = z.infer<typeof connectionStatusResultSchema>;

// Los resultados de métricas con cobertura y procedencia se completarán contra
// M16c/0016. Este archivo no declara que un valor suelto sea evidencia de un hecho.
