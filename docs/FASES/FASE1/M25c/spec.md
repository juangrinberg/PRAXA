# M25c — Spec de la microfase: Stock y reposición (feature #8)

**Estado:** BORRADOR

**Fecha:** 2026-11-17. Solo el usuario aprueba la spec, después de una auditoría APROBABLE. Esta expansión no inicia grill, auditoría, plan ni implementación. `G-STOCK` permanece pendiente.

**Hash de contenido.** Calcular sin la línea de estado y conservando los finales de línea del archivo:

```bash
grep -v '^\*\*Estado:\*\*' docs/FASES/FASE1/M25c/spec.md | git hash-object --stdin
```

## Fuentes

- Ruta vigente: `docs/FASES/FASE1/meta_first/plan.md`, ficha M25c (I.4), II.13d, III.2, III.3 y III.9; `meta_first/spec.md`, DEC-26, §18 (CA-82 a CA-89) y §14 (CB-01 a CB-06).
- Commit base: `75fddd3ff796ea806a51047bfbe984304ae3cbd9`, rama `main`. La enmienda aprobada existe en el árbol de trabajo sin commit. Sus cinco documentos preexistentes se preservan: la base es HEAD más la enmienda, no solo HEAD.
- Dependencia M16e / `G-TIENDA` aprobada el 2026-11-15 con excepciones: `docs/PROJECT_STATE.md:27` y `meta_first/sesiones/M16e.md`, «Paso 14». No requiere GA4, Meta ni cierre de M25b. Solo se cubre el ID M25c.
- Instrucciones y plantilla: `AGENTS.md`, `docs/PIPELINE.md`, `.claude/skills/expand-microfase/SKILL.md`, `docs/_templates/mf-spec.md`; seguridad §§5, 6, 9 y 11 de `docs/SECURITY.md`; arquitectura de módulos y caminos A/B de `docs/ARCHITECTURE.md`.
- `H-E1-261` y `H-E1-262`, `docs/HALLAZGOS.md:845`; autorización en `meta_first/sesiones/enmienda-m25c-2026-11-17.md`.
- Fuentes oficiales consultadas el 2026-11-17: [Product Variant 2025-03](https://tiendanube.dev/api/resources/2025-03/product-variant), [Product](https://tiendanube.github.io/api-documentation/resources/product) y [múltiples inventarios](https://tiendanube.github.io/api-documentation/multi-inventory-guides). Los campos documentados no prueban su presencia efectiva en el listado actual: H-01.

## Objetivo

Ayudar al dueño a identificar agotados y riesgo de quiebre y a priorizar reposición por variante, con métricas y evidencia de Tiendanube. Entregar pantalla independiente y motor determinístico verificable, de solo lectura externa.

## Alcance

Stock observado y fecha por variante, incluidas variantes sin ventas; velocidad de venta, días estimados de cobertura, agotados, riesgo y prioridad con reglas versionadas; cantidades sugeridas solo con datos suficientes y parámetros explícitos; evidencia y abstenciones por métrica. Incorporación mínima al conector, lecturas bajo RLS, aislamiento, privacidad, reversibilidad, regresiones de M16e y TDD futuro. Hasta ocho horas de implementación, sin excepción; si no cabe el corte completo, volver al usuario antes del plan sin recortar silenciosamente alcance.

## Fuera de alcance

Liquidación de stock inmovilizado (#10); compras o ajustes externos; reposición por depósito; proveedores, ERP, reservas, compras en tránsito y movimientos físicos; devoluciones físicas y demanda perdida; pronósticos estacionales; costos y rentabilidad; alertas por email/push; cron, workers, servicios o dependencias nuevos; múltiples tiendas por empresa; nuevos permisos OAuth; chat, diagnóstico, reporting, anomalías de Meta y GA4. No se agrega historial visible, exportación ni configuración persistente: los snapshots internos sirven para coherencia y reversibilidad.

## Contexto verificado en el código

Referencias del árbol inspeccionado. Los objetos definidos después como previstos todavía no existen.

| Qué | Dónde (archivo:línea) | Qué implica para esta microfase |
|---|---|---|
| Variantes proyectadas solo con ID/SKU; stock descartado | `src/modules/integrations/tiendanube/projection.ts:74`, `:205` | Proyectar stock por separado sin romper ProjectedProduct. |
| PRODUCT_FIELDS ya incluye variants | `src/modules/integrations/tiendanube/projection.ts:39` | Verificar primero respuesta del recurso existente, sin pedir otro endpoint automáticamente. |
| Líneas inválidas se omiten y cuentan; ID de variante nullable | `src/modules/integrations/tiendanube/projection.ts:142`, `:186` | Cobertura no certifica todas las unidades por variante; Q-06. |
| API y rutas cerradas de solo lectura | `src/modules/integrations/tiendanube/config.ts:13`; `client.ts:58` | Sin escrituras externas, scopes ni cambios de versión. |
| Catálogo paginado, reanudable, con omisión de productos inválidos | `src/modules/integrations/tiendanube/sync.ts:430`, `:442`, `:450`, `:458` | Inventario necesita integridad propia por recorrido; omisión no es agotado. |
| Ownership incluye conexión, generación, run y lease | `src/modules/integrations/tiendanube/repository.ts:54`, `:80`, `:110` | Reusar validación, con comprobación SQL después de bloquear. |
| Esquema privado de variantes sin stock | `supabase/migrations/0023_tiendanube.sql:356` | Crear migración nueva, nunca editar 0023. |
| Publicador exige claves JSON exactas y escribe por página | `supabase/migrations/0023_tiendanube.sql:1902`, `:1930`, `:1977` | Stock en el JSON antiguo rompería contrato; usar operación envolvente transaccional. |
| catalog_complete_at es fin de recorrido | `supabase/migrations/0023_tiendanube.sql:2025` | No identifica por sí solo un snapshot coherente ni fecha única de stock. |
| Unidades diarias de líneas elegibles, sin variante cuando no puede atribuirse | `supabase/migrations/0023_tiendanube.sql:667` | Sumar exacto por claves internas; no repartir unidades sin variante. |
| Ranking limitado a 50, sin variantes sin ventas | `supabase/migrations/0023_tiendanube.sql:2547` | Nueva lectura anclada en catálogo completo, no en ranking. |
| Cobertura usa días cerrados en zona local | `supabase/migrations/0023_tiendanube.sql:629`, `:2578` | Ausencia de datos y cero cubierto son distintos. |
| Integraciones usa 28 días y top 10 | `src/modules/integrations/tiendanube/analysis.ts:83`, `:149` | No cambiar esos contratos; crear adaptador de stock. |
| Purga y privacidad por tandas | `supabase/migrations/0023_tiendanube.sql:1503`, `:2191`, `:2267` | Incorporar objetos nuevos al presupuesto y orden de borrado. |
| Worker con unión/casts exactos | `src/modules/integrations/db/worker-api.ts:9`, `:104` | Probar la aridad nueva con cliente real, no solo mocks. |
| Tenant servidor y mapa explícito de páginas | `src/modules/tenant/context.ts:37`; `src/components/app/shell.tsx:26` | Nunca company_id cliente; navegación aditiva. |
| Proyectos separados y scripts existentes | `vitest.config.mts:25`, `:34`, `:43`, `:66`; `package.json:8` | verify no sustituye app/pgTAP; no agregar scripts. |
| Patrón de prueba real de RLS | `tests/app/tiendanube-data-api.test.ts:47` | JWT de dueño/otra empresa/anon en desechable, no aserciones con service_role. |
| Últimos números observados | `supabase/migrations/0025_recovery_account_check.sql:1`; `supabase/tests/19_recovery_account.test.sql:1` | 0026/20 son nombres provisionales, sin reservar frente a otro trabajo. |
| Caminos JWT/worker y seguridad de datos | `docs/ARCHITECTURE.md:173`; `docs/SECURITY.md:159`, `:220`, `:384`, `:420` | Mantener separación y no usar credencial administrativa en runtime. |

## Diseño concreto

### 1. Políticas y contratos del motor

Las propuestas de Q-01 a Q-08 no son decisiones aprobadas y bloquean aprobación/implementación hasta resolverlas. Se fijan aquí las elecciones técnicas no materiales; no se eligen políticas de producto por defecto.

Módulo nuevo `src/modules/stock/`. `contract.ts` exporta esquemas cerrados y `STOCK_METHODOLOGY_VERSION='tn_stock_v1'`. Tipos previstos:

- `StockObservation`: `kind=managed|unmanaged|unknown|invalid|unsupported_locations`, `quantity:string|null` entero decimal no negativo, `source=variant_stock|inventory_levels|null`, `observedAt`, `snapshotId`, `variantKey`, `productKey`. Claves UUID internas; IDs externos solo en memoria y resolución SQL privada.
- `SalesEvidence`: `from`, `to`, `timezone`, `closedDays`, `covered`, `units:string|null`, `unassignedUnits:string|null`, `quality=observed|incomplete|unverified`.
- `StockPolicy`: ventana/mínimo (Q-01), frescura/duración (Q-02), umbrales/orden (Q-03), ubicaciones (Q-04), suficiencia (Q-06). Constantes del servidor versionadas tras aprobación, no políticas del cliente/modelo.
- `ReplenishmentParameters`: horizonte y eventual plazo aprobados en Q-05, procedencia `user_statement`, validados en servidor. No hechos de Tiendanube.
- `StockResult`: claves internas, etiqueta, stock, velocidad, días, estado, prioridad, cantidad, motivos y evidencia. Cada métrica usa `known` con valor/fórmula/entradas o `unknown` con motivo; nunca NaN, infinito ni cero de relleno.

Firmas previstas: `evaluateStock(input:StockEngineInput):StockResult[]` puro con `now` explícito en `calculate.ts`; `loadStockView(input:StockViewInput,deps?:Partial<StockDeps>):Promise<StockView>` server-only en `load.ts`; `index.ts` exporta contratos/motor, no worker ni credenciales. StockViewInput solo contiene cursor y parámetros de escenario aprobados, nunca empresa o conexión cliente.

StockView distingue `sin_empresa`, `sin_conexion`, `requiere_reauth`, `sin_snapshot`, `actualizando`, `datos_insuficientes`, `listo`, `error`. Falta de ventas no oculta stock conocido. Textos de error fijos: «No pudimos leer el inventario» y «No hay datos suficientes para esta estimación». Motivos cerrados: stock desconocido/no gestionado/inválido/antiguo, catálogo incompleto, ventas sin cobertura/sin variante/calidad no verificada/sin ventas/evidencia insuficiente, ubicaciones no soportadas, faltan parámetros. Son códigos del contrato, sin cuerpos del proveedor ni valores secretos en logs.

### 2. Proyección y publicación de stock

Mantener ProjectedProduct y la firma de tn_publish_catalog. Agregar `projectStockProduct(raw:unknown,observedAt:string):ProjectedStockProduct` en projection.ts. Construir lista cerrada: producto, variantes, gestión, cantidad/estado y fuente. No copiar precios, costo, HTML, imágenes ni customer. observedAt es recepción de esa página en PRAXA, no modificación en Tiendanube.

Aceptar enteros seguros o texto decimal entero no negativo; serializar como texto. Fracción, negativo, vacío, booleano, overflow y coerción ambigua son inválidos. Ausencia/nulo no es cero. stock_management=false se representa no gestionado, nunca número infinito. Ubicaciones según Q-04: no sumar stock más niveles, no inventar cero ante ausencia, detectar duplicados. No persistir IDs de ubicación en salida pública. Límites de tamaño explícitos y verificados antes de guardar.

Función nueva prevista `worker_api.tn_publish_catalog_stock(p_actor_user_id uuid,p_company_id uuid,p_connection_id uuid,p_expected_generation integer,p_run_id uuid,p_lease_token uuid,p_products jsonb,p_state jsonb,p_complete boolean,p_stock_page jsonb)`: diez argumentos. p_state conserva next_page/store; p_stock_page contiene observed_at, page_valid e items con claves exactas. Retorno: products_written, products_deleted, catalog_next_page existentes, más snapshot_id UUID y stock_status text. repository.ts agrega publishCatalogStock y valida una fila exacta; worker-api agrega nombre y diez casts.

Forma prevista exacta del nuevo payload: `p_stock_page={observed_at:string,page_valid:boolean,items:[{product_id:string,variant_id:string,kind:managed|unmanaged|unknown|invalid|unsupported_locations,quantity:string|null,source:variant_stock|inventory_levels|null}]}`. `ProjectedStockProduct` contiene `product_id` e `items` de esa forma, todos con el mismo product_id. IDs externos se validan como los IDs decimales existentes, solo para resolver correspondencias en servidor. Antes de llamar al worker se aplanan los items de la página, sin modificar p_products. Un item managed exige quantity y source; cualquier otro estado exige quantity=null. quantity admite 0..9223372036854775807, sin fracciones ni exponentes; suma de niveles se valida contra el mismo máximo. Internamente se utiliza bigint, por lo que no se pierde precisión al validar. Stock negativo o fuera del límite es invalid, no cero. stock_status retornado por el worker es exactamente collecting, complete o invalid. Reintento con el mismo ownership/checkpoint/payload es idempotente; contenido incompatible para una misma página no se sobrescribe como si fuera el mismo reintento.

La función verifica pertenencia/ownership tras bloqueos, invoca tn_publish_catalog con sus nueve argumentos y registra stock en la misma transacción. Si falla stock, revierten catálogo y checkpoint. Prohibido publicar ambos por llamadas independientes que puedan perder una página al reanudar. El cliente anterior sigue funcionando con tn_publish_catalog, sin fabricar snapshots de inventario; el nuevo lector se abstiene hasta un recorrido nuevo íntegro.

Objetos nuevos previstos en public:

| Objeto | Contrato mínimo |
|---|---|
| tn_stock_snapshots | company_id, connection_id, id UUID, credential_generation, started_at/completed_at, first_observed_at/last_observed_at, status collecting/complete/invalid, invalid_pages, methodology_version. Único collecting por conexión. |
| tn_stock_items | PK(snapshot_id,variant_key), empresa/conexión, product_key/variant_key internos, nombre y SKU capturados, estado/cantidad nullable/fuente, observed_at. Incluye variantes sin ventas. |
| tn_stock_status | Una fila por conexión; company_id, connection_id, collecting_snapshot_id y published_snapshot_id. Punteros restringidos a snapshots de la misma conexión/empresa. No recomendaciones ni cache de ventas. |

FK compuestas, RLS activada/forzada y CHECK de estados/cantidades. Resolver ID externo a clave interna después de publicar catálogo en la misma operación. No basta UUID como barrera de acceso. Al comenzar page=1 abrir snapshot; reanudación conserva ID aunque cambie run del paso. Reintento idempotente; generación nueva no continúa snapshot de credencial previa. IDs de variante repetidos entre páginas invalidan el recorrido, no se suman.

Stock ausente de variante identificada produce unknown y conserva la variante. Producto/variante no identificables marcan page_valid=false, sin alterar la omisión y contadores previos de M16e. Solo última página sin error estructural ni páginas omitidas completa snapshot y cambia puntero publicado atómicamente. Fallo/parcial no promueve. Variante ausente del snapshot nuevo deja el universo vigente, no se convierte en cero.

Un recorrido HTTP no es una transacción de la tienda: mostrar intervalo de observación y limitar duración según Q-02. No prometer detección de todos los cambios concurrentes del proveedor. Mientras haya recorrido pendiente o paso activo, mostrar actualizando y observaciones previas fechadas, sin recomendaciones nuevas; un lease vencido no renueva actualidad. El lector nunca mezcla snapshots. Retención/reversión depende de Q-07; no borrar generaciones por iniciativa propia.

### 3. Lectura y ventas

RPC nueva `public.get_tn_stock_inputs(p_connection_id uuid,p_from date,p_to date,p_snapshot_id uuid,p_after_variant_key uuid,p_limit integer)`, SECURITY INVOKER, search_path vacío. Valida fechas cerradas, ventana aprobada, límite 1..200 y snapshot de conexión visible. No recibe company_id; tenant y conexión resueltos por servidor. Dueño ajeno/anon/desconectado no obtiene datos.

Retorna snapshot_id, claves internas, nombre/SKU, estado/cantidad/fuente, instantes/intervalo, stock_status, units, unassigned_units, sales_covered, sales_quality, timezone, from_day/to_day, closed_days y has_more. Orden por variant_key, no top-N. Primera página selecciona snapshot publicado y siguientes fijan ese ID; si cambió el puntero, invalidar lista y recargar, nunca mezclar generaciones. El adaptador recorre todas las páginas: error de una página invalida completitud y ranking global. Rendimiento máximo es H-03, no se trunca silenciosamente.

Antes de pedir items, load.ts lee tn_stock_status y el metadato tn_stock_snapshots publicado bajo el JWT y RLS. Esto permite representar un catálogo completo vacío como lista vacía válida con fecha y cobertura, en vez de confundir cero filas con falta de snapshot. Esta lectura inicial no devuelve datos de colección/históricos al cliente. Revalidar el puntero al terminar la paginación; cualquier cambio obliga a descartar y recargar antes de calcular prioridades globales. En caso de vacío también se revalida, sin inventar un producto o variante de relleno.

Anclar en snapshot completo, LEFT JOIN a tn_product_units_daily por empresa/conexión y claves. Sumar bigint/numeric exactos, enviar texto; SKU no es clave. Días sin fila valen cero solo con cobertura comprobada. Backfill y primer incremental completos de M16e obligatorios; durante sincronización que pueda alterar agregados, abstener recomendaciones. Un statement por página lee metadatos y unidades coherentemente.

to=ayer en zona de tienda; from=to-(W-1) días civiles. Sin cobertura hasta ayer no desplazar período a un intervalo atrasado ni fabricar cero. Reutilizar localDay/addDays, no dividir milisegundos por 24 horas.

Elegibilidad conservada: paid/partially_refunded no cancelados; partially_paid fuera. Día paid_at con fallback created_at. Reembolsos parciales conservan cantidad original de línea: no son unidades físicas netas. No repartir líneas sin variant_key; informar unidades no atribuibles del producto. No reconstruir demanda perdida.

Calidad: projectOrder omite líneas inválidas y el conteo histórico no certifica integridad por variante. covered=true no prueba ausencia de omisiones. sales_quality no puede inventar un certificado. Rotular unidades válidas persistidas; Q-06 decide si bastan para cantidad orientativa o exige nueva evidencia. Si se requiere captura adicional fuera de II.13d, REQUIERE CAMBIO EN LA RUTA antes de implementar, sin segundo pipeline oculto ni cambiar elegibilidad de M16e.

### 4. Cálculos y prioridad

Aritmética racional con bigint nativo, sin paquetes ni conversión de contadores SQL a Number. Para U unidades en W días cubiertos: V=U/W. Para stock S fresco, gestionado y válido, con U>0: D=S*W/U. S=0 permite D=0 con U>0; U=0 produce D desconocido, aunque stock cero permite identificar agotado. No gestionado/desconocido no genera D/cantidad. Formato de V/D con dos decimales, mitad hacia arriba; evidencia conserva racional exacto y clasificación usa racional sin redondeo.

Estados: agotado, riesgo, sin_riesgo_detectado, sin_ventas_observadas, no_evaluable. Umbral de riesgo y prioridad dependen de Q-03. Velocidad descriptiva por debajo del mínimo puede verse con aviso, sin recomendación firme. Producto completamente agotado solo si todas las variantes vigentes son evaluables y en cero; una disponible o desconocida impide afirmarlo. No sumar días por variante.

Prioridad propuesta pendiente Q-03: agotados con ventas suficientes, riesgo por D ascendente, agotados sin ventas suficientes con aviso, resto; desempate U descendente, nombre y UUID interno. Insuficientes separados con motivo; no simular prioridad baja ni fecha cierta de quiebre.

Cantidad propuesta en Q-05: Q=max(0,ceil(U*T/W)-S) si T es horizonte total; alternativa con horizonte posterior H y plazo declarado L usa T=H+L. Aprobar significado antes de fijar fórmula. Parámetros ausentes no son cero. Q=0 solo con entradas/política válidas. Sin reservas, compras en tránsito ni stock de seguridad inventados. Rotular «cantidad orientativa según ventas observadas y parámetros declarados» y mostrar entradas. Nunca dispara escritura externa.

### 5. Pantalla, seguridad y reversibilidad

/app/stock protegida, carga de servidor, componentes stock.tsx/stock.module.css. shell.tsx aditivo, iconos existentes. Tabla por variante con producto, SKU o «Variante sin SKU» más clave interna abreviada estable, stock/fecha, unidades/período, V, D, estado, prioridad y cantidad/motivo. Ver evidencia expone fuentes, intervalo, cobertura, zona, método, fórmula y parámetros declarados. Nombres como texto escapado, sin HTML. Sin IDs de cuentas/pedidos/clientes/ubicaciones ni envío al LLM; sin mock real ni demo público nuevo.

Inputs de escenario si Q-05 los aprueba: transitorios en la página, validados de nuevo en servidor. No permiten empresa/conexión, políticas, fórmula o código del cliente. Sin parámetros, stock/ventas/riesgo siguen útiles bajo sus propios gates.

authenticated: SELECT bajo RLS solo del snapshot publicado de conexión visible y EXECUTE de RPC invoker; no histórico/colección ni escritura. anon sin grants; worker solo EXECUTE nuevo, sin tablas; service_role fuera de runtime. DEFINER solo en esquemas privados/worker, matriz exacta en migración y pgTAP.

No almacenar recomendaciones ni otra copia de ventas: customer/redact recalcula por flujo existente y lectura siguiente refleja unidades nuevas, sin cache huérfana. Stock de catálogo no tiene datos de comprador. Desconexión oculta inmediatamente aun antes de purga.

Migración nueva puede reemplazar definiciones necesarias de worker_api.purge_connection y tn_privacy_store_redact con mismas firmas/grants/bloqueos, incorporando items, snapshots y status al orden de borrado. Presupuesto p_max_rows cuenta stock; no cascada masiva no contabilizada al borrar padre. Borrado de empresa por FK elimina todo; reintentos seguros. Generaciones previas se conservan según Q-07 para revertir puntero/estado en operación administrativa verificada, no una acción cliente ni restauración de privacidad. No ampliar excepciones de borrado. Revalidar número libre antes de migración.

## Archivos previstos

Esta expansión solo crea este archivo. Tabla de futura implementación, no plan por pasos. II.13d autoriza por áreas sin pasos numerados: se cita el apartado en vez de inventar números.

| Archivo | Nuevo o modificado | Para qué | Autorizado por |
|---|---|---|---|
| `src/modules/stock/{contract,calculate,load,index}.ts` | Nuevos | Contratos, motor, lectura y exportaciones | II.13d, módulo nuevo |
| `src/app/(app)/app/stock/page.tsx` | Nuevo | Página protegida | II.13d, pantalla |
| `src/components/app/{stock.tsx,stock.module.css}` | Nuevos | Tabla/estados/evidencia | II.13d, componentes stock* |
| `src/components/app/shell.tsx` | Modificado | Navegación y tipo aditivos | II.13d, navegación |
| `src/modules/integrations/tiendanube/{projection,sync,repository}.ts` | Modificados | Proyección y operación atómica catálogo/stock | II.13d, conector mínimo |
| `src/modules/integrations/db/worker-api.ts` | Modificado | Nombre y diez casts | II.13d, cliente acotado |
| `supabase/migrations/0026_tiendanube_stock.sql` | Nuevo, número provisional | Tablas, RLS, funciones y purga; siguiente número libre al implementar | II.13d, migraciones nuevas |
| `supabase/tests/20_tiendanube_stock.test.sql` | Nuevo, número provisional | Atomicidad, ownership, aislamiento, borrado | II.13d, pgTAP nuevo |
| `supabase/tests/{09_integration_privileges,10_demo_closure,18_tiendanube}.test.sql` | Modificados | Grants, purga y regresión del dato nuevo | II.13d, pgTAP enumerados |
| `tests/unit/{stock,stock-load,stock-sync}.test.ts` | Nuevos | Motor, lector y publicación | II.13d, suites específicas |
| `tests/component/app-stock.test.tsx` | Nuevo | Comportamiento de pantalla | II.13d, suites específicas |
| `tests/app/tiendanube-stock.test.ts` | Nuevo | JWT/RLS y recorrido real en desechable | II.13d, suites específicas |
| `tests/unit/tiendanube-{sync,analysis}.test.ts` | Modificados | Regresión catálogo, firmas y vista previa | II.13d, regresiones enumeradas |
| `tests/app/tiendanube-{sync,data-api}.test.ts` | Modificados | Regresión métricas/cobertura/lecturas | II.13d, regresiones enumeradas |
| `docs/ARCHITECTURE.md` | Modificado en implementación | Módulo stock y flujo RLS/worker como existente | II.13d, docs; contrato documental AGENTS |
| `docs/SECURITY.md` | Modificado en implementación | Activo inventario, capacidades, acceso/retención/borrado (§§1,5,6,9) | II.13d, docs; contrato documental AGENTS |
| `docs/FASES/FASE1/M03a/acta-meta.md` y `docs/FASES/FASE1/meta_first/sesiones/M03a.md` | Modificados en etapa habilitada | Campos/finalidad, aprobación y comunicación previas, sin nuevos terceros | II.13d, acta y sesión |
| `docs/FASES/FASE1/M25c/spec.md`, futuro `plan.md`, `revisiones/*.md` | Según etapa | Spec única; plan solo tras aprobación; revisiones | II.13d, Precondición 9 |
| `docs/FASES/FASE1/meta_first/{plan,spec}.md` | Solo si decisión exige coordinación autorizada | Sin modificar decisiones ajenas | II.13d, documentación |
| `docs/HALLAZGOS.md`, `docs/PROJECT_STATE.md`, `docs/FASES/FASE1/meta_first/sesiones/M25c.md` | Seguimiento posterior | Hallazgos, estado y evidencia reales | II.13d, Precondición 8 |

No se prevén cambios en client.ts/config.ts/limits.ts/analysis.ts: se reutilizan. Si H-01 requiere otros ajustes, concretarlos antes del plan dentro de II.13d y detenerse si exceden autorización. Ningún helper de pruebas nuevo fuera de suites previstas. Las guías instaladas `node_modules/next/dist/docs/` no estaban disponibles: no bloquea esta spec documental, pero deben leerse antes de escribir código Next. No se instala nada durante expansión.

## Criterios de aceptación

### Heredados de la ruta

Catorce criterios (ocho CA, seis CB), más DEC-26 como decisión de alcance.

| ID de la ruta | Qué exige (resumen fiel) |
|---|---|
| CA-82 | Stock observado por variante y catálogo sin ventas; cero/desconocido/no gestionado/inválido distintos; múltiples ubicaciones verificadas. |
| CA-83 | Velocidad reproducible con días cerrados cubiertos, definición de venta/zona explícitas; ventas observadas, sin inventar demanda. |
| CA-84 | Días con entradas válidas, agotados por stock cero; no infinito ni producto entero agotado por una variante. |
| CA-85 | Prioridad/riesgo determinísticos, versionados y con evidencia; sin falsa actualidad de parciales/antiguos. |
| CA-86 | Cantidades con datos/parámetros suficientes, fórmula y limitaciones; abstención explicada. |
| CA-87 | Evidencia, hecho/cálculo/hipótesis separados; sin LLM ni #10 u otras funciones excluidas. |
| CA-88 | Tenant servidor, RLS, rol acotado, solo lectura externa; acta y borrado del nuevo dato, sin extender excepciones. |
| CA-89 | TDD, sintéticos/desechable, aislamiento/purga/regresiones, hasta 8 h y pipeline completo para G-STOCK. |
| CB-01 | verify y suites obligatorias pasan. |
| CB-02 | Sin secretos, montos reales ni IDs de cuentas en diff/evidencia. |
| CB-03 | Ninguna migración existente se modifica. |
| CB-04 | Ninguna prueba M25c en producción; no heredar excepciones de otras microfases. |
| CB-05 | Evidencia real de comandos/resultados, sin acreditar pruebas no ejecutadas. |
| CB-06 | Una prueba omitida por configuración no está ejecutada y bloquea cierre. |

DEC-26: motor/pantalla independientes, G-TIENDA como dependencia, G-STOCK propio; sin alterar demo ni autorizar concurrencia sobre archivos compartidos.

### Operativos de esta microfase

| ID | Criterio verificable | Traza a (CA, DEC o trampa de la ruta) |
|---|---|---|
| M25c-C-01 | Cada variante vigente figura una vez, incluso sin SKU/ventas; SKU no es clave. | CA-82, ranking limitado |
| M25c-C-02 | Cero, ausente, no gestionado e inválido generan estados distintos sin coerción. | CA-82 |
| M25c-C-03 | Ubicaciones siguen Q-04 sin doble suma ni cero por ausencia. | CA-82 |
| M25c-C-04 | Publicación de catálogo/stock por página es transaccional e idempotente con checkpoint. | CA-88, JSON estricto |
| M25c-C-05 | Solo recorrido íntegro promueve snapshot; fallo/crash no mezcla generaciones. | CA-85, paginación |
| M25c-C-06 | Ownership/lease/generación inválidos no publican tras bloquear. | CA-88 |
| M25c-C-07 | API/DTO/evidencia sin secretos ni IDs externos de cuentas/pedidos/clientes/ubicaciones. | CA-87/88, CB-02 |
| M25c-C-08 | Ventana W de días cerrados locales, ausencia sin cobertura no es cero. | CA-83 |
| M25c-C-09 | Velocidad exacta y elegibilidad intacta; unidades sin variante no se reparten. | CA-83 |
| M25c-C-10 | Frescura desde observación más antigua/duración; límites exactos y timestamps futuros probados. | CA-84/85, Q-02 |
| M25c-C-11 | D=S*W/U sin redondeo intermedio; U=0 no divide ni produce infinito. | CA-84 |
| M25c-C-12 | Agotado por variante/producto respeta datos desconocidos y otras variantes disponibles. | CA-84 |
| M25c-C-13 | Orden/desempates aprobados no dependen del orden de entrada SQL. | CA-85 |
| M25c-C-14 | Cantidad requiere parámetros/política suficiente aprobados; ausencia devuelve motivo, no cero. | CA-86, Q-05/06 |
| M25c-C-15 | Cada cifra es reproducible y cada abstención tiene motivo específico visible. | CA-87 |
| M25c-C-16 | Página protegida y lector servidor no aceptan tenant cliente; ajeno/anon no ve filas. | CA-88 |
| M25c-C-17 | Grants/RLS/INVOKER/DEFINER exactos; worker sin acceso directo a tablas. | CA-88 |
| M25c-C-18 | Desconexión oculta; purga reanudable con presupuesto borra todo el stock. | CA-88 |
| M25c-C-19 | Privacidad/cambio de estado actualizan ventas leídas, sin recomendaciones en cache. | CA-83/88 |
| M25c-C-20 | Integraciones, JSON antiguo, métricas, chat y diagnóstico mantienen comportamiento. | DEC-26, regresión M16e |
| M25c-C-21 | Fallo conserva evidencia previa; reversión según política no restaura privacidad borrada. | CA-88, reversibilidad |
| M25c-C-22 | Más de 50 variantes, cambio de snapshot/error de página y rendimiento sin truncado silencioso. | CA-82/89 |
| M25c-C-23 | Evidencia rojo/verde real, destino desechable, skips registrados; sin cierre automático. | CA-89, CB-01 a CB-06 |
| M25c-C-24 | ≤8 h, coordinación y acta resueltos en su gate; #10/LLM fuera. | CA-87/89, DEC-26 |

## Casos de prueba

Cuarenta casos previstos, no ejecutados en expansión. Archivos nuevos solo se crean al habilitar implementación. W/TTL/umbrales de pruebas se fijan con el grill; recomendaciones no son políticas aprobadas.

| ID | Criterios | Tipo (unit, component, app, pgTAP, manual) | Comando | Resultado esperado | ¿Falla sin la implementación? |
|---|---|---|---|---|---|
| M25c-T-01 | C-01/02 | unit | `npm run test:unit -- tests/unit/stock-sync.test.ts` | Proyección distingue cero/ausente/no gestionado sin cambiar projectProduct. | Sí, TDD |
| M25c-T-02 | C-02/07 | unit | `npm run test:unit -- tests/unit/stock-sync.test.ts` | Fracciones/negativos/vacíos/booleanos/overflow/extras no fabrican stock. | Sí, TDD |
| M25c-T-03 | C-03 | unit | `npm run test:unit -- tests/unit/stock-sync.test.ts` | Ubicación única/varias/duplicadas/nulas siguen Q-04 sin doble suma. | Sí, TDD |
| M25c-T-04 | C-04/20 | unit | `npm run test:unit -- tests/unit/stock-sync.test.ts tests/unit/tiendanube-sync.test.ts` | JSON antiguo intacto y diez argumentos/casts correctos. | Nueva regresión roja |
| M25c-T-05 | C-04/05 | pgTAP | `npm run test:policies` | Fallo de stock revierte catálogo/checkpoint; reintento no duplica. | Sí, TDD |
| M25c-T-06 | C-05 | pgTAP | `npm run test:policies` | Dos páginas reanudadas conservan snapshot; solo última válida promueve. | Sí, TDD |
| M25c-T-07 | C-05/10 | unit | `npm run test:unit -- tests/unit/stock-sync.test.ts` | Omitido/HTTP/429/presupuesto/crash no acreditan completitud. | Sí, TDD |
| M25c-T-08 | C-05/12 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts` | Variante desaparecida no es cero; vacío completo distinto de error. | Sí, TDD |
| M25c-T-09 | C-06 | pgTAP | `npm run test:policies` | Lease vencido/run desplazado/generación vieja sin efectos. | Sí, TDD |
| M25c-T-10 | C-06/16 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts` | Actor/empresa/conexión cruzados rechazados con worker real. | Sí, TDD |
| M25c-T-11 | C-01/22 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts` | Más de 50/200 variantes sin ventas, SKU repetidos/nulos, universo completo. | Sí, TDD |
| M25c-T-12 | C-08 | unit | `npm run test:unit -- tests/unit/stock.test.ts` | Ayer local/mes/DST cuentan días civiles. | Sí, TDD |
| M25c-T-13 | C-08 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts` | Backfill/incremental incompletos no producen cero o período desplazado. | Sí, TDD |
| M25c-T-14 | C-09/19/20 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts tests/app/tiendanube-sync.test.ts` | paid/partially_refunded incluidos, cancelados/parciales excluidos, cambio recalcula. | Nueva regresión roja |
| M25c-T-15 | C-09/14 | unit | `npm run test:unit -- tests/unit/stock.test.ts` | Sin atribución/calidad no verificada aplica Q-06 sin reparto inventado. | Sí, TDD |
| M25c-T-16 | C-09/11 | unit | `npm run test:unit -- tests/unit/stock.test.ts` | Contador >MAX_SAFE_INTEGER y racional periódico conservan precisión. | Sí, TDD |
| M25c-T-17 | C-10 | unit | `npm run test:unit -- tests/unit/stock.test.ts` | Antes/en/después de TTL, futuro y duración excesiva. | Sí, TDD |
| M25c-T-18 | C-11 | unit | `npm run test:unit -- tests/unit/stock.test.ts` | Stock positivo/cero; U=0/desconocido/no gestionado sin NaN/infinito. | Sí, TDD |
| M25c-T-19 | C-11/13 | unit | `npm run test:unit -- tests/unit/stock.test.ts` | Umbral con racional exacto, sin clasificación por redondeo visual. | Sí, TDD |
| M25c-T-20 | C-12 | unit | `npm run test:unit -- tests/unit/stock.test.ts` | Variante disponible/desconocida impide producto íntegramente agotado. | Sí, TDD |
| M25c-T-21 | C-13 | unit | `npm run test:unit -- tests/unit/stock.test.ts` | Permutaciones dan orden/desempates idénticos. | Sí, TDD |
| M25c-T-22 | C-14 | unit | `npm run test:unit -- tests/unit/stock.test.ts` | Cantidad exacta, ceil, cero justificado; parámetros ausentes/inválidos sin cifra. | Sí, TDD |
| M25c-T-23 | C-14/15 | component | `npm run test:component -- tests/component/app-stock.test.tsx` | Abstención no oculta métricas válidas. | Sí, TDD |
| M25c-T-24 | C-07/15 | component | `npm run test:component -- tests/component/app-stock.test.tsx` | Evidencia completa; nombre malicioso como texto. | Sí, TDD |
| M25c-T-25 | C-15/16 | component | `npm run test:component -- tests/component/app-stock.test.tsx` | Sin empresa/conexión/reauth/error/actualizando/insuficientes, sin mock. | Sí, TDD |
| M25c-T-26 | C-16 | unit | `npm run test:unit -- tests/unit/stock-load.test.ts` | Tenant/conexión desde servidor, parámetros/cursor validados. | Sí, TDD |
| M25c-T-27 | C-16/17 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts` | Dueño ve publicado; otro/anon no ve actual/colección/histórico. | Sí, TDD |
| M25c-T-28 | C-17 | pgTAP | `npm run test:policies` | Grants exactos; escritura cliente/SELECT worker denegados, RPC invoker. | Sí, TDD |
| M25c-T-29 | C-18 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts` | Desconexión oculta antes de purga, reconexión no reutiliza stock viejo. | Sí, TDD |
| M25c-T-30 | C-18 | pgTAP | `npm run test:policies` | Presupuesto pequeño, tandas/reintentos y cero huérfanos. | Sí, TDD |
| M25c-T-31 | C-18/21 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts` | Empresa/purga eliminan stock, reejecución segura. | Sí, TDD |
| M25c-T-32 | C-19 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts` | customer/redact cambia ventas sin cache previo. | Sí, TDD |
| M25c-T-33 | C-20 | unit/app | `npm run test:unit -- tests/unit/tiendanube-analysis.test.ts tests/unit/tiendanube-sync.test.ts`; `npm run test:app -- tests/app/tiendanube-data-api.test.ts tests/app/tiendanube-sync.test.ts` | Contratos previos/clientes anteriores siguen válidos. | Nueva regresión roja; suite previa control |
| M25c-T-34 | C-21 | pgTAP | `npm run test:policies` | Fallo conserva snapshot; reversión no cruza tenant ni restaura privacidad. | Sí, TDD |
| M25c-T-35 | C-22 | unit/app | `npm run test:unit -- tests/unit/stock-load.test.ts`; `npm run test:app -- tests/app/tiendanube-stock.test.ts` | Cambio de snapshot/fallo de página invalida lista, sin truncado. | Sí, TDD |
| M25c-T-36 | C-22/23 | app | `npm run test:app -- tests/app/tiendanube-stock.test.ts` | Fixture máximo predefinido verifica presupuesto/duración de H-03. | Sí; presupuesto pendiente Q-08 |
| M25c-T-37 | C-07/23/24 | manual | `git diff --check` y revisión de rutas/diff | Solo autorizados, sin secretos/datos reales, migraciones antiguas intactas. | No aplica documental |
| M25c-T-38 | C-23 | app/pgTAP | `npm run db:check:test`; `npm run test:policies`; `npm run test:app` | Destino desechable, fallos/skips no son PASS. | Guardas existentes, aserciones nuevas TDD |
| M25c-T-39 | C-15/24 | manual/component | `npm run test:component -- tests/component/app-stock.test.tsx` y recorrido sintético desechable | Teclado/móvil/evidencia coherentes, sin LLM/escrituras externas. | Automática sí; manual no aplica |
| M25c-T-40 | C-23/24 | manual | Revisión spec/acta/coordinación/evidencia; `npm run verify` al implementar | Decisiones cerradas, tamaño justificado, acta antes de nuevo dato real y revisiones. | No para aprobaciones; código verificado |

## Verificación

En expansión solo inspección/fuentes oficiales y validación documental de plantilla, IDs, trazabilidad, rutas, estado BORRADOR y preservación de cinco docs previos. No suites, instalaciones, producción ni lectura de .env.local. El contexto aislado de la skill sufrió dos lecturas bloqueadas sin salida/archivos; se continuó con herramientas de la sesión principal. No se presenta esto como auditoría independiente.

Futura implementación, tras spec y plan aprobados:

1. TDD con `npm run test:unit -- tests/unit/stock.test.ts tests/unit/stock-load.test.ts tests/unit/stock-sync.test.ts` y `npm run test:component -- tests/component/app-stock.test.tsx`: evidencia roja/verde real.
2. `npm run db:check:test` antes de SQL; usuario ejecuta `npm run db:push:test`; después `npm run test:policies`. Rojo contra esquema previo/ausencia del nuevo contrato y verde con migración nueva; no editar migraciones antiguas.
3. `npm run test:app -- tests/app/tiendanube-stock.test.ts`, regresiones T-33 y `npm run test:app` completo. No heredar excepciones H-E1-216/H-E1-258; diagnosticar fallos.
4. `npm run verify`, `git diff --check`, revisión de autorizados y T-37 a T-40; verify no prueba RLS. Conteo final no sustituye TDD.
5. `/implementation-review M25c` y `/qa-review M25c` en sus etapas, con commits del usuario y condiciones del pipeline. Solo el usuario aprueba G-STOCK.

App/SQL usan guardas existentes y nunca app/producción. Configuración faltante es bloqueo, no PASS (CB-06). Las autorizaciones técnicas de herramientas no aprueban documentos/gates. Dos iteraciones de corrección sin converger exigen detener y registrar hallazgo conforme a AGENTS.

## Intervenciones del usuario y acciones reservadas

| Paso | Qué hace el usuario | Cómo se verifica después |
|---|---|---|
| Grill | Resolver Q-01 a Q-08 por `/grill-me`; aprobar enmienda previa si una respuesta cambia ruta. | D-M25c-NN con motivo/fecha, secciones coordinadas; no vaciar preguntas sin responder. |
| Spec | Tras `/spec-auditor M25c` APROBABLE, aprobar spec expresamente. | Estado/hash corresponden a texto auditado. |
| Plan | Pedir plan en sesión nueva, auditarlo y aprobarlo. | Criterios/pruebas cubiertos, sin crear plan aquí. |
| Coordinación | Resolver orden con trabajo que toque conector/worker/shell/pgTAP. | Revisar Git/ramas antes de editar, preservar cambios ajenos. |
| Datos reales | Aprobar acta ampliada y comunicar campos/finalidad al dueño antes de primer stock real. | Evidencia redactada M03a/M25c; enmienda no sustituye acta. |
| Base desechable | Ejecutar `npm run db:push:test` cuando corresponda. | Guarda/suites acreditan migración en desechable. |
| Publicación | Commit/push/PR/integración/despliegue y `db:push` en app en su etapa. | CI/revisiones/publicación registradas; pruebas M25c nunca en producción. |
| Gate | Aprobar G-STOCK tras aceptación completa. | Estado/evidencia registrados, sin cambiar demo/siguiente ajenas. |

No se pide implementar código ni pegar secretos. Propuesta no necesita otra cuenta ni scopes: si H-01 demuestra lo contrario, detener para decidir.

## Trampas y riesgos

- Null/ausente/no gestionado no son cero; no Number(null) o Number('').
- catalog_complete_at no es snapshot simultáneo. La API puede cambiar mientras se pagina: intervalo/frescura separados de ventas, sin promesa transaccional externa.
- M16e puede completar catálogo con productos omitidos. Stock necesita integridad propia sin reinterpretar completitud previa.
- SKU repetido/nulo y variante desaparecida no prueban stock. El ranking omite ceros.
- Reembolso monetario no identifica devolución física, y ventas no miden demanda perdida; Q-06 no se resuelve por código.
- El publicador nuevo debe conservar JSON previo, aridad y atomicidad: mocks de worker no bastan.
- Snapshots cuestan almacenamiento y su retención es material Q-07. No destruir reversibilidad por TTL unilateral.
- Purga por tandas cuenta todos los hijos; cascadas no presupuestadas pueden exceder límite.
- Guías/dependencias instaladas no se presumen disponibles porque package.json las referencia. Antes de código Next deben leerse las guías pertinentes.
- Tamaño ≤8 h no se prueba con lista de archivos. Q-08/H-06 son control previo al plan: excepción/recorte exige enmienda explícita.

## Decisiones de la microfase

| ID | Decisión | Motivo | Decidió | Fecha |
|---|---|---|---|---|
| — | No hay decisiones materiales D-M25c aprobadas. | DEC-26 registra aprobación de alcance/ID; parámetros quedaron abiertos. Elecciones técnicas no materiales están en Diseño concreto. | Pendiente del grill | — |

## Supuestos e hipótesis

| ID | HIPÓTESIS y estado | Cómo y cuándo se verifica |
|---|---|---|
| M25c-H-01 | GET products con fields vigente incluye stock_management/stock/inventory_levels cuando corresponde sin scopes nuevos. Documentación de variante no acredita respuesta efectiva. | Formas oficiales y lectura autorizada de tienda de demostración sintética fuera de producción antes de aceptar extracción. Si listado no basta, reevaluar dentro de II.13d y detener si excede autorización. |
| M25c-H-02 | Los niveles permiten total con significado operativo aprobado Q-04; no se conoce vendible/reservas/canales por depósito. | Documentación/fixture multiubicación; si no justificable, abstener con unsupported_locations, sin principal inventado. |
| M25c-H-03 | Universo completo y motor caben en presupuesto SQL/petición para catálogo objetivo. No hay benchmark ni máximo acreditado. | Fijar volumen sintético máximo y duración antes del plan al resolver Q-08, medir T-36 en desechable; no truncar. |
| M25c-H-04 | La velocidad observada se mantiene en horizonte: hipótesis de escenario, no demanda futura cierta. | Visible junto al cálculo y probada presentación. Otra promesa exige revisar alcance. |
| M25c-H-05 | Unidades persistidas bastan para cantidad orientativa según Q-06; cobertura no certifica ausencia histórica de omisiones. | Resolver Q-06 y probar abstenciones antes de aprobar spec; no inventar calidad. |
| M25c-H-06 | El corte completo cabe en ocho horas; aún no es estimación acreditada. | Evaluar decisiones/volumen antes del plan. Si no justificable, volver al usuario sin implementar ni asumir excepción. |

## Preguntas abiertas

Ocho decisiones materiales, con recomendaciones pendientes; no se ejecuta grill automáticamente.

| ID | Pregunta | Opciones | Recomendación | Evidencia |
|---|---|---|---|---|
| M25c-Q-01 | ¿Ventana y mínimo para recomendar? | A: 28 días cerrados cubiertos, mínimo 5 unidades por variante; velocidad descriptiva con aviso por debajo. B: otros valores explícitos justificados. | A como regla inicial simple, sin afirmar significancia estadística. | CA-83/86; analysis.ts:84 es precedente, no política de stock. |
| M25c-Q-02 | ¿Frescura y duración máxima del recorrido? | A: observación más antigua menor a 24 h y recorrido ≤1 h; igualdad TTL ya antiguo. B: umbrales explícitos más estrictos. | A inicialmente; antiguo/incompleto se abstiene, leer pantalla no renueva fecha. | CA-84/85; sync.ts:430 y 0023:2025 no garantizan simultaneidad ni frecuencia. |
| M25c-Q-03 | ¿Umbral y prioridad? | A: D≤7 días y orden propuesto en Diseño §4. B: otros umbrales/orden explícitos. | A como umbral de revisión, no plazo proveedor ni garantía. | CA-85; no existe lead time en esquema. |
| M25c-Q-04 | ¿Qué significado se permite para múltiples depósitos? | A: suma de niveles completos válidos, stock total informado, sin prometer vendible o reposición por depósito. B: abstener cobertura/cantidad hasta otra microfase. | A solo si H-01/02 verificadas y usuario acepta significado; si no, abstención. No doble suma. | CA-82; Product Variant oficial distingue stock agregado e inventory_levels. |
| M25c-Q-05 | ¿Parámetros y fórmula de cantidad? | A: H cobertura posterior y L plazo declarado, enteros explícitos H≥1/L≥0, H+L≤365; Q=max(0,ceil(U*(H+L)/W)-S). B: solo T horizonte total explícito 1..365; Q=max(0,ceil(U*T/W)-S). Inputs transitorios, sin valores por defecto/almacenamiento. | B minimiza configuración y no introduce proveedores. Con A aprobar significado de H para no contar plazo dos veces. | CA-86; no hay parámetros/plazos/compras en tránsito existentes. |
| M25c-Q-06 | ¿Unidades persistidas bastan para cantidades pese a omisiones y reembolsos? | A: ventas observadas con advertencia fija de no demanda ni devolución física; abstener cantidad ante unidades sin variante o insuficiencia conocida. B: exigir integridad/retornos adicionales antes de cantidades. | A si usuario acepta limitación; nunca cantidad óptima. Con B mantener abstención; si exige captura fuera de II.13d, REQUIERE CAMBIO EN LA RUTA antes de implementarla. | CA-83/86; projection.ts:186 omite líneas; 0023:667 suma originales vigentes; H-E1-262. |
| M25c-Q-07 | ¿Retención interna para reversibilidad? | A: conservar generaciones hasta desconexión/borrado empresa, ocultas salvo publicada, medir costo antes del plan. B: retención/compactación acotada a diseñar sin perder reversibilidad. | A evita nueva excepción. Si B destruye datos irreversiblemente, REQUIERE CAMBIO EN LA RUTA y acta, no TTL unilateral. | CA-88, AGENTS, 0023:2191 y acta de nuevo dato. |
| M25c-Q-08 | ¿Se sostiene el corte completo ≤8 h y qué volumen sintético debe soportar? | A: mantener límite, fijar catálogo máximo sintético y justificar viabilidad antes del plan. B: si no cabe, enmienda explícita con ajuste/subdivisión/excepción antes de continuar. | A es requisito vigente, no estimación acreditada. Asistente debe proponer B si no converge; no pedir al usuario implementar ni estimar código. | Ficha, CA-89, II.13d; nuevo publicador/RLS/purga sin medir. |

## Hallazgos relacionados

H-E1-261 resuelto documentalmente por enmienda; esta expansión no aprueba otro gate. H-E1-262 permanece abierto asignado a M25c: publicación/lectura propias y Q-01 a Q-07 concretan la respuesta, no lo cierran por mera existencia de spec. H-E1-216/H-E1-258 son antecedentes de timeout ajenos, no excepciones de M25c. No se modifica HALLAZGOS durante esta expansión.

## Auditorías

Ninguna auditoría de esta spec realizada ni informes M25c existentes que enlazar. Próximo paso solo por comando del usuario: `/grill-me` sobre esta spec y sus preguntas; después `/spec-auditor M25c` en contexto independiente. No crear plan/código antes de etapas y aprobaciones oficiales.
