# Auditoría del plan de M26b

**Fecha:** 2026-11-16
**Commit base:** `75fddd3ff796ea806a51047bfbe984304ae3cbd9`
**Rama inspeccionada:** `mf/M26b`
**Hash de contenido de la spec sin la línea `Estado`:** `5fd2789a9ef876825f2e2a1599cc483e187db396`
**Hash de contenido del plan sin la línea `Estado`:** `0381bfa727d1de659d3aba3bc12695abb59c5a73`

## Veredicto

**APROBABLE.** Todas las precondiciones se cumplen y los doce ítems del checklist están en `PASS` o en `NO APLICA` justificado. Las correcciones solicitadas por `plan-audit-1.md` quedaron incorporadas: la ejecución comprueba la rama exacta `mf/M26b`, la interfaz exige consultar antes la documentación de la versión instalada de Next.js y las acciones reservadas posteriores siguen los pasos 12 a 15 de `docs/PIPELINE.md`. `G-STRATEGY-ENGINE` permanece como checkpoint interno con pruebas focales y aprobación expresa del usuario, sin adelantar `/implementation-review M26b` ni `/qa-review M26b`.

## Precondiciones

- `docs/FASES/FASE1/M26b/spec.md` está en estado `APROBADA`.
- La última auditoría de la spec es `spec-audit-3.md` y su veredicto es `APROBABLE`.
- El procedimiento original
  `grep -v '^\*\*Estado:\*\*' docs/FASES/FASE1/M26b/spec.md | git hash-object --stdin`
  devuelve `5fd2789a9ef876825f2e2a1599cc483e187db396`, igual al hash de `spec-audit-3.md` y al citado por el plan.
- `docs/FASES/FASE1/M26b/plan.md` existe y permanece en estado `BORRADOR`.
- La auditoría de plan anterior es `plan-audit-1.md`; por eso este informe es `plan-audit-2.md`.

## Checklist

| # | Ítem | PASS/FAIL/NO APLICA | Evidencia o justificación |
|---:|---|---|---|
| 1 | Spec base | PASS | El plan cita la spec canónica y el hash `5fd2789a9ef876825f2e2a1599cc483e187db396`, que coincide con el cálculo actual mediante la fórmula original y con `spec-audit-3.md`. |
| 2 | Cobertura | PASS | Los pasos 0 a 9 cubren CA-82 a CA-94, C-01 a C-22 y T-01 a T-29. La comparación mecánica de identificadores confirma los 22 criterios y los 29 casos; el paso 9 enumera la cobertura completa y los pasos anteriores asignan sus verificaciones focales. |
| 3 | TDD | PASS | Los pasos 1, 3, 4, 5 y 8 colocan pruebas rojas o regresiones antes del motor, los exports/helpers, el loader, la integración remota y la UI/demo. No hay implementación comprobable sin prueba previa o justificación. |
| 4 | Archivos | PASS | La tabla está contenida en II.14d y en los archivos transversales de seguimiento autorizados. Las rutas nuevas permanecen en los módulos previstos. El plan excluye `package.json`, archivos de entorno, migraciones, SQL, RPC y cualquier archivo no autorizado. |
| 5 | Pasos | PASS | El orden respeta contrato/motor → exports compatibles → adaptador → pruebas remotas → checkpoint y pausa → interfaz/demo → cierre completo. Cada paso tiene verificación propia. El paso 8 incorpora la lectura previa de las guías instaladas de páginas y Server/Client Components de Next.js, incluidas la firma vigente de `searchParams` y las deprecaciones. |
| 6 | Migraciones | NO APLICA | M26b no crea ni modifica migraciones, RPC o funciones SQL. La última migración existente inspeccionada es `0025_recovery_account_check.sql`; el plan prohíbe tocarla y excluye `db:push` y `db:push:test`. |
| 7 | Comandos | PASS | `test:unit`, `test:component`, `db:check:test`, `test:policies`, `test:app` y `verify` existen en `package.json`. El plan incluye las suites exigidas por III.3, las invocaciones focales de la spec, `git diff --check`, la búsqueda T-27 y el tratamiento de CB-06. Los comandos Git se usan con finalidad de inspección y evidencia. |
| 8 | Acciones reservadas | PASS | La tabla separa preparación del entorno, aprobación del checkpoint y recorridos. Después del paso 9 ubica commit y revisiones 10/11; luego explicita push/PR, Codex/CI, aprobación/registro/merge y publicación/verificación como pasos 12 a 15. El asistente no hace push ni despliega por iniciativa propia; `db:push` a `app` no aplica y `db:push:test` no se ejecuta. |
| 9 | Reglas | PASS | El plan prohíbe secretos y datos reales en chat, fixtures, logs y evidencia; resuelve tenant/conexión en servidor; no usa `worker_api`; y exige `db:check:test` antes de pruebas remotas, limitadas al proyecto desechable. |
| 10 | Trampas | PASS | Los pasos, verificaciones y riesgos cubren datos incompletos, ausencia de objetivo, muestra asimétrica, moneda/atribución incompatibles, regresiones por exports, precisión decimal, determinismo, rendimiento, separación demo/real, UUIDs, falta de señal comercial y gates no transitivos. |
| 11 | Git | PASS | La rama actual es `mf/M26b`. El paso 0 exige que `git branch --show-current` devuelva exactamente ese nombre y ordena detenerse si no coincide. El plan preserva cambios previos y prohíbe operaciones destructivas, commits o pushes por iniciativa del asistente. |
| 12 | Fidelidad | PASS | El plan implementa el alcance determinístico y manual de la spec y II.14d, reutiliza M25b/M26a sin cambiar contratos, conserva la pausa interna y reserva el gate final. No agrega persistencia, SQL, nuevas llamadas a Meta, LLM, chat, Tiendanube, GA4 ni autoridad de reglas en la UI. |

## Hallazgos

| ID (P-NN) | Severidad | Paso | Problema | Evidencia | Cambio propuesto |
|---|---|---:|---|---|---|
| — | — | — | No se detectaron defectos del plan actual. | Los doce ítems están en `PASS` o `NO APLICA` justificado; P-01, P-02 y P-03 de `plan-audit-1.md` están resueltos. | — |

## Observación de tamaño

El alcance normalmente excedería ocho horas, pero no corresponde recomendar una partición: la segunda enmienda M26b aprobó expresamente la excepción, ordena mantener una única microfase y conserva `G-STRATEGY-ENGINE` como checkpoint interno obligatorio con pausa y aprobación del usuario.

## Verificaciones realizadas durante la auditoría

- Se inspeccionaron la spec, el plan, `AGENTS.md`, la ficha y II.14d de la ruta, las precondiciones, III.3, III.9, `package.json`, la numeración de migraciones y los contratos/exports existentes de anomalías y diagnóstico que el plan reutiliza.
- Se verificó la existencia de las guías instaladas de Next.js citadas por el paso 8.
- Se comprobaron rama, commit, estados, hashes, cobertura de IDs, scripts y rutas autorizadas mediante inspecciones de solo lectura.
- No se ejecutaron suites unitarias, de componentes, app, políticas ni `verify`: la auditoría documental y estática no requería repetir esas pruebas costosas.
- No se leyó `.env.local`, no se modificó la spec ni se implementó código.

## Siguiente paso

El usuario puede aprobar expresamente el plan con: **«Apruebo el plan de M26b: pasá el estado a APROBADO»**. Después corresponde elegir modelo y esfuerzo, abrir una sesión nueva y ejecutar `/microfase M26b`. La implementación debe detenerse en el checkpoint interno para la aprobación expresa de `G-STRATEGY-ENGINE` antes de continuar a interfaz/demo.
