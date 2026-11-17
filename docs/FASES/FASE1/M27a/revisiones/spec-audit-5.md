# Auditoría independiente de especificación M27a — ronda 5

**Fecha:** 2026-11-17 (UTC-03)  
**Rama / commit:** `mf/M27a` / `d349b987174aaa92463006cd390d7aefb7983418`  
**Hash de contenido auditado:** `b05ea349be3cf11b443d7d1dcf90041eec34487b` (SHA-1 Git de `spec.md`, excluida únicamente la línea `**Estado:**`)  
**Estado de la spec:** BORRADOR  
**Alcance de esta ronda:** revisión de la versión actual y creación exclusiva de este informe. No se editaron spec, código, plan, sesión, HALLAZGOS ni migraciones; no se leyó `.env.local` ni se accedió a producción.  
**Veredicto oficial:** **REQUIERE CAMBIOS**

## Revisión de A-10 y de la versión actual

Se comprobaron en los archivos actuales las cinco citas indicadas por A-10, sin dar por válida la afirmación de que ya se corrigieron:

| Cita auditada | Resultado | Evidencia actual |
|---|---|---|
| `limits.ts:11` | PASS | La línea 11 declara `TN_COLLECTED_AMOUNT_ENABLED = false`. |
| `projection.ts:36-38,142-143` | PASS | Las primeras líneas son `ORDER_FIELDS`; las últimas definen `projectOrder`. |
| `anomalias/page.tsx:13` | PASS | La línea 13 llama a `requireAppSession('/app/anomalias')`. |
| `tiendanube-data-api.test.ts:21` | PASS | El comentario de la prueba y su propósito empiezan en la línea 21. |
| `PROJECT_STATE.md:26` | **FAIL** | La línea 26 corresponde a M25a. La fila de M16e y `G-TIENDA` es la 28; la línea 45 sí respalda que M27a está habilitada y puede avanzar en paralelo con M16f. La cita de la spec en `spec.md:68` conserva `:26 y :45`, por lo que A-10 no está completamente corregido. |

La corrección necesaria es sustituir `docs/PROJECT_STATE.md:26` por `:28` en la fila de contexto de `spec.md:68`, conservando `:45` para el paralelismo. La referencia falsa hace fallar el ítem 11 de la skill aunque el resto del contrato sea coherente; por ello no corresponde APROBABLE en esta ronda.

## A-09, decisiones y bloqueo monetario

A-09 está resuelto **en el contrato de la spec**, no se afirma que la implementación ya exista: `client.ts:127` usa `JSON.parse`, y la proyección heredada `projection.ts:94-99` acepta `number`; §§2–3 de la spec (líneas 398, 417–437) exigen para M27a strings decimales estrictos, rechazan tokens numéricos ya decodificados y producen `incomplete`/`null`, con T-05 desde `getJson` hasta el parser (`spec.md:586`). No hace falta modificar `client.ts`, fuera de los archivos previstos.

Las decisiones D-M27a-01 a D-M27a-09 siguen declaradas como decisiones del usuario (`spec.md:642-650`) y alineadas con §18 de la ruta. T-04 permanece **pendiente** y expresamente asignado a la implementación (`spec.md:421`, `585`, `615`, `650`). `M16e-H-06` sigue no verificada; `TN_COLLECTED_AMOUNT_ENABLED` sigue `false` (`limits.ts:11`; `meta_first/sesiones/M16e.md`, cierre de paso 10 y paso 14). `H-E1-270` continúa abierto y asignado a M27a (`HALLAZGOS.md:859`). Monetary no se presenta como validado: su estado empieza indisponible y solo evidencia concluyente de T-04 puede habilitar A o B; C bloquea el gate (`spec.md:409-437, 650, 669`; `PROJECT_STATE.md:45`). Esto bloquea la habilitación monetaria y el gate, no la auditoría documental de la spec.

## Rama, commit, hash, alcance y baseline

- La comprobación de Git dio rama `mf/M27a`, HEAD `d349b987174aaa92463006cd390d7aefb7983418`, igual al commit del worktree de auditoría 4.
- `git diff --name-only` muestra únicamente `docs/FASES/FASE1/M27a/spec.md`; los archivos sin seguimiento son informes en `docs/FASES/FASE1/M27a/revisiones/`. Por tanto, todos los cambios posteriores al HEAD son documentales y no alteran el código base.
- Se reutiliza la evidencia exacta de la auditoría 4, ejecutada en un worktree detached de ese mismo commit: `npm.cmd ci` — exit 0; `npm.cmd run verify` — exit 0. Pasaron lint, typegen, typecheck, 72 archivos / 1501 pruebas Vitest y build Next.js 16.4.5. El worktree temporal fue retirado. No se repitió la instalación ni `verify`, porque HEAD sigue idéntico y el único cambio posterior es documental.
- Limitaciones registradas entonces: Node `v24.11.1` es inferior a algunos `engines` que piden `24.15.0+`; `npm.cmd ci` informó 17 vulnerabilidades (6 moderadas, 11 altas), sin impedir `verify`. No se ejecutó contra `app` o producción.
- El SHA-1 de contenido actual se calculó excluyendo solo la línea `**Estado:**`; la spec permanece en **BORRADOR**.

## Checklist

| # | Ítem | PASS/FAIL/BLOQUEO | Evidencia |
|---:|---|---|---|
| 1 | Trazabilidad | PASS | `spec.md:530-551` recoge §18.1–§18.10 y CB-01–CB-06; ficha M27a en `meta_first/plan.md:461-473`. |
| 2 | Alcance | PASS | Archivos y diseño se mantienen en II.14d (`meta_first/plan.md:977-1002`; `spec.md:501-527`); criterios operativos trazan a la ruta, decisiones o trampas (`spec.md:553-577`). |
| 3 | Coherencia con la spec general | PASS | Contrato cotejado con `meta_first/spec.md:743-756` y con consumidores M16e/M16f; sin contradicción de alcance, tipos o estados. |
| 4 | Decisiones | PASS | D-M27a-01 a D-M27a-09 figuran como decisiones del usuario (`spec.md:642-650`); T-04 y Monetary continúan condicionados, no aprobados por anticipado. |
| 5 | Trampas | PASS | Precisión, estados parciales, invalidación, deducción por privacidad y coordinación con M16f están reflejados (`spec.md:623-635`). |
| 6 | Intervenciones y acciones reservadas | PASS | T-04, destino no productivo, acta, `db:push:test`, publicación, migraciones de `app` y gate se asignan al usuario con verificación posterior (`spec.md:611-621`; ficha y III.2 de la ruta). |
| 7 | Verificación | PASS | `verify`, `db:check:test`, `test:policies`, `test:app` y CB-06 están incluidos (`spec.md:603-609`; `meta_first/plan.md:1118-1121`). |
| 8 | Dependencias | PASS | `G-TIENDA` está aprobado y M27a habilitada en paralelo, con condiciones de II.14d; `G-GA4-FUSION` no es dependencia (`PROJECT_STATE.md:28,45`; `meta_first/plan.md:977-1002`). |
| 9 | Lo entregado de verdad | PASS | El transporte/proyección existentes se contrastaron (`client.ts:127`, `projection.ts:94-99`, `sync.ts:315`); el parser estricto propuesto rechaza números y evita la pérdida de precisión sin cambiar `client.ts` (`spec.md:417-437`). |
| 10 | Pendientes y hallazgos | PASS | H-E1-270 y M16e-H-06 siguen pendientes; T-04 está asignado a implementación y bloquea M/gate sin evidencia (`HALLAZGOS.md:859`; `M16e.md`, pasos 10 y 14; `spec.md:585,669-671`). |
| 11 | Contexto real | **FAIL** | Cuatro citas de A-10 ya apuntan al contenido correcto; `spec.md:68` aún cita `PROJECT_STATE.md:26`, que documenta M25a, no el gate de M16e/M27a. La fila pertinente de G-TIENDA está en `PROJECT_STATE.md:28`; el paralelismo de M27a, en `:45`. |
| 12 | Archivos previstos | PASS | Archivos dentro de II.14d y grupos de seguimiento autorizados (`meta_first/plan.md:977-1002`; `spec.md:501-527`). No se requiere modificar `client.ts`; los documentos transversales están previstos conforme a sus responsabilidades. |
| 13 | Diseño suficiente | PASS | Contratos, estados, fórmulas, errores y estructuras de SQL están definidos en §§1–8; el flujo monetario estricto y la salida segura quedan especificados en §3 (`spec.md:79-499`). |
| 14 | Verificable | PASS | Casos trazan a comandos existentes de `package.json`; hay negativos y bordes para precisión, privacidad, aislamiento, calidad y errores (`spec.md:579-609`; `package.json:15-27`). T-04 es manual y tiene salida esperada; no se declara ejecutado. |
| 15 | Sin nada abierto | PASS | Preguntas abiertas vacías; las hipótesis tienen verificación asignada. La limitación externa de T-04 tiene procedimiento y resultado C bloqueante (`spec.md:650-671`). |
| 16 | Ejecutable ahora | PASS | G-TIENDA y scripts requeridos existen. Baseline `verify` se reutiliza por el mismo HEAD y cambio posterior exclusivamente documental; evidencia y limitaciones están arriba. |
| 17 | Consistencia interna | PASS | Alcance, diseño, archivos, decisiones, criterios y pruebas coinciden; Monetary no se habilita antes de T-04 (`spec.md:407-437,501-527,579-609,642-671`). |
| 18 | Reglas no negociables | PASS | Tenant servidor, ausencia de secretos/PII/datos reales, migraciones nuevas, pruebas en destino desechable, acceso por `worker_api` y errores redactados están especificados (`spec.md:79-82,501-527,579-609`; `AGENTS.md`). |

## Contradicciones

| Elemento de la spec | Contradice a (fuente y ubicación) | Evidencia | Cómo se resuelve |
|---|---|---|---|
| Cita `docs/PROJECT_STATE.md:26` como evidencia de gate de entrada/paralelismo (`spec.md:68`) | `docs/PROJECT_STATE.md:26` (fila M25a); el estado pertinente está en `:28` y `:45` | La línea 26 no documenta G-TIENDA ni el estado de M27a. | Cambiar la cita `:26` por `:28`; conservar `:45`. |

No se encontró contradicción semántica con la ruta ni con el código. A-10 es una referencia de evidencia incorrecta.

## Hallazgos

| ID (A-NN) | Severidad | Sección | Problema | Evidencia | Cambio propuesto | ¿Requiere decisión del usuario? |
|---|---|---|---|---|---|---|
| A-10 | Baja | Contexto verificado en el código | La quinta cita señalada en la ronda 4 no quedó corregida: `PROJECT_STATE.md:26` apunta a M25a. Las otras cuatro citas auditadas sí están corregidas. | `spec.md:68`; `PROJECT_STATE.md:26,28,45`. | Sustituir `:26` por `:28` y volver a verificar la referencia. Asignado a M27a. | No |

## Observación de tamaño

El alcance probablemente excede ocho horas. Para organizarlo sin crear microfases o gates nuevos ni alterar D-M27a-09, el futuro plan puede ordenar etapas internas como T-04/lector estricto, calidad y cálculo, loader/UI y privacidad/regresiones/QA.

## Resultado y siguiente paso

**REQUIERE CAMBIOS.** Corregir A-10 en la cita de `spec.md:68` y solicitar otra auditoría sobre el nuevo hash. Mantener la spec en **BORRADOR**. T-04 sigue pendiente y Monetary no puede habilitarse ni cerrar `G-SEGMENTOS-AUDIENCIAS` sin evidencia concluyente. No se modificaron los informes/rondas 1–4 ni ningún otro archivo.
