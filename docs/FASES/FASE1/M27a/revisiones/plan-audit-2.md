# Auditoría independiente del plan M27a — ronda 2

**Fecha:** 2026-11-17 (UTC-03)  
**Rama / commit:** `mf/M27a` / `d349b987174aaa92463006cd390d7aefb7983418`  
**Hash de contenido de la spec:** `bdb7f168987f2c27a7460b50b34bd1d4510aed0b`  
**Hash de contenido del plan:** `e9c35bfb85c5b10b9458d5cf862784b7f8bbe2c7`  
**Estado de la spec:** APROBADA; `spec-audit-6.md` es APROBABLE y registra el mismo hash.  
**Estado del plan:** BORRADOR.  
**Veredicto oficial:** **APROBABLE**

## Precondiciones y contexto comprobados

- Los estados en disco son `APROBADA` para la spec y `BORRADOR` para el plan. Los hashes Git de contenido, excluida únicamente la línea `**Estado:**`, coinciden con los hashes declarados en la spec y en este plan.
- `G-TIENDA` está cerrado y M27a está habilitada. La Parte I y II.14d de la ruta autorizan el trabajo paralelo con M16f bajo coordinación, sin dependencia funcional de `G-GA4-FUSION`.
- El árbol de migraciones llega a `0031_ga4_diag.sql` y el de pgTAP a `20_ga4.test.sql`. Los candidatos actuales son `0032` y `21`, sujetos a confirmar que siguen libres y no reservados por M16f.
- M16f sigue abierta. `PROJECT_STATE.md` registra el paso 9, mientras que la sesión más reciente registra avance hasta el paso 11 y una intervención del usuario pendiente para el paso 12. Ambos registros mantienen el gate abierto. El paso 0 del plan ordena cotejar el estado con esa sesión y detenerse ante conflictos; no trata los números candidatos como reserva.
- **P-01 revalidado:** el paso 8 ahora ordena revalidar sobre la base integrada, después de integrar cambios compartidos pertinentes de M16f y antes de los controles finales. Pide confirmar nuevamente rama/checkout `mf/M27a`, HEAD y cambios ajenos, archivos y destino compartidos, estado/coordinación de M16f, exclusividad del desechable y numeración de migración/pgTAP; ante base ausente o conflicto, detenerse. La integración, merge o rebase se reserva al usuario/equipo. La instrucción de no esperar `G-GA4-FUSION` cuando la base integrada esté disponible preserva el paralelismo autorizado y no crea una dependencia funcional.
- Se leyeron las fuentes requeridas por `.claude/skills/plan-auditor/SKILL.md`: `AGENTS.md`, plan y spec M27a, ficha M27a y II.14d de la ruta, precondiciones de toda la ruta, III.3 y III.9, `package.json`, secuencia de migraciones y código impactado (`projection.ts`, `sync.ts`, `repository.ts` y `shell.tsx`). También se revisaron `PROJECT_STATE.md`, la sesión de M16f y la migración existente de Tiendanube para contrastar coordinación y contratos.
- No se leyó `.env.local`, no se accedió a producción ni a proyectos remotos, no se ejecutaron pruebas funcionales y no se implementó código. El estado preexistente de Git se preservó.

## Checklist

| # | Ítem | PASS/FAIL/NO APLICA | Evidencia o justificación |
|---:|---|---|---|
| 1 | Spec base | PASS | El plan cita la spec y el hash de contenido. El hash actual y el de `spec-audit-6.md` coinciden. |
| 2 | Cobertura | PASS | C-01..C-18 y T-01..T-20 se asignan explícitamente a los pasos 0–9. §18.1–§18.10 y CB-01..CB-06 aparecen en acciones y verificaciones; los casos manuales y controles operativos tienen pasos propios. |
| 3 | TDD | PASS | La introducción prescribe rojo antes de implementar y verde después. Los pasos con código comprobable, incluidos SQL, sincronización, loader, UI y regresiones, disponen las pruebas primero. T-04 y T-18 se identifican como controles manuales posteriores. |
| 4 | Archivos | PASS | Los archivos caben en los grupos autorizados por II.14d y los de seguimiento. Los módulos/componentes concretan las rutas sugeridas. La migración es nueva; no se autorizan migraciones existentes, `package.json`, lockfile ni `worker-api.ts`. |
| 5 | Pasos | PASS | Cada paso tiene verificación. El paso 8 satisface la revalidación de II.14d sobre la base integrada antes del control final y detiene el gate si no hay base, destino o coordinación adecuados. |
| 6 | Migraciones | PASS | Se propone una migración nueva y una reversión mediante migración compensatoria nueva; se prohíbe modificar migraciones existentes. `0032` y `21` son los siguientes en el árbol, sujetos a reconfirmación antes de usarlos y tras integrar. |
| 7 | Comandos | PASS | Los scripts `verify`, `db:check:test`, `test:unit`, `test:component`, `test:policies`, `test:app` y `db:push:test` existen en `package.json`. Los comandos Git/SQL se verifican por sus propios mecanismos. Se incluyen las suites de III.3 y CB-06. |
| 8 | Acciones reservadas | PASS | `db:push:test`, T-04, aprobación/comunicación del acta, integración, publicación y gate están reservados al usuario/equipo en los momentos correspondientes y tienen verificación posterior. No se asigna al asistente push, despliegue ni `db:push` contra `app`. |
| 9 | Reglas | PASS | Se prohíbe exponer secretos/datos reales, el tenant se resuelve en servidor y la lectura usa JWT/RLS. Las pruebas y migraciones se limitan al desechable; el plan conserva el uso acotado de `worker_api` sin ampliar `worker-api.ts`. |
| 10 | Trampas | PASS | Se cubren precisión JSON, estados parciales/ausentes, revalidación/backfill, supresión e invalidación, deducción de grupos pequeños, consumidores previos, concurrencia, presupuesto y Monetary condicional. |
| 11 | Git | PASS | El plan fija `mf/M27a`, preserva cambios ajenos y prohíbe operaciones destructivas, commit, push, merge/rebase y despliegue por parte del asistente. La integración queda a cargo del usuario/equipo. |
| 12 | Fidelidad | PASS | El alcance, restricciones, T-04, salida C, privacidad, aislamiento, pruebas y condición del gate siguen la spec y la ruta. El paso 8 añade el control de paralelismo requerido, sin ampliar funcionalidad ni convertir `G-GA4-FUSION` en dependencia. |

## Hallazgos

| ID (P-NN) | Severidad | Paso | Problema | Evidencia | Cambio propuesto |
|---|---|---:|---|---|---|
| — | — | — | Ningún hallazgo vigente. P-01 queda resuelto. | `plan.md`, paso 8 y verificación final; II.14d de la ruta. | Ninguno. |

## Observación de esfuerzo

El plan anticipa que M27a excede ocho horas. Mantener etapas internas —contratos/esquema/sync, validación manual T-04, loader/UI/regresiones y revalidación integrada— es razonable; no se recomienda dividir la microfase ni crear gates adicionales. La coordinación y las intervenciones reservadas pueden alargar el calendario, sin cambiar el alcance aprobado.

## Resultado y siguiente paso

**APROBABLE.** P-01 quedó atendido. El plan permanece **BORRADOR**: este veredicto no cambia su estado ni aprueba la implementación. La decisión de aprobarlo corresponde al usuario; hasta entonces no se inicia M27a.
