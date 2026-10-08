import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/modules/tenant/context', () => ({
  requireTenantContext: mocks.requireTenantContext,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock('server-only', () => ({}));

import { executeChatTool } from '@/modules/chat/tools/execute';

describe('executeChatTool — connection_status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta conexiones usando el company_id del tenant', async () => {
    const companyId = 'c0a00000-0000-4000-8000-000000000001';

    const eq = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    mocks.requireTenantContext.mockResolvedValue({
      user_id: 'a0000000-0000-4000-8000-000000000001',
      company_id: companyId,
      role: 'owner',
      request_id: 'b0000000-0000-4000-8000-000000000001',
    });

    mocks.createSupabaseServerClient.mockResolvedValue({ from });

    const result = await executeChatTool({
      name: 'connection_status',
      arguments: {},
    });

    expect(from).toHaveBeenCalledWith('integration_connections');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('company_id', companyId);
    expect(result).toEqual({
      name: 'connection_status',
      data: {
        connections: [],
      },
    });
  });

  it('oculta el detalle interno si Supabase devuelve un error', async () => {
    const companyId = 'c0a00000-0000-4000-8000-000000000001';

    const eq = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'detalle interno de prueba' },
    });

    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    mocks.requireTenantContext.mockResolvedValue({
      user_id: 'a0000000-0000-4000-8000-000000000001',
      company_id: companyId,
      role: 'owner',
      request_id: 'b0000000-0000-4000-8000-000000000001',
    });

    mocks.createSupabaseServerClient.mockResolvedValue({ from });

    await expect(
      executeChatTool({
        name: 'connection_status',
        arguments: {},
      }),
    ).rejects.toThrow(
      'No se pudo consultar el estado de las conexiones.',
    );
  });

  it('rechaza tools que todavía no tienen ejecución', async () => {
    await expect(
      executeChatTool({
        name: 'total',
        arguments: {
          metric: 'spend',
          period: {
            from: '2026-01-01',
            to: '2026-01-01',
          },
        },
      }),
    ).rejects.toThrow('todavía no está implementada');
  });  it('convierte el registro interno a DTO sin filtrar datos sensibles', async () => {
    const companyId = 'c0a00000-0000-4000-8000-000000000001';

    const row = {
      id: 'd0a00000-0000-4000-8000-000000000001',
      company_id: companyId,
      provider: 'meta',
      status: 'active',
      external_account_id: 'cuenta_sintetica_0123',
      client_business_id: 'negocio_sintetico_01',
      currency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
      credential_generation: 1,
      pending_expires_at: null,
      purge_requested_at: null,
      current_sync_run_id: null,
      last_error_class: null,
      last_error_message: null,
      created_at: '2026-10-08T12:00:00.000Z',
      updated_at: '2026-10-08T12:00:00.000Z',
    };

    const eq = vi.fn().mockResolvedValue({
      data: [row],
      error: null,
    });

    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    mocks.requireTenantContext.mockResolvedValue({
      user_id: 'a0000000-0000-4000-8000-000000000001',
      company_id: companyId,
      role: 'owner',
      request_id: 'b0000000-0000-4000-8000-000000000001',
    });

    mocks.createSupabaseServerClient.mockResolvedValue({ from });

    const result = await executeChatTool({
      name: 'connection_status',
      arguments: {},
    });

    expect(result).toEqual({
      name: 'connection_status',
      data: {
        connections: [
          {
            id: row.id,
            provider: 'meta',
            status: 'active',
            external_account_id_masked: '…0123',
            currency: 'ARS',
            timezone: 'America/Argentina/Buenos_Aires',
            pending_expires_at: null,
            last_error: null,
          },
        ],
      },
    });

    expect(JSON.stringify(result)).not.toContain(companyId);
    expect(JSON.stringify(result)).not.toContain(row.external_account_id);
    expect(JSON.stringify(result)).not.toContain(row.client_business_id);
  });
  
});