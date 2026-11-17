# Auditoría independiente del plan M27a

**Fecha:** 2026-11-17 (UTC-03)  
**Rama / commit:** `mf/M27a` / `d349b987174aaa92463006cd390d7aefb7983418`  
**Hash de contenido de la spec:** `bdb7f168987f2c27a7460b50b34bd1d4510aed0b`  
**Hash de contenido del plan:** `f6d5cea026d38b2a8247857115b719e4835a4d99`  
**Estado de la spec:** APROBADA; la última auditoría, `spec-audit-6.md`, es APROBABLE y registra el mismo hash.  
**Estado del plan:** BORRADOR.  
**Veredicto oficial:** **REQUIERE CAMBIOS**

## Precondiciones y contexto comprobados

- Los estados actuales en disco son `APROBADA` para la spec y `BORRADOR` para el plan. Los hash Git de cada archivo, excluida únicamente su línea `**Estado:**`, coinciden con los declarados arriba y con el hash que registra `spec-audit-6.md`.
- `G-TIENDA` está cerrado y M27a habilitada según `docs/PROJECT_STATE.md`; la ruta autoriza su trabajo paralelo con M16f bajo II.14d, sin depender de `G-GA4-FUSION`.
- El árbol de migraciones termina en `0031_ga4_diag.sql` y el de pgTAP en `20_ga4.test.sql`: al inspeccionar este checkout, los siguientes candidatos son `0032` y `21`. No se aplicaron migraciones ni se consultó ningún proyecto remoto.
- M16f sigue abierta. `PROJECT_STATE.md` la sitúa en el paso 9, mientras que la sesión más reciente de M16f informa paso 12, con `0026`–`0031` aplicadas en el desechable y acciones de integración del usuario aún pendientes. Esta diferencia de progreso no cambia el gate abierto, pero hace indispensable reconfirmar coordinación, base integrada, archivos/destino compartidos y ambos números al implementar; el plan ya reserva esa revalidación inicial y los candidatos no deben tratarse como reservas.
- Se leyeron las fuentes requeridas por `plan-auditor/SKILL.md`: `AGENTS.md`, plan y spec M27a, ficha y II.14d de la ruta, precondiciones de toda la ruta, III.3 y III.9, `package.json`, migraciones y pruebas existentes, y `projection.ts`, `sync.ts` y `repository.ts`. También se revisaron `PROJECT_STATE.md`, la sesión de M16f y las fuentes de seguridad, arquitectura y pipeline pertinentes.
- No se leyó `.env.local`, no hubo acceso a producción ni a proyectos remotos, no se ejecutaron pruebas funcionales y no se implementó código. El árbol preexistente se preservó.

## Checklist

| # | Ítem | PASS/FAIL/NO APLICA | Evidencia o justificación |
|---:|---|---|---|
| 1 | Spec base | PASS | El plan cita la spec y su hash. La comparación con el hash actual y el de `spec-audit-6.md` coincide exactamente. |
| 2 | Cobertura | PASS | C-01..C-18 y T-01..T-20 se asignan explícitamente al menos a un paso (0–8). §18.1–§18.10 y CB-01..CB-06 también aparecen en las acciones/verificaciones. Los casos con verificación manual y los controles documentales tienen pasos propios. |
| 3 | TDD | PASS | La introducción prescribe rojo antes de implementación y verde después; los pasos 1–7 disponen pruebas primero. El paso 2 exige demostrar el rojo SQL antes de implementar. T-04 y T-18 se identifican como controles manuales posteriores y no como pruebas automatizables. |
| 4 | Archivos | PASS | Los archivos concretos caben en los grupos autorizados de II.14d y los de seguimiento. Las ubicaciones de módulos/componentes concretan las rutas sugeridas. La migración es nueva; no se autoriza modificar `package.json`, `worker-api.ts` ni migraciones previas. |
| 5 | Pasos | FAIL | Los pasos tienen verificaciones, pero falta una verificación obligatoria: II.14d exige revalidar sobre la base integrada. El paso 0 solo revisa la coordinación inicial con M16f y la lista/destino; ningún paso posterior exige esa revalidación tras integrar la base. Hallazgo P-01. |
| 6 | Migraciones | PASS | Se propone una migración nueva y su reversión mediante migración compensatoria nueva; se prohíbe modificar migraciones existentes. `0032` y pgTAP `21` son los siguientes en el árbol actual, sujetos —correctamente— a reconfirmación antes de implementar. |
| 7 | Comandos | PASS | Los scripts `verify`, `db:check:test`, `test:unit`, `test:component`, `test:policies`, `test:app` y `db:push:test` existen en `package.json`. Los comandos SQL/Git se asignan a sus mecanismos. Se incluyen las suites de III.3 y CB-06; se prohíbe cerrar el gate con pruebas requeridas omitidas. |
| 8 | Acciones reservadas | PASS | `db:push:test`, T-04, aprobación/comunicación del acta, publicación y gate están reservados al usuario en los momentos correspondientes y tienen verificaciones posteriores. No se asigna al asistente push, despliegue ni `db:push` contra `app`. |
| 9 | Reglas | PASS | Prohíbe secretos/datos reales en evidencia, mantiene tenant resuelto en servidor y el uso de JWT/RLS, restringe pruebas al desechable y mantiene las escrituras SQL en las funciones `worker_api` autorizadas, sin ampliar `worker-api.ts`. |
| 10 | Trampas | PASS | Los pasos cubren pérdida de precisión JSON, estados parciales/ausentes, revalidación/backfill, supresión e invalidación, deducción de grupos pequeños, consumidores previos, concurrencia, presupuesto y Monetary condicional. |
| 11 | Git | PASS | El plan fija `mf/M27a`, preserva cambios ajenos y prohíbe al asistente operaciones destructivas, commit, push, merge y despliegue. |
| 12 | Fidelidad | FAIL | El plan cubre el alcance funcional de la spec, pero omite la revalidación sobre base integrada exigida por II.14d y por C-17. La omisión se describe en P-01. |

## Hallazgos

| ID (P-NN) | Severidad | Paso | Problema | Evidencia | Cambio propuesto |
|---|---|---:|---|---|---|
| P-01 | Media — requisito de coordinación | 0; falta control posterior | La ruta condiciona el paralelismo a una revalidación sobre la base integrada. El paso 0 solo valida la situación inicial, conflictos con M16f, destino y numeración; los pasos posteriores no ordenan repetir el control cuando cambie la base integrada. Por tanto, no queda asegurado C-17 ni el requisito de II.14d. | `meta_first/plan.md`, II.14d: coordinación de archivos/números y «revalidación sobre base integrada»; M27a-C-17. En `M27a/plan.md`, pasos 0–8 y verificación final no hay un control posterior de integración. | Añadir al plan un control explícito de revalidación sobre la base integrada, antes de continuar con controles que dependan de ella. Debe volver a confirmar checkout/rama independiente, archivos y destino compartidos, disponibilidad exclusiva del desechable y los números de migración/pgTAP; cualquier conflicto detiene el trabajo. Mantener la reconfirmación de `0032`/`21` antes de usarlos. |

## Observación no bloqueante

El plan anticipa que M27a excederá ocho horas y la organiza en etapas internas, preservando la microfase y el gate únicos exigidos por la ruta. No se recomienda dividirla en microfases o gates adicionales.

## Resultado y siguiente paso

**REQUIERE CAMBIOS.** Volver al modo de plan, incorporar P-01 sin ampliar el alcance y solicitar una nueva auditoría. El plan sigue en `BORRADOR`; esta auditoría no lo aprueba ni habilita la implementación.
