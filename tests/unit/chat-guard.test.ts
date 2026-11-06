import { describe, expect, it } from 'vitest';

import { validateChatOutput } from '@/modules/chat/guard';
import { findNumericCandidates } from '@/modules/chat/numeric-candidates';
import {
  chatOutputSchema,
  chatResultReferenceSchema,
  createCurrentTurnOutputSchema,
  type ChatClaim,
  type ChatResultReference,
} from '@/modules/chat/output-schema';
import {
  turnResultValueSchema,
  type TurnResultValue,
} from '@/modules/chat/tools/results';

const period = { from: '2026-10-01', to: '2026-10-31' };

const reference = (
  tool_call_id: string,
  path: readonly (string | number)[],
): ChatResultReference => ({ tool_call_id, path: [...path] });

const spanOf = (text: string, fragment: string) => {
  const start = text.indexOf(fragment);
  if (start < 0) throw new Error(`Fragmento ausente en fixture: ${fragment}`);
  return { start, end: start + fragment.length };
};

const toolClaim = (
  kind: 'observed_value' | 'period_bound' | 'coverage_count',
  text: string,
  fragment: string,
  source: ChatResultReference,
): ChatClaim => ({
  span: spanOf(text, fragment),
  kind,
  tool_call_id: source.tool_call_id,
  path: source.path,
  metric: kind === 'observed_value' ? 'spend' : null,
  unit: kind === 'observed_value' ? 'currency' : kind === 'period_bound' ? 'date' : 'days',
  currency: kind === 'observed_value' ? 'ARS' : null,
  account_ref: '…1234',
  period,
  comparison: null,
});

const turnValue = (
  source: ChatResultReference,
  value = '1234.50',
): TurnResultValue => ({
  ...source,
  kind: 'observed_value',
  value,
  metric: 'spend',
  unit: 'currency',
  currency: 'ARS',
  account_ref: '…1234',
  period,
});

describe('CA-50: esquema estructurado de salida', () => {
  it('acepta text y los cinco tipos de claim con forma estricta', () => {
    const text =
      'Gastaste 1.234,50 hasta 2026-10-31, con 20 días; fue mayor que antes. Tu meta era 100.';
    const observed = reference('call_total', ['value']);
    const periodBound = reference('call_total', ['period', 'to']);
    const coverage = reference('call_total', ['coverage', 'observed_days']);
    const previous = reference('call_previous', ['value']);
    const claims: ChatClaim[] = [
      toolClaim('observed_value', text, '1.234,50', observed),
      toolClaim('period_bound', text, '2026-10-31', periodBound),
      toolClaim('coverage_count', text, '20 días', coverage),
      {
        span: spanOf(text, 'mayor que'),
        kind: 'qualitative_comparison',
        tool_call_id: null,
        path: null,
        metric: null,
        unit: null,
        currency: null,
        account_ref: null,
        period: null,
        comparison: { left: observed, right: previous, relation: 'greater_than' },
      },
      {
        span: spanOf(text, '100'),
        kind: 'user_provided',
        tool_call_id: null,
        path: null,
        metric: null,
        unit: null,
        currency: null,
        account_ref: null,
        period: null,
        comparison: null,
      },
    ];

    expect(chatOutputSchema.parse({ text, claims })).toEqual({ text, claims });
  });

  it('rechaza propiedades adicionales y spans inválidos o fuera del texto', () => {
    const text = 'Gastaste 10.';
    const claim = toolClaim('observed_value', text, '10', reference('call', ['value']));

    expect(chatOutputSchema.safeParse({ text, claims: [claim], sql: 'select 1' }).success).toBe(false);
    expect(chatOutputSchema.safeParse({ text, claims: [{ ...claim, company_id: 'ajena' }] }).success).toBe(false);
    for (const span of [
      { start: -1, end: 2 },
      { start: 2, end: 2 },
      { start: 3, end: 2 },
      { start: 0, end: 999 },
    ]) {
      expect(chatOutputSchema.safeParse({ text, claims: [{ ...claim, span }] }).success).toBe(false);
    }
  });

  it('exige los metadatos aplicables y no permite referencias en user_provided', () => {
    const text = 'Valor 10';
    const valid = toolClaim('observed_value', text, '10', reference('call', ['value']));
    for (const invalid of [
      { ...valid, tool_call_id: null },
      { ...valid, path: null },
      { ...valid, metric: null },
      { ...valid, unit: null },
      { ...valid, currency: null },
      { ...valid, account_ref: null },
      { ...valid, period: null },
    ]) {
      expect(chatOutputSchema.safeParse({ text, claims: [invalid] }).success).toBe(false);
    }

    expect(
      chatOutputSchema.safeParse({
        text,
        claims: [{
          span: spanOf(text, '10'),
          kind: 'user_provided',
          tool_call_id: 'call',
          path: ['value'],
          metric: null,
          unit: null,
          currency: null,
          account_ref: null,
          period: null,
          comparison: null,
        }],
      }).success,
    ).toBe(false);

    const coverage = toolClaim(
      'coverage_count',
      'Hubo 20 días.',
      '20 días',
      reference('coverage', ['observed_days']),
    );
    expect(
      chatOutputSchema.safeParse({
        text: 'Hubo 20 días.',
        claims: [{ ...coverage, metric: 'spend', currency: 'ARS' }],
      }).success,
    ).toBe(false);
    expect(
      chatOutputSchema.safeParse({ text, claims: [{ ...valid, kind: 'ratio' }] }).success,
    ).toBe(false);
  });

  it.each(['__proto__', 'prototype', 'constructor'])(
    'rechaza el segmento de referencia peligroso %s',
    (segment) => {
      expect(chatResultReferenceSchema.safeParse(reference('call', [segment])).success).toBe(false);
    },
  );

  it('solo acepta referencias incluidas explícitamente en el turno actual', () => {
    const text = 'Gastaste 10.';
    const current = reference('call_current', ['value']);
    const output = { text, claims: [toolClaim('observed_value', text, '10', current)] };

    expect(createCurrentTurnOutputSchema([current]).safeParse(output).success).toBe(true);
    expect(createCurrentTurnOutputSchema([]).safeParse(output).success).toBe(false);
    expect(createCurrentTurnOutputSchema([reference('call_old', ['value'])]).safeParse(output).success).toBe(false);
  });
});

describe('CA-50: candidatos numéricos', () => {
  it('detecta dígitos, formatos es-AR y porcentajes conservando posiciones String.slice', () => {
    const text = 'Hubo 1200 impresiones, gastaste 1.234,50 y subió 20 %.';
    const candidates = findNumericCandidates(text);
    expect(candidates.map(({ kind, text: value }) => [kind, value])).toEqual(
      expect.arrayContaining([
        ['number', '1200'],
        ['number', '1.234,50'],
        ['percentage', '20 %'],
      ]),
    );
    for (const candidate of candidates) {
      expect(text.slice(candidate.start, candidate.end)).toBe(candidate.text);
    }
  });

  it('detecta cantidades escritas, variaciones y comparaciones', () => {
    const candidates = findNumericCandidates(
      'Fueron ciento veintitrés; el gasto se duplicó, cayó a la mitad y fue más que antes.',
    );
    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'number_words', text: 'ciento veintitrés' }),
      expect.objectContaining({ kind: 'variation', text: 'se duplicó' }),
      expect.objectContaining({ kind: 'variation', text: 'cayó a la mitad' }),
      expect.objectContaining({ kind: 'comparison', text: 'más que' }),
    ]));
  });

  it('detecta ratios cuantitativos como una única expresión verificable', () => {
    const text = 'La relación fue 2:1.';
    const ratio = findNumericCandidates(text).find((candidate) => candidate.kind === 'ratio');

    expect(ratio).toMatchObject({ kind: 'ratio', text: '2:1' });
    expect(text.slice(ratio?.start, ratio?.end)).toBe('2:1');
  });

  it.each([
    ['El gasto fue doble.', 'variation', 'doble'],
    ['El gasto fue triple.', 'variation', 'triple'],
    ['El gasto aumentó un 20 %.', 'variation', 'aumentó un 20 %'],
    ['Gastaste menos que antes.', 'comparison', 'menos que'],
    ['Fue igual que ayer.', 'comparison', 'igual que'],
  ])('detecta %s como %s', (text, kind, fragment) => {
    expect(findNumericCandidates(text)).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind, text: fragment })]),
    );
  });

  it('no confunde cuentas truncadas ni identificadores internos con cifras', () => {
    expect(findNumericCandidates('Cuenta …1234, act_5678 y call_9012.')).toEqual([]);
  });
});

describe('CA-50: guarda contra afirmaciones sin respaldo', () => {
  it('valida evidencia exclusivamente con el schema de tools/results', () => {
    const value = turnValue(reference('call_total', ['value']));
    expect(turnResultValueSchema.parse(value)).toEqual(value);
    expect(turnResultValueSchema.safeParse({ ...value, sql: 'select 1' }).success).toBe(false);
  });

  it('acepta gasto exacto o redondeado y precisión superior a Number.MAX_SAFE_INTEGER', () => {
    const source = reference('call_total', ['value']);
    for (const [authoritative, displayed] of [
      ['1234.505', '1.234,505'],
      ['1234.505', '1.234,51'],
      ['1234.505', '1.235'],
      ['9007199254740993.123456789', '9.007.199.254.740.993,12'],
    ]) {
      const text = `Gastaste ${displayed}.`;
      expect(validateChatOutput(
        { text, claims: [toolClaim('observed_value', text, displayed, source)] },
        '',
        [turnValue(source, authoritative)],
      ).success).toBe(true);
    }
  });

  it('rechaza una cifra inventada aunque use una referencia válida', () => {
    const source = reference('call_total', ['value']);
    const text = 'Gastaste 999999.';
    expect(validateChatOutput(
      { text, claims: [toolClaim('observed_value', text, '999999', source)] },
      '',
      [turnValue(source, '1234.50')],
    )).toMatchObject({ success: false, reason: 'guard_rejected' });
  });

  it('rechaza métrica, período, cuenta o moneda incorrectos', () => {
    const source = reference('call_total', ['value']);
    const text = 'Hubo 1234.';
    const base = toolClaim('observed_value', text, '1234', source);
    const evidence = turnValue(source, '1234');
    for (const claim of [
      { ...base, metric: 'impressions', unit: 'impressions', currency: null },
      { ...base, period: { from: '2026-09-01', to: '2026-09-30' } },
      { ...base, account_ref: '…9999' },
      { ...base, currency: 'USD' },
    ]) {
      expect(validateChatOutput({ text, claims: [claim] }, '', [evidence]).success).toBe(false);
    }
  });

  it('rechaza referencias anteriores, duplicadas y candidatos sin claim', () => {
    const current = reference('call_current', ['value']);
    const old = reference('call_old', ['value']);
    const text = 'Gastaste 10 y luego 20.';
    expect(validateChatOutput(
      { text, claims: [toolClaim('observed_value', text, '10', current)] },
      '',
      [turnValue(current, '10')],
    ).success).toBe(false);
    expect(validateChatOutput(
      { text: 'Gastaste 10.', claims: [toolClaim('observed_value', 'Gastaste 10.', '10', old)] },
      '',
      [turnValue(current, '10')],
    ).success).toBe(false);
    expect(validateChatOutput(
      { text: 'Gastaste 10.', claims: [toolClaim('observed_value', 'Gastaste 10.', '10', current)] },
      '',
      [turnValue(current, '10'), turnValue(current, '10')],
    )).toMatchObject({ success: false, reason: 'guard_rejected' });
  });

  it('solo acepta user_provided si el fragmento aparece en la pregunta redactada', () => {
    const text = 'Según lo que mencionaste, tu meta es 100.';
    const claim: ChatClaim = {
      span: spanOf(text, '100'), kind: 'user_provided', tool_call_id: null, path: null,
      metric: null, unit: null, currency: null, account_ref: null, period: null, comparison: null,
    };
    expect(validateChatOutput({ text, claims: [claim] }, 'Mi meta es 100', []).success).toBe(true);
    expect(validateChatOutput({ text, claims: [claim] }, 'Mi meta es 200', []).success).toBe(false);

    const observed = toolClaim('observed_value', text, '100', reference('call', ['value']));
    expect(validateChatOutput({ text, claims: [observed] }, 'Mi meta es 100', []).success).toBe(false);
  });

  it('recalcula comparaciones cualitativas y rechaza una relación incorrecta', () => {
    const left = reference('call_current', ['value']);
    const right = reference('call_previous', ['value']);
    const text = 'El gasto fue más que antes.';
    const claim: ChatClaim = {
      span: spanOf(text, 'más que'), kind: 'qualitative_comparison', tool_call_id: null,
      path: null, metric: null, unit: null, currency: null, account_ref: null, period: null,
      comparison: { left, right, relation: 'greater_than' },
    };
    const evidence = [turnValue(left, '10'), turnValue(right, '5')];
    expect(validateChatOutput({ text, claims: [claim] }, '', evidence).success).toBe(true);
    expect(validateChatOutput({
      text,
      claims: [{ ...claim, comparison: { left, right, relation: 'less_than' } }],
    }, '', evidence).success).toBe(false);
  });

  it('valida límites de período y conteos de cobertura', () => {
    const periodSource = reference('call_coverage', ['period', 'to']);
    const countSource = reference('call_coverage', ['coverage', 'observed_days']);
    const text = 'Hasta 2026-10-31 hubo 20 días observados.';
    const evidence: TurnResultValue[] = [
      { ...periodSource, kind: 'period_bound', value: '2026-10-31', metric: null, unit: 'date', currency: null, account_ref: '…1234', period },
      { ...countSource, kind: 'coverage_count', value: '20', metric: null, unit: 'days', currency: null, account_ref: '…1234', period },
    ];
    expect(validateChatOutput({
      text,
      claims: [
        toolClaim('period_bound', text, '2026-10-31', periodSource),
        toolClaim('coverage_count', text, '20 días', countSource),
      ],
    }, '', evidence).success).toBe(true);
  });

  it.each([
    'Fueron cien.',
    'El gasto se duplicó.',
    'El gasto subió 20 %.',
  ])('rechaza cantidades, porcentajes o variaciones sin respaldo: %s', (text) => {
    expect(validateChatOutput({ text, claims: [] }, '', [])).toMatchObject({
      success: false,
      reason: 'guard_rejected',
    });
  });

  it('rechaza un ratio aunque cada componente tenga una referencia válida', () => {
    const left = reference('call_left', ['value']);
    const right = reference('call_right', ['value']);
    const text = 'La relación fue 2:1.';
    expect(validateChatOutput({
      text,
      claims: [
        toolClaim('observed_value', text, '2', left),
        toolClaim('observed_value', text, '1', right),
      ],
    }, '', [turnValue(left, '2'), turnValue(right, '1')])).toMatchObject({
      success: false,
      reason: 'guard_rejected',
    });
  });
});
