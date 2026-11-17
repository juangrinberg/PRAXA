# M26b — Spec de la microfase: estrategias publicitarias verificables

**Estado:** APROBADA

Estados posibles: `BORRADOR` → `APROBADA`. Solo el usuario puede aprobar esta spec después de una auditoría `APROBABLE`.

**Migración y reunificación.** La spec coordinadora original se leyó antes de la primera migración con blob completo `d60bca7fa1d89617bfa9d2bbdf92d8a2e953d34d` y hash de contenido del pipeline —sin la línea `Estado`— `703dd3ab364085bf9d658b2e92a41ab6983e8c79`. La segunda enmienda aprobada por el usuario el 2026-11-16 vuelve a establecer una única microfase y una única spec. Este documento conserva de forma canónica las 18 decisiones originales, los 22 criterios y los 29 casos de prueba, e incorpora los hallazgos A-01 a A-07 de la auditoría de la spec intermedia M26b.1.

## Fuentes

- Contrato de ejecución: `AGENTS.md`.
- Pipeline y plantilla: `docs/PIPELINE.md` y `docs/_templates/mf-spec.md`.
- Ruta aprobada: ficha M26b y §II.14d de `docs/FASES/FASE1/meta_first/plan.md`.
- Contrato estable: DEC-26 y CA-82 a CA-94 de `docs/FASES/FASE1/meta_first/spec.md` §16b.
- Enmiendas aprobadas: `docs/FASES/FASE1/meta_first/revisiones/propuesta-enmienda-m26b-estrategias.md` y `docs/FASES/FASE1/meta_first/revisiones/enmienda-m26b-unificacion.md`.
- Dependencias: implementación integrada de M25b en `src/modules/anomalies/`; configuración, evidencia y repositorio de M26a en `src/modules/diagnostics/`.
- Evidencia: `docs/FASES/FASE1/M25b/sesiones/M25b.md` y `docs/FASES/FASE1/meta_first/sesiones/M26a.md`.
- Commit base inspeccionado: `main@75fddd3`, más la enmienda M26b aprobada y todavía sin commit en el árbol de trabajo.
- IDs operativos definidos aquí: `M26b-C-01` a `M26b-C-22` y `M26b-T-01` a `M26b-T-29`.

## Incorporación de la auditoría anterior

La auditoría histórica de la spec intermedia se conserva en [`revisiones/spec-audit-1.md`](revisiones/spec-audit-1.md). Su veredicto `REQUIERE CORRECCIONES` corresponde al hash auditado de M26b.1 y no se transfiere a esta spec unificada. Los siete hallazgos quedan tratados así:

| Hallazgo | Tratamiento en esta spec | Verificación o límite pendiente |
|---|---|---|
| A-01 — colisión de IDs R1 | La clave canónica incluye `MetaAnomaly.id`, métrica y regla además de entidad y períodos. | T-02 prueba anomalías distintas de la misma entidad/período con IDs diferentes. |
| A-02 — demo fuera del alcance intermedio | M26b unificada incluye demo; en modo sintético el loader devuelve el fixture antes de construir o invocar dependencias reales. | T-20 y T-28 verifican el corte técnico y el recorrido. |
| A-03 — contrato incompleto | Se fijan tipos, catálogos cerrados, estados/errores, contadores, período siguiente y firma del helper M25b. | T-01, T-14, T-15, T-16 y T-17 cubren contrato, semántica y regresiones. |
| A-04 — decisiones de reglas no totales | La matriz de prioridad, acción, calidad, warning y omisión fija todas las ramas sin decisiones libres. | T-03 a T-12 y T-14 verifican las ramas y su salida determinística. |
| A-05 — contexto y referencias caducas | Se aclara que existen impresiones/clics previos de campaña, pero se excluyen deliberadamente de las guardas; las referencias actuales apuntan a la spec canónica M26b. | T-08 verifica la asimetría aprobada; la auditoría anterior queda solo como antecedente. |
| A-06 — trazabilidad y comandos incompletos | C-01/C-16 y el resto de criterios tienen casos trazables; T-25 a T-27 concretan comandos y alcance de búsqueda. | Las suites y búsquedas se ejecutan según la matriz; la evidencia registra comandos y resultados reales. |
| A-07 — proyección de compatibilidad ambigua | Se establece precedencia conservadora con los campos vigentes de `0022`; no se infiere una causa que esos campos no demuestren ni se amplía SQL/RPC. | T-07 prueba las ramas con fixtures de `0022`. Si la causa no puede distinguirse con esos campos, se usa `metric_unavailable`; si la auditoría o las pruebas muestran que la proyección no es demostrable, se detiene y se requiere cambio de ruta antes de implementar. |

## Objetivo

Construir y exponer una experiencia completa de estrategias publicitarias verificables: motor determinístico y versionado, adaptador server-only, interfaz protegida y demo sintética separada. Las recomendaciones son manuales, explican su evidencia y su comprobación, no se persisten y nunca escriben en sistemas externos.

## Alcance

- Contrato Zod estricto y serializable para entradas, resultados, recomendaciones, evidencia, omisiones y vista.
- Catálogo cerrado de reglas R1 a R4 y acciones `review`, `consider_reduce` y `consider_controlled_test`.
- Aritmética decimal exacta, IDs estables, precedencia, deduplicación, orden y truncamiento determinísticos.
- Adaptador server-only que resuelve K01/conexión/resumen una vez, reutiliza M25b/M26a y nunca acepta IDs u objetivo desde el cliente.
- Cuenta y campañas. Conjuntos y anuncios quedan fuera.
- Lectura bajo demanda de datos persistidos; ninguna consulta nueva a Meta y ninguna escritura.
- Pruebas unitarias, regresiones de helpers, prueba app remota real de tenant/RLS/cero escrituras y medición del fixture máximo.
- Página protegida `/app/estrategias`, navegación, tarjetas accesibles y estados honestos que consumen el resultado sin recalcular reglas.
- Demo sintética estable y rotulada que corta antes de K01, Data API y RPC.
- Recorrido autenticado real, recorrido de demo y evidencia para decidir `G-STRATEGIES`.

## Fuera de alcance

- Aprobar automáticamente `G-STRATEGY-ENGINE` o `G-STRATEGIES`: ambos requieren decisión expresa del usuario; el primero es un checkpoint interno y el segundo el único gate final.
- LLM, prompts, chat, DeepInfra, Anthropic o texto generado como autoridad.
- Ejecutar cambios o escribir en Meta, Tiendanube, GA4 u otro sistema externo.
- Montos o porcentajes de presupuesto; causalidad, pronósticos, garantías, benchmarks o rentabilidad.
- Persistencia de recomendaciones, aceptación, descarte, ejecución, seguimiento o resultados posteriores.
- Migraciones, tablas, columnas, funciones SQL, RPC, grants, políticas RLS o `worker_api` nuevos.
- Datos de Tiendanube/GA4 como entrada, rankings entre empresas u objetivos y comparación con terceros.
- Modificar contratos o umbrales de M25b/M26a salvo exports/helpers compatibles autorizados por la ruta.

## Contexto verificado en el código

| Qué | Dónde | Qué implica |
|---|---|---|
| M25b publica contrato, detector, decimal y loader; el loader no está expuesto íntegramente por el índice | `src/modules/anomalies/{contract,detect,decimal,load,index}.ts` | Se extrae y exporta un helper compatible; no se duplica el detector. |
| M25b conserva regla/versión, entidad, valores, 7+7, atribución, omisiones y modo | `src/modules/anomalies/contract.ts` | R1 consume `MetaAnomalyResult` sin reinterpretar fórmulas ni ausencias. |
| El objetivo admite `purchase`, `inquiry` y `traffic` y se valida bajo la empresa de K01 | `src/modules/diagnostics/{contract,eligibility}.ts` | R2/R3 usan `goal_kind`/`metric_ref`; sin objetivo quedan no evaluables. |
| M26a ya lee cuenta 28+28 y entidades paginadas por RPC con validación estricta | `src/modules/diagnostics/{repository,evidence}.ts` | No se autoriza SQL ni RPC nueva. |
| Campaña sí expone impresiones/clics previos, pero CA-84/D-M26b-16 los excluyen deliberadamente de las guardas | `src/modules/diagnostics/contract.ts`; migración `0022` | La muestra histórica es asimétrica por decisión de producto, no por ausencia del contrato. |
| Los mínimos vigentes son 1.000 impresiones, 100 clics y 30 resultados | `src/modules/diagnostics/limits.ts` | Son pisos inclusivos de R2/R3. |
| Existe patrón remoto A/B con Data API y limpieza | `tests/app/meta-diagnostics.test.ts` | `meta-strategies.test.ts` debe probar backend/RLS real, no solo dependencias inyectadas. |
| El código M25b está integrado en `main`, pero `G-ANOMALIES` está pendiente | `docs/PROJECT_STATE.md` | Puede reutilizarse para M26b; integración no equivale a gate aprobado. |

## Diseño concreto

### Condición de entrada y cierre

- La ruta y `G-DIAG` habilitan M26b.
- El código M25b debe seguir integrado en la rama de implementación; `G-ANOMALIES` no es condición para comenzar ni para alcanzar el checkpoint `G-STRATEGY-ENGINE`.
- No se implementa hasta que esta spec y su plan estén aprobados.
- La excepción expresa al límite de ocho horas permite una sola microfase por etapas. No reduce criterios ni permite ejecutar otra microfase en paralelo.
- Después de completar y verificar contrato, reglas, motor y adaptador, el usuario debe aprobar `G-STRATEGY-ENGINE`. Es un checkpoint interno: no cierra M26b, no habilita una sucesora y no autoriza continuar automáticamente con interfaz o demo.
- La etapa de interfaz continúa únicamente por pedido expreso del usuario, usando la misma spec y el mismo plan aprobados y sin alterar la salida del motor.
- `G-STRATEGIES` es el único gate final. Requiere el checkpoint interno, `G-ANOMALIES`, todas las pruebas y ambos recorridos.
- El paralelismo con M16f es de planificación; se ejecuta una microfase por vez y solo a pedido del usuario.

### Autoridad y determinismo

El servidor decide si una regla es evaluable, si se activa, la entidad, métricas, períodos, evidencia, acción, prioridad, calidad, advertencias y plan. No interviene un LLM. Los nombres de campañas son texto externo escapado y no modifican reglas, IDs, acciones ni mensajes.

El motor no recibe Supabase, Next ni un cliente HTTP; recibe `StrategyInput` normalizado. No lee reloj ni estado global. El caller entrega `generatedAt`; para el mismo input completo la salida es idéntica.

### Contrato público

```ts
type StrategyRuleId = 'R1' | 'R2' | 'R3';
type StrategyAction =
  | 'review'
  | 'consider_reduce'
  | 'consider_controlled_test';

type StrategyMetric =
  | 'spend' | 'impressions' | 'clicks' | 'result_count'
  | 'ctr' | 'cpc' | 'cpm' | 'cost_per_result' | 'cpa_purchase';

type StrategyMessageKey =
  | 'r1_deterioration_title' | 'r1_deterioration_rationale'
  | 'r1_purchase_cpa_title' | 'r1_purchase_cpa_other_goal_rationale'
  | 'r2_spend_without_results_title' | 'r2_cost_worsening_title' | 'r2_rationale'
  | 'r3_controlled_test_title' | 'r3_rationale';

type StrategySuccessConditionKey =
  | 'recheck_deterioration_same_window'
  | 'results_improve_with_spend_change'
  | 'cost_per_result_recovers'
  | 'controlled_test_preserves_improvement';

type StrategyWarning =
  | 'manual_suggestion_not_order'
  | 'association_not_causation'
  | 'initial_thresholds_not_commercially_validated'
  | 'purchase_cpa_is_not_configured_goal'
  | 'campaign_previous_sample_asymmetric'
  | 'attribution_unknown';

type Period = Readonly<{ from: string; to: string }>;

type StrategyEvidence = Readonly<{
  source: 'm25b_anomaly' | 'm26a_metric';
  provenanceId: string;
  metric: StrategyMetric;
  baseline: string | null;
  current: string | null;
  changePct: string | null;
  unit: 'count' | 'percent' | 'money';
  currency: string | null;
  attribution: string;
  periods: Readonly<{ baseline: Period; current: Period }>;
}>;

type StrategyOmissionReason =
  | 'no_goal_settings' | 'no_comparison' | 'incomplete_coverage'
  | 'open_or_partial_days' | 'metric_unavailable' | 'mixed_currency'
  | 'incompatible_attribution' | 'low_sample'
  | 'conflicting_critical_anomaly';

type StrategyOmission = Readonly<{
  ruleId: 'R2' | 'R3';
  level: 'account' | 'campaign';
  entityRef: string;
  reason: StrategyOmissionReason;
}>;

type StrategyRecommendation = Readonly<{
  id: string;
  ruleId: StrategyRuleId;
  rulesVersion: string;
  entity: Readonly<{
    level: 'account' | 'campaign';
    entityRef: string;
    name: string | null;
  }>;
  category:
    | 'deterioration'
    | 'spend_without_result_improvement'
    | 'controlled_scale_candidate';
  action: StrategyAction;
  priority: 'high' | 'medium' | 'low';
  evidenceQuality: 'high' | 'medium';
  titleKey: StrategyMessageKey;
  rationaleKey: StrategyMessageKey;
  metrics: readonly StrategyEvidence[];
  periods: Readonly<{ baseline: Period; current: Period }>;
  warnings: readonly StrategyWarning[];
  checkPlan: Readonly<{
    metric: StrategyMetric;
    comparison: 'same_length_next_period';
    nextPeriod: Period;
    keepAttributionCompatible: boolean;
    successConditionKey: StrategySuccessConditionKey;
  }>;
}>;

type StrategyResult = Readonly<{
  contractVersion: 1;
  rulesVersion: 'meta-strategy-rules/1';
  mode: 'real' | 'synthetic_demo';
  generatedAt: string;
  status: 'ready' | 'insufficient_data';
  recommendations: readonly StrategyRecommendation[];
  omissions: readonly StrategyOmission[];
  // scopes: entidades únicas inspeccionadas; rules: pares entidad/regla con guardas
  // completas o una omisión tipada; candidates: recomendaciones antes de R4/truncado.
  evaluated: Readonly<{ scopes: number; rules: number; candidates: number }>;
  truncated: number;
}>;

type StrategyInput = Readonly<{
  generatedAt: string;
  anomalies: MetaAnomalyResult;
  objective: Readonly<{
    settings: DiagnosticSettings | null;
    window: DiagnosticWindow | null;
    account: { current: AccountMetricsRow; previous: AccountMetricsRow | null } | null;
    campaigns: readonly EntityMetricsRow[];
  }>;
}>;

type StrategyLoadErrorCode =
  | 'tenant_unavailable' | 'connection_unavailable' | 'sync_unavailable'
  | 'anomalies_unavailable' | 'settings_unavailable' | 'metrics_unavailable'
  | 'invalid_dependency_payload';

type MetaStrategyView =
  | Readonly<{ state: 'not_connected'; reason: 'missing' | 'pending_selection' | 'needs_reauth' }>
  | Readonly<{ state: 'never_synced' }>
  | Readonly<{ state: 'sync_incomplete' }>
  | Readonly<{ state: 'insufficient_data'; objectiveStatus: 'configured' | 'missing'; result: StrategyResult }>
  | Readonly<{ state: 'ready'; objectiveStatus: 'configured' | 'missing'; result: StrategyResult }>
  | Readonly<{ state: 'unavailable'; reason: StrategyLoadErrorCode }>;

type MetaStrategyLoadDeps = Readonly<{
  tenant: () => Promise<TenantContext>;
  readConnection: (ctx: TenantContext) => Promise<IntegrationConnectionRecord | null>;
  readStatus: (connectionId: string) => Promise<MetaSyncStatus | null>;
  loadAnomalies: (input: ResolvedMetaAnomalyInput) => Promise<MetaAnomalyResult>;
  readSettings: typeof readDiagnosticSettings;
  readAccountMetrics: typeof readAccountMetrics;
  readCampaignMetrics: typeof readAllEntities;
  now: () => Date;
}>;
```

Las referencias de tipos anteriores corresponden a APIs existentes: `IntegrationConnectionRecord` es el tipo de retorno de `readConnectionRecord` (`src/modules/integrations/contract/connection.ts` y `src/modules/integrations/repository/connections.ts`). `readDiagnosticSettings` y `supabaseRpc` están en `src/modules/diagnostics/eligibility.ts`; `readAccountMetrics`, `readAllEntities` y `Rpc` están en `src/modules/diagnostics/repository.ts`. `readAccountMetrics(rpc, { connectionId, window, metricRef })` devuelve `{ current, previous }`; `readAllEntities(rpc, { connectionId, level: 'campaign', window, comparison, metricRef, pageSize? })` devuelve `{ rows, pages }`. Las dependencias inyectadas conservan esas firmas. `compatibleAttribution` está implementada como función privada en `src/modules/diagnostics/evidence.ts`; solo puede exportarse desde allí y desde el índice si el plan demuestra que hace falta, sin copiar ni cambiar su regla.

Los arrays anteriores son catálogos cerrados y sus schemas Zod son estrictos. Ninguna métrica serializable usa `number` o `bigint`. Los UUID internos pueden existir solo dentro de `StrategyInput`/`entityRef`; la proyección de UI no los serializa al DOM, URL o logs.

El ID es `strat_` más un hash estable del canonical string `rulesVersion|ruleId|level|entityRef|objectiveMetricRef|baseline.from|baseline.to|current.from|current.to|sourceKey`. Para R1, `sourceKey` incluye obligatoriamente `MetaAnomaly.id`, `metric` y `ruleId`; para R2/R3 incluye la métrica objetivo. Así dos anomalías R1 distintas de la misma entidad y período no colisionan. Nombre y `generatedAt` no participan. `evidenceQuality` mide completitud/muestra/compatibilidad, no probabilidad de éxito. Una regla no activada incrementa `evaluated.rules` solo si sus guardas fueron evaluables y no crea omisión. `truncated` cuenta candidatos `medium/low` excluidos después de R4.

`nextPeriod` se deriva sin reloj: comienza el día posterior a `current.to` y conserva exactamente la cantidad inclusiva de días de `current`. Las fechas se operan como ISO `YYYY-MM-DD` UTC; un período inválido es rechazo de contrato, no corrección silenciosa.

### Vista y adaptador

```ts
loadMetaStrategyView(
  options: Readonly<{ mode: 'real' | 'synthetic_demo' }>,
  injected?: Partial<MetaStrategyLoadDeps>,
): Promise<MetaStrategyView>
```

`MetaStrategyView` es una unión cerrada: `not_connected` —con `missing`, `pending_selection` o `needs_reauth`—, `never_synced`, `sync_incomplete`, `insufficient_data`, `ready` y `unavailable`. Solo `ready`/`insufficient_data` llevan `StrategyResult`; pueden llevar `objectiveStatus: 'configured' | 'missing'` para conservar R1 cuando R2/R3 no son evaluables.

En `synthetic_demo`, la primera instrucción del loader devuelve `createMetaStrategyDemo()`: ocurre antes de construir o mezclar dependencias y antes de K01, conexión, reloj, Data API o RPC. El fixture valida el mismo `MetaStrategyView` y `StrategyResult`, contiene solo datos ficticios y tiene `mode: 'synthetic_demo'`. En `real`, el resultado siempre tiene `mode: 'real'`.

Flujo real:

1. construir K01 y el cliente Supabase autenticado;
2. leer una vez la conexión Meta visible y el resumen de sync;
3. si no existe un resumen, devolver `never_synced`; de lo contrario, exigir que los niveles `account` y `campaign` del mismo resumen estén ambos en estado `complete`; si cualquiera de los dos tiene otro estado (`pending`, `incomplete`, `failed` o `not_attempted`), devolver `sync_incomplete` sin cargar anomalías, configuración ni métricas;
4. tomar `window_to` del resumen validado;
5. obtener M25b mediante un helper extraído que reutiliza conexión/resumen y conserva la API pública anterior;
6. leer `diagnostic_settings`; si existe, leer cuenta 28+28 y campañas paginadas;
7. validar con esquemas existentes y construir `StrategyInput`;
8. ejecutar el motor puro y proyectar errores a `unavailable`, sin mensajes PostgREST.

El bloqueo por sincronización incompleta es deliberadamente conservador: no se genera ninguna recomendación, tampoco de cuenta o desde anomalías, mientras falte cobertura completa de cualquiera de esos niveles. No se intenta inferir qué campañas faltan a partir de las filas parciales; se reintenta después de una sincronización completa. Así, `sync_incomplete` no lleva `StrategyResult` y ningún dato parcial puede activar R1, R2 o R3.

La extracción M25b tiene esta firma normativa y conserva `loadMetaAnomalyView` sin cambios de conducta:

```ts
type ResolvedMetaAnomalyInput = Readonly<{
  connectionId: string;
  summary: NonNullable<MetaSyncStatus['summary']>;
  generatedAt: string;
}>;

loadMetaAnomalyResultForResolvedSync(
  input: ResolvedMetaAnomalyInput,
  injected?: Pick<MetaAnomalyLoadDeps, 'readCoverage'>,
): Promise<MetaAnomalyResult>;
```

Puede exportarse `readDiagnosticSettings`, `supabaseRpc` y `compatibleAttribution` desde diagnóstico, con pruebas de regresión, solo si el plan demuestra que se usan. Nunca se copian sus reglas.

#### Proyección de compatibilidad con el contrato vigente

Para cuenta, se comparan las dos filas `AccountMetricsRow`: `mixed` en cualquiera produce `mixed_currency` o `incompatible_attribution`; dos monedas no nulas diferentes producen `mixed_currency`; dos referencias `attr_*` diferentes producen `incompatible_attribution`; `unknown` es compatible únicamente con `unknown` y agrega `attribution_unknown`.

Para campaña, la RPC entrega una moneda/atribución consolidada y variaciones que ya aplicaron compatibilidad. El motor usa esta precedencia cerrada, sin inferir una causa que el contrato no demuestra:

1. campo requerido ausente, incluido `prev_spend`, `prev_result_count` o cualquiera de los dos costos: `metric_unavailable`;
2. `currency === 'mixed'`, o ambos gastos son positivos/calculables y `var_spend === null`: `mixed_currency`;
3. `attribution === 'mixed'`, o ambos costos son positivos/calculables, `var_spend !== null` y `var_cost_per_result === null`: `incompatible_attribution`;
4. atribución `unknown`: evaluable con warning `attribution_unknown` solo cuando los costos/variación requeridos son calculables; nunca se declara compatible con una referencia conocida;
5. cualquier otro `null` de variación: `metric_unavailable`.

La prioridad evita confundir dato faltante con incompatibilidad. Si una causa histórica no es demostrable con estos campos, se informa `metric_unavailable`; no se amplía SQL/RPC. Las pruebas cubren cada rama contra fixtures que reflejan exactamente la salida de `0022`.

#### Prioridad total de omisiones

Cuando una misma entidad y regla R2/R3 incumple más de una guarda, se emite una sola omisión: gana la primera razón aplicable de este orden. `no_goal_settings` tiene prioridad sobre `low_sample` por decisión expresa del usuario. El resto del orden es una propuesta técnica conservadora: primero falta de contexto/ventana, luego cobertura y calculabilidad, después incompatibilidad de datos, el bloqueo explícito de R3 y, por último, tamaño de muestra.

1. `no_goal_settings`;
2. `no_comparison`;
3. `incomplete_coverage`;
4. `open_or_partial_days`;
5. `metric_unavailable`;
6. `mixed_currency`;
7. `incompatible_attribution`;
8. `conflicting_critical_anomaly` (solo R3);
9. `low_sample`.

Esta prioridad solo escoge la razón principal de omisión para R2/R3; no convierte una omisión en recomendación ni altera R1. Si falta objetivo, R1 puede seguir mostrándose con las restricciones de CPA definidas arriba, mientras R2/R3 se omiten con `no_goal_settings`. La compatibilidad interna de filas de campaña mantiene además la precedencia específica de la sección anterior; su razón resultante participa después en este orden general.

### Reglas `META_STRATEGY_RULES_V1`

| Parámetro | Valor inicial |
|---|---:|
| `spendIncreasePct` | 30 |
| `costPerResultWorseningPct` | 25 |
| `costPerResultImprovementPct` | 25 |
| `minimumImpressions` | 1000 |
| `minimumClicks` | 100 |
| `minimumResults` | 30 |
| `maxNonHighRecommendations` | 10 |

Los bordes son inclusivos y se comparan con aritmética decimal exacta. Las constantes son umbrales iniciales versionados, no comercialmente validados.

#### R1 — Deterioro detectado

- Consume una anomalía M25b de CTR, CPC, CPM, gasto o CPA de compra y conserva regla, versión, valores, 7+7, volumen, moneda, atribución y procedencia.
- Acción normal: `review`. CPA crítico usa `consider_reduce` si y solo si el objetivo configurado es compra, la moneda es única, la atribución de la anomalía es conocida y compatible y M25b entregó sus 14 observaciones; en cualquier otro caso usa `review` con el warning correspondiente.
- Con objetivo distinto de compra o ausente, CPA se rotula «CPA de compras atribuidas por Meta», aclara que no es el costo del objetivo, solo usa `review` y no alimenta R2/R3.
- Prioridad `high` para `critical` y `medium` para `warning`; no se recalcula severidad.
- Aumento de gasto aislado solo produce `review` de distribución.

#### R2 — Gasto sin mejora compatible

- Requiere objetivo configurado; cuenta 28+28 completa; cero días abiertos/parciales/no observados; moneda única/igual; atribución compatible; gasto anterior mayor que cero; resultados actuales/previos calculables; muestra suficiente.
- Campaña exige 28 días actuales, cero abiertos, 1.000 impresiones, 100 clics, 30 resultados actuales, al menos 30 previos y costo/gasto previo calculable. No exige impresiones/clics previos y declara esa asimetría.
- Activa si `gasto_actual >= gasto_previo × 1,30` y `resultado_actual <= resultado_previo`, o si `costo_actual >= costo_previo × 1,25`.
- Una R2 que supera todas las guardas usa siempre `consider_reduce`, prioridad `high` y calidad `high`. Si falla cualquier guarda se omite; nunca degrada a `review`. Nunca indica monto o porcentaje.
- Fallas de guardas producen omisión tipada, no recomendación.

#### R3 — Candidato a prueba controlada

- Usa las mismas guardas de R2, gasto actual positivo y ausencia de anomalía crítica M25b para la entidad.
- Activa si `costo_actual <= costo_previo × 0,75`, con ambos costos positivos y resultado suficiente.
- Acción `consider_controlled_test`, prioridad `low`; propone prueba manual acotada, mantener el resto estable y comparar un período posterior de igual longitud.
- No llama «ganadora» a la entidad, no promete ventas y no fija monto o porcentaje.

#### R4 — Combinación, orden y truncamiento

- No coexisten acciones contradictorias para entidad/objetivo/período.
- R2 prevalece sobre R1 cuando producirían la misma acción adversa; agrega la evidencia M25b.
- Una anomalía crítica bloquea R3 y genera `conflicting_critical_anomaly`.
- Orden: prioridad, calidad, R2/R1/R3, nivel cuenta/campaña, magnitud exacta descendente e ID ascendente.
- Devuelve todas las `high` y hasta diez `medium/low`; el excedente se cuenta en `truncated`.

### Prioridad, evidencia y plan de comprobación

La matriz es total:

| Regla/caso | Acción | Prioridad | Calidad | Warning u omisión |
|---|---|---|---|---|
| R1 CTR/CPC/CPM/gasto `warning` | `review` | `medium` | `medium` | warnings generales |
| R1 CTR/CPC/CPM/gasto `critical` | `review` | `high` | `medium` | warnings generales |
| R1 CPA compra `warning` | `review` | `medium` | `high` si moneda/atribución compatibles; si no, `medium` | atribución desconocida cuando aplique |
| R1 CPA compra `critical`, objetivo compra y evidencia compatible | `consider_reduce` | `high` | `high` | warnings generales |
| R1 CPA compra con objetivo ausente/distinto o incompatibilidad | `review` | `high` si `critical`, `medium` si `warning` | `medium` | `purchase_cpa_is_not_configured_goal` o `attribution_unknown` |
| R2 con todas las guardas | `consider_reduce` | `high` | `high` | asimetría de campaña cuando aplique |
| R2 con una guarda fallida | ninguna | ninguna | ninguna | omisión tipada según precedencia |
| R3 con todas las guardas y sin crítica | `consider_controlled_test` | `low` | `high` | asimetría de campaña cuando aplique |
| R3 con guarda fallida o crítica | ninguna | ninguna | ninguna | omisión tipada; la crítica usa `conflicting_critical_anomaly` |

Todas las recomendaciones incluyen `manual_suggestion_not_order`, `association_not_causation` e `initial_thresholds_not_commercially_validated`. No existe calidad inferior a `medium`: una evidencia insuficiente para el caso se omite.

Cada recomendación incluye métrica principal/control, períodos usados, próximo período de igual longitud, condición de éxito de catálogo, compatibilidad de moneda/objetivo/atribución y advertencia de que asociación temporal no demuestra causalidad. M26b no guarda decisiones ni resultados posteriores.

### Seguridad, errores, rendimiento y reversibilidad

- K01 se construye en servidor; no se aceptan `company_id`, conexión, entidad u objetivo del cliente.
- Lecturas con JWT/RLS; no se usa `worker_api`.
- No se registran secretos, tokens, IDs externos completos, nombres, métricas, payloads o errores de proveedor.
- Ausencia, cero, regla no activada, parcial, no observado, muestra baja, incompatibilidad y error son estados distintos.
- No se calculan reglas con días abiertos, moneda mixta o atribución incompatible.
- Máximo: K01, conexión/resumen, lecturas M25b, configuración, cuenta y páginas de campañas. No lee adsets, anuncios, desgloses, Tiendanube, GA4 o modelos.
- Se mide 500 campañas × 56 días, sin fijar SLA previo; evidencia duración, páginas, conteos y ausencia de truncado.
- Al no escribir, reintentar es idempotente y revertir código elimina la función sin migración.

### Interfaz y frontera de demo

La página server-only autorizada `/app/estrategias` exige sesión. Sin el parámetro de consulta de demo, selecciona explícitamente `mode: 'real'`; un enlace visible «Ver demo técnica» navega a `/app/estrategias?ejemplo=1`, que selecciona `mode: 'synthetic_demo'` al procesar `searchParams` en el servidor, con el mismo patrón de `/app/anomalias?ejemplo=1`. No se crea una página ni una ruta adicional. Cualquier valor distinto de `ejemplo=1` conserva el modo real. El parámetro no acepta un modo arbitrario, `company_id`, ID de cuenta, objetivo o entidad; la sesión se exige en ambos modos.

La UI no vuelve a evaluar R1, R2 o R3; no cambia prioridad, acción, evidencia, omisiones, orden ni `truncated`. Los textos visibles proceden únicamente de las claves cerradas del contrato. Los nombres externos se renderizan como texto y el UUID/`entityRef` nunca se usa como contenido, atributo, URL o identificador de analytics.

| Estado | Presentación requerida |
|---|---|
| `not_connected` | Mensaje específico para `missing`, `pending_selection` o `needs_reauth`; no afirma falta de actividad |
| `never_synced` | Aún no existe una importación utilizable |
| `sync_incomplete` | Cobertura parcial/abierta, nunca convertida a cero |
| `insufficient_data` | Omisiones y reglas no evaluables sin declarar salud o fracaso |
| `ready` con recomendaciones | Tarjetas en el orden exacto del motor |
| `ready` vacío | Ninguna regla se activó entre las evaluables; no declara que la cuenta esté saludable |
| `unavailable` | Mensaje cerrado y recuperable, sin payload ni detalle sensible |

Sin objetivo, R1 permanece visible si existe evidencia; R2/R3 aparecen como no evaluadas y se enlaza a Diagnóstico sin guardar configuración. Cada tarjeta muestra nivel/nombre, prioridad, calidad, regla/versión, acción manual, razón, evidencia exacta, períodos, procedencia, warnings y check plan. La asimetría de campaña y «CPA de compras atribuidas por Meta» se muestran cuando correspondan.

La demo contiene un banner persistente «Datos ficticios — demo técnica», explica que no prueba valor comercial y ofrece retorno inequívoco mediante un enlace a `/app/estrategias` sin el parámetro `ejemplo`. No contiene UUID, nombres, montos o identificadores reales. Prioridad, acción y calidad no dependen solo del color; encabezados, listas, avisos, enlaces y foco son operables por teclado.

### Secuencia TDD

1. contrato/reglas en rojo;
2. contrato, decimal y motor hasta verde;
3. regresiones M25b/M26a antes de extraer helpers;
4. prueba app remota real en rojo y luego adaptador;
5. focalizadas de motor/adaptador, suites remotas, rendimiento y evidencia del checkpoint;
6. aprobación expresa de `G-STRATEGY-ENGINE` y pedido expreso para continuar;
7. componentes en rojo para estados, tarjetas, sesión, accesibilidad y demo;
8. fixture demo, página, navegación e integración sin recalcular;
9. regresión completa de motor, adaptador, RLS, seguridad y cero escrituras;
10. recorridos real/demo, revisiones, evidencia y decisión separada sobre `G-STRATEGIES`.

La prueba app no puede convertirse en prueba con dependencias inyectadas. Las unitarias del loader sí pueden inyectarlas para estados/error.

## Archivos previstos

| Archivo | Acción | Para qué | Autorizado por |
|---|---|---|---|
| `src/modules/strategies/contract.ts` | Nuevo | Contratos Zod/tipos | II.14d |
| `src/modules/strategies/rules.ts` | Nuevo | Constantes, catálogo y mensajes cerrados | II.14d |
| `src/modules/strategies/engine.ts` | Nuevo | Motor puro R1–R4 | II.14d |
| `src/modules/strategies/load.ts` | Nuevo | Adaptador server-only | II.14d |
| `src/modules/strategies/index.ts` | Nuevo | Exportaciones públicas | II.14d |
| `src/modules/anomalies/{load,index}.ts` | Modificados | Helper reusable sin cambiar conducta | II.14d |
| `src/modules/diagnostics/{eligibility,evidence,index}.ts` | Modificados | Exports compatibles existentes | II.14d |
| `tests/unit/meta-strategies.test.ts` | Nuevo | Contrato/reglas/loader | II.14d |
| `tests/unit/meta-anomalies.test.ts` | Modificado | Regresión helper M25b | II.14d |
| `tests/unit/diagnostics-evidence.test.ts` | Modificado | Regresión exports M26a | II.14d |
| `tests/app/meta-strategies.test.ts` | Nuevo | Data API, tenant, RLS, cero escrituras, rendimiento | II.14d |
| `src/modules/strategies/demo.ts` | Nuevo | Fixture sintético exclusivo y estable | II.14d |
| `src/app/(app)/app/estrategias/page.tsx` | Nuevo | Página protegida e integración server-only | II.14d |
| `src/components/app/estrategias.tsx` | Nuevo | Estados y tarjetas accesibles | II.14d |
| `src/components/app/estrategias.module.css` | Nuevo | Estilos de la pantalla | II.14d |
| `src/components/app/shell.tsx` | Modificado | Navegación a Estrategias | II.14d |
| `tests/component/app-estrategias.test.tsx` | Nuevo | Estados, tarjetas, accesibilidad, warnings y demo | II.14d |
| `tests/component/app-paginas-sesion.test.tsx` | Modificado | Sesión y navegación de la ruta | II.14d |
| `docs/ARCHITECTURE.md` | Modificado al existir el módulo | Componente/flujo existente | II.14d |
| `docs/PROJECT_STATE.md` | Modificado al cambiar estado/gate | Estado operativo | II.14d |
| `docs/HALLAZGOS.md` | Condicional | Solo hallazgo nuevo | II.14d |
| `docs/FASES/FASE1/M26b/{spec.md,plan.md,revisiones/*.md,sesiones/M26b.md}` | Nuevos según pipeline | Documentación y evidencia única | II.14d / precondiciones de ruta |

No se autoriza ningún archivo fuera de esta tabla y los artefactos temporales globales del pipeline. Si hiciera falta, se detiene la microfase.

## Criterios de aceptación

### Heredados de la ruta

| ID | Exigencia aplicable |
|---|---|
| CA-82 | Contrato versionado, salida determinística y decimal; sin LLM. |
| CA-83 | R1 reutiliza M25b 7+7 y conserva procedencia. |
| CA-84 | R2/R3 30/25/25, muestra/ventanas, bloqueo crítico e historial propio. |
| CA-85 | Acciones manuales cerradas; sin monto, porcentaje o promesa. |
| CA-86 | Objetivo ausente y CPA de compras tratados sin sustituir objetivo. |
| CA-87 | Todas las `high`, diez `medium/low`, orden y `truncated`. |
| CA-88 | Evidencia, limitaciones y plan; sin seguimiento persistente. |
| CA-89 | Estados honestos y no invención. |
| CA-90 | Tenant server-side, RLS, solo lectura, sin SQL/chat/Meta nuevo. |
| CA-91 | Pruebas unitarias/remotas, precisión, aislamiento, cero escrituras y rendimiento. |

### Operativos de M26b

| ID | Criterio verificable | Traza |
|---|---|---|
| M26b-C-02 | Contrato Zod estricto, versionado, serializable, sin UI/Next/Supabase/HTTP y sin `bigint`/`number` para métricas | CA-82 |
| M26b-C-03 | Mismo input completo produce mismo resultado, IDs, orden, omisiones y truncado; el motor no lee reloj ni estado global | CA-82 |
| M26b-C-04 | R1 consume `MetaAnomalyResult`; conserva versión, regla, severidad, valores, 7+7 y omisiones sin reimplementar M25b | CA-83 |
| M26b-C-05 | Gasto aislado solo genera `review`; CPA crítico usa `consider_reduce` solo con objetivo compra, y con otro/sin objetivo se rotula y limita a `review` | CA-85/86 |
| M26b-C-06 | R2 solo se evalúa con objetivo válido, sincronización completa de cuenta y campaña, cuenta 28+28 completa y campaña actual completa; la muestra previa asimétrica queda visible y los datos insuficientes se omiten | CA-84 |
| M26b-C-07 | R2/R3 usan 30/25/25 y pisos 1000/100/30 con bordes inclusivos; acciones manuales sin monto ni porcentaje de presupuesto | CA-84/85 |
| M26b-C-08 | R3 solo se evalúa con las mismas guardas, mejora aprobada y sin anomalía crítica de la entidad; no promete éxito | CA-84/85 |
| M26b-C-09 | Cuenta y campaña usan su propio historial; no hay ranking entre empresas, benchmarks ni comparación de objetivos distintos | CA-84 |
| M26b-C-10 | Precedencia, deduplicación, prioridad, calidad y orden son estables; ninguna `high` se trunca, se muestran hasta 10 `medium/low` y el resto se cuenta | CA-87 |
| M26b-C-11 | Cada tarjeta conserva evidencia exacta, procedencia, dos períodos, advertencias, acción y plan de comprobación | CA-82/88 |
| M26b-C-12 | Ausencia, cero, regla no activada, cobertura parcial/abierta, muestra baja, moneda mixta, atribución incompatible, conflicto y error son estados distintos | CA-89 |
| M26b-C-13 | El adaptador resuelve K01/conexión/resumen una vez, reutiliza helpers/RPC existentes y no acepta IDs ni objetivo del cliente | CA-90 |
| M26b-C-14 | No hay LLM, consulta a Meta, `worker_api`, escritura, persistencia, migración, RPC ni función SQL nueva; el seguimiento queda en una sucesora | CA-90; DEC-26 |
| M26b-C-15 | La UI muestra todos los estados; sin objetivo conserva R1, marca R2/R3 no evaluadas y enlaza a Diagnóstico sin guardar configuración | CA-86/89/92 |
| M26b-C-17 | La demo obligatoria corta antes de K01 y toda lectura, usa solo fixture ficticio y tiene banner/retorno inequívocos | CA-90/93 |
| M26b-C-18 | Un usuario A no obtiene configuración, métricas, nombres ni recomendaciones de B en el desechable; anónimo no ejecuta RPC | CA-90/91 |
| M26b-C-20 | El recorrido máximo se mide sin truncar campañas ni registrar datos sensibles; errores usan clases cerradas | CA-91 |
| M26b-C-22 | `G-STRATEGIES` exige checkpoint `G-STRATEGY-ENGINE`, `G-ANOMALIES`, todas las pruebas, recorrido real y demo; puede cerrar sin señal suficiente solo registrando «sin validación comercial» | CA-94 |

### Criterios transversales

| ID | Criterio verificable | Traza |
|---|---|---|
| M26b-C-01 | M26b no empieza sin enmienda, spec y plan únicos aprobados; la excepción de tamaño, el checkpoint interno y `G-STRATEGIES` coinciden con la ruta | DEC-26; gates de ruta |
| M26b-C-16 | UUIDs internos no se muestran ni aparecen en URL/DOM/logs; nombres externos solo se renderizan como texto | CA-90/92 |
| M26b-C-19 | Tiendanube/GA4/chat no entran al input ni cambian salida; chat queda en backlog sin ID y ningún LLM altera la salida | DEC-26; fuera de alcance |
| M26b-C-21 | Todos los archivos del diff están en la ruta enmendada; no cambian contratos de M25b/M26a salvo exports/helpers compatibles | II.14d |

## Casos de prueba

### Matriz completa

| ID | Criterios | Tipo | Comando | Resultado esperado | ¿Falla sin implementación? |
|---|---|---|---|---|---|
| M26b-T-01 | C-02 | unit | `npm run test:unit -- tests/unit/meta-strategies.test.ts` | Zod rechaza campos extra, enums/decimales inválidos y contratos no serializables | Sí |
| M26b-T-02 | C-03 | unit | mismo | Dos ejecuciones del mismo input dan igualdad profunda; cambiar solo nombre no cambia regla/ID | Sí |
| M26b-T-03 | C-04 | unit | mismo | Warning/critical de cada métrica M25b mapea una vez y conserva toda evidencia/versiones | Sí |
| M26b-T-04 | C-04, C-12 | unit | mismo | Scope omitido por M25b no se reconstruye; ausencia no se vuelve cero | Sí |
| M26b-T-05 | C-05, C-07 | unit | mismo | Gasto aislado produce `review`; CPA crítico compra puede reducir y con objetivo distinto/sin objetivo solo revisa con warning | Sí |
| M26b-T-06 | C-06, C-07 | unit | mismo | R2 activa exactamente en cada borde inclusivo aprobado para cuenta y campaña | Sí |
| M26b-T-07 | C-06, C-12 | unit | `npm run test:unit -- tests/unit/meta-strategies.test.ts` | R2/R3 omiten por cada guarda fallida. Cuando fallan varias para la misma entidad/regla, una sola omisión usa la primera razón según la prioridad total; se comprueba explícitamente que falta de objetivo preceda a muestra insuficiente y las precedencias restantes también se verifican | Sí |
| M26b-T-08 | C-06, C-09 | unit | mismo | Campaña exige 28 días actuales, 0 abiertos, 1000/100/30, ≥30 resultados previos y costo/gasto previo; tarjeta declara asimetría | Sí |
| M26b-T-09 | C-08 | unit | mismo | R3 activa exactamente en el borde aprobado con evidencia suficiente | Sí |
| M26b-T-10 | C-08, C-12 | unit | mismo | Cada anomalía crítica de la entidad bloquea R3 con omisión tipada | Sí |
| M26b-T-11 | C-10 | unit | mismo | R2/R1 se fusionan, acciones opuestas no coexisten y precedencia es estable | Sí |
| M26b-T-12 | C-10 | unit | mismo | Orden total, todas las `high`, hasta 10 `medium/low` y conteo `truncated` exacto | Sí |
| M26b-T-13 | C-02, C-07, C-10 | unit | mismo | Decimales/enteros mayores a `MAX_SAFE_INTEGER` y bordes no pierden precisión | Sí |
| M26b-T-14 | C-11 | unit | mismo | Cada tarjeta valida procedencia, períodos, mensajes cerrados, warning y check plan | Sí |
| M26b-T-15 | C-12 | unit | mismo | Regla no activada difiere de omisión y de error; status listo vacío no afirma salud | Sí |
| M26b-T-16 | C-13, C-21 | unit | `npm run test:unit -- tests/unit/meta-anomalies.test.ts tests/unit/diagnostics-evidence.test.ts` | Loaders M25b y helpers M26a conservan resultados previos después de extraer exports | No: regresión |
| M26b-T-17 | C-13, C-14 | unit | `npm run test:unit -- tests/unit/meta-strategies.test.ts` | Loader inyectado resuelve una conexión, usa solo lecturas admitidas y proyecta cada fallo; para cada estado no completo de `account` o `campaign` devuelve `sync_incomplete` antes de invocar loader de anomalías, configuración o métricas | Sí |
| M26b-T-18 | C-15 | component | `npm run test:component -- tests/component/app-estrategias.test.tsx` | Todos los estados; sin objetivo muestra R1, R2/R3 no evaluadas y CTA a Diagnóstico | Sí |
| M26b-T-19 | C-11, C-15, C-16 | component | mismo | Tarjetas accesibles muestran catálogo/evidencia/límites sin UUID ni HTML externo | Sí |
| M26b-T-20 | C-17 | unit/component | Ejecutar ambas invocaciones, cada una con salida 0: `npm run test:unit -- tests/unit/meta-strategies.test.ts`; `npm run test:component -- tests/component/app-estrategias.test.tsx` | `/app/estrategias?ejemplo=1` selecciona la demo sin llamar dependencias reales; se muestran datos ficticios, banner y retorno a `/app/estrategias` | Sí |
| M26b-T-21 | C-15 | component | `npm run test:component -- tests/component/app-paginas-sesion.test.tsx` | `/app/estrategias` exige sesión y la navegación activa es correcta | Sí |
| M26b-T-22 | C-18 | app | `npm run db:check:test` y `npm run test:app -- tests/app/meta-strategies.test.ts` | Usuario A ve solo su input/salida; B y anónimo no leen ni ejecutan RPC ajena | Sí |
| M26b-T-23 | C-13, C-14, C-18 | app | mismo | Adaptador usa Data API/RPC reales, conexión de K01 y no crea/modifica filas ni llama `worker_api` | Sí |
| M26b-T-24 | C-04, C-06, C-08 | app | mismo | Fixture sintético real produce juntas R1 7+7 y R2/R3 28+28 con procedencia correcta | Sí |
| M26b-T-25 | C-02, C-19 | unit/app | `npm run test:unit -- tests/unit/meta-strategies.test.ts -t "fronteras excluidas"` y `npm run test:app -- tests/app/meta-strategies.test.ts -t "sin dependencias ajenas"` | El schema rechaza campos TN/GA4/chat dentro del input y el adaptador no posee ni invoca dependencias de esas fuentes | Sí |
| M26b-T-26 | C-20 | app | `npm run test:app -- tests/app/meta-strategies.test.ts -t "500 campañas por 56 días"` | Sin truncado; la prueba registra duración, páginas y conteos, nunca payloads | Sí |
| M26b-T-27 | C-14, C-19, C-21 | manual | `npm run test:policies`; `npm run verify`; `git diff --check`; `rg -n "service_role|worker_api|anthropic|deepinfra|company_id" src/modules/strategies src/app tests` | Regresiones pasan; toda coincidencia se justifica o falla; cero SQL/migraciones/LLM/escrituras/secretos y solo archivos autorizados | Parcial/manual |
| M26b-T-28 | C-15, C-17, C-22 | manual | recorrido autenticado real y demo | Ambos recorridos completos; si falta señal real se registra «sin validación comercial» | Sí |
| M26b-T-29 | C-01, C-21, C-22 | manual | auditorías, hashes, `git status --short` y `sesiones/M26b.md` | Spec/plan únicos aprobados, checkpoint registrado, `G-ANOMALIES` cerrado y gate final no autoaprobado | Sí |

T-02 incluye además dos anomalías R1 distintas de la misma entidad/período y verifica IDs diferentes. T-07 cubre la precedencia cerrada de omisiones de campaña y distingue `metric_unavailable`, `mixed_currency` e `incompatible_attribution` solo cuando los campos de `0022` lo demuestran.

## Verificación

- `npm run test:unit -- tests/unit/meta-strategies.test.ts`
- `npm run test:unit -- tests/unit/meta-anomalies.test.ts tests/unit/diagnostics-evidence.test.ts`
- `npm run test:component -- tests/component/app-estrategias.test.tsx tests/component/app-paginas-sesion.test.tsx`
- `npm run db:check:test`
- `npm run test:policies`
- `npm run test:app -- tests/app/meta-strategies.test.ts`
- `npm run verify`
- medición de 500 campañas × 56 días;
- `git diff --check` y búsquedas de secretos/datos reales sin leer `.env.local`.

- recorrido autenticado real y recorrido de demo sintética;
- para T-27 rigen los patrones y alcances exactos indicados en su fila.

No se ejecuta `db:push:test`, `test:eval`, una llamada real a modelos o una llamada a Meta. Una prueba requerida omitida cuenta como no ejecutada.

## Intervenciones del usuario y acciones reservadas

| Paso | Qué hace el usuario | Cómo se verifica después |
|---:|---|---|
| 1 | Aprobar esta spec solo después de auditoría APROBABLE | Estado `APROBADA` y hash de contenido |
| 2 | Aprobar el plan después de auditoría APROBABLE | Plan `APROBADO` vinculado al hash de esta spec |
| 3 | Preparar en `.env.local` las variables de test indicadas en `.env.example`, con valores del proyecto desechable y sin compartirlos por chat | Antes de cualquier prueba remota, el asistente ejecuta `npm run db:check:test`; si falta configuración o el destino no se confirma como desechable, las pruebas se detienen y se registra el bloqueo |
| 4 | Autorizar acciones Git/remotas que el plan reserve | Evidencia reproducible sin secretos |
| 5 | Aprobar `G-STRATEGY-ENGINE` después de verificar motor/adaptador | Checkpoint interno registrado; M26b sigue abierta |
| 6 | Pedir expresamente continuar con interfaz/demo dentro del mismo plan | Pedido registrado; no inicia otra microfase |
| 7 | Coordinar el recorrido autenticado real y recorrer la demo | Evidencia redactada de ambos recorridos |
| 8 | Aprobar `G-STRATEGIES` después de toda la evidencia y de `G-ANOMALIES` | Gate final registrado; M28.3a conserva todas sus dependencias |

El usuario no implementa código ni comparte secretos. No se aprueba `G-ANOMALIES` o `G-STRATEGIES` por transitividad.

## Trampas y riesgos

- Una anomalía no es una estrategia completa y un aumento de gasto no es necesariamente malo.
- Una mejora de CPA con baja muestra puede ser ruido; las guardas se aplican antes de priorizar.
- M26a devuelve impresiones/clics previos por campaña, pero D-M26b-16 los excluye deliberadamente de la guarda; ampliar la RPC sigue fuera de alcance.
- La RPC consolida moneda/atribución de campaña; la precedencia documentada nunca inventa la causa de un `null`.
- Meta atribuye resultados; no son ventas cobradas ni causalidad incremental.
- `evidenceQuality` no es probabilidad de éxito.
- El flujo conjunto 7+7 y 28+28 debe volver a medirse; la referencia M26a no es un SLA.
- Extraer helpers puede introducir regresiones aunque no cambie SQL.
- La cuenta piloto vacía permite validación técnica, no comercial.
- La excepción de tamaño aumenta el riesgo de un diff amplio; el plan debe mantener checkpoints y TDD sin volver a dividir M26b.

## Decisiones originales — registro canónico

| ID | Decisión | Motivo | Decidió | Fecha | Aplicabilidad después de la enmienda |
|---|---|---|---|---|---|
| D-M26b-01 | Crear únicamente esta spec como BORRADOR, sin roadmap ni código | Pedido expreso y condición previa al pipeline | Usuario | 2026-11-16 | Histórica; satisfecha por el borrador coordinador y superada por las enmiendas aprobadas |
| D-M26b-02 | Mantener un bloqueo `REQUIERE CAMBIO EN LA RUTA`; la spec no autoriza implementación | La ruta vigente excluye la funcionalidad general | Usuario, sobre hallazgo del asistente | 2026-11-16 | Histórica; las dos enmiendas resolvieron el cambio de ruta, pero la spec sigue sin autorizar código hasta aprobarse junto con su plan |
| D-M26b-03 | MVP read-only de Meta, determinístico, sin LLM autoritativo | Non-negotiables, INV-07/08 y alcance aprobado | Usuario + diseño propuesto | 2026-11-16 | Vigente para M26b |
| D-M26b-04 | Reusar M25b y la evidencia/lecturas de M26a; no duplicar detector ni SQL | Reducir inconsistencias y conservar procedencia | Usuario + diseño propuesto | 2026-11-16 | Vigente para motor, adaptador e interfaz |
| D-M26b-05 | Tiendanube solo como contexto futuro; GA4 condicionada a M16f; chat fuera del MVP | No atribuir sin claves ni ampliar fronteras pendientes | Usuario + diseño propuesto | 2026-11-16 | Vigente para M26b |
| D-M26b-06 | Sin persistencia ni seguimiento automático en el primer corte | Evitar migración y mantener el corte acotado | Diseño propuesto; ratificado por el usuario en D-M26b-14 | 2026-11-16 | Vigente para M26b |
| D-M26b-07 | Ubicar M26b en paralelo con M16f después de `G-DIAG`, sin GA4; permitir comenzar con M25b integrado y exigir `G-ANOMALIES` recién para cerrar `G-STRATEGIES` | Avanzar con el detector existente sin confundir código integrado con gate aprobado | Usuario | 2026-11-16 | Vigente como orden y dependencias de la ruta; el paralelismo es solo de planificación |
| D-M26b-08 | Dividir en M26b.1 (motor, adaptador y pruebas) y M26b.2 (UI, integración, pruebas y cierre del gate), sin excepción de tamaño | Respetar el límite de cada microfase y mantener cortes revisables | Usuario | 2026-11-16 | Histórica y superada expresamente por la segunda enmienda del 2026-11-16; se conserva el checkpoint para mantener revisabilidad |
| D-M26b-09 | Fijar umbrales iniciales versionados 30/25/25 y muestra actual mínima 1000 impresiones, 100 clics y 30 resultados, con bordes inclusivos | Reglas determinísticas iniciales, expresamente no validadas comercialmente | Usuario | 2026-11-16 | Vigente para motor e interfaz |
| D-M26b-10 | Usar catálogo cerrado `review`, `consider_reduce` y `consider_controlled_test`; siempre manual, con evidencia, incertidumbre y plan, sin montos, porcentajes ni promesas | Dar acciones útiles sin convertirlas en órdenes ni automatizaciones | Usuario | 2026-11-16 | Vigente para M26b |
| D-M26b-11 | Conservar todas las `high`, mostrar hasta diez `medium/low` y contar el resto en `truncated`, con orden determinístico | Evitar ruido sin ocultar señales prioritarias | Usuario | 2026-11-16 | Vigente para M26b |
| D-M26b-12 | Hacer obligatoria en M26b.2 una demo ficticia, exclusiva y rotulada; exigir demo y recorrido real para el gate | Permitir validación técnica/visual sin mezclarla con datos reales ni valor comercial | Usuario | 2026-11-16 | Vigente para la etapa de interfaz de M26b y `G-STRATEGIES`; la referencia M26b.2 es histórica |
| D-M26b-13 | Sin objetivo, mostrar R1 y un aviso; marcar R2/R3 no evaluadas y enlazar a Diagnóstico sin guardar configuración en Estrategias | Degradar honestamente sin ocultar señales válidas ni inventar objetivo | Usuario | 2026-11-16 | Vigente para motor y UI |
| D-M26b-14 | Ratificar que persistencia, aceptación/descarte, ejecución y evaluación posterior quedan para una sucesora | Mantener M26b sin migraciones ni estados persistentes | Usuario | 2026-11-16 | Vigente para M26b |
| D-M26b-15 | Dejar la integración con chat en backlog, sin ID; cualquier sucesora consulta salida verificada y el LLM nunca es autoridad | Evitar planificación prematura y preservar INV-08 | Usuario | 2026-11-16 | Vigente para M26b y cualquier propuesta sucesora |
| D-M26b-16 | Para campañas, aceptar muestra asimétrica: 28 días actuales, cero abiertos, 1000/100/30, al menos 30 resultados previos y gasto/costo previo calculable, con cuenta 28+28 completa y limitación visible | Usar el contrato vigente sin migración/RPC nueva y omitir ante insuficiencia | Usuario | 2026-11-16 | Vigente para motor e interfaz |
| D-M26b-17 | Con objetivo distinto de compra, mostrar R1 de CPA como «CPA de compras atribuidas por Meta», solo con `review`, warning y sin alimentar R2/R3 | Conservar una señal válida sin sustituir el objetivo configurado | Usuario | 2026-11-16 | Vigente para motor y UI |
| D-M26b-18 | Permitir cierre técnico sin actividad real suficiente solo con `G-ANOMALIES`, todas las pruebas, recorrido real y demo, registrando «sin validación comercial» | Separar aceptación técnica de validación comercial sin relajar seguridad ni evidencia | Usuario | 2026-11-16 | Vigente para M26b y `G-STRATEGIES` |

## Decisiones de la segunda enmienda

| ID | Decisión | Motivo | Decidió | Fecha |
|---|---|---|---|---|
| D-EM26b-U-01 | M26b vuelve a ser una sola microfase con una sola spec y un solo plan | Evitar dos unidades documentales y ejecutar el alcance como un corte coordinado | Usuario | 2026-11-16 |
| D-EM26b-U-02 | Aprobar una excepción expresa al límite de ocho horas; D-M26b-08 queda histórica y superada | Conservar todos los requisitos, decisiones y pruebas sin volver a dividir el alcance | Usuario | 2026-11-16 |
| D-EM26b-U-03 | `G-STRATEGY-ENGINE` se conserva como checkpoint interno y `G-STRATEGIES` como único gate final | Mantener una revisión intermedia del motor sin crear una segunda microfase | Usuario | 2026-11-16 |

## Supuestos e hipótesis

- **M26b-H-01 — verificada documentalmente:** cuenta/campañas 28+28 se leen sin RPC nueva; falta probar el recorrido combinado remoto.
- **M26b-H-02 — parcial:** objetivo y compatibilidad se leen con código existente; los tipos de objetivo se prueban en los casos unitarios/app.
- **M26b-H-03 — no verificada:** 500 campañas × 56 días caben en el request; T-26 lo mide y una falla obliga a hallazgo/pausa.
- **M26b-H-04 — limitación aceptada:** la muestra histórica de campaña es asimétrica; T-08 y la salida lo declaran.

## Preguntas abiertas

Ninguna. La spec permanece `BORRADOR` hasta una nueva auditoría de esta versión unificada y su aprobación expresa.

## Hallazgos relacionados

- `H-E1-228`: el texto libre del chat no es autoridad.
- `H-E1-238`: límites de joins GA4 refuerzan su exclusión del input.
- `H-E1-242`: la evaluación paga M26a no bloquea un motor sin LLM, pero no aporta validación comercial.
- `H-E1-258`: el fixture máximo anterior no es un SLA; M26b mide el flujo propio.
- `G-ANOMALIES` permanece pendiente; no bloquea el checkpoint `G-STRATEGY-ENGINE`, sí `G-STRATEGIES`.

## Auditorías

- [`revisiones/spec-audit-1.md`](revisiones/spec-audit-1.md): auditoría de la spec intermedia M26b.1, `REQUIERE CORRECCIONES`. Esta unificación incorpora A-01 a A-07, pero el dictamen no se transfiere: la spec M26b debe auditarse de nuevo.
