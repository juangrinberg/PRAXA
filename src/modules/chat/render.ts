import { validateChatOutput, type ChatGuardResult } from './guard';
import type { ChatClaim, ChatOutput } from './output-schema';
import { adaptExecutedToolResults } from './tools/results';

export const CONTROLLED_CHAT_ABSTENTION =
  'No puedo responder con seguridad usando los datos disponibles.';

export type ChatFailureReason =
  | 'guard_rejected'
  | 'tool_error'
  | 'model_unavailable';

export type RenderedChatResponse =
  | Readonly<{
      outcome: 'answered' | 'answered_partial_coverage';
      text: string;
      claims: readonly ChatClaim[];
    }>
  | Readonly<{
      outcome: 'not_answered';
      reason: ChatFailureReason;
      text: typeof CONTROLLED_CHAT_ABSTENTION;
      claims: readonly [];
    }>;

type RenderChatResponseInput = Readonly<{
  modelOutput: unknown;
  questionRedacted: string;
  toolResults: readonly unknown[];
}>;

const EMPTY_CLAIMS = Object.freeze([]) as readonly [];

export function renderChatFailure(reason: ChatFailureReason): RenderedChatResponse {
  return Object.freeze({
    outcome: 'not_answered',
    reason,
    text: CONTROLLED_CHAT_ABSTENTION,
    claims: EMPTY_CLAIMS,
  });
}

function referencedToolCallIds(output: ChatOutput): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const claim of output.claims) {
    if (claim.tool_call_id !== null) ids.add(claim.tool_call_id);
    if (claim.comparison !== null) {
      ids.add(claim.comparison.left.tool_call_id);
      ids.add(claim.comparison.right.tool_call_id);
    }
  }
  return ids;
}

function acceptedResponse(
  guarded: Extract<ChatGuardResult, { success: true }>,
  partialToolCallIds: readonly string[],
): RenderedChatResponse {
  const referenced = referencedToolCallIds(guarded.data);
  const partial = partialToolCallIds.some((toolCallId) => referenced.has(toolCallId));
  return Object.freeze({
    outcome: partial ? 'answered_partial_coverage' : 'answered',
    text: guarded.data.text,
    claims: Object.freeze([...guarded.data.claims]),
  });
}

export function renderChatResponse(input: RenderChatResponseInput): RenderedChatResponse {
  const adapted = adaptExecutedToolResults(input.toolResults);
  if (!adapted.success) return renderChatFailure('tool_error');

  const guarded = validateChatOutput(
    input.modelOutput,
    input.questionRedacted,
    adapted.values,
  );
  if (!guarded.success) return renderChatFailure('guard_rejected');

  return acceptedResponse(guarded, adapted.partialToolCallIds);
}
