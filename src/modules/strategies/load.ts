import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadMetaAnomalyResultForResolvedSync, type ResolvedMetaAnomalyInput } from '@/modules/anomalies/load';
import {
  readAccountMetrics,
  readAllEntities,
  readDiagnosticSettings,
  supabaseRpc,
  windowsFor,
  type AccountMetricsRow,
  type DiagnosticSettings,
  type DiagnosticWindow,
  type EntityMetricsRow,
} from '@/modules/diagnostics';
import type { IntegrationConnectionRecord } from '@/modules/integrations/contract';
import { readMetaSyncStatus, type MetaSyncStatus } from '@/modules/integrations/meta/insights';
import { readConnectionRecord } from '@/modules/integrations/repository/connections';
import { requireTenantContext, type TenantContext } from '@/modules/tenant/context';

import { strategyInputSchema, type MetaStrategyView, type StrategyLoadErrorCode } from './contract';
import { runMetaStrategyEngine } from './engine';

export type MetaStrategyLoadDeps = Readonly<{
  tenant: () => Promise<TenantContext>;
  readConnection: (ctx: TenantContext) => Promise<IntegrationConnectionRecord | null>;
  readStatus: (connectionId: string) => Promise<MetaSyncStatus | null>;
  loadAnomalies: (input: ResolvedMetaAnomalyInput) => ReturnType<typeof loadMetaAnomalyResultForResolvedSync>;
  readSettings: (ctx: TenantContext) => Promise<DiagnosticSettings | null>;
  readAccountMetrics: (args: { connectionId: string; window: DiagnosticWindow; metricRef: string }) =>
    Promise<{ current: AccountMetricsRow; previous: AccountMetricsRow | null }>;
  readCampaignMetrics: (args: { connectionId: string; window: DiagnosticWindow; metricRef: string }) =>
    Promise<{ rows: EntityMetricsRow[]; pages: number }>;
  now: () => Date;
}>;

function defaultDeps(): MetaStrategyLoadDeps {
  let clientPromise: Promise<SupabaseClient> | null = null;
  const client = () => clientPromise ??= createSupabaseServerClient();
  return {
    tenant: requireTenantContext,
    readConnection: readConnectionRecord,
    readStatus: readMetaSyncStatus,
    loadAnomalies: loadMetaAnomalyResultForResolvedSync,
    readSettings: async (ctx) => readDiagnosticSettings(await client(), ctx.company_id),
    readAccountMetrics: async (args) => readAccountMetrics(supabaseRpc(await client()), args),
    readCampaignMetrics: async (args) => readAllEntities(supabaseRpc(await client()), {
      ...args, level: 'campaign', comparison: true,
    }),
    now: () => new Date(),
  };
}

async function closed<T>(code: StrategyLoadErrorCode, operation: () => Promise<T>):
  Promise<{ ok: true; value: T } | { ok: false; view: MetaStrategyView }> {
  try {
    return { ok: true, value: await operation() };
  } catch {
    return { ok: false, view: { state: 'unavailable', reason: code } };
  }
}

export async function loadMetaStrategyView(
  options: Readonly<{ mode: 'real' | 'synthetic_demo' }>,
  injected: Partial<MetaStrategyLoadDeps> = {},
): Promise<MetaStrategyView> {
  // El fixture se agrega en la etapa de interfaz. Este retorno sigue siendo cerrado y, sobre
  // todo, ocurre antes de construir K01 o cualquier dependencia real.
  if (options.mode === 'synthetic_demo') return { state: 'unavailable', reason: 'invalid_dependency_payload' };
  const deps = { ...defaultDeps(), ...injected };

  const tenant = await closed('tenant_unavailable', deps.tenant);
  if (!tenant.ok) return tenant.view;
  const connection = await closed('connection_unavailable', () => deps.readConnection(tenant.value));
  if (!connection.ok) return connection.view;
  if (!connection.value || connection.value.status === 'disconnected') {
    return { state: 'not_connected', reason: 'missing' };
  }
  if (connection.value.status !== 'active') {
    return { state: 'not_connected', reason: connection.value.status };
  }

  const status = await closed('sync_unavailable', () => deps.readStatus(connection.value!.id));
  if (!status.ok) return status.view;
  if (!status.value?.summary) return { state: 'never_synced' };
  const summary = status.value.summary;
  if (summary.levels.account.status !== 'complete' || summary.levels.campaign.status !== 'complete') {
    return { state: 'sync_incomplete' };
  }

  const generatedAt = deps.now().toISOString();
  const anomalyResult = await closed('anomalies_unavailable', () => deps.loadAnomalies({
    connectionId: connection.value!.id,
    summary,
    generatedAt,
  }));
  if (!anomalyResult.ok) return anomalyResult.view;

  const settings = await closed('settings_unavailable', () => deps.readSettings(tenant.value));
  if (!settings.ok) return settings.view;

  let window: DiagnosticWindow | null = null;
  let account: { current: AccountMetricsRow; previous: AccountMetricsRow | null } | null = null;
  let campaigns: readonly EntityMetricsRow[] = [];
  if (settings.value) {
    try {
      window = windowsFor(summary.window_to);
    } catch {
      return { state: 'unavailable', reason: 'invalid_dependency_payload' };
    }
    const metrics = await closed('metrics_unavailable', async () => {
      const [accountResult, campaignResult] = await Promise.all([
        deps.readAccountMetrics({ connectionId: connection.value!.id, window: window!,
          metricRef: settings.value!.metric_ref }),
        deps.readCampaignMetrics({ connectionId: connection.value!.id, window: window!,
          metricRef: settings.value!.metric_ref }),
      ]);
      return { account: accountResult, campaigns: campaignResult.rows };
    });
    if (!metrics.ok) return metrics.view;
    account = metrics.value.account;
    campaigns = metrics.value.campaigns;
  }

  const parsed = strategyInputSchema.safeParse({
    generatedAt,
    anomalies: anomalyResult.value,
    objective: { settings: settings.value, window, account, campaigns },
  });
  if (!parsed.success) return { state: 'unavailable', reason: 'invalid_dependency_payload' };
  try {
    const result = runMetaStrategyEngine(parsed.data);
    const objectiveStatus = settings.value ? 'configured' as const : 'missing' as const;
    return result.status === 'ready' ? { state: 'ready', objectiveStatus, result }
      : { state: 'insufficient_data', objectiveStatus, result };
  } catch {
    return { state: 'unavailable', reason: 'invalid_dependency_payload' };
  }
}
