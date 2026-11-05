import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { findNumericCandidates } from '@/modules/chat/numeric-candidates';
import {
  DEEPINFRA_CHAT_COMPLETIONS_URL,
  DEEPINFRA_MODEL_ID,
  DeepInfraConfigError,
  DeepInfraRequestError,
  createDeepInfraModelClient,
  readDeepInfraConfig,
  type ChatModelClient,
  type DeepInfraFetch,
} from '@/modules/chat/llm';
import { adaptExecutedToolResults } from '@/modules/chat/tools/results';
import { createChatOrchestrator } from '@/modules/chat/orchestrator';

const period = { from: '2026-10-01', to: '2026-10-31' };

const executedResult = (
  overrides: Record<string, unknown> = {},
) => ({
  tool_call_id: 'call_total',
  tool_name: 'total',
  coverage: 'complete',
  values: [
    {
      path: ['value'],
      kind: 'observed_value',
      value: '9007199254740993.12345678901234567890',
      metric: 'spend',
      unit: 'currency',
      currency: 'ARS',
      account_ref: '…1234',
      period,
    },
  ],
  ...overrides,
});

describe('CA-50: detección adversaria de candidatos numéricos', () => {
  it('detecta dígitos, formatos es-AR y porcentajes sin perder sus posiciones', () => {
    const text = 'Hubo 1200 impresiones, gastaste $ 1.234,50 y subió 20 %.';
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

  it('detecta cantidades escritas en español, incluidas fracciones', () => {
    const candidates = findNumericCandidates(
      'Fueron ciento veintitrés ventas, dos millones de impresiones y cayó a la mitad.',
    );

    expect(candidates.map((candidate) => [candidate.kind, candidate.text])).toEqual(
      expect.arrayContaining([
        ['number_words', 'ciento veintitrés'],
        ['number_words', 'dos millones'],
        ['number_words', 'mitad'],
      ]),
    );
  });

  it.each([
    ['El gasto fue doble.', 'variation', 'doble'],
    ['Las impresiones se duplicaron.', 'variation', 'se duplicaron'],
    ['El gasto aumentó un 20 %.', 'variation', 'aumentó un 20 %'],
    ['El gasto cayó a la mitad.', 'variation', 'cayó a la mitad'],
    ['Gastaste más que antes.', 'comparison', 'más que'],
    ['Gastaste menos que antes.', 'comparison', 'menos que'],
    ['Fue igual que ayer.', 'comparison', 'igual que'],
  ])('detecta %s como %s', (text, kind, fragment) => {
    expect(findNumericCandidates(text)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind, text: fragment }),
      ]),
    );
  });

  it('detecta una cifra inventada aunque aparezca aislada en texto convincente', () => {
    expect(findNumericCandidates('Todo está bien: el total confirmado es 999999.')).toContainEqual(
      expect.objectContaining({ kind: 'number', text: '999999' }),
    );
  });

  it('detecta fechas y límites de período como candidatos verificables', () => {
    const candidates = findNumericCandidates('Período: 2026-10-01 a 2026-10-31.');
    expect(candidates.filter((candidate) => candidate.kind === 'number')).toHaveLength(6);
  });

  it('no confunde identificadores y cuentas truncadas con afirmaciones numéricas', () => {
    expect(findNumericCandidates('Cuenta …1234, act_5678 y call_9012.')).toEqual([]);
  });

  it('no trata palabras comunes que contienen nombres de números como cantidades', () => {
    expect(
      findNumericCandidates('Tenemos algunas oportunidades, una respuesta y un resultado claro.'),
    ).toEqual([]);
  });

  it('no incorpora un conector colgante al final de una cantidad escrita', () => {
    expect(findNumericCandidates('Fueron ciento y después terminó.')).toContainEqual(
      expect.objectContaining({ kind: 'number_words', text: 'ciento' }),
    );
  });

  it('es determinístico y no modifica el texto recibido', () => {
    const text = 'Gastaste 1.234,50 y fue mayor que antes.';
    const first = findNumericCandidates(text);
    expect(findNumericCandidates(text)).toEqual(first);
    expect(text).toBe('Gastaste 1.234,50 y fue mayor que antes.');
  });
});

describe('CA-50: adaptación de resultados ejecutados', () => {
  it('crea TurnResultValue solo desde valores presentes en el resultado real', () => {
    const adapted = adaptExecutedToolResults([executedResult()]);

    expect(adapted).toEqual({
      success: true,
      values: [
        {
          tool_call_id: 'call_total',
          path: ['value'],
          kind: 'observed_value',
          value: '9007199254740993.12345678901234567890',
          metric: 'spend',
          unit: 'currency',
          currency: 'ARS',
          account_ref: '…1234',
          period,
        },
      ],
      partialToolCallIds: [],
    });
  });

  it('conserva la cobertura parcial asociada al tool_call_id', () => {
    expect(
      adaptExecutedToolResults([executedResult({ coverage: 'partial' })]),
    ).toMatchObject({ success: true, partialToolCallIds: ['call_total'] });
  });

  it.each([
    [
      'ID de llamada duplicado',
      [executedResult(), executedResult()],
    ],
    [
      'ruta duplicada en una llamada',
      [
        executedResult({
          values: [executedResult().values[0], executedResult().values[0]],
        }),
      ],
    ],
    [
      'valor numérico convertido a number',
      [
        executedResult({
          values: [{ ...executedResult().values[0], value: 1234.5 }],
        }),
      ],
    ],
    [
      'campos no declarados',
      [executedResult({ company_id: 'empresa-ajena' })],
    ],
    [
      'connection_status con valores métricos',
      [executedResult({ tool_name: 'connection_status' })],
    ],
  ])('rechaza %s', (_case, results) => {
    expect(adaptExecutedToolResults(results)).toEqual({
      success: false,
      reason: 'invalid_tool_results',
    });
  });
});

const validModelOutput = {
  text: 'No hay datos suficientes.',
  claims: [],
};

function providerResponse(
  content: string,
  model: string = DEEPINFRA_MODEL_ID,
  overrides: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl-synthetic',
      object: 'chat.completion',
      created: 1_793_568_000,
      model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 10,
        total_tokens: 30,
        estimated_cost: 0.0001,
      },
      ...overrides,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

const createTestModelClient = (fetch: DeepInfraFetch) =>
  createDeepInfraModelClient({
    config: readDeepInfraConfig({ DEEPINFRA_API_KEY: 'synthetic-deepinfra-key' }),
    fetch,
    timeoutMs: 1_000,
  });

describe('CA-53/53b: adaptador de DeepInfra', () => {
  it('envía una petición cerrada y devuelve identificadores solicitado/reportado separados', async () => {
    const calls: Array<{ input: URL; init: RequestInit }> = [];
    const fetch: DeepInfraFetch = async (input, init) => {
      calls.push({ input, init });
      return providerResponse(JSON.stringify(validModelOutput));
    };
    const client = createTestModelClient(fetch);

    const result = await client.complete({
      messages: [
        { role: 'system', content: 'Respondé únicamente con el esquema.' },
        { role: 'user', content: 'Pregunta redactada.' },
      ],
    });

    expect(result).toEqual({
      success: true,
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: DEEPINFRA_MODEL_ID,
      output: validModelOutput,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].input.href).toBe(DEEPINFRA_CHAT_COMPLETIONS_URL);
    expect(calls[0].init).toMatchObject({
      method: 'POST',
      cache: 'no-store',
      redirect: 'error',
    });
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
    expect(calls[0].init.headers).toEqual({
      accept: 'application/json',
      authorization: 'Bearer synthetic-deepinfra-key',
      'content-type': 'application/json',
    });
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      model: DEEPINFRA_MODEL_ID,
      messages: [
        { role: 'system', content: 'Respondé únicamente con el esquema.' },
        { role: 'user', content: 'Pregunta redactada.' },
      ],
      max_tokens: 800,
      stream: false,
      n: 1,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'praxa_chat_output',
          strict: true,
          schema: expect.objectContaining({ type: 'object' }),
        },
      },
    });
  });

  it('usa un esquema estricto y separado para seleccionar herramientas', async () => {
    const calls: Array<{ input: URL; init: RequestInit }> = [];
    const client = createTestModelClient(async (input, init) => {
      calls.push({ input, init });
      return providerResponse(JSON.stringify(selectedTotal));
    });

    const result = await client.selectTools({
      messages: [{ role: 'user', content: '¿Cuánto gasté?' }],
    });

    expect(result).toEqual({
      success: true,
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: DEEPINFRA_MODEL_ID,
      selection: selectedTotal,
    });
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: {
        name: 'praxa_chat_tool_selection',
        strict: true,
        schema: expect.objectContaining({ type: 'object' }),
      },
    });
    expect(body.response_format.json_schema.schema.properties.tool_calls).toMatchObject({
      minItems: 1,
      maxItems: 4,
    });
  });

  it('rechaza desde el adaptador una selección con argumentos fuera del catálogo', async () => {
    const client = createTestModelClient(async () =>
      providerResponse(
        JSON.stringify({
          tool_calls: [
            {
              name: 'total',
              arguments: { metric: 'spend', period, company_id: 'empresa-ajena' },
            },
          ],
        }),
      ),
    );

    await expect(
      client.selectTools({ messages: [{ role: 'user', content: 'Pregunta redactada.' }] }),
    ).resolves.toMatchObject({
      success: false,
      reason: 'guard_rejected',
      failureKind: 'invalid_response',
    });
  });

  it.each([
    ['JSON de proveedor ilegible', new Response('{', { status: 200 })],
    [
      'sobre sin choices',
      new Response(JSON.stringify({ model: DEEPINFRA_MODEL_ID }), { status: 200 }),
    ],
    ['content no JSON', providerResponse('texto libre')],
    [
      'content fuera del schema',
      providerResponse(JSON.stringify({ text: 'respuesta', claims: [{ kind: 'inventado' }] })),
    ],
  ])('rechaza %s sin exponer el cuerpo', async (_case, response) => {
    const client = createTestModelClient(async () => response);
    const result = await client.complete({
      messages: [{ role: 'user', content: 'Pregunta redactada.' }],
    });

    expect(result).toMatchObject({
      success: false,
      reason: 'guard_rejected',
      failureKind: 'invalid_response',
      requestedModelId: DEEPINFRA_MODEL_ID,
    });
    expect(JSON.stringify(result)).not.toContain('texto libre');
  });

  it('trata errores HTTP como recuperables y no filtra el cuerpo del proveedor', async () => {
    const client = createTestModelClient(async () =>
      new Response(JSON.stringify({ error: { message: 'detalle sensible del proveedor' } }), {
        status: 503,
      }),
    );

    const result = await client.complete({
      messages: [{ role: 'user', content: 'Pregunta redactada.' }],
    });

    expect(result).toEqual({
      success: false,
      reason: 'model_unavailable',
      failureKind: 'http',
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: null,
    });
    expect(JSON.stringify(result)).not.toContain('detalle sensible');
  });

  it.each([
    ['timeout', new DOMException('detalle sensible', 'TimeoutError')],
    ['transport', new Error('host y token sensibles')],
  ])('trata %s como fallo recuperable redactado', async (failureKind, error) => {
    const client = createTestModelClient(async () => {
      throw error;
    });

    await expect(
      client.complete({ messages: [{ role: 'user', content: 'Pregunta redactada.' }] }),
    ).resolves.toEqual({
      success: false,
      reason: 'model_unavailable',
      failureKind,
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: null,
    });
  });

  it('rechaza un modelo reportado inesperado sin reemplazar silenciosamente el solicitado', async () => {
    const client = createTestModelClient(async () =>
      providerResponse(JSON.stringify(validModelOutput), 'otro/modelo'),
    );

    await expect(
      client.complete({ messages: [{ role: 'user', content: 'Pregunta redactada.' }] }),
    ).resolves.toEqual({
      success: false,
      reason: 'guard_rejected',
      failureKind: 'unexpected_model',
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: 'otro/modelo',
    });
  });

  it('rechaza entradas vacías, roles desconocidos y campos de control del llamador', async () => {
    const fetch = vi.fn<DeepInfraFetch>();
    const client = createTestModelClient(fetch);

    for (const input of [
      { messages: [] },
      { messages: [{ role: 'tool', content: 'dato' }] },
      { messages: [{ role: 'user', content: '   ' }] },
      {
        messages: [{ role: 'user', content: 'pregunta' }],
        model: 'otro/modelo',
      },
    ]) {
      await expect(client.complete(input as never)).rejects.toBeInstanceOf(DeepInfraRequestError);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('valida la configuración sin incluir el valor del secreto en el error', () => {
    expect(() => readDeepInfraConfig({})).toThrow(DeepInfraConfigError);
    expect(() => readDeepInfraConfig({ DEEPINFRA_API_KEY: '' })).toThrow(
      'Falta DEEPINFRA_API_KEY.',
    );
  });
});

const selectedTotal = {
  tool_calls: [
    {
      name: 'total' as const,
      arguments: { metric: 'spend' as const, period },
    },
  ],
};

const backedAnswer = {
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

const successfulModel = (
  selection: unknown = selectedTotal,
  output: unknown = backedAnswer,
): ChatModelClient => ({
  selectTools: vi.fn(async () => ({
    success: true as const,
    requestedModelId: DEEPINFRA_MODEL_ID,
    reportedModelId: DEEPINFRA_MODEL_ID,
    selection,
  })) as ChatModelClient['selectTools'],
  complete: vi.fn(async () => ({
    success: true as const,
    requestedModelId: DEEPINFRA_MODEL_ID,
    reportedModelId: DEEPINFRA_MODEL_ID,
    output,
  })) as ChatModelClient['complete'],
});

const executedTotalFor = (
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

describe('CA-50/CA-53: orquestador estructurado del turno', () => {
  it('selecciona, ejecuta y renderiza usando IDs asignados por el servidor', async () => {
    const model = successfulModel();
    const executeTool = vi.fn(async ({ toolCallId }: { toolCallId: string }) =>
      executedTotalFor(toolCallId),
    );
    const orchestrator = createChatOrchestrator({ model, executeTool });

    const result = await orchestrator.run({ questionRedacted: '¿Cuánto gasté?' });

    expect(executeTool).toHaveBeenCalledWith({
      toolCallId: 'call_1',
      call: selectedTotal.tool_calls[0],
    });
    expect(model.complete).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(model.complete).mock.calls[0][0])).toContain('call_1');
    expect(result).toMatchObject({
      response: { outcome: 'answered', text: backedAnswer.text },
      toolNames: ['total'],
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: DEEPINFRA_MODEL_ID,
    });
  });

  it.each([
    ['argumentos adicionales', { tool_calls: [{ ...selectedTotal.tool_calls[0], company_id: 'x' }] }],
    ['argumentos de herramienta inválidos', {
      tool_calls: [{ name: 'total', arguments: { metric: 'roas', period } }],
    }],
    ['catálogo desconocido', { tool_calls: [{ name: 'run_sql', arguments: {} }] }],
    ['selección vacía', { tool_calls: [] }],
    ['exceso de llamadas', { tool_calls: Array.from({ length: 5 }, () => selectedTotal.tool_calls[0]) }],
  ])('rechaza %s antes de ejecutar', async (_case, selection) => {
    const model = successfulModel(selection);
    const executeTool = vi.fn();
    const orchestrator = createChatOrchestrator({ model, executeTool });

    const result = await orchestrator.run({ questionRedacted: 'Pregunta redactada.' });

    expect(executeTool).not.toHaveBeenCalled();
    expect(model.complete).not.toHaveBeenCalled();
    expect(result.response).toMatchObject({
      outcome: 'not_answered',
      reason: 'guard_rejected',
    });
  });

  it('convierte una excepción del ejecutor en tool_error y no llama al segundo paso', async () => {
    const model = successfulModel();
    const orchestrator = createChatOrchestrator({
      model,
      executeTool: async () => {
        throw new Error('detalle interno sensible');
      },
    });

    const result = await orchestrator.run({ questionRedacted: 'Pregunta redactada.' });

    expect(result.response).toMatchObject({ outcome: 'not_answered', reason: 'tool_error' });
    expect(JSON.stringify(result)).not.toContain('detalle interno sensible');
    expect(model.complete).not.toHaveBeenCalled();
  });

  it('rechaza resultados con ID o nombre distintos de la llamada ejecutada', async () => {
    for (const toolResult of [
      executedTotalFor('call_ajena'),
      { ...executedTotalFor('call_1'), tool_name: 'coverage' },
    ]) {
      const model = successfulModel();
      const orchestrator = createChatOrchestrator({
        model,
        executeTool: async () => toolResult,
      });
      const result = await orchestrator.run({ questionRedacted: 'Pregunta redactada.' });

      expect(result.response).toMatchObject({ outcome: 'not_answered', reason: 'tool_error' });
      expect(model.complete).not.toHaveBeenCalled();
    }
  });

  it('propaga cobertura parcial solo cuando la respuesta referencia ese resultado', async () => {
    const orchestrator = createChatOrchestrator({
      model: successfulModel(),
      executeTool: async ({ toolCallId }) => executedTotalFor(toolCallId, 'partial'),
    });

    const result = await orchestrator.run({ questionRedacted: '¿Cuánto gasté?' });

    expect(result.response).toMatchObject({ outcome: 'answered_partial_coverage' });
  });

  it('abstiene si la salida inventa una cifra o referencia otro turno', async () => {
    for (const output of [
      {
        ...backedAnswer,
        text: 'Gastaste 999999.',
        claims: [{ ...backedAnswer.claims[0], span: { start: 9, end: 15 } }],
      },
      {
        ...backedAnswer,
        claims: [{ ...backedAnswer.claims[0], tool_call_id: 'call_anterior' }],
      },
    ]) {
      const orchestrator = createChatOrchestrator({
        model: successfulModel(selectedTotal, output),
        executeTool: async ({ toolCallId }) => executedTotalFor(toolCallId),
      });
      const result = await orchestrator.run({ questionRedacted: '¿Cuánto gasté?' });

      expect(result.response).toMatchObject({
        outcome: 'not_answered',
        reason: 'guard_rejected',
      });
      expect(result.response.text).not.toContain('999999');
    }
  });

  it.each(['selection', 'answer'] as const)(
    'mantiene recuperable un fallo del modelo en %s',
    async (stage) => {
      const model = successfulModel();
      vi.mocked(model[stage === 'selection' ? 'selectTools' : 'complete']).mockResolvedValueOnce({
        success: false,
        reason: 'model_unavailable',
        failureKind: 'timeout',
        requestedModelId: DEEPINFRA_MODEL_ID,
        reportedModelId: null,
      });
      const orchestrator = createChatOrchestrator({
        model,
        executeTool: async ({ toolCallId }) => executedTotalFor(toolCallId),
      });

      const result = await orchestrator.run({ questionRedacted: 'Pregunta redactada.' });

      expect(result.response).toMatchObject({
        outcome: 'not_answered',
        reason: 'model_unavailable',
      });
      expect(result.requestedModelId).toBe(DEEPINFRA_MODEL_ID);
    },
  );
});
