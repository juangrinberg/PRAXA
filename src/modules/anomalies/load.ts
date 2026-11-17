import 'server-only';

import { readMetaDailyCoverage, readMetaSyncStatus, type MetaCoverageRow, type MetaSyncStatus } from '@/modules/integrations/meta/insights';
import { readConnectionRecord } from '@/modules/integrations/repository/connections';
import { requireTenantContext, type TenantContext } from '@/modules/tenant/context';

import type { MetaAnomalyObservation, MetaAnomalyResult, MetaAnomalyView } from './contract';
import { createMetaAnomalyDemo } from './demo';
import { detectMetaAnomalies } from './detect';

type Connection = NonNullable<Awaited<ReturnType<typeof readConnectionRecord>>>;

export type MetaAnomalyLoadDeps = Readonly<{
  tenant: () => Promise<TenantContext>;
  readConnection: (ctx: TenantContext) => Promise<Connection | null>;
  readStatus: (connectionId: string) => Promise<MetaSyncStatus | null>;
  readCoverage: (input: {
    connectionId: string;
    level: 'account' | 'campaign';
    from: string;
    to: string;
  }) => Promise<MetaCoverageRow[]>;
  now: () => Date;
}>;

const defaultDeps: MetaAnomalyLoadDeps = {
  tenant: requireTenantContext,
  readConnection: readConnectionRecord,
  readStatus: readMetaSyncStatus,
  readCoverage: readMetaDailyCoverage,
  now: () => new Date(),
};

export type ResolvedMetaAnomalyInput = Readonly<{
  connectionId: string;
  summary: NonNullable<MetaSyncStatus['summary']>;
  generatedAt: string;
}>;

function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function attributionKey(row: MetaCoverageRow): string | null {
  if (!row.attribution?.known) return null;
  const settings = row.attribution.settings.map((setting) => ({
    adset_ref: setting.adset_ref,
    windows: [...setting.windows].sort((a, b) =>
      a.event_type.localeCompare(b.event_type) || a.days - b.days),
  })).sort((a, b) => a.adset_ref.localeCompare(b.adset_ref));
  return `known-${shortHash(JSON.stringify(settings))}`;
}

function toObservation(row: MetaCoverageRow): MetaAnomalyObservation | null {
  if (!row.entity_ref || (row.level !== 'account' && row.level !== 'campaign')) return null;
  const purchase = row.actions?.find((action) =>
    action.action_type === 'purchase' && action.variant === 'value') ?? null;
  return {
    day: row.day,
    level: row.level,
    entityRef: row.entity_ref,
    entityName: row.name,
    presence: row.presence,
    temporalStatus: row.temporal_status,
    capturedBeforeDayEnd: row.captured_before_day_end,
    spend: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    purchases: purchase?.count ?? null,
    purchaseAttributionKey: attributionKey(row),
    currency: row.currency,
    timezone: row.timezone,
    fetchedAt: row.fetched_at,
  };
}

export async function loadMetaAnomalyResultForResolvedSync(
  input: ResolvedMetaAnomalyInput,
  injected: Pick<MetaAnomalyLoadDeps, 'readCoverage'> = { readCoverage: defaultDeps.readCoverage },
): Promise<MetaAnomalyResult> {
  const accountPromise = injected.readCoverage({ connectionId: input.connectionId, level: 'account',
    from: input.summary.window_from, to: input.summary.window_to });
  const campaignPromise = input.summary.levels.campaign.status === 'complete' ?
    injected.readCoverage({ connectionId: input.connectionId, level: 'campaign',
      from: input.summary.window_from, to: input.summary.window_to }) : Promise.resolve([]);
  const rows = (await Promise.all([accountPromise, campaignPromise])).flat();
  const observations = rows.map(toObservation).filter((item): item is MetaAnomalyObservation => item !== null);
  return detectMetaAnomalies({ mode: 'real', generatedAt: input.generatedAt, observations });
}

export async function loadMetaAnomalyView(
  options: Readonly<{ mode: 'real' | 'synthetic_demo' }>,
  injected: Partial<MetaAnomalyLoadDeps> = {},
): Promise<MetaAnomalyView> {
  if (options.mode === 'synthetic_demo') return createMetaAnomalyDemo();
  const deps = { ...defaultDeps, ...injected };
  try {
    const ctx = await deps.tenant();
    const connection = await deps.readConnection(ctx);
    if (!connection) return { state: 'not_connected', reason: 'missing' };
    if (connection.status !== 'active') {
      const reason = connection.status === 'disconnected' ? 'missing' : connection.status;
      return { state: 'not_connected', reason };
    }

    const status = await deps.readStatus(connection.id);
    if (!status?.summary) return { state: 'never_synced' };
    const summary = status.summary;
    const lastSyncedAt = summary.finished_at ?? summary.levels.account.finished_at ??
      summary.levels.account.fetched_at;
    if (summary.levels.account.status !== 'complete') {
      const result = detectMetaAnomalies({ mode: 'real', generatedAt: deps.now().toISOString(), observations: [] });
      return { state: 'insufficient_data', result, lastSyncedAt };
    }

    const result = await loadMetaAnomalyResultForResolvedSync({ connectionId: connection.id, summary,
      generatedAt: deps.now().toISOString() }, { readCoverage: deps.readCoverage });
    return result.status === 'ready' ? { state: 'ready', result, lastSyncedAt } :
      { state: 'insufficient_data', result, lastSyncedAt };
  } catch {
    return { state: 'unavailable' };
  }
}
