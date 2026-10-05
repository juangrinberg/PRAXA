import { describe, expect, it } from 'vitest';

import { redactQuestion } from '@/modules/chat/redaction';

describe('redactQuestion — CA-66', () => {
  it('reemplaza emails por [EMAIL]', () => {
    const result = redactQuestion('¿Cuánto vendió juan.grinberg@empresa.com.ar ayer?');

    expect(result).toBe('¿Cuánto vendió [EMAIL] ayer?');
  });

  it('reemplaza teléfonos internacionales por [TELEFONO]', () => {
    const result = redactQuestion('Llamame al +54 9 11 5555-1234 por favor.');

    expect(result).toBe('Llamame al [TELEFONO] por favor.');
  });

  it('reemplaza CUIT y CUIL con guiones por [CUIT]', () => {
    const result = redactQuestion('El CUIT es 20-12345678-3 y el CUIL es 27-87654321-4.');

    expect(result).toBe('El CUIT es [CUIT] y el CUIL es [CUIT].');
  });

  it('reemplaza tarjetas que pasan el algoritmo de Luhn por [TARJETA]', () => {
    const result = redactQuestion('La tarjeta utilizada fue 4111 1111 1111 1111.');

    expect(result).toBe('La tarjeta utilizada fue [TARJETA].');
  });

  it('no reemplaza una secuencia de tarjeta que no pasa Luhn', () => {
    const result = redactQuestion('El código de prueba es 4111 1111 1111 1112.');

    expect(result).toBe('El código de prueba es 4111 1111 1111 1112.');
  });

  it('reemplaza CBU y CVU de 22 dígitos por [CBU]', () => {
    const result = redactQuestion(
      'CBU: 2850590940090418135201; CVU: 0000003100012345678901.',
    );

    expect(result).toBe('CBU: [CBU]; CVU: [CBU].');
  });

  it('reemplaza URLs por [URL]', () => {
    const result = redactQuestion('Revisá https://empresa.example.com/panel?token=secreto.');

    expect(result).toBe('Revisá [URL].');
  });

  it('reemplaza cadenas largas con forma de secreto por [SECRETO]', () => {
    const result = redactQuestion(
      'La clave es stripe_test_value_123456',
    );

    expect(result).toBe('La clave es [SECRETO].');
  });

  it('trunca identificadores act_ conservando solo una parte no sensible', () => {
    const result = redactQuestion('La cuenta es act_1234567890ABCDEF.');

    expect(result).toBe('La cuenta es …CDEF.');
  });

  it('conserva montos argentinos y fechas', () => {
    const result = redactQuestion('El 15/09/2026 gastamos $1.234.567,89 en publicidad.');

    expect(result).toBe('El 15/09/2026 gastamos $1.234.567,89 en publicidad.');
  });

  it('es idempotente', () => {
    const question =
      'Contactá a juan@empresa.com, revisá https://empresa.example.com y la cuenta act_1234567890.';

    const once = redactQuestion(question);
    const twice = redactQuestion(once);

    expect(twice).toBe(once);
  });

  it('limita la salida a 500 caracteres', () => {
    const question = `${'a'.repeat(600)} juan@empresa.com`;

    const result = redactQuestion(question);

    expect(result).toHaveLength(500);
    expect(result).not.toContain('juan@empresa.com');
  });
});
