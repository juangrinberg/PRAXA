# Auditoría de especificación M27a — ronda 2

**Fecha:** 2026-11-17  
**Commit base auditado:** `d349b98` (`mf/M27a`)  
**Hash del contenido auditado:** `2fdd7e4a35ad3aaf70d874d104789be0616dc68f` (SHA-1 Git de `spec.md` excluyendo la línea `**Estado:**`)  
**Estado de la especificación:** BORRADOR  
**Veredicto:** **REQUIERE CAMBIOS**

La especificación no es aprobable en esta ronda: 15 controles resultaron PASS y 3 FAIL. Las correcciones de A-02 y A-03 quedaron resueltas sin ampliación de alcance. A-01 quedó resuelto sólo en su aspecto formal —ahora existe un DTO público enumerado—, pero el contrato agregado todavía no es ejecutable de manera unívoca para selección de moneda, procedencia de calidad y algunos estados públicos. Se detectaron cinco defectos nuevos o residuales, detallados como A-04 a A-08.

## Seguimiento de los hallazgos de ronda 1

| ID | Resultado | Evidencia de ronda 2 |
|---|---|---|
| A-01 | **NO RESUELTO POR COMPLETO** | `spec.md:84-339` ahora enumera tipos y payloads públicos, pero `loadCustomerInsightsView()` no recibe moneda y `CustomerInsightsView` sólo transporta un `InsightsData`, aunque la vista exige un selector y el getter SQL requiere moneda (`spec.md:79`, `245-287`, `349`, `456`). Además, los estados de calidad de identidad, catálogo y líneas no tienen una procedencia persistida exacta, y la traducción de calidad monetaria es internamente contradictoria. Véanse A-04, A-05 y A-06. |
| A-02 | **RESUELTO** | `spec.md:353-364` distingue correctamente la aridad invariable de `tn_publish_orders`, la extensión del JSON `p_orders` y los cambios coordinados en proyección, sincronización y repositorio. T-05 y T-16 cubren el contrato y los casts (`spec.md:547`, `558`). No se amplía el alcance aprobado. |
| A-03 | **RESUELTO** | `spec.md:16` identifica correctamente `d349b98`, la rama `mf/M27a`, los seis archivos ya incorporados por la enmienda y los cambios locales preexistentes. Coincide con el estado Git inspeccionado. No se amplía el alcance aprobado. |

## Lista de control obligatoria

| # | Control | Resultado | Evidencia |
|---:|---|---|---|
| 1 | Cobertura completa del objetivo de la microfase | PASS | El objetivo, entregables y CA cubren `meta_first/spec.md` §18.1-§18.10 y la ficha M27a de `meta_first/plan.md`, incluida segmentación, cohortes, cross-sell, privacidad, moneda y estados de ausencia. |
| 2 | Alcance y fuera de alcance delimitados | PASS | `spec.md` §§2-3 conserva una sola pantalla read-only, sin integraciones nuevas, CRM, exportaciones ni sucesora automática. |
| 3 | Coherencia con roadmap, spec de ruta y gates | PASS | La microfase respeta la autorización paralela y el gate informativo `G-SEGMENTOS-AUDIENCIAS`; no habilita M28.3a ni agrega dependencias externas. Los defectos hallados son del contrato interno, no una contradicción con el alcance de ruta. |
| 4 | Decisiones cerradas y decisiones del usuario respetadas | PASS | Las decisiones A/B/C y D-M27a-01..06 están incorporadas; no se reabre una decisión de negocio en forma silenciosa. |
| 5 | Trampas, límites y casos de borde identificados | PASS | La spec trata cobertura parcial, moneda, reembolsos, anonimización, ventanas insuficientes, catálogo incompleto, presupuesto y abstención. |
| 6 | Intervención del usuario separada y segura | PASS | §14 reserva al usuario sólo acciones externas o aprobaciones visibles; no solicita secretos y prohíbe producción/publicación automática. |
| 7 | Evidencia de cierre, pruebas y criterio de aceptación alineados | PASS | §12, §15 y §16 exigen suites automatizadas, verificación integral, UI visible y evidencia reproducible; CB-06 impide cerrar con pruebas omitidas. |
| 8 | Dependencias y condición de entrada verificables | PASS | `PROJECT_STATE.md` marca `G-TIENDA` aprobado y M27a autorizada en paralelo. La sesión M16e registra la excepción monetaria que M27a trata mediante H-E1-270/T-04. M16f no es dependencia de M27a. |
| 9 | Correspondencia con código, migraciones y archivos reales | PASS | Se inspeccionaron `context.ts`, repositorios, proyección/sync Tiendanube, worker API, análisis, shell/página, migración `0023`, tests y scripts. Los archivos y responsabilidades citados existen; la numeración nueva queda correctamente diferida al plan. |
| 10 | Hallazgos relacionados tratados explícitamente | PASS | H-E1-270 está asignado y convertido en gate monetario verificable; la eliminación del límite de ocho horas de H-E1-261 no se reintroduce. |
| 11 | Contexto Git y referencias reproducibles | PASS | Commit, rama, archivos de la enmienda y suciedad preexistente coinciden con Git. La verificación se ejecutó sobre un worktree limpio de `d349b98`, sin tocar los cambios locales. |
| 12 | Contrato documental y archivos previstos respetados | PASS | SECURITY/ARCHITECTURE sólo se actualizan si un control previsto pasa a vigente; PROJECT_STATE, HALLAZGOS y evidencia se actualizan en los casos autorizados. No se exige editar fuera del plan. |
| 13 | Contratos de datos, estados y APIs completos y no ambiguos | **FAIL** | La moneda seleccionada no entra ni sale de forma suficiente del loader/vista (A-04); faltan procedencia y persistencia exactas para calidad de identidad/catálogo/líneas (A-05); la traducción de calidad monetaria contradice los estados públicos (A-06); y `DefinitionCode` está definido contra la columna equivocada (A-07). |
| 14 | Pruebas con expectativas concretas para cada contrato | **FAIL** | T-03/T-08 no prueban cómo se selecciona o cambia moneda; T-12 no fija cómo se persiste y deriva la completitud; T-05/T-15 no resuelven el mapeo de estados monetarios; T-07 exige distinguir cero de ausencia sin reconciliar la supresión k≥5 (A-04, A-05, A-06 y A-08). |
| 15 | Hipótesis, preguntas abiertas y decisiones diferidas controladas | PASS | No quedan preguntas de producto encubiertas; las hipótesis técnicas están asignadas a la planificación y los defectos de este informe son corregibles dentro del alcance, salvo que se pretenda hacer visible un cero suprimido. |
| 16 | Viabilidad verificable sobre la base actual | PASS | En worktree limpio de `d349b98`: `npm ci --ignore-scripts --no-audit --no-fund` finalizó; `npm run verify` finalizó con código 0: lint, `next typegen`, typecheck, 72 archivos/1501 tests Vitest y build Next 16.4.5. Sólo hubo advertencias no bloqueantes de engine por Node 24.11.1. |
| 17 | Consistencia interna de la especificación | **FAIL** | El loader monetario, la definición de `DefinitionCode` y el tratamiento de cero/privacy contienen contradicciones internas explícitas (A-06, A-07 y A-08). |
| 18 | Condición para avanzar inequívoca y sin sucesora implícita | PASS | §17 exige spec aprobada, plan auditado y gate M27a aprobado; declara correctamente que el gate es informativo y no habilita sucesora automática. |

## Contradicciones detectadas

| Elemento | Contradice | Ubicación y evidencia |
|---|---|---|
| El loader público no recibe moneda y la vista transporta sólo un resultado | El getter exige `p_currency`, y la UI declara que moneda es el único selector | `spec.md:79`, `245-287`, `349`, `456`. No existe `availableCurrencies`, parámetro de loader ni contrato de URL/API equivalente. |
| Todo estado monetario distinto de `verified` se traduce a `monetario_no_validado` | `SegmentSection` también admite `dato_incompleto`, y `monetary.status` distingue `incomplete` e `inconsistent` | `spec.md:153-156`, `187-191`, `290`. El contrato vuelve inalcanzable o indistinguible una ausencia pública que él mismo exige. |
| `DefinitionCode` se declara como unión de los valores de la última columna | La última columna de la tabla enumera ausencias permitidas; los códigos de definición están en la tercera columna | `spec.md:113-139`. La frase de `spec.md:139` produce un tipo imposible respecto de la tabla precedente. |
| El criterio/UI/prueba exige distinguir un cero de indisponibilidad | La regla heredada y vigente suprime también celdas con cero contribuyentes activos por k≥5 | `spec.md:428`, `523`, `549`, `607`; comportamiento vigente en `supabase/migrations/0023_tiendanube_core.sql:744-752`. |

## Hallazgos

| ID | Severidad | Sección | Problema | Evidencia | Cambio requerido | ¿Decisión del usuario? |
|---|---|---|---|---|---|---|
| A-04 | Alta | §§4.2, 4.5, 5 y 8 | El contrato público no permite implementar el selector de moneda de forma unívoca. | `loadCustomerInsightsView()` no recibe argumentos (`spec.md:79`), `CustomerInsightsView` contiene un único `InsightsData` (`265-287`), el getter SQL requiere moneda (`349`) y la UI exige selector (`456`). | Definir el contrato exacto de selección: entrada validada del loader o wrapper público con monedas disponibles, moneda activa, default determinista y mecanismo de cambio; resolver tenant/conexión en servidor y actualizar CA/T-03/T-08. | No. |
| A-05 | Alta | §§4.2, 4.5, 5, 7 y 15 | `quality.identity`, `quality.catalog` y `quality.orderLines` tienen tipos públicos, pero no una fuente, persistencia ni regla de derivación exactas. Esto impide demostrar cuándo cross-sell puede usar la evidencia o debe abstenerse. | `spec.md:146-159`, `263`, `450`, `554`. En código actual, `projectOrder()` convierte `products` ausente/no-array en lista vacía y sólo devuelve `skippedLines`; catálogo/líneas inválidas se contabilizan en logs de sync, no como procedencia persistida. La extensión exacta de órdenes sólo agrega tres campos monetarios (`359-363`). | Especificar nombres/tipos y flujo persistido de procedencia para identidad, catálogo y líneas; distinguir ausente, inválido, omitido y ciclo incompleto; fijar precedencia de estados, generación considerada y regla exacta de abstención. Alinear migración, proyección, sync, JSON existente y tests. | No. |
| A-06 | Media | §§4.2 y 4.5 | El mapeo de calidad monetaria contradice el dominio público de ausencias. | `monetary.status` distingue `unverified`, `incomplete` e `inconsistent` (`153-156`), pero el loader mapea los tres a `monetario_no_validado` (`290`) aunque segmentos admite `dato_incompleto` (`187-191`). | Fijar una tabla exhaustiva status → view/section absence, con precedencia frente a presupuesto y privacidad, y expectativas concretas en T-05/T-10/T-15. | No. |
| A-07 | Baja | §4.2 | La definición normativa de `DefinitionCode` apunta a la columna incorrecta. | `spec.md:139` dice “última columna”; esa columna contiene ausencias, no códigos de definición. | Cambiar la referencia a la columna `definitionCode`/tercera columna y verificar que la unión enumerada sea exactamente la de esa columna. | No. |
| A-08 | Media | §§6, 11, 13 y 15 | El contrato no reconcilia “cero distinguible” con la supresión de toda celda de menos de cinco contribuyentes activos, incluidos cero. | `spec.md:428` conserva supresión de ceros; C-06, D-M27a-05 y T-07 (`523`, `607`, `549`) exigen distinguir cero. La función vigente guarda esa celda como `NULL`/privacy en `0023_tiendanube_core.sql:744-752`. | Conservando la decisión de privacidad, declarar que un mes cubierto con cero contribuyentes se publica como `privacy` —distinto de `sin_cobertura`, pero no como cero visible— y corregir C-06/T-07. Si se pretende exponer el cero, hace falta una decisión del usuario y revisar D-M27a-06/§18.6 de la ruta. | No para la corrección conservadora; sí sólo si se quiere hacer visible el cero. |

## Observación de tamaño

La ruta ya no impone un máximo de ocho horas (H-E1-261). Aun así, por la cantidad de capas afectadas —SQL/RLS, publicación Tiendanube, servidor, UI, pruebas y documentación— conviene que el plan conserve etapas internas verificables y puntos de rollback, sin convertirlas en nuevas microfases ni ampliar el alcance.

## Verificación ejecutada

Se creó un worktree temporal limpio y detached en `d349b98`, se instalaron dependencias con caché temporal y se ejecutó `npm run verify`. Resultado: código 0; lint, generación de tipos Next, typecheck, 72 archivos y 1501 tests Vitest, y build Next 16.4.5 aprobados. El worktree temporal fue removido y `git worktree list` volvió a mostrar únicamente el árbol principal. La spec corregida y `spec-audit-1.md` permanecieron intactos.

## Siguiente paso

Corregir A-04 a A-08 en `docs/FASES/FASE1/M27a/spec.md`, manteniendo la solución de A-02 y A-03 y cerrando de forma ejecutable A-01. Después, ejecutar una tercera auditoría independiente sobre el nuevo hash. No avanzar al plan de implementación ni declarar la spec APROBADA mientras alguno de estos hallazgos permanezca abierto.
