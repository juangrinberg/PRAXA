export type NumericCandidateKind =
  | 'number'
  | 'percentage'
  | 'number_words'
  | 'variation'
  | 'comparison';

export type NumericCandidate = Readonly<{
  kind: NumericCandidateKind;
  text: string;
  start: number;
  end: number;
}>;

const NUMBER_PATTERN =
  /(?<![\p{L}\p{N}_…])[-+]?\d+(?:[.,]\d+)*(?:\s*%)?(?![\p{L}\p{N}_])/gu;
const VARIATION_PATTERN =
  /(?<!\p{L})(?:doble|triple|se\s+duplic(?:ó|aron)|aument(?:ó|aron)\s+un(?:a)?(?:\s+\d+(?:[.,]\d+)*\s*%)?|cay(?:ó|eron)\s+a\s+la\s+mitad)(?!\p{L})/giu;
const COMPARISON_PATTERN = /\b(?:más|menos|igual)\s+que\b/giu;
const WORD_PATTERN = /\p{L}+/gu;

const NUMBER_WORDS = new Set([
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'dieciseis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintidos',
  'veintitrés',
  'veintitres',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintiseis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
  'cien',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
  'mil',
  'millón',
  'millon',
  'millones',
  'mitad',
]);

function candidate(
  kind: NumericCandidateKind,
  text: string,
  start: number,
  end: number,
): NumericCandidate {
  return Object.freeze({ kind, text, start, end });
}

function patternCandidates(
  source: string,
  kind: NumericCandidateKind,
  pattern: RegExp,
): NumericCandidate[] {
  return [...source.matchAll(pattern)].map((match) => {
    const start = match.index;
    return candidate(kind, match[0], start, start + match[0].length);
  });
}

function numberWordCandidates(source: string): NumericCandidate[] {
  const tokens = [...source.matchAll(WORD_PATTERN)];
  const result: NumericCandidate[] = [];
  let start: number | undefined;
  let end: number | undefined;
  let lastNumberEnd: number | undefined;
  let hasNumberWord = false;

  const flush = () => {
    if (start !== undefined && lastNumberEnd !== undefined && hasNumberWord) {
      result.push(
        candidate('number_words', source.slice(start, lastNumberEnd), start, lastNumberEnd),
      );
    }
    start = undefined;
    end = undefined;
    lastNumberEnd = undefined;
    hasNumberWord = false;
  };

  for (const token of tokens) {
    const tokenStart = token.index;
    const tokenEnd = tokenStart + token[0].length;
    const normalized = token[0].toLocaleLowerCase('es-AR');
    const isNumberWord = NUMBER_WORDS.has(normalized);
    const isConnector = normalized === 'y';
    const contiguous = end === undefined || /^\s+$/.test(source.slice(end, tokenStart));

    if (isNumberWord && contiguous) {
      start ??= tokenStart;
      end = tokenEnd;
      lastNumberEnd = tokenEnd;
      hasNumberWord = true;
      continue;
    }

    if (isConnector && start !== undefined && contiguous) {
      end = tokenEnd;
      continue;
    }

    flush();
    if (isNumberWord) {
      start = tokenStart;
      end = tokenEnd;
      lastNumberEnd = tokenEnd;
      hasNumberWord = true;
    }
  }
  flush();

  return result;
}

/**
 * Encuentra todo texto que CA-50 obliga a respaldar. Los índices son unidades UTF-16,
 * iguales a `String.slice` y a los índices de las expresiones regulares de JavaScript.
 */
export function findNumericCandidates(source: string): readonly NumericCandidate[] {
  const values = [
    ...patternCandidates(source, 'variation', VARIATION_PATTERN),
    ...patternCandidates(source, 'comparison', COMPARISON_PATTERN),
    ...patternCandidates(source, 'number', NUMBER_PATTERN).map((value) =>
      value.text.trimEnd().endsWith('%')
        ? candidate('percentage', value.text, value.start, value.end)
        : value,
    ),
    ...numberWordCandidates(source),
  ];

  const unique = new Map<string, NumericCandidate>();
  for (const value of values) {
    unique.set(`${value.kind}:${value.start}:${value.end}`, value);
  }

  return Object.freeze(
    [...unique.values()].sort(
      (left, right) => left.start - right.start || right.end - left.end || left.kind.localeCompare(right.kind),
    ),
  );
}
