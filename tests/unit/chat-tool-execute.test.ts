import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { maskExternalAccountId, type IntegrationConnectionRecord } from '@/modules/integrations/contract';
import type { TenantContext } from '@/modules/tenant/context';
import { createChatTurnBudget } from '@/modules/chat/limits';
import { executeConnectionStatus } from '@/modules/chat/tools/execute';
import { connectionStatusResultSchema } from '@/modules/chat/tools/results';

const context: TenantContext = {
  user_id: 'aaaaaaaa-0000-4000-8000-000000000001',
  company_id: 'bbbbbbbb-0000-4000-8000-000000000001',
  request_id: 'dddddddd-0000-4000-8000-000000000001', role: 'owner',
};
const account = 'act_cuenta_sintetica_0123';
const active: IntegrationConnectionRecord = {
  id: 'cccccccc-0000-4000-8000-000000000001', company_id: context.company_id,
  provider: 'meta', status: 'active', external_account_id: account,
  client_business_id: 'negocio_sintetico', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires',
  credential_generation: 3, current_sync_run_id: null, last_error_class: null, last_error_message: null,
  pending_expires_at: null, purge_requested_at: null,
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
};

function fakeSupabase(row: unknown = active, error: unknown = null) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
  };
  const client = { from: vi.fn(() => query) };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  return { query, client };
}

describe('M25a.1: connection_status con el repositorio existente (CA-49)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa el cliente de sesión y filtra por la empresa del contexto del servidor', async () => {
    const { query, client } = fakeSupabase();
    const result = await executeConnectionStatus(context, createChatTurnBudget());
    expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith('integration_connections');
    expect(query.eq).toHaveBeenCalledWith('company_id', context.company_id);
    expect(query.eq).toHaveBeenCalledWith('provider', 'meta');
    expect(query.in).toHaveBeenCalledWith('status', ['pending_selection', 'active', 'needs_reauth']);
    expect(connectionStatusResultSchema.safeParse(result).success).toBe(true);
    expect(result.data).toMatchObject({ known: true, value: {
      status: 'active', external_account_id_masked: maskExternalAccountId(account),
    } });
  });

  it('devuelve solo el DTO público, sin identificadores internos ni generación', async () => {
    fakeSupabase();
    const result = await executeConnectionStatus(context, createChatTurnBudget());
    const text = JSON.stringify(result);
    for (const hidden of [account, context.company_id, context.user_id, 'negocio_sintetico',
      'credential_generation', 'current_sync_run_id', 'created_at', 'updated_at']) {
      expect(text).not.toContain(hidden);
    }
    expect(result.name).toBe('connection_status');
  });

  it('sin conexión declara ausencia; no inventa una conexión activa', async () => {
    fakeSupabase(null);
    const result = await executeConnectionStatus(context, createChatTurnBudget());
    expect(result.data).toEqual({ known: false, reason: 'integration_missing' });
  });

  it.each(['pending_selection', 'needs_reauth'] as const)('conserva el estado real %s', async (status) => {
    fakeSupabase(status === 'pending_selection' ? {
      ...active, status, external_account_id: null, currency: null, timezone: null,
      pending_expires_at: '2030-01-01T00:00:00Z',
    } : { ...active, status, last_error_class: 'permission', last_error_message: 'Falta autorización.' });
    const result = await executeConnectionStatus(context, createChatTurnBudget());
    expect(result.data).toMatchObject({ known: true, value: { status } });
  });

  it('rechaza una fila ajena incluso si el transporte ignora el filtro', async () => {
    fakeSupabase({ ...active, company_id: 'bbbbbbbb-0000-4000-8000-000000000002' });
    await expect(executeConnectionStatus(context, createChatTurnBudget())).rejects.toThrow('No se pudo consultar el estado de la conexión.');
  });

  it('rechaza un contexto inválido antes de consultar Supabase', async () => {
    const { client } = fakeSupabase();
    await expect(executeConnectionStatus({ ...context, company_id: 'invalido' }, createChatTurnBudget())).rejects.toThrow();
    expect(client.from).not.toHaveBeenCalled();
  });

  it.each(['error', 'throw', 'malformed'])('oculta los detalles internos de un fallo %s', async (failure) => {
    const { query } = fakeSupabase(failure === 'malformed' ? { status: 'invento' } : active,
      failure === 'error' ? { message: 'detalle-sensible-sintetico' } : null);
    if (failure === 'throw') query.maybeSingle.mockRejectedValue(new Error('detalle-sensible-sintetico'));
    await expect(executeConnectionStatus(context, createChatTurnBudget())).rejects.toMatchObject({
      name: 'ChatToolError', message: 'No se pudo consultar el estado de la conexión.',
    });
  });

  it('asigna referencias distintas a las ejecuciones del turno', async () => {
    fakeSupabase();
    const budget = createChatTurnBudget();
    const a = await executeConnectionStatus(context, budget);
    const b = await executeConnectionStatus(context, budget);
    expect(a.tool_call_id).not.toBe(b.tool_call_id);
  });

  it('aplica el límite antes de abrir la quinta consulta', async () => {
    const { query } = fakeSupabase();
    const budget = createChatTurnBudget();
    for (let n = 0; n < 4; n += 1) await executeConnectionStatus(context, budget);
    await expect(executeConnectionStatus(context, budget)).rejects.toMatchObject({ code: 'tool_call_limit' });
    expect(query.maybeSingle).toHaveBeenCalledTimes(4);
  });
});
