export const META_STRATEGY_RULES_V1 = Object.freeze({
  version: 'meta-strategy-rules/1' as const,
  spendIncreasePct: 30,
  costPerResultWorseningPct: 25,
  costPerResultImprovementPct: 25,
  minimumImpressions: '1000',
  minimumClicks: '100',
  minimumResults: '30',
  maxNonHighRecommendations: 10,
});

export const BASE_STRATEGY_WARNINGS = Object.freeze([
  'manual_suggestion_not_order',
  'association_not_causation',
  'initial_thresholds_not_commercially_validated',
] as const);
