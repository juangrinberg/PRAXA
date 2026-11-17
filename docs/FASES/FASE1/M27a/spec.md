# M27a — RFM, cohortes y propuestas de audiencias

**Estado:** BORRADOR

Estados: BORRADOR → APROBADA. Solo el usuario aprueba después de una auditoría APROBABLE. Una única microfase, una spec, un plan y un gate: `G-SEGMENTOS-AUDIENCIAS`. Ningún control interno es un gate adicional.

**Hash de contenido.** Excluir únicamente la línea de estado:

```bash
grep -v '^\*\*Estado:\*\*' docs/FASES/FASE1/M27a/spec.md | git hash-object --stdin
```

## Fuentes

- Ruta: `docs/FASES/FASE1/meta_first/plan.md:461` (ficha), `:977` (II.14d), III.3 y III.9; `meta_first/spec.md:743` (§18).
- Commit base inspeccionado: `98c0bfd4ddeb7cba080a4c01b6c80f3675c20759`, rama main, 2026-11-17. La enmienda aprobada está sin commit en cinco archivos; se preserva. No se atribuye su contenido al commit base.
- `AGENTS.md`, `docs/PIPELINE.md`, plantilla `docs/_templates/mf-spec.md`, SECURITY, ARCHITECTURE, PROJECT_STATE, HALLAZGOS y enmienda `meta_first/revisiones/enmienda-rfm-cohortes-audiencias-2026-11-17.md`.
- Dependencia: M16e, `G-TIENDA` aprobado con excepciones; evidencia `meta_first/sesiones/M16e.md`, cierre del paso 14. La excepción monetaria de M16e no permite cerrar M27a. M16f es trabajo paralelo, no dependencia.
- Código y migraciones citados abajo; `M16e/spec.md` §§3–6 y M16e-H-06; `M16f/plan.md`, tabla Archivos, para coordinación.
- [Order, API 2025-03](https://tiendanube.github.io/api-documentation/resources/order), consultado el 2026-11-17: propiedades e historial de valores. Se consultó documentación pública; no hubo acceso a la tienda, respuestas reales ni experimentos.
- IDs cubiertos: únicamente M27a (#18 + #32). M26b sigue reservado para estrategias publicitarias #13.

## Objetivo

Convertir comportamiento comercial verificable de Tiendanube en segmentos, cohortes y propuestas publicitarias accionables, sin crear ni transferir audiencias.

## Alcance

RFM completo, incluida una definición monetaria validada; análisis de cohortes cuya validez esté acreditada; pantalla independiente integrada en `/app/clientes`; motor de reglas determinístico y versionado para propuestas. Distribución y métricas económicas por segmento, matriz de retención, evolución temporal y fichas de propuestas forman un único producto.

La validación monetaria, TDD, privilegios, aislamiento, calidad, privacidad, disponibilidad y borrado son obligatorios. Esta spec desarrolla un diseño candidato completo: las elecciones materiales Q-01 a Q-08 están abiertas, con alternativa recomendada concreta. Los apartados afectados no son requisitos aprobados hasta resolverlas. No se implementa una alternativa por defecto por falta de respuesta.

## Fuera de alcance

Crear, exportar o sincronizar audiencias, descargar listas o identificadores; modificar campañas; APIs de audiencias, nuevos scopes, escrituras externas; LLM, chat, diagnóstico, reporting o recomendaciones publicitarias generales de #13. Sin GA4 individual, resolución de personas por PII, atribución de ventas, causalidad, rentabilidad, ganancia, LTV predictivo, notificaciones, programación automática ni perfiles individuales visibles.

Sin nuevas dependencias o cambios de package/lockfile. No activar `TN_COLLECTED_AMOUNT_ENABLED` ni habilitar montos en consumidores anteriores. No sumar monedas ni sustituir cobrado por precio del pedido. No heredar la excepción de pruebas en app de M16e como autorización nueva: toda validación M27a usa entornos de prueba autorizados.

## Contexto verificado en el código

| Qué | Dónde (archivo:línea) | Implicación |
|---|---|---|
| Tenant construido sin argumentos en servidor; getClaims, membresía y rol owner | src/modules/tenant/context.ts:11 y :39 | Reutilizar requireTenantContext; cliente no elige empresa. |
| Lectura de conexión por proveedor bajo JWT | src/modules/integrations/repository/connections.ts:77 | Resolver Tiendanube en servidor; ninguna necesidad de Meta activa. |
| Solo estado vigente por pedido, importes numeric e ID opaco | supabase/migrations/0023_tiendanube.sql:249 | No existe historial de snapshots de cliente para reconstrucción histórica. |
| Elegible: paid/partially_refunded, no cancelled | supabase/migrations/0023_tiendanube.sql:298 | Heredar exactamente; partially_paid va aparte. |
| Líneas referencian pedido, cliente compuesto por empresa/conexión | supabase/migrations/0023_tiendanube.sql:280 y :308 | Calcular pertenencia dentro de la misma conexión; no unir por ID externo global. |
| Cobertura y estado | supabase/migrations/0023_tiendanube.sql:399 y :629 | Corte de días completos: fecha local de coverage_until menos un día; backfill solo no basta. |
| Sumas de ventas usan coalesce de montos y reembolsos | supabase/migrations/0023_tiendanube.sql:640 | No reutilizar esos totales para probar completitud monetaria ni M por cliente. |
| Cohortes privadas se calculan antes de supresión | supabase/migrations/0023_tiendanube.sql:688 | Los conteos ya ocultos del getter no permiten reconstruir RF/M. |
| Getter existente | supabase/migrations/0023_tiendanube.sql:2604 | get_tn_cohorts(uuid,date,date,integer): meses, offset, tamaño/activos/retención, ocultamiento, parcial, fetched_at, zona y definition; INVOKER. |
| Tablas privadas sin grants y públicas con RLS | supabase/migrations/0023_tiendanube.sql:522 y :578 | Agregar salida agregada propia; no abrir lectura privada. |
| Monto global deshabilitado | src/modules/integrations/tiendanube/limits.ts:12 | Mantener false; validación propia no habilita chat/diagnóstico. |
| Proyección cerrada de pedidos | src/modules/integrations/tiendanube/projection.ts:39 y :143 | Extender solo campos de calidad estrictamente necesarios; nunca payload bruto ni PII. |
| Historia de reembolsos reconoce varias formas y convierte números con toFixed(2) | src/modules/integrations/tiendanube/projection.ts:240 | No acreditar contrato, precisión ni completitud por esta función; validación cerrada para M27a. |
| Historial se lee solo para refunded/partially_refunded; presupuesto/error deja nulo | src/modules/integrations/tiendanube/sync.ts:315 | No tratar nulo como cero ni inferir que paid nunca tuvo una edición. |
| Publicación con actor, empresa, generación, run y lease | src/modules/integrations/tiendanube/repository.ts:55 y :113 | Preservar ownership y compatibilidad de publicación. |
| Privacy marca supresiones antes del borrado; recalcula después | supabase/migrations/0023_tiendanube.sql:2344; private.tn_drop_suppressed en :814 | Invalidar derivado al marcar, sin esperar la siguiente sincronización. |
| allowlist SQL y aridades del cliente privilegiado | src/modules/integrations/db/worker-api.ts:9 y :86 | No usar SQL arbitrario ni crear otro cliente; no hace falta ampliar rol para el diseño recomendado. |
| Pantalla Tiendanube solo lee agregados | src/modules/integrations/tiendanube/analysis.ts:138 y :205 | Mantener sus contratos; no reutilizar su DTO sin importes como RFM. |
| Navegación central | src/components/app/shell.tsx:27 y :42 | Añadir Clientes con icono existente, sin modificar estado de fuentes. Ruta /app/clientes no existe en la inspección. |
| Página protegida verifica sesión independientemente | src/app/(app)/app/anomalias/page.tsx:14; src/modules/app-data/index.ts:34 | Seguir el patrón de sesión; no confiar solo en layout/proxy. |
| RPC públicas invoker y definer solo no expuestos | docs/ARCHITECTURE.md:146; docs/SECURITY.md:159 | Mantener separación, search_path vacío, grants mínimos y chequeos por capa. |
| Proyectos unit/component/app y suites remotas secuenciales | vitest.config.mts:26 y :67 | Tests nuevos entran sin modificar configuración. |
| Scripts de verificación disponibles | package.json:8 | Usar comandos existentes, no inventar scripts. |
| Fixtures app con backend real y cleanup por RUN_ID | tests/app/tiendanube-data-api.test.ts:20 | Reutilizar helpers; aserciones con JWT, no service_role. |
| Gate de entrada cerrado y paralelismo autorizado | docs/PROJECT_STATE.md:26 y :45 | Expandir ahora; coordinar implementación futura sin esperar G-GA4-FUSION. |
| Monetaria pendiente estable | docs/HALLAZGOS.md:859 | H-E1-270 bloquea M y cierre; no bloquea redactar esta spec. |

## Diseño concreto

### 1. Contratos, nombres y separación de responsabilidades

Los nombres de esta sección son **previstos**, salvo los citados como existentes arriba.

- `src/modules/customer-insights/contract.ts`: esquemas Zod estrictos para DTO público, reglas y ausencias; ninguna clave de empresa, tienda, cliente, pedido o conexión en el DTO que cruza a componentes.
- `rules.ts`: definiciones versionadas, textos fijos, códigos de segmento y propuesta; sin red ni acceso a entorno.
- `proposals.ts`: `buildAudienceProposals(view: InsightsData): readonly AudienceProposal[]`; recibe solo agregados sanitizados y evidencia tipada. No produce cifras nuevas salvo formateo; elige plantillas por reglas.
- `load.ts`: `loadCustomerInsightsView(): Promise<CustomerInsightsView>`, server-only, requireTenantContext + conexión por proveedor + cliente Supabase del servidor. Ningún argumento de tenant. Error de autorización se trata sin revelar existencia de otra empresa.
- `page.tsx`: requireAppSession('/app/clientes'), loader, PageHeader y componente. Sin filtros arbitrarios, consultas de personas, demo de producción ni efectos de escritura en GET.
- SQL hace agrupación, RF/M y cohortes con numeric exacto. TypeScript selecciona propuestas sobre agregados; pruebas usan oráculos de fixtures escritos a mano, no copias del SQL.
- Strings decimales para dinero, tasas y medias; contadores enteros seguros. Sin parseFloat/sumas binarias de moneda. El formato visual redondea solo al final y conserva la precisión de cálculo. JSON de entrada/salida validado, límites y versiones cerrados.

`CustomerInsightsView` es unión discriminada: `sin_empresa | sin_conexion | requiere_reauth | sin_cobertura | sin_compras | monetario_no_validado | calidad_insuficiente | privacidad | listo | error`. Cada estado tiene mensaje fijo, período/fuente cuando exista y secciones disponibles; `monetario_no_validado` puede conservar cohortes válidas, nunca simular RFM completo.

`InsightsData`: `ruleset='rfm_v1'`, `source='tiendanube'`, `asOfDay`, `fetchedAt`, `timezone`, `currency`, `rfmFrom`, `firstPurchaseBasis='observada'`, `quality`, `segments`, `cohorts`, `productEvidence`. Cada métrica es `{ value: string|null, absence: null|'sin_cobertura'|'periodo_abierto'|'monetario_no_validado'|'dato_incompleto'|'privacidad'|'sin_denominador', definition: string }`. No inferir ausencia a partir del valor; validaciones impiden valor y absence simultáneos.

`AudienceProposal`: `id`, `ruleVersion`, `name`, `objective`, `segmentRefs`, `identifiedCustomers` (métrica o null con motivo), `inclusion`, `exclusion`, `evidenceRefs`, `justification`, `suggestedStrategy`, `limitations`. Sin listas ni identificadores individuales. Solo códigos de segmentos y referencias a celdas del mismo DTO; ningún texto del catálogo funciona como regla.

### 2. Datos y publicación agregada (diseño recomendado, Q-01)

Se recomienda **un snapshot agregado vigente por conexión y moneda**, no perfiles nuevos persistidos. Alternativa y decisión en Q-01. La recomendación permite RLS de lectura sin otorgar SELECT privado a authenticated.

Nueva `public.tn_customer_insights`: `company_id uuid not null`, `connection_id uuid not null`, `currency text not null`, `generation integer not null`, `ruleset text not null`, `as_of_day date not null`, `fetched_at timestamptz not null`, `payload jsonb not null`. PK (connection_id,currency); FK compuesta (company_id,connection_id) a integration_connections con cascada, company_id consistente. Solo datos públicos ya sanitizados dentro de payload; no IDs de personas ni conteos ocultos en JSON lateral, atributos, metadatos o errores.

RLS ENABLE + FORCE; SELECT authenticated solo por private.is_company_member(company_id), conexión Tiendanube activa, misma generación y sin snapshot invalidado. REVOKE ALL a public/anon/authenticated/service_role/praxa_integrations; luego solo SELECT authenticated. Ningún grant de escritura para usuarios o acceso directo para rol acotado. La conexión/política resuelve membresía bajo RLS; no acepta company_id del cliente.

Nueva `public.get_tn_customer_insights(p_connection_id uuid, p_currency text)` → TABLE(`as_of_day date, fetched_at timestamptz, ruleset text, payload jsonb`), STABLE, SECURITY INVOKER, search_path vacío. Entrada UUID no nula y moneda ISO de tres letras; error 22023 con mensaje fijo para sintaxis inválida. Conexión ajena/inactiva o snapshot ausente devuelve cero filas. EXECUTE solo authenticated; getter no calcula con acceso privilegiado a tablas privadas.

Nuevos helpers `private.tn_refresh_customer_insights(p_connection_id uuid)` y `private.tn_invalidate_customer_insights(p_connection_id uuid)`: sin grants a roles runtime, llamados desde operaciones privilegiadas ya autorizadas. INVOKER por defecto; no helper DEFINER accesible a authenticated. Refresh identifica empresa/proveedor/generación desde la conexión bloqueada; no recibe datos ni tenant del navegador. El único contexto de ejecución es la transacción de sincronización verificada con actor/empresa/run/lease. No expone personas al servidor Node ni devuelve filas de clientes.

La migración nueva reemplaza con mismas firmas/grants:
- `worker_api.tn_start_sync(uuid,uuid,uuid,integer,uuid,uuid,timestamptz)`: invalida snapshot al empezar, en la misma transacción, después de validar ownership. No sirve un snapshot con entradas reemplazadas parcialmente.
- `worker_api.tn_publish_orders(uuid,uuid,uuid,integer,uuid,uuid,jsonb,jsonb,jsonb)`: invalida antes de modificar pedidos, por defensa también ante llamadas a publicaciones con snapshot viejo. Guarda calidad monetaria cerrada en columnas nuevas privadas del pedido, no JSON bruto.
- `worker_api.tn_finish_sync(uuid,uuid,uuid,integer,uuid,uuid,timestamptz,boolean)`: tras finalizar incremental completo y cobertura válida, construye snapshot en la misma transacción; backfill/incomplete no publica listo. Error de cálculo revierte esa transacción y no publica falso completo.
- Trigger nuevo de INSERT en `private.tn_redaction_suppressions`: invalida agregados de conexiones afectadas en esa misma transacción. También al UPDATE de estado/generación/zona/moneda en integration_connections: invalida sin cambiar lifecycle ni grants existentes.
- En borrado de pedidos/líneas/cliente, invalidación por conexión; no reconstruir resultados mientras queden supresiones sin procesar. Recalcular en próximo incremental completo. Purga/store_redact no pueden dejar payload; eliminarlo desde las funciones de purga y privacy mediante reemplazos con mismas firmas, antes de terminar cada borrado de conexión. Cascade cubre borrar empresa/conexión.
- Los callbacks y APIs externas no cambian. Si no se necesita alterar aridades, worker-api.ts/repository.ts se mantienen. Cualquier aridad nueva debe quedar autorizada y cubierta por contrato antes de usarla; el diseño recomendado no requiere ninguna.

Filtrar pedidos suprimidos incluso antes de su borrado efectivo. Lectura en un snapshot PostgreSQL coherente; publicaciones y privacidad usan los bloqueos existentes por empresa/conexión. La invalidación se confirma con la supresión. Una página ya entregada no es revocable: siguiente lectura no devuelve el dato; sin caché compartida ni persistencia de DTO en navegador, logs o analítica.

Refresh tiene presupuesto igual o inferior al timeout de 15 s del cliente existente y debe medirse con 10.000 pedidos/2.000 IDs sintéticos y 24 meses. Si no cabe o hace falta dividir trabajos/crear worker, parar y elevar Q-01; no aumentar timeout ni degradar exactitud silenciosamente. No mantener snapshot anterior tras invalidación para ocultar un fallo.

### 3. Monetary: investigación y validación obligatoria (Q-02)

La [documentación oficial de Order](https://tiendanube.github.io/api-documentation/resources/order) distingue precio total e importe pagado; describe cambios liquidados con signo en el historial de ediciones. **No acredita** que ese historial incluya el pago original ni que la suma del historial sea saldo final. Por tanto no basta sumar diferencias ni restarlas automáticamente al importe pagado. La fórmula queda abierta, no un fallback de implementación.

Candidatas a conciliar: A, importe pagado vigente directamente si la API ya descuenta devoluciones; B, base pagada menos devolución verificada si la API conserva base bruta. Ninguna autorizada hasta evidencia de pago/edición/devolución y contrato oficial. Si ninguna sirve, no se publica M y se consulta al usuario sin cerrar el gate. No usar total del pedido.

Validación previa con tienda de prueba autorizada, pedidos sintéticos preparados por el usuario y lecturas de PRAXA solamente. Casos: pago normal; parcial a pagado; devolución parcial y total; cancelación antes/después de pagar; edición al alza con saldo pendiente y pagado, a la baja, varias ediciones y devolución; pedido sin historial, historial malformado/incompleto, nulo, lectura interrumpida, presupuesto agotado, duplicados/reintentos; moneda y precisión. Comparar monto esperado conocido de cada operación sintética, forma exacta de respuesta y saldo según proveedor. Registrar evidencia redactada sin cuerpos, IDs ni valores reales. Los fixtures simulados prueban el motor, no validan semántica externa.

Columnas privadas previstas en tn_orders: `insights_amount numeric null`, `insights_amount_status text not null default 'unverified'`, `insights_amount_definition text null`. Estados `verified | unverified | incomplete | inconsistent`. Invariante: verified exige monto >=0 y versión validada; demás exigen monto nulo. Validar contra el estado y source_updated_at de ese pedido, sin reutilizar una verificación de versión anterior. Reintento no suma montos ni mantiene verified después de un cambio no reconciliado.

Nueva constante server-only `M27A_MONETARY_DEFINITION` en customer-insights/monetary.ts comienza nula; valor versionado únicamente tras evidencia y decisión Q-02 incorporada/auditada. La disponibilidad efectiva exige definición aprobada, cada pedido elegible del universo con estado verified, cobertura y moneda coherentes; una constante activa sola no prueba calidad. Pedidos existentes comienzan unverified: relectura mediante sincronización completa autorizada, no actualización ciega. No descartar clientes con importes desconocidos para hacer pasar el control.

Parser estricto para la respuesta documentada y decimales exactos, sin toFixed(2) del número de entrada ni descarte de entradas inválidas como si no existieran. Un fallo produce incomplete y bloquea M del universo/moneda; no afecta los consumidores antiguos ni sus métricas. En ausencia de M se muestra motivo y RF puede ser diagnóstico parcial, sin rótulo de alto valor ni propuestas dependientes de M.

La fórmula y rótulo económico se fijan después de Q-02. Aun validado, M es valor monetario observado de pedidos elegibles, no ingreso contable, beneficio ni saldo bancario; excluye pedidos totalmente reembolsados/cancelados según elegibilidad heredada. No atribuye devoluciones a su fecha de caja: refleja estado vigente de pedidos agrupados por su fecha comercial.

### 4. Universo y RFM (propuesta Q-03/Q-04)

Recomendación: corte `C` = último día local completo acreditado por coverage_until. Ventana fija inclusiva `[C-364,C]`; universo = IDs opacos con al menos un pedido elegible dentro. Estado actual de pedidos al terminar la extracción; nunca afirmar reconstrucción de estado pasado a C. Sin corte histórico elegible a elección del navegador ni filtros libres. La primera compra para cohortes se busca en todo el histórico cubierto, no en la ventana RFM.

Por ID/conexión/moneda: R = C menos último local_day elegible, en días calendario; F = número de pedidos elegibles distintos; M = suma exacta de insights_amount verified en la ventana. Dos pedidos el mismo día cuentan dos; diferencias entre compras se resuelven como abajo. M puede ser cero verificado, nunca reemplaza ausencia. El mismo ID con compras en dos monedas se evalúa por moneda, sin sumarlo como dos personas en un total global.

Propuesta determinística de scoring: R_score 5 para R≤30; 4 para 31–60; 3 para 61–90; 2 para 91–180; 1 para 181–364. F_score 1 para F=1; 2 para F=2; 3 para 3–4; 4 para 5–9; 5 para ≥10. M_score por cuartiles de valores monetarios distintos de los clientes del universo/moneda: score 1–4 usando cortes de percentil discreto 25/50/75; igualdad queda en intervalo inferior, salvo que todos tengan mismo M, caso score común 1. No romper empates por ID ni ordenar personas arbitrariamente. Alto valor relativo exige variedad de M y score 4; no inferir alto valor de universo homogéneo. Mostrar distribución de segmentos, no tabla de personas o combinaciones R/F/M.

Partición exclusiva, prioridad descendente: inactivos R>180; riesgo 91≤R≤180; nuevos F=1 y R≤30; alto_valor R≤90, F≥2 y M_score=4 con variedad; frecuentes R≤90 y F≥3; potencial resto. Cada cliente tiene exactamente un segmento. Las etiquetas son reglas comerciales, no probabilidad predicha de abandono; la población fuera de 365 días no se llama inactiva de este análisis. Explicar esa exclusión. Q-03/Q-04 deben aprobar período y umbrales antes de considerarlos contrato.

Cada segmento publica solo agregados divulgables: clientes distintos, pedidos, M, M/cliente y M/pedido, mediana de R y media de F; denominadores explícitos. No confundir mediana con promedio. No publicar ranking individual ni extremos monetarios personales.

### 5. Cohortes y métricas (propuesta Q-05)

Recomendación: últimas 24 cohortes mensuales observadas y offsets 0–12; meses completos para comparar. Primer pedido elegible actual de cada ID/moneda en histórico cubierto determina mes c. Se rotula siempre primera compra observada: backfill completo no garantiza compras previas a la plataforma ni fusiona identidades. Supresión o cancelación puede cambiar c; no reconstrucción histórica.

Por cohorte c y offset n:
- tamaño N_c: IDs distintos de la cohorte; activos A_c,n: IDs con ≥1 pedido elegible en ese mes; retención A/N. N=0 no genera porcentaje; n=0 es 100% solo si N visible.
- recompra acumulada: IDs con ≥2 pedidos elegibles desde primera compra hasta cierre de c+n, dividido N_c. Incluye dos pedidos en mes inicial; no igualar esta medida a retención mensual.
- valor observado de cohorte: suma de M validado de pedidos de esos IDs en el mes; ticket = valor/pedidos elegibles de la celda; valor acumulado/cliente = suma desde c hasta c+n / N_c. No llamar LTV.
- tiempo entre compras: media de días calendario entre pedidos consecutivos elegibles de IDs que repiten, usando local_day y desempate técnico por external_order_id dentro de SQL. Dos pedidos el mismo día producen intervalo 0. Denominador = número de intervalos, no todos los clientes; indicador acompañado por número de compradores repetidores divulgable.
- dinero separado por moneda; retención heredada de M16e se compara en fixture monomoneda y solo se reutiliza semánticamente. El getter actual no aporta economía, recompra ni intervalos y su cuadrícula termina en último mes con compras: construir cuadrícula explícita para meses transcurridos sin compras. Mes abierto o futuro = periodo_abierto; sin cobertura = sin_cobertura; no llenar con cero.
- privacidad se aplica a contribuyentes de cada métrica, no solo tamaño de cohorte; si activos/compradores que aportan intervalos son pocos, ocultar también dinero, medias y tasas que los revelarían.

Q-05 decidirá el catálogo definitivo entre estas métricas evaluadas. Las que no puedan validarse quedan indisponibles con explicación, sin reemplazo por una métrica distinta.

### 6. Privacidad y límites de interacción (propuesta Q-06)

Se recomienda k=5 para cualquier grupo o contribuyentes de métrica visible. Mantener regla vigente de cohortes: tamaño <5 oculta fila; activos <5 oculta celda, incluidos ceros según contrato vigente. No reconstruir un conteo oculto usando tasa o monto.

En segmentos exclusivos: si alguno contiene entre 1 y 4 IDs, ocultar **toda la distribución de esa moneda**, sus totales y métricas económicas, no solo esa fila. No publicar total exacto, porcentajes, gráficos con tamaño proporcional ni conteos de exclusiones que permitan restar. Si todos los segmentos no vacíos tienen ≥5, los vacíos pueden mostrar cero. Una etiqueta de grupo oculto no revela el conteo exacto.

No filtros de período, producto, umbral, segmento cruzado ni selector de cortes históricos; la moneda se elige entre resultados independientes sin total conjunto. Propuestas referencian exactamente grupos ya divulgados; no publican nuevas intersecciones ni uniones con conteos calculados en cliente. Conteo total de clientes existentes solo si toda partición es divulgable y no permite inferir un grupo protegido.

La cobertura de identidad se muestra como calificación `completa | incompleta | no_evaluable`; no exponer conteos/porcentajes pequeños de invitados o errores como vía de resta. Las pruebas deben intentar reconstrucción por totales, tasas, tooltips, JSON, varias propuestas y vistas de cohortes. k-anonimato no impide inferencias con conocimiento externo ni diferencias entre snapshots sucesivos; Q-06 solicita aceptación explícita de ese límite o una política distinta. No prometer anonimización irreversible ni privacidad diferencial.

### 7. Propuestas y reglas (propuesta Q-07)

Propuestas con texto fijo, nombre y objetivo claros; métricas refieren a definición/corte/segmento, no a cifras inventadas. Si no hay evidencia o privacidad, no producir recomendación accionable: mostrar razón de indisponibilidad, sin una audiencia vacía ficticia.

| Regla prevista | Inclusión/exclusión | Evidencia y estrategia sugerida |
|---|---|---|
| fidelizacion_v1 | alto_valor; excluir todos los demás segmentos | M/cliente y F del segmento; sugerir mensaje de fidelización, sin prometer eficiencia ni presupuesto. |
| remarketing_v1 | potencial; excluir nuevos, riesgo, inactivos, frecuentes, alto_valor | R/F y recompra observada; sugerir recordar propuesta de valor o reposición, solo como hipótesis comercial. |
| reactivacion_riesgo_v1 | riesgo; excluir otros segmentos | R y compras observadas; mensaje de regreso, no afirmación de abandono efectivo. |
| reactivacion_inactivos_v1 | inactivos dentro de ventana; excluir otros | Misma evidencia y límites de ventana; no incluir clientes fuera de cobertura. |
| exclusion_adquisicion_v1 | todos los IDs identificados con compra elegible en ventana; excluir sin ID | Evidencia de clientes existentes; sugerir considerarlos exclusión, sin lista ni capacidad de aplicarla desde PRAXA. |
| similares_alto_valor_v1 | mismo grupo alto_valor; excluye otros | Proponerlo como posible semilla; PRAXA no valida requisitos, coincidencias o tamaño utilizable de Meta. |
| venta_cruzada_v1 | grupo frecuente o alto_valor con evidencia válida de productos; sin lista individual | Recomendar revisar complementariedad observada, nunca inventar categorías ni afirmar intención. Caso específico definido abajo y Q-07. |

Venta cruzada, recomendación conservadora: seleccionar solo un par de productos no eliminados A/B con mayor número de compradores distintos de ambos, dentro del grupo divulgado frecuente o alto_valor; desempate por claves técnicas, sin exponerlas. Exigir ≥5 compradores distintos para co-compra y para A sin B dentro de ese segmento, y catálogo completo/líneas no omitidas. La selección objetivo sería quienes compraron A y no B; **no publicar cantidad de esa intersección** ni sus métricas; identifiedCustomers=null con absence privacidad. Presentar respaldo cualitativo «co-compra observada con muestra suficiente» y referencia al agregado de calidad, sin cifras de par que permitan restas. Si no hay par seguro, propuesta no disponible. Las claves y conteos de par solo se usan dentro del SQL antes de sanitizar; DTO puede incluir nombres de productos tratados como texto no confiable y sin IDs. Q-07 debe aprobar si este alcance conservador entrega valor o requiere otra definición (sin categorías nuevas ni exportación).

Los nombres no permiten HTML ni instrucciones; escape normal de React. No llamadas a proveedores LLM ni a Meta. No métricas calculadas sobre personas externas al histórico; número identificado no es alcance publicitario.

### 8. UI, errores y frescura (Q-08)

Página Clientes: fuente, período y corte, frescura, cobertura/identidad; distribución RFM y economía válida; matriz y gráfico de evolución con tabla accesible equivalente; fichas de propuestas con toda su evidencia y limitaciones. Diseño reutiliza tokens y componentes, CSS local, responsive, sin biblioteca nueva. Barras/tasas sin ceros de relleno; valores ocultos sin tooltips o atributos que los reconstruyan. Solo moneda es selector; nunca aceptar company_id o connection_id por searchParams.

Mensajes fijos: «Conectá Tiendanube para analizar tus clientes», «Completá la sincronización para obtener cobertura», «El componente monetario todavía no está validado», «No hay compras elegibles en el período», «No se muestran estos agregados para proteger grupos pequeños», «No pudimos cargar el análisis». Ofrecer enlace a Integraciones, sin disparar sincronización automática.

Recomendación Q-08: advertir extracción >24 h y bloquear propuestas tras 7 días; RFM/cohortes visibles como observación al corte con advertencia, nunca como actuales. Sin caché compartida; ninguna respuesta con datos de otra sesión. No exponer error original SQL/HTTP, IDs, payloads o importes en logs. Con needs_reauth solo aviso/enlace, no nuevos perfiles disponibles. No se altera comportamiento de pantallas anteriores.

## Archivos previstos

Solo la spec se crea durante esta expansión. Esta tabla autoriza implementación futura exclusivamente tras el pipeline. II.14d no tiene pasos numerados: se cita el grupo concreto, sin inventar pasos.

| Archivo | Nuevo o modificado | Para qué | Autorizado por |
|---|---|---|---|
| src/modules/customer-insights/{contract,rules,proposals,load,monetary}.ts | Nuevos | Contratos, reglas, carga y disponibilidad monetaria | II.14d, customer-insights |
| src/app/(app)/app/clientes/page.tsx | Nuevo | Página protegida | II.14d, pantalla |
| src/components/customer-insights/{clientes.tsx,clientes.module.css,cohort-matrix.tsx,cohort-evolution.tsx,audience-proposals.tsx} | Nuevos | Vista integrada y accesible | II.14d, componentes propios |
| src/components/app/shell.tsx | Modificado | Entrada Clientes; icono existente | II.14d, navegación |
| src/modules/integrations/tiendanube/{projection,sync,repository}.ts | Modificados si Q-02 exige campos de calidad; mismo contrato de consumidores previos | Extracción monetaria, calidad y publicación | II.14d, insumos monetarios |
| supabase/migrations/NNNN_customer_insights.sql | Nueva; NNNN se resuelve al planificar/implementar, no reservado | Snapshot, columnas privadas, helpers, invalidación y reemplazos con mismas firmas | II.14d, solo migraciones nuevas |
| supabase/tests/21_customer_insights.test.sql | Nueva; revalidar prefijo libre junto con M16f | Cálculo, privilegios, RLS y borrado | II.14d, suite SQL nueva |
| supabase/tests/{09_integration_privileges,10_demo_closure,18_tiendanube}.test.sql | Modificados | Matriz, cierre y compatibilidad | II.14d, regresiones SQL |
| tests/unit/{customer-insights-contract,customer-insights-proposals,customer-insights-load,customer-insights-monetary}.test.ts | Nuevos | Contrato, reglas, fronteras y dinero | II.14d, unit |
| tests/unit/{tiendanube-sync,tiendanube-analysis,chat-tiendanube,diagnostics-tiendanube,no-privileged-credentials}.test.ts | Modificados solo pruebas necesarias; sin código de consumidores | Regresiones de no activación y confinamiento | II.14d, regresiones |
| tests/component/customer-insights.test.tsx | Nuevo | Comportamiento, ocultamiento y accesibilidad | II.14d, component |
| tests/app/customer-insights.test.ts | Nuevo | JWT/Data API reales, concurrencia y tamaño | II.14d, app |
| tests/app/{tiendanube-sync,tiendanube-data-api}.test.ts | Modificados | Publicación y privacy integradas | II.14d, regresiones app |
| docs/SECURITY.md §§5,8,9,12 | Modificado | Capacidad agregada, no LLM, minimización/borrado y riesgo de inferencia | II.14d, documentos transversales |
| docs/ARCHITECTURE.md, módulos/base/flujos | Modificado | Módulo y publicación que pasan a existir | II.14d, documentos transversales |
| docs/FASES/FASE1/M03a/acta-meta.md | Modificado | Finalidad ampliada y límites, antes de uso real | II.14d, acta |
| docs/FASES/FASE1/M27a/spec.md, plan.md, revisiones/*.md | Nueva documentación según paso invocado | Pipeline; no se crea plan en esta expansión | II.14d y precondición 9 |
| docs/FASES/FASE1/meta_first/sesiones/M27a.md; docs/{HALLAZGOS,PROJECT_STATE}.md | Seguimiento futuro | Comandos/evidencia, hallazgos y estado sin duplicar técnica | Precondición 8 e II.14d |

No modificar migraciones existentes. La lista y firmas pueden refinarse dentro de estos módulos antes de aprobar el plan; fuera de ella exige enmienda. No se prevé modificar worker-api.ts, analysis.ts o limits.ts: están autorizados por ruta, pero el diseño conserva aridades y deshabilitación global. No tocar .env.local.

## Criterios de aceptación

### Heredados de la ruta

Los puntos de §18 no tienen IDs CA propios; se conservan referencias exactas por punto, sin inventar numeración normativa.

| ID de la ruta | Exigencia |
|---|---|
| §18.1 | RFM completo, determinístico, versionado, elegibilidad y Monetary obligatorio. |
| §18.2 | Fórmula validada y sin habilitación monetaria global. |
| §18.3 | Calidad, pagos/ediciones/devoluciones, ausencia y monedas; falla bloquea gate. |
| §18.4 | Cohortes y catálogo de métricas válidas, sin causalidad ni meses inventados. |
| §18.5 | Identidad opaca, invitados, no deduplicación personal, estado vigente y borrado. |
| §18.6 | Pantalla integrada, JWT/RLS y privacidad de grupos. |
| §18.7 | Propuestas con todos los campos y límites de alcance/eficacia. |
| §18.8 | Sin audiencias operativas, identificadores externos, LLM ni ampliación chat/diagnóstico. |
| §18.9 | Un gate, TDD, pruebas sintéticas y paralelismo condicionado. |
| §18.10 | Finalidad aprobada y comunicada antes del uso real. |
| CB-01 | verify y suites requeridas pasan. |
| CB-02 | Sin secretos, PII ni montos/IDs reales en diff/evidencia. |
| CB-03 | Migraciones existentes intactas. |
| CB-04 | Pruebas solo en destinos autorizados; no suites/fixtures contra app. |
| CB-05 | Evidencia de comandos y resultados reales. |
| CB-06 | Omisión de una prueba requerida no acredita gate. |

### Operativos de esta microfase

| ID | Criterio verificable | Traza |
|---|---|---|
| M27a-C-01 | Tenant/identidad se resuelven en servidor, entrada ajena no revela filas y roles no autorizados no leen/escriben. | §18.6 |
| M27a-C-02 | R/F/M dan valores exactos del fixture y misma entrada/corte/reglas producen misma salida; umbrales y empates aprobados. | §18.1 |
| M27a-C-03 | Universo, período, zona y moneda explícitos; invitados y múltiples IDs no se presentan como personas deduplicadas. | §18.1/5 |
| M27a-C-04 | Fórmula Q-02 conciliada con tienda sintética; M nulo si falta validación/completitud; false global preservado. | §18.2/3 |
| M27a-C-05 | Cancelaciones, parciales, devoluciones, ediciones, nulos y reintentos respetan elegibilidad sin doble descuento. | §18.3 |
| M27a-C-06 | Cuadrícula distingue mes futuro/abierto, no cubierto y cero; retención/recompra tienen denominadores correctos. | §18.4 |
| M27a-C-07 | Economía, ticket, valor observado e intervalos son exactos solo con calidad/denominador; sin LTV predictivo. | §18.4 |
| M27a-C-08 | Supresión primaria/secundaria alcanza SQL, tabla, DTO y UI, sin deducción por totales/propuestas/celdas. | §18.6 |
| M27a-C-09 | Propuestas satisfacen contrato, evidencia del mismo corte y reglas cerradas; no prometen alcance o resultados. | §18.7 |
| M27a-C-10 | Venta cruzada necesita catálogo/líneas y muestra suficiente; sin evidencia se abstiene. | §18.7 |
| M27a-C-11 | Nada crea/exporta/sincroniza audiencias ni envía datos a Meta/LLM; consumidores previos no se amplían. | §18.8 |
| M27a-C-12 | Publicación agregada atómica/idempotente; entradas parciales invalidan, errores no producen snapshot listo. | §18.1/3 |
| M27a-C-13 | Privacy, desconexión, cambio de generación y purga impiden lecturas obsoletas y dejan sin derivados afectados. | §18.5 |
| M27a-C-14 | UI protege sesión y muestra distribución, matriz/evolución y propuestas con ausencias, procedencia y accesibilidad. | §18.6 |
| M27a-C-15 | Sin caché entre tenants ni logs con contenido; frescura aprobada gobierna disponibilidad. | §18.3/6 |
| M27a-C-16 | Tamaño sintético medido sin truncar ni exceder presupuesto; no degrada sincronización vigente. | II.14d, trampas |
| M27a-C-17 | Rama/checkout, migraciones y desechable coordinados sin tocar M16f, package ni otros contratos. | §18.9; CB-03/04 |
| M27a-C-18 | Acta ampliada aprobada/comunicada antes de datos reales; pipeline y evidencia exigidos completos, gate pendiente hasta aprobación. | §18.9/10; CB-01/02/05/06 |

## Casos de prueba

Todos los importes, IDs, pedidos y escenarios son sintéticos. Las aserciones de aislamiento se hacen con roles/JWT reales en el desechable, nunca con service_role.

| ID | Criterios | Tipo | Comando | Resultado esperado | ¿Falla sin implementación? |
|---|---|---|---|---|---|
| M27a-T-01 | C-01 | pgTAP + app | npm run test:policies; npm run test:app | Empresa A/B y anon, conexión ajena, company_id manipulado, raw private y escritura directa: sin acceso; tablas/functions con grants mínimos. | Sí |
| M27a-T-02 | C-02/03 | pgTAP | npm run test:policies | Fixture 20 IDs distintos y 60 pedidos escritos con expectativas manuales; repetir produce igualdad. Bordes R=30/31/60/61/90/91/180/181, F=1/2/3/4/5/9/10; empates M y todos iguales. | Sí |
| M27a-T-03 | C-03/05 | pgTAP + unit | npm run test:policies; npm run test:unit | Medianoche en zona, paid_at nulo fallback created_at, cambio de día, pedido repetido, dos compras mismo día; dos monedas sin suma; ID nulo y dos IDs no fusionados. | Sí |
| M27a-T-04 | C-04 | manual | Sin comando automatizado: tienda de prueba autorizada | Matriz de conciliación de §3 demuestra fórmula exacta y ausencia de doble descuento; registrar fuente/versión, no payload ni IDs. | No: valida hipótesis externa; obligatorio para M/gate |
| M27a-T-05 | C-04/05 | unit + app | npm run test:unit; npm run test:app | Lecturas simuladas válidas/invalidas, historial ausente, presupuesto, decimales y cambios de versión: verified solo con prueba/forma completas, demás nulo; no reutilizar verificación obsoleta. | Sí |
| M27a-T-06 | C-05/12 | pgTAP + app | npm run test:policies; npm run test:app | paid→partially_refunded→refunded/cancelled; edición pendiente/pagada; reintento de misma ventana: métricas esperadas, sin sumar dos veces ni conservar cliente fuera de universo. | Sí |
| M27a-T-07 | C-06 | pgTAP | npm run test:policies | Cohorte n=10, activos 10/5 y mes posterior cubierto sin compras; recompra con dos pedidos en N0; mes futuro/abierto y sin cobertura tienen motivos distintos, no cero inventado. | Sí |
| M27a-T-08 | C-07 | pgTAP | npm run test:policies | Sumas/ticket/valor acumulado e intervalos conocidos, día repetido=0, media sobre intervalos y moneda separada; denominador nulo/cero o monto desconocido abstiene; dinero no redondeado antes de sumar. | Sí |
| M27a-T-09 | C-08 | pgTAP + app | npm run test:policies; npm run test:app | Grupos 0/1/4/5/6; celda chica oculta dinero/tasa; partición con una fila chica oculta distribución/totales; inspección JSON y getter impide resta. | Sí |
| M27a-T-10 | C-08/09 | unit + component | npm run test:unit; npm run test:component | Conteos de propuestas son referencias a grupos divulgados; ni tooltip, aria-label, atributo, tabla o gráfico filtra valor oculto. | Sí |
| M27a-T-11 | C-09/11 | unit | npm run test:unit | Cada regla da todos los campos y evidencia; alto valor sin M/variedad no se recomienda; no conexión Meta requerida; cero llamadas externas. | Sí |
| M27a-T-12 | C-10 | pgTAP + unit | npm run test:policies; npm run test:unit | Par seguro y desempate reproducible; líneas omitidas, catálogo incompleto/borrado o intersección pequeña: no propuesta; no conteo de intersección en DTO. | Sí |
| M27a-T-13 | C-12/13 | app + pgTAP | npm run test:app; npm run test:policies | Snapshot viejo invalidado al start/publish, corte a mitad y fallo refresh no muestran listo; siguiente incremental completo reconstruye; rollback e idempotencia acreditados. | Sí |
| M27a-T-14 | C-13 | app + pgTAP | npm run test:app; npm run test:policies | customer/redact marcado y paso 2 fallido ya oculta; sync concurrente filtra supresión; store_redact, desconexión, generación, cambio de zona y borrar empresa no dejan payload visible/huérfano. | Sí |
| M27a-T-15 | C-14/15 | component + unit | npm run test:component; npm run test:unit | Todos los estados y frescura; teclado/tabla accesible; sesión ausente; tenant de request no se conserva entre usuarios; error fijo sin cuerpo. | Sí |
| M27a-T-16 | C-11/15 | unit + app | npm run test:unit; npm run test:app | Guardas de credenciales, spies de red y consumidores anteriores: global false, sin datos hacia LLM/Meta, sin endpoints de exportación; firmas antiguas siguen operativas. | Sí para frontera nueva; regresiones existentes deben conservar verde |
| M27a-T-17 | C-16 | app | npm run test:app | 10.000 pedidos/2.000 IDs/24 meses, multiempresa; refresh y lectura bajo presupuesto, conteos exactos sin truncar; registrar duración real. | Sí |
| M27a-T-18 | C-14 | manual | Recorrido autorizado de /app/clientes con datos sintéticos | Móvil/escritorio, fuente/corte/frescura, gráficos/tablas, propuestas sin acción externa y límites económicos honestos. | No: inspección visual posterior |
| M27a-T-19 | C-17/18 | documental | git diff --check; git status --short; npm run db:check:test | Solo archivos autorizados, nueva numeración libre, destino desechable exclusivo, cambios ajenos intactos, acta y aprobaciones con evidencia. | No: control operativo |
| M27a-T-20 | C-18; CB-01/05/06 | integral | npm run verify; npm run db:check:test; npm run test:policies; npm run test:app | Suites requeridas completas, rojo/verde registrado, sin skips propios; informe de QA antes de aprobación de gate. | Sí para comportamiento nuevo |

## Verificación

En implementación: `npm run verify`; `npm run db:check:test` antes de cualquier control SQL/app; `npm run test:policies`; `npm run test:app`. Las suites nuevas entran por patrones de vitest.config.mts y run-pgtap existente, sin modificar scripts. Focalizadas por scripts existentes test:unit/component cuando se necesite demostrar rojo/verde; después corrida integral.

No ejecutar verify en paralelo con suites pesadas ni dos suites destructivas sobre el mismo proyecto. Skips obligatorios de M27a, falta de configuración, falta de tienda de prueba o fórmula inconciliable bloquean el gate; no se compensan con mocks. Omisiones opt-in ajenas quedan identificadas por archivo/motivo y no se confunden con pruebas requeridas.

Durante esta expansión solo se revisan documentos/código, fuentes oficiales y controles de integridad del archivo; no se corre una suite funcional sin implementación ni se acredita RFM. Antes de modificar código Next leer la guía pertinente vigente en node_modules/next/dist/docs/ según AGENTS.md.

## Intervenciones del usuario y acciones reservadas

| Momento | Acción del usuario | Verificación posterior |
|---|---|---|
| Grill | Resolver Q-01 a Q-08 sin reabrir restricciones ya aprobadas | Decisiones D-M27a-NN y secciones afectadas actualizadas; reauditar si cambian |
| Spec/plan | Aprobar cada artefacto después de APROBABLE | Estados explícitos y hashes de contenido |
| Validación monetaria | Autorizar tienda/entorno de prueba y preparar pagos/ediciones/devoluciones sintéticos; credenciales solo en configuración segura | T-04, conciliación sin datos reales ni secretos |
| Uso real | Aprobar finalidad ampliada y comunicarla al dueño | Acta y evidencia de comunicación; sin aprobación no usar datos reales nuevos |
| Migraciones | Ejecutar npm run db:push:test solo tras ensayo reversible y guarda del desechable | Historial, suites y matriz de privilegios; asistente no ejecuta push |
| Publicación | Commit, push, PR, migraciones en app y despliegue cuando se soliciten expresamente | Orden/esquema y despliegue verificados; ninguna suite/fixture en app |
| Gate | Aprobar G-SEGMENTOS-AUDIENCIAS después de revisiones/QA y Monetary validado | PROJECT_STATE registra gate solo por aprobación visible |

## Trampas y riesgos

- Importes existentes y flags no son evidencia de semántica ni de completitud. Coalesce de un agregado antiguo puede ocultar nulos.
- El historial de valores documenta modificaciones; no presumir pago inicial. Campos numéricos de API pueden perder precisión antes de convertirlos: validar contrato/transporte y dominio admitido, no inventar centavos.
- Primer pedido elegible actual puede cambiar tras cancelación/supresión; no presentar la cohorte como registro histórico inmutable.
- Invalidar al inicio y también al publicar: un paso parcial puede haber cambiado pedidos y dejar cobertura anterior. No conservar un análisis viejo mientras sus entradas ya cambiaron.
- La marca de privacidad debe invalidar antes del borrado; una lectura con SQL privilegiado podría saltarse RLS si no se evita por diseño.
- Suppression en particiones y cohortes cruzadas requiere pruebas de deducción; k=5 no es garantía general frente a conocimiento externo o comparación temporal.
- Snapshot agregado por moneda limita doble conteo e interacciones, pero el costo de recalcular no está medido. No introducir workers o cache compartida como salida silenciosa.
- M16f modifica documentos, worker-api y suite remota; coordinar rama/checkout y no reservar números a priori. El snapshot es un diseño propuesto, no una autorización a interferir otra implementación.
- Un gate de Tiendanube cerrado con excepciones no valida Monetary para esta funcionalidad.
- Sin dos ciclos convergentes, con archivo fuera de alcance o contradicción de ruta: parar. No resolver ampliando alcance ni dividiendo la microfase.

## Decisiones de la microfase

No hay decisiones materiales propias tomadas todavía. Las restricciones de alcance aprobadas pertenecen a §18 y se heredan, no se presentan como respuestas al grill. Las elecciones no materiales de esta expansión son nombres de módulos/DTO y uso de SQL numeric, patrones RLS y componentes existentes; se justifican arriba.

| ID | Decisión | Motivo | Decidió | Fecha |
|---|---|---|---|---|
| — | Pendiente del grill | No adjudicar decisiones al usuario | — | — |

## Supuestos e hipótesis

| ID | HIPÓTESIS | Cómo/cuándo se verifica |
|---|---|---|
| M27a-H-01 | Es posible definir un monto monetario observado fiable con los campos actuales y GET history/values autorizado. | T-04 antes de aprobar fórmula; si falla, Q-02 y gate bloqueados. |
| M27a-H-02 | La tienda de prueba permite simular todos los estados requeridos sin datos reales. | Usuario confirma entorno y casos antes de T-04; falta bloquea validación, no se hereda tienda real del dueño. |
| M27a-H-03 | El refresh agregado cabe bajo 15 s con volumen propuesto. | T-17 en desechable; no cambiar timeout ni truncar como sustituto. |
| M27a-H-04 | Los períodos registrados permiten llamar al primer pedido «observado» con corte completo. | Fixture de backfill/incremental y T-03/07; nunca asegurar primera compra vitalicia. |
| M27a-H-05 | RFM/SQL monetario y publicación se pueden incorporar sin cambiar firmas/consumidores antiguos. | T-16 antes de implementación final; necesidad de otro archivo/contrato exige enmienda. |
| M27a-H-06 | Ramas, migraciones y destino remoto pueden coordinarse con M16f. | Verificar worktrees, reservas e intervalo de uso antes de código/pruebas; esperar para parte afectada si no está disponible. |

## Preguntas abiertas

Son decisiones materiales. Las recomendaciones detalladas en Diseño concreto son candidatas, no aprobaciones implícitas. El grill no habilita API writes, PII, LLM, varias microfases ni activar montos globalmente.

| ID | Pregunta | Opciones | Recomendación | Evidencia |
|---|---|---|---|---|
| M27a-Q-01 | ¿Aprobar un snapshot agregado por conexión/moneda y su indisponibilidad durante sincronización/invalidación? | A: snapshot RLS publicado al cerrar incremental; B: cálculo por lectura con nuevo helper privado acotado, a diseñar/auditar y medir | A, §2: sin perfiles nuevos ni lecturas privadas al runtime; medir costo antes de cierre | 0023:522/578/2042; ARCHITECTURE:146; ruta II.14d |
| M27a-Q-02 | ¿Qué definición/rótulo monetario se aprobará tras conciliar el comportamiento de la API? | A: monto pagado vigente si se prueba ya ajustado; B: base menos devoluciones solo si se prueba base bruta; C: ninguna verificable, bloquear y revisar alcance | No elegir fórmula sin T-04; validar A/B y aprobar exactamente una con versión. Monetary sigue obligatorio, no sustituirlo por RF o total | H-E1-270; projection.ts:240; documentación oficial; §3 |
| M27a-Q-03 | ¿Ventana RFM fija de 365 días y corte último día local completamente cubierto? | A: propuesta de §4; B: otra ventana fija explícita que se debe definir | A; universo y exclusión de clientes más antiguos visibles; sin corte histórico arbitrario | §18.1/3/5; 0023:629 |
| M27a-Q-04 | ¿Aprobar scoring y partición comercial propuesta? | A: umbrales R/F, cuartiles M y prioridad de §4; B: otros umbrales/segmentos con definición completa | A como regla comercial revisable/versionada; no predictor de abandono; empates no se rompen por persona | §18.1; objetivo #18 |
| M27a-Q-05 | ¿Aprobar catálogo y límites de cohortes evaluados? | A: 24 cohortes, offsets 0–12 y métricas definidas en §5 sujetas a validez; B: catálogo menor explícito | A, con estados no disponible por cobertura/dinero y valor observado, sin LTV | §18.4; getter 0023:2604 |
| M27a-Q-06 | ¿Aprobar k=5, ocultamiento secundario conservador y límites declarados de inferencia? | A: política de §6 sin filtros libres, ocultar partición si hay grupo 1–4 y aceptar límites de conocimiento externo/snapshots sucesivos; B: otra política a especificar y auditar | A, conservadora y verificable; no prometer anonimización ni privacidad diferencial | §18.6; M16e-C-13; §6 |
| M27a-Q-07 | ¿Aprobar las reglas publicitarias y venta cruzada conservadora sin cantidad de intersección? | A: reglas de §7; B: ajustar selección/valor comercial dentro de evidencia disponible | A; no identificar personas ni inventar categorías. Sin evidencia, abstenerse | §18.7; líneas 0023:308; objetivos #32 |
| M27a-Q-08 | ¿Aprobar advertencia a 24 h y bloqueo de propuestas tras 7 días de antigüedad? | A: §8; B: otro plazo explícito de frescura | A como política de producto a aprobar, no límite de la API | §18.3/6/7; coverage_until y last_fetched_at de 0023:399 |

Q-02 exige investigación/validación experimental: no puede responderse por preferencia del usuario ni marcarse cerrada sin evidencia. Si la validación solo puede ocurrir después del plan, acordar en el grill un contrato de indisponibilidad y parada, sin autorizar una fórmula no validada; una spec con fórmula pendiente no es implementable como RFM completo ni aprobable para habilitar montos. Volver a auditar texto y hash después de incorporar evidencia/decisiones.

## Hallazgos relacionados

`H-E1-270`, abierto y asignado a M27a: validación monetaria insuficiente. `M16e-H-06`, hipótesis previa no verificada. Los riesgos nuevos de esta expansión quedan en esta spec/preguntas; la skill solo permite escribir este archivo, por lo que no se edita HALLAZGOS. Si una auditoría confirma un defecto nuevo, asignará ID estable en el paso autorizado correspondiente.

No se detectó dependencia de entrada sin cerrar. Hay bloqueos para aprobación/implementación: decisiones materiales pendientes, fórmula/entorno monetario aún no validados y coordinación operativa futura. No hay autorización para reducir Monetary ni cambiar la ruta de otras microfases.

## Auditorías

Sin auditorías realizadas para esta spec. No existe aún `revisiones/spec-audit-N.md` de M27a. Siguiente paso oficial: `/grill-me` sobre esta spec; luego `/spec-auditor M27a` cuando corresponda. No se genera el plan ni se inicia implementación.
