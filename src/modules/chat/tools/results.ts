import { z } from 'zod';

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

export const chatToolResultSchema = z.strictObject({
  name: z.literal('total'),
  data: totalDataSchema,
});

export type ChatToolResult = z.infer<typeof chatToolResultSchema>;