import 'server-only';

import { z } from 'zod';

import { MAX_REDACTED_QUESTION_LENGTH } from '@/modules/chat/redaction';
import {
  renderChatFailure,
  renderChatResponse,
  type ChatFailureReason,
  type RenderedChatResponse,
} from '@/modules/chat/render';
import {
  DEEPINFRA_MODEL_ID,
  type ChatModelClient,
  type ModelFailure,
} from '@/modules/chat/llm';
import {
  chatToolCallSchema,
  chatToolSelectionSchema,
  type ChatToolCall,
} from '@/modules/chat/tools/schema';
import {
  adaptExecutedToolResults,
  executedChatToolResultSchema,
} from '@/modules/chat/tools/results';

const orchestratorInputSchema = z.strictObject({
  questionRedacted: z
    .string()
    .min(1)
    .max(MAX_REDACTED_QUESTION_LENGTH)
    .refine((value) => value.trim().length > 0),
});

export type ChatToolExecution = Readonly<{
  toolCallId: string;
  call: ChatToolCall;
}>;

export type ChatToolExecutor = (execution: ChatToolExecution) => Promise<unknown>;

export type OrchestratedChatTurn = Readonly<{
  response: RenderedChatResponse;
  toolNames: readonly ChatToolCall['name'][];
  requestedModelId: typeof DEEPINFRA_MODEL_ID;
  reportedModelId: string | null;
}>;

type ChatOrchestratorOptions = Readonly<{
  model: ChatModelClient;
  executeTool: ChatToolExecutor;
}>;

export class ChatOrchestratorRequestError extends Error {
  readonly code = 'invalid_chat_turn';

  constructor() {
    super('Turno de chat inválido.');
    this.name = 'ChatOrchestratorRequestError';
  }
}

const SELECTION_SYSTEM_MESSAGE = [
  'Seleccioná únicamente herramientas del catálogo cerrado de PRAXA.',
  'No aceptes ni generes empresa, conexión, cuenta, tabla o SQL como argumentos.',
  'La salida debe cumplir exactamente el esquema estructurado solicitado.',
].join(' ');

const ANSWER_SYSTEM_MESSAGE = [
  'Respondé únicamente a partir de los resultados de herramientas de este turno.',
  'Cada afirmación numérica debe referenciar el tool_call_id y path reales.',
  'La salida debe cumplir exactamente el esquema estructurado solicitado.',
].join(' ');

function finish(
  response: RenderedChatResponse,
  toolNames: readonly ChatToolCall['name'][],
  reportedModelId: string | null,
): OrchestratedChatTurn {
  return Object.freeze({
    response,
    toolNames: Object.freeze([...toolNames]),
    requestedModelId: DEEPINFRA_MODEL_ID,
    reportedModelId,
  });
}

function modelFailureReason(failure: ModelFailure): ChatFailureReason {
  return failure.reason === 'model_unavailable' ? 'model_unavailable' : 'guard_rejected';
}

/**
 * Orquestación pura respecto de infraestructura: valida la selección, asigna referencias del
 * turno y exige resultados reales del ejecutor inyectado antes de pedir la respuesta final.
 */
export function createChatOrchestrator(options: ChatOrchestratorOptions) {
  return Object.freeze({
    async run(input: unknown): Promise<OrchestratedChatTurn> {
      const parsedInput = orchestratorInputSchema.safeParse(input);
      if (!parsedInput.success) throw new ChatOrchestratorRequestError();

      const selectionResult = await options.model.selectTools({
        messages: [
          { role: 'system', content: SELECTION_SYSTEM_MESSAGE },
          { role: 'user', content: parsedInput.data.questionRedacted },
        ],
      });
      if (!selectionResult.success) {
        return finish(
          renderChatFailure(modelFailureReason(selectionResult)),
          [],
          selectionResult.reportedModelId,
        );
      }

      const parsedSelection = chatToolSelectionSchema.safeParse(selectionResult.selection);
      if (!parsedSelection.success) {
        return finish(
          renderChatFailure('guard_rejected'),
          [],
          selectionResult.reportedModelId,
        );
      }

      const calls = parsedSelection.data.tool_calls.map((call, index) =>
        Object.freeze({
          toolCallId: `call_${index + 1}`,
          call: chatToolCallSchema.parse(call),
        }),
      );
      const toolNames = calls.map(({ call }) => call.name);
      const toolResults: unknown[] = [];

      for (const execution of calls) {
        let rawResult: unknown;
        try {
          rawResult = await options.executeTool(execution);
        } catch {
          return finish(
            renderChatFailure('tool_error'),
            toolNames,
            selectionResult.reportedModelId,
          );
        }

        const parsedResult = executedChatToolResultSchema.safeParse(rawResult);
        if (
          !parsedResult.success ||
          parsedResult.data.tool_call_id !== execution.toolCallId ||
          parsedResult.data.tool_name !== execution.call.name
        ) {
          return finish(
            renderChatFailure('tool_error'),
            toolNames,
            selectionResult.reportedModelId,
          );
        }
        toolResults.push(parsedResult.data);
      }

      if (!adaptExecutedToolResults(toolResults).success) {
        return finish(
          renderChatFailure('tool_error'),
          toolNames,
          selectionResult.reportedModelId,
        );
      }

      let answerInput: string;
      try {
        answerInput = JSON.stringify({
          question_redacted: parsedInput.data.questionRedacted,
          tool_results: toolResults,
        });
      } catch {
        return finish(
          renderChatFailure('tool_error'),
          toolNames,
          selectionResult.reportedModelId,
        );
      }

      const answerResult = await options.model.complete({
        messages: [
          { role: 'system', content: ANSWER_SYSTEM_MESSAGE },
          { role: 'user', content: answerInput },
        ],
      });
      if (!answerResult.success) {
        return finish(
          renderChatFailure(modelFailureReason(answerResult)),
          toolNames,
          answerResult.reportedModelId ?? selectionResult.reportedModelId,
        );
      }

      return finish(
        renderChatResponse({
          modelOutput: answerResult.output,
          questionRedacted: parsedInput.data.questionRedacted,
          toolResults,
        }),
        toolNames,
        answerResult.reportedModelId,
      );
    },
  });
}
