# Auditoría del plan de M26b

**Fecha:** 2026-11-16
**Commit base:** `75fddd3ff796ea806a51047bfbe984304ae3cbd9`
**Rama inspeccionada:** `mf/M26b`
**Hash de contenido de la spec sin la línea `Estado`:** `5fd2789a9ef876825f2e2a1599cc483e187db396`
**Hash de contenido del plan sin la línea `Estado`:** `f9017a210ce9ade783b9c261713a510131972ee3`

## Veredicto

**REQUIERE CAMBIOS.** Las precondiciones de auditoría se cumplen, pero el plan no ubica ni verifica de forma explícita el push/PR/publicación según los pasos 12 a 15 del pipeline, no exige comprobar que toda la ejecución ocurra en `mf/M26b` y omite la lectura obligatoria de la guía de la versión instalada de Next.js antes de escribir la página y los componentes.

## Precondiciones

- La spec está en estado `APROBADA`.
- La última auditoría de spec es `spec-audit-3.md`, con veredicto `APROBABLE`.
- El procedimiento original
  `grep -v '^\*\*Estado:\*\*' docs/FASES/FASE1/M26b/spec.md | git hash-object --stdin`
  devuelve `5fd2789a9ef876825f2e2a1599cc483e187db396`, igual al hash registrado por `spec-audit-3.md` y citado por el plan.
- El plan existe y está en estado `BORRADOR`.
- No existía una auditoría de plan anterior; por eso este informe es `plan-audit-1.md`.

## Checklist

| # | Ítem | PASS/FAIL/NO APLICA | Evidencia o justificación |
|---:|---|---|---|
| 1 | Spec base | PASS | El plan cita `docs/FASES/FASE1/M26b/spec.md` y el hash `5fd2789a9ef876825f2e2a1599cc483e187db396`; coincide con el cálculo actual por la fórmula original. |
| 2 | Cobertura | PASS | Los pasos 1 a 9 cubren CA-82 a CA-94, C-01 a C-22 y T-01 a T-29. El paso 9 enumera la cobertura completa y los pasos anteriores asignan cada bloque a su prueba focal. |
| 3 | TDD | PASS | Los pasos 1, 3, 4, 5 y 8 exigen pruebas rojas o regresiones previas antes de contrato/motor, exports, loader, integración y UI/demo. |
| 4 | Archivos | PASS | La tabla del plan está contenida en II.14d, los artefactos del pipeline y los archivos transversales de seguimiento. No autoriza migraciones, SQL, RPC, `package.json` ni archivos de entorno. Las rutas propuestas nuevas permanecen en los módulos autorizados. |
| 5 | Pasos | FAIL | Cada paso tiene verificación, pero la publicación/acción remota se ubica genéricamente en el paso 9, antes del commit y de las revisiones, en vez de seguir los pasos 12 a 15 de `docs/PIPELINE.md`; además, el paso 8 no incluye la lectura previa obligatoria de la guía de la versión instalada de Next.js. Ver P-01 y P-03. |
| 6 | Migraciones | NO APLICA | La spec y el plan prohíben migraciones, RPC y funciones SQL nuevas. La última migración existente inspeccionada es `0025_recovery_account_check.sql`; no se modifica ninguna migración. |
| 7 | Comandos | PASS | `test:unit`, `test:component`, `db:check:test`, `test:policies`, `test:app` y `verify` existen en `package.json`. El plan incluye las suites de III.3, `git diff --check`, la búsqueda T-27 y CB-06. No se ejecuta `db:push:test`, conforme a la spec. |
| 8 | Acciones reservadas | FAIL | La tabla reserva commit y revisiones, pero no nombra ni verifica el push y el PR del paso 12, la integración/push del paso 14 ni la publicación posterior de forma alineada con el pipeline. La frase genérica «cualquier despliegue o acción remota» en el paso 9 no satisface la ubicación ni la verificación individual exigidas. `db:push` a `app` no aplica porque no hay migración y `db:push:test` está expresamente excluido. Ver P-01. |
| 9 | Reglas | PASS | El plan prohíbe secretos y datos reales, resuelve tenant/conexión en servidor, prohíbe `worker_api`, limita las pruebas remotas al proyecto desechable y exige `db:check:test` antes de ejecutarlas. |
| 10 | Trampas | PASS | Los pasos y riesgos cubren datos incompletos, asimetría de campaña, compatibilidad, ausencia de objetivo, regresiones por exports, rendimiento, separación demo/real, falta de señal comercial, límites del LLM y gate no transitivo. |
| 11 | Git | FAIL | El árbol actual está en `mf/M26b` y el plan prohíbe operaciones destructivas y pushes por iniciativa del asistente, pero ningún paso exige que toda la ejecución permanezca en esa rama ni verifica literalmente `mf/M26b`. Ver P-02. |
| 12 | Fidelidad | PASS | El alcance funcional, las reglas, el adaptador, los estados, la demo, las pruebas y los gates coinciden con la spec unificada y II.14d; no se agrega persistencia, SQL, LLM, chat, Tiendanube ni GA4. |

## Hallazgos

| ID (P-NN) | Severidad | Paso | Problema | Evidencia | Cambio propuesto |
|---|---|---:|---|---|---|
| P-01 | Alta | 9 y después de 9 | Las acciones reservadas de publicación no siguen el orden ni la verificación del pipeline. El plan termina la verificación y el recorrido, luego prevé commit/revisiones, pero reserva de forma genérica un despliegue en el propio paso 9 y omite push, PR, CI, integración y la comprobación posterior de la publicación. | `docs/PIPELINE.md` pasos 12 a 15 exige, después de QA: push y PR, Codex/CI, aprobación e integración, y acciones posteriores. `meta_first/plan.md` III.2 exige para M26b coordinar publicación y recorrido real. El plan, tabla de intervenciones, filas 9 y «Después de 9», no explicita esa secuencia ni sus verificaciones. | Reubicar y nombrar las acciones posteriores al paso 9: commit del usuario; revisiones 10/11; push y PR del usuario con verificación de PR abierto; Codex/CI; aprobación, push/merge; publicación/despliegue del usuario y verificación del entorno antes del recorrido que dependa de esa publicación. Declarar expresamente que `db:push` a `app` no aplica por ausencia de migraciones y que `db:push:test` no se ejecuta. |
| P-02 | Media | 0 | El plan no exige ni registra la rama exacta de ejecución. «Rama de trabajo» no demuestra el requisito `mf/M26b`. | Checklist 11 de la skill: todo ocurre en `mf/$ARGUMENTS`. La rama inspeccionada es correcta (`mf/M26b`), pero el paso 0 no incluye `git branch --show-current` ni un equivalente y no fija esa rama como condición de entrada. | Añadir al paso 0 la comprobación de que `git branch --show-current` devuelve exactamente `mf/M26b`; detenerse antes de modificar código si no coincide. Mantener la prohibición de push y operaciones destructivas por parte del asistente. |
| P-03 | Media | 8 | Falta una precondición obligatoria antes de escribir código Next.js. | El bloque vigente de `AGENTS.md` ordena leer la guía relevante en `node_modules/next/dist/docs/` porque esta versión tiene cambios incompatibles. El paso 8 crea una página App Router y procesa `searchParams`, pero no incluye esa lectura ni su registro. | En el paso 8, antes de escribir la página o componentes, exigir leer la guía instalada relevante para App Router, páginas server-only y `searchParams`, respetar sus avisos de deprecación y registrar en la sesión qué documentación se consultó. |

## Observación de tamaño

El alcance supera normalmente ocho horas, pero **no se propone partirlo**: la segunda enmienda M26b aprobó expresamente la excepción, prohíbe volver a dividir la microfase y conserva `G-STRATEGY-ENGINE` como checkpoint interno obligatorio.

## Siguiente paso

Volver a plan mode, corregir únicamente P-01, P-02 y P-03 en el plan y auditar de nuevo. El plan debe permanecer `BORRADOR` hasta obtener una auditoría `APROBABLE` y la aprobación expresa del usuario.
