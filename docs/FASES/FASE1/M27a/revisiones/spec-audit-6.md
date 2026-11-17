# Seguimiento independiente de especificación M27a — ronda 6

**Fecha:** 2026-11-17 (UTC-03)  
**Rama / commit:** `mf/M27a` / `d349b987174aaa92463006cd390d7aefb7983418`  
**Hash de contenido actual:** `bdb7f168987f2c27a7460b50b34bd1d4510aed0b` (SHA-1 Git de `spec.md`, excluida únicamente la línea `**Estado:**`)  
**Estado de la spec:** BORRADOR  
**Alcance:** seguimiento acotado de A-10 tras la corrección puntual de la cita en `spec.md:68`. No se repitieron las auditorías 1–5 ni se volvió a ejecutar `npm ci` o `npm run verify`. No se editaron spec, código, plan, sesión, HALLAZGOS ni migraciones; solo se creó este informe. No se leyó `.env.local` ni se accedió a producción.  
**Veredicto oficial:** **APROBABLE**

## Evidencia del seguimiento

La ronda 5, en `revisiones/spec-audit-5.md`, dejó 17 ítems PASS y un único FAIL: A-10, porque `spec.md:68` citaba `PROJECT_STATE.md:26` en lugar de la fila de M16e. En el árbol actual, `spec.md:68` cita `docs/PROJECT_STATE.md:28 y :45`:

- `PROJECT_STATE.md:28` es la fila de M16e y documenta `G-TIENDA` aprobado.
- `PROJECT_STATE.md:45` declara que M27a está habilitada, que `G-TIENDA` satisface la dependencia de entrada y que puede avanzar en paralelo con M16f sin depender de `G-GA4-FUSION`.

Las otras cuatro referencias de A-10 siguen apuntando a las ubicaciones correctas, comprobadas en el árbol actual: `limits.ts:11`, `projection.ts:36-38,142-143`, `anomalias/page.tsx:13` y `tiendanube-data-api.test.ts:21`. No se reintrodujo ninguna de las cuatro citas erróneas corregidas en la ronda 5.

El estado de Git confirma el mismo HEAD que la ronda 5 (`d349b987174aaa92463006cd390d7aefb7983418`); los únicos cambios rastreados son documentales en `spec.md`, y no hay cambios de código. La spec sigue en `BORRADOR`.

Se reutilizan explícitamente los PASS restantes de la ronda 5, sin repetirlos: A-09 continúa resuelto en el contrato de la spec, sin afirmar que la implementación exista (`spec.md:417-437,586`; `spec-audit-5.md`); las decisiones D-M27a-01 a D-M27a-09 siguen declaradas como decisiones del usuario (`spec.md:642-650`); T-04 permanece pendiente (`spec.md:421,585,615,650`) y Monetary indisponible hasta evidencia concluyente, con C como bloqueo del gate (`spec.md:417-437,650,669-671`). La limitación monetaria no bloquea esta auditoría documental.

También se hereda la evidencia de baseline registrada en las rondas previas y transcrita en la ronda 5: sobre este mismo HEAD en un worktree limpio, `npm.cmd ci` y `npm.cmd run verify` terminaron con exit 0; pasaron lint, typegen, typecheck, 72 archivos / 1501 pruebas Vitest y build Next.js 16.4.5. No se repitieron comandos. Limitaciones heredadas: Node `v24.11.1` es inferior a algunos `engines` que piden `24.15.0+`; la instalación informó 17 vulnerabilidades (6 moderadas, 11 altas), sin impedir `verify`. La verificación no se ejecutó contra `app` ni producción.

## Checklist

| # | Ítem | PASS/FAIL/BLOQUEO | Evidencia |
|---:|---|---|---|
| 1 | Trazabilidad | PASS (heredado) | `spec-audit-5.md`, ítem 1; sin cambios de alcance en este seguimiento. |
| 2 | Alcance | PASS (heredado) | `spec-audit-5.md`, ítem 2; no se modificó la spec ni se amplió alcance. |
| 3 | Coherencia con la spec general | PASS (heredado) | `spec-audit-5.md`, ítem 3; código/HEAD siguen en el mismo commit. |
| 4 | Decisiones | PASS (reconfirmado) | D-M27a-01 a D-M27a-09 continúan en `spec.md:642-650`. |
| 5 | Trampas | PASS (heredado) | `spec-audit-5.md`, ítem 5. |
| 6 | Intervenciones y acciones reservadas | PASS (heredado) | `spec-audit-5.md`, ítem 6. |
| 7 | Verificación | PASS (heredado) | `spec-audit-5.md`, ítem 7. |
| 8 | Dependencias | PASS (reconfirmado) | `PROJECT_STATE.md:28,45`: G-TIENDA aprobado, M27a habilitada y paralelismo autorizado. |
| 9 | Lo entregado de verdad | PASS (heredado) | `spec-audit-5.md`, ítem 9; A-09 permanece resuelto contractualmente en `spec.md:417-437,586`. |
| 10 | Pendientes y hallazgos | PASS (reconfirmado) | T-04 sigue pendiente (`spec.md:421,585,615,650`); Monetary bloqueado hasta evidencia concluyente (`:417-437,650,669-671`); A-09 según ronda 5. |
| 11 | Contexto real | PASS (corrección verificada) | `spec.md:68` cita `PROJECT_STATE.md:28 y :45`; ambas líneas respaldan exactamente G-TIENDA/estado de M27a y paralelismo. Las otras cuatro referencias de A-10 también se comprobaron en sus líneas actuales. |
| 12 | Archivos previstos | PASS (heredado) | `spec-audit-5.md`, ítem 12. Este seguimiento solo añade el informe autorizado. |
| 13 | Diseño suficiente | PASS (heredado) | `spec-audit-5.md`, ítem 13. |
| 14 | Verificable | PASS (heredado) | `spec-audit-5.md`, ítem 14. |
| 15 | Sin nada abierto | PASS (heredado) | `spec-audit-5.md`, ítem 15; T-04 tiene procedimiento y resultado C bloqueante. |
| 16 | Ejecutable ahora | PASS (heredado) | `spec-audit-5.md`, ítem 16 y baseline descrito arriba; no se reinstaló ni se repitió `verify`. |
| 17 | Consistencia interna | PASS (heredado) | `spec-audit-5.md`, ítem 17; la corrección es únicamente la cita A-10. |
| 18 | Reglas no negociables | PASS (heredado) | `spec-audit-5.md`, ítem 18. |

## Contradicciones

Ninguna. La única referencia fallida de A-10 en la ronda 5 quedó corregida y sus dos destinos actuales respaldan la afirmación.

## Hallazgos

| ID (A-NN) | Severidad | Sección | Problema | Evidencia | Cambio propuesto | ¿Requiere decisión del usuario? |
|---|---|---|---|---|---|---|
| A-10 — resuelto | Baja | Contexto verificado en el código | La cita incorrecta a `PROJECT_STATE.md:26` fue sustituida por las dos referencias pertinentes. | `spec.md:68`; `PROJECT_STATE.md:28,45`; las otras cuatro referencias confirmadas arriba. | Ninguno pendiente. | No |

## Resultado y siguiente paso

**APROBABLE.** El seguimiento confirma la corrección puntual de A-10 y no encuentra cambios que invaliden los PASS heredados de la ronda 5. La spec permanece **BORRADOR** hasta la aprobación explícita del usuario. La validación T-04 sigue siendo un requisito pendiente de implementación; Monetary permanece indisponible y bloquea `G-SEGMENTOS-AUDIENCIAS` hasta que exista evidencia concluyente. No se inicia el plan.
