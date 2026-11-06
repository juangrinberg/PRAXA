import { maskExternalAccountId } from '@/modules/integrations/contract';

export const MAX_REDACTED_QUESTION_LENGTH = 500;

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const ACCOUNT_PATTERN = /\bact_[A-Za-z0-9_-]+\b/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{7,}\.eyJ[A-Za-z0-9_-]{7,}\.[A-Za-z0-9_-]{10,}\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const SENSITIVE_FIELDS =
  'access_token|input_token|fb_exchange_token|token|client_secret|app_secret|appsecret_proof|password|code|state';
const SENSITIVE_PAIR_PATTERN = new RegExp(
  `\\b(${SENSITIVE_FIELDS})(\\s*[=:]\\s*)([^&\\s"'<>]+)`,
  'gi',
);
const SENSITIVE_JSON_PATTERN = new RegExp(
  `"(${SENSITIVE_FIELDS})"(\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`,
  'gi',
);
const PREFIXED_SECRET_PATTERN =
  /\b(?:EAA|sb_secret_|ghp_|github_pat_|xox(?:[baprs]-)?|AKIA|sk_(?:live|test)_|pk_(?:live|test)_)[A-Za-z0-9_-]{16,}\b/g;
const PHONE_PATTERN =
  /\+[1-9](?:[ ().-]*\d){7,14}(?![ ().-]*\d|[.,]\d)/g;
const TAX_PATTERN = /\b\d{2}-\d{8}-\d\b/g;
const BANK_PATTERN = /\b\d{22}\b/g;
const DIGIT_SEQUENCE_PATTERN = /\b\d(?:[ -]?\d)*\b/g;

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

function redactUrl(match: string): string {
  const trailingPunctuation = match.match(/[.,!?;:)}\]]+$/)?.[0] ?? '';
  return `[URL]${trailingPunctuation}`;
}

function replacePatterns(text: string): string {
  const redacted = text
    .replace(URL_PATTERN, redactUrl)
    .replace(EMAIL_PATTERN, '[EMAIL]')
    .replace(ACCOUNT_PATTERN, maskExternalAccountId)
    .replace(JWT_PATTERN, '[SECRETO]')
    .replace(BEARER_PATTERN, '[SECRETO]')
    .replace(
      SENSITIVE_JSON_PATTERN,
      (_match, field: string, separator: string) => `"${field}"${separator}"[SECRETO]"`,
    )
    .replace(
      SENSITIVE_PAIR_PATTERN,
      (_match, field: string, separator: string) => `${field}${separator}[SECRETO]`,
    )
    .replace(PREFIXED_SECRET_PATTERN, '[SECRETO]')
    .replace(PHONE_PATTERN, '[TELEFONO]')
    .replace(TAX_PATTERN, '[CUIT]')
    .replace(BANK_PATTERN, '[CBU]');

  return redacted.replace(
    DIGIT_SEQUENCE_PATTERN,
    (candidate, offset: number, whole: string) => {
      const digits = candidate.replace(/[ -]/g, '');
      const previousCharacter = whole[offset - 1] ?? '';
      const followingText = whole.substring(offset + candidate.length);

      if (/[.,]/.test(previousCharacter) || /^[.,]\d/.test(followingText)) return candidate;
      if (digits.length < 13 || digits.length > 19) return candidate;
      return passesLuhn(digits) ? '[TARJETA]' : candidate;
    },
  );
}

/**
 * CA-66: función pura compartida por la futura persistencia y el envío al modelo.
 * Redacta antes de limitar, cuenta puntos de código y reaplica hasta estabilizar el resultado.
 */
export function redactQuestion(
  question: string,
  maxLength = MAX_REDACTED_QUESTION_LENGTH,
): string {
  if (!Number.isFinite(maxLength) || !Number.isInteger(maxLength) || maxLength < 1) {
    throw new Error('La longitud máxima de la pregunta debe ser un entero positivo.');
  }

  let result = question;
  let previous: string;
  do {
    previous = result;
    result = replacePatterns(result);
  } while (result !== previous);

  const codePointLength = Array.from(result).length;
  if (codePointLength > maxLength) {
    throw new Error(
      `La pregunta redactada supera el límite de ${maxLength} puntos de código.`,
    );
  }

  return result;
}
