import { z } from 'zod';

import { integrationConnectionDtoSchema } from '@/modules/integrations/contract';

const decimalTextSchema = z.string().regex(
  /^\d+(?:\.\d+)?$/,
  'debe ser un decimal representado como texto',
);

const integerTextSchema = z.string().regex(
  /^\d+$/,
  'debe ser un entero representado como texto',
);

const totalDataSchema = z.discriminatedUnion('metric', [
  z.strictObject({
    metric: z.literal('spend'),
    value: decimalTextSchema,
  }),
  z.strictObject({
    metric: z.literal('impressions'),
    value: integerTextSchema,
  }),
]);

const totalResultSchema = z.strictObject({
  name: z.literal('total'),
  data: totalDataSchema,
});

const connectionStatusResultSchema = z.strictObject({
  name: z.literal('connection_status'),
  data: z.strictObject({
    connections: z.array(integrationConnectionDtoSchema),
  }),
});

export const chatToolResultSchema = z.discriminatedUnion('name', [
  totalResultSchema,
  connectionStatusResultSchema,
]);

export type ChatToolResult = z.infer<typeof chatToolResultSchema>;