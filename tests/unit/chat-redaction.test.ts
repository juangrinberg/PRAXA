import { describe, expect, it, vi } from 'vitest';

import { maskExternalAccountId } from '@/modules/integrations/contract';
import { redactQuestion } from '@/modules/chat/redaction';

describe('M25a.1: redacción de preguntas (CA-66)', () => {
  it.each([
    ['Escribí a persona@example.test.', 'Escribí a [EMAIL].'],
    ['Teléfono +54 9 11 2345-6789.', 'Teléfono [TELEFONO].'],
    ['CUIT 20-12345678-6 y CUIL 27-12345678-0.', 'CUIT [CUIT] y CUIL [CUIT].'],
    ['Tarjeta 4111 1111 1111 1111.', 'Tarjeta [TARJETA].'],
    ['Tarjeta 4111-1111-1111-1111.', 'Tarjeta [TARJETA].'],
    ['Tarjeta 4111111111111112.', 'Tarjeta 4111111111111112.'],
    ['CBU 0000000000000000000000.', 'CBU [CBU].'],
    ['Revisá https://example.test/informe?dato=123.', 'Revisá [URL].'],
    ['URL https://example.test/persona@example.test.', 'URL [URL].'],
    ['Gasté $ 1.234.567,89 el 2026-10-01 y 01/10/2026.', 'Gasté $ 1.234.567,89 el 2026-10-01 y 01/10/2026.'],
    ['Importe 4111111111111111,50.', 'Importe 4111111111111111,50.'],
    ['DNI 12345678. Ana vive en Calle Falsa.', 'DNI 12345678. Ana vive en Calle Falsa.'],
    ['Palabra extraordinariamenteincomprensible.', 'Palabra extraordinariamenteincomprensible.'],
  ])('redacta solo los patrones previstos: %s', (input, expected) => {
    expect(redactQuestion(input)).toBe(expected);
  });

  // Muestras ficticias construidas en ejecución, como no-secrets-in-tree.test.ts.
  // No se almacena ningún literal con el formato completo de una credencial.
  it.each([
    () => ['sk', 'test', 'ejemplo-no-real'.repeat(3)].join('_'),
    () => ['sb', 'secret', 'ejemplo-no-real'.repeat(3)].join('_'),
    () => 'EA' + 'A' + 'falso0'.repeat(8),
    () => ['eyJ' + 'x'.repeat(12), 'eyJ' + 'y'.repeat(12), 'z'.repeat(20)].join('.'),
    () => 'Ab0_no_es_una_credencial_'.repeat(3),
  ])('reemplaza una cadena con forma de secreto sin consumir el punto', (secret) => {
    expect(redactQuestion(`La clave es ${secret()}.`)).toBe('La clave es [SECRETO].');
  });

  it('reutiliza el truncado de cuentas, también cuando el identificador es largo', () => {
    const account = 'act_cuenta_sintetica_'.repeat(3) + '0123';
    expect(redactQuestion(`Cuenta ${account}.`)).toBe(`Cuenta ${maskExternalAccountId(account)}.`);
    expect(redactQuestion('act_123')).toBe(maskExternalAccountId('act_123'));
  });

  it('redacta antes de truncar, para no conservar parte de un secreto', () => {
    const input = 'x'.repeat(490) + ' https://example.test/' + 'dato'.repeat(40);
    expect(redactQuestion(input)).toBe('x'.repeat(490) + ' [URL]');
  });

  it('limita a 500 caracteres y permite un límite explícito del servidor', () => {
    expect(redactQuestion('a'.repeat(600))).toHaveLength(500);
    expect(redactQuestion('abcdef', 3)).toBe('abc');
    expect(Array.from(redactQuestion('😀'.repeat(600)))).toHaveLength(500);
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rechaza un límite inválido: %s', (limit) => {
    expect(() => redactQuestion('pregunta', limit)).toThrow();
  });

  it('es idempotente incluso si el truncado crea un nuevo candidato', () => {
    const inputs = [
      'persona@example.test +54 9 11 2345-6789 20-12345678-6 act_1234567890123',
      'https://example.test/4111111111111111. 0000000000000000000000',
      'x '.repeat(242) + '4111111111111111X',
    ];
    for (const input of inputs) {
      const result = redactQuestion(input);
      expect(redactQuestion(result)).toBe(result);
    }
  });

  it('no registra la pregunta ni la redacción', () => {
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
    try {
      redactQuestion('persona@example.test');
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});
