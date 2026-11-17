# Auditoría independiente de especificación M27a — ronda 4

**Fecha:** 2026-11-17 (UTC-03)  
**Rama / commit base:** `mf/M27a` / `d349b98` (`d349b987174aaa92463006cd390d7aefb7983418`)  
**Hash de contenido auditado:** `f6e8eb5b09ebe4f227d7e1e0333984961e14eb1b` (SHA-1 Git de `spec.md`, excluida la línea `**Estado:**`)  
**Estado de la spec:** BORRADOR  
**Estado Git al iniciar:** rama `mf/M27a`; `spec.md` modificado y `revisiones/` sin seguimiento. Se preservaron esos cambios.  
**Veredicto:** **REQUIERE CAMBIOS**

## Revisión del A-09 anterior y del estado monetario

Se verificaron el transporte y la proyección actuales, no la afirmación de que A-09 estuviera corregido. `client.ts:127` aplica `JSON.parse`; la proyección heredada `projection.ts:94-99` acepta `number` y lo convierte a texto, por lo que esa ruta existente sigue sin preservar los dígitos originales. La spec nueva, en cambio, limita M27a a strings JSON decimales con formato y precisión explícitos; un token numérico ya decodificado como `number` produce `incomplete`/`null`, y T-04 obliga a elegir C si un importe necesario llega como token numérico. M27a-T-05 especifica pruebas desde el JSON simulado por `getJson` hasta el parser, incluyendo `total_paid_by_customer` y `total_paid_diff`. El flujo estricto está dentro de los archivos autorizados (`projection.ts`, `sync.ts`, `repository.ts`); no necesita modificar `client.ts`. Por tanto, **A-09 está resuelto en el contrato de la spec**, sin afirmar que el código de M27a ya exista o funcione.

Monetary **sigue bloqueado**: `H-E1-270` permanece abierto y asignado a M27a; `M16e-H-06` no se verificó al cerrar `G-TIENDA`; `TN_COLLECTED_AMOUNT_ENABLED` continúa en `false` (`limits.ts:11`). La spec asigna T-04 a la implementación y prohíbe habilitar M, clasificar `alto_valor` o emitir propuestas dependientes de M antes de evidencia concluyente (`spec.md:421-437, 585, 650, 669-671`). Esta auditoría no ejecutó T-04 ni accedió a una tienda.

## Checklist

| # | Ítem | PASS/FAIL/BLOQUEO | Evidencia |
|---:|---|---|---|
| 1 | Trazabilidad | PASS | La tabla de criterios heredados incluye §18.1–§18.10 y CB-01–CB-06 (`spec.md:530-551`), sin omitir criterios de la ficha M27a (`meta_first/plan.md:461-473`). |
| 2 | Alcance | PASS | Diseño y archivos previstos se mantienen dentro de la ficha y II.14d (`meta_first/plan.md:977-1002`; `spec.md:501-527`). Los criterios operativos trazan a §18, decisiones o trampas (`spec.md:553-577`). |
| 3 | Coherencia con la spec general | PASS | El contrato se alinea con §18.1–§18.10 (`meta_first/spec.md:743-756`), conserva el tenant por membresía, lectura externa y límites de datos, y no altera los contratos de consumidores previos. |
| 4 | Decisiones | PASS | D-M27a-01 a D-M27a-09 constan como decisiones del usuario, fechadas el 2026-11-17 (`spec.md:642-650`). D-02 y D-09 mantienen el resultado A/B/C condicionado a evidencia y Monetary bloqueado antes de T-04. |
| 5 | Trampas | PASS | Se reflejan los riesgos de precisión, datos parciales, invalidación, deducción por privacidad y coordinación con M16f (`spec.md:623-635`). |
| 6 | Intervenciones y acciones reservadas | PASS | T-04, destino no productivo, comunicación del acta, `db:push:test`, publicación, migraciones de `app` y gate se asignan al usuario con verificaciones posteriores (`spec.md:611-621`), en línea con III.2 del plan. |
| 7 | Verificación | PASS | Se exigen `verify`, `db:check:test`, `test:policies` y `test:app`, además de conciliación sintética y recorrido; CB-06 queda incluido (`meta_first/plan.md`, III.3; `spec.md:603-609`). |
| 8 | Dependencias | PASS | `PROJECT_STATE.md:28,45` registra `G-TIENDA` aprobado, M27a habilitada en paralelo con M16f y Monetary como requisito de cierre. La sesión M16e y el código de Tiendanube están presentes en el HEAD auditado. |
| 9 | Lo entregado de verdad | PASS | Se inspeccionaron `client.ts:127`, `projection.ts:94-99,240` y el flujo de `sync.ts:315`. La nueva ruta rechaza números convertidos y no reutiliza la conversión heredada; la prueba T-05 cubre el recorrido y los formatos relevantes (`spec.md:421, 433, 586`). A-09 queda resuelto en la spec sin ampliar archivos autorizados. |
| 10 | Pendientes y hallazgos | PASS | `H-E1-270` y M16e-H-06 siguen pendientes; T-04, sus acciones de usuario y su efecto bloqueante quedan explícitos (`HALLAZGOS.md:859`; `PROJECT_STATE.md:28`; `spec.md:585, 617, 669-671`). No se presenta evidencia inexistente. |
| 11 | Contexto real | **FAIL** | Hay referencias `archivo:línea` incorrectas en la tabla de contexto de `spec.md:53-68`: `limits.ts:12` es una línea vacía (la constante está en :11); `projection.ts:39` es `PRODUCT_FIELDS`, no la proyección de pedidos (campos de pedido :36-38; `projectOrder` :142-143); `anomalias/page.tsx:14` lee `searchParams` (la guarda de sesión está en :13); `tiendanube-data-api.test.ts:20` está vacío (la descripción de datos/helpers empieza en :21); `PROJECT_STATE.md:26` documenta M25a, no el gate de M16e/M27a (la fila G-TIENDA está en :28). |
| 12 | Archivos previstos | PASS | Los archivos previstos están dentro de II.14d y de los grupos de seguimiento autorizados (`meta_first/plan.md:977-1002`; `spec.md:501-527`). SECURITY y ARCHITECTURE están incluidos según el contrato documental. No se requiere modificar `client.ts`. |
| 13 | Diseño suficiente | PASS | Contratos, estados, fórmulas, errores, estructuras SQL y responsabilidades están fijados en §§1–3 y §5 (`spec.md:79-437`). El tratamiento exacto de tokens JSON numéricos queda definido de extremo a extremo. |
| 14 | Verificable | PASS | Los criterios tienen casos y comandos existentes de `package.json`; hay negativos y bordes para precisión, privacidad, tenant, cobertura y errores (`spec.md:579-609`; `package.json`). T-04 y el recorrido UI son verificaciones manuales con resultado esperado declarado. |
| 15 | Sin nada abierto | PASS | “Preguntas abiertas” declara ninguna; las hipótesis tienen método y momento de verificación. T-04 y la tienda autorizada son pasos explícitos antes de habilitar Monetary, no resultados fingidos (`spec.md:652-671`). La documentación externa citada se complementa con la validación posterior obligatoria. |
| 16 | Ejecutable ahora | PASS | Worktree principal sucio: se creó un worktree detached fuera del repo en `d349b987174aaa92463006cd390d7aefb7983418`. `npm ci` (`npm.cmd`): exit 0. `npm run verify` (`npm.cmd`): exit 0; lint, typegen, typecheck, 72 archivos/1501 pruebas Vitest y build Next.js 16.4.5 pasaron. Worktree retirado y directorio residual `.next` eliminado; `git worktree list` volvió a mostrar solo el principal. No se leyeron `.env.local`, ni se ejecutaron pruebas contra `app` o producción. |
| 17 | Consistencia interna | PASS | Alcance, archivos, decisiones, criterios y casos coinciden. El nuevo parser estricto no contradice la conversión heredada porque la rechaza para M27a (`spec.md:407-437, 501-527, 560-601`). |
| 18 | Reglas no negociables | PASS | Tenant del servidor, ausencia de secretos/datos reales, migraciones nuevas, pruebas en destinos desechables, uso de `worker_api` y errores redactados están especificados (`spec.md:79-82, 501-527, 579-609`; `AGENTS.md`). |

## Contradicciones

Ninguna contradicción semántica con la ruta o el código. A-10 registra referencias de evidencia imprecisas, no un contrato incompatible.

## Hallazgos

| ID (A-NN) | Severidad | Sección | Problema | Evidencia | Cambio propuesto | ¿Requiere decisión del usuario? |
|---|---|---|---|---|---|---|
| A-10 | Baja | Contexto verificado en el código | Cinco citas de línea no apuntan al contenido que la spec atribuye: `limits.ts:12`, `projection.ts:39`, `anomalias/page.tsx:14`, `tiendanube-data-api.test.ts:20` y `PROJECT_STATE.md:26`. | `spec.md:53-68`; `limits.ts:11-12`; `projection.ts:36-39,142-143`; `anomalias/page.tsx:13-14`; `tiendanube-data-api.test.ts:19-21`; `PROJECT_STATE.md:26,28`. | Corregir las citas a las líneas/rangos efectivos y volver a comprobar cada referencia. Asignado a M27a; no requiere decisión de negocio. | No |

## Verificación de la base

El árbol principal estaba sucio; la base se verificó en worktree temporal detached del HEAD actual y fuera del repositorio:

- Primer intento con `npm ci` desde PowerShell: bloqueado por la política de ejecución de `npm.ps1`; no se ejecutó npm.
- Reintento con `npm.cmd ci`: exit 0.
- `npm.cmd run verify`: exit 0; 72 archivos y 1501 pruebas, build correcto.
- `git worktree remove` terminó con exit 0. Se detectó el `.next` generado que quedó en el directorio retirado; se eliminó únicamente ese residuo. Se confirmó que no queda el worktree temporal.

Advertencias no bloqueantes: Node `v24.11.1` está por debajo de algunos `engines` que piden `24.15.0+`; `npm ci` reportó 17 vulnerabilidades (6 moderadas, 11 altas). No impidieron la verificación. No se ejecutaron pruebas de base de datos porque esta auditoría solo requiere el baseline `verify` y no se debe usar un destino productivo.

## Observación de tamaño

El alcance previsiblemente excede ocho horas. Para organizarlo sin contradecir D-M27a-09 ni crear microfases/gates nuevos, el plan puede separar **etapas internas**: T-04 y lector estricto; migración, calidad y cálculo; loader/UI; privacidad, regresiones y QA integral.

## Resultado y siguiente paso

**REQUIERE CAMBIOS.** Corregir A-10 en las referencias de contexto y volver a auditar. A-09 queda resuelto en la spec, pero T-04 sigue pendiente y Monetary no puede habilitarse sin evidencia concluyente. Mantener la spec en **BORRADOR**; no aprobarla ni iniciar el plan hasta que una nueva auditoría resulte APROBABLE. No se modificaron la spec, el plan, la sesión, HALLAZGOS, migraciones ni código; el único archivo creado en el árbol principal en esta ronda es este informe.
