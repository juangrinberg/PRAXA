# Auditoría de spec — M26b

**Fecha:** 2026-11-16
**Commit base:** `75fddd3`
**Hash de contenido de la spec sin la línea `Estado`:** `3b45449fe2273fea58df4a810a80c50f11ec35ff`
**Estado de la spec:** `BORRADOR`

## Veredicto

**REQUIERE CAMBIOS.** La unificación incorpora correctamente A-01 a A-07 de la auditoría histórica y se ajusta en general a la ruta. Aun así, el flujo real no define cómo impedir recomendaciones de campaña con una sincronización incompleta, el contrato usa un tipo de conexión inexistente y las pruebas remotas obligatorias carecen de una intervención asignada para disponer del entorno desechable.

La auditoría documental se completó. No se repitieron pruebas remotas ni `npm run verify`, para evitar reintentar una verificación que el usuario informó que quedó atascada. La auditoría histórica registra `npm run verify` exitoso sobre el mismo `HEAD` (`75fddd3`), pero ese resultado no identifica qué verificación fue la que se atascó. No se declara una verificación nueva.

## Checklist

| # | Ítem | Resultado | Evidencia |
|---:|---|---|---|
| 1 | Trazabilidad de los CA de la ficha | PASS | La tabla «Heredados de la ruta» cubre CA-82 a CA-91; C-15, C-17 y C-22 referencian CA-92 a CA-94. Coinciden con la ficha M26b y §16b. |
| 2 | Alcance contra ficha y Parte II | PASS | Objetivo, alcance, archivos y etapas coinciden con la ficha y II.14d de `meta_first/plan.md`; el checkpoint y la continuación expresa están preservados. |
| 3 | Coherencia con spec general y sucesoras | PASS | §16b, DEC-26, CA-82 a CA-94 y los límites de M28.3a coinciden; no se contradicen los CA/CB ni las exclusiones de la ruta. |
| 4 | Decisiones de la microfase | PASS | Están las 18 decisiones D-M26b-01 a D-M26b-18, con autor, motivo y fecha. D-M26b-08 figura histórica y superada según la segunda enmienda aprobada. |
| 5 | Trampas de la Parte II | PASS | La sección «Trampas y riesgos» recoge las limitaciones de evidencia, muestra, atribución, alcance, rendimiento y validación comercial. |
| 6 | Intervenciones y acciones reservadas | FAIL | Las intervenciones cubren aprobaciones, recorrido y acciones remotas, pero no asignan al usuario preparar el proyecto desechable y sus credenciales locales, requeridos por T-22/T-23 y las suites obligatorias. Hallazgo A-10. |
| 7 | Verificación exigida y CB-06 | PASS | Incluye las suites indicadas en III.3 y aclara que toda prueba requerida omitida cuenta como no ejecutada. Los scripts citados existen en `package.json`. |
| 8 | Dependencias y rama base | PASS | `PROJECT_STATE.md` registra `G-DIAG` cerrado y M25b integrado. `G-ANOMALIES` sigue pendiente, pero la ruta permite comenzar y alcanzar el checkpoint sin ese gate. |
| 9 | Interfaces entregadas por dependencias | FAIL | La firma de `MetaStrategyLoadDeps` declara `ConnectionRecord`; el código no exporta ese tipo. La API devuelve `IntegrationConnectionRecord`. Hallazgo A-09. |
| 10 | Pendientes y hallazgos | PASS | Los hallazgos H-E1-228/238/242/258 están tratados; `G-ANOMALIES` se difiere correctamente al gate final. No hay hallazgos del registro asignados directamente a M26b. |
| 11 | Contexto real y referencias existentes | FAIL | La mayoría de las referencias citadas coinciden con el código. La referencia de tipo `ConnectionRecord` no existe; véase A-09. |
| 12 | Archivos previstos | PASS | Los archivos declarados están autorizados por II.14d o son de seguimiento; `ARCHITECTURE.md` y `PROJECT_STATE.md` se condicionan a los cambios que les corresponden. |
| 13 | Diseño suficiente | FAIL | No se define el bloqueo/omisión de recomendaciones de campaña cuando el nivel de sincronización está incompleto; además, queda el tipo inexistente A-09. Véanse A-08 y A-09. |
| 14 | Criterios y casos verificables | PASS | Los 22 criterios aparecen en al menos un caso de prueba. Los comandos de `npm run` existen y las expectativas son concretas, incluidas las comprobaciones manuales de los recorridos. |
| 15 | Sin nada abierto | PASS | «Preguntas abiertas» está vacía. Las hipótesis pendientes tienen pruebas o un paso explícito de verificación y condición de parada. |
| 16 | Ejecutable ahora / baseline | BLOQUEO | No se repitió `npm run verify` ni las pruebas remotas por la instrucción del usuario de no volver a ejecutar comprobaciones potencialmente bloqueantes. `spec-audit-1.md` informa `verify` exitoso en este mismo commit, pero no permite identificar la verificación que se atascó en la ejecución anterior. Las variables remotas están enumeradas en `.env.example`; no se leyó `.env.local`. |
| 17 | Consistencia interna | FAIL | La condición de entrada del adaptador solo exige que la cuenta esté completa, mientras R2/R3 exigen cobertura de campaña completa. Tampoco se define qué hacer con un nivel campaña `incomplete`, `failed` o `not_attempted`. Hallazgo A-08. |
| 18 | Reglas no negociables | PASS | K01 server-side, RLS, solo lectura, ausencia de secretos/datos reales, exclusión de `worker_api`/LLM y errores cerrados son consistentes con `AGENTS.md` y `SECURITY.md`. |

## Contradicciones

| Elemento de la spec | Contradice a (fuente y ubicación) | Evidencia | Cómo se resuelve |
|---|---|---|---|
| El adaptador solo exige sincronización completa de cuenta antes de leer métricas; las reglas no especifican el estado del nivel campaña. | La condición C-06 y R2/R3 de la spec; `MetaSyncStatus` en `src/modules/integrations/meta/insights.ts` y la política del loader existente en `src/modules/anomalies/load.ts`. | El resumen expone `levels.campaign.status`; M25b lee campañas solo si ese estado es `complete`. El contrato de `EntityMetricsRow` solo expone `days_with_row` y `days_open`, no cobertura completa/no observada por día. | Definir que las campañas solo se leen/evalúan con estado `complete`, o fijar una omisión/estado conservador equivalente para el nivel incompleto y probarlo. |
| `MetaStrategyLoadDeps.readConnection` usa `ConnectionRecord`. | Código existente: `src/modules/integrations/repository/connections.ts` y `src/modules/integrations/contract/connection.ts`. | El código exporta `IntegrationConnectionRecord` y `LiveConnection`; no existe un tipo exportado llamado `ConnectionRecord`. | Usar el tipo existente exacto o definir explícitamente un alias estructural permitido. |
| Las pruebas remotas son obligatorias, pero la lista de intervención no asigna la preparación de su entorno. | `docs/PROJECT_STATE.md` (M25b: las pruebas en el desechable no se acreditaron por falta de variables); `.env.example`; T-22/T-23 y «Intervenciones del usuario» de la spec. | `db:check:test`, `test:policies` y `test:app` requieren variables del proyecto desechable; la especificación solo pide autorización general de acciones Git/remotas. | Asignar al usuario la configuración local segura del entorno de pruebas antes de esas suites y verificar el destino con `db:check:test`, sin compartir valores en el chat. |

## Hallazgos

| ID | Severidad | Sección | Problema | Evidencia | Cambio propuesto | ¿Requiere decisión del usuario? |
|---|---|---|---|---|---|---|
| A-08 | alta | Adaptador / guardas R2-R3 | El flujo real comprueba que la cuenta esté completa, pero no dice cómo manejar un nivel campaña incompleto. Aun así, C-06 exige campaña actual completa y los estados de campaña incluyen `incomplete`, `failed` y `not_attempted`. Las filas disponibles solo exponen `days_with_row` y `days_open`; no permiten por sí solas demostrar cobertura completa/no observada por día. Leer filas de una sincronización parcial podría producir una recomendación con evidencia incompleta. | Spec, «Flujo real» y R2/R3; `src/modules/integrations/meta/insights.ts` (estado por nivel); `src/modules/anomalies/load.ts` (omite lectura de campañas si no están completas); `src/modules/diagnostics/contract.ts` y `0022_meta_diagnostics.sql` (campos de campaña). | Fijar conducta normativa para campañas no completas: no leerlas o no evaluarlas, preservar recomendaciones válidas de cuenta y emitir `incomplete_coverage`/estado cerrado según corresponda. Añadir casos para los estados de campaña no completos y para que nunca activen R2/R3. | No |
| A-09 | media | Contrato público, `MetaStrategyLoadDeps` | El contrato declara `readConnection: (...) => Promise<ConnectionRecord | null>`, pero `ConnectionRecord` no es un tipo exportado por el código existente. El implementador tendría que adivinar si se refiere a `IntegrationConnectionRecord` o `LiveConnection`; sus formas y usos no son intercambiables. | Spec, bloque `MetaStrategyLoadDeps`; `src/modules/integrations/repository/connections.ts` y `src/modules/integrations/contract/connection.ts`. | Nombrar el tipo real que devuelve `readConnectionRecord` (`IntegrationConnectionRecord`) o especificar el alias exacto, y mantener coherentes las propiedades usadas por el loader. | No |
| A-10 | alta | Intervenciones del usuario / verificación remota | T-22/T-23 y III.3 requieren destino desechable para `db:check:test`, `test:policies` y `test:app`. `PROJECT_STATE.md` ya registra que el entorno no tiene esas variables, pero la spec no asigna su configuración al usuario ni define cómo se desbloquea. La microfase no puede satisfacer el checkpoint si las suites obligatorias no se ejecutan; no se deben leer ni solicitar sus valores en el chat. | `docs/PROJECT_STATE.md`, sección «Trabajo paralelo autorizado» de M25b; `.env.example` (variables de pruebas); spec, T-22/T-23, «Verificación» e «Intervenciones del usuario». | Agregar una intervención operativa: el usuario prepara en el entorno local las variables de test indicadas en `.env.example`, confirma el proyecto desechable mediante `db:check:test` y conserva los valores fuera del chat. Si no está disponible, registrar bloqueo y no aprobar el checkpoint. | No |

## Evidencia y siguiente paso

- Se verificó que los 18 IDs de decisión, 22 criterios y 29 casos existen y son únicos; los 22 criterios aparecen en la matriz de pruebas.
- El código fuente, las suites remotas y `npm run verify` no se ejecutaron en esta auditoría. El worktree ya estaba modificado por cambios previos del usuario; se preservaron.
- Corregir A-08 a A-10 en la spec, sin editar la ruta ni otros archivos, y volver a ejecutar `/spec-auditor M26b`. La spec no se aprueba ni se crea el plan mientras el dictamen no sea `APROBABLE`.
