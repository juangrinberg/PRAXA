import type { MetaAnomaly } from '@/modules/anomalies/contract';
import {
  compareExact,
  compareRatio,
  formatRatio,
  parseExactDecimal,
  percentChange,
  ratio,
  thresholdReached,
  type ExactDecimal,
  type ExactRatio,
} from '@/modules/anomalies/decimal';
import { compatibleAttribution, type AccountMetricsRow, type EntityMetricsRow } from '@/modules/diagnostics';

import {
  strategyInputSchema,
  strategyResultSchema,
  type StrategyEvidence,
  type StrategyInput,
  type StrategyMetric,
  type StrategyOmission,
  type StrategyOmissionReason,
  type StrategyRecommendation,
  type StrategyResult,
  type StrategyWarning,
} from './contract';
import { BASE_STRATEGY_WARNINGS, META_STRATEGY_RULES_V1 } from './rules';

type Periods = StrategyRecommendation['periods'];
type Candidate = { recommendation: StrategyRecommendation; magnitude: ExactRatio };
type Scope = Readonly<{
  level: 'account' | 'campaign';
  entityRef: string;
  name: string | null;
  account?: StrategyInput['objective']['account'];
  campaign?: EntityMetricsRow;
}>;

const ZERO: ExactDecimal = { coefficient: BigInt(0), scale: 0 };
const ONE: ExactRatio = { numerator: BigInt(1), denominator: BigInt(1) };
const PRIORITY = { high: 0, medium: 1, low: 2 } as const;
const QUALITY = { high: 0, medium: 1 } as const;
const RULE = { R2: 0, R1: 1, R3: 2 } as const;
const LEVEL = { account: 0, campaign: 1 } as const;

function stableHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function addDays(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function daysInclusive(period: { from: string; to: string }): number {
  return Math.round((Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86_400_000) + 1;
}

function nextPeriod(current: { from: string; to: string }) {
  const from = addDays(current.to, 1);
  return { from, to: addDays(from, daysInclusive(current) - 1) };
}

function exact(value: string | null): ExactDecimal | null {
  return parseExactDecimal(value);
}

function exactRatio(value: string | null): ExactRatio | null {
  const parsed = exact(value);
  return parsed ? ratio(parsed, { coefficient: BigInt(1), scale: 0 }) : null;
}

function magnitude(value: string | null): ExactRatio {
  const parsed = exact(value?.replace(/^-/, '') ?? null);
  return parsed ? ratio(parsed, { coefficient: BigInt(1), scale: 0 }) ?? ONE : ONE;
}

function changePct(current: string | null, baseline: string | null): string | null {
  const currentRatio = exactRatio(current);
  const baselineRatio = exactRatio(baseline);
  if (!currentRatio || !baselineRatio) return null;
  const change = percentChange(currentRatio, baselineRatio);
  return change ? formatRatio(change, 1) : null;
}

function atLeast(value: string | null, minimum: string): boolean {
  const parsed = exact(value);
  const floor = exact(minimum);
  return parsed !== null && floor !== null && compareExact(parsed, floor) >= 0;
}

function positive(value: string | null): boolean {
  const parsed = exact(value);
  return parsed !== null && compareExact(parsed, ZERO) > 0;
}

function baseWarnings(extra: readonly StrategyWarning[] = []): StrategyWarning[] {
  return [...BASE_STRATEGY_WARNINGS, ...extra.filter((item) => !BASE_STRATEGY_WARNINGS.includes(item as never))];
}

function recommendationId(args: {
  ruleId: 'R1' | 'R2' | 'R3'; level: 'account' | 'campaign'; entityRef: string;
  objectiveMetricRef: string; periods: Periods; sourceKey: string;
}): string {
  const canonical = [META_STRATEGY_RULES_V1.version, args.ruleId, args.level, args.entityRef,
    args.objectiveMetricRef, args.periods.baseline.from, args.periods.baseline.to,
    args.periods.current.from, args.periods.current.to, args.sourceKey].join('|');
  return `strat_${stableHash(canonical)}`;
}

function checkPlan(metric: StrategyMetric, periods: Periods, successConditionKey: StrategyRecommendation['checkPlan']['successConditionKey']) {
  return {
    metric,
    comparison: 'same_length_next_period' as const,
    nextPeriod: nextPeriod(periods.current),
    keepAttributionCompatible: true,
    successConditionKey,
  };
}

function anomalyAttribution(anomaly: MetaAnomaly): string {
  return anomaly.metric === 'cpa_purchase' ? anomaly.evidence.purchaseAttributionKey ?? 'unknown' : 'unknown';
}

function r1Candidate(anomaly: MetaAnomaly, settings: StrategyInput['objective']['settings']): Candidate {
  const purchaseGoal = settings?.goal_kind === 'purchase';
  const compatibleCurrency = anomaly.baseline.currency !== null && anomaly.baseline.currency === anomaly.current.currency;
  const knownAttribution = anomaly.evidence.purchaseAttributionKey !== null;
  const reducibleCpa = anomaly.metric === 'cpa_purchase' && anomaly.severity === 'critical' && purchaseGoal
    && compatibleCurrency && knownAttribution && anomaly.evidence.observationsUsed === 14;
  const otherPurchaseGoal = anomaly.metric === 'cpa_purchase' && !purchaseGoal;
  const extra: StrategyWarning[] = [];
  if (otherPurchaseGoal) extra.push('purchase_cpa_is_not_configured_goal');
  if (anomaly.metric === 'cpa_purchase' && !knownAttribution) extra.push('attribution_unknown');
  const metric: StrategyMetric = anomaly.metric;
  const periods = anomaly.periods;
  const action = reducibleCpa ? 'consider_reduce' as const : 'review' as const;
  const titleKey = anomaly.metric === 'cpa_purchase' ? 'r1_purchase_cpa_title' as const : 'r1_deterioration_title' as const;
  const rationaleKey = otherPurchaseGoal ? 'r1_purchase_cpa_other_goal_rationale' as const : 'r1_deterioration_rationale' as const;
  const evidenceQuality = anomaly.metric === 'cpa_purchase' && compatibleCurrency && knownAttribution ? 'high' as const : 'medium' as const;
  const evidence: StrategyEvidence = {
    source: 'm25b_anomaly',
    provenanceId: anomaly.id,
    metric,
    baseline: anomaly.baseline.value,
    current: anomaly.current.value,
    changePct: anomaly.changePct,
    unit: anomaly.metric === 'ctr' ? 'percent' : 'money',
    currency: anomaly.current.currency,
    attribution: anomalyAttribution(anomaly),
    periods,
  };
  return {
    magnitude: magnitude(anomaly.changePct),
    recommendation: {
      id: recommendationId({ ruleId: 'R1', level: anomaly.level, entityRef: anomaly.entityRef,
        objectiveMetricRef: settings?.metric_ref ?? 'none', periods,
        sourceKey: `${anomaly.id}|${anomaly.metric}|${anomaly.ruleId}` }),
      ruleId: 'R1',
      rulesVersion: META_STRATEGY_RULES_V1.version,
      entity: { level: anomaly.level, entityRef: anomaly.entityRef, name: anomaly.entityName },
      category: 'deterioration',
      action,
      priority: anomaly.severity === 'critical' ? 'high' : 'medium',
      evidenceQuality,
      titleKey,
      rationaleKey,
      metrics: [evidence],
      periods,
      warnings: baseWarnings(extra),
      checkPlan: checkPlan(metric, periods, 'recheck_deterioration_same_window'),
    },
  };
}

function periodsFor(input: StrategyInput): Periods | null {
  const window = input.objective.window;
  return window ? {
    baseline: { from: window.prev_from, to: window.prev_to },
    current: { from: window.from, to: window.to },
  } : null;
}

function accountAttributionCompatible(current: string, previous: string): boolean {
  const unknownPair = current === 'unknown' || previous === 'unknown';
  return compatibleAttribution(current, previous) && (!unknownPair || (current === 'unknown' && previous === 'unknown'));
}

function guardReason(scope: Scope, input: StrategyInput, ruleId: 'R2' | 'R3', critical: boolean): StrategyOmissionReason | null {
  if (!input.objective.settings) return 'no_goal_settings';
  if (!input.objective.window) return 'no_comparison';
  if (scope.level === 'account') {
    const pair = scope.account;
    if (!pair?.previous) return 'no_comparison';
    const { current, previous } = pair;
    if ([current, previous].some((row) => row.days_with_data !== 28 || row.days_no_row > 0 || row.days_not_observed > 0)) {
      return 'incomplete_coverage';
    }
    if ([current, previous].some((row) => row.days_open > 0 || row.days_partial > 0)) return 'open_or_partial_days';
    if ([current.spend, current.impressions, current.clicks, current.result_count, current.cost_per_result,
      previous.spend, previous.result_count, previous.cost_per_result].some((value) => value === null)) return 'metric_unavailable';
    if (current.currency === 'mixed' || previous.currency === 'mixed' || current.currency === null
      || previous.currency === null || current.currency !== previous.currency) return 'mixed_currency';
    if (!accountAttributionCompatible(current.attribution, previous.attribution)) return 'incompatible_attribution';
    if (ruleId === 'R3' && critical) return 'conflicting_critical_anomaly';
    if (!atLeast(current.impressions, META_STRATEGY_RULES_V1.minimumImpressions)
      || !atLeast(current.clicks, META_STRATEGY_RULES_V1.minimumClicks)
      || !atLeast(current.result_count, META_STRATEGY_RULES_V1.minimumResults)
      || !atLeast(previous.result_count, META_STRATEGY_RULES_V1.minimumResults)) return 'low_sample';
    return null;
  }

  const row = scope.campaign!;
  const previous = [row.prev_spend, row.prev_result_count, row.prev_cost_per_result];
  if (previous.every((value) => value === null)) return 'no_comparison';
  if (row.days_with_row !== 28) return 'incomplete_coverage';
  if (row.days_open > 0) return 'open_or_partial_days';
  const required = [row.cur_spend, row.cur_impressions, row.cur_clicks, row.cur_result_count,
    row.cur_cost_per_result, row.prev_spend, row.prev_result_count, row.prev_cost_per_result];
  if (required.some((value) => value === null)) return 'metric_unavailable';
  if (row.currency === 'mixed' || (positive(row.cur_spend) && positive(row.prev_spend) && row.var_spend === null)) {
    return 'mixed_currency';
  }
  if (row.attribution === 'mixed' || (positive(row.cur_cost_per_result) && positive(row.prev_cost_per_result)
    && row.var_spend !== null && row.var_cost_per_result === null)) return 'incompatible_attribution';
  if (row.var_spend === null || row.var_cost_per_result === null) return 'metric_unavailable';
  if (ruleId === 'R3' && critical) return 'conflicting_critical_anomaly';
  if (!atLeast(row.cur_impressions, META_STRATEGY_RULES_V1.minimumImpressions)
    || !atLeast(row.cur_clicks, META_STRATEGY_RULES_V1.minimumClicks)
    || !atLeast(row.cur_result_count, META_STRATEGY_RULES_V1.minimumResults)
    || !atLeast(row.prev_result_count, META_STRATEGY_RULES_V1.minimumResults)) return 'low_sample';
  return null;
}

function values(scope: Scope) {
  if (scope.level === 'account') {
    const current = scope.account!.current;
    const previous = scope.account!.previous!;
    return {
      spend: { current: current.spend!, previous: previous.spend! },
      results: { current: current.result_count!, previous: previous.result_count! },
      cost: { current: current.cost_per_result!, previous: previous.cost_per_result! },
      currency: current.currency,
      attribution: current.attribution,
      spendChange: changePct(current.spend, previous.spend),
      costChange: changePct(current.cost_per_result, previous.cost_per_result),
    };
  }
  const row = scope.campaign!;
  return {
    spend: { current: row.cur_spend!, previous: row.prev_spend! },
    results: { current: row.cur_result_count!, previous: row.prev_result_count! },
    cost: { current: row.cur_cost_per_result!, previous: row.prev_cost_per_result! },
    currency: row.currency,
    attribution: row.attribution,
    spendChange: row.var_spend,
    costChange: row.var_cost_per_result,
  };
}

function metricEvidence(scope: Scope, metric: 'spend' | 'result_count' | 'cost_per_result', periods: Periods): StrategyEvidence {
  const source = values(scope);
  const pair = metric === 'spend' ? source.spend : metric === 'result_count' ? source.results : source.cost;
  return {
    source: 'm26a_metric',
    provenanceId: `meta_diagnostic_${scope.level === 'account' ? 'account_metrics' : 'entity_metrics'}:${metric}`,
    metric,
    baseline: pair.previous,
    current: pair.current,
    changePct: metric === 'spend' ? source.spendChange : metric === 'cost_per_result' ? source.costChange
      : changePct(pair.current, pair.previous),
    unit: metric === 'result_count' ? 'count' : 'money',
    currency: metric === 'result_count' ? null : source.currency,
    attribution: metric === 'spend' ? 'unknown' : source.attribution,
    periods,
  };
}

function evaluateR2(scope: Scope, input: StrategyInput, periods: Periods): Candidate | null {
  const source = values(scope);
  const curSpend = exactRatio(source.spend.current)!;
  const prevSpend = exactRatio(source.spend.previous)!;
  const curResults = exact(source.results.current)!;
  const prevResults = exact(source.results.previous)!;
  const curCost = exactRatio(source.cost.current)!;
  const prevCost = exactRatio(source.cost.previous)!;
  const spendCondition = thresholdReached(curSpend, prevSpend, 'increase', META_STRATEGY_RULES_V1.spendIncreasePct)
    && compareExact(curResults, prevResults) <= 0;
  const costCondition = thresholdReached(curCost, prevCost, 'increase', META_STRATEGY_RULES_V1.costPerResultWorseningPct);
  if (!spendCondition && !costCondition) return null;
  const primary = spendCondition ? 'spend' as const : 'cost_per_result' as const;
  const metrics = spendCondition ? [metricEvidence(scope, 'spend', periods), metricEvidence(scope, 'result_count', periods)]
    : [metricEvidence(scope, 'cost_per_result', periods)];
  const sourceKey = input.objective.settings!.metric_ref;
  const warnings: StrategyWarning[] = scope.level === 'campaign' ? ['campaign_previous_sample_asymmetric'] : [];
  const change = primary === 'spend' ? source.spendChange : source.costChange;
  return {
    magnitude: magnitude(change),
    recommendation: {
      id: recommendationId({ ruleId: 'R2', level: scope.level, entityRef: scope.entityRef,
        objectiveMetricRef: sourceKey, periods, sourceKey }),
      ruleId: 'R2', rulesVersion: META_STRATEGY_RULES_V1.version,
      entity: { level: scope.level, entityRef: scope.entityRef, name: scope.name },
      category: 'spend_without_result_improvement', action: 'consider_reduce', priority: 'high',
      evidenceQuality: 'high',
      titleKey: spendCondition ? 'r2_spend_without_results_title' : 'r2_cost_worsening_title',
      rationaleKey: 'r2_rationale', metrics, periods, warnings: baseWarnings(warnings),
      checkPlan: checkPlan(spendCondition ? 'result_count' : 'cost_per_result', periods,
        spendCondition ? 'results_improve_with_spend_change' : 'cost_per_result_recovers'),
    },
  };
}

function evaluateR3(scope: Scope, input: StrategyInput, periods: Periods): Candidate | null {
  const source = values(scope);
  const current = exactRatio(source.cost.current)!;
  const previous = exactRatio(source.cost.previous)!;
  if (!positive(source.spend.current) || !positive(source.cost.current) || !positive(source.cost.previous)
    || !thresholdReached(current, previous, 'decrease', META_STRATEGY_RULES_V1.costPerResultImprovementPct)) return null;
  const sourceKey = input.objective.settings!.metric_ref;
  const warnings: StrategyWarning[] = scope.level === 'campaign' ? ['campaign_previous_sample_asymmetric'] : [];
  return {
    magnitude: magnitude(source.costChange),
    recommendation: {
      id: recommendationId({ ruleId: 'R3', level: scope.level, entityRef: scope.entityRef,
        objectiveMetricRef: sourceKey, periods, sourceKey }),
      ruleId: 'R3', rulesVersion: META_STRATEGY_RULES_V1.version,
      entity: { level: scope.level, entityRef: scope.entityRef, name: scope.name },
      category: 'controlled_scale_candidate', action: 'consider_controlled_test', priority: 'low',
      evidenceQuality: 'high', titleKey: 'r3_controlled_test_title', rationaleKey: 'r3_rationale',
      metrics: [metricEvidence(scope, 'cost_per_result', periods)], periods,
      warnings: baseWarnings(warnings),
      checkPlan: checkPlan('cost_per_result', periods, 'controlled_test_preserves_improvement'),
    },
  };
}

function compareCandidates(left: Candidate, right: Candidate): number {
  const a = left.recommendation;
  const b = right.recommendation;
  return PRIORITY[a.priority] - PRIORITY[b.priority]
    || QUALITY[a.evidenceQuality] - QUALITY[b.evidenceQuality]
    || RULE[a.ruleId] - RULE[b.ruleId]
    || LEVEL[a.entity.level] - LEVEL[b.entity.level]
    || -compareRatio(left.magnitude, right.magnitude)
    || a.id.localeCompare(b.id, 'en');
}

function mergeR4(candidates: Candidate[]): Candidate[] {
  const r2ByScope = new Map<string, Candidate>();
  for (const candidate of candidates) {
    if (candidate.recommendation.ruleId === 'R2') {
      r2ByScope.set(`${candidate.recommendation.entity.level}|${candidate.recommendation.entity.entityRef}`, candidate);
    }
  }
  const merged: Candidate[] = [];
  for (const candidate of candidates) {
    const recommendation = candidate.recommendation;
    const key = `${recommendation.entity.level}|${recommendation.entity.entityRef}`;
    const r2 = r2ByScope.get(key);
    if (recommendation.ruleId === 'R1' && recommendation.action === 'consider_reduce' && r2) {
      const current = r2.recommendation;
      r2.recommendation = { ...current, metrics: [...current.metrics, ...recommendation.metrics] };
      continue;
    }
    if (recommendation.ruleId === 'R3' && r2) continue;
    merged.push(candidate);
  }
  const unique = new Map<string, Candidate>();
  for (const item of merged) {
    const r = item.recommendation;
    const key = `${r.ruleId}|${r.entity.level}|${r.entity.entityRef}|${r.periods.current.from}|${r.periods.current.to}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()].sort(compareCandidates);
}

export function runMetaStrategyEngine(raw: StrategyInput): StrategyResult {
  const input = strategyInputSchema.parse(raw);
  const candidates: Candidate[] = input.anomalies.anomalies.map((item) => r1Candidate(item, input.objective.settings));
  const omissions: StrategyOmission[] = [];
  const scopes = new Map<string, Scope>();
  for (const item of [...input.anomalies.anomalies, ...input.anomalies.omittedScopes]) {
    scopes.set(`${item.level}|${item.entityRef}`, { level: item.level, entityRef: item.entityRef,
      name: 'entityName' in item ? item.entityName : null });
  }
  if (input.objective.account) {
    const known = [...scopes.values()].find((item) => item.level === 'account');
    const scope: Scope = { level: 'account', entityRef: known?.entityRef ?? 'account', name: known?.name ?? null,
      account: input.objective.account };
    scopes.set(`account|${scope.entityRef}`, scope);
  }
  for (const row of input.objective.campaigns) {
    scopes.set(`campaign|${row.entity_ref}`, { level: 'campaign', entityRef: row.entity_ref, name: row.name, campaign: row });
  }

  const periods = periodsFor(input);
  let evaluatedRules = input.anomalies.anomalies.length;
  let evaluableRules = input.anomalies.anomalies.length;
  if (periods) {
    for (const scope of scopes.values()) {
      if (!scope.account && !scope.campaign) continue;
      const critical = input.anomalies.anomalies.some((item) => item.severity === 'critical'
        && item.level === scope.level && (scope.level === 'account' || item.entityRef === scope.entityRef));
      for (const ruleId of ['R2', 'R3'] as const) {
        evaluatedRules += 1;
        const reason = guardReason(scope, input, ruleId, critical);
        if (reason) {
          omissions.push({ ruleId, level: scope.level, entityRef: scope.entityRef, reason });
          continue;
        }
        evaluableRules += 1;
        const candidate = ruleId === 'R2' ? evaluateR2(scope, input, periods) : evaluateR3(scope, input, periods);
        if (candidate) candidates.push(candidate);
      }
    }
  } else {
    for (const scope of scopes.values()) {
      if (!scope.account && !scope.campaign && input.objective.settings !== null) continue;
      for (const ruleId of ['R2', 'R3'] as const) {
        evaluatedRules += 1;
        omissions.push({ ruleId, level: scope.level, entityRef: scope.entityRef,
          reason: input.objective.settings ? 'no_comparison' : 'no_goal_settings' });
      }
    }
  }

  const candidateCount = candidates.length;
  const combined = mergeR4(candidates);
  const high = combined.filter((item) => item.recommendation.priority === 'high');
  const lower = combined.filter((item) => item.recommendation.priority !== 'high');
  const kept = [...high, ...lower.slice(0, META_STRATEGY_RULES_V1.maxNonHighRecommendations)]
    .sort(compareCandidates).map((item) => item.recommendation);
  const result: StrategyResult = {
    contractVersion: 1,
    rulesVersion: META_STRATEGY_RULES_V1.version,
    mode: input.anomalies.mode,
    generatedAt: input.generatedAt,
    status: evaluableRules > 0 ? 'ready' : 'insufficient_data',
    recommendations: kept,
    omissions: omissions.sort((a, b) => a.level.localeCompare(b.level, 'en')
      || a.entityRef.localeCompare(b.entityRef, 'en') || a.ruleId.localeCompare(b.ruleId, 'en')),
    evaluated: { scopes: scopes.size, rules: evaluatedRules, candidates: candidateCount },
    truncated: Math.max(0, lower.length - META_STRATEGY_RULES_V1.maxNonHighRecommendations),
  };
  return strategyResultSchema.parse(result);
}
