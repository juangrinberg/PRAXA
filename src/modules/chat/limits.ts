/** CA-70: valores iniciales del piloto, configurables por código del servidor. */
export const CHAT_LIMITS = Object.freeze({
  maxPeriodDays: 93,
  maxToolCallsPerTurn: 4,
  maxModelOutputTokens: 800,
  maxConcurrentTurnsPerUser: 1,
  maxTurnDurationMs: 60_000,
});

export class ChatLimitError extends Error {
  constructor(readonly code: 'tool_call_limit' | 'turn_timeout') {
    super(code === 'tool_call_limit' ? 'Se alcanzó el límite de herramientas del turno.' : 'El turno agotó su tiempo disponible.');
    this.name = 'ChatLimitError';
  }
}

export type ChatTurnBudget = Readonly<{
  run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T>;
}>;

/**
 * Una instancia por turno, creada dentro del servidor, nunca con datos del cliente.
 * Cuenta intentos (incluso fallidos) y descarta resultados fuera del plazo total.
 * No es un lock por usuario: la exclusión entre peticiones/instancias y el tope de
 * salida del modelo se conectarán en actions.ts/llm.ts (M25a.2).
 */
export function createChatTurnBudget(
  limits: Readonly<{ maxToolCallsPerTurn: number; maxTurnDurationMs: number }> = CHAT_LIMITS,
): ChatTurnBudget {
  const maxCalls = limits.maxToolCallsPerTurn;
  const duration = limits.maxTurnDurationMs;
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || !Number.isSafeInteger(duration) || duration < 1 || duration > 2_147_483_647) {
    throw new Error('Los límites del turno no son válidos.');
  }
  const deadline = performance.now() + duration;
  let calls = 0;
  return Object.freeze({
    async run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
      const remaining = deadline - performance.now();
      if (remaining <= 0) throw new ChatLimitError('turn_timeout');
      if (calls >= maxCalls) throw new ChatLimitError('tool_call_limit');
      calls += 1; // Reservado antes del primer await: dos llamadas no toman el mismo lugar.
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new ChatLimitError('turn_timeout'));
        }, remaining);
      });
      try {
        const value = await Promise.race([Promise.resolve().then(() => operation(controller.signal)), timeout]);
        if (performance.now() >= deadline) {
          controller.abort();
          throw new ChatLimitError('turn_timeout');
        }
        return value;
      } finally {
        clearTimeout(timer);
      }
    },
  });
}
