import { describe, expect, it, vi } from 'vitest';

import {
  CONTROLLED_CHAT_ABSTENTION,
  renderChatFailure,
  renderChatResponse,
} from '@/modules/chat/render';
import type { ChatClaim, ChatResultReference } from '@/modules/chat/output-schema';

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

const observedClaim = (
  text: string,
  fragment: string,
  source: ChatResultReference,
): ChatClaim => ({
  span: spanOf(text, fragment),
  kind: 'observed_value',
  tool_call_id: source.tool_call_id,
  path: source.path,
  metric: 'spend',
  unit: 'currency',
  currency: 'ARS',
  account_ref: '…1234',
  period,
  comparison: null,
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

const validInput = (coverage: 'complete' | 'partial' = 'complete') => {
  const source = reference('call_total', ['value']);
  const text = 'Gastaste 1.234,50.';
  return {
    modelOutput: { text, claims: [observedClaim(text, '1.234,50', source)] },
    questionRedacted: '¿Cuánto gasté?',
    toolResults: [executedTotal(source, '1234.50', coverage)],
  };
};

describe('render determinístico puro del chat', () => {
  it('devuelve una respuesta válida respaldada', () => {
    const input = validInput();

    expect(renderChatResponse(input)).toEqual({
      outcome: 'answered',
      text: input.modelOutput.text,
      claims: input.modelOutput.claims,
    });
  });

  it('marca como parcial una respuesta que referencia un resultado parcial', () => {
    expect(renderChatResponse(validInput('partial'))).toMatchObject({
      outcome: 'answered_partial_coverage',
    });
  });

  it('no marca como parcial una respuesta cuando el resultado parcial no está referenciado', () => {
    const input = validInput();
    const unreferenced = reference('call_unreferenced', ['value']);

    expect(
      renderChatResponse({
        ...input,
        toolResults: [
          ...input.toolResults,
          executedTotal(unreferenced, '99.00', 'partial'),
        ],
      }),
    ).toMatchObject({ outcome: 'answered' });
  });

  it('abstiene ante una cifra inventada sin devolver el texto rechazado', () => {
    const source = reference('call_total', ['value']);
    const rejectedText = 'Gastaste 999999.';
    const result = renderChatResponse({
      modelOutput: {
        text: rejectedText,
        claims: [observedClaim(rejectedText, '999999', source)],
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
    expect(result.text).toBe('No puedo responder con seguridad usando los datos disponibles.');
    expect(result.text).not.toContain(rejectedText);
    expect(result.claims).toEqual([]);
  });

  it.each([
    ['salida inválida', { text: 'Resultado 10.', claims: [{ desconocido: true }] }],
    [
      'referencia inexistente',
      {
        text: 'Gastaste 10.',
        claims: [
          observedClaim(
            'Gastaste 10.',
            '10',
            reference('call_missing', ['value']),
          ),
        ],
      },
    ],
  ])('abstiene por guard_rejected ante %s', (_case, modelOutput) => {
    const current = reference('call_current', ['value']);
    expect(
      renderChatResponse({
        modelOutput,
        questionRedacted: 'pregunta',
        toolResults: [executedTotal(current, '10')],
      }),
    ).toEqual({
      outcome: 'not_answered',
      reason: 'guard_rejected',
      text: CONTROLLED_CHAT_ABSTENTION,
      claims: [],
    });
  });

  it('devuelve tool_error cuando los resultados ejecutados son inválidos', () => {
    expect(
      renderChatResponse({
        modelOutput: { text: 'Resultado 10.', claims: [] },
        questionRedacted: 'pregunta',
        toolResults: [{ tool_call_id: 'call', tool_name: 'total', coverage: 'complete' }],
      }),
    ).toEqual({
      outcome: 'not_answered',
      reason: 'tool_error',
      text: CONTROLLED_CHAT_ABSTENTION,
      claims: [],
    });
  });

  it('renderChatFailure produce la misma abstención para model_unavailable', () => {
    expect(renderChatFailure('model_unavailable')).toEqual({
      outcome: 'not_answered',
      reason: 'model_unavailable',
      text: CONTROLLED_CHAT_ABSTENTION,
      claims: [],
    });
  });

  it('congela la respuesta y el array de claims tanto en éxito como en fallo', () => {
    const accepted = renderChatResponse(validInput());
    const rejected = renderChatFailure('model_unavailable');

    expect(Object.isFrozen(accepted)).toBe(true);
    expect(Object.isFrozen(accepted.claims)).toBe(true);
    expect(Object.isFrozen(rejected)).toBe(true);
    expect(Object.isFrozen(rejected.claims)).toBe(true);
  });

  it('es determinístico y no modifica sus entradas', () => {
    const input = validInput();
    const snapshot = structuredClone(input);

    expect(renderChatResponse(input)).toEqual(renderChatResponse(input));
    expect(input).toEqual(snapshot);
  });

  it('no registra contenido ni errores en consola', () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];

    try {
      renderChatResponse(validInput());
      renderChatFailure('model_unavailable');
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});
