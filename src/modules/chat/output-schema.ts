import { z } from 'zod';

import { periodSchema } from '@/modules/reporting/contract';

const nonEmptyText = (maximum: number) =>
  z
    .string()
    .min(1)
    .max(maximum)
    .refine((value) => value.trim().length > 0, 'no puede estar vacío');

const spanSchema = z
  .strictObject({
    start: z.int().nonnegative(),
    end: z.int().positive(),
  })
  .refine((span) => span.start < span.end, {
    message: 'el final del span debe ser posterior al inicio',
    path: ['end'],
  });

const unsafePathSegments = new Set(['__proto__', 'prototype', 'constructor']);
const pathSegmentSchema = z.union([
  nonEmptyText(64).refine(
    (segment) => !unsafePathSegments.has(segment),
    'segmento de ruta no permitido',
  ),
  z.int().nonnegative(),
]);

export const chatResultReferenceSchema = z.strictObject({
  tool_call_id: nonEmptyText(128),
  path: z.array(pathSegmentSchema).min(1).max(16),
});

export type ChatResultReference = Readonly<z.infer<typeof chatResultReferenceSchema>>;

export const chatOutputMetricSchema = z.enum(['spend', 'impressions']);
const nullableMetricSchema = chatOutputMetricSchema.nullable();
const nullableUnitSchema = nonEmptyText(40).nullable();
const nullableCurrencySchema = z.string().regex(/^[A-Z]{3}$/).nullable();
const nullableAccountReferenceSchema = nonEmptyText(200).nullable();
const nullablePeriodSchema = periodSchema.strict().nullable();

const comparisonSchema = z.strictObject({
  left: chatResultReferenceSchema,
  right: chatResultReferenceSchema,
  relation: z.enum(['greater_than', 'less_than', 'equal']),
});

const claimKindSchema = z.enum([
  'observed_value',
  'period_bound',
  'coverage_count',
  'qualitative_comparison',
  'user_provided',
]);

const addIssue = (context: z.RefinementCtx, path: PropertyKey[], message: string) => {
  context.addIssue({ code: 'custom', path, message });
};

export const chatClaimSchema = z
  .strictObject({
    span: spanSchema,
    kind: claimKindSchema,
    tool_call_id: nonEmptyText(128).nullable(),
    path: z.array(pathSegmentSchema).min(1).max(16).nullable(),
    metric: nullableMetricSchema,
    unit: nullableUnitSchema,
    currency: nullableCurrencySchema,
    account_ref: nullableAccountReferenceSchema,
    period: nullablePeriodSchema,
    comparison: comparisonSchema.nullable(),
  })
  .superRefine((claim, context) => {
    const toolBacked = new Set(['observed_value', 'period_bound', 'coverage_count']).has(
      claim.kind,
    );

    if (toolBacked) {
      if (claim.tool_call_id === null) addIssue(context, ['tool_call_id'], 'referencia requerida');
      if (claim.path === null) addIssue(context, ['path'], 'ruta requerida');
      if (claim.unit === null) addIssue(context, ['unit'], 'unidad requerida');
      if (claim.account_ref === null) addIssue(context, ['account_ref'], 'cuenta requerida');
      if (claim.period === null) addIssue(context, ['period'], 'período requerido');
      if (claim.comparison !== null) {
        addIssue(context, ['comparison'], 'una afirmación de herramienta no es una comparación');
      }
    }

    if (claim.kind === 'observed_value') {
      if (claim.metric === null) addIssue(context, ['metric'], 'métrica requerida');
      if (claim.metric === 'spend' && claim.currency === null) {
        addIssue(context, ['currency'], 'el gasto requiere moneda');
      }
      if (claim.metric === 'impressions' && claim.currency !== null) {
        addIssue(context, ['currency'], 'las impresiones no llevan moneda');
      }
    }

    if (claim.kind === 'period_bound' || claim.kind === 'coverage_count') {
      if (claim.metric !== null) addIssue(context, ['metric'], 'métrica no aplicable');
      if (claim.currency !== null) addIssue(context, ['currency'], 'moneda no aplicable');
    }

    if (claim.kind === 'qualitative_comparison') {
      for (const key of [
        'tool_call_id',
        'path',
        'metric',
        'unit',
        'currency',
        'account_ref',
        'period',
      ] as const) {
        if (claim[key] !== null) addIssue(context, [key], 'usar las referencias de comparison');
      }
      if (claim.comparison === null) {
        addIssue(context, ['comparison'], 'la comparación requiere dos referencias');
      } else if (
        JSON.stringify(claim.comparison.left) === JSON.stringify(claim.comparison.right)
      ) {
        addIssue(context, ['comparison', 'right'], 'la comparación requiere dos valores distintos');
      }
    }

    if (claim.kind === 'user_provided') {
      for (const key of [
        'tool_call_id',
        'path',
        'metric',
        'unit',
        'currency',
        'account_ref',
        'period',
        'comparison',
      ] as const) {
        if (claim[key] !== null) addIssue(context, [key], 'user_provided no usa resultados');
      }
    }
  });

export type ChatClaim = Readonly<z.infer<typeof chatClaimSchema>>;

export const chatOutputSchema = z
  .strictObject({
    text: nonEmptyText(20_000),
    claims: z.array(chatClaimSchema),
  })
  .superRefine((output, context) => {
    output.claims.forEach((claim, index) => {
      if (claim.span.end > output.text.length) {
        addIssue(context, ['claims', index, 'span', 'end'], 'el span termina fuera de text');
        return;
      }
      if (output.text.slice(claim.span.start, claim.span.end).trim().length === 0) {
        addIssue(context, ['claims', index, 'span'], 'el span no puede apuntar a texto vacío');
      }
    });
  });

export type ChatOutput = Readonly<z.infer<typeof chatOutputSchema>>;

function referenceKey(reference: ChatResultReference): string {
  return JSON.stringify([reference.tool_call_id, reference.path]);
}

function referencesOf(claim: ChatClaim): readonly ChatResultReference[] {
  if (claim.comparison !== null) return [claim.comparison.left, claim.comparison.right];
  if (claim.tool_call_id !== null && claim.path !== null) {
    return [{ tool_call_id: claim.tool_call_id, path: claim.path }];
  }
  return [];
}

export function createCurrentTurnOutputSchema(references: readonly unknown[]) {
  const allowedReferences = new Set(
    references.map((reference) => referenceKey(chatResultReferenceSchema.parse(reference))),
  );

  return chatOutputSchema.superRefine((output, context) => {
    output.claims.forEach((claim, claimIndex) => {
      referencesOf(claim).forEach((reference, referenceIndex) => {
        if (!allowedReferences.has(referenceKey(reference))) {
          addIssue(
            context,
            ['claims', claimIndex, 'reference', referenceIndex],
            'la referencia no pertenece al turno actual',
          );
        }
      });
    });
  });
}
