import { describe, expect, it } from 'vitest';

import {
  chatOutputSchema,
  createCurrentTurnOutputSchema,
  type ChatClaim,
  type ChatResultReference,
} from '@/modules/chat/output-schema';
import {
  validateChatOutput,
  type TurnResultValue,
} from '@/modules/chat/guard';
import {
  CONTROLLED_CHAT_ABSTENTION,
  renderChatResponse,
} from '@/modules/chat/render';

const period = { from: '2026-10-01', to: '2026-10-31' };

const reference = (
  tool_call_id: string,
  path: readonly (string | number)[],
): ChatResultReference => ({
  tool_call_id,
  path: [...path],
});

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

const executedTotal = (
  source: ChatResultReference,
  value = '1234.50',
  coverage: 'complete' | 'partial' = 'complete',
) => ({
  tool_call_id: source.tool_call_id,
  tool_name: 'total',
  coverage,
  values: [
    {
      path: [...source.path],
      kind: 'observed_value',
      value,
      metric: 'spend',
      unit: 'currency',
      currency: 'ARS',
      account_ref: '…1234',
      period,
    },
  ],
});

describe('CA-50: esquema estructurado de salida', () => {
  it('acepta text y los cinco tipos de claim con forma estricta', () => {
    const text =
      'Gastaste $ 1.234,50 hasta 2026-10-31, con 20 días; fue mayor que antes. Tu meta era 100.';
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
        comparison: {
          left: observed,
          right: previous,
          relation: 'greater_than',
        },
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

  it('rechaza objetos y claims con propiedades adicionales', () => {
    const text = 'Gastaste 10.';
    const source = reference('call_total', ['value']);
    const claim = toolClaim('observed_value', text, '10', source);

    expect(chatOutputSchema.safeParse({ text, claims: [claim], prompt: 'inyectado' }).success).toBe(
      false,
    );
    expect(
      chatOutputSchema.safeParse({ text, claims: [{ ...claim, sql: 'select 1' }] }).success,
    ).toBe(false);
    expect(
      chatOutputSchema.safeParse({
        text,
        claims: [{ ...claim, span: { ...claim.span, company_id: 'ajena' } }],
      }).success,
    ).toBe(false);
  });

  it.each([
    { start: -1, end: 2 },
    { start: 2, end: 2 },
    { start: 3, end: 2 },
    { start: 0, end: 999 },
  ])('rechaza un span inválido o fuera de text: %o', (span) => {
    const text = 'Valor 10';
    const claim = { ...toolClaim('observed_value', text, '10', reference('call', ['value'])), span };
    expect(chatOutputSchema.safeParse({ text, claims: [claim] }).success).toBe(false);
  });

  it('exige referencia y metadatos en observed_value', () => {
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
  });

  it('no permite atribuir una referencia de herramienta a user_provided', () => {
    const text = 'Tu meta era 100';
    const claim: ChatClaim = {
      span: spanOf(text, '100'),
      kind: 'user_provided',
      tool_call_id: 'call_total',
      path: ['value'],
      metric: null,
      unit: null,
      currency: null,
      account_ref: null,
      period: null,
      comparison: null,
    };

    expect(chatOutputSchema.safeParse({ text, claims: [claim] }).success).toBe(false);
  });

  it('solo acepta referencias incluidas explícitamente en el turno actual', () => {
    const text = 'Gastaste 10.';
    const current = reference('call_current', ['value']);
    const output = {
      text,
      claims: [toolClaim('observed_value', text, '10', current)],
    };

    expect(createCurrentTurnOutputSchema([current]).safeParse(output).success).toBe(true);
    expect(createCurrentTurnOutputSchema([]).safeParse(output).success).toBe(false);
    expect(
      createCurrentTurnOutputSchema([reference('call_old', ['value'])]).safeParse(output).success,
    ).toBe(false);
  });
});

describe('CA-50: guarda contra afirmaciones sin respaldo', () => {
  it('acepta un gasto exacto o redondeado respaldado por el turno actual', () => {
    const source = reference('call_total', ['value']);
    const evidence = turnValue(source, '1234.505');

    for (const displayed of ['1.234,505', '1.234,51', '1.235']) {
      const text = `Gastaste ${displayed}.`;
      const output = {
        text,
        claims: [toolClaim('observed_value', text, displayed, source)],
      };
      expect(validateChatOutput(output, '', [evidence]).success).toBe(true);
    }
  });

  it('rechaza una cifra inventada aunque apunte a una referencia existente', () => {
    const source = reference('call_total', ['value']);
    const text = 'Gastaste 999999.';
    const output = {
      text,
      claims: [toolClaim('observed_value', text, '999999', source)],
    };

    expect(validateChatOutput(output, '', [turnValue(source, '1234.50')]).success).toBe(false);
  });

  it('rechaza una cifra correcta atribuida a otra métrica o período', () => {
    const source = reference('call_total', ['value']);
    const text = 'Hubo 1234 impresiones.';
    const spendClaim = toolClaim('observed_value', text, '1234', source);
    const impressionsClaim: ChatClaim = {
      ...spendClaim,
      metric: 'impressions',
      unit: 'impressions',
      currency: null,
    };
    const otherPeriodClaim: ChatClaim = {
      ...spendClaim,
      period: { from: '2026-09-01', to: '2026-09-30' },
    };
    const evidence = turnValue(source, '1234');

    expect(validateChatOutput({ text, claims: [impressionsClaim] }, '', [evidence]).success).toBe(
      false,
    );
    expect(validateChatOutput({ text, claims: [otherPeriodClaim] }, '', [evidence]).success).toBe(
      false,
    );
  });

  it('rechaza candidatos sin claim y referencias de un turno anterior', () => {
    const current = reference('call_current', ['value']);
    const old = reference('call_old', ['value']);
    const text = 'Gastaste 10 y luego 20.';
    const outputWithUncovered = {
      text,
      claims: [toolClaim('observed_value', text, '10', current)],
    };
    const oldOutput = {
      text: 'Gastaste 10.',
      claims: [toolClaim('observed_value', 'Gastaste 10.', '10', old)],
    };

    expect(validateChatOutput(outputWithUncovered, '', [turnValue(current, '10')]).success).toBe(
      false,
    );
    expect(validateChatOutput(oldOutput, '', [turnValue(current, '10')]).success).toBe(false);
  });

  it('solo acepta user_provided cuando el fragmento aparece en la pregunta redactada', () => {
    const text = 'Según lo que mencionaste, tu meta es 100.';
    const claim: ChatClaim = {
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
    };

    expect(validateChatOutput({ text, claims: [claim] }, 'Mi meta es 100', []).success).toBe(true);
    expect(validateChatOutput({ text, claims: [claim] }, 'Mi meta es 200', []).success).toBe(false);
  });

  it('recalcula una comparación cualitativa sobre dos valores observados', () => {
    const left = reference('call_current', ['value']);
    const right = reference('call_previous', ['value']);
    const text = 'El gasto fue más que antes.';
    const comparison: ChatClaim = {
      span: spanOf(text, 'más que'),
      kind: 'qualitative_comparison',
      tool_call_id: null,
      path: null,
      metric: null,
      unit: null,
      currency: null,
      account_ref: null,
      period: null,
      comparison: { left, right, relation: 'greater_than' },
    };
    const evidence = [turnValue(left, '10'), turnValue(right, '5')];

    expect(validateChatOutput({ text, claims: [comparison] }, '', evidence).success).toBe(true);
    expect(
      validateChatOutput(
        { text, claims: [{ ...comparison, comparison: { left, right, relation: 'less_than' } }] },
        '',
        evidence,
      ).success,
    ).toBe(false);
  });

  it('valida límites de período y conteos de cobertura contra el turno actual', () => {
    const periodSource = reference('call_coverage', ['period', 'to']);
    const countSource = reference('call_coverage', ['coverage', 'observed_days']);
    const text = 'Hasta 2026-10-31 hubo 20 días observados.';
    const evidence: TurnResultValue[] = [
      {
        ...periodSource,
        kind: 'period_bound',
        value: '2026-10-31',
        metric: null,
        unit: 'date',
        currency: null,
        account_ref: '…1234',
        period,
      },
      {
        ...countSource,
        kind: 'coverage_count',
        value: '20',
        metric: null,
        unit: 'days',
        currency: null,
        account_ref: '…1234',
        period,
      },
    ];

    expect(
      validateChatOutput(
        {
          text,
          claims: [
            toolClaim('period_bound', text, '2026-10-31', periodSource),
            toolClaim('coverage_count', text, '20 días', countSource),
          ],
        },
        '',
        evidence,
      ).success,
    ).toBe(true);
  });

  it('rechaza una cantidad escrita con palabras sin claim', () => {
    expect(validateChatOutput({ text: 'Fueron cien.', claims: [] }, '', []).success).toBe(false);
  });

  it.each(['El gasto se duplicó.', 'El gasto subió 20 %.'])(
    'rechaza variaciones y porcentajes no soportados: %s',
    (text) => {
      expect(validateChatOutput({ text, claims: [] }, '', []).success).toBe(false);
    },
  );
});

describe('CA-50: recorrido determinístico de respuesta', () => {
  it('renderiza una respuesta válida respaldada por un resultado ejecutado', () => {
    const source = reference('call_total', ['value']);
    const text = 'Gastaste 1.234,50.';
    const result = renderChatResponse({
      modelOutput: {
        text,
        claims: [toolClaim('observed_value', text, '1.234,50', source)],
      },
      questionRedacted: '¿Cuánto gasté?',
      toolResults: [executedTotal(source)],
    });

    expect(result).toMatchObject({ outcome: 'answered', text });
  });

  it('produce una abstención controlada ante una cifra inventada', () => {
    const source = reference('call_total', ['value']);
    const inventedText = 'Gastaste 999999.';
    const result = renderChatResponse({
      modelOutput: {
        text: inventedText,
        claims: [toolClaim('observed_value', inventedText, '999999', source)],
      },
      questionRedacted: '¿Cuánto gasté?',
      toolResults: [executedTotal(source)],
    });

    expect(result).toEqual({
      outcome: 'not_answered',
      reason: 'guard_rejected',
      text: CONTROLLED_CHAT_ABSTENTION,
      claims: [],
    });
    expect(result.text).not.toContain('999999');
  });

  it('produce la misma abstención ante salida inválida o referencia inexistente', () => {
    const current = reference('call_current', ['value']);
    const missing = reference('call_missing', ['value']);
    const text = 'Gastaste 10.';

    for (const modelOutput of [
      { text, claims: [{ desconocido: true }] },
      { text, claims: [toolClaim('observed_value', text, '10', missing)] },
    ]) {
      expect(
        renderChatResponse({
          modelOutput,
          questionRedacted: '¿Cuánto gasté?',
          toolResults: [executedTotal(current, '10')],
        }),
      ).toEqual({
        outcome: 'not_answered',
        reason: 'guard_rejected',
        text: CONTROLLED_CHAT_ABSTENTION,
        claims: [],
      });
    }
  });

  it('marca como parcial una respuesta que usa un resultado parcial', () => {
    const source = reference('call_total', ['value']);
    const text = 'Gastaste 1.234,50.';
    const result = renderChatResponse({
      modelOutput: {
        text,
        claims: [toolClaim('observed_value', text, '1.234,50', source)],
      },
      questionRedacted: '¿Cuánto gasté?',
      toolResults: [executedTotal(source, '1234.50', 'partial')],
    });

    expect(result).toMatchObject({ outcome: 'answered_partial_coverage', text });
  });

  it('no propaga contenido inválido cuando los resultados ejecutados no validan', () => {
    const result = renderChatResponse({
      modelOutput: { text: 'Resultado 10.', claims: [] },
      questionRedacted: 'pregunta',
      toolResults: [{ tool_call_id: 'call', tool_name: 'total', coverage: 'complete' }],
    });

    expect(result).toEqual({
      outcome: 'not_answered',
      reason: 'tool_error',
      text: CONTROLLED_CHAT_ABSTENTION,
      claims: [],
    });
  });
});
