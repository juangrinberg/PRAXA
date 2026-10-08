export const CHAT_MAX_TOOL_CALLS_PER_TURN = 4;
export const CHAT_MAX_MODEL_OUTPUT_TOKENS = 800;
export const CHAT_MAX_TURNS_PER_USER = 1;
export const CHAT_TURN_TIMEOUT_MS = 60_000;

export function isWithinChatToolCallLimit(count: number): boolean {
  return (
    Number.isInteger(count) &&
    count >= 0 &&
    count <= CHAT_MAX_TOOL_CALLS_PER_TURN
  );
}