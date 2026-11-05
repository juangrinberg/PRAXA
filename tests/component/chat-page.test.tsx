import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const contextCalls = vi.hoisted(() => ({
  created: [] as unknown[],
  appended: [] as Array<{ before: unknown; message: unknown; after: unknown }>,
}));

vi.mock('@/modules/chat/context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/chat/context')>();

  return {
    ...actual,
    createChatContext(...args: Parameters<typeof actual.createChatContext>) {
      const context = actual.createChatContext(...args);
      contextCalls.created.push(context);
      return context;
    },
    appendChatContextMessage(...args: Parameters<typeof actual.appendChatContextMessage>) {
      const after = actual.appendChatContextMessage(...args);
      contextCalls.appended.push({ before: args[0], message: args[1], after });
      return after;
    },
  };
});

import { Chat } from '@/components/app/chat';
import {
  DEFAULT_CHAT_CONTEXT_LIMITS,
  getChatContextMessages,
  type ChatContext,
} from '@/modules/chat/context';

const messagesOf = (context: unknown) => getChatContextMessages(context as ChatContext);

describe('integración efímera del contexto en Chat', () => {
  beforeEach(() => {
    contextCalls.created.length = 0;
    contextCalls.appended.length = 0;
  });

  it('incorpora una pregunta válida al contexto como mensaje del usuario', async () => {
    const user = userEvent.setup();
    render(<Chat iniciales="GM" conectadas={[]} />);

    await user.type(screen.getByRole('textbox', { name: 'Tu pregunta' }), 'Hola{Enter}');

    expect(contextCalls.created).toHaveLength(1);
    expect(contextCalls.appended).toHaveLength(1);
    expect(contextCalls.appended[0].before).toBe(contextCalls.created[0]);
    expect(contextCalls.appended[0].message).toEqual({ role: 'user', content: 'Hola' });
    expect(messagesOf(contextCalls.appended[0].after)).toEqual([
      { role: 'user', content: 'Hola' },
    ]);
  });

  it('usa el contexto actualizado en los envíos sucesivos', async () => {
    const user = userEvent.setup();
    render(<Chat iniciales="GM" conectadas={[]} />);
    const input = screen.getByRole('textbox', { name: 'Tu pregunta' });

    await user.type(input, 'primera{Enter}');
    await user.type(input, 'segunda{Enter}');

    expect(contextCalls.appended).toHaveLength(2);
    expect(contextCalls.appended[1].before).toBe(contextCalls.appended[0].after);
    expect(messagesOf(contextCalls.appended[1].after)).toEqual([
      { role: 'user', content: 'primera' },
      { role: 'user', content: 'segunda' },
    ]);
  });

  it('mantiene contextos independientes para dos instancias de Chat', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Chat iniciales="AA" conectadas={[]} />
        <Chat iniciales="BB" conectadas={[]} />
      </>,
    );
    const [firstInput] = screen.getAllByRole('textbox', { name: 'Tu pregunta' });

    await user.type(firstInput, 'solo en A{Enter}');

    expect(contextCalls.created).toHaveLength(2);
    expect(contextCalls.created[0]).not.toBe(contextCalls.created[1]);
    expect(contextCalls.appended[0].before).toBe(contextCalls.created[0]);
    expect(messagesOf(contextCalls.created[1])).toEqual([]);
  });

  it('reinicia el contexto al desmontar y volver a montar el componente', async () => {
    const user = userEvent.setup();
    const first = render(<Chat iniciales="GM" conectadas={[]} />);

    await user.type(screen.getByRole('textbox', { name: 'Tu pregunta' }), 'anterior{Enter}');
    const previousContext = contextCalls.appended[0].after;
    first.unmount();

    render(<Chat iniciales="GM" conectadas={[]} />);
    expect(screen.queryByRole('log', { name: 'Conversación' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Tu pregunta' }), 'nueva{Enter}');

    expect(contextCalls.created).toHaveLength(2);
    expect(contextCalls.created[1]).not.toBe(previousContext);
    expect(contextCalls.appended[1].before).toBe(contextCalls.created[1]);
    expect(messagesOf(contextCalls.appended[1].after)).toEqual([
      { role: 'user', content: 'nueva' },
    ]);
  });

  it('conserva el historial visual aunque el contexto descarte los mensajes más antiguos', () => {
    render(<Chat iniciales="GM" conectadas={[]} />);
    const input = screen.getByRole('textbox', { name: 'Tu pregunta' });
    const form = input.closest('form');
    const latestText = `mensaje ${String(DEFAULT_CHAT_CONTEXT_LIMITS.maxMessages + 1).padStart(2, '0')}`;
    expect(form).not.toBeNull();

    for (let index = 1; index <= DEFAULT_CHAT_CONTEXT_LIMITS.maxMessages + 1; index += 1) {
      const text = `mensaje ${String(index).padStart(2, '0')}`;
      fireEvent.change(input, { target: { value: text } });
      fireEvent.submit(form!);
    }

    const latestContext = contextCalls.appended.at(-1)?.after;
    expect(messagesOf(latestContext)).toHaveLength(DEFAULT_CHAT_CONTEXT_LIMITS.maxMessages);
    expect(messagesOf(latestContext)[0]).toEqual({ role: 'user', content: 'mensaje 02' });
    expect(screen.getByText('mensaje 01')).toBeInTheDocument();
    expect(screen.getByText(latestText)).toBeInTheDocument();
  });

  it('toma el límite individual de caracteres de la configuración centralizada', () => {
    render(<Chat iniciales="GM" conectadas={[]} />);

    expect(screen.getByRole('textbox', { name: 'Tu pregunta' })).toHaveAttribute(
      'maxLength',
      String(DEFAULT_CHAT_CONTEXT_LIMITS.maxCharacters),
    );
  });

  it('mantiene Enter, Shift+Enter y el descarte de entradas vacías', async () => {
    const user = userEvent.setup();
    render(<Chat iniciales="GM" conectadas={[]} />);
    const input = screen.getByRole('textbox', { name: 'Tu pregunta' });

    await user.type(input, 'uno{Shift>}{Enter}{/Shift}dos');
    expect(input).toHaveValue('uno\ndos');
    expect(contextCalls.appended).toHaveLength(0);

    await user.type(input, '{Enter}');
    expect(contextCalls.appended[0].message).toEqual({ role: 'user', content: 'uno\ndos' });
    expect(input).toHaveValue('');

    await user.type(input, '   {Enter}');
    expect(contextCalls.appended).toHaveLength(1);
  });
});
