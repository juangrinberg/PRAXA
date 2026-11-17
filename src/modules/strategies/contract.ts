import { z } from 'zod';

import type { MetaAnomalyResult } from '@/modules/anomalies/contract';
import {
  accountMetricsRowSchema,
  diagnosticSettingsSchema,
  entityMetricsRowSchema,
  type AccountMetricsRow,
  type DiagnosticSettings,
  type DiagnosticWindow,
  type EntityMetricsRow,
} from '@/modules/diagnostics/contract';

const decimalTextSchema = z.string().regex(/^-?\d+(?:\.\d+)?$/);
const nullableDecimalTextSchema = decimalTextSchema.nullable();
const periodSchema = z.strictObject({ from: z.iso.date(), to: z.iso.date() })
  .refine((value) => value.from <= value.to, { message: 'período inválido' });

const anomalyValueSchema = z.strictObject({
  value: decimalTextSchema,
  unit: z.enum(['percent', 'money']),
  currency: z.string().nullable(),
});

const anomalySchema = z.strictObject({
  id: z.string().min(1),
  metric: z.enum(['ctr', 'cpc', 'cpm', 'spend', 'cpa_purchase']),
  level: z.enum(['account', 'campaign']),
  entityRef: z.string().min(1),
  entityName: z.string().nullable(),
  severity: z.enum(['warning', 'critical']),
  direction: z.enum(['increase', 'decrease']),
  baseline: anomalyValueSchema,
  current: anomalyValueSchema,
  changePct: decimalTextSchema,
  periods: z.strictObject({ baseline: periodSchema, current: periodSchema }),
  evidence: z.strictObject({
    daysPerPeriod: z.literal(7),
    observationsUsed: z.literal(14),
    latestFetchedAt: z.iso.datetime().nullable(),
    timezone: z.string().nullable(),
    minimumVolume: z.string().min(1),
    purchaseAttributionKey: z.string().nullable(),
  }),
  ruleId: z.enum(['ctr_decrease', 'cpc_increase', 'cpm_increase', 'spend_increase', 'cpa_purchase_increase']),
  rulesVersion: z.literal('meta-anomaly-rules/1'),
});

const anomalyResultSchema = z.strictObject({
  contractVersion: z.literal(1),
  rulesVersion: z.literal('meta-anomaly-rules/1'),
  mode: z.enum(['real', 'synthetic_demo']),
  generatedAt: z.iso.datetime(),
  status: z.enum(['ready', 'insufficient_data']),
  periods: z.strictObject({ baseline: periodSchema, current: periodSchema }).nullable(),
  evaluatedScopes: z.number().int().nonnegative(),
  omittedScopes: z.array(z.strictObject({
    level: z.enum(['account', 'campaign']),
    entityRef: z.string().min(1),
    entityName: z.string().nullable(),
    reason: z.enum(['incomplete_period', 'no_evaluable_metrics']),
  })),
  anomalies: z.array(anomalySchema),
});

export const diagnosticWindowSchema = z.strictObject({
  from: z.iso.date(),
  to: z.iso.date(),
  prev_from: z.iso.date(),
  prev_to: z.iso.date(),
}).refine((window) => window.prev_from <= window.prev_to && window.prev_to < window.from && window.from <= window.to,
  { message: 'ventana inválida' });

export const strategyInputSchema = z.strictObject({
  generatedAt: z.iso.datetime(),
  anomalies: anomalyResultSchema,
  objective: z.strictObject({
    settings: diagnosticSettingsSchema.nullable(),
    window: diagnosticWindowSchema.nullable(),
    account: z.strictObject({
      current: accountMetricsRowSchema,
      previous: accountMetricsRowSchema.nullable(),
    }).nullable(),
    campaigns: z.array(entityMetricsRowSchema),
  }),
});

export const STRATEGY_RULE_IDS = ['R1', 'R2', 'R3'] as const;
export const STRATEGY_ACTIONS = ['review', 'consider_reduce', 'consider_controlled_test'] as const;
export const STRATEGY_METRICS = [
  'spend', 'impressions', 'clicks', 'result_count', 'ctr', 'cpc', 'cpm', 'cost_per_result', 'cpa_purchase',
] as const;
export const STRATEGY_MESSAGE_KEYS = [
  'r1_deterioration_title', 'r1_deterioration_rationale',
  'r1_purchase_cpa_title', 'r1_purchase_cpa_other_goal_rationale',
  'r2_spend_without_results_title', 'r2_cost_worsening_title', 'r2_rationale',
  'r3_controlled_test_title', 'r3_rationale',
] as const;
export const STRATEGY_SUCCESS_KEYS = [
  'recheck_deterioration_same_window', 'results_improve_with_spend_change',
  'cost_per_result_recovers', 'controlled_test_preserves_improvement',
] as const;
export const STRATEGY_WARNINGS = [
  'manual_suggestion_not_order', 'association_not_causation',
  'initial_thresholds_not_commercially_validated', 'purchase_cpa_is_not_configured_goal',
  'campaign_previous_sample_asymmetric', 'attribution_unknown',
] as const;
export const STRATEGY_OMISSION_REASONS = [
  'no_goal_settings', 'no_comparison', 'incomplete_coverage', 'open_or_partial_days',
  'metric_unavailable', 'mixed_currency', 'incompatible_attribution',
  'conflicting_critical_anomaly', 'low_sample',
] as const;

export const strategyEvidenceSchema = z.strictObject({
  source: z.enum(['m25b_anomaly', 'm26a_metric']),
  provenanceId: z.string().min(1),
  metric: z.enum(STRATEGY_METRICS),
  baseline: nullableDecimalTextSchema,
  current: nullableDecimalTextSchema,
  changePct: nullableDecimalTextSchema,
  unit: z.enum(['count', 'percent', 'money']),
  currency: z.string().nullable(),
  attribution: z.string().min(1),
  periods: z.strictObject({ baseline: periodSchema, current: periodSchema }),
});

export const strategyOmissionSchema = z.strictObject({
  ruleId: z.enum(['R2', 'R3']),
  level: z.enum(['account', 'campaign']),
  entityRef: z.string().min(1),
  reason: z.enum(STRATEGY_OMISSION_REASONS),
});

export const strategyRecommendationSchema = z.strictObject({
  id: z.string().regex(/^strat_[0-9a-f]{8}$/),
  ruleId: z.enum(STRATEGY_RULE_IDS),
  rulesVersion: z.literal('meta-strategy-rules/1'),
  entity: z.strictObject({
    level: z.enum(['account', 'campaign']),
    entityRef: z.string().min(1),
    name: z.string().nullable(),
  }),
  category: z.enum(['deterioration', 'spend_without_result_improvement', 'controlled_scale_candidate']),
  action: z.enum(STRATEGY_ACTIONS),
  priority: z.enum(['high', 'medium', 'low']),
  evidenceQuality: z.enum(['high', 'medium']),
  titleKey: z.enum(STRATEGY_MESSAGE_KEYS),
  rationaleKey: z.enum(STRATEGY_MESSAGE_KEYS),
  metrics: z.array(strategyEvidenceSchema).min(1),
  periods: z.strictObject({ baseline: periodSchema, current: periodSchema }),
  warnings: z.array(z.enum(STRATEGY_WARNINGS)),
  checkPlan: z.strictObject({
    metric: z.enum(STRATEGY_METRICS),
    comparison: z.literal('same_length_next_period'),
    nextPeriod: periodSchema,
    keepAttributionCompatible: z.boolean(),
    successConditionKey: z.enum(STRATEGY_SUCCESS_KEYS),
  }),
});

export const strategyResultSchema = z.strictObject({
  contractVersion: z.literal(1),
  rulesVersion: z.literal('meta-strategy-rules/1'),
  mode: z.enum(['real', 'synthetic_demo']),
  generatedAt: z.iso.datetime(),
  status: z.enum(['ready', 'insufficient_data']),
  recommendations: z.array(strategyRecommendationSchema),
  omissions: z.array(strategyOmissionSchema),
  evaluated: z.strictObject({
    scopes: z.number().int().nonnegative(),
    rules: z.number().int().nonnegative(),
    candidates: z.number().int().nonnegative(),
  }),
  truncated: z.number().int().nonnegative(),
});

export const STRATEGY_LOAD_ERROR_CODES = [
  'tenant_unavailable', 'connection_unavailable', 'sync_unavailable', 'anomalies_unavailable',
  'settings_unavailable', 'metrics_unavailable', 'invalid_dependency_payload',
] as const;

export const metaStrategyViewSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('not_connected'), reason: z.enum(['missing', 'pending_selection', 'needs_reauth']) }),
  z.strictObject({ state: z.literal('never_synced') }),
  z.strictObject({ state: z.literal('sync_incomplete') }),
  z.strictObject({ state: z.literal('insufficient_data'), objectiveStatus: z.enum(['configured', 'missing']),
    result: strategyResultSchema }),
  z.strictObject({ state: z.literal('ready'), objectiveStatus: z.enum(['configured', 'missing']),
    result: strategyResultSchema }),
  z.strictObject({ state: z.literal('unavailable'), reason: z.enum(STRATEGY_LOAD_ERROR_CODES) }),
]);

export type StrategyInput = Readonly<{
  generatedAt: string;
  anomalies: MetaAnomalyResult;
  objective: Readonly<{
    settings: DiagnosticSettings | null;
    window: DiagnosticWindow | null;
    account: Readonly<{ current: AccountMetricsRow; previous: AccountMetricsRow | null }> | null;
    campaigns: readonly EntityMetricsRow[];
  }>;
}>;
export type StrategyRuleId = (typeof STRATEGY_RULE_IDS)[number];
export type StrategyAction = (typeof STRATEGY_ACTIONS)[number];
export type StrategyMetric = (typeof STRATEGY_METRICS)[number];
export type StrategyMessageKey = (typeof STRATEGY_MESSAGE_KEYS)[number];
export type StrategySuccessConditionKey = (typeof STRATEGY_SUCCESS_KEYS)[number];
export type StrategyWarning = (typeof STRATEGY_WARNINGS)[number];
export type StrategyOmissionReason = (typeof STRATEGY_OMISSION_REASONS)[number];
export type StrategyEvidence = Readonly<z.infer<typeof strategyEvidenceSchema>>;
export type StrategyOmission = Readonly<z.infer<typeof strategyOmissionSchema>>;
export type StrategyRecommendation = Readonly<z.infer<typeof strategyRecommendationSchema>>;
export type StrategyResult = Readonly<z.infer<typeof strategyResultSchema>>;
export type StrategyLoadErrorCode = (typeof STRATEGY_LOAD_ERROR_CODES)[number];
export type MetaStrategyView = Readonly<z.infer<typeof metaStrategyViewSchema>>;
