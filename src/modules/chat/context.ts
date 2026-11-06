export type ChatContextTurn = Readonly<{
  questionRedacted: string;
  answerValidated: string;
}>;

export type ChatContextLimits = Readonly<{
  maxTurns: number;
  maxCodePoints: number;
}>;

export type ChatContext = Readonly<{
  turns: readonly ChatContextTurn[];
  totalCodePoints: number;
}>;

export const DEFAULT_CHAT_CONTEXT_LIMITS: ChatContextLimits = Object.freeze({
  maxTurns: 6,
  maxCodePoints: 12_000,
});

export class ChatContextValidationError extends Error {
  constructor(message = 'El contexto del chat no es válido.') {
    super(message);
    this.name = 'ChatContextValidationError';
  }
}

const countCodePoints = (value: string) => Array.from(value).length;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(record).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function validateLimits(value: unknown): ChatContextLimits {
  if (!isRecord(value) || !hasExactKeys(value, ['maxCodePoints', 'maxTurns'])) {
    throw new ChatContextValidationError('La configuración de límites no es válida.');
  }

  const maxTurns = value.maxTurns;
  const maxCodePoints = value.maxCodePoints;
  if (
    typeof maxTurns !== 'number' ||
    !Number.isInteger(maxTurns) ||
    maxTurns <= 0 ||
    typeof maxCodePoints !== 'number' ||
    !Number.isInteger(maxCodePoints) ||
    maxCodePoints <= 0
  ) {
    throw new ChatContextValidationError('Los límites deben ser enteros positivos.');
  }

  return Object.freeze({ maxTurns, maxCodePoints });
}

function validateTurn(value: unknown): ChatContextTurn {
  if (!isRecord(value)) {
    throw new ChatContextValidationError('El turno no es válido.');
  }
  if (!hasExactKeys(value, ['answerValidated', 'questionRedacted'])) {
    throw new ChatContextValidationError('El turno contiene campos no permitidos.');
  }

  const questionRedacted = value.questionRedacted;
  const answerValidated = value.answerValidated;
  if (typeof questionRedacted !== 'string' || questionRedacted.trim().length === 0) {
    throw new ChatContextValidationError('La pregunta redactada no puede estar vacía.');
  }
  if (typeof answerValidated !== 'string' || answerValidated.trim().length === 0) {
    throw new ChatContextValidationError('La respuesta validada no puede estar vacía.');
  }

  return Object.freeze({ questionRedacted, answerValidated });
}

function countTurnCodePoints(turn: ChatContextTurn): number {
  return countCodePoints(turn.questionRedacted) + countCodePoints(turn.answerValidated);
}

function freezeContext(turns: readonly ChatContextTurn[], totalCodePoints: number): ChatContext {
  return Object.freeze({
    turns: Object.freeze([...turns]),
    totalCodePoints,
  });
}

function buildContext(
  rawTurns: readonly unknown[],
  limits: ChatContextLimits,
): ChatContext {
  const turns: ChatContextTurn[] = [];
  let totalCodePoints = 0;

  for (const rawTurn of rawTurns) {
    const turn = validateTurn(rawTurn);
    const turnCodePoints = countTurnCodePoints(turn);
    if (turnCodePoints > limits.maxCodePoints) {
      throw new ChatContextValidationError(
        'Un turno no puede superar el presupuesto completo del contexto.',
      );
    }

    turns.push(turn);
    totalCodePoints += turnCodePoints;

    while (turns.length > limits.maxTurns || totalCodePoints > limits.maxCodePoints) {
      const removed = turns.shift();
      if (removed) totalCodePoints -= countTurnCodePoints(removed);
    }
  }

  return freezeContext(turns, totalCodePoints);
}

function validateContext(value: unknown, limits?: ChatContextLimits): ChatContext {
  if (!isRecord(value) || !hasExactKeys(value, ['totalCodePoints', 'turns'])) {
    throw new ChatContextValidationError('La instantánea del contexto no es válida.');
  }

  const rawTurns = value.turns;
  const declaredTotal = value.totalCodePoints;
  if (!Array.isArray(rawTurns)) {
    throw new ChatContextValidationError('Los turnos del contexto no son válidos.');
  }
  if (
    typeof declaredTotal !== 'number' ||
    !Number.isInteger(declaredTotal) ||
    declaredTotal < 0
  ) {
    throw new ChatContextValidationError('El total declarado del contexto no es válido.');
  }

  const turns = rawTurns.map(validateTurn);
  const calculatedTotal = turns.reduce(
    (total, turn) => total + countTurnCodePoints(turn),
    0,
  );
  if (calculatedTotal !== declaredTotal) {
    throw new ChatContextValidationError('El total declarado no coincide con los turnos.');
  }
  if (
    limits &&
    (turns.length > limits.maxTurns || calculatedTotal > limits.maxCodePoints)
  ) {
    throw new ChatContextValidationError('La instantánea excede los límites indicados.');
  }

  return freezeContext(turns, calculatedTotal);
}

export function createChatContext(
  initialTurns: readonly ChatContextTurn[] = [],
  limits: ChatContextLimits = DEFAULT_CHAT_CONTEXT_LIMITS,
): ChatContext {
  if (!Array.isArray(initialTurns)) {
    throw new ChatContextValidationError('Los turnos iniciales no son válidos.');
  }

  return buildContext(initialTurns, validateLimits(limits));
}

export function appendSuccessfulChatTurn(
  context: ChatContext,
  turn: ChatContextTurn,
  limits: ChatContextLimits = DEFAULT_CHAT_CONTEXT_LIMITS,
): ChatContext {
  const checkedLimits = validateLimits(limits);
  const checkedContext = validateContext(context, checkedLimits);
  return buildContext([...checkedContext.turns, turn], checkedLimits);
}

export function getChatContextTurns(context: ChatContext): readonly ChatContextTurn[] {
  return validateContext(context).turns;
}
