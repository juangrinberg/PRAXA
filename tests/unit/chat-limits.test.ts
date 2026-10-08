import { describe, expect, it } from 'vitest';

import {
  CHAT_MAX_MODEL_OUTPUT_TOKENS,
  CHAT_MAX_TOOL_CALLS_PER_TURN,
  CHAT_MAX_TURNS_PER_USER,
  CHAT_TURN_TIMEOUT_MS,
  isWithinChatToolCallLimit,
} from '@/modules/chat/limits';

describe('chat limits — CA-70', () => {
  it('define como máximo 4 llamadas a tools por turno', () => {
    expect(CHAT_MAX_TOOL_CALLS_PER_TURN).toBe(4);
    expect(isWithinChatToolCallLimit(4)).toBe(true);
    expect(isWithinChatToolCallLimit(5)).toBe(false);
  });

  it('define como máximo 800 tokens de salida del modelo', () => {
    expect(CHAT_MAX_MODEL_OUTPUT_TOKENS).toBe(800);
  });

  it('define un solo turno por usuario', () => {
    expect(CHAT_MAX_TURNS_PER_USER).toBe(1);
  });

  it('define un tiempo máximo total de 60 segundos', () => {
    expect(CHAT_TURN_TIMEOUT_MS).toBe(60_000);
  });
});