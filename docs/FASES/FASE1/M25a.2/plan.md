# M25a.2 — Plan de cortes anticipados unitarios

**Estado:** IMPLEMENTADO Y VERIFICADO — NÚCLEO SIMULADO; CIERRE LIMITADO APROBADO POR EL USUARIO EL 2026-11-07

**Evidencia:** [núcleo simulado del 2026-11-07](sesiones/nucleo-simulado-2026-11-07.md)

**Base verificada del cierre:** `f8a0b8bce563456365217b86bc6d91a116d78aae`

**Alcance de aprobación:** solo el cierre limitado; no aprueba M25a.1 completa, M25a.2
completa, `G-CHAT-BASE` ni `G-VR02`.

**Aprobación:** usuario, 2026-11-06

**Autoridad:** Enmiendas M25a.2 del 2026-11-06 en
`docs/FASES/FASE1/meta_first/plan.md` y decisiones `D-M25a.2-12`, `D-M25a.2-13` y
`D-M25a.2-14`, `D-M25a.2-15` y `D-M25a.2-16` de la spec.

**Límite:** este plan cubre únicamente los cortes puros y unitarios de contexto,
salida/guarda, render determinístico, adaptador DeepInfra simulado y orquestación simulada.
No cubre M25a.2 completa, no requiere ni aprueba `G-CHAT-BASE`, no produce `G-VR02` y no
habilita trabajo sucesor.

## Objetivo

Implementar y verificar exclusivamente:

1. el núcleo puro y unitario de la memoria conversacional efímera; y
2. el núcleo puro y unitario de salida estructurada, detección de candidatos y guarda
   determinística sobre evidencia candidata; y
3. el render determinístico puro que produce una respuesta respaldada o una abstención
   controlada a partir de la guarda y los resultados candidatos; y
4. el adaptador `server-only` de DeepInfra verificado únicamente con transporte y señal de
   cancelación inyectados y respuestas sintéticas; y
5. el orquestador `server-only` que une contexto validado, selección, ejecución inyectada,
   respuesta, guarda y render con fixtures sintéticos.

Ningún bloque integra UI, herramientas reales, persistencia, proveedor real o contratos
externos. Modelo y ejecutor existen solo como dependencias inyectadas del recorrido sintético.

## Condición de entrada

- Las Enmiendas M25a.2 del 2026-11-06 están aprobadas y vigentes.
- `D-M25a.2-05` a `D-M25a.2-10`, `D-M25a.2-12`, `D-M25a.2-13`, `D-M25a.2-14`,
  `D-M25a.2-15` y `D-M25a.2-16` están aprobadas.
- La ausencia de `G-CHAT-BASE` no bloquea este corte, pero sí todo trabajo fuera de su lista
  cerrada.
- Los cambios locales preexistentes se preservan.

## Archivos autorizados

- `src/modules/chat/context.ts`
- `tests/unit/chat-context.test.ts`
- `src/modules/chat/output-schema.ts`
- `src/modules/chat/numeric-candidates.ts`
- `src/modules/chat/guard.ts`
- `src/modules/chat/tools/results.ts`, solo para ownership y adaptación candidata
- `tests/unit/chat-guard.test.ts`
- `tests/unit/chat-tools.test.ts`, solo para adaptación
- `src/modules/chat/render.ts`
- `tests/unit/chat-render.test.ts`
- `src/modules/chat/llm.ts`
- `tests/unit/chat-llm.test.ts`
- `src/modules/chat/orchestrator.ts`
- `tests/unit/chat-orchestrator.test.ts`
- `docs/FASES/FASE1/meta_first/plan.md`
- `docs/FASES/FASE1/M25a.2/spec.md`
- `docs/FASES/FASE1/M25a.2/plan.md`
- `docs/PROJECT_STATE.md`

Ningún otro archivo puede modificarse dentro de este corte.

## Bloque 1 — Contexto unitario

1. El contexto es memoria efímera y no persistente.
2. Representa turnos completos y exitosos, no mensajes independientes arbitrarios.
3. Cada turno contiene exactamente una pregunta ya redactada y una respuesta ya validada.
4. Conserva como máximo `6` turnos.
5. Conserva como máximo `12.000` puntos de código Unicode agregados, contados como puntos de
   código y no como unidades UTF-16.
6. Al superar cantidad o presupuesto elimina turnos completos desde el más antiguo.
7. Nunca trunca preguntas ni respuestas.
8. Un turno individual que no entra en el presupuesto se rechaza explícitamente.
9. Errores, abstenciones y reintentos fallidos no se incorporan.
10. No acepta roles `system`, identidad, tenant, empresa, conexión, cuenta, SQL ni campos
    adicionales.
11. No mantiene estado global compartido.
12. Cada instantánea y sus turnos son inmutables; una operación devuelve una nueva
    instantánea sin alterar las anteriores.
13. No usa base de datos, cookies, `localStorage`, `sessionStorage`, archivos ni red.
14. Crear una instancia nueva elimina todo contexto anterior.
15. El consumo futuro por el modelo queda fuera del corte.
16. El contexto no es evidencia ni fuente autoritativa.

## Bloque 2 — Salida y guarda pura

1. `output-schema.ts` define un schema Zod estricto para `text` y `claims`.
2. `numeric-candidates.ts` detecta cifras, formatos es-AR, porcentajes, cantidades en
   palabras, variaciones y comparaciones.
3. Toda cifra o afirmación verificable debe estar cubierta por un claim válido.
4. Los claims de herramientas se resuelven únicamente contra evidencia del turno actual.
5. Las cifras proporcionadas por el usuario se distinguen de los valores observados.
6. Porcentajes, ratios, variaciones o comparaciones sin respaldo se rechazan.
7. Las comparaciones cualitativas se recalculan desde la evidencia.
8. Las cifras autoritativas conservan precisión decimal y no se convierten a `number`.
9. Las referencias duplicadas, ajenas o manipuladas se rechazan.
10. El schema y tipo candidatos de evidencia pertenecen a `tools/results.ts`.
11. `guard.ts` importa el contrato candidato desde `tools/results.ts`; `tools/results.ts`
    nunca importa desde `guard.ts`.
12. Las pruebas de adaptación pertenecen a `chat-tools.test.ts`. No se crea ni restaura
    `chat-adversarial.test.ts` en este corte.
13. La forma candidata de evidencia no se presenta como contrato final y solo se prueba con
    fixtures sintéticos.

## Bloque 3 — Render determinístico puro

1. El texto exacto de abstención controlada es
   `No puedo responder con seguridad usando los datos disponibles.`.
2. Primero adapta los resultados con `adaptExecutedToolResults`.
3. Si la adaptación falla, devuelve `not_answered` con reason `tool_error`, el texto
   controlado y claims vacíos.
4. Después valida la salida con `validateChatOutput`.
5. Si la guarda falla, devuelve `not_answered` con reason `guard_rejected`, el texto
   controlado y claims vacíos.
6. `renderChatFailure('model_unavailable')` devuelve la misma abstención controlada con
   reason `model_unavailable`.
7. Una salida aceptada devuelve `answered` o `answered_partial_coverage`, junto con el texto
   y los claims ya validados.
8. Una respuesta es parcial únicamente si referencia un `tool_call_id` cuyo resultado es
   parcial; un resultado parcial no referenciado no altera el outcome.
9. Nunca devuelve el texto rechazado del modelo.
10. Las respuestas y sus arrays de claims quedan congelados.
11. No modifica entradas y es determinístico.
12. No registra contenido ni errores en consola.
13. No conoce empresa, tenant, conexión, SQL o persistencia.
14. No realiza red ni llama al modelo.

## Bloque 4 — Adaptador DeepInfra simulado

1. `llm.ts` es `server-only`.
2. El modelo fijo es `deepseek-ai/DeepSeek-V4.1-Flash` y el endpoint fijo es
   `https://api.deepinfra.com/v1/openai/chat/completions`.
3. La configuración lee únicamente `DEEPINFRA_API_KEY`, rechaza ausencia o cadena vacía y
   encapsula el valor en `SecretValue` sin exponerlo en errores, resultados o logs.
4. Las pruebas inyectan una función compatible con `fetch`; no realizan red ni usan secretos
   reales.
5. Las peticiones usan `POST`, `application/json`, `cache: no-store`, `redirect: error`,
   Bearer token, `stream: false` y `n: 1`.
6. `selectTools` y `complete` reciben del llamador una misma `AbortSignal` y pasan exactamente
   esa señal al transporte. El adaptador no usa `AbortSignal.timeout()` ni crea un deadline.
7. La entrada es un objeto estricto con un array no vacío de mensajes; solo admite roles
   `system`, `user` y `assistant` y contenido no vacío.
8. Rechaza roles `tool`, controles de modelo, tenant, empresa y campos adicionales; no agrega
   identidad ni memoria.
9. La selección usa un schema local derivado del catálogo autorizado, acepta de cero a
   `CHAT_LIMITS.maxToolCallsPerTurn` llamadas y no modifica el schema compartido.
10. `complete` usa `CHAT_LIMITS.maxModelOutputTokens` y ambas operaciones envían JSON Schema
    estricto y vuelven a validar el contenido con Zod.
11. Solo acepta `finish_reason: stop`, separa modelo solicitado y reportado y rechaza un
    modelo reportado inesperado.
12. HTTP produce `model_unavailable/http`; AbortError o TimeoutError,
    `model_unavailable/timeout`; y otros errores de transporte,
    `model_unavailable/transport`.
13. JSON, envelope, contenido o schema inválidos producen
    `guard_rejected/invalid_response`; un modelo inesperado produce
    `guard_rejected/unexpected_model`.
14. Los fallos no incluyen cuerpo del proveedor, secreto, host interno ni stack.
15. Los resultados exitosos y fallidos quedan congelados.
16. El corte no acredita disponibilidad, precisión, latencia, esquema real ni `VR-02`.

## Bloque 5 — Orquestación simulada

1. `orchestrator.ts` es `server-only` y recibe modelo, ejecutor y fábrica de señal inyectados.
2. La entrada estricta contiene únicamente una pregunta redactada no vacía de hasta `500`
   puntos de código y un snapshot de contexto validado.
3. Una sola señal creada con el deadline compartido de `60.000` ms se entrega a selección,
   todas las ejecuciones y respuesta final.
4. La selección recibe en orden el system prompt, los turnos anteriores exitosos como
   contexto no autoritativo y la pregunta actual.
5. La respuesta final recibe únicamente system prompt, pregunta redactada y resultados del
   turno actual; la memoria anterior nunca se usa como evidencia.
6. La selección se revalida, admite hasta cuatro llamadas y asigna en servidor `call_1`,
   `call_2` y sucesivos. Cero llamadas abstiene sin completar; cinco o más se rechazan antes
   del ejecutor.
7. Cada resultado valida estructura, ID y nombre. Una excepción o resultado inválido produce
   `tool_error` sin filtrar detalles.
8. La salida final pasa por `renderChatResponse`; una cifra inventada o referencia ajena
   produce abstención controlada.
9. Solo outcomes `answered` o `answered_partial_coverage` agregan un turno exitoso al
   contexto. Abstenciones y errores conservan el snapshot previo.
10. El resultado inmutable incluye respuesta, nuevo contexto, nombres de herramientas,
    modelo solicitado y modelo reportado o `null`.
11. Todo el recorrido usa fixtures sintéticos; no ejecuta herramientas, red, SQL ni
    persistencia reales.

## Procedimiento TDD

### Contexto

1. Escribir primero las pruebas de `tests/unit/chat-context.test.ts`.
2. Ejecutar la prueba dirigida y registrar el fallo esperado.
3. Implementar únicamente `src/modules/chat/context.ts` hasta satisfacer el contrato.
4. Ejecutar la prueba dirigida.

### Salida y guarda

1. Escribir primero las pruebas dirigidas de `tests/unit/chat-guard.test.ts` y los casos de
   adaptación autorizados en `tests/unit/chat-tools.test.ts`.
2. Ejecutarlas y registrar un fallo funcional esperado, no un error accidental de ruta,
   sintaxis o configuración.
3. Implementar únicamente `output-schema.ts`, `numeric-candidates.ts`, `guard.ts` y la
   reorganización candidata autorizada de `tools/results.ts`.
4. Verificar por búsqueda que `guard.ts` dependa de `tools/results.ts` y que no exista la
   dependencia inversa.
5. Ejecutar las pruebas unitarias dirigidas.

### Render

1. Escribir primero `tests/unit/chat-render.test.ts` con el contrato del Bloque 3.
2. Ejecutar la prueba dirigida contra la versión candidata y registrar un fallo funcional
   esperado, incluida la inmutabilidad del array de claims.
3. Implementar únicamente `src/modules/chat/render.ts` hasta satisfacer el contrato.
4. Verificar que no importe modelo, orquestador, Actions, UI o repository y que no use red,
   almacenamiento, SQL o logs.
5. Ejecutar la prueba unitaria dirigida.

### Adaptador DeepInfra simulado

1. Escribir primero `tests/unit/chat-llm.test.ts` usando exclusivamente transporte y
   respuestas sintéticas.
2. Recuperar después el candidato de `llm.ts` y registrar fallos funcionales sobre el máximo
   local de cuatro llamadas, la señal compartida y `finish_reason`.
3. Implementar únicamente `src/modules/chat/llm.ts` hasta satisfacer el Bloque 4.
4. Comprobar que no usa `AbortSignal.timeout`, red real, logs ni imports de orquestador, UI,
   Actions, repository o M16c.
5. Ejecutar la prueba unitaria dirigida.

### Orquestación simulada

1. Escribir primero `tests/unit/chat-orchestrator.test.ts` y los casos limitados de lectura
   de snapshots en `tests/unit/chat-context.test.ts`.
2. Recuperar después el candidato histórico de `orchestrator.ts` y registrar un fallo
   funcional sobre contexto, señal compartida, máximo de llamadas y `nextContext`.
3. Implementar únicamente `orchestrator.ts` y el ajuste limitado de `context.ts`.
4. Verificar que no importe UI, Actions, repository o M16c y que no use red, herramientas
   reales, persistencia, SQL o logs.
5. Ejecutar las pruebas dirigidas y las regresiones del núcleo.

### Verificación común

1. Ejecutar `npm run verify`.
2. Ejecutar `git diff --check` y revisar que solo existan archivos autorizados.

## Pruebas previstas

### Contexto

- contexto vacío;
- agregar turnos sin mutar instantáneas anteriores;
- límite exacto de seis turnos;
- descarte del turno completo más antiguo al agregar el séptimo;
- presupuesto exacto de 12.000 puntos de código;
- conteo Unicode por puntos de código;
- descarte por presupuesto agregado;
- rechazo de un turno individual demasiado grande;
- rechazo de campos adicionales o estructuras manipuladas;
- inmutabilidad de instantáneas y turnos;
- aislamiento entre instancias; y
- ausencia de persistencia o estado global.

### Salida y guarda

- schema estricto de `text` y `claims`, incluidos campos adicionales y estructuras
  manipuladas;
- cifras con formatos es-AR, porcentajes, cantidades en palabras, variaciones y
  comparaciones;
- cifra inventada o afirmación verificable sin claim;
- referencia inexistente, duplicada, ajena a este turno o manipulada;
- valor observado con métrica, unidad, moneda, cuenta o período distintos de la evidencia;
- cifra proporcionada por el usuario correctamente diferenciada de evidencia observada;
- porcentaje, ratio, variación o comparación sin respaldo;
- comparación cualitativa recalculada desde evidencia;
- precisión decimal textual sin paso por `number`;
- ownership del schema candidato en `tools/results.ts` y ausencia de dependencia inversa;
  y
- adaptación candidata probada en `chat-tools.test.ts`, sin crear ni restaurar
  `chat-adversarial.test.ts`.

### Render

- respuesta válida respaldada;
- respuesta parcial solo cuando referencia un resultado parcial;
- resultado parcial no referenciado sin alterar una respuesta completa;
- cifra inventada, salida inválida o referencia inexistente producen abstención por
  `guard_rejected`;
- resultados inválidos producen `tool_error`;
- `renderChatFailure('model_unavailable')` produce la misma abstención;
- ningún texto rechazado aparece en una abstención y sus claims están vacíos;
- respuesta y array de claims congelados;
- determinismo, entradas sin mutación y ausencia de logs.

### Adaptador DeepInfra simulado

- configuración ausente o vacía y secreto redactado;
- petición cerrada y separada para `complete` y `selectTools`;
- modelo, endpoint, 800 tokens y JSON Schema estricto;
- cero y cuatro llamadas aceptadas, cinco rechazadas y schema compartido sin modificación;
- misma `AbortSignal` pasada al transporte y ausencia de timeout interno;
- argumentos adicionales, entrada vacía, rol desconocido y campos extra rechazados antes de
  llamar al transporte;
- respuesta válida, JSON ilegible, envelope inválido, contenido no JSON, schema inválido y
  `finish_reason` inesperado;
- HTTP, abort, timeout, transporte y modelo reportado inesperado sin filtraciones;
- resultados congelados y ninguna llamada real.

### Orquestación simulada

- entrada estricta y snapshot manipulado rechazados;
- contexto vacío y seis turnos enviados en orden solo a selección;
- memoria ausente de la respuesta final;
- una única señal creada con `60.000` ms y compartida por todo el turno;
- IDs asignados por servidor, cero y cuatro llamadas aceptadas y cinco rechazadas;
- herramienta, argumentos y resultados inválidos, excepción del ejecutor y fallos del
  modelo tratados como abstenciones seguras;
- respuesta completa, parcial y cifra inventada;
- contexto actualizado solo por respuestas válidas;
- modelo solicitado/reportado, inmutabilidad y ausencia de logs o filtraciones.

## Criterio de aceptación

- Las pruebas unitarias dirigidas de contexto, salida, candidatos, guarda, adaptación,
  render, modelo simulado y orquestación terminan aprobadas.
- La salida y los claims validan con schemas estrictos y toda afirmación verificable queda
  respaldada o es rechazada.
- Las referencias solo resuelven contra evidencia sintética del turno actual.
- `tools/results.ts` es dueño del contrato candidato y no depende de `guard.ts`.
- El render adapta resultados antes de invocar la guarda y solo expone texto validado o la
  abstención controlada.
- El outcome parcial depende exclusivamente de resultados parciales efectivamente
  referenciados por los claims aceptados.
- Respuestas y arrays de claims están congelados; no hay logs ni mutación de entradas.
- El adaptador usa modelo y endpoint fijos, límites compartidos, schemas estrictos y la señal
  entregada por el llamador, sin crear un timeout propio.
- Toda prueba del adaptador usa transporte sintético; no se acredita al proveedor ni
  `VR-02`.
- El orquestador usa un solo deadline compartido, revalida selección y resultados, mantiene
  la memoria fuera de la evidencia final y actualiza contexto únicamente por respuesta
  aceptada.
- No existe `chat-adversarial.test.ts` creado o restaurado por este corte.
- `npm run verify` termina aprobado.
- `git diff --check` termina aprobado.
- La evidencia no afirma que M25a.2, `G-CHAT-BASE` o `G-VR02` estén aprobados.
- No existe integración ni acceso a almacenamiento, red o contratos externos.

## Fuera de alcance

- UI e historial visual;
- llamadas reales a DeepInfra, secretos reales, prompts de producción y acreditación del
  proveedor;
- ejecutores y herramientas reales;
- Server Actions, feedback y pruebas de aplicación;
- SQL, migraciones, pgTAP, RPCs, repositories y DTOs;
- M16c y el resto de M25a.1;
- `tests/unit/chat-adversarial.test.ts`;
- consumo real del contexto por un proveedor; y
- VR-02.

## Condiciones de parada

- Hace falta modificar un archivo no enumerado.
- El contrato exige identidad, tenant, persistencia, red o una integración externa.
- Una prueba solo puede pasar ampliando el corte.
- Aparece una contradicción con D-M25a.2-05 a D-M25a.2-10, D-M25a.2-12,
  D-M25a.2-13, D-M25a.2-14, D-M25a.2-15, D-M25a.2-16 o con la ruta vigente.

## Resultado del cierre limitado

El cierre de este plan acredita únicamente los núcleos unitarios del contexto efímero, de
salida/guarda pura sobre evidencia candidata, del render determinístico puro, del adaptador
simulado con transporte inyectado y del recorrido de orquestación sintético. No acredita
integración real, proveedor real ni un contrato final de resultados. M25a.2 completa
continúa bloqueada por `G-CHAT-BASE`, la aplicación
verificada de `0017`, la aprobación de su spec completa y el resto de sus dependencias. No
se inicia ninguna tarea sucesora.
