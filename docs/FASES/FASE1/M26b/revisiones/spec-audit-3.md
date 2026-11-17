# Auditoría de spec — M26b

**Fecha:** 2026-11-16
**Commit base:** `75fddd3`
**Hash de contenido de la spec sin la línea `Estado`:** `5fd2789a9ef876825f2e2a1599cc483e187db396`
**Estado de la spec:** `BORRADOR`

## Veredicto

**APROBABLE.** A-08, A-09 y A-10 están resueltos sin contradecir la segunda enmienda ni reabrir decisiones. M26b conserva una sola spec y un solo plan. La especificación prioriza evitar recomendaciones con datos incompletos, refiere un tipo entregado por el código y asigna la preparación segura del entorno desechable.

No se repitió `npm run verify` ni las pruebas remotas para no reiterar comprobaciones potencialmente bloqueantes. Se tomó como evidencia de baseline el resultado de `npm run verify` documentado en `spec-audit-1.md`: exit 0 en `75fddd3`, el mismo commit base, cuya implementación no cambió. No se leyó `.env.local`.

## Checklist

| # | Ítem | Resultado | Evidencia |
|---:|---|---|---|
| 1 | Trazabilidad de los CA de la ficha | PASS | La tabla «Heredados de la ruta» cubre CA-82 a CA-91; C-15, C-17 y C-22 referencian CA-92 a CA-94. Coinciden con la ficha M26b y §16b. |
| 2 | Alcance contra ficha y Parte II | PASS | Objetivo, alcance, archivos y etapas coinciden con la ficha y II.14d; se conserva un solo ID, una spec y un plan. |
| 3 | Coherencia con spec general y sucesoras | PASS | DEC-26, CA-82 a CA-94, CB-06 y las dependencias de M28.3a coinciden con la ruta vigente. |
| 4 | Decisiones de la microfase | PASS | Están las 18 decisiones D-M26b-01 a D-M26b-18, con autor, motivo y fecha. D-M26b-08 figura histórica y superada según la segunda enmienda. |
| 5 | Trampas de la Parte II | PASS | «Trampas y riesgos» recoge las limitaciones de evidencia, muestra, atribución, alcance, rendimiento y validación comercial. |
| 6 | Intervenciones y acciones reservadas | PASS | La spec asigna al usuario la preparación local de variables del proyecto desechable y establece `db:check:test` como preflight, sin solicitar secretos en el chat. Las demás intervenciones coinciden con III.2. |
| 7 | Verificación exigida y CB-06 | PASS | Incluye las suites de III.3 y establece que una prueba requerida omitida cuenta como no ejecutada. Los scripts citados existen en `package.json`. |
| 8 | Dependencias y rama base | PASS | `PROJECT_STATE.md` registra `G-DIAG` cerrado y M25b integrado. `G-ANOMALIES` no es requisito para iniciar M26b ni para el checkpoint interno. |
| 9 | Interfaces entregadas de dependencias | PASS | `IntegrationConnectionRecord` coincide con el tipo retornado por `readConnectionRecord`; las firmas de lectura citadas coinciden con los módulos de diagnóstico existentes. |
| 10 | Pendientes y hallazgos | PASS | H-E1-228/238/242/258 están tratados; `G-ANOMALIES` se difiere correctamente al gate final. |
| 11 | Contexto real | PASS | Las referencias a `src/modules/anomalies/`, `src/modules/diagnostics/`, `src/modules/integrations/` y la migración `0022` describen interfaces existentes; la demo y la UI están declaradas como nuevas. |
| 12 | Archivos previstos | PASS | Los archivos están autorizados por II.14d o son de seguimiento; `ARCHITECTURE.md` y `PROJECT_STATE.md` se condicionan a los cambios que les corresponden. |
| 13 | Diseño suficiente | PASS | A-08 define que sin resumen se devuelve `never_synced`; si `account` o `campaign` no está `complete`, se devuelve `sync_incomplete` antes de cargar anomalías, configuración o métricas. A-09 usa el tipo real. |
| 14 | Criterios y casos verificables | PASS | Los 22 criterios aparecen en al menos un caso. T-17 ahora prueba estados incompletos de ambos niveles y que no se invoquen loaders ni lecturas; comandos y resultados esperados están definidos. |
| 15 | Sin nada abierto | PASS | «Preguntas abiertas» está vacía; hipótesis pendientes tienen pruebas o pasos y condiciones de parada explícitos. |
| 16 | Ejecutable ahora / baseline | PASS | Scripts y nombres de variables constan en `package.json` y `.env.example`; la intervención del usuario cubre la configuración. El baseline `verify` está documentado como exitoso sobre el mismo commit `75fddd3` en `spec-audit-1.md`; no se repitió. |
| 17 | Consistencia interna | PASS | El flujo conservador se refleja en C-06 y T-17; `sync_incomplete` no contiene `StrategyResult`, por lo que ningún dato incompleto puede activar R1/R2/R3. |
| 18 | Reglas no negociables | PASS | K01 server-side, RLS, solo lectura, no uso de `worker_api`, ausencia de secretos/datos reales y errores redactados coinciden con `AGENTS.md` y `SECURITY.md`. |

## Contradicciones

Ninguna.

## Hallazgos

Ninguno.

## Evidencia y siguiente paso

- Conteos documentales: 18 decisiones únicas, 22 criterios únicos y 29 casos únicos; todos los criterios están trazados a casos.
- No se ejecutaron pruebas ni verificaciones largas en esta ronda. Se usó el resultado de baseline registrado para el mismo commit y código.
- La spec queda **APROBABLE**. El usuario puede aprobarla expresamente; luego corresponde crear y auditar el plan único antes de implementar.
