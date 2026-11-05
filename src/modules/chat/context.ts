/**
 * Contexto conversacional efímero.
 *
 * Este módulo no persiste datos, no usa almacenamiento del navegador y no mantiene estado
 * global. Cada consumidor conserva su propia instancia en memoria durante la sesión visible
 * y vuelve a construir K01 en el servidor para cualquier operación autoritativa.
 */

export type ChatContextRole = 'user' | 'assistant';

export type ChatContextMessage = Readonly<{
  role: ChatContextRole;
  content: string;
}>;

export type ChatContextLimits = Readonly<{
  maxMessages: number;
  maxCharacters: number;
}>;

export type ChatContext = Readonly<{
  messages: readonly ChatContextMessage[];
  totalCharacters: number;
}>;

/** Seis turnos completos y un presupuesto textual acotado, ajustables por el consumidor. */
export const DEFAULT_CHAT_CONTEXT_LIMITS: ChatContextLimits = Object.freeze({
  maxMessages: 12,
  maxCharacters: 12_000,
});

export class ChatContextValidationError extends Error {
  constructor(message = 'El contexto del chat no es válido.') {
    super(message);
    this.name = 'ChatContextValidationError';
  }
}

const countCharacters = (value: string) => Array.from(value).length;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(record).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function validateLimits(value: unknown): ChatContextLimits {
  if (!isRecord(value) || !hasExactKeys(value, ['maxCharacters', 'maxMessages'])) {
    throw new ChatContextValidationError('La configuración de límites no es válida.');
  }

  // Cada propiedad se lee una sola vez. La operación usa únicamente esta copia inmutable.
  const maxMessages = value.maxMessages;
  const maxCharacters = value.maxCharacters;
  if (
    !Number.isInteger(maxMessages) ||
    (maxMessages as number) <= 0 ||
    !Number.isInteger(maxCharacters) ||
    (maxCharacters as number) <= 0
  ) {
    throw new ChatContextValidationError('Los límites del contexto deben ser enteros positivos.');
  }

  return Object.freeze({
    maxMessages: maxMessages as number,
    maxCharacters: maxCharacters as number,
  });
}

function validateMessage(value: unknown): ChatContextMessage {
  if (!isRecord(value)) {
    throw new ChatContextValidationError('El mensaje del contexto no es válido.');
  }

  if (!hasExactKeys(value, ['content', 'role'])) {
    throw new ChatContextValidationError('El mensaje contiene campos no permitidos.');
  }

  const role = value.role;
  const content = value.content;
  if (role !== 'user' && role !== 'assistant') {
    throw new ChatContextValidationError('El rol del mensaje no está permitido.');
  }
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new ChatContextValidationError('El contenido del mensaje no puede estar vacío.');
  }

  return Object.freeze({ role, content });
}

function freezeContext(messages: ChatContextMessage[], totalCharacters: number): ChatContext {
  return Object.freeze({
    messages: Object.freeze(messages),
    totalCharacters,
  });
}

function validateContext(value: unknown): ChatContext {
  if (!isRecord(value) || !hasExactKeys(value, ['messages', 'totalCharacters'])) {
    throw new ChatContextValidationError('La instantánea del contexto no es válida.');
  }

  const rawMessages = value.messages;
  const declaredTotal = value.totalCharacters;
  if (!Array.isArray(rawMessages)) {
    throw new ChatContextValidationError('Los mensajes del contexto no son válidos.');
  }
  if (!Number.isInteger(declaredTotal) || (declaredTotal as number) < 0) {
    throw new ChatContextValidationError('El tamaño declarado del contexto no es válido.');
  }

  const messages = rawMessages.map(validateMessage);
  const calculatedTotal = messages.reduce(
    (total, message) => total + countCharacters(message.content),
    0,
  );
  if (calculatedTotal !== declaredTotal) {
    throw new ChatContextValidationError('El tamaño declarado no coincide con los mensajes.');
  }

  return freezeContext(messages, calculatedTotal);
}

/**
 * Construye una instantánea independiente. Si excede un límite, conserva mensajes completos
 * desde el más reciente; nunca recorta el texto de un mensaje.
 */
export function createChatContext(
  initialMessages: readonly unknown[] = [],
  limits: ChatContextLimits = DEFAULT_CHAT_CONTEXT_LIMITS,
): ChatContext {
  const checkedLimits = validateLimits(limits);
  const messages: ChatContextMessage[] = [];
  let totalCharacters = 0;

  for (const rawMessage of initialMessages) {
    const message = validateMessage(rawMessage);
    const messageCharacters = countCharacters(message.content);
    if (messageCharacters > checkedLimits.maxCharacters) {
      throw new ChatContextValidationError(
        'Un mensaje no puede superar el tamaño total permitido para el contexto.',
      );
    }

    messages.push(message);
    totalCharacters += messageCharacters;

    while (
      messages.length > checkedLimits.maxMessages ||
      totalCharacters > checkedLimits.maxCharacters
    ) {
      const removed = messages.shift();
      if (removed) totalCharacters -= countCharacters(removed.content);
    }
  }

  return freezeContext(messages, totalCharacters);
}

/** Devuelve una nueva instantánea; la recibida no se modifica. */
export function appendChatContextMessage(
  context: unknown,
  message: unknown,
  limits: ChatContextLimits = DEFAULT_CHAT_CONTEXT_LIMITS,
): ChatContext {
  const checkedContext = validateContext(context);
  return createChatContext([...checkedContext.messages, message], limits);
}

/** Lectura explícita de la instantánea inmutable que se enviará al siguiente paso. */
export function getChatContextMessages(context: ChatContext): readonly ChatContextMessage[] {
  return context.messages;
}
