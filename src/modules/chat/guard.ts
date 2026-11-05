import { z } from 'zod';

import { periodSchema } from '@/modules/reporting/contract';

import { findNumericCandidates, type NumericCandidate } from './numeric-candidates';
import {
  chatOutputMetricSchema,
  chatOutputSchema,
  chatResultReferenceSchema,
  createCurrentTurnOutputSchema,
  type ChatClaim,
  type ChatOutput,
  type ChatResultReference,
} from './output-schema';

const nonEmptyText = (maximum: number) =>
  z
    .string()
    .min(1)
    .max(maximum)
    .refine((value) => value.trim().length > 0, 'no puede estar vacío');

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

export type ChatGuardResult =
  | Readonly<{ success: true; data: ChatOutput }>
  | Readonly<{
      success: false;
      reason: 'guard_rejected';
      issues: readonly string[];
    }>;

type Decimal = Readonly<{
  negative: boolean;
  digits: bigint;
  scale: number;
}>;

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TWO = BigInt(2);
const BIGINT_TEN = BigInt(10);

function reject(...issues: string[]): ChatGuardResult {
  return Object.freeze({
    success: false,
    reason: 'guard_rejected',
    issues: Object.freeze([...new Set(issues)]),
  });
}

function referenceKey(reference: ChatResultReference): string {
  return JSON.stringify([reference.tool_call_id, reference.path]);
}

function claimReference(claim: ChatClaim): ChatResultReference | undefined {
  if (claim.tool_call_id === null || claim.path === null) return undefined;
  return { tool_call_id: claim.tool_call_id, path: claim.path };
}

function parseDecimal(value: string): Decimal | undefined {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return undefined;
  const fraction = match[3] ?? '';
  const digits = BigInt(`${match[2]}${fraction}`);
  return {
    negative: match[1] === '-' && digits !== BIGINT_ZERO,
    digits,
    scale: fraction.length,
  };
}

function decimalKey(value: Decimal): string {
  let digits = value.digits;
  let scale = value.scale;
  while (scale > 0 && digits % BIGINT_TEN === BIGINT_ZERO) {
    digits /= BIGINT_TEN;
    scale -= 1;
  }
  return `${value.negative ? '-' : ''}${digits}:${scale}`;
}

function roundDecimal(value: Decimal, targetScale: number): Decimal {
  if (value.scale <= targetScale) {
    return {
      ...value,
      digits: value.digits * BIGINT_TEN ** BigInt(targetScale - value.scale),
      scale: targetScale,
    };
  }

  const divisor = BIGINT_TEN ** BigInt(value.scale - targetScale);
  const quotient = value.digits / divisor;
  const remainder = value.digits % divisor;
  return {
    negative: value.negative,
    digits: quotient + (remainder * BIGINT_TWO >= divisor ? BIGINT_ONE : BIGINT_ZERO),
    scale: targetScale,
  };
}

function displayedDecimalVariants(value: string): readonly Decimal[] {
  const compact = value.replaceAll(' ', '');
  const sign = compact.startsWith('-') || compact.startsWith('+') ? compact[0] : '';
  const unsigned = sign ? compact.slice(1) : compact;
  const candidates = new Set<string>();

  if (unsigned.includes('.') && unsigned.includes(',')) {
    const decimalSeparator = unsigned.lastIndexOf(',') > unsigned.lastIndexOf('.') ? ',' : '.';
    const groupingSeparator = decimalSeparator === ',' ? '.' : ',';
    candidates.add(
      `${sign}${unsigned.replaceAll(groupingSeparator, '').replace(decimalSeparator, '.')}`,
    );
  } else if (unsigned.includes(',') || unsigned.includes('.')) {
    const separator = unsigned.includes(',') ? ',' : '.';
    candidates.add(`${sign}${unsigned.replace(separator, '.')}`);
    if (new RegExp(`^\\d{1,3}(?:\\${separator}\\d{3})+$`).test(unsigned)) {
      candidates.add(`${sign}${unsigned.replaceAll(separator, '')}`);
    }
  } else {
    candidates.add(`${sign}${unsigned}`);
  }

  return [...candidates].flatMap((candidate) => {
    const parsed = parseDecimal(candidate);
    return parsed ? [parsed] : [];
  });
}

function observedValueMatches(displayed: string, evidence: TurnResultValue): boolean {
  const source = parseDecimal(evidence.value);
  if (!source || evidence.kind !== 'observed_value' || evidence.metric === null) return false;

  const displayedValues = displayedDecimalVariants(displayed);
  if (evidence.metric === 'impressions') {
    return displayedValues.some(
      (value) => value.scale === 0 && decimalKey(value) === decimalKey(source),
    );
  }

  const accepted = new Set([
    decimalKey(source),
    decimalKey(roundDecimal(source, 0)),
    decimalKey(roundDecimal(source, 2)),
  ]);
  return displayedValues.some((value) => accepted.has(decimalKey(value)));
}

function compareDecimals(left: string, right: string): -1 | 0 | 1 | undefined {
  const leftValue = parseDecimal(left);
  const rightValue = parseDecimal(right);
  if (!leftValue || !rightValue) return undefined;
  const scale = Math.max(leftValue.scale, rightValue.scale);
  const signed = (value: Decimal) => {
    const digits = value.digits * BIGINT_TEN ** BigInt(scale - value.scale);
    return value.negative ? -digits : digits;
  };
  const leftSigned = signed(leftValue);
  const rightSigned = signed(rightValue);
  return leftSigned === rightSigned ? 0 : leftSigned > rightSigned ? 1 : -1;
}

function metadataMatches(claim: ChatClaim, evidence: TurnResultValue): boolean {
  return (
    claim.kind === evidence.kind &&
    claim.metric === evidence.metric &&
    claim.unit === evidence.unit &&
    claim.currency === evidence.currency &&
    claim.account_ref === evidence.account_ref &&
    claim.period?.from === evidence.period.from &&
    claim.period?.to === evidence.period.to
  );
}

function numericCandidateIn(fragment: string): NumericCandidate | undefined {
  const candidates = findNumericCandidates(fragment).filter(
    (candidate) => candidate.kind === 'number' || candidate.kind === 'percentage',
  );
  return candidates.length === 1 ? candidates[0] : undefined;
}

function toolClaimMatches(
  claim: ChatClaim,
  fragment: string,
  evidenceByReference: ReadonlyMap<string, TurnResultValue>,
): boolean {
  const reference = claimReference(claim);
  if (!reference) return false;
  const evidence = evidenceByReference.get(referenceKey(reference));
  if (!evidence || !metadataMatches(claim, evidence)) return false;

  if (claim.kind === 'period_bound') return fragment.trim() === evidence.value;
  if (claim.kind === 'coverage_count') {
    const candidate = numericCandidateIn(fragment);
    return Boolean(candidate && candidate.kind === 'number' && candidate.text === evidence.value);
  }
  if (claim.kind !== 'observed_value') return false;
  const candidate = numericCandidateIn(fragment);
  return Boolean(
    candidate &&
      candidate.kind === 'number' &&
      observedValueMatches(candidate.text, evidence),
  );
}

function comparisonMatches(
  claim: ChatClaim,
  fragment: string,
  evidenceByReference: ReadonlyMap<string, TurnResultValue>,
): boolean {
  if (claim.kind !== 'qualitative_comparison' || claim.comparison === null) return false;
  const left = evidenceByReference.get(referenceKey(claim.comparison.left));
  const right = evidenceByReference.get(referenceKey(claim.comparison.right));
  if (!left || !right || left.kind !== 'observed_value' || right.kind !== 'observed_value') {
    return false;
  }
  const comparison = compareDecimals(left.value, right.value);
  if (comparison === undefined) return false;
  const expected = comparison > 0 ? 'greater_than' : comparison < 0 ? 'less_than' : 'equal';
  if (claim.comparison.relation !== expected) return false;

  const normalized = fragment.toLocaleLowerCase('es-AR');
  const phraseMatches =
    (expected === 'greater_than' && /(?:más|mayor)\s+que/u.test(normalized)) ||
    (expected === 'less_than' && /(?:menos|menor)\s+que/u.test(normalized)) ||
    (expected === 'equal' && /igual\s+que/u.test(normalized));
  return phraseMatches;
}

function claimMatches(
  output: ChatOutput,
  claim: ChatClaim,
  questionRedacted: string,
  evidenceByReference: ReadonlyMap<string, TurnResultValue>,
): boolean {
  const fragment = output.text.slice(claim.span.start, claim.span.end);
  if (claim.kind === 'user_provided') return questionRedacted.includes(fragment.trim());
  if (claim.kind === 'qualitative_comparison') {
    return comparisonMatches(claim, fragment, evidenceByReference);
  }
  return toolClaimMatches(claim, fragment, evidenceByReference);
}

function covers(claim: ChatClaim, candidate: NumericCandidate): boolean {
  return claim.span.start <= candidate.start && claim.span.end >= candidate.end;
}

/**
 * Guarda determinística de CA-50. No elige herramientas ni consulta datos: solo acepta
 * referencias y valores normalizados que el ejecutor le entrega para el turno actual.
 */
export function validateChatOutput(
  output: unknown,
  questionRedacted: string,
  currentTurnValues: readonly unknown[],
): ChatGuardResult {
  const evidenceResult = z.array(turnResultValueSchema).safeParse(currentTurnValues);
  if (!evidenceResult.success) return reject('invalid_turn_evidence');

  const evidenceByReference = new Map<string, TurnResultValue>();
  for (const evidence of evidenceResult.data) {
    const key = referenceKey(evidence);
    if (evidenceByReference.has(key)) return reject('duplicate_turn_reference');
    evidenceByReference.set(key, evidence);
  }

  const outputResult = createCurrentTurnOutputSchema(
    evidenceResult.data.map(({ tool_call_id, path }) => ({ tool_call_id, path })),
  ).safeParse(output);
  if (!outputResult.success) return reject('invalid_output');
  const parsedOutput = chatOutputSchema.parse(outputResult.data);

  const validClaims = parsedOutput.claims.map((claim) =>
    claimMatches(parsedOutput, claim, questionRedacted, evidenceByReference),
  );
  if (validClaims.some((valid) => !valid)) return reject('claim_mismatch');

  for (const candidate of findNumericCandidates(parsedOutput.text)) {
    if (candidate.kind === 'variation' || candidate.kind === 'percentage') {
      return reject('unsupported_numeric_expression');
    }
    const covered = parsedOutput.claims.some(
      (claim, index) => validClaims[index] && covers(claim, candidate),
    );
    if (!covered) return reject('uncovered_numeric_candidate');
  }

  return Object.freeze({ success: true, data: parsedOutput });
}
