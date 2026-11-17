# Auditoría de spec — M26b.1

**Fecha:** 2026-11-16
**Commit base auditado:** `75fddd3` (`75fddd3ff796ea806a51047bfbe984304ae3cbd9`)
**Hash de contenido de la spec sin la línea `Estado`:** `0cf59658df4330f9cb7bf8b51cb3494303c83281`
**Estado de la spec:** `BORRADOR`

## Veredicto

**REQUIERE CORRECCIONES** — equivalente a `REQUIERE CAMBIOS` en la terminología de la skill original.

La spec respeta la rama aprobada, el alcance de motor/adaptador/pruebas, los archivos autorizados y las fronteras de seguridad. Sin embargo, todavía obliga al implementador a inventar partes normativas del contrato y contiene incompatibilidades verificables con el código real. Además, dos criterios carecen de caso trazado y varios casos no tienen un comando reproducible. No se puede crear un plan TDD ejecutable sin resolver estos puntos.

## Checklist

| # | Ítem | Resultado | Evidencia |
|---:|---|---|---|
| 1 | Trazabilidad de los CA de la ficha | PASS | `M26b.1/spec.md` líneas 279–292 incluye CA-82 a CA-91; coincide con `meta_first/plan.md` líneas 464–470 y `meta_first/spec.md` líneas 692–701. |
| 2 | Alcance contra ficha y Parte II | PASS | Spec líneas 22–47; ruta líneas 460–473 y 981–997. Página, componentes, navegación y demo visual quedan expresamente en M26b.2. |
| 3 | Coherencia con spec general y sucesoras | FAIL | El contrato del loader incorpora `synthetic_demo` sin conducta ni archivo en M26b.1 (spec líneas 118, 157–175), aunque la demo pertenece a M26b.2 (`plan.md` líneas 1003–1015). Véase A-02. |
| 4 | Decisiones de la microfase | PASS | Las 18 decisiones heredadas están registradas en líneas 397–418 con aplicabilidad; no hay decisiones nuevas propias. Ninguna contradice DEC-26. |
| 5 | Trampas de la Parte II | PASS | Líneas 386–395 cubren anomalía ≠ estrategia, muestra, atribución, rendimiento, regresiones y ausencia de validación comercial. |
| 6 | Intervenciones y acciones reservadas | PASS | Líneas 375–384 coinciden con `plan.md` líneas 473 y 1110. No hay migración ni `db:push`; Git/remotos y aprobación del gate quedan reservados al usuario. |
| 7 | Verificación exigida y CB-06 | PASS | Líneas 362–373 incluyen todas las suites de `plan.md` líneas 997 y 1142; una prueba omitida se declara no ejecutada, conforme a CB-06. |
| 8 | Dependencias y rama base | PASS | `PROJECT_STATE.md` registra `G-DIAG` cerrado, M25b integrado en `main` y M26b.1 habilitada; `G-ANOMALIES` no bloquea `G-STRATEGY-ENGINE`. HEAD auditado: `75fddd3`. |
| 9 | Interfaces entregadas por dependencias | FAIL | La spec afirma que campaña no expone impresiones/clics previos (línea 57), pero el contrato/RPC sí los exponen. A la vez, campaña solo expone una moneda y una atribución consolidadas, insuficientes para distinguir de forma directa todas las omisiones de compatibilidad entre períodos. También falta fijar la interfaz exacta del helper M25b. Véanse A-03, A-05 y A-07. |
| 10 | Pendientes y hallazgos | PASS | Líneas 435–441 tratan H-E1-228, H-E1-238, H-E1-242, H-E1-258 y el estado de `G-ANOMALIES`; ninguno amplía el alcance de M26b.1. |
| 11 | Contexto real y referencias existentes | FAIL | La referencia `docs/FASES/FASE1/M26b/spec.md` de la línea 16 ya no existe; la afirmación técnica de la línea 57 tampoco coincide con el contrato/SQL vigentes. Véase A-05. |
| 12 | Archivos previstos | PASS | Líneas 255–275 coinciden con `plan.md` líneas 987–995. `ARCHITECTURE.md` figura porque el módulo pasará de previsto a existente; `SECURITY.md` no figura porque no cambia una frontera o invariante. |
| 13 | Diseño suficiente para implementar | FAIL | Faltan formas exhaustivas de tipos, catálogos y errores; el ID permite colisiones entre anomalías R1; la selección de acción/prioridad no es total; y no se define cómo proyectar compatibilidad de períodos desde `EntityMetricsRow`. Véanse A-01, A-03, A-04 y A-07. |
| 14 | Criterios verificables y casos concretos | FAIL | `M26b-C-01` y `M26b-C-16` no son citados por ningún caso de M26b.1. T-25 contradice el schema estricto si esos objetos entran al contrato; T-25/T-26 no tienen comando reproducible. Véase A-06. |
| 15 | Sin preguntas o hipótesis bloqueantes | PASS | Preguntas abiertas: ninguna (líneas 431–433). H-01/H-02 se verifican por pruebas remotas; H-03 por T-26; H-04 es una limitación aprobada y cubierta por T-08. |
| 16 | Ejecutable ahora y baseline verde | PASS | Scripts requeridos presentes en `package.json`. En worktree temporal limpio de `75fddd3`, la segunda ejecución de `npm run verify` pasó: lint, typegen, typecheck, 60 archivos/1.417 pruebas y build de 19 páginas. |
| 17 | Consistencia interna | FAIL | El derivador de IDs no distingue varias anomalías R1 de la misma entidad/períodos; el modo demo del loader carece de implementación autorizada; las reglas dejan ramas de acción/calidad sin resolver. Véanse A-01, A-02 y A-04. |
| 18 | Reglas no negociables | PASS | Líneas 233–242 y C-13/C-14/C-18: K01 server-side, JWT/RLS, proyecto desechable, cero secretos, cero escrituras, sin `worker_api`, migraciones ni Meta directo; errores redactados. |

Resultado: **11 PASS / 7 FAIL / 0 BLOQUEO**.

## Contradicciones

| Elemento de la spec | Contradice a | Evidencia | Cómo se resuelve |
|---|---|---|---|
| «Campaña no expone impresiones/clics previos» | Código real de M26a | Spec línea 57; `src/modules/diagnostics/contract.ts` campos `prev_impressions`/`prev_clicks`; `supabase/migrations/0022_meta_diagnostics.sql` retorno y agregación de ambos campos | Mantener la decisión aprobada de no exigirlos, pero describirla como exclusión deliberada de CA-84/D-M26b-16, no como ausencia del contrato. |
| `loadMetaStrategyView` acepta `synthetic_demo` dentro de M26b.1 | Alcance y archivos de la ruta | Spec líneas 39 y 157–175; `meta_first/plan.md` II.14d no autoriza demo y II.14e asigna `src/modules/strategies/demo.ts` a M26b.2 | Limitar el loader de M26b.1 al modo real, o definir explícitamente una frontera de contrato que no implemente ni seleccione demo hasta M26b.2. |
| Referencia a la spec coordinadora retirada | Árbol actual | Spec línea 16; `docs/FASES/FASE1/M26b/spec.md` no existe tras la migración verificada | Reemplazar la ruta inexistente por la condición histórica y los hashes ya registrados, sin presentarla como fuente legible actual. |

## Hallazgos

| ID | Severidad | Sección | Problema | Evidencia | Cambio propuesto | ¿Requiere decisión del usuario? |
|---|---|---|---|---|---|---|
| A-01 | alta | Contrato público / R1 / consistencia | El ID se deriva de versión + `ruleId` + nivel + entidad + períodos. Dos anomalías R1 distintas —por ejemplo CTR y CPC— de la misma entidad y 7+7 reciben el mismo ID. La spec no define si R1 se agrega por entidad o produce una recomendación por anomalía. | Spec líneas 86–113, 152 y 191–197; M25b admite cinco métricas simultáneas en `MetaAnomalyResult`. | Elegir y documentar una única regla: incluir el identificador estable de la anomalía/métrica en el ID, o definir una agregación R1 determinística con evidencia y precedencia completas. Agregar caso de colisión múltiple. | No; es una corrección técnica dentro de CA-82/83. |
| A-02 | alta | Vista y adaptador / alcance | M26b.1 declara un loader con modo `synthetic_demo`, pero la demo y su archivo pertenecen a M26b.2. No se define qué devuelve ese modo ni qué dependencia lo construye. Un plan tendría que implementar demo fuera de alcance o dejar una rama contractual sin conducta. | Spec líneas 39, 118 y 154–175; ruta II.14d líneas 987–995 e II.14e líneas 1003–1015. | Dejar el adapter de M26b.1 explícitamente en modo real y reservar la selección/fixture demo a M26b.2, o fijar una interfaz abstracta exacta que no agregue conducta demo en este corte. | No; la ruta ya asigna la demo a M26b.2. |
| A-03 | media | Contrato público / adaptador | El contrato usa tipos y catálogos cerrados sin definir su forma exhaustiva: `StrategyEvidence`, `StrategyWarning`, `StrategyMessageKey`, `Period`, `StrategyOmission`, `MetaStrategyView` y `MetaStrategyLoadDeps`. `checkPlan.metric` y `successConditionKey` siguen siendo `string`; tampoco se define la semántica exacta de `evaluated`, las clases de error ni la firma del helper M25b que reutiliza conexión/resumen. El texto exige incluir el próximo período, pero el tipo solo guarda baseline/current y una comparación simbólica. | Spec líneas 78–175 y 231–241. `src/modules/anomalies/load.ts` mantiene privados `Connection`, `defaultDeps` y `toObservation`; `src/modules/anomalies/index.ts` no exporta el loader. | Incluir las formas Zod/TypeScript completas, valores de enums, payload de cada estado/error, semántica de contadores, representación o derivación exacta del próximo período y firma del helper/export compatible. | No. |
| A-04 | media | R1–R4 / prioridad y evidencia | La tabla de decisión no es total. R1 dice que CPA crítico compatible «puede» usar `consider_reduce`; R2 dice que lo usa con evidencia suficiente y prioridad alta «de otro modo `review`», mientras otra regla dice que evidencia insuficiente siempre se omite. La prioridad `high` de toda R1 crítica tampoco se reconcilia con la definición posterior de deterioro crítico «del objetivo». No queda determinado cuándo corresponde cada rama ni qué prioridad/calidad recibe. | Spec líneas 193–205 y 222–231; C-03 exige salida idéntica sin decisiones libres. | Agregar una matriz exhaustiva por regla/severidad/compatibilidad/calidad con acción, prioridad, `evidenceQuality`, warning u omisión exactos; reemplazar «puede» por una condición determinística. | No; aplica decisiones ya cerradas D-M26b-10/11/17. |
| A-05 | media | Contexto real | Hay dos afirmaciones falsas o caducas: ausencia de métricas previas de campaña y existencia de la spec coordinadora. La limitación asimétrica aprobada sigue siendo válida, pero su justificación actual no. | Spec líneas 16 y 57; `contract.ts` y migración `0022` exponen métricas previas; el padre fue retirado tras la migración 18/22/29. | Corregir las referencias y declarar que impresiones/clics previos existen pero se excluyen deliberadamente de las guardas de CA-84/D-M26b-16. | No. |
| A-06 | media | Criterios y casos de prueba | La matriz no cubre todos los criterios definidos por M26b.1 y deja comandos no reproducibles. C-01 y C-16 no aparecen en la columna de cobertura; T-25 y T-26 no nombran un comando real; T-27 dice «búsquedas» sin patrones/alcance. Además, T-25 pide agregar objetos TN/GA4/chat «fuera del input» sin precisar la frontera: si entran al objeto validado, contradice el schema estricto que rechaza campos extra; si no entran, debe probar ausencia de lecturas/dependencias. | Spec líneas 150, 314–321 y 329–371. | Trazar C-01/C-16; definir T-25 como rechazo del schema o como prueba de que esas dependencias nunca se leen; reemplazar comandos ambiguos por invocaciones y resultados concretos, incluida la medición de T-26. | No. |
| A-07 | alta | Adaptador / compatibilidad de campañas | `EntityMetricsRow` entrega una sola `currency` y una sola `attribution` de campaña, mientras R2/R3 exigen distinguir moneda mixta e incompatibilidad de atribución entre período actual y anterior con omisiones diferentes. El SQL usa ambos períodos internamente para producir o anular variaciones, pero el contrato público no expone la causa. Inferirla desde `var_* = null` confundiría incompatibilidad, dato faltante y división no calculable. | Spec líneas 138–147 y 199–211; `src/modules/diagnostics/contract.ts` líneas 89–102; `supabase/migrations/0022_meta_diagnostics.sql` líneas 647–658 y 743–785. | Definir una proyección determinística con los campos existentes que preserve causas distintas, o ajustar el diseño para consumir evidencia existente que ya las distinga. Si eso exige RPC/SQL nuevo, detenerse porque la ruta lo prohíbe. | No para documentar la proyección; sí si no puede resolverse sin cambiar la ruta. |

## Verificación del baseline

Se creó un worktree temporal separado en `HEAD@75fddd3`, se instalaron las dependencias de `package-lock.json` y se ejecutó `npm run verify`.

- Primera ejecución: lint, typegen, typecheck y 1.417 pruebas pasaron; el build compiló y generó 19 páginas, pero Next detuvo el comando para mostrar un aviso de vulnerabilidad conocida.
- Segunda ejecución, exigida por el propio aviso: exit 0; lint, typegen, typecheck, 60 archivos/1.417 pruebas y build de 19 páginas pasaron.
- El worktree temporal fue retirado.
- Next 16.4.2 informó que la versión está afectada por una vulnerabilidad conocida y recomendó ejecutar su actualización de seguridad. Este aviso no es un defecto de la spec M26b.1 y no cambia el veredicto, pero debe tratarse por separado.

## Observación de tamaño

El corte reúne contrato, motor, adaptador, cinco módulos nuevos, exports compatibles, cuatro archivos de pruebas y verificación remota. El límite de ocho horas es exigente. No se recomienda subdividirlo automáticamente porque la división M26b.1/M26b.2 fue una decisión expresa y cualquier corte adicional requeriría enmienda; el plan debe detenerse si no puede mantener ese límite sin reducir criterios.

## Siguiente paso

Corregir únicamente la spec para resolver A-01 a A-07 y volver a ejecutar `/spec-auditor M26b.1`. Ningún hallazgo requiere `/grill-me` salvo que A-07 demuestre que el contrato existente no permite conservar las causas sin RPC/SQL nuevo, o que el usuario quiera cambiar otra decisión ya cerrada. No aprobar la spec ni crear el plan antes de un dictamen `APROBABLE`.
