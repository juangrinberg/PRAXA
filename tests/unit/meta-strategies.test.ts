import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { MetaAnomaly, MetaAnomalyResult } from '@/modules/anomalies';
import type { AccountMetricsRow, DiagnosticSettings, EntityMetricsRow } from '@/modules/diagnostics';
import {
  META_STRATEGY_RULES_V1,
  loadMetaStrategyView,
  runMetaStrategyEngine,
  strategyInputSchema,
  strategyResultSchema,
  type MetaStrategyLoadDeps,
  type StrategyInput,
} from '@/modules/strategies';

const ACCOUNT_REF = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_REF = '22222222-2222-4222-8222-222222222222';
const ATTR = `attr_${'a'.repeat(32)}`;

function anomaly(overrides: Partial<MetaAnomaly> = {}): MetaAnomaly {
  return {
    id: 'meta-anomaly-a1',
    metric: 'ctr',
    level: 'account',
    entityRef: ACCOUNT_REF,
    entityName: 'Cuenta de prueba',
    severity: 'warning',
    direction: 'decrease',
    baseline: { value: '2.00', unit: 'percent', currency: null },
    current: { value: '1.50', unit: 'percent', currency: null },
    changePct: '-25.0',
    periods: {
      baseline: { from: '2026-09-21', to: '2026-09-27' },
      current: { from: '2026-09-28', to: '2026-10-04' },
    },
    evidence: {
      daysPerPeriod: 7,
      observationsUsed: 14,
      latestFetchedAt: '2026-10-05T12:00:00Z',
      timezone: 'America/Argentina/Buenos_Aires',
      minimumVolume: '1000 impresiones',
      purchaseAttributionKey: null,
    },
    ruleId: 'ctr_decrease',
    rulesVersion: 'meta-anomaly-rules/1',
    ...overrides,
  };
}

function anomalies(items: readonly MetaAnomaly[] = [anomaly()]): MetaAnomalyResult {
  return {
    contractVersion: 1,
    rulesVersion: 'meta-anomaly-rules/1',
    mode: 'real',
    generatedAt: '2026-10-05T12:00:00.000Z',
    status: 'ready',
    periods: items[0]?.periods ?? null,
    evaluatedScopes: items.length > 0 ? 1 : 0,
    omittedScopes: [],
    anomalies: items,
  };
}

function account(period: 'current' | 'previous', overrides: Partial<AccountMetricsRow> = {}): AccountMetricsRow {
  return {
    period,
    spend: period === 'current' ? '130.00' : '100.00',
    impressions: '1000',
    clicks: '100',
    link_clicks: '80',
    result_count: '30',
    result_value: '300',
    ctr: '10',
    cpc: period === 'current' ? '1.30' : '1.00',
    cpm: period === 'current' ? '130.00' : '100.00',
    cost_per_result: period === 'current' ? '4.333333' : '3.333333',
    attributed_return: '2.00',
    currency: 'ARS',
    attribution: ATTR,
    days_with_data: 28,
    days_no_row: 0,
    days_not_observed: 0,
    days_open: 0,
    days_partial: 0,
    activity_status: 'active',
    fetched_at_min: '2026-09-01T00:00:00Z',
    fetched_at_max: '2026-10-26T23:59:59Z',
    open_dates: [],
    partial_dates: [],
    ...overrides,
  };
}

function campaign(overrides: Partial<EntityMetricsRow> = {}): EntityMetricsRow {
  return {
    entity_ref: CAMPAIGN_REF,
    name: 'Campaña externa',
    parent_ref: null,
    effective_status: 'ACTIVE',
    objective: 'OUTCOME_SALES',
    currency: 'ARS',
    attribution: ATTR,
    cur_spend: '130.00',
    cur_impressions: '1000',
    cur_clicks: '100',
    cur_result_count: '30',
    cur_result_value: '300',
    cur_ctr: '10',
    cur_cpc: '1.30',
    cur_cpm: '130.00',
    cur_cost_per_result: '4.333333',
    cur_attributed_return: '2.00',
    prev_spend: '100.00',
    prev_impressions: null,
    prev_clicks: null,
    prev_result_count: '30',
    prev_result_value: '300',
    prev_ctr: null,
    prev_cpc: null,
    prev_cpm: null,
    prev_cost_per_result: '3.333333',
    prev_attributed_return: '2.00',
    var_spend: '30.0',
    var_ctr: null,
    var_cost_per_result: '30.0',
    var_attributed_return: '0.0',
    days_with_row: 28,
    days_open: 0,
    ...overrides,
  };
}

const SETTINGS: DiagnosticSettings = { goal_kind: 'purchase', metric_ref: 'actions:purchase' };

function input(overrides: Partial<StrategyInput> = {}): StrategyInput {
  return {
    generatedAt: '2026-10-27T12:00:00.000Z',
    anomalies: anomalies(),
    objective: {
      settings: SETTINGS,
      window: { from: '2026-09-29', to: '2026-10-26', prev_from: '2026-09-01', prev_to: '2026-09-28' },
      account: { current: account('current'), previous: account('previous') },
      campaigns: [campaign()],
    },
    ...overrides,
  };
}

describe('M26b — contrato y motor de estrategias', () => {
  it('T-01: contrato estricto, versionado y sin fronteras excluidas', () => {
    expect(META_STRATEGY_RULES_V1.version).toBe('meta-strategy-rules/1');
    expect(strategyInputSchema.parse(input())).toEqual(input());
    for (const field of ['company_id', 'tiendanube', 'ga4', 'chat']) {
      expect(strategyInputSchema.safeParse({ ...input(), [field]: 'prohibido' }).success, field).toBe(false);
    }
    expect(strategyInputSchema.safeParse({ ...input(), generatedAt: 'ayer' }).success).toBe(false);
    const result = runMetaStrategyEngine(input());
    expect(strategyResultSchema.parse(result)).toEqual(result);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('T-02/T-03: es determinístico, el nombre no cambia el ID y cada anomalía conserva procedencia', () => {
    const first = runMetaStrategyEngine(input());
    expect(runMetaStrategyEngine(input())).toEqual(first);
    const renamed = input({ anomalies: anomalies([anomaly({ entityName: 'Otro nombre' })]) });
    const renamedResult = runMetaStrategyEngine(renamed);
    const r1 = first.recommendations.find((item) => item.ruleId === 'R1');
    const renamedR1 = renamedResult.recommendations.find((item) => item.ruleId === 'R1');
    expect(renamedR1?.id).toBe(r1?.id);
    expect(renamedR1?.entity.name).toBe('Otro nombre');
    expect(r1?.metrics[0]).toMatchObject({ source: 'm25b_anomaly', provenanceId: 'meta-anomaly-a1' });

    const two = runMetaStrategyEngine(input({
      anomalies: anomalies([
        anomaly(),
        anomaly({ id: 'meta-anomaly-a2', metric: 'cpc', ruleId: 'cpc_increase', direction: 'increase',
          baseline: { value: '1.00', unit: 'money', currency: 'ARS' },
          current: { value: '1.30', unit: 'money', currency: 'ARS' }, changePct: '30.0' }),
      ]),
    }));
    const r1Ids = two.recommendations.filter((item) => item.ruleId === 'R1').map((item) => item.id);
    expect(new Set(r1Ids).size).toBe(r1Ids.length);
  });

  it('T-04/T-05: no reconstruye scopes omitidos y limita gasto/CPA según objetivo y evidencia', () => {
    const spend = anomaly({ metric: 'spend', ruleId: 'spend_increase', direction: 'increase',
      baseline: { value: '100', unit: 'money', currency: 'ARS' },
      current: { value: '160', unit: 'money', currency: 'ARS' }, changePct: '60.0', severity: 'critical' });
    const cpa = anomaly({ id: 'meta-anomaly-cpa', metric: 'cpa_purchase', ruleId: 'cpa_purchase_increase',
      direction: 'increase', severity: 'critical',
      baseline: { value: '10', unit: 'money', currency: 'ARS' },
      current: { value: '15', unit: 'money', currency: 'ARS' }, changePct: '50.0',
      evidence: { ...anomaly().evidence, purchaseAttributionKey: 'known-purchase' } });
    const result = runMetaStrategyEngine(input({ anomalies: anomalies([spend, cpa]) }));
    expect(result.recommendations.find((item) => item.metrics.some((m) => m.provenanceId === spend.id))?.action)
      .toBe('review');
    expect(result.recommendations.find((item) => item.metrics.some((m) => m.provenanceId === cpa.id))?.action)
      .toBe('consider_reduce');

    const otherGoal = runMetaStrategyEngine(input({ objective: { ...input().objective,
      settings: { goal_kind: 'inquiry', metric_ref: 'actions:lead' } }, anomalies: anomalies([cpa]) }));
    const otherGoalCpa = otherGoal.recommendations.find((item) => item.ruleId === 'R1');
    expect(otherGoalCpa).toMatchObject({ action: 'review', titleKey: 'r1_purchase_cpa_title' });
    expect(otherGoalCpa?.warnings).toContain('purchase_cpa_is_not_configured_goal');

    const omittedOnly = runMetaStrategyEngine(input({ anomalies: { ...anomalies([]), status: 'insufficient_data',
      omittedScopes: [{ level: 'campaign', entityRef: CAMPAIGN_REF, entityName: null, reason: 'incomplete_period' }] },
      objective: { settings: null, window: null, account: null, campaigns: [] } }));
    expect(omittedOnly.recommendations).toHaveLength(0);
    expect(omittedOnly.status).toBe('insufficient_data');
  });

  it('T-06/T-08: R2 activa en los bordes inclusivos para cuenta y campaña con muestra asimétrica', () => {
    const result = runMetaStrategyEngine(input({ anomalies: anomalies([]) }));
    const r2 = result.recommendations.filter((item) => item.ruleId === 'R2');
    expect(r2).toHaveLength(2);
    expect(r2.every((item) => item.action === 'consider_reduce' && item.priority === 'high')).toBe(true);
    expect(r2.find((item) => item.entity.level === 'campaign')?.warnings)
      .toContain('campaign_previous_sample_asymmetric');
  });

  it('T-07: aplica una sola omisión por regla con la precedencia total', () => {
    const missingGoal = runMetaStrategyEngine(input({ anomalies: anomalies([]), objective: {
      settings: null,
      window: input().objective.window,
      account: { current: account('current', { impressions: '1' }), previous: null },
      campaigns: [campaign({ cur_impressions: '1', days_with_row: 2, days_open: 1 })],
    } }));
    expect(missingGoal.omissions.every((item) => item.reason === 'no_goal_settings')).toBe(true);
    expect(missingGoal.omissions).toHaveLength(4);

    const cases: Array<[Partial<AccountMetricsRow>, Partial<AccountMetricsRow> | null, string]> = [
      [{}, null, 'no_comparison'],
      [{ days_with_data: 27, days_not_observed: 1 }, {}, 'incomplete_coverage'],
      [{ days_open: 1, open_dates: ['2026-10-26'] }, {}, 'open_or_partial_days'],
      [{ spend: null }, {}, 'metric_unavailable'],
      [{ currency: 'mixed' }, {}, 'mixed_currency'],
      [{ attribution: `attr_${'b'.repeat(32)}` }, {}, 'incompatible_attribution'],
      [{ impressions: '999' }, {}, 'low_sample'],
    ];
    for (const [currentChanges, previousChanges, reason] of cases) {
      const result = runMetaStrategyEngine(input({ anomalies: anomalies([]), objective: {
        ...input().objective,
        account: { current: account('current', currentChanges),
          previous: previousChanges === null ? null : account('previous', previousChanges) },
        campaigns: [],
      } }));
      expect(result.omissions.filter((item) => item.level === 'account').map((item) => item.reason), reason)
        .toEqual([reason, reason]);
    }
  });

  it('T-09/T-10: R3 activa en el borde y una crítica de la entidad la bloquea', () => {
    const improved = campaign({ cur_spend: '100', prev_spend: '100', cur_cost_per_result: '75',
      prev_cost_per_result: '100', var_spend: '0', var_cost_per_result: '-25',
      cur_result_count: '30', prev_result_count: '30' });
    const eligible = runMetaStrategyEngine(input({ anomalies: anomalies([]), objective: {
      ...input().objective, account: null, campaigns: [improved] } }));
    expect(eligible.recommendations).toContainEqual(expect.objectContaining({ ruleId: 'R3',
      action: 'consider_controlled_test', priority: 'low' }));

    const blocked = runMetaStrategyEngine(input({ anomalies: anomalies([anomaly({ level: 'campaign',
      entityRef: CAMPAIGN_REF, severity: 'critical' })]), objective: {
      ...input().objective, account: null, campaigns: [improved] } }));
    expect(blocked.recommendations.some((item) => item.ruleId === 'R3')).toBe(false);
    expect(blocked.omissions).toContainEqual({ ruleId: 'R3', level: 'campaign',
      entityRef: CAMPAIGN_REF, reason: 'conflicting_critical_anomaly' });
  });

  it('T-11/T-12: fusiona acciones adversas, conserva todas las high y trunca solo diez no high', () => {
    const cpa = anomaly({ id: 'meta-anomaly-cpa', metric: 'cpa_purchase', ruleId: 'cpa_purchase_increase',
      severity: 'critical', direction: 'increase',
      baseline: { value: '2', unit: 'money', currency: 'ARS' },
      current: { value: '4', unit: 'money', currency: 'ARS' }, changePct: '100.0',
      evidence: { ...anomaly().evidence, purchaseAttributionKey: 'known-purchase' } });
    const merged = runMetaStrategyEngine(input({ anomalies: anomalies([cpa]) }));
    const adverse = merged.recommendations.filter((item) => item.entity.level === 'account'
      && item.action === 'consider_reduce');
    expect(adverse).toHaveLength(1);
    expect(adverse[0].ruleId).toBe('R2');
    expect(adverse[0].metrics.some((metric) => metric.provenanceId === cpa.id)).toBe(true);

    const many = Array.from({ length: 14 }, (_, index) => anomaly({
      id: `meta-anomaly-${index}`,
      entityRef: `campaign-${String(index).padStart(2, '0')}`,
      level: 'campaign',
      severity: index < 2 ? 'critical' : 'warning',
    }));
    const limited = runMetaStrategyEngine(input({ anomalies: anomalies(many), objective: {
      settings: null, window: null, account: null, campaigns: [] } }));
    expect(limited.recommendations.filter((item) => item.priority === 'high')).toHaveLength(2);
    expect(limited.recommendations.filter((item) => item.priority !== 'high')).toHaveLength(10);
    expect(limited.truncated).toBe(2);
  });

  it('T-13/T-14/T-15: conserva precisión grande, evidencia/check plan y distingue no activada de omisión', () => {
    const hugePrevious = '90071992547409931234567890';
    const hugeCurrent = '117093590311632910604938257'; // 130 % exacto
    const result = runMetaStrategyEngine(input({ anomalies: anomalies([]), objective: {
      ...input().objective,
      account: { current: account('current', { spend: hugeCurrent, result_count: '30', cost_per_result: '1' }),
        previous: account('previous', { spend: hugePrevious, result_count: '30', cost_per_result: '1' }) },
      campaigns: [],
    } }));
    const r2 = result.recommendations.find((item) => item.ruleId === 'R2');
    expect(r2?.metrics[0]).toMatchObject({ baseline: hugePrevious, current: hugeCurrent,
      periods: { baseline: { from: '2026-09-01', to: '2026-09-28' },
        current: { from: '2026-09-29', to: '2026-10-26' } } });
    expect(r2?.warnings).toEqual(expect.arrayContaining([
      'manual_suggestion_not_order', 'association_not_causation',
      'initial_thresholds_not_commercially_validated',
    ]));
    expect(r2?.checkPlan.nextPeriod).toEqual({ from: '2026-10-27', to: '2026-11-23' });

    const noTrigger = runMetaStrategyEngine(input({ anomalies: anomalies([]), objective: {
      ...input().objective,
      account: { current: account('current', { spend: '100', cost_per_result: '100' }),
        previous: account('previous', { spend: '100', cost_per_result: '100' }) },
      campaigns: [],
    } }));
    expect(noTrigger.status).toBe('ready');
    expect(noTrigger.recommendations).toHaveLength(0);
    expect(noTrigger.omissions).toHaveLength(0);
    expect(noTrigger.evaluated.rules).toBe(2);
  });
});

describe('M26b — loader server-only', () => {
  function deps(overrides: Partial<MetaStrategyLoadDeps> = {}): MetaStrategyLoadDeps {
    const summary = {
      version: 1 as const,
      credential_generation: 1,
      window_from: '2026-09-29',
      window_to: '2026-10-26',
      max_window_days: 93,
      started_at: '2026-10-26T12:00:00Z',
      lease_expires_at: '2026-10-26T12:10:00Z',
      finished_at: '2026-10-26T12:01:00Z',
      status: 'completed' as const,
      levels: Object.fromEntries(['account', 'campaign', 'adset', 'ad'].map((level) => [level, {
        status: 'complete' as const, reason: 'complete' as const,
        fetched_at: '2026-10-26T12:00:30Z', finished_at: '2026-10-26T12:01:00Z',
      }])) as never,
    };
    return {
      tenant: vi.fn(async () => ({ user_id: ACCOUNT_REF, company_id: CAMPAIGN_REF, role: 'owner' as const,
        request_id: '33333333-3333-4333-8333-333333333333' })),
      readConnection: vi.fn(async () => ({ id: ACCOUNT_REF, company_id: CAMPAIGN_REF, provider: 'meta' as const,
        client_business_id: 'business', credential_generation: 1, current_sync_run_id: null,
        last_error_class: null, last_error_message: null, created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z', external_account_id: 'account_ref', currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires', status: 'active' as const,
        pending_expires_at: null, purge_requested_at: null })),
      readStatus: vi.fn(async () => ({ has_attempt: true, summary, effective_status: 'completed' as const,
        connection_changed: false })),
      loadAnomalies: vi.fn(async () => anomalies([])),
      readSettings: vi.fn(async () => SETTINGS),
      readAccountMetrics: vi.fn(async () => ({ current: account('current'), previous: account('previous') })),
      readCampaignMetrics: vi.fn(async () => ({ rows: [campaign()], pages: 1 })),
      now: vi.fn(() => new Date('2026-10-27T12:00:00.000Z')),
      ...overrides,
    };
  }

  it('T-17: corta cada estado incompleto antes de anomalías, configuración o métricas', async () => {
    for (const level of ['account', 'campaign'] as const) {
      for (const status of ['pending', 'incomplete', 'failed', 'not_attempted'] as const) {
        const initial = deps();
        const original = await initial.readStatus(ACCOUNT_REF);
        const changed = structuredClone(original!);
        changed.summary!.levels[level].status = status;
        changed.summary!.levels[level].reason = status === 'incomplete' ? 'page_limit' :
          status === 'failed' ? 'own_error' : null;
        const base = deps({ readStatus: vi.fn(async () => changed) });
        const view = await loadMetaStrategyView({ mode: 'real' }, base);
        expect(view, `${level}:${status}`).toEqual({ state: 'sync_incomplete' });
        expect(base.loadAnomalies).not.toHaveBeenCalled();
        expect(base.readSettings).not.toHaveBeenCalled();
        expect(base.readAccountMetrics).not.toHaveBeenCalled();
        expect(base.readCampaignMetrics).not.toHaveBeenCalled();
      }
    }
  });

  it('T-17: resuelve tenant/conexión/resumen una vez, carga solo lecturas admitidas y cierra errores', async () => {
    const base = deps();
    const view = await loadMetaStrategyView({ mode: 'real' }, base);
    expect(view.state).toBe('ready');
    for (const fn of [base.tenant, base.readConnection, base.readStatus, base.loadAnomalies,
      base.readSettings, base.readAccountMetrics, base.readCampaignMetrics]) {
      expect(fn).toHaveBeenCalledTimes(1);
    }
    expect(Object.keys(base).sort()).toEqual([
      'loadAnomalies', 'now', 'readAccountMetrics', 'readCampaignMetrics', 'readConnection',
      'readSettings', 'readStatus', 'tenant',
    ]);

    const unavailable = await loadMetaStrategyView({ mode: 'real' }, deps({
      tenant: vi.fn(async () => { throw new Error('payload del proveedor'); }),
    }));
    expect(unavailable).toEqual({ state: 'unavailable', reason: 'tenant_unavailable' });
    expect(JSON.stringify(unavailable)).not.toContain('payload del proveedor');
  });

  it('T-25 — fronteras excluidas: el loader no acepta ni invoca TN, GA4, chat o LLM', async () => {
    const base = deps();
    await loadMetaStrategyView({ mode: 'real' }, base);
    expect(Object.keys(base).join('|')).not.toMatch(/tiendanube|ga4|chat|llm|model/i);
  });
});
