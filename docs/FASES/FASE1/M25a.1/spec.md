# M25a.1 — Chat: registro por consulta, redacción y herramientas

> **M25a.1 COMPLETA: BORRADOR ANTICIPADO — NO APROBADO — NO HABILITANTE**  
> **CORTE ANTICIPADO DETERMINÍSTICO: APROBADO PARA EJECUCIÓN LIMITADA**  
> Preparado por autorización expresa del usuario del 2026-11-01 y actualizado por la
> Enmienda M25a.1 aprobada el 2026-11-03. M16.2 fase B continúa siendo la siguiente
> microfase principal habilitada. M16c, G-VR01 y G-SYNC siguen pendientes.
> La revisión documental del 2026-11-03 incorpora la Enmienda M25a aprobada el 2026-11-01;
> la excepción posterior habilita solo el corte enumerado y no anticipa contratos de M16c.

**Estado:** M25a.1 completa en `BORRADOR`; corte anticipado determinístico `APROBADO PARA
EJECUCIÓN LIMITADA`

La implementación completa sigue el pipeline `BORRADOR` → `APROBADA`: solo el usuario puede
aprobarla después de una auditoría `APROBABLE`. La Enmienda M25a.1 crea una excepción
auto-contenida para el corte anticipado; no aprueba el resto de esta spec ni `G-CHAT-BASE`.

**ID:** `M25a.1` — hasta 8 horas de implementación. Es un límite de tamaño del corte, no una
estimación ni una asignación de tiempo al usuario.  
**Commit base inspeccionado:** `568e40214748ff1aad5cde3d00e16e88bbacf96b`  
**Referencia histórica no normativa:** `8a8ce89`  
**Dependencia de la ruta:** corte anticipado exceptuado por la Enmienda M25a.1 del
2026-11-03; implementación completa dependiente de `G-SYNC`  
**Gate de salida previsto:** `G-CHAT-BASE`  
**Sucesora prevista:** M25a.2

**Hash de contenido:** pendiente. Debe calcularse cuando se resuelvan las preguntas abiertas
y antes de la siguiente auditoría formal, sin la línea de estado:

```bash
grep -v '^\*\*Estado:\*\*' docs/FASES/FASE1/M25a.1/spec.md | git hash-object --stdin
```

## Fuentes

Jerarquía aplicada:

1. `AGENTS.md`, incluido su contrato de ejecución.
2. `docs/FASES/FASE1/meta_first/plan.md`, Parte I, ficha de M25a.1.
3. `docs/FASES/FASE1/meta_first/spec.md`, en especial CA-38c, CA-44b, CA-48,
   CA-49, CA-61 a CA-66, CA-69 y CA-70.
4. `docs/FASES/FASE1/meta_first/plan.md`, Partes II y III.
5. `docs/SECURITY.md` y `docs/ARCHITECTURE.md`.
6. Código existente.

Fuentes de estado y proceso:

- `docs/PROJECT_STATE.md`: M16.2 fase B es la siguiente habilitada; después siguen M16c,
  M25a.1, M25a.2 y M28.3a.
- `docs/PIPELINE.md` y `docs/_templates/mf-spec.md`: estructura y estados de esta spec.
- `docs/HALLAZGOS.md`: hallazgos canónicos relacionados.

Fuentes históricas no normativas:

- sesión histórica `docs/FASES/FASE1/meta_first/sesiones/M25a.1.md` del commit `8a8ce89`;
- implementación parcial de `8a8ce89`, solo para recuperación selectiva futura.

`docs/FASES/FASE1/meta_first/PROJECT_STATE.md` no existe. La fuente vigente de estado es
`docs/PROJECT_STATE.md`.

Etiquetas usadas en este documento:

- **CONFIRMADO:** exigencia cerrada por una fuente normativa vigente.
- **PENDIENTE DE M16c:** detalle que solo puede fijarse después de M16c y G-SYNC.
- **PENDIENTE DE DECISIÓN:** detalle que la ruta deja para la spec o el plan de la microfase.

La implementación de `8a8ce89` no prueba cumplimiento ni aprobación.

## Objetivo

**CONFIRMADO, tomado de la ficha de la Parte I:** tener todo lo determinístico del chat antes
de conectar el modelo.

M25a.1 debe dejar preparados la redacción, el catálogo y la ejecución determinista de
herramientas, el registro por consulta, el feedback y los límites que finalmente le asigne la
ruta. Las cifras autoritativas provienen de SQL y nunca del LLM.

## Alcance

### Alcance confirmado por la ruta

1. Migración nueva `0017_chat_queries.sql` con el registro por consulta.
2. Redacción CA-66 mediante una única función determinística.
3. Catálogo cerrado de `coverage`, `daily_series`, `total` y `connection_status`.
4. Resolución de tenant y conexión en servidor; herramientas con JWT del usuario y RLS.
5. Cálculos métricos en SQL y transporte de `spend` e `impressions` como texto.
6. `worker_api.record_query` conforme CA-38c.
7. `worker_api.set_feedback` conforme CA-69.
8. Extensión de `worker_api.purge_connection` para borrar los registros vinculados al
   desconectar.
9. pgTAP `14_chat_queries.test.sql` y extensión de `10_demo_closure.test.sql`.
10. Pruebas unitarias, `test:policies` y `test:app`; pruebas primero.
11. Aislamiento entre empresas y mínimo privilegio.
12. Configuración compartida de CA-70 y máximo de período aplicado en servidor y SQL.
13. Cliente y repository `server-only` para registro y voto por `worker_api`, con firmas y
    casts definidos solo después de M16c.

### Distribución aprobada con M25a.2

La Enmienda M25a del 2026-11-01 resolvió la atribución que este borrador presentaba como
contradictoria:

- M25a.1 acredita configuración compartida y límite de período; M25a.2 acredita llamadas,
  tokens, concurrencia y duración total;
- M25a.1 acredita no persistencia y retención; M25a.2 acredita conversación visible y aviso;
- M25a.1 acredita persistencia y función de voto; M25a.2 acredita Server Action y botones;
- M25a.1 produce evidencia y prueba aislamiento directo; M25a.2 presenta esa evidencia y
  prueba preguntas directas e instrucciones inyectadas en el recorrido completo; y
- el `db:push` de `0017` es una acción operativa posterior al PR, reservada al usuario, no una
  prueba de `G-CHAT-BASE`.

## Fuera de alcance

Esta microfase no autoriza:

- DeepInfra, secretos, selección de modelo o llamadas al proveedor;
- orquestación LLM, salida `text` + `claims` o cambios de comportamiento en la guarda de
  cifras; solo se permite la reorganización mecánica aprobada;
- G-VR02;
- explicación de causas, rentabilidad, pronósticos o métricas derivadas;
- escritura sobre Meta u otro sistema externo;
- historial persistente visible, búsqueda o memoria entre sesiones;
- persistir respuestas, resultados de herramientas, argumentos identificatorios,
  credenciales o la pregunta original;
- cambiar tablas, funciones, firmas o DTOs que pertenecen a M16c;
- modificar migraciones existentes;
- crear el plan completo de M25a.1 o iniciar M25a.2; el plan limitado del corte está
  expresamente autorizado;
- aprobar G-VR01, G-SYNC o G-CHAT-BASE.

La conversación visible, el aviso, la acción y los botones de feedback, la presentación, el
aislamiento ante instrucciones inyectadas y los cuatro límites restantes son responsabilidad
confirmada de M25a.2.

## Contexto verificado en el código

| Qué | Dónde (archivo:línea) | Qué implica para esta microfase |
|---|---|---|
| K01 se construye solo en servidor y sin argumentos del cliente | `src/modules/tenant/context.ts:12`, `:37` | M25a.1 debe reutilizar `requireTenantContext()`; no crea otro origen de tenant |
| El contexto K01 tiene schema estricto | `src/modules/tenant/context.ts:21` | Los consumidores validan el contexto existente, no aceptan `company_id` del cliente |
| App-data ya lee el estado real de la conexión mediante el repositorio | `src/modules/app-data/index.ts:8`, `:89` | `connection_status` debe alinearse con el ciclo de vida vigente; su DTO todavía no está aprobado |
| `src/modules/chat/` no existe en el commit base, pero hay archivos candidatos sin seguimiento en el árbol de trabajo | `main@568e402`; inventario local del 2026-11-03 | Su existencia no acredita implementación ni autoriza integrarlos antes de aprobar spec y plan |
| Hay una UI de chat sin este backend | `src/app/(app)/app/chat/page.tsx:1`, `src/components/app/chat.tsx:1` | La UI existente no acredita CA de registro, redacción o herramientas |
| Redacción, límites y herramientas parciales existen solo como referencia | `8a8ce89:src/modules/chat/` | Se recuperan archivo por archivo, después de aprobar contratos; nunca se recupera la rama completa |
| No existen registro ni feedback de M25a.1 | `main@568e402`, migraciones hasta `0015` | Deben nacer en `0017`, después de M16c/`0016` |
| pgTAP llega hasta el número `12` | `main@568e402:supabase/tests/` | M16c reserva `13`; M25a.1 reserva `14_chat_queries.test.sql` |
| `purge_connection` es anterior a M16c | migración vigente previa a `0016` | `0017` debe reemplazar la versión exacta que entregue M16c, no copiar una histórica |

Las ejecuciones registradas en la sesión de `8a8ce89` son evidencia histórica. No acreditan
la implementación futura ni permiten declarar tests actuales en verde.

## Diseño concreto

### 1. Dependencias y condición de entrada

La implementación completa de M25a.1 solo puede pasar a planificación cuando:

1. M16.2 fase B esté cerrada y G-VR01 aprobado;
2. M16c esté cerrada con `0016` y pgTAP `13`;
3. G-SYNC esté aprobado con evidencia reproducible;
4. esta spec incorpore los contratos finales que hoy están marcados `PENDIENTE DE M16c`;
5. las preguntas normativas restantes estén resueltas; y
6. esta spec sea auditada como `APROBABLE` y luego aprobada expresamente por el usuario.

La existencia de código parcial no satisface ninguna de estas condiciones.

**Excepción aprobada para el corte anticipado:** antes de `G-SYNC` pueden planificarse y
ejecutarse exclusivamente:

1. redacción CA-66 hasta 500 puntos de código, con redacción anterior a validación y rechazo
   explícito del exceso, y sus pruebas unitarias;
2. configuración compartida de los valores aprobados de CA-70 y validación TypeScript del
   período máximo de 93 días;
3. catálogo y schemas estrictos de las cuatro herramientas, sin DTOs de resultado; y
4. reorganización mecánica de la propiedad del schema candidato de evidencia y separación
   de pruebas, sin cambiar ni aprobar su forma final.

La excepción excluye SQL, migraciones, pgTAP, repository, `worker_api`, ejecutor real,
contratos de M16c, pruebas de aplicación, `purge_connection`, CA-38c y cualquier tarea que
requiera `G-SYNC`. No produce un gate ni habilita M25a.2.

### 2. Fronteras de autoridad y aislamiento

**CONFIRMADO:**

1. El navegador no aporta un `company_id` autoritativo.
2. La acción o endpoint obtiene identidad verificada y construye K01 en servidor.
3. La empresa se deriva de la membresía; la conexión se resuelve dentro de esa empresa.
4. Las herramientas leen por el camino interactivo con JWT, `GRANT` y RLS.
5. El registro y el voto escriben por el camino privilegiado acotado a `worker_api`.
6. El rol `praxa_integrations` no recibe privilegios directos sobre tablas.
7. Las funciones de `worker_api` son `SECURITY DEFINER` en un esquema no expuesto, con
   `search_path` vacío, nombres calificados, revocación explícita y validación de actor y
   empresa.
8. `anon` y `authenticated` no leen ni escriben directamente `chat_query_records`.
9. Actor, empresa, conexión, permisos, cifras y estados nunca los decide el LLM.
10. Pregunta original, respuesta y resultados de herramientas no se escriben en logs ni en
    el registro.

La matriz exacta de grants pertenece a `0017` y a pgTAP `14`, no a esta prosa.

### 3. Redacción CA-66

Una única función determinística redacta antes de persistir y antes de enviar al modelo. El
texto original no se persiste en ningún lado.

Patrones literales confirmados:

- email → `[EMAIL]`;
- teléfono en formato internacional → `[TELEFONO]`;
- CUIT/CUIL **con guiones** → `[CUIT]`;
- número de tarjeta que pasa Luhn → `[TARJETA]`;
- CBU/CVU de 22 dígitos → `[CBU]`;
- URL → `[URL]`;
- cadena larga con forma de token o clave → `[SECRETO]`;
- identificador `act_` → truncado para no exponer el identificador completo junto a datos.

Se conservan montos y fechas. No se detectan un DNI suelto, nombres, direcciones ni otros
datos personales libres. La UI debe advertir ese límite según CA-65, sujeto a la atribución de
M25a.2.

Propiedades confirmadas por CA-66:

- determinismo;
- idempotencia;
- cada patrón se prueba con datos sintéticos;
- montos con separador de miles no se redactan; y
- tarjetas que fallan Luhn no se redactan.

La longitud es configurable. La ruta propuso `500` caracteres como valor inicial y
`D-M25a.1-05` lo confirma. La pureza de la función, el orden de patrones y el tratamiento
interno de solapamientos son decisiones técnicas que deberán fijarse en el plan sin ampliar
los patrones normativos.

**Decisión aprobada `D-M25a.1-05`:** el máximo de la pregunta redactada es `500` puntos de
código. La función redacta primero y valida la longitud después; si el resultado supera el
máximo, lo rechaza de forma explícita y no lo trunca silenciosamente.

La política visible que relaciona el máximo redactado con el límite de entrada candidato de
la UI es propiedad documental de `docs/FASES/FASE1/M25a.2/spec.md`, mediante
`D-M25a.2-10`. M25a.1 conserva únicamente la decisión sobre el máximo redactado
(`D-M25a.1-05`) y no duplica la política de presentación.

### 4. Catálogo y argumentos de herramientas

El catálogo cerrado contiene exactamente:

| Herramienta | Argumentos normativos | Responsabilidad normativa | Pendiente |
|---|---|---|---|
| `connection_status()` | Ninguno | Estado de la conexión resuelta por el servidor | DTO público y traducción de estados internos |
| `coverage(period)` | `period` | Cobertura del período | Nombre, firma y DTO de la lectura final de M16c |
| `daily_series(metric, period)` | `metric`, `period` | Serie diaria | Contrato de lectura final de M16c |
| `total(metric, period)` | `metric`, `period` | Total calculado en SQL | Contrato de lectura y semántica final de agregación parcial de M16c |

`metric` admite solo `spend` o `impressions`. Los schemas rechazan nombres y propiedades
fuera del catálogo. Ninguna herramienta acepta SQL, tablas, `company_id`, conexión o cuenta
autoritativa como argumento.

No se define todavía que `connection_status` se abstenga, lance error o traduzca estados de
una forma particular. Esas conductas pertenecen al DTO pendiente; solo están cerrados su
nombre, ausencia de argumentos y resolución server-side.

### 5. Resultados y precisión

Los tipos reutilizan `periodSchema`, el patrón `knownOr` y la distinción de procedencia
`system_fact`, `calculated_metric` e `inference`. No reutilizan
`calculatedMetricEvidenceSchema` si obliga a usar `number`.

Cada valor devuelto por las herramientas métricas debe incluir, conforme al paso 6 de II.12:

- identificador de referencia;
- métrica;
- unidad;
- moneda cuando corresponde;
- cuenta;
- período;
- presencia;
- estado temporal;
- captura parcial; y
- `fetched_at`.

La cobertura por día conserva además procedencia y frescura según CA-46. Si una respuesta
usa días de extracciones distintas, M25a.1 entrega los datos necesarios y M25a.2 presenta el
rango de `fetched_at`.

Campos adicionales, nombres concretos, discriminantes y DTOs son **PENDIENTES DE M16c**. Una
conexión no sustituye al campo normativo de cuenta.

`spend` se calcula/guarda como `numeric` y sale de SQL como texto decimal. `impressions` se
calcula/guarda como `bigint` y sale como texto entero. Ninguno pasa por `number`. Una prueba
punta a punta SQL → API → TypeScript usa valores que `number` no puede representar con
exactitud y exige igualdad textual exacta.

### 6. CA-38c: escrituras en vuelo

`record_query` verifica, dentro de la misma transacción en la que intentaría escribir, que la
conexión:

1. exista;
2. siga `active`; y
3. conserve la generación con la que comenzó la operación.

Si cualquiera falla, **la escritura se descarta: no se inserta ninguna fila**. No se
transforma en un registro con conexión nula, no se reasocia y no puede reinsertar datos
después de la purga. La forma en que la función informa el descarte al llamador queda
pendiente; el efecto observable obligatorio es cero filas nuevas.

Pruebas separadas deben cubrir:

- desconexión entre el inicio y `record_query`; y
- cambio de generación entre el inicio y `record_query`.

Ambas afirman que no existe el registro intentado.

Este caso no se confunde con una consulta que **empieza sin conexión**, descrita en la sección
siguiente.

### 7. Registro por consulta

`chat_query_records` contiene, según la ruta:

- `company_id`, en cascada desde la empresa;
- `connection_id`, nulo si la consulta empezó sin conexión;
- `question_redacted`, con el máximo que finalmente se apruebe;
- `tool_names text[]`, sin resultados ni argumentos con identificadores;
- `outcome`;
- `reason`;
- `latency_ms`;
- `requested_model_id`;
- `reported_model_id`, nulo si el proveedor no respondió;
- `feedback`, inicialmente nulo o luego `useful` / `not_useful`; y
- `created_at`.

Outcomes cerrados:

- `answered`;
- `answered_partial_coverage`;
- `not_answered`.

Reasons cerradas:

- `out_of_scope`;
- `no_coverage`;
- `connection_not_active`;
- `guard_rejected`;
- `model_unavailable`;
- `tool_error`.

Relación normativa aprobada por `D-M25a.1-07`: `reason` es obligatoria si y solo si
`outcome = not_answered` y pertenece a esa lista cerrada. Para `answered` y
`answered_partial_coverage`, `reason` es obligatoriamente SQL `NULL`. Ninguna otra
combinación valida. Su implementación SQL y pgTAP queda fuera del corte anticipado.

Si una consulta **empieza sin conexión**, se registra con:

- `connection_id = null`;
- `outcome = not_answered`; y
- `reason = connection_not_active`.

Ese registro no queda vinculado a una conexión que pueda purgarlo; se elimina al borrar la
empresa por CA-67. En cambio, si la consulta empezó con conexión y esta se desconectó o cambió
de generación antes de escribir, aplica CA-38c y no se inserta fila.

No se guardan respuesta, conversación, cifras/resultados de herramientas, credenciales,
argumentos identificatorios ni la pregunta original. Cada reintento genera un registro
separado, salvo el descarte obligatorio de CA-38c.

`worker_api.record_query` implementa estas reglas. Su firma, tipos de parámetros, retorno y
códigos de error no se fijan hasta revisar los patrones finales de `0016`.

### 8. Feedback

La columna `feedback` es nullable porque queda `null` mientras el dueño no marca nada. Los
únicos votos que `set_feedback` puede recibir son:

- `useful`;
- `not_useful`.

No se acepta texto libre ni `null` como operación para borrar un voto. Si el dueño marca más
de una vez, queda el último voto válido.

La Server Action construye K01 y llama a `worker_api.set_feedback` con el identificador opaco
del registro. La función verifica que el registro pertenezca a la empresa y solo modifica el
feedback. La firma, tipo del identificador, retorno y errores quedan pendientes; no se copian
de la implementación histórica.

Los botones visibles en cada respuesta, incluidas las abstenciones, están exigidos por CA-69,
pero pertenecen a M25a.2. M25a.1 entrega la columna, la función y el repository que esa acción
consumirá.

### 9. Retención, desconexión y `purge_connection`

La política está cerrada:

1. Los registros no tienen plazo propio.
2. Al desconectar, `purge_connection` borra los registros vinculados a esa conexión antes de
   borrar la fila de conexión.
3. Desvincularlos mediante `connection_id = null` no es una alternativa permitida por la ruta.
4. Los registros creados originalmente sin conexión se borran por la cascada de empresa en
   CA-67.
5. Borrar la cuenta/empresa arrastra todos los registros.

`0017` usa `CREATE OR REPLACE` sobre la definición exacta de `purge_connection` que entregue
`0016`. No copia la versión de `main` ni una versión histórica.

### 10. Límites CA-70

CA-70 define valores iniciales configurables, confirmados por `D-M25a.1-06`:

| Límite propuesto por la ruta | Valor inicial | Ubicación mínima normativa |
|---|---:|---|
| Período consultable | 93 días | Servidor y funciones SQL llamadas por la API |
| Llamadas a herramientas por turno | 4 | Servidor |
| Tokens de salida por llamada al modelo | 800 | Servidor/adaptador del modelo |
| Turnos en curso por usuario | 1 | Servidor |
| Duración total del turno | 60 s | Servidor, por debajo del máximo de Vercel |

La Enmienda M25a aprobó esta distribución:

- M25a.1: configuración compartida, validación del período y enforcement de su máximo en
  TypeScript y SQL;
- M25a.2: enforcement de llamadas, tokens, concurrencia y duración en el adaptador,
  orquestador y Server Action; y
- cada gate acredita únicamente los límites implementados por su microfase.

`D-M25a.1-06` confirma los cinco valores: `93` días, `4` llamadas a herramientas por turno,
`800` tokens de salida por cada llamada al modelo, `1` turno concurrente por usuario y `60`
segundos de deadline total por turno. La distribución de enforcement entre M25a.1 y M25a.2
no cambia. La aprobación proviene de la decisión documental, no de su presencia previa en el
código candidato.

### 11. Distribución aprobada entre M25a.1 y M25a.2

| Requisito | M25a.1 (`G-CHAT-BASE`) | M25a.2 (`G-VR02`) |
|---|---|---|
| CA-70 | Configuración y período en servidor y SQL | Llamadas, tokens, concurrencia y duración total |
| CA-61 | Ausencia de conversación persistente | Conversación visible de sesión |
| CA-65 | Retención y borrado | Aviso visible de registro y finalidad |
| CA-69 | Columna, `set_feedback` y repository | Server Action y botones; último voto válido |
| CA-51/51b | Resultados con evidencia suficiente | Presentación de período, cobertura, parciales y frescura |
| CA-54 | Aislamiento directo de herramientas y persistencia | Preguntas directas e instrucciones inyectadas end-to-end |

M25a.2 consume las piezas persistentes de M25a.1; no las duplica ni reabre su gate.

### 12. Migración y pgTAP

Numeración confirmada:

- M16c: `0016_meta_insights.sql` y pgTAP `13_meta_insights.test.sql`;
- M25a.1: `0017_chat_queries.sql` y pgTAP `14_chat_queries.test.sql`.

`0017` debe:

1. crear `chat_query_records` con los campos e invariantes de esta spec;
2. referenciar empresa en cascada y permitir conexión nula solo conforme al contrato;
3. habilitar y forzar RLS;
4. ejecutar `REVOKE ALL` y no conceder acceso directo a `anon` o `authenticated`;
5. crear `worker_api.record_query`;
6. crear `worker_api.set_feedback`;
7. reemplazar `worker_api.purge_connection` preservando todo lo que entregue `0016`; y
8. aplicar los patrones finales de mínimo privilegio, bloqueo y errores de M16c.

II.12 ya refiere a los contratos finales de M16c/`0016`. Sus firmas y DTOs siguen pendientes
de esa microfase y no se anticipan aquí.

pgTAP `14` prueba tabla, constraints, RLS, privilegios, aislamiento, CA-38c, feedback y purga.
`10_demo_closure.test.sql` se extiende para cubrir registros vinculados y sin conexión.

## Archivos previstos

Esta tabla autoriza anticipadamente solo los archivos marcados como parte del corte. Los
demás permanecen bloqueados hasta `G-SYNC` y la aprobación de la implementación completa.

| Archivo | Nuevo o modificado | Para qué | Autorizado por |
|---|---|---|---|
| `docs/FASES/FASE1/M25a.1/spec.md` | Nuevo | Este borrador anticipado | Autorización expresa del usuario, 2026-11-01 |
| `supabase/migrations/0017_chat_queries.sql` | Nuevo | Registro, funciones y extensión de purga | II.12 paso 1; bloqueado por M16c |
| `supabase/tests/14_chat_queries.test.sql` | Nuevo | pgTAP de registro, privilegios y aislamiento | II.12 paso 2 |
| `supabase/tests/10_demo_closure.test.sql` | Modificado | Cierre con registros de chat | II.12 paso 2 |
| `tests/unit/chat-redaction.test.ts` | Nuevo | Casos CA-66 | II.12 paso 3 |
| `src/modules/chat/redaction.ts` | Nuevo | Función única de redacción | II.12 paso 4 |
| `src/modules/chat/tools/schema.ts` | Nuevo | Catálogo y argumentos cerrados | II.12 paso 5 |
| `src/modules/chat/tools/execute.ts` | Nuevo | Ejecución con JWT/RLS | II.12 paso 6; bloqueado por M16c |
| `src/modules/chat/tools/results.ts` | Nuevo/compartido | Corte: propiedad mecánica del schema candidato de evidencia sin cambiar su forma; contrato final de resultados después de M16c | II.12 pasos 5b y 7 |
| `src/modules/chat/guard.ts` | Modificado/compartido con M25a.2 | Consumir el schema candidato desde la base determinística, sin cambiar la guarda | II.12 paso 5b; solo reorganización anticipada |
| `tests/unit/chat-tools.test.ts` | Nuevo | Unit tests de herramientas | II.12 paso 8 |
| `tests/unit/chat-adversarial.test.ts` | Modificado/compartido con M25a.2 | Retirar los casos de adaptación que pasan a la suite de herramientas, sin cambiar cobertura | II.12 paso 5b; solo separación anticipada |
| `tests/app/chat-tools.test.ts` | Nuevo | Lectura real, precisión y aislamiento | II.12 paso 8; bloqueado por M16c |
| `src/modules/integrations/db/worker-api.ts` | Modificado | Allowlist, SQL fijo, casts y aridad de `record_query`/`set_feedback` | II.12 paso 1a; firmas pendientes de M16c y de esta spec |
| `src/modules/chat/repository.ts` | Nuevo | Repository `server-only` de registro y voto; valida K01, entradas y respuestas | II.12 paso 1a |
| `tests/unit/chat-worker-api.test.ts` | Nuevo | Allowlist, SQL, casts, aridad y argumentos inválidos | II.12 paso 1a |
| `tests/unit/chat-repository.test.ts` | Nuevo | Repository con doble del cliente | II.12 pasos 1a y 8 |
| `tests/app/chat-worker-api.test.ts` | Nuevo | Rol real, otra empresa, feedback y CA-38c | II.12 pasos 1a y 8; bloqueado por M16c |
| `src/modules/chat/limits.ts` | Nuevo | Configuración compartida; M25a.1 aplica solo el período | II.12 paso 5a |
| `tests/unit/chat-limits.test.ts` | Nuevo | Configuración y período de M25a.1 | II.12 paso 5a |
| `docs/ARCHITECTURE.md` | Modificado al cierre del corte | Marcar `chat` como parcial y separar primitivas existentes de integración prevista, solo después de implementar | D-M25a.1-08 y Enmienda M25a.1 del 2026-11-03 |
| `docs/SECURITY.md` | Excluido | El corte no cambia amenazas, fronteras, invariantes ni controles vigentes | D-M25a.1-08 |
| `docs/FASES/FASE1/M25a.1/plan.md` | Nuevo | Plan exclusivo del corte anticipado | Enmienda M25a.1 del 2026-11-03 |
| `docs/FASES/FASE1/M25a.1/revisiones/*.md` y sesión de evidencia | Nuevos en el flujo futuro | Auditoría y evidencia | Artefactos del pipeline; no se crean en este encargo |

Los archivos de UI de II.13 pertenecen a M25a.2 y no se agregan a esta tabla. El plan creado
para el corte anticipado no autoriza ni planifica el resto de M25a.1.

## Criterios de aceptación

### Heredados de la ruta

| ID de la ruta | Qué exige (resumen fiel) |
|---|---|
| CA-38c | `record_query` verifica conexión existente, `active` y misma generación en la transacción; si falla, descarta la escritura |
| CA-44b | `spend` e `impressions` salen de SQL como texto y nunca pasan por `number`; precisión punta a punta |
| CA-48 | Catálogo cerrado de cobertura, serie diaria, total y estado de conexión |
| CA-49 | Tenant/conexión se resuelven en servidor; herramientas con JWT y RLS |
| DEC-10 / CA-61 | M25a.1 no persiste conversación; el comportamiento visible pertenece a M25a.2 |
| CA-62 | Un registro por consulta con campos, outcomes, reasons y retención definidos |
| CA-63 | La pregunta nunca aparece en logs de aplicación o hosting |
| CA-64 | Escritura por `worker_api`; sin lectura para `authenticated`; acceso administrativo declarado en M03a |
| CA-65 | M25a.1 implementa retención y borrado; el aviso visible pertenece a M25a.2 |
| CA-66 | Redacción literal, determinística e idempotente antes de persistir y enviar al modelo |
| CA-69 | M25a.1 persiste el voto binario mediante `worker_api.set_feedback`; acción y botones pertenecen a M25a.2 |
| CA-70 | Configuración compartida y límite de período en servidor y SQL; valores confirmados por D-M25a.1-06 |
| DEC-10/11/13 | Sin historial persistente; misma redacción para registro/modelo; feedback binario |

La conversación visible, el aviso, la acción y botones, la presentación, prompt injection y
los cuatro límites restantes se verifican en M25a.2.

### Operativos de esta microfase

| ID | Criterio verificable | Traza a |
|---|---|---|
| M25a.1-C01 | La redacción reemplaza exactamente los ocho patrones normativos, conserva montos/fechas, es idempotente y respeta el máximo aprobado | CA-66 |
| M25a.1-C02 | La pregunta original no se persiste ni aparece en logs; solo `question_redacted` llega al registro | CA-63, CA-66 |
| M25a.1-C03 | El schema acepta exactamente cuatro herramientas; `connection_status()` no recibe argumentos y las métricas solo aceptan `spend`/`impressions` | CA-48 |
| M25a.1-C04 | Ningún argumento permite elegir empresa, conexión, cuenta, tabla o SQL; K01 resuelve tenant y la lectura usa JWT/RLS | CA-49 |
| M25a.1-C05 | Cada resultado métrico contiene referencia, métrica, unidad, moneda aplicable, cuenta, período, presencia, estado temporal, captura parcial y `fetched_at` | II.12 paso 6; pendiente de M16c |
| M25a.1-C06 | Valores que `number` no representa exactamente conservan su texto en SQL → API → TypeScript | CA-44b |
| M25a.1-C07 | `not_answered` siempre lleva una reason del catálogo cerrado; `answered` y `answered_partial_coverage` exigen `reason = NULL`; ninguna otra combinación valida | CA-62; D-M25a.1-07 |
| M25a.1-C08 | Una consulta iniciada sin conexión se registra con conexión nula, `not_answered` y `connection_not_active` | CA-62 |
| M25a.1-C09 | Ante desconexión en vuelo, `record_query` inserta cero filas | CA-38c |
| M25a.1-C10 | Ante cambio de generación en vuelo, `record_query` inserta cero filas | CA-38c |
| M25a.1-C11 | Tabla y funciones no son accesibles por `anon`, `authenticated` o roles no autorizados; `praxa_integrations` solo ejecuta funciones concedidas | CA-64, arquitectura de `worker_api` |
| M25a.1-C12 | `set_feedback` solo acepta `useful`/`not_useful`, modifica un registro de la empresa y conserva el último voto; `null` no es una operación | CA-69 |
| M25a.1-C13 | Desconectar borra registros vinculados; el cierre de empresa borra también registros nacidos sin conexión | CA-38, CA-65, CA-67 |
| M25a.1-C14 | Dos empresas sintéticas no pueden leer, ejecutar herramientas sobre, registrar ni votar objetos de la otra | CA-49, CA-54 en su porción directa |
| M25a.1-C15 | El operador puede consultar el registro solo por el dashboard administrativo y M03a ya declara acceso/finalidad | CA-64 |
| M25a.1-C19 | La configuración compartida usa los valores aprobados; el corte anticipado rechaza el exceso de período en el schema y el cierre completo lo rechaza además en ejecución y por llamada SQL directa | CA-70, II.12 paso 5a |
| M25a.1-C20 | `npm run verify`, `npm run test:policies` y `npm run test:app` terminan en verde sin omitir casos obligatorios | Ficha, III.3, CB-05/06 |
| M25a.1-C21 | G-SYNC estaba aprobado antes de implementar cualquier parte no incluida en el corte anticipado y G-CHAT-BASE recibe aprobación expresa solo después de la evidencia completa | Gates de la ruta; Enmienda M25a.1 |
| M25a.1-C22 | El corte anticipado queda limitado a redacción, configuración/validación TypeScript, schemas de entrada y reorganización mecánica; sus unitarias dirigidas y `npm run verify` pasan sin acreditar integración | Enmienda M25a.1; plan del corte |

## Casos de prueba

Ninguna prueba de esta tabla fue ejecutada en este encargo.

| ID | Criterios | Tipo | Comando | Resultado esperado | ¿Falla sin la implementación? |
|---|---|---|---|---|---|
| M25a.1-T01 | C01 | unit | `npm run test:unit` | Cada patrón literal produce su marcador | Sí |
| M25a.1-T02 | C01 | unit | `npm run test:unit` | Montos/fechas y tarjetas que fallan Luhn se conservan | Sí |
| M25a.1-T03 | C01 | unit | `npm run test:unit` | Dos aplicaciones producen el mismo resultado; máximo aprobado respetado | Sí |
| M25a.1-T04 | C02 | unit/revisión | `npm run verify` | Ningún camino persiste o registra la pregunta original | Sí |
| M25a.1-T05 | C03/C04 | unit | `npm run test:unit` | Solo cuatro herramientas y argumentos exactos validan; extras, SQL, tabla, tenant/conexión/cuenta fallan | Sí |
| M25a.1-T06 | C05 | unit | `npm run test:unit` | Resultados sin un campo normativo o con números JS fallan Zod | Sí |
| M25a.1-T07 | C06 | app | `npm run test:app` | Decimal/entero no representables por `number` conservan texto exacto SQL → API → TS | Sí |
| M25a.1-T08 | C05/C14 | app | `npm run test:app` | Cobertura conserva `con_datos`, `sin_fila_reportada` y `no_observado`; otro tenant no lee | Sí |
| M25a.1-T09 | C05 | app | `npm run test:app` | Serie conserva huecos, estado temporal, captura parcial y `fetched_at` | Sí |
| M25a.1-T10 | C05/C06 | app | `npm run test:app` | Total completo/parcial se calcula en SQL, sale como texto y no convierte ausencia en cero | Sí |
| M25a.1-T11 | C07 | pgTAP | `npm run test:policies` | Outcomes/reasons fuera del catálogo fallan; `not_answered` sin reason y outcomes respondidos con reason fallan | Sí |
| M25a.1-T12 | C08 | pgTAP | `npm run test:policies` | Sin conexión crea exactamente el registro nulo cerrado | Sí |
| M25a.1-T13 | C09 | pgTAP | `npm run test:policies` | Desconexión en vuelo deja cero filas nuevas | Sí |
| M25a.1-T14 | C10 | pgTAP | `npm run test:policies` | Cambio de generación en vuelo deja cero filas nuevas | Sí |
| M25a.1-T15 | C11/C14 | pgTAP | `npm run test:policies` | Grants, RLS y funciones impiden acceso/ejecución cruzada | Sí |
| M25a.1-T16 | C12/C14 | pgTAP | `npm run test:policies` | Solo votos binarios propios; último valor gana; texto, `null` enviado y registro ajeno fallan | Sí |
| M25a.1-T17 | C13 | pgTAP | `npm run test:policies` | Purga elimina registros vinculados sin dejar huérfanos | Sí |
| M25a.1-T18 | C13 | pgTAP | `npm run test:policies` | Cierre de empresa elimina registros con y sin conexión | Sí |
| M25a.1-T19 | C19 | unit/pgTAP | `npm run test:unit`; `npm run test:policies` | Período sobre el máximo confirmado falla en TS y por llamada SQL directa | Sí |
| M25a.1-T20 | C15 | revisión/manual | N/A, revisión del acta M03a | Acceso y finalidad ya están declarados, sin ampliar datos | No |
| M25a.1-T23 | C20 | repositorio | `npm run verify` | Lint, typegen, tipos, unit/component y build en verde | Depende del árbol completo |

El plan aprobado del corte mapea sus casos unitarios a archivos exactos. El plan completo
futuro deberá mapear los casos bloqueados a fixtures sintéticos y archivos finales. Los casos
visibles y de modelo se especifican y prueban en M25a.2.

## Verificación

Comandos obligatorios para el corte anticipado:

```text
npm run test:unit -- tests/unit/chat-redaction.test.ts tests/unit/chat-limits.test.ts tests/unit/chat-tools.test.ts tests/unit/chat-guard.test.ts tests/unit/chat-adversarial.test.ts
npm run verify
git diff --check
```

El cierre completo, después de `G-SYNC`, agrega:

```text
npm run test:policies
npm run test:app
```

`npm run verify` ya incluye las suites unitarias y de componentes. Una prueba requerida
omitida por falta de configuración cuenta como no ejecutada y no acredita el gate (CB-06).

La evidencia del corte anticipado registra:

1. commit y base exactos;
2. hash de la spec y del plan limitado;
3. comandos, resultados, conteos y omisiones reales;
4. archivos modificados y confirmación de que ninguno pertenece al alcance excluido;
5. limitaciones y ausencia de integración; y
6. que no se solicitó ni aprobó `G-CHAT-BASE`.

La evidencia futura del cierre completo debe registrar:

1. commit y base exactos;
2. hash aprobado de spec y plan;
3. G-SYNC aprobado antes de implementar el alcance bloqueado;
4. `0016` aplicada antes de `0017` en el proyecto de pruebas;
5. comandos, resultados, conteos y omisiones reales;
6. evidencia de precisión SQL → API → TypeScript;
7. pgTAP de privilegios, aislamiento, CA-38c, feedback y purga;
8. pruebas de dos empresas, desconexión y cambio de generación;
9. control de filtración sin preguntas, secretos, montos reales ni IDs completos;
10. archivos modificados, hallazgos y limitaciones; y
11. aprobación expresa de G-CHAT-BASE.

No se acredita ninguna prueba por existir un archivo o por una ejecución histórica de
`8a8ce89`.

## Intervenciones del usuario y acciones reservadas

| Paso | Qué hace el usuario | Cómo se verifica después |
|---|---|---|
| Aprobación de spec | Solo después de una auditoría `APROBABLE`, usa la frase del pipeline | El estado cambia por pedido explícito; no ocurre en este encargo |
| Después del PR futuro | Parte II reserva al usuario el `db:push` de `0017` al proyecto `app` | Acción posterior verificada, sin ejecutar suites contra producción |

La Enmienda M25a clasifica el `db:push` como acción operativa posterior al PR. No forma parte
de las pruebas de `G-CHAT-BASE`, pero debe verificarse antes de implementar M25a.2.

DeepInfra y su clave pertenecen a M25a.2. No se solicitan en M25a.1.

## Trampas y riesgos

1. Aceptar `company_id`, conexión, cuenta, SQL o tabla desde cliente/modelo.
2. Ejecutar lecturas métricas con el rol privilegiado en lugar de JWT/RLS.
3. Calcular cifras autoritativas en TypeScript o permitir su paso por `number`.
4. Guardar o registrar la pregunta antes de redactarla.
5. Convertir un descarte CA-38c en un registro con conexión nula.
6. Permitir `null` como voto para deshacer feedback sin respaldo normativo.
7. Desvincular registros durante la purga en vez de borrarlos.
8. Convertir día ausente en gasto cero.
9. Presentar cobertura parcial como total completo.
10. Copiar `purge_connection`, firmas, DTOs o errores de una versión anterior a `0016`.
11. Recuperar íntegramente `feat/chatm25a1` o tratar `8a8ce89` como aprobado.
12. Declarar tests aprobados por una corrida histórica o por la existencia de código.
13. Incluir conversación visible, aviso, botones, presentación, prompt injection o los cuatro
    límites de M25a.2 dentro de `G-CHAT-BASE`.

## Pendientes técnicos de integración

Esta spec es el documento dueño de `PT-M25a-01` a `PT-M25a-07`. M25a.2 debe referenciar
estos pendientes y consumir su resolución, sin mantener copias paralelas.

### Resolubles dentro de M25a

| ID | Pendiente | Resolución que debe fijar la spec o el plan |
|---|---|---|
| PT-M25a-01 | `src/modules/chat/tools/results.ts` (M25a.1) depende hoy del schema de evidencia ubicado en `guard.ts` (M25a.2) | El contrato de evidencia debe quedar del lado determinístico de M25a.1 y ser consumido por la guarda; no se cambia su forma antes de conocer M16c |
| PT-M25a-02 | `tests/unit/chat-adversarial.test.ts` mezcla adaptación de resultados con modelo/orquestador | Los casos de adaptación pertenecen a las pruebas de herramientas de M25a.1; la suite adversaria queda en M25a.2 |
| PT-M25a-03 | Los valores de CA-70 y el máximo redactado aún no están aprobados por las specs | Confirmarlos expresamente antes del plan; el código candidato no decide la norma |

### Dependientes de M16c

| ID | Pendiente | Dependencia obligatoria |
|---|---|---|
| PT-M25a-04 | Los resultados candidatos no expresan todavía todo el contrato de presencia, estado temporal, captura parcial y frescura | Contratos finales de lectura de `0016` y evidencia de `G-SYNC` |
| PT-M25a-05 | `connection_status()` no tiene DTO público aprobado | Estado y contratos finales después de M16c; no copiar el DTO histórico |
| PT-M25a-06 | No existen firmas, casts, retorno ni señal de descarte aprobados para registro y voto | Patrones finales de `worker_api` tras `0016` y decisión de esta spec |
| PT-M25a-07 | `purge_connection` debe preservarse al reemplazarlo | Definición y pruebas finales entregadas por `0016` |

## Decisiones de la microfase

| ID | Decisión | Motivo | Decidió | Fecha |
|---|---|---|---|---|
| D-M25a.1-00 | Autorizar anticipadamente solo esta spec, sin activar, planificar ni implementar M25a.1 | Aprovechar tiempo documental sin alterar dependencias | Usuario | 2026-11-01 |
| D-M25a.1-01 | M16c reserva `0016`/pgTAP `13`; M25a.1 reserva `0017_chat_queries.sql`/pgTAP `14` | Enmienda de numeración vigente | Usuario, en la ruta | 2026-10-18 |
| D-M25a.1-02 | No recuperar íntegramente la rama antigua; usar `8a8ce89` solo como inventario selectivo | Evitar mezclar historia divergente y contratos no aprobados | Usuario | 2026-11-01 |
| D-M25a.1-03 | Aplicar la distribución de responsabilidades, gates, archivos y acción posterior fijada por la Enmienda M25a | La Parte I es autoridad superior y la enmienda fue aprobada expresamente | Usuario, en la ruta | 2026-11-01 |
| D-M25a.1-04 | Actualizar anticipadamente solo la documentación propia de M25a, sin tocar código ni contratos pendientes | Preparar la integración preservando las dependencias del pipeline | Usuario | 2026-11-03 |
| D-M25a.1-05 | Fijar en `500` puntos de código el máximo redactado; redactar antes de validar y rechazar explícitamente el exceso, sin truncado silencioso | Cerrar Q-M25a.1-07 y mantener una sola pregunta redactada para registro y modelo | Usuario | 2026-11-03 |
| D-M25a.1-06 | Confirmar `93` días, `4` llamadas, `800` tokens por llamada al modelo, `1` turno concurrente por usuario y `60` segundos totales | Cerrar los valores de CA-70 sin cambiar su distribución de enforcement | Usuario | 2026-11-03 |
| D-M25a.1-07 | Exigir `reason` no nula del catálogo cerrado si y solo si `outcome = not_answered`; exigir `reason = NULL` para `answered` y `answered_partial_coverage` | Eliminar estados persistentes ambiguos sin ampliar CA-62 | Usuario | 2026-11-03 |
| D-M25a.1-08 | No modificar `SECURITY.md` en el corte anticipado; autorizar una actualización acotada de `ARCHITECTURE.md` al cierre, cuando el módulo `chat` pase realmente de previsto a parcial | El corte no cambia amenazas o controles vigentes, pero sí el estado real de un componente al implementarse | Usuario | 2026-11-03 |

## Preguntas cerradas

| ID | Resolución | Decisión |
|---|---|---|
| Q-M25a.1-07 | Máximo redactado de `500` puntos de código; redacción anterior a validación y rechazo explícito del exceso | D-M25a.1-05 |
| Q-M25a.1-13 | Valores iniciales de CA-70 confirmados en `93`, `4`, `800`, `1` y `60 s` | D-M25a.1-06 |
| Q-M25a.1-09 | `reason` obligatoria solo para `not_answered` y SQL `NULL` para los dos outcomes respondidos | D-M25a.1-07 |
| Q-M25a.1-11 | Sin cambio en `SECURITY.md`; actualización acotada de `ARCHITECTURE.md` cuando el corte exista formalmente | D-M25a.1-08 |

## Supuestos e hipótesis

| ID | Hipótesis | Cómo y cuándo se verifica |
|---|---|---|
| H-M25a.1-01 | M16c entregará lecturas suficientes para cobertura y métricas sin ampliar privilegios | Comparar `0016`, pgTAP `13`, tests y evidencia de G-SYNC antes de cerrar esta spec |
| H-M25a.1-02 | K01 seguirá siendo la única entrada de actor y empresa al camino privilegiado | Revisar contrato y consumidores al habilitar M25a.1 |
| H-M25a.1-03 | `purge_connection` de `0016` podrá reemplazarse preservando su contrato | Inspeccionar migración y pruebas finales de M16c |
| H-M25a.1-04 | Componentes de `8a8ce89` pueden recuperarse sin arrastrar otras fases | Comparar archivo por archivo contra la spec aprobada y `main` futuro |
| H-M25a.1-05 | El máximo confirmado será compatible con retención y cobertura de M16c | Probar bordes y períodos parciales después de G-SYNC |

Un supuesto refutado se transforma en pregunta o hallazgo; nunca amplía silenciosamente el
alcance.

## Preguntas abiertas

| ID | Pregunta | Opciones | Recomendación | Evidencia |
|---|---|---|---|---|
| Q-M25a.1-05 | ¿Cuál es el contrato final de lectura de M16c? | Solo puede derivarse de la implementación y gate aprobados de M16c | Esperar G-SYNC; no inventar RPCs ni DTOs | M16c/`0016` pendientes |
| Q-M25a.1-06 | ¿Cuáles son las firmas y retornos de `record_query` y `set_feedback`, incluida la señal de descarte? | Definir después de `0016`, conservando los efectos normativos cerrados | Seguir patrones finales de `worker_api` y aprobar antes del plan | CA-38c/62/69 fijan efectos, no firmas |
| Q-M25a.1-08 | ¿Cuál es el DTO público de `connection_status()`? | Definir discriminantes y campos después de M16c; no heredar automáticamente `8a8ce89` | DTO mínimo sin IDs internos ni estados sensibles | CA-48 solo fija la herramienta |

Mientras estas preguntas sigan abiertas o falten los contratos de M16c, la spec no puede
declararse `APROBABLE`.

## Hallazgos relacionados

- `H-E1-22`: su parte persistente pertenece a M16c. M25a.1 no sustituye ni redefine esa
  dependencia.

Los IDs `H-E1-181`, `H-E1-182` y `H-E1-183` aparecen solo en material histórico de
`8a8ce89` y no están registrados en `docs/HALLAZGOS.md` de la base inspeccionada; por eso no
se los trata como hallazgos canónicos en esta spec.

## Auditorías

- Auditoría en conversación del borrador anticipado, 2026-11-01: 4 bloqueantes, 7 altas,
  3 medias y 1 baja. Las correcciones A-01 a A-15 se incorporan en esta versión.
- Auditoría formal de esta versión: pendiente. No existe todavía un informe persistido en
  `revisiones/`.

Hasta resolver las preguntas abiertas, volver a auditar y recibir aprobación expresa, la
implementación completa conserva este estado:

**BORRADOR ANTICIPADO — NO APROBADO — NO HABILITANTE.** El corte anticipado enumerado es la
única excepción aprobada y no produce `G-CHAT-BASE`.
