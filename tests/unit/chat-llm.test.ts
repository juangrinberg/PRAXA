import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  DEEPINFRA_CHAT_COMPLETIONS_URL,
  DEEPINFRA_MODEL_ID,
  DeepInfraConfigError,
  DeepInfraRequestError,
  createDeepInfraModelClient,
  readDeepInfraConfig,
  type DeepInfraFetch,
} from '@/modules/chat/llm';
import { CHAT_LIMITS } from '@/modules/chat/limits';
import { chatToolSelectionSchema } from '@/modules/chat/tools/schema';
import { SecretValue } from '@/modules/integrations/crypto/seal';

const SYNTHETIC_KEY = 'synthetic-deepinfra-key';
const period = { from: '2026-10-01', to: '2026-10-31' };
const validOutput = { text: 'No hay datos disponibles.', claims: [] };

const toolCall = () => ({
  name: 'total' as const,
  arguments: { metric: 'spend' as const, period },
});

function providerResponse(
  content: string,
  options: Readonly<{
    model?: string;
    finishReason?: string;
    overrides?: Record<string, unknown>;
  }> = {},
): Response {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl-synthetic',
      object: 'chat.completion',
      created: 1_793_568_000,
      model: options.model ?? DEEPINFRA_MODEL_ID,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: options.finishReason ?? 'stop',
        },
      ],
      ...options.overrides,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

const modelInput = () => ({
  messages: [
    { role: 'system', content: 'Respondé únicamente con el esquema.' },
    { role: 'user', content: 'Pregunta redactada.' },
  ],
});

const createClient = (fetch: DeepInfraFetch) =>
  createDeepInfraModelClient({
    config: readDeepInfraConfig({ DEEPINFRA_API_KEY: SYNTHETIC_KEY }),
    fetch,
  });

describe('CA-53/53b: configuración aislada de DeepInfra', () => {
  it('rechaza configuración ausente o vacía sin filtrar valores', () => {
    for (const environment of [{}, { DEEPINFRA_API_KEY: '' }, { DEEPINFRA_API_KEY: '   ' }]) {
      try {
        readDeepInfraConfig(environment);
        throw new Error('La configuración inválida fue aceptada.');
      } catch (error) {
        expect(error).toBeInstanceOf(DeepInfraConfigError);
        expect(String(error)).toBe('DeepInfraConfigError: Falta DEEPINFRA_API_KEY.');
        expect(String(error)).not.toContain(SYNTHETIC_KEY);
      }
    }
  });

  it('lee únicamente DEEPINFRA_API_KEY y la encapsula mediante SecretValue', () => {
    const reads: PropertyKey[] = [];
    const environment = new Proxy(
      { DEEPINFRA_API_KEY: SYNTHETIC_KEY, OTHER_SECRET: 'not-read' },
      {
        get(target, property, receiver) {
          reads.push(property);
          return Reflect.get(target, property, receiver);
        },
      },
    );

    const config = readDeepInfraConfig(environment);

    expect(reads).toEqual(['DEEPINFRA_API_KEY']);
    expect(config.apiKey).toBeInstanceOf(SecretValue);
    expect(String(config.apiKey)).toBe('[redactado]');
    expect(JSON.stringify(config)).not.toContain(SYNTHETIC_KEY);
  });
});

describe('CA-53/53b: peticiones estructuradas sintéticas', () => {
  it('envía para complete una petición cerrada al modelo y endpoint exactos', async () => {
    const calls: Array<{ input: URL; init: RequestInit }> = [];
    const fetch: DeepInfraFetch = async (input, init) => {
      calls.push({ input, init });
      return providerResponse(JSON.stringify(validOutput));
    };
    const signal = new AbortController().signal;

    const result = await createClient(fetch).complete(modelInput(), signal);

    expect(result).toEqual({
      success: true,
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: DEEPINFRA_MODEL_ID,
      output: validOutput,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].input.href).toBe(DEEPINFRA_CHAT_COMPLETIONS_URL);
    expect(calls[0].init).toMatchObject({
      method: 'POST',
      cache: 'no-store',
      redirect: 'error',
      signal,
    });
    expect(calls[0].init.headers).toEqual({
      accept: 'application/json',
      authorization: `Bearer ${SYNTHETIC_KEY}`,
      'content-type': 'application/json',
    });

    const body = JSON.parse(String(calls[0].init.body));
    expect(body).toMatchObject({
      model: 'deepseek-ai/DeepSeek-V4.1-Flash',
      messages: modelInput().messages,
      max_tokens: CHAT_LIMITS.maxModelOutputTokens,
      stream: false,
      n: 1,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'praxa_chat_output',
          strict: true,
          schema: expect.objectContaining({ type: 'object', additionalProperties: false }),
        },
      },
    });
    expect(body.max_tokens).toBe(800);
  });

  it('usa para selectTools un JSON Schema estricto, separado y con máximo cuatro sin mínimo', async () => {
    const calls: Array<{ input: URL; init: RequestInit }> = [];
    const fetch: DeepInfraFetch = async (input, init) => {
      calls.push({ input, init });
      return providerResponse(JSON.stringify({ tool_calls: [] }));
    };
    const signal = new AbortController().signal;

    await expect(createClient(fetch).selectTools(modelInput(), signal)).resolves.toMatchObject({
      success: true,
      selection: { tool_calls: [] },
    });

    const body = JSON.parse(String(calls[0].init.body));
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: {
        name: 'praxa_chat_tool_selection',
        strict: true,
        schema: expect.objectContaining({ type: 'object', additionalProperties: false }),
      },
    });
    const callsSchema = body.response_format.json_schema.schema.properties.tool_calls;
    expect(callsSchema.maxItems).toBe(4);
    expect(callsSchema).not.toHaveProperty('minItems');
  });

  it('acepta cero y cuatro llamadas, pero rechaza cinco localmente', async () => {
    const signal = new AbortController().signal;
    for (const count of [0, 4]) {
      const selection = { tool_calls: Array.from({ length: count }, toolCall) };
      const client = createClient(async () => providerResponse(JSON.stringify(selection)));
      await expect(client.selectTools(modelInput(), signal)).resolves.toMatchObject({
        success: true,
        selection,
      });
    }

    const five = { tool_calls: Array.from({ length: 5 }, toolCall) };
    const client = createClient(async () => providerResponse(JSON.stringify(five)));
    await expect(client.selectTools(modelInput(), signal)).resolves.toMatchObject({
      success: false,
      reason: 'guard_rejected',
      failureKind: 'invalid_response',
    });
    expect(chatToolSelectionSchema.safeParse(five).success).toBe(true);
  });

  it('pasa exactamente la misma AbortSignal a ambas operaciones sin crear timeouts', async () => {
    const calls: RequestInit[] = [];
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetch: DeepInfraFetch = async (_input, init) => {
      calls.push(init);
      const body = JSON.parse(String(init.body));
      const selection = body.response_format.json_schema.name === 'praxa_chat_tool_selection';
      return providerResponse(JSON.stringify(selection ? { tool_calls: [] } : validOutput));
    };
    const signal = new AbortController().signal;

    try {
      const client = createClient(fetch);
      await client.selectTools(modelInput(), signal);
      await client.complete(modelInput(), signal);

      expect(calls).toHaveLength(2);
      expect(calls[0].signal).toBe(signal);
      expect(calls[1].signal).toBe(signal);
      expect(timeout).not.toHaveBeenCalled();
    } finally {
      timeout.mockRestore();
    }
  });

  it('rechaza argumentos extra de herramientas al validar nuevamente con Zod', async () => {
    const selection = {
      tool_calls: [
        {
          ...toolCall(),
          arguments: { ...toolCall().arguments, company_id: 'empresa-ajena' },
        },
      ],
    };
    const client = createClient(async () => providerResponse(JSON.stringify(selection)));

    await expect(
      client.selectTools(modelInput(), new AbortController().signal),
    ).resolves.toMatchObject({
      success: false,
      reason: 'guard_rejected',
      failureKind: 'invalid_response',
    });
  });
});

describe('CA-53/53b: fallos controlados', () => {
  it.each([
    ['JSON de proveedor ilegible', new Response('{', { status: 200 })],
    [
      'envelope inválido',
      new Response(JSON.stringify({ model: DEEPINFRA_MODEL_ID }), { status: 200 }),
    ],
    ['content no JSON', providerResponse('texto libre sintético')],
    [
      'salida fuera del schema',
      providerResponse(JSON.stringify({ text: 'respuesta', claims: [{ kind: 'inventado' }] })),
    ],
    [
      'finish_reason inesperado',
      providerResponse(JSON.stringify(validOutput), { finishReason: 'length' }),
    ],
  ])('rechaza %s como invalid_response', async (_case, response) => {
    const client = createClient(async () => response);
    const result = await client.complete(modelInput(), new AbortController().signal);

    expect(result).toMatchObject({
      success: false,
      reason: 'guard_rejected',
      failureKind: 'invalid_response',
      requestedModelId: DEEPINFRA_MODEL_ID,
    });
    expect(JSON.stringify(result)).not.toContain('texto libre sintético');
  });

  it('trata HTTP como model_unavailable sin filtrar el cuerpo', async () => {
    const client = createClient(async () =>
      new Response(JSON.stringify({ error: 'synthetic-provider-detail' }), { status: 503 }),
    );

    const result = await client.complete(modelInput(), new AbortController().signal);

    expect(result).toEqual({
      success: false,
      reason: 'model_unavailable',
      failureKind: 'http',
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: null,
    });
    expect(JSON.stringify(result)).not.toContain('synthetic-provider-detail');
  });

  it.each([
    ['AbortError', 'timeout'],
    ['TimeoutError', 'timeout'],
    ['NetworkError', 'transport'],
  ])('normaliza %s sin filtrar el error de transporte', async (name, failureKind) => {
    const client = createClient(async () => {
      if (name === 'NetworkError') throw new Error('synthetic-host-and-secret');
      throw new DOMException('synthetic-host-and-secret', name);
    });

    const result = await client.complete(modelInput(), new AbortController().signal);
    expect(result).toEqual({
      success: false,
      reason: 'model_unavailable',
      failureKind,
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: null,
    });
    expect(JSON.stringify(result)).not.toContain('synthetic-host-and-secret');
  });

  it('rechaza un modelo reportado inesperado sin cambiar el solicitado', async () => {
    const client = createClient(async () =>
      providerResponse(JSON.stringify(validOutput), { model: 'synthetic/other-model' }),
    );

    await expect(
      client.complete(modelInput(), new AbortController().signal),
    ).resolves.toEqual({
      success: false,
      reason: 'guard_rejected',
      failureKind: 'unexpected_model',
      requestedModelId: DEEPINFRA_MODEL_ID,
      reportedModelId: 'synthetic/other-model',
    });
  });
});

describe('CA-53/53b: validación local y aislamiento', () => {
  it('rechaza entradas inválidas antes de llamar al transporte', async () => {
    const fetch = vi.fn<DeepInfraFetch>();
    const client = createClient(fetch);
    const signal = new AbortController().signal;
    const invalidInputs = [
      { messages: [] },
      { messages: [{ role: 'tool', content: 'dato' }] },
      { messages: [{ role: 'user', content: '   ' }] },
      { messages: [{ role: 'user', content: 'pregunta', tenant_id: 'ajeno' }] },
      { messages: [{ role: 'user', content: 'pregunta' }], model: 'otro/modelo' },
      { messages: [{ role: 'user', content: 'pregunta' }], company_id: 'ajena' },
    ];

    for (const input of invalidInputs) {
      await expect(client.complete(input, signal)).rejects.toBeInstanceOf(DeepInfraRequestError);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('congela resultados exitosos y fallidos', async () => {
    const success = await createClient(async () =>
      providerResponse(JSON.stringify(validOutput)),
    ).complete(modelInput(), new AbortController().signal);
    const failure = await createClient(async () => new Response('', { status: 503 })).complete(
      modelInput(),
      new AbortController().signal,
    );

    expect(Object.isFrozen(success)).toBe(true);
    expect(Object.isFrozen(failure)).toBe(true);
  });

  it('no usa fetch global ni registra contenido cuando el transporte está inyectado', async () => {
    const globalFetch = vi.spyOn(globalThis, 'fetch');
    const logs = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];

    try {
      await createClient(async () => providerResponse(JSON.stringify(validOutput))).complete(
        modelInput(),
        new AbortController().signal,
      );
      expect(globalFetch).not.toHaveBeenCalled();
      for (const log of logs) expect(log).not.toHaveBeenCalled();
    } finally {
      globalFetch.mockRestore();
      for (const log of logs) log.mockRestore();
    }
  });
});
