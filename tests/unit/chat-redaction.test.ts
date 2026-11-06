import { describe, expect, it, vi } from 'vitest';

import { maskExternalAccountId } from '@/modules/integrations/contract';
import {
  MAX_REDACTED_QUESTION_LENGTH,
  redactQuestion,
} from '@/modules/chat/redaction';

const SENSITIVE_FIELDS = [
  'access_token',
  'input_token',
  'fb_exchange_token',
  'token',
  'client_secret',
  'app_secret',
  'appsecret_proof',
  'password',
  'code',
  'state',
] as const;

const syntheticSecret = (prefix: string) => `${prefix}${'A1'.repeat(8)}`;

describe('redacción CA-66', () => {
  it('fija el máximo inicial en 500 puntos de código', () => {
    expect(MAX_REDACTED_QUESTION_LENGTH).toBe(500);
  });

  it.each([
    ['Escribí a persona@example.test.', 'Escribí a [EMAIL].'],
    ['Teléfono +54 (11) 2345-6789.', 'Teléfono [TELEFONO].'],
    ['CUIT 20-12345678-6 y CUIL 27-12345678-0.', 'CUIT [CUIT] y CUIL [CUIT].'],
    ['Tarjeta 4111 1111 1111 1111.', 'Tarjeta [TARJETA].'],
    ['Tarjeta 4111-1111-1111-1111.', 'Tarjeta [TARJETA].'],
    ['CBU 0000000000000000000000.', 'CBU [CBU].'],
    ['Revisá https://example.test/informe?dato=123.', 'Revisá [URL].'],
  ])('reemplaza un patrón normativo: %s', (input, expected) => {
    expect(redactQuestion(input)).toBe(expected);
  });

  it('acepta teléfonos internacionales de 8 a 15 dígitos con los separadores aprobados', () => {
    expect(redactQuestion('+1 234-5678')).toBe('[TELEFONO]');
    expect(redactQuestion('+123 (456).789-012 345')).toBe('[TELEFONO]');
  });

  it('no redacta como teléfono una secuencia internacional de 7 o 16 dígitos', () => {
    expect(redactQuestion('+1234567')).toBe('+1234567');
    expect(redactQuestion('+1 234 567 890 123 456')).toBe('+1 234 567 890 123 456');
  });

  it('prioriza teléfono sobre tarjeta aunque los dígitos pasen Luhn', () => {
    expect(redactQuestion('+378282246310005')).toBe('[TELEFONO]');
  });

  it('solo redacta tarjetas de 13 a 19 dígitos que pasan Luhn', () => {
    expect(redactQuestion('4111111111111111')).toBe('[TARJETA]');
    expect(redactQuestion('4111111111111112')).toBe('4111111111111112');
    expect(redactQuestion('123456789012')).toBe('123456789012');
    expect(redactQuestion('12345678901234567890')).toBe('12345678901234567890');
  });

  it('prioriza CBU/CVU contiguo de 22 dígitos y no exige checksum', () => {
    expect(redactQuestion('0000000000000000000000')).toBe('[CBU]');
  });

  it.each(SENSITIVE_FIELDS)('redacta el campo sensible %s en pares y JSON', (field) => {
    expect(redactQuestion(`${field}=valor-sintetico`)).toBe(`${field}=[SECRETO]`);
    expect(redactQuestion(`{"${field}": "valor-sintetico"}`)).toBe(
      `{"${field}": "[SECRETO]"}`,
    );
  });

  it('redacta JWT de tres segmentos y credenciales Bearer', () => {
    const jwt = [
      `eyJ${'a'.repeat(12)}`,
      `eyJ${'b'.repeat(12)}`,
      'c'.repeat(20),
    ].join('.');

    expect(redactQuestion(`JWT ${jwt}.`)).toBe('JWT [SECRETO].');
    expect(redactQuestion('Authorization: Bearer valor.sintetico-123')).toBe(
      'Authorization: [SECRETO]',
    );
  });

  it.each([
    'EAA',
    'sb_secret_',
    'ghp_',
    'github_pat_',
    'xoxb-',
    'AKIA',
    'sk_live_',
    'sk_test_',
    'pk_live_',
    'pk_test_',
  ])('redacta una credencial con el prefijo aprobado %s', (prefix) => {
    expect(redactQuestion(syntheticSecret(prefix))).toBe('[SECRETO]');
  });

  it('no oculta una cadena larga arbitraria sin forma reconocible de credencial', () => {
    const arbitrary = 'Ab0_no_es_una_credencial_'.repeat(3);
    expect(redactQuestion(arbitrary)).toBe(arbitrary);
  });

  it('reutiliza maskExternalAccountId para identificadores act_ largos y cortos', () => {
    const longAccount = `act_cuenta_sintetica_${'12'.repeat(8)}`;

    expect(redactQuestion(`Cuenta ${longAccount}.`)).toBe(
      `Cuenta ${maskExternalAccountId(longAccount)}.`,
    );
    expect(redactQuestion('act_123')).toBe(maskExternalAccountId('act_123'));
  });

  it('prioriza la URL sobre patrones sensibles contenidos en ella', () => {
    const secret = syntheticSecret('sb_secret_');
    const url = `https://persona@example.test/act_123456?access_token=${secret}`;

    expect(redactQuestion(`Revisá ${url}.`)).toBe('Revisá [URL].');
  });

  it('conserva montos, fechas y datos libres no detectables', () => {
    const input =
      'Gasté $ 1.234.567,89 y 4111111111111111,50 el 2026-10-01 y 01/10/2026. ' +
      'DNI 12345678. Ana vive en Calle Falsa.';

    expect(redactQuestion(input)).toBe(input);
  });

  it('no confunde un importe positivo con un teléfono internacional', () => {
    const input = 'El gasto subió +12.345.678,90 pesos.';

    expect(redactQuestion(input)).toBe(input);
    expect(redactQuestion(input)).not.toContain('[TELEFONO]');
  });

  it('redacta todo el texto antes de validar el límite', () => {
    const withUrlAtTheEnd = `${'x'.repeat(490)} https://example.test/${'dato'.repeat(40)}`;

    expect(redactQuestion(withUrlAtTheEnd)).toBe(`${'x'.repeat(490)} [URL]`);
  });

  it('acepta exactamente 500 puntos de código Unicode', () => {
    const atLimit = '😀'.repeat(MAX_REDACTED_QUESTION_LENGTH);

    expect(redactQuestion(atLimit)).toBe(atLimit);
    expect(Array.from(redactQuestion(atLimit))).toHaveLength(500);
  });

  it('rechaza explícitamente un resultado redactado mayor a 500 sin truncarlo', () => {
    const overLimit = `${'x'.repeat(MAX_REDACTED_QUESTION_LENGTH)}Z`;

    expect(() => redactQuestion(overLimit)).toThrow(/500/u);
  });

  it('cuenta puntos de código, no unidades UTF-16, al rechazar el exceso', () => {
    const overLimit = '😀'.repeat(MAX_REDACTED_QUESTION_LENGTH + 1);

    expect(() => redactQuestion(overLimit)).toThrow(/500/u);
  });

  it('admite un máximo configurable sin truncado silencioso', () => {
    expect(redactQuestion('abc', 3)).toBe('abc');
    expect(() => redactQuestion('abcd', 3)).toThrow(/3/u);
  });

  it('rechaza límites configurados inválidos', () => {
    for (const invalid of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => redactQuestion('pregunta', invalid)).toThrow();
    }
  });

  it('mantiene marcadores terminales y produce un resultado determinístico e idempotente', () => {
    const markers =
      '[EMAIL] [TELEFONO] [CUIT] [TARJETA] [CBU] [URL] [SECRETO] …1234';
    const input =
      'persona@example.test +54 9 11 2345-6789 20-12345678-6 ' +
      '4111111111111111 0000000000000000000000 act_1234567890123';
    const first = redactQuestion(input);

    expect(redactQuestion(markers)).toBe(markers);
    expect(redactQuestion(input)).toBe(first);
    expect(redactQuestion(first)).toBe(first);
  });

  it('no escribe la pregunta ni su redacción en consola', () => {
    const spies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
    ];
    try {
      redactQuestion('persona@example.test');
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});
