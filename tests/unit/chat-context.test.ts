import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CHAT_CONTEXT_LIMITS,
  ChatContextValidationError,
  appendSuccessfulChatTurn,
  createChatContext,
  getChatContextTurns,
} from '@/modules/chat/context';

const makeTurn = (index: number) => ({
  questionRedacted: `pregunta-${index}`,
  answerValidated: `respuesta-${index}`,
});

describe('contexto conversacional efímero', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expone límites predeterminados exactos y congelados', () => {
    expect(DEFAULT_CHAT_CONTEXT_LIMITS).toEqual({
      maxTurns: 6,
      maxCodePoints: 12_000,
    });
    expect(Object.isFrozen(DEFAULT_CHAT_CONTEXT_LIMITS)).toBe(true);
  });

  it('crea un contexto vacío e inmutable', () => {
    const context = createChatContext();

    expect(context).toEqual({ turns: [], totalCodePoints: 0 });
    expect(getChatContextTurns(context)).toEqual([]);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.turns)).toBe(true);
  });

  it('agrega un turno exitoso completo', () => {
    const context = appendSuccessfulChatTurn(createChatContext(), {
      questionRedacted: '¿Cuánto se gastó?',
      answerValidated: 'El gasto validado está disponible.',
    });

    expect(getChatContextTurns(context)).toEqual([
      {
        questionRedacted: '¿Cuánto se gastó?',
        answerValidated: 'El gasto validado está disponible.',
      },
    ]);
    expect(context.totalCodePoints).toBe(
      Array.from('¿Cuánto se gastó?El gasto validado está disponible.').length,
    );
  });

  it('conserva el orden de varios turnos', () => {
    const first = appendSuccessfulChatTurn(createChatContext(), makeTurn(1));
    const second = appendSuccessfulChatTurn(first, makeTurn(2));
    const third = appendSuccessfulChatTurn(second, makeTurn(3));

    expect(getChatContextTurns(third)).toEqual([makeTurn(1), makeTurn(2), makeTurn(3)]);
  });

  it('devuelve una instantánea nueva sin mutar el contexto anterior', () => {
    const empty = createChatContext();
    const first = appendSuccessfulChatTurn(empty, makeTurn(1));
    const second = appendSuccessfulChatTurn(first, makeTurn(2));

    expect(empty).toEqual({ turns: [], totalCodePoints: 0 });
    expect(getChatContextTurns(first)).toEqual([makeTurn(1)]);
    expect(getChatContextTurns(second)).toEqual([makeTurn(1), makeTurn(2)]);
    expect(second).not.toBe(first);
  });

  it('acepta exactamente seis turnos', () => {
    const context = createChatContext(Array.from({ length: 6 }, (_, index) => makeTurn(index)));

    expect(getChatContextTurns(context)).toHaveLength(6);
    expect(getChatContextTurns(context)[0]).toEqual(makeTurn(0));
  });

  it('al agregar el séptimo elimina el primer turno completo', () => {
    const sixTurns = createChatContext(
      Array.from({ length: 6 }, (_, index) => makeTurn(index)),
    );
    const sevenTurns = appendSuccessfulChatTurn(sixTurns, makeTurn(6));

    expect(getChatContextTurns(sevenTurns)).toEqual(
      Array.from({ length: 6 }, (_, index) => makeTurn(index + 1)),
    );
    expect(getChatContextTurns(sixTurns)[0]).toEqual(makeTurn(0));
  });

  it('acepta exactamente 12.000 puntos de código agregados', () => {
    const context = createChatContext([
      {
        questionRedacted: 'p'.repeat(6_000),
        answerValidated: 'r'.repeat(6_000),
      },
    ]);

    expect(context.totalCodePoints).toBe(12_000);
    expect(getChatContextTurns(context)).toHaveLength(1);
  });

  it('descarta turnos completos antiguos al superar el presupuesto agregado', () => {
    const limits = { maxTurns: 6, maxCodePoints: 10 };
    const before = createChatContext(
      [
        { questionRedacted: 'aa', answerValidated: 'bb' },
        { questionRedacted: 'ccc', answerValidated: 'ddd' },
      ],
      limits,
    );
    const after = appendSuccessfulChatTurn(
      before,
      { questionRedacted: 'ee', answerValidated: 'ff' },
      limits,
    );

    expect(getChatContextTurns(before)).toHaveLength(2);
    expect(getChatContextTurns(after)).toEqual([
      { questionRedacted: 'ccc', answerValidated: 'ddd' },
      { questionRedacted: 'ee', answerValidated: 'ff' },
    ]);
    expect(after.totalCodePoints).toBe(10);
  });

  it('cuenta puntos de código Unicode y no unidades UTF-16', () => {
    const context = createChatContext(
      [{ questionRedacted: '👍', answerValidated: '🧠' }],
      { maxTurns: 1, maxCodePoints: 2 },
    );

    expect(context.totalCodePoints).toBe(2);
  });

  it('rechaza un turno individual que supera el presupuesto sin alterar el contexto', () => {
    const limits = { maxTurns: 2, maxCodePoints: 4 };
    const context = createChatContext([], limits);

    expect(() =>
      appendSuccessfulChatTurn(
        context,
        { questionRedacted: 'tres', answerValidated: 'dos' },
        limits,
      ),
    ).toThrow(ChatContextValidationError);
    expect(context).toEqual({ turns: [], totalCodePoints: 0 });
  });

  it.each([
    { questionRedacted: '', answerValidated: 'respuesta' },
    { questionRedacted: '   ', answerValidated: 'respuesta' },
    { questionRedacted: 'pregunta', answerValidated: '' },
    { questionRedacted: 'pregunta', answerValidated: '\n\t' },
  ])('rechaza preguntas o respuestas vacías: %o', (turn) => {
    expect(() => appendSuccessfulChatTurn(createChatContext(), turn)).toThrow(
      ChatContextValidationError,
    );
  });

  it.each([
    { questionRedacted: 'pregunta', answerValidated: 'respuesta', role: 'system' },
    { questionRedacted: 'pregunta', answerValidated: 'respuesta', outcome: 'answered' },
    { questionRedacted: 'pregunta', answerValidated: 'respuesta', company_id: 'empresa' },
    { questionRedacted: 'pregunta', answerValidated: 'respuesta', connection_id: 'conexión' },
    { questionRedacted: 'pregunta', answerValidated: 'respuesta', sql: 'select' },
  ])('rechaza campos adicionales: %o', (turn) => {
    expect(() => appendSuccessfulChatTurn(createChatContext(), turn)).toThrow(
      ChatContextValidationError,
    );
  });

  it.each([
    { maxTurns: 0, maxCodePoints: 10 },
    { maxTurns: 1.5, maxCodePoints: 10 },
    { maxTurns: 1, maxCodePoints: 0 },
    { maxTurns: 1, maxCodePoints: Number.NaN },
    { maxTurns: 1, maxCodePoints: 10, extra: true },
  ])('rechaza límites inválidos o con campos adicionales: %o', (limits) => {
    expect(() => createChatContext([], limits)).toThrow(ChatContextValidationError);
  });

  it('lee cada límite una sola vez y opera con una copia estable', () => {
    let maxTurnsReads = 0;
    let maxCodePointsReads = 0;
    const limits = Object.defineProperties(
      {},
      {
        maxTurns: {
          enumerable: true,
          get: () => {
            maxTurnsReads += 1;
            return maxTurnsReads === 1 ? 2 : 0;
          },
        },
        maxCodePoints: {
          enumerable: true,
          get: () => {
            maxCodePointsReads += 1;
            return maxCodePointsReads === 1 ? 100 : 0;
          },
        },
      },
    ) as { maxTurns: number; maxCodePoints: number };

    const context = createChatContext([makeTurn(1), makeTurn(2)], limits);

    expect(maxTurnsReads).toBe(1);
    expect(maxCodePointsReads).toBe(1);
    expect(getChatContextTurns(context)).toHaveLength(2);
  });

  it.each([
    null,
    { turns: 'no-es-un-array', totalCodePoints: 0 },
    { turns: [makeTurn(1)], totalCodePoints: 999 },
    { turns: [makeTurn(1)], totalCodePoints: 20, company_id: 'empresa' },
    {
      turns: [{ ...makeTurn(1), role: 'system' }],
      totalCodePoints: 20,
    },
  ])('rechaza snapshots inválidos o manipulados: %o', (context) => {
    expect(() => appendSuccessfulChatTurn(context as never, makeTurn(2))).toThrow(
      ChatContextValidationError,
    );
  });

  it('rechaza un snapshot cuyo array fue manipulado sin actualizar el total', () => {
    const valid = createChatContext([makeTurn(1)]);
    const manipulated = {
      turns: [...valid.turns, makeTurn(2)],
      totalCodePoints: valid.totalCodePoints,
    };

    expect(() => appendSuccessfulChatTurn(manipulated, makeTurn(3))).toThrow(
      ChatContextValidationError,
    );
  });

  it('copia y congela los turnos recibidos', () => {
    const original = makeTurn(1);
    const initialTurns = [original];
    const context = createChatContext(initialTurns);

    original.questionRedacted = 'modificada';
    original.answerValidated = 'modificada';
    initialTurns.push(makeTurn(2));

    expect(getChatContextTurns(context)).toEqual([makeTurn(1)]);
    expect(Object.isFrozen(context.turns[0])).toBe(true);
  });

  it('copia defensivamente el turno agregado', () => {
    const original = makeTurn(1);
    const context = appendSuccessfulChatTurn(createChatContext(), original);

    original.questionRedacted = 'modificada';
    original.answerValidated = 'modificada';

    expect(getChatContextTurns(context)).toEqual([makeTurn(1)]);
  });

  it('mantiene aisladas dos instancias sin estado global compartido', () => {
    const first = createChatContext();
    const second = createChatContext();
    const updatedFirst = appendSuccessfulChatTurn(first, makeTurn(1));

    expect(getChatContextTurns(updatedFirst)).toEqual([makeTurn(1)]);
    expect(getChatContextTurns(first)).toEqual([]);
    expect(getChatContextTurns(second)).toEqual([]);
  });

  it('no escribe contenido ni errores en la consola', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const context = appendSuccessfulChatTurn(createChatContext(), makeTurn(1));
    const turnWithSql = { ...makeTurn(2), sql: 'select' };
    getChatContextTurns(context);
    expect(() => appendSuccessfulChatTurn(context, turnWithSql)).toThrow(
      ChatContextValidationError,
    );

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
