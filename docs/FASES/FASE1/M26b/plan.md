# M26b — Plan de implementación

**Estado:** APROBADO

Estados posibles: `BORRADOR` → `APROBADO`. Solo el usuario cambia el estado a `APROBADO`, después de una auditoría APROBABLE.

**Spec base:** `docs/FASES/FASE1/M26b/spec.md`, hash de contenido (sin la línea de estado): `5fd2789a9ef876825f2e2a1599cc483e187db396`.

**Hash de contenido de este plan.** Se calcula sin la línea de estado:

```bash
grep -v '^\*\*Estado:\*\*' docs/FASES/FASE1/M26b/plan.md | git hash-object --stdin
```

## Archivos

El alcance está contenido en II.14d de la ruta y sus archivos de seguimiento. No se autoriza modificar ningún otro archivo. Los artefactos de revisión se crean solo cuando corresponda al pipeline.

| Archivo | Nuevo o modificado | Paso | Autorizado por |
|---|---|---:|---|
| `docs/FASES/FASE1/M26b/plan.md` | Nuevo | 0–9 | II.14d; `docs/PIPELINE.md` |
| `docs/FASES/FASE1/M26b/spec.md` | Modificado (solo estado de aprobación) | 0 | II.14d; aprobación expresa del usuario |
| `docs/FASES/FASE1/M26b/revisiones/*.md` | Nuevos, según pipeline | 0 y después de 9 | II.14d; `docs/PIPELINE.md` |
| `docs/FASES/FASE1/M26b/sesiones/M26b.md` | Nuevo | 1–9 | II.14d |
| `docs/PROJECT_STATE.md` | Modificado al cambiar estado o gate | 0, 7, 9 | II.14d |
| `src/modules/strategies/contract.ts` | Nuevo | 2 | II.14d |
| `src/modules/strategies/rules.ts` | Nuevo | 2 | II.14d |
| `src/modules/strategies/engine.ts` | Nuevo | 2 | II.14d |
| `src/modules/strategies/load.ts` | Nuevo | 4–5 | II.14d |
| `src/modules/strategies/index.ts` | Nuevo | 2, 4 | II.14d |
| `src/modules/strategies/demo.ts` | Nuevo | 8 | II.14d |
| `src/modules/anomalies/load.ts` | Modificado, manteniendo comportamiento | 3 | II.14d |
| `src/modules/anomalies/index.ts` | Modificado, exports compatibles | 3 | II.14d |
| `src/modules/diagnostics/eligibility.ts` | Modificado, manteniendo comportamiento | 3 | II.14d |
| `src/modules/diagnostics/evidence.ts` | Modificado, exports compatibles | 3 | II.14d |
| `src/modules/diagnostics/index.ts` | Modificado, exports compatibles | 3 | II.14d |
| `tests/unit/meta-strategies.test.ts` | Nuevo | 2, 4, 8 | II.14d |
| `tests/unit/meta-anomalies.test.ts` | Modificado, regresión | 3 | II.14d |
| `tests/unit/diagnostics-evidence.test.ts` | Modificado, regresión | 3 | II.14d |
| `tests/app/meta-strategies.test.ts` | Nuevo | 5 | II.14d |
| `tests/component/app-estrategias.test.tsx` | Nuevo | 8 | II.14d |
| `tests/component/app-paginas-sesion.test.tsx` | Modificado, regresión de sesión/navegación | 8 | II.14d |
| `src/app/(app)/app/estrategias/page.tsx` | Nuevo | 8 | II.14d |
| `src/components/app/estrategias.tsx` | Nuevo | 8 | II.14d |
| `src/components/app/estrategias.module.css` | Nuevo | 8 | II.14d |
| `src/components/app/shell.tsx` | Modificado, navegación | 8 | II.14d |
| `docs/ARCHITECTURE.md` | Modificado solo si el componente/flujo pasa a existir | 8 | II.14d |
| `docs/HALLAZGOS.md` | Modificado solo ante hallazgo nuevo | 1–9 | II.14d |

No se modifican `package.json`, migraciones, SQL, RPC, `worker_api`, archivos de entorno ni otros documentos de la ruta, salvo que una auditoría detecte una necesidad: en tal caso se detiene el trabajo y se solicita el cambio de alcance antes de editar.

## Pasos

Aplicar TDD a todo comportamiento comprobable: primero escribir la prueba que falla por ausencia o incumplimiento del comportamiento y luego implementar hasta hacerla pasar. No leer `.env.local`, pedir secretos por chat, ejecutar `db:push:test` o correr pruebas contra producción. Ante un comando bloqueado por entorno o una falla de configuración, detener esa verificación, registrar el resultado y no repetirla sin una causa concreta que justifique el reintento.

Nota de trazabilidad del roadmap: los IDs `CB-01` a `CB-06` no son identificadores nuevos de la microfase. Son los criterios transversales definidos en `docs/FASES/FASE1/meta_first/spec.md` y se verifican para M26b mediante los casos `M26b-T-01` a `M26b-T-29`, la evidencia en `M26b/sesiones/M26b.md` y la ejecución de las suites exigidas por la ruta. No se crean `M26b-CB-*` ni `CB-xx` adicionales.

| # | Acción | Archivos | Criterios y casos que cubre | Verificación del paso |
|---:|---|---|---|---|
| 0 | Confirmar gate de ejecución: spec y plan únicos aprobados; comprobar que `G-DIAG` está cerrado, que M25b integrado en `main` está disponible, que `git branch --show-current` devuelve exactamente `mf/M26b` y que la rama parte de una base que contiene los documentos aprobados. No iniciar implementación si la rama no coincide o si el árbol/base no permite distinguir cambios previos del trabajo de M26b. | `docs/FASES/FASE1/M26b/{spec,plan}.md`, `docs/PROJECT_STATE.md`, `docs/FASES/FASE1/M26b/sesiones/M26b.md` | CB-01, CB-05, C-01, C-21; T-29 | Registrar rama, base, commit de referencia y estado de gates sin sobrescribir cambios preexistentes. La salida de `git branch --show-current` debe ser `mf/M26b`. El pipeline exige aprobación del plan antes de `/microfase M26b`; las acciones Git reservadas quedan a cargo del usuario y el asistente no usa operaciones destructivas ni hace push. |
| 1 | Escribir primero las pruebas rojas de contrato, determinismo, reglas, estados y límites usando los contratos y fixtures vigentes de M25b/M26a como referencia. Dejar documentado qué falla antes de implementar el motor, sin introducir reglas fuera de la spec. Si aparece una contradicción o falta una capacidad de la ruta, detenerse y registrar un hallazgo estable. | `src/modules/anomalies/{contract,detect,decimal,load,index}.ts` (lectura); `src/modules/diagnostics/{contract,eligibility,evidence,index}.ts` (lectura); `tests/unit/meta-strategies.test.ts`; `docs/FASES/FASE1/M26b/sesiones/M26b.md`; `docs/HALLAZGOS.md` (solo si aplica) | CB-01, CB-02, CB-05, CB-06; C-02, C-03, C-04, C-05, C-06, C-07, C-08, C-09, C-10, C-11, C-12, C-19, C-21; T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12, T-13, T-14, T-15, T-25 (parte unitaria) | Confirmar que los tipos/proyecciones corresponden a los contratos existentes. Las pruebas nuevas deben fallar antes de implementar el motor; no ampliar SQL/RPC ni reconstruir evidencia omitida. |
| 2 | Implementar contrato Zod estricto, catálogo, motor puro, reglas R1–R4, y la capa de cumplimiento de la spec; no se inicia con UI ni con carga de datos remotos. | `tests/unit/meta-strategies.test.ts`; `src/modules/strategies/{contract,rules,engine,index}.ts` | CB-01, CB-05; CA-82–CA-89; C-02, C-03, C-04, C-05, C-06, C-07, C-08, C-09, C-10, C-11, C-12; T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12, T-13, T-14, T-15 | `npm run test:unit -- tests/unit/meta-strategies.test.ts`. Revisar casos de borde, valores mayores a `MAX_SAFE_INTEGER`, IDs estables incluso con anomalías distintas de igual entidad/período, y que toda `high` sobreviva al truncado. |
| 3 | Antes de cambiar exports/helpers, reforzar o añadir pruebas de regresión; extraer el helper reusable de M25b y exponer los exports compatibles de M25b/M26a sin cambiar resultados ni contratos. | `tests/unit/meta-anomalies.test.ts`; `tests/unit/diagnostics-evidence.test.ts`; `src/modules/anomalies/{load,index}.ts`; `src/modules/diagnostics/{eligibility,evidence,index}.ts` | C-04, C-13, C-21; T-03, T-04, T-16 | `npm run test:unit -- tests/unit/meta-anomalies.test.ts tests/unit/diagnostics-evidence.test.ts`. Comparar regresiones contra el comportamiento previo; ningún cambio de SQL, RPC o semántica. |
| 4 | Escribir pruebas unitarias del loader, incluida la prioridad fail-fast ante `account` o `campaign` no completos; implementar el adaptador server-only con tenant/conexión/resumen resueltos una vez, lecturas permitidas y errores cerrados. Escribir además la prueba unitaria de fronteras excluidas antes de completar el schema. | `tests/unit/meta-strategies.test.ts`; `src/modules/strategies/{contract,load,index}.ts` | CA-88–CA-91; C-02, C-13, C-14, C-19; T-17, T-25 (parte unitaria) | `npm run test:unit -- tests/unit/meta-strategies.test.ts`. Por cada estado no completo, verificar `sync_incomplete` y que no se invoquen loaders de anomalías, configuración o métricas. Probar errores sin filtrar payloads y rechazo de campos Tiendanube/GA4/chat. |
| 5 | Solicitar al usuario la preparación local de variables de test de `.env.example` para el proyecto desechable; nunca leer `.env.local` ni recibir valores. Escribir primero las pruebas de integración roja para tenant, RLS, conexión K01, cero escrituras, proyección 7+7/28+28 y fuentes excluidas; implementar y verificar el adaptador con Data API/RPC existentes. Añadir la medición de carga máxima. | `tests/app/meta-strategies.test.ts`; `src/modules/strategies/load.ts`; `docs/FASES/FASE1/M26b/sesiones/M26b.md` | CA-83, CA-84, CA-90, CA-91; C-04, C-06, C-08, C-13, C-14, C-18, C-19, C-20; T-22, T-23, T-24, T-25 (parte app), T-26 | Antes de cualquier prueba remota ejecutar una vez `npm run db:check:test`. Si no confirma el entorno desechable, detener pruebas remotas y registrar bloqueo. Con destino confirmado: `npm run test:app -- tests/app/meta-strategies.test.ts`; repetir con los filtros de T-25 y T-26 según su matriz. No ejecutar `db:push:test`. T-22 a T-24 deben demostrar aislamiento y cero escrituras; T-26 debe medir 500 campañas × 56 días sin truncado ni payloads en evidencia. |
| 6 | Cerrar el checkpoint interno de motor/adaptador: repetir suites focales y regresiones; ejecutar los comandos remotos, de políticas, rendimiento y verificación indicados; registrar evidencia y bloqueos. Detenerse y solicitar la aprobación del usuario para `G-STRATEGY-ENGINE`. No ejecutar todavía `/implementation-review M26b` ni `/qa-review M26b`, porque revisan la microfase completa; no iniciar UI/demo. | Archivos de los pasos 2–5; `docs/FASES/FASE1/M26b/sesiones/M26b.md`; `docs/PROJECT_STATE.md`; `docs/HALLAZGOS.md` (solo si aplica) | CA-82–CA-91; C-01, C-02, C-03, C-04, C-05, C-06, C-07, C-08, C-09, C-10, C-11, C-12, C-13, C-14, C-18, C-19, C-20, C-21; T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12, T-13, T-14, T-15, T-16, T-17, T-22, T-23, T-24, T-25, T-26, T-27, T-29 | Ejecutar pruebas focales, `npm run db:check:test`, `npm run test:policies`, `npm run test:app -- tests/app/meta-strategies.test.ts`, medición T-26, `npm run verify`, `git diff --check` y búsqueda T-27. Registrar el checkpoint solo tras evidencia completa y aprobación expresa del usuario; `G-ANOMALIES` no lo bloquea. Las revisiones finales quedan para después del paso 9 y del commit del usuario. |
| 7 | Pausa obligatoria. Esperar aprobación expresa de `G-STRATEGY-ENGINE` y un pedido expreso del usuario para continuar con interfaz/demo dentro de M26b. Si no se reciben ambas señales, mantener M26b abierta y no ejecutar el paso 8. | `docs/PROJECT_STATE.md`; `docs/FASES/FASE1/M26b/sesiones/M26b.md` | C-01, C-21; T-29 | Registrar aprobación/checkpoint y pedido expreso. Una revisión aprobable no sustituye aprobación del usuario; el checkpoint no cierra la microfase ni habilita una sucesora. |
| 8 | Solo después de la pausa autorizada y antes de escribir código Next.js, leer la documentación de la versión instalada en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` y `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, incluida la firma vigente de `searchParams`, y respetar sus avisos de deprecación. Después, escribir primero pruebas de componentes para estados, tarjetas, datos sin objetivo, accesibilidad, UUID/nombres, sesión/navegación y demo. Luego crear fixture sintético separado, página protegida server-only, integración visual y navegación. La UI consume la salida del motor sin recalcularla; la demo debe retornar antes de K01 y cualquier lectura real. | `tests/unit/meta-strategies.test.ts`; `tests/component/app-estrategias.test.tsx`; `tests/component/app-paginas-sesion.test.tsx`; `src/modules/strategies/demo.ts`; `src/app/(app)/app/estrategias/page.tsx`; `src/components/app/{estrategias.tsx,estrategias.module.css,shell.tsx}`; `docs/ARCHITECTURE.md`; `docs/PROJECT_STATE.md` | CA-86, CA-88, CA-89, CA-92, CA-93; C-11, C-15, C-16, C-17; T-18, T-19, T-20, T-21 | Registrar en `sesiones/M26b.md` las guías instaladas consultadas y cualquier deprecación aplicable. Ejecutar `npm run test:unit -- tests/unit/meta-strategies.test.ts`; `npm run test:component -- tests/component/app-estrategias.test.tsx tests/component/app-paginas-sesion.test.tsx`. T-20 requiere que ambas invocaciones (unit y component) terminen con salida 0. Confirmar sesión en ambos modos, demo ficticia inequívoca, retorno a `/app/estrategias`, semántica accesible y ausencia de UUIDs en DOM/URLs/logs. Actualizar arquitectura solo cuando el flujo exista. |
| 9 | Ejecutar regresión y cierre técnico completos: suites unitarias, componentes, app y políticas; verificación; búsquedas y diff autorizado; recorridos autenticado real y demo sintética. Registrar todos los resultados en evidencia y dejar M26b como `VERIFICADO — PENDIENTE DE APROBACIÓN` si todo pasa. Preparar `G-STRATEGIES` para decisión expresa del usuario solo si también está cerrado `G-ANOMALIES`; de lo contrario dejarlo pendiente. Después de este paso, el usuario hace el commit de la implementación completa y recién entonces se ejecutan `/implementation-review M26b` y `/qa-review M26b` como pasos 10 y 11 del pipeline. | Todos los archivos de implementación autorizados; `docs/ARCHITECTURE.md`; `docs/PROJECT_STATE.md`; `docs/HALLAZGOS.md` (solo si aplica); `docs/FASES/FASE1/M26b/sesiones/M26b.md` | CA-82–CA-94; C-01, C-02, C-03, C-04, C-05, C-06, C-07, C-08, C-09, C-10, C-11, C-12, C-13, C-14, C-15, C-16, C-17, C-18, C-19, C-20, C-21, C-22; T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12, T-13, T-14, T-15, T-16, T-17, T-18, T-19, T-20, T-21, T-22, T-23, T-24, T-25, T-26, T-27, T-28, T-29 | Ejecutar verificación final. Realizar T-28 con coordinación del usuario, sin compartir secretos ni registrar datos sensibles. T-29 comprueba spec/plan únicos aprobados, hashes, auditorías, checkpoint, `G-ANOMALIES`, `git status --short` y evidencia redactada. Si no hay señal real suficiente, registrar exactamente «sin validación comercial». No autoaprobar `G-STRATEGIES`. Las revisiones finales exigen el commit completo y el árbol limpio. |

## Verificación final

Ejecutar en el orden indicado; las pruebas remotas solo después de confirmar el proyecto desechable con `npm run db:check:test`. No correr `db:push:test`, `test:eval`, pruebas contra producción ni llamadas reales a Meta/modelos.

```text
npm run test:unit -- tests/unit/meta-strategies.test.ts
npm run test:unit -- tests/unit/meta-anomalies.test.ts tests/unit/diagnostics-evidence.test.ts
npm run test:component -- tests/component/app-estrategias.test.tsx tests/component/app-paginas-sesion.test.tsx
npm run db:check:test
npm run test:policies
npm run test:app -- tests/app/meta-strategies.test.ts
npm run test:unit -- tests/unit/meta-strategies.test.ts -t "fronteras excluidas"
npm run test:app -- tests/app/meta-strategies.test.ts -t "sin dependencias ajenas"
npm run test:app -- tests/app/meta-strategies.test.ts -t "500 campañas por 56 días"
npm run verify
git diff --check
rg -n "service_role|worker_api|anthropic|deepinfra|company_id" src/modules/strategies src/app tests
```

Además, completar los recorridos T-28 y la evidencia T-29. Para T-27, justificar toda coincidencia; una búsqueda amplia no se considera aprobada sin inspección de cada resultado. Si cualquier comando queda bloqueado o falla por configuración/infraestructura, registrarlo en `sesiones/M26b.md`, no repetirlo automáticamente y dejar el criterio/gate correspondiente pendiente. Con la implementación completa y verificada, el usuario hace el commit exigido por el pipeline; sobre ese commit limpio se ejecutan, fuera de `/microfase M26b`, `/implementation-review M26b` y luego `/qa-review M26b`.

## Intervenciones del usuario y acciones reservadas

| Paso | Intervención o acción reservada | Verificación posterior |
|---:|---|---|
| 0 | Aprobar el plan después de auditoría APROBABLE. Integrar los documentos aprobados en la base de trabajo conforme al pipeline; el asistente no hace commits sin pedido expreso. | Estado `APROBADO`, hash de spec vinculado y base/árbol que contiene los documentos acordados. |
| 5 | Preparar localmente variables de test del proyecto desechable en `.env.local`; nunca compartirlas en chat. | `npm run db:check:test` confirma el destino antes de cualquier prueba remota. Si falla, se detiene y registra el bloqueo. |
| 6–7 | Aprobar `G-STRATEGY-ENGINE` y pedir expresamente que continúe la interfaz/demo. | Checkpoint registrado; la continuación no empieza sin ambas decisiones. |
| 9 | Coordinar el recorrido autenticado real y el recorrido de demo requeridos por T-28, sin publicar ni hacer push por iniciativa del asistente. | Evidencia redactada de ambos recorridos, sin secretos, IDs completos ni métricas sensibles. |
| Después de 9 | Hacer el commit de la implementación completa e invocar `/implementation-review M26b`; si resulta APROBABLE, invocar `/qa-review M26b`. | Revisiones ligadas al mismo commit, base correcta y árbol limpio salvo los informes permitidos por el pipeline. |
| Paso 12 del pipeline | Si `/qa-review M26b` emite `LISTO PARA PR`, hacer push de `mf/M26b` y abrir el PR usando `revisiones/pr.md`. | PR abierto contra `main`, con el commit revisado y la descripción de `pr.md`; el asistente no hace push ni abre el PR por iniciativa propia. |
| Paso 13 del pipeline | Esperar la revisión de Codex y la CI de `verify.yml`; si piden cambios, volver a `/microfase M26b`, hacer un nuevo commit y repetir ambas revisiones. | Codex sin bloqueantes y CI en verde sobre el commit vigente. |
| Paso 14 del pipeline | Aprobar `G-STRATEGIES` solo tras toda la evidencia y con `G-ANOMALIES` cerrado; registrar el gate, hacer el commit/push documental correspondiente y mergear el PR. | `docs/PROJECT_STATE.md` registra el gate aprobado, el PR está mergeado y `main` contiene el commit aprobado. Si falta una condición, el gate y el merge permanecen pendientes. |
| Paso 15 del pipeline | Ejecutar la publicación o despliegue y las demás acciones posteriores que liste `pr.md`. | Verificar el entorno publicado y el recorrido indicado por `pr.md`, sin exponer datos sensibles. No hay `db:push` al proyecto `app` porque M26b no crea migraciones. |

## Migraciones

No aplica. M26b no autoriza migraciones, RPC, funciones SQL, escrituras externas ni persistencia. No se ejecuta `db:push` contra el proyecto `app` porque no existe una migración de M26b, y `db:push:test` permanece expresamente prohibido.

## Riesgos

- La falta de resumen o sincronización completa de `account` o `campaign` debe bloquear recomendaciones R2/R3; se prefiere no recomendar con datos incompletos.
- Extraer helpers de M25b/M26a puede introducir regresiones aun sin cambiar SQL; mantener pruebas de regresión antes del cambio.
- La cuenta de pruebas vacía o con baja actividad puede demostrar funcionamiento técnico, pero no validar comercialmente las recomendaciones.
- La muestra previa de campañas es asimétrica; la limitación aprobada debe conservarse en motor y presentación.
- El alcance unificado es amplio por excepción expresa al límite de ocho horas; el checkpoint y la pausa explícita son obligatorios y no dividen la microfase.
- Las pruebas de base dependen de configuración y conectividad externas; no se repiten en bucle y nunca se redirigen a producción.

## Qué no se hace

- No crear una segunda microfase, spec o plan; no continuar automáticamente después de `G-STRATEGY-ENGINE`.
- No implementar código antes de auditar y aprobar este plan.
- No generar recomendaciones R2/R3 cuando falten resúmenes o la sincronización de cuenta/campaña no esté completa.
- No añadir persistencia, SQL, RPC, migraciones, workers, llamadas nuevas a Meta, LLM autoritativo, chat, Tiendanube ni GA4.
- No realizar escrituras en sistemas externos, despliegues, commits o pushes por iniciativa del asistente.
- No usar `db:push:test`, `test:eval`, datos reales en fixtures, secretos en logs/evidencia ni el demo como sustituto de suites.
- No cerrar `G-STRATEGIES` sin `G-STRATEGY-ENGINE`, `G-ANOMALIES`, las verificaciones requeridas y los recorridos; una falta de señal comercial se informa como «sin validación comercial».
