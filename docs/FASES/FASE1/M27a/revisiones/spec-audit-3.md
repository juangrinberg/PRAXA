# Auditoría independiente de especificación M27a — ronda 3

**Fecha:** 2026-11-17 (UTC-03)  
**Commit base:** `d349b987174aaa92463006cd390d7aefb7983418` (`mf/M27a`)  
**Hash de contenido auditado:** `8e7388223d78e2bd4ed8a412819e82be4fdf8be5` (SHA-1 Git de `spec.md` excluyendo la línea `**Estado:**`)  
**Estado de la spec:** BORRADOR  
**Estado Git al iniciar:** `spec.md` modificado y `revisiones/` sin seguimiento (contenía los informes 1 y 2); ambos eran cambios preexistentes y se preservaron.  
**Veredicto:** **REQUIERE CAMBIOS**

La auditoría se hizo sobre la spec vigente y el código, no sobre la afirmación de que los hallazgos previos estaban corregidos. A-04 a A-08 están resueltos en la versión examinada: selección de moneda, procedencia de calidad y backfill, mapeo monetario, referencia de `DefinitionCode` y privacidad de celdas 0–4 ahora tienen contratos y pruebas explícitos. Las nueve decisiones aprobadas también están presentes. Sin embargo, el contrato de decimales exactos no es realizable con el transporte actual: el cliente convierte el JSON a `number` antes de que la proyección pueda validarlo. La solución requiere fijar una entrada decimal sin pérdida o autorizar el cambio de transporte fuera de los archivos hoy previstos. A-09 impide aprobar la spec.

## Checklist

| # | Ítem | Resultado | Evidencia |
|---:|---|---|---|
| 1 | Trazabilidad | PASS | `meta_first/plan.md` ficha M27a y §18.1–§18.10 están recogidos en `spec.md:535-555` como criterios heredados, junto con CB-01–CB-06. |
| 2 | Alcance | PASS | La ficha y II.14d autorizan RFM/cohortes/propuestas sin escrituras externas ni exportación de audiencias (`meta_first/plan.md:461-473, 977-1002`). El diseño respeta ese alcance; `client.ts` no está autorizado ni enumerado para modificación (`spec.md:508-529`). |
| 3 | Coherencia con la spec general | PASS | Se mantienen privacidad, aislamiento, vista read-only y estados; la disponibilidad monetaria sigue condicionada a T-04 (`spec.md:31, 430-434`). No se encontró contradicción con `meta_first/spec.md` ni con los contratos de las microfases consumidoras. |
| 4 | Decisiones | PASS | D-M27a-01 a D-M27a-09 figuran como decisiones del usuario (`spec.md:638-647`), incluidas las opciones A/B/C y Monetary indisponible mientras no haya evidencia. |
| 5 | Trampas | PASS | La spec refleja la pérdida potencial de precisión, datos parciales, invalidación, deducción por privacidad y coordinación con M16f (`spec.md:620-628`). |
| 6 | Intervenciones y acciones reservadas | PASS | Las acciones del usuario y las reservas de publicación, `db:push` y `db:push:test` siguen la ficha y III.2 del plan; la spec no pide secretos ni datos reales. |
| 7 | Verificación | PASS | III.3 exige para M27a `db:check:test`, `test:policies`, `test:app`, conciliación sintética y `verify` (`meta_first/plan.md:1118-1121`); la spec incluye las suites, CB-06 y casos concretos (`spec.md:535-555, 579-601`). |
| 8 | Dependencias | PASS | `PROJECT_STATE.md:28,45` registra `G-TIENDA` aprobado y M27a habilitada en paralelo con M16f. Se revisó la evidencia M16e y su excepción de Monetary; M16f sigue en curso, con coordinación condicionada según II.14d. |
| 9 | Lo entregado de verdad | **FAIL** | La spec exige decimales exactos (`spec.md:432`), pero el cliente existente ya aplica `JSON.parse` a la respuesta (`client.ts:127`) y la proyección acepta un `number` convirtiéndolo a texto (`projection.ts:94-99`). Esa conversión no recupera los dígitos perdidos. |
| 10 | Pendientes y hallazgos | PASS | H-E1-270 y M16e-H-06 siguen expresamente pendientes; T-04 se asigna a implementación y bloquea M/gate sin evidencia (`spec.md:430, 647, 653-668`; `PROJECT_STATE.md:28`). |
| 11 | Contexto real | PASS | Las referencias `archivo:línea` existentes se comprobaron contra el árbol actual. No se encontró referencia falsa entre las inspeccionadas. |
| 12 | Archivos previstos | PASS | Los archivos declarados corresponden a II.14d y a seguimiento autorizado (`spec.md:508-529`). El problema de A-09 es que la corrección necesaria podría requerir modificar un archivo que no está autorizado. |
| 13 | Diseño suficiente | **FAIL** | No está definido cómo preservar la exactitud antes de `projection.ts`; el único transporte real citado pierde precisión de tokens numéricos. El implementador tendría que escoger entre rechazar números, asumir strings o ampliar el parser/alcance. |
| 14 | Verificable | **FAIL** | T-05 prueba decimales y formas válidas/inválidas, pero no cubre un token numérico JSON que pierda precisión en el transporte (`spec.md:584`). No hay expectativa que detecte la pérdida antes de la proyección. |
| 15 | Sin nada abierto | PASS | “Preguntas abiertas” declara ninguna; las hipótesis externas tienen pasos de verificación explícitos. T-04 y el entorno de prueba están asignados sin fingir que ya se ejecutaron (`spec.md:653-668`). |
| 16 | Ejecutable ahora | PASS | Dependencias `G-TIENDA` y scripts existen. Con el árbol de trabajo sucio, se ejecutó `npm ci` y `npm run verify` en un worktree temporal detached y limpio del commit base. Ambos finalizaron con código 0; el worktree se removió. |
| 17 | Consistencia interna | **FAIL** | “Decimales exactos” y “no pasar por `number`” (`spec.md:82,432`) contradicen el recorrido real del cuerpo JSON a través de `client.ts:127` y `projection.ts:94-99`. |
| 18 | Reglas no negociables | PASS | La spec conserva tenant resuelto en servidor, ausencia de secretos/datos reales, migraciones nuevas, pruebas en destinos desechables, credenciales acotadas a `worker_api` y errores redactados (`spec.md:79, 508-529, 579-601`). |

## Contradicciones

| Elemento de la spec | Contradice a (fuente y ubicación) | Evidencia | Cómo se resuelve |
|---|---|---|---|
| Parser monetario con decimales exactos, sin pasar por `number` (`spec.md:432`) | Transporte vigente: `src/modules/integrations/tiendanube/client.ts:127`; conversión de montos en `projection.ts:94-99` | `JSON.parse` transforma tokens numéricos a IEEE-754 antes de la proyección. Por ejemplo, el token sintético `123456789012345.678901` se convierte en `123456789012345.67`; `String(number)` no restaura los dígitos. | Definir y probar una representación exacta de punta a punta. Si solo se aceptan strings decimales, rechazar números y bloquear la calidad monetaria ante ellos. Si hace falta preservar lexemas numéricos, la ruta debe autorizar el cambio del transporte/parser y sus pruebas antes de planificarlo. |

## Hallazgos

| ID | Severidad | Sección | Problema | Evidencia | Cambio propuesto | ¿Requiere decisión del usuario? |
|---|---|---|---|---|---|---|
| A-09 | Alta | §§1.1, 2, 3, 5 y 15 | La exactitud decimal se exige después de un parseo JSON con pérdida. Los importes pueden quedar alterados antes de la validación y volverse `verified` incorrectamente. `client.ts` no aparece en los archivos autorizados. | `spec.md:82, 432, 508-529, 584`; `client.ts:127`; `projection.ts:94-99`. Reproducción sintética: `JSON.parse('{"amount":123456789012345.678901}').amount` produce `123456789012345.67`. | Especificar entrada y flujo de precisión exacta, un estado seguro ante formatos no admitidos y una prueba de integración desde el texto JSON hasta el monto proyectado. Si la solución exige modificar `client.ts`, obtener primero la autorización de ruta correspondiente; no implementar fuera del alcance vigente. | **Sí**, si se requiere modificar un archivo fuera de II.14d. No, si se resuelve aceptando solo una forma decimal que el transporte actual preserve y rechazando de forma segura las demás. |

## Verificación de la base

El árbol principal no estaba limpio, por lo que la verificación se ejecutó en un worktree temporal limpio y detached de `d349b987174aaa92463006cd390d7aefb7983418`, fuera del repositorio:

- `npm ci` — código 0.
- `npm run verify` — código 0: lint, `next typegen`, typecheck, 72 archivos / 1501 pruebas Vitest y build Next.js 16.4.5.
- Se retiró el worktree temporal; `git worktree list` volvió a mostrar solo el árbol principal.

Hubo advertencias no bloqueantes: Node 24.11.1 es inferior a la versión 24.15+ requerida por algunos `engines`, y `npm ci` informó 17 vulnerabilidades de dependencias. No impidieron la verificación. No se leyó `.env.local`, no se usaron datos reales ni se ejecutaron pruebas contra producción.

## Resultado y siguiente paso

**REQUIERE CAMBIOS.** Corregir A-09 en la spec sin habilitar Monetary antes de evidencia T-04; si la solución implica `client.ts`, primero resolver la autorización de alcance. Luego solicitar una nueva auditoría de la spec corregida. No aprobarla ni iniciar el plan mientras A-09 siga abierto.
