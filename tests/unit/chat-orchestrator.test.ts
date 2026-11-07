import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  appendSuccessfulChatTurn,
  createChatContext,
  getChatContextTurns,
} from '@/modules/chat/context';
import { DEEPINFRA_MODEL_ID, type ChatModelClient } from '@/modules/chat/llm';
import {
  ChatOrchestratorRequestError,
  createChatOrchestrator,
  type ChatToolExecution,
} from '@/modules/chat/orchestrator';
import { CONTROLLED_CHAT_ABSTENTION } from '@/modules/chat/render';

const period = { from: '2026-10-01', to: '2026-10-31' };
const totalCall = {
  name: 'total' as const,
  arguments: { metric: 'spend' as const, period },
};
const totalSelection = { tool_calls: [totalCall] };

const validOutput = {
  text: 'Gastaste 1.234,50.',
  claims: [
    {
      span: { start: 9, end: 17 },
      kind: 'observed_value' as const,
      tool_call_id: 'call_1',
      path: ['value'],
      metric: 'spend' as const,
      unit: 'currency',
      currency: 'ARS',
      account_ref: '…1234',
      period,
      comparison: null,
    },
  ],
};

const executedTotal = (
  toolCallId: string,
  coverage: 'complete' | 'partial' = 'complete',
) => ({
  tool_call_id: toolCallId,
  tool_name: 'total',
  coverage,
  values: [
    {
      path: ['value'],
      kind: 'observed_value',
      value: '1234.50',
      metric: 'spend',
      unit: 'currency',
      currency: 'ARS',
      account_ref: '…1234',
      period,
    },
  ],
});

const successfulModel = (
  selection: unknown = totalSelection,
  output: unknown = validOutput,
): ChatModelClient => ({
  selectTools: vi.fn(async () => ({
    success: true as const,
    requestedModelId: DEEPINFRA_MODEL_ID,
    reportedModelId: DEEPINFRA_MODEL_ID,
    selection: selection as never,
  })),
  complete: vi.fn(async () => ({
    success: true as const,
    requestedModelId: DEEPINFRA_MODEL_ID,
    reportedModelId: DEEPINFRA_MODEL_ID,
    output: output as never,
  })),
});

const makeTurn = (index: number) => ({
  questionRedacted: `pregunta-${index}`,
  answerValidated: `respuesta-${index}`,
});

const setup = (options?: {
  model?: ChatModelClient;
  executeTool?: (execution: ChatToolExecution) => Promise<unknown>;
}) => {
  const signal = new AbortController().signal;
  const createTurnSignal = vi.fn(() => signal);
  const model = options?.model ?? successfulModel();
  const executeTool = vi.fn(
    options?.executeTool ??
      (async ({ toolCallId }: ChatToolExecution) => executedTotal(toolCallId)),
  );
  const orchestrator = createChatOrchestrator({ model, executeTool, createTurnSignal });
  return { orchestrator, model, executeTool, createTurnSignal, signal };
};

describe('núcleo de orquestación simulada', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    null,
    {},
    { questionRedacted: '', context: createChatContext() },
    { questionRedacted: '   ', context: createChatContext() },
    { questionRedacted: 'x'.repeat(501), context: createChatContext() },
    { questionRedacted: 'pregunta', context: createChatContext(), company_id: 'empresa' },
    { questionRedacted: 'pregunta', context: createChatContext(), sql: 'select 1' },
  ])('rechaza una entrada inválida o con campos adicionales: %o', async (input) => {
    const { orchestrator, model, createTurnSignal } = setup();

    await expect(orchestrator.run(input)).rejects.toBeInstanceOf(
      ChatOrchestratorRequestError,
    );
    expect(createTurnSignal).not.toHaveBeenCalled();
    expect(model.selectTools).not.toHaveBeenCalled();
  });

  it('cuenta el máximo de pregunta por puntos de código Unicode', async () => {
    const model = successfulModel({ tool_calls: [] });
    const { orchestrator } = setup({ model });

    await expect(
      orchestrator.run({ questionRedacted: '🧠'.repeat(500), context: createChatContext() }),
    ).resolves.toMatchObject({ response: { outcome: 'not_answered' } });
    await expect(
      orchestrator.run({ questionRedacted: '🧠'.repeat(501), context: createChatContext() }),
    ).rejects.toBeInstanceOf(ChatOrchestratorRequestError);
  });

  it('rechaza un snapshot manipulado antes de crear la señal o llamar al modelo', async () => {
    const { orchestrator, model, createTurnSignal } = setup();
    const context = createChatContext([makeTurn(1)]);

    await expect(
      orchestrator.run({
        questionRedacted: 'pregunta',
        context: { ...context, totalCodePoints: context.totalCodePoints + 1 },
      }),
    ).rejects.toBeInstanceOf(ChatOrchestratorRequestError);
    expect(createTurnSignal).not.toHaveBeenCalled();
    expect(model.selectTools).not.toHaveBeenCalled();
  });

  it('envía contexto vacío y la pregunta actual solo a selección', async () => {
    const model = successfulModel();
    const { orchestrator } = setup({ model });

    await orchestrator.run({ questionRedacted: '¿Cuánto gasté?', context: createChatContext() });

    expect(model.selectTools).toHaveBeenCalledWith(
      {
        messages: [
          { role: 'system', content: expect.stringContaining('no autoritativ') },
          { role: 'user', content: '¿Cuánto gasté?' },
        ],
      },
      expect.any(AbortSignal),
    );
  });

  it('envía los seis turnos en orden solo a selección y nunca a complete', async () => {
    const context = createChatContext(
      Array.from({ length: 6 }, (_, index) => makeTurn(index + 1)),
    );
    const model = successfulModel();
    const { orchestrator } = setup({ model });

    await orchestrator.run({ questionRedacted: 'pregunta-actual', context });

    const selectionInput = vi.mocked(model.selectTools).mock.calls[0][0];
    expect(selectionInput).toEqual({
      messages: [
        { role: 'system', content: expect.stringContaining('no autoritativ') },
        ...Array.from({ length: 6 }, (_, index) => [
          { role: 'user', content: `pregunta-${index + 1}` },
          { role: 'assistant', content: `respuesta-${index + 1}` },
        ]).flat(),
        { role: 'user', content: 'pregunta-actual' },
      ],
    });

    const completeInput = vi.mocked(model.complete).mock.calls[0][0];
    const serialized = JSON.stringify(completeInput);
    expect(serialized).toContain('pregunta-actual');
    expect(serialized).toContain('call_1');
    expect(serialized).not.toContain('pregunta-1');
    expect(serialized).not.toContain('respuesta-1');
  });

  it('crea una sola señal con 60.000 ms y la comparte en todo el turno', async () => {
    const calls = { tool_calls: [totalCall, totalCall] };
    const model = successfulModel(calls, { text: 'Datos disponibles.', claims: [] });
    const { orchestrator, createTurnSignal, executeTool, signal } = setup({ model });

    await orchestrator.run({ questionRedacted: 'pregunta', context: createChatContext() });

    expect(createTurnSignal).toHaveBeenCalledOnce();
    expect(createTurnSignal).toHaveBeenCalledWith(60_000);
    expect(vi.mocked(model.selectTools).mock.calls[0][1]).toBe(signal);
    expect(executeTool).toHaveBeenNthCalledWith(1, expect.objectContaining({ signal }));
    expect(executeTool).toHaveBeenNthCalledWith(2, expect.objectContaining({ signal }));
    expect(vi.mocked(model.complete).mock.calls[0][1]).toBe(signal);
  });

  it('asigna IDs correlativos en el servidor y permite cuatro ejecuciones', async () => {
    const model = successfulModel(
      { tool_calls: Array.from({ length: 4 }, () => totalCall) },
      { text: 'Datos disponibles.', claims: [] },
    );
    const { orchestrator, executeTool } = setup({ model });

    const result = await orchestrator.run({
      questionRedacted: 'pregunta',
      context: createChatContext(),
    });

    expect(executeTool).toHaveBeenCalledTimes(4);
    expect(executeTool.mock.calls.map(([execution]) => execution.toolCallId)).toEqual([
      'call_1', 'call_2', 'call_3', 'call_4',
    ]);
    expect(result.toolNames).toEqual(['total', 'total', 'total', 'total']);
  });

  it('abstiene ante cero llamadas sin ejecutar ni completar', async () => {
    const model = successfulModel({ tool_calls: [] });
    const { orchestrator, executeTool } = setup({ model });

    const result = await orchestrator.run({
      questionRedacted: 'pregunta',
      context: createChatContext(),
    });

    expect(result.response).toEqual({
      outcome: 'not_answered', reason: 'guard_rejected',
      text: CONTROLLED_CHAT_ABSTENTION, claims: [],
    });
    expect(executeTool).not.toHaveBeenCalled();
    expect(model.complete).not.toHaveBeenCalled();
  });

  it('rechaza cinco llamadas antes del ejecutor', async () => {
    const model = successfulModel({
      tool_calls: Array.from({ length: 5 }, () => totalCall),
    });
    const { orchestrator, executeTool } = setup({ model });

    const result = await orchestrator.run({ questionRedacted: 'pregunta', context: createChatContext() });

    expect(result.response).toMatchObject({ outcome: 'not_answered', reason: 'guard_rejected' });
    expect(executeTool).not.toHaveBeenCalled();
    expect(model.complete).not.toHaveBeenCalled();
  });

  it.each([
    ['herramienta desconocida', { tool_calls: [{ name: 'run_sql', arguments: {} }] }],
    ['argumentos inválidos', { tool_calls: [{ name: 'total', arguments: { metric: 'roas', period } }] }],
    ['argumentos autoritativos', { tool_calls: [{ ...totalCall, company_id: 'empresa' }] }],
  ])('rechaza %s antes del ejecutor', async (_case, selection) => {
    const model = successfulModel(selection);
    const { orchestrator, executeTool } = setup({ model });

    const result = await orchestrator.run({ questionRedacted: 'pregunta', context: createChatContext() });

    expect(result.response).toMatchObject({ outcome: 'not_answered', reason: 'guard_rejected' });
    expect(executeTool).not.toHaveBeenCalled();
  });

  it('convierte una excepción del ejecutor en tool_error sin filtrar detalles', async () => {
    const { orchestrator, model } = setup({
      executeTool: async () => { throw new Error('secreto-del-proveedor'); },
    });

    const result = await orchestrator.run({ questionRedacted: 'pregunta', context: createChatContext() });

    expect(result.response).toMatchObject({ outcome: 'not_answered', reason: 'tool_error' });
    expect(JSON.stringify(result)).not.toContain('secreto-del-proveedor');
    expect(model.complete).not.toHaveBeenCalled();
  });

  it.each([
    ['ID incorrecto', executedTotal('call_ajena')],
    ['nombre incorrecto', { ...executedTotal('call_1'), tool_name: 'coverage' }],
    ['estructura inválida', { tool_call_id: 'call_1', tool_name: 'total', coverage: 'complete' }],
  ])('rechaza resultado con %s', async (_case, toolResult) => {
    const { orchestrator, model } = setup({ executeTool: async () => toolResult });

    const result = await orchestrator.run({ questionRedacted: 'pregunta', context: createChatContext() });

    expect(result.response).toMatchObject({ outcome: 'not_answered', reason: 'tool_error' });
    expect(model.complete).not.toHaveBeenCalled();
  });

  it.each(['selection', 'answer'] as const)('mantiene recuperable un fallo del modelo en %s', async (stage) => {
    const model = successfulModel();
    vi.mocked(stage === 'selection' ? model.selectTools : model.complete).mockResolvedValueOnce({
      success: false,
      reason: 'model_unavailable',
      failureKind: 'timeout',
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: null,
    });
    const { orchestrator } = setup({ model });

    const result = await orchestrator.run({ questionRedacted: 'pregunta', context: createChatContext() });

    expect(result.response).toMatchObject({ outcome: 'not_answered', reason: 'model_unavailable' });
    expect(result.requestedModelId).toBe(DEEPINFRA_MODEL_ID);
    expect(result.reportedModelId).toBe(stage === 'selection' ? null : DEEPINFRA_MODEL_ID);
  });

  it.each([
    ['answered', 'complete' as const],
    ['answered_partial_coverage', 'partial' as const],
  ])('renderiza %s y agrega únicamente la respuesta validada al contexto', async (_outcome, coverage) => {
    const context = appendSuccessfulChatTurn(createChatContext(), makeTurn(1));
    const { orchestrator } = setup({
      executeTool: async ({ toolCallId }) => executedTotal(toolCallId, coverage),
    });

    const result = await orchestrator.run({ questionRedacted: '¿Cuánto gasté?', context });

    expect(result.response.outcome).toBe(_outcome);
    expect(getChatContextTurns(result.nextContext)).toEqual([
      makeTurn(1),
      { questionRedacted: '¿Cuánto gasté?', answerValidated: validOutput.text },
    ]);
  });

  it('abstiene ante una cifra inventada y conserva el contexto sin cambios', async () => {
    const context = createChatContext([makeTurn(1)]);
    const invented = {
      ...validOutput,
      text: 'Gastaste 999999.',
      claims: [{ ...validOutput.claims[0], span: { start: 9, end: 15 } }],
    };
    const { orchestrator } = setup({ model: successfulModel(totalSelection, invented) });

    const result = await orchestrator.run({ questionRedacted: 'pregunta', context });

    expect(result.response).toMatchObject({ outcome: 'not_answered', reason: 'guard_rejected' });
    expect(result.nextContext).toEqual(context);
    expect(getChatContextTurns(result.nextContext)).toEqual([makeTurn(1)]);
  });

  it('devuelve modelos, arrays y snapshots inmutables', async () => {
    const { orchestrator } = setup();

    const result = await orchestrator.run({ questionRedacted: '¿Cuánto gasté?', context: createChatContext() });

    expect(result.requestedModelId).toBe(DEEPINFRA_MODEL_ID);
    expect(result.reportedModelId).toBe(DEEPINFRA_MODEL_ID);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.toolNames)).toBe(true);
    expect(Object.isFrozen(result.nextContext)).toBe(true);
    expect(Object.isFrozen(result.nextContext.turns)).toBe(true);
  });

  it('no registra contenido ni errores en consola', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { orchestrator } = setup({
      executeTool: async () => { throw new Error('detalle sensible'); },
    });

    await orchestrator.run({ questionRedacted: 'pregunta sensible', context: createChatContext() });

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
