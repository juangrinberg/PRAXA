import { maskExternalAccountId } from '@/modules/integrations/contract';

/** CA-66: valor inicial confirmado en este corte; el servidor puede elegir otro. */
export const MAX_REDACTED_QUESTION_LENGTH = 500;

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const ACCOUNT_PATTERN = /\bact_[A-Za-z0-9_-]+\b/gi;
const PHONE_PATTERN = /\+[1-9](?:[ ().-]*\d){7,14}(?![ ().-]*\d)/g;
const TAX_PATTERN = /\b\d{2}-\d{8}-\d\b/g;
const BANK_PATTERN = /\b\d{22}\b/g;
const DIGIT_SEQUENCE = /\b\d(?:[ -]?\d)*\b/g;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{7,}\.eyJ[A-Za-z0-9_-]{7,}\.[A-Za-z0-9_-]{10,}\b/g;
const PREFIXED_SECRET_PATTERN = /\b(?:sk_(?:live|test)_|pk_(?:live|test)_|sb_secret_|ghp_|github_pat_|xox[baprs]-|AKIA|EAA)[A-Za-z0-9_-]{16,}\b/g;
// Una palabra larga no basta: al menos 32 caracteres de alfabeto de token, con
// letras y dígitos. Es una heurística de CA-66, no un detector universal de secretos.
const LONG_TOKEN_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g;

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function replacePatterns(text: string): string {
  const redacted = text
    // Primero las URLs completas: redactar antes un email/token dentro de ellas
    // podría dejar parte de la ruta o de la consulta sin cubrir.
    .replace(URL_PATTERN, (url) => `[URL]${url.match(/[.,!?;:)}\]]+$/)?.[0] ?? ''}`)
    .replace(EMAIL_PATTERN, '[EMAIL]')
    .replace(ACCOUNT_PATTERN, maskExternalAccountId)
    .replace(JWT_PATTERN, '[SECRETO]')
    .replace(PREFIXED_SECRET_PATTERN, '[SECRETO]')
    .replace(LONG_TOKEN_PATTERN, (token) => /[A-Za-z]/.test(token) && /\d/.test(token) ? '[SECRETO]' : token)
    .replace(PHONE_PATTERN, '[TELEFONO]')
    .replace(TAX_PATTERN, '[CUIT]')
    .replace(BANK_PATTERN, '[CBU]');

  return redacted.replace(DIGIT_SEQUENCE, (candidate, offset: number, whole: string) => {
    const digits = candidate.replace(/[ -]/g, '');
    // No tomar la parte entera o decimal de un monto como una tarjeta.
    if (/[.,]/.test(whole[offset - 1] ?? '') || /^[.,]\d/.test(whole.slice(offset + candidate.length))) {
      return candidate;
    }
    return digits.length >= 13 && digits.length <= 19 && passesLuhn(digits) ? '[TARJETA]' : candidate;
  });
}

/**
 * Función pura compartida por la futura persistencia y el envío al modelo. No loguea
 * contenido. Conserva montos y fechas; no detecta DNI, nombres ni direcciones libres.
 */
export function redactQuestion(question: string, maxLength = MAX_REDACTED_QUESTION_LENGTH): string {
  if (!Number.isSafeInteger(maxLength) || maxLength < 1) {
    throw new Error('La longitud máxima de la pregunta debe ser un entero positivo.');
  }
  let result = question;
  let previous: string;
  do {
    previous = result;
    result = Array.from(replacePatterns(result)).slice(0, maxLength).join('');
    // El corte puede crear un candidato (p. ej. quitar el sufijo de un número).
    // Reaplicar hasta estabilizar mantiene la idempotencia también en ese borde.
  } while (result !== previous);
  return result;
}
