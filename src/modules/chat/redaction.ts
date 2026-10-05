import { maskExternalAccountId } from '@/modules/integrations/contract';

export const MAX_REDACTED_QUESTION_LENGTH = 500;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const INTERNATIONAL_PHONE_PATTERN = /\+\d{1,3}(?:[\s().-]?\d){7,14}/g;
const TAX_ID_PATTERN = /\b\d{2}-\d{8}-\d\b/g;
const BANK_ACCOUNT_PATTERN = /\b\d{22}\b/g;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
const ACCOUNT_ID_PATTERN = /\bact_[A-Za-z0-9_-]+\b/g;

/**
 * Redacta números que podrían ser tarjetas solo si pasan Luhn.
 *
 * Se permiten espacios o guiones entre los dígitos, pero no puntos ni comas:
 * así los montos argentinos no se confunden con tarjetas.
 */
const CARD_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;

/** Prefijos inequívocos de secretos habituales, no palabras largas arbitrarias. */
const SECRET_PATTERN =
  /\b(?:sk_(?:live|test)_|pk_(?:live|test)_|ghp_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_-]{16,}\b/g;

function passesLuhn(value: string): boolean {
  const digits = value.replace(/[ -]/g, '');
  let sum = 0;
  let doubleDigit = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return sum % 10 === 0;
}

function redactCards(text: string): string {
  return text.replace(CARD_PATTERN, (candidate) =>
    passesLuhn(candidate) ? '[TARJETA]' : candidate,
  );
}

function redactUrls(text: string): string {
  return text.replace(URL_PATTERN, (candidate) => {
    const trailingPunctuation = candidate.match(/[.,!?;:)}\]]+$/)?.[0] ?? '';
    return `[URL]${trailingPunctuation}`;
  });
}

function redactAccountIds(text: string): string {
  return text.replace(ACCOUNT_ID_PATTERN, (candidate) => maskExternalAccountId(candidate));
}

/**
 * Redacta una pregunta antes de persistirla o enviarla fuera de PRAXA.
 *
 * La función es pura, no registra la pregunta original y no intenta detectar datos
 * personales en lenguaje libre que CA-66 declara fuera de alcance.
 */
export function redactQuestion(question: string): string {
  let redacted = question
    .replace(EMAIL_PATTERN, '[EMAIL]')
    .replace(INTERNATIONAL_PHONE_PATTERN, '[TELEFONO]')
    .replace(TAX_ID_PATTERN, '[CUIT]')
    .replace(BANK_ACCOUNT_PATTERN, '[CBU]');

  redacted = redactCards(redacted);
  redacted = redactUrls(redacted);
  redacted = redacted.replace(SECRET_PATTERN, '[SECRETO]');
  redacted = redactAccountIds(redacted);

  return redacted.slice(0, MAX_REDACTED_QUESTION_LENGTH);
}
