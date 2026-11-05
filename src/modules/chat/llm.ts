import 'server-only';

import { z } from 'zod';

import { SecretValue } from '@/modules/integrations/crypto/seal';
import { CHAT_LIMITS } from '@/modules/chat/limits';
import { chatOutputSchema, type ChatOutput } from '@/modules/chat/output-schema';
import {
  chatToolSelectionSchema,
  type ChatToolSelection,
} from '@/modules/chat/tools/schema';

export const DEEPINFRA_MODEL_ID = 'deepseek-ai/DeepSeek-V4.1-Flash' as const;
export const DEEPINFRA_CHAT_COMPLETIONS_URL =
  'https://api.deepinfra.com/v1/openai/chat/completions' as const;

const modelMessageSchema = z.strictObject({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1).max(50_000).refine((value) => value.trim().length > 0),
});

const modelRequestSchema = z.strictObject({
  messages: z.array(modelMessageSchema).min(1).max(32),
});

const providerResponseSchema = z.strictObject({
  id: z.string().min(1).max(256),
  object: z.literal('chat.completion'),
  created: z.int().nonnegative(),
  model: z.string().min(1).max(256),
  choices: z.tuple([
    z.strictObject({
      index: z.literal(0),
      message: z.strictObject({
        role: z.literal('assistant'),
        content: z.string().min(1),
      }),
      finish_reason: z.string().min(1).max(64),
    }),
  ]),
  usage: z
    .strictObject({
      prompt_tokens: z.int().nonnegative(),
      completion_tokens: z.int().nonnegative(),
      total_tokens: z.int().nonnegative(),
      estimated_cost: z.number().nonnegative().optional(),
    })
    .optional(),
});

export type DeepInfraFetch = (
  input: URL,
  init: RequestInit,
) => Promise<Response>;

export type DeepInfraConfig = Readonly<{
  apiKey: SecretValue;
}>;

export class DeepInfraConfigError extends Error {
  readonly code = 'missing_deepinfra_api_key';

  constructor() {
    super('Falta DEEPINFRA_API_KEY.');
    this.name = 'DeepInfraConfigError';
  }
}

export class DeepInfraRequestError extends Error {
  readonly code = 'invalid_model_request';

  constructor() {
    super('Solicitud de modelo inválida.');
    this.name = 'DeepInfraRequestError';
  }
}

export function readDeepInfraConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): DeepInfraConfig {
  const apiKey = environment.DEEPINFRA_API_KEY;
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new DeepInfraConfigError();
  }

  return Object.freeze({ apiKey: new SecretValue(apiKey) });
}

type ModelSuccess = Readonly<{
  success: true;
  requestedModelId: typeof DEEPINFRA_MODEL_ID;
  reportedModelId: string;
  output: ChatOutput;
}>;

export type ModelFailure = Readonly<{
  success: false;
  reason: 'model_unavailable' | 'guard_rejected';
  failureKind:
    | 'http'
    | 'timeout'
    | 'transport'
    | 'invalid_response'
    | 'unexpected_model';
  requestedModelId: typeof DEEPINFRA_MODEL_ID;
  reportedModelId: string | null;
}>;

export type DeepInfraModelResult = ModelSuccess | ModelFailure;

type ToolSelectionSuccess = Readonly<{
  success: true;
  requestedModelId: typeof DEEPINFRA_MODEL_ID;
  reportedModelId: string;
  selection: ChatToolSelection;
}>;

export type DeepInfraToolSelectionResult = ToolSelectionSuccess | ModelFailure;

export type ChatModelClient = Readonly<{
  selectTools(input: unknown): Promise<DeepInfraToolSelectionResult>;
  complete(input: unknown): Promise<DeepInfraModelResult>;
}>;

type DeepInfraModelClientOptions = Readonly<{
  config: DeepInfraConfig;
  fetch?: DeepInfraFetch;
  timeoutMs?: number;
}>;

const outputJsonSchema = z.toJSONSchema(chatOutputSchema, {
  target: 'draft-7',
  unrepresentable: 'any',
});

const toolSelectionJsonSchema = z.toJSONSchema(chatToolSelectionSchema, {
  target: 'draft-7',
  unrepresentable: 'any',
});

type StructuredProfile<T> = Readonly<{
  name: string;
  schema: z.ZodType<T>;
  jsonSchema: object;
}>;

type StructuredSuccess<T> = Readonly<{
  success: true;
  requestedModelId: typeof DEEPINFRA_MODEL_ID;
  reportedModelId: string;
  data: T;
}>;

type StructuredResult<T> = StructuredSuccess<T> | ModelFailure;

function failure(
  reason: ModelFailure['reason'],
  failureKind: ModelFailure['failureKind'],
  reportedModelId: string | null = null,
): ModelFailure {
  return Object.freeze({
    success: false,
    reason,
    failureKind,
    requestedModelId: DEEPINFRA_MODEL_ID,
    reportedModelId,
  });
}

function extractReportedModelId(value: unknown): string | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'model' in value &&
    typeof value.model === 'string' &&
    value.model.length > 0 &&
    value.model.length <= 256
  ) {
    return value.model;
  }
  return null;
}

function isTimeoutError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) return false;
  return error.name === 'TimeoutError' || error.name === 'AbortError';
}

export function createDeepInfraModelClient(
  options: DeepInfraModelClientOptions,
): ChatModelClient {
  const timeoutMs = options.timeoutMs ?? CHAT_LIMITS.maxTurnDurationMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new DeepInfraRequestError();
  }

  const fetchProvider: DeepInfraFetch =
    options.fetch ?? ((input, init) => fetch(input, init));

  async function requestStructured<T>(
    input: unknown,
    profile: StructuredProfile<T>,
  ): Promise<StructuredResult<T>> {
      const parsedRequest = modelRequestSchema.safeParse(input);
      if (!parsedRequest.success) throw new DeepInfraRequestError();

      let response: Response;
      try {
        response = await fetchProvider(new URL(DEEPINFRA_CHAT_COMPLETIONS_URL), {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${options.config.apiKey.reveal()}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: DEEPINFRA_MODEL_ID,
            messages: parsedRequest.data.messages,
            max_tokens: CHAT_LIMITS.maxModelOutputTokens,
            stream: false,
            n: 1,
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: profile.name,
                strict: true,
                schema: profile.jsonSchema,
              },
            },
          }),
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        return failure(
          'model_unavailable',
          isTimeoutError(error) ? 'timeout' : 'transport',
        );
      }

      if (!response.ok) return failure('model_unavailable', 'http');

      let rawResponse: unknown;
      try {
        rawResponse = JSON.parse(await response.text());
      } catch {
        return failure('guard_rejected', 'invalid_response');
      }

      const reportedModelId = extractReportedModelId(rawResponse);
      const parsedResponse = providerResponseSchema.safeParse(rawResponse);
      if (!parsedResponse.success) {
        return failure('guard_rejected', 'invalid_response', reportedModelId);
      }

      if (parsedResponse.data.model !== DEEPINFRA_MODEL_ID) {
        return failure('guard_rejected', 'unexpected_model', parsedResponse.data.model);
      }

      let rawOutput: unknown;
      try {
        rawOutput = JSON.parse(parsedResponse.data.choices[0].message.content);
      } catch {
        return failure('guard_rejected', 'invalid_response', parsedResponse.data.model);
      }

      const parsedOutput = profile.schema.safeParse(rawOutput);
      if (!parsedOutput.success) {
        return failure('guard_rejected', 'invalid_response', parsedResponse.data.model);
      }

      return Object.freeze({
        success: true,
        requestedModelId: DEEPINFRA_MODEL_ID,
        reportedModelId: parsedResponse.data.model,
        data: parsedOutput.data,
      });
  }

  return Object.freeze({
    async selectTools(input: unknown): Promise<DeepInfraToolSelectionResult> {
      const result = await requestStructured(input, {
        name: 'praxa_chat_tool_selection',
        schema: chatToolSelectionSchema,
        jsonSchema: toolSelectionJsonSchema,
      });
      if (!result.success) return result;
      return Object.freeze({
        success: true,
        requestedModelId: result.requestedModelId,
        reportedModelId: result.reportedModelId,
        selection: result.data,
      });
    },
    async complete(input: unknown): Promise<DeepInfraModelResult> {
      const result = await requestStructured(input, {
        name: 'praxa_chat_output',
        schema: chatOutputSchema,
        jsonSchema: outputJsonSchema,
      });
      if (!result.success) return result;
      return Object.freeze({
        success: true,
        requestedModelId: result.requestedModelId,
        reportedModelId: result.reportedModelId,
        output: result.data,
      });
    },
  });
}
