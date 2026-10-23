import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { executeConnectionStatus } from '@/modules/chat/tools/execute';
import { createChatTurnBudget } from '@/modules/chat/limits';
import { createWorkerApi } from '@/modules/integrations/db/worker-api';
import { confirmConnection } from '@/modules/integrations/repository/lifecycle-calls';
import type { TenantContext } from '@/modules/tenant/context';
import { resolveIntegrationsTestTarget } from '../../scripts/lib/sql-target.mjs';
import { blockedReason, cleanupRun, createConfirmedUser, pendingCleanupCount,
  remoteProjectReachable, RUN_ID, type TestUser } from './helpers';

type Company = { user: TestUser; ctx: TenantContext; connectionId: string };

/** CA-49/54: cliente autenticado real; el rol privilegiado solo prepara los fixtures. */
describe('M25a.1 parcial: connection_status por la Data API del proyecto desechable', () => {
  let worker: ReturnType<typeof createWorkerApi> | undefined;
  let alice: Company;
  let bob: Company;

  beforeAll(async () => {
    // CB-06: configuración faltante hace fallar la suite, no acredita aislamiento.
    const target = resolveIntegrationsTestTarget(process.env);
    if (!target.ok) throw new Error(target.problems?.join(' ') ?? 'Destino de pruebas inválido.');
    const blocked = blockedReason();
    if (blocked) throw new Error(blocked);
    if (!(await remoteProjectReachable())) throw new Error('El proyecto de pruebas no responde.');
    worker = createWorkerApi({ connectionString: target.connectionString });

    async function company(label: string): Promise<Company> {
      const user = await createConfirmedUser(`chat-${label}`);
      const { data, error } = await user.client.rpc('create_company_for_current_user', {
        p_name: `Chat sintético ${RUN_ID} ${label}`,
      }).single<{ id: string }>();
      if (error || !data) throw new Error('No se pudo crear la empresa sintética del chat.');
      const ctx: TenantContext = { user_id: user.id, company_id: data.id, role: 'owner', request_id: randomUUID() };
      const connectionId = randomUUID();
      await worker!.call('create_pending_connection', [ctx.user_id, ctx.company_id, connectionId,
        'negocio_sintetico', 'AAAA', 'AAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAA==',
        1, 'system_user', 'app_sintetica', ['ads_read'], null]);
      await confirmConnection(ctx, { connectionId, externalAccountId: `act_sintetica_${label}_0123`,
        currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires' }, { workerApi: worker });
      return { user, ctx, connectionId };
    }
    alice = await company('alice');
    bob = await company('bob');
  });

  afterAll(async () => {
    try { await worker?.end(); }
    finally { await cleanupRun(); expect(pendingCleanupCount()).toBe(0); }
  });

  it('lee su conexión por JWT/RLS y devuelve la cuenta truncada', async () => {
    const result = await executeConnectionStatus(alice.ctx, createChatTurnBudget(), { supabase: alice.user.client });
    expect(result.data).toMatchObject({ known: true, value: {
      id: alice.connectionId, status: 'active', external_account_id_masked: '…0123',
    } });
    expect(JSON.stringify(result)).not.toContain('act_sintetica');
    expect(JSON.stringify(result)).not.toContain(alice.ctx.company_id);
  });

  it('un contexto de otra empresa no vence el RLS del JWT de Alice', async () => {
    const result = await executeConnectionStatus(bob.ctx, createChatTurnBudget(), { supabase: alice.user.client });
    expect(result.data).toEqual({ known: false, reason: 'integration_missing' });
  });

  it('Bob lee su propia conexión; la prueba de aislamiento no pasa por ausencia de filas', async () => {
    const result = await executeConnectionStatus(bob.ctx, createChatTurnBudget(), { supabase: bob.user.client });
    expect(result.data).toMatchObject({ known: true, value: { id: bob.connectionId } });
  });
});
