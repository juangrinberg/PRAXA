# Enmienda — RFM, cohortes y propuestas de audiencias (#18 + #32)

**Estado:** APROBADA en alcance por el usuario el 2026-11-17, con condiciones; integrada documentalmente en la ruta. No aprueba spec, plan ni implementación.
**ID:** M27a. M26b permanece reservado para estrategias publicitarias (#13), por declaración expresa del usuario. La búsqueda de M27a en docs/ y .claude/ no encontró usos previos antes de esta edición.

## Decisión y límites

Una única microfase, una spec, un plan y un gate G-SEGMENTOS-AUDIENCIAS. Integra segmentación RFM, cohortes y propuestas determinísticas para Meta Ads en una pantalla independiente. Las etapas internas no son microfases ni gates adicionales. No se expande la spec ni se genera el plan de implementación en esta sesión.

Las propuestas cubren fidelización, remarketing, reactivación, venta cruzada, exclusión de clientes existentes y semillas de similares cuando exista evidencia suficiente. Cada una incluye nombre, objetivo, segmento, cantidad identificable cuando sea calculable y divulgable, inclusión/exclusión, métricas de respaldo, justificación, estrategia sugerida y limitaciones. Sin IDs, listas de personas, exportación, sincronización, creación de audiencias ni cambios de campañas. No promete tamaño alcanzable, coincidencia con Meta ni rendimiento. Venta cruzada exige evidencia de productos; no presupone categorías que no estén disponibles. No se necesita una conexión de Meta para producir propuestas locales.

## Investigación monetaria y condición obligatoria

Fuentes consultadas el 2026-11-17:
- [Order, API 2025-03, propiedades e historial de valores](https://tiendanube.github.io/api-documentation/resources/order).
- [Destino actual indicado por esa documentación](https://nuvemshop.dev/en-US/api/resources/2025-03/order) (enlace de referencia; no se acredita validación adicional).
- M16e/spec.md: métricas y M16e-H-06; meta_first/sesiones/M16e.md: cierre con H-06 no verificada.
- Código: tiendanube/limits.ts (constante false), projection.ts (projectOrder y refundedFromHistory), sync.ts (lectura de historiales), analysis.ts y migración 0023.

La documentación diferencia el precio total del pedido del importe pagado por el cliente. En el historial, los cambios liquidados tienen signo; un cambio negativo puede corresponder a una devolución. Esto respalda investigar el historial, pero NO demuestra que restar devoluciones a total_paid_by_customer sea correcto en todos los estados ni que no produzca doble descuento. Tampoco demuestra conciliación con liquidaciones, costos o beneficio.

El código actual guarda importes y reembolsos potenciales, pero mantiene TN_COLLECTED_AMOUNT_ENABLED = false. Solo consulta history/values para estados refunded y partially_refunded; un fallo o agotamiento de presupuesto puede dejar refunded_amount nulo. La proyección acepta distintas formas de historial: su presencia no acredita su contrato real ni completitud.

M27a debe resolver Monetary dentro de la misma microfase:
1. Precisar semántica de total, total_paid_by_customer e historial contra el contrato oficial vigente; evaluar alternativas sin adoptar una fórmula por anticipado. No usar total, suma de precios de líneas ni el total consumido del cliente como reemplazo silencioso de cobrado.
2. Validar con pedidos sintéticos de una tienda de prueba autorizada: pago, pago parcial, ediciones al alza y a la baja, devoluciones parcial/total, cancelación antes/después de pago, reintento, historial ausente/incompleto y límites de lectura. Conciliar resultados esperados y descartar doble descuento; sin escrituras del runtime de PRAXA en la tienda. Las acciones externas de preparación quedan al usuario.
3. Fijar fórmula, universo elegible, período, moneda, zona, precisión y estados de disponibilidad en la futura spec auditada y aprobada. Monto ajustado no implica ingreso contable, ganancia ni LTV predictivo.
4. Conservar importes desconocidos como desconocidos; no reducir el universo ni convertir faltantes en cero sin declararlo. Acreditar completitud antes de clasificar por M. La evidencia sintética del motor no reemplaza validar el comportamiento de la API.
5. Hasta cumplir la validación, no activar la constante ni publicar importes. Cambiar su alcance global puede habilitar montos en chat y diagnóstico: queda prohibido como efecto lateral; cualquier activación global exige enmienda adicional y regresiones expresamente aprobadas.

Monetary verificable es condición de G-SEGMENTOS-AUDIENCIAS. Un resultado RF o una pantalla de indisponibilidad puede ser avance parcial, pero no cierra RFM ni su gate. Si no se logra una definición verificable con las fuentes y entornos autorizados, detenerse y pedir decisión; no dividir la funcionalidad ni sustituir la métrica.

## Calidad, privacidad y reproducibilidad

R/F/M y cohortes se calculan sobre entradas equivalentes, con fecha de corte, cobertura, zona, moneda y versión de reglas explícitas. No se suman monedas. Los umbrales y empates se decidirán en la spec; ninguna clasificación o recomendación tiene al LLM como autoridad. Sin datos de personas ni resultados de esta funcionalidad hacia modelos.

Se reutiliza customer.id opaco dentro del servidor. Una persona puede tener varios IDs: no se promete deduplicación de personas, no se incorporan email/teléfono ni uniones con visitantes GA4. Sin ID se informa exclusión. Diferenciar primera compra observada de primera compra histórica acreditada; períodos no cubiertos o aún no transcurridos no son cero. Las modificaciones del estado vigente pueden reclasificar cohortes: no se promete reconstrucción histórica inmutable.

La futura spec evaluará retención, recompra, importe por cohorte, ticket, valor observado acumulado y tiempo entre compras; solo habilitará las métricas cuya validez pueda acreditarse, con denominadores y observación explícitos. Matriz y evolución temporal forman parte de la misma pantalla. Mantener la regla vigente de cinco en cohortes; definir en spec protección para segmentos, intersecciones y deducción por totales. Solo agregados bajo RLS; no abrir tablas privadas a authenticated.

## Paralelismo con M16f

G-TIENDA es dependencia funcional; G-GA4-FUSION no lo es. M16f no cambia de alcance, estado ni gate. M27a puede recorrer el pipeline en paralelo cuando el usuario invoque sus pasos, con estas condiciones:
- Rama y checkout/worktree separados; no cambiar la rama del checkout donde otro integrante trabaja ni trasladar sus cambios.
- Módulo, pantalla y pruebas propios. Posponer modificaciones de archivos compartidos hasta coordinar su integración. Documentos transversales, shell de navegación, cliente worker y funciones de ciclo de vida son puntos de posible colisión; el plan de M16f es la fuente de su lista de archivos.
- No reservar 0032 ni otro número: comprobar el último número y las reservas de ambas ramas antes de crear cada migración nueva. Nunca editar migraciones existentes ni ensayar una secuencia que omita dependencias.
- No aplicar migraciones, reiniciar esquema ni correr suites con fixtures destructivos simultáneamente contra el mismo desechable. Coordinar uso exclusivo o un desechable distinto autorizado; sin él, esperar para esos controles, no usar app.
- Revalidar contratos, numeración y regresiones sobre la base integrada antes de revisión y gate. Una colisión no autoriza reescribir M16f ni ampliar M27a.

No se agrega una dependencia nueva a G-DEMO ni se cambia el cierre ya aprobado de M16e. Una inclusión obligatoria en la demo requeriría decisión explícita.

## Incorporación y autorización documental

La ficha de Parte I y II.14d de la ruta definen alcance, archivos y verificaciones. El contrato nuevo está en meta_first/spec.md §18. PROJECT_STATE solo registra paralelismo y gate pendiente; HALLAZGOS conserva la limitación monetaria. SECURITY, ARCHITECTURE y el acta se autorizan para la futura microfase, conforme al contrato documental; no se presentan controles como implementados.

## Evidencia de esta sesión

Inspección de git status --short (vacío al inicio), git branch --show-current (main), AGENTS.md, docs/PIPELINE.md, PROJECT_STATE, SECURITY, ARCHITECTURE, HALLAZGOS, ruta plan/spec, M16e/spec, M16f/plan, package.json, módulos Tiendanube y migraciones. Búsquedas con rg por IDs y contratos; consulta web oficial de solo lectura.
No se leyeron archivos de entorno, no se contactaron cuentas de la tienda, no se ejecutaron suites ni migraciones. No hay validación monetaria experimental en esta sesión. No hay spec/plan de M27a, código, commits, push ni despliegue.
Después de editar: git diff --check, revisión de diff y búsqueda de referencias de ID/gate. Son controles documentales, no aprobación de gate.

## Continuación oficial

Solo por invocación del usuario: /expand-microfase M27a. Luego grill si corresponde, auditoría y aprobación de spec; plan en su etapa oficial, auditoría y aprobación antes de /microfase. Esta enmienda no ejecuta ninguno de esos pasos.
