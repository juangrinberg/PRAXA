# M25a.2 — Chat: modelo, afirmaciones verificadas, UI y VR-02

> **BORRADOR ANTICIPADO — NO APROBADO — NO HABILITANTE**
> Preparado por autorización expresa del usuario del 2026-11-03 para documentar el trabajo
> candidato sin iniciar la microfase. Este archivo no habilita M25a.2, no aprueba
> `G-CHAT-BASE` y no cambia el pipeline. La única implementación autorizada antes de ese gate
> es el corte unitario de contexto aprobado el 2026-11-06. M25a.1 y la aplicación posterior
> de `0017` al proyecto `app` siguen siendo precondiciones de M25a.2 completa.

**Estado:** BORRADOR ANTICIPADO — NO APROBADO — NO HABILITANTE

Este estado especial corresponde a `BORRADOR` en el pipeline. Los estados posibles siguen
siendo `BORRADOR` → `APROBADA`. Solo el usuario puede pasar esta spec a `APROBADA`, después
de una auditoría `APROBABLE` y cuando la dependencia de la ruta permita iniciar M25a.2.

**ID:** `M25a.2` — hasta 8 horas de implementación. Es un límite de tamaño del corte, no una
estimación ni una asignación de tiempo al usuario.
**Commit base inspeccionado:** `568e40214748ff1aad5cde3d00e16e88bbacf96b`
**Dependencia de la ruta:** `G-CHAT-BASE`, más `0017` aplicada y verificada en `app`
**Gate de salida previsto:** `G-VR02`
**Sucesora prevista:** M28.3a

## Excepción de ejecución limitada

**Corte anticipado de contexto aprobado para ejecución limitada.** Por decisión expresa del
usuario del 2026-11-06, antes de `G-CHAT-BASE` se autoriza únicamente el núcleo puro y
unitario del contexto conversacional en `src/modules/chat/context.ts`, su prueba dirigida en
`tests/unit/chat-context.test.ts` y la documentación propia de este corte.

La excepción no aprueba esta spec completa, no habilita M25a.2 ni modifica su dependencia
formal. No autoriza UI, DeepInfra, modelo, orquestador, guarda, render, Server Actions,
feedback, pruebas de aplicación ni VR-02. Tampoco permite SQL, persistencia, almacenamiento
del navegador, archivos, red, contratos o DTOs de M16c o M25a.1. El contexto es memoria
efímera no autoritativa y no constituye evidencia para las respuestas.

**Hash de contenido:** pendiente. Debe calcularse cuando se resuelvan las preguntas abiertas
y antes de la auditoría formal, sin la línea de estado:

```bash
grep -v '^\*\*Estado:\*\*' docs/FASES/FASE1/M25a.2/spec.md | git hash-object --stdin
```

## Fuentes

Jerarquía aplicada:

1. `AGENTS.md`, incluido su contrato de ejecución.
2. `docs/FASES/FASE1/meta_first/plan.md`, Parte I, Enmienda M25a y ficha de M25a.2.
3. `docs/FASES/FASE1/meta_first/spec.md`, CA-50 a CA-55, CA-61, CA-65, CA-69,
   CA-70 y VR-02.
4. `docs/FASES/FASE1/meta_first/plan.md`, II.13 y Partes II/III aplicables.
5. `docs/FASES/FASE1/M25a.1/spec.md`, únicamente para la frontera entre fases; sigue en
   borrador y no sustituye `G-CHAT-BASE`.
6. `docs/SECURITY.md` y `docs/ARCHITECTURE.md`.
7. Código candidato del árbol de trabajo, que no constituye evidencia ni autoridad.

Fuentes de estado y proceso:

- `docs/PROJECT_STATE.md`: M25a.2 no es la siguiente microfase habilitada.
- `docs/PIPELINE.md` y `docs/_templates/mf-spec.md`: estructura, auditoría y aprobación.
- `docs/HALLAZGOS.md`: hallazgos canónicos relacionados.

Etiquetas usadas:

- **CONFIRMADO:** exigencia cerrada por la ruta vigente.
- **PENDIENTE DE M16c/M25a.1:** forma que depende de contratos todavía no entregados.
- **PENDIENTE DE DECISIÓN:** detalle que la ruta deja para esta spec o su plan.
- **CANDIDATO LOCAL:** código o prueba existente sin integración ni aprobación de gate.

## Objetivo

**CONFIRMADO, tomado de la ficha de Parte I:** que el dueño reciba respuestas en lenguaje
natural cuyas cifras están vinculadas y verificadas contra resultados de herramientas.

M25a.2 conecta el modelo y la presentación con la base determinística acreditada por
M25a.1. El LLM nunca es autoridad de cifras, estados, identidad, permisos o políticas.

## Alcance

1. Adaptador de DeepInfra con modelo fijo, esquema estricto y límite de tokens.
2. Orquestador en dos pasos con límite de llamadas a herramientas.
3. Salida estructurada `text` + `claims` y validación determinística CA-50/50b/50c.
4. Presentación de período, zona, cuenta, cobertura, composición de parciales y frescura.
5. Abstención controlada ante salida inválida o sin respaldo.
6. Server Actions de turno y feedback que construyen K01 y consumen el repository de M25a.1.
7. Un turno concurrente por usuario y duración total del turno.
8. Conversación visible solo durante la sesión, sin listado, búsqueda o memoria entre sesiones.
9. Aviso visible de registro y finalidad.
10. Botones `útil` / `no útil`, también en abstenciones, con último voto válido.
11. Conservación de la pregunta y reintento cuando el modelo no está disponible.
12. Aislamiento frente a preguntas directas e instrucciones inyectadas.
13. Pruebas adversarias, de componente y aplicación.
14. Conjunto de evaluación congelado y VR-02 contra los umbrales de DEC-21.

## Fuera de alcance

- Crear o modificar las tablas, funciones, casts o contratos persistentes de M25a.1.
- Reacreditar CA-38c, privilegios, aislamiento directo de la base o retención ya cerrados en
  `G-CHAT-BASE`.
- Inventar contratos de lectura que M16c no haya entregado.
- Permitir que el modelo elija empresa, conexión, cuenta, tabla o SQL.
- Persistir conversación, respuestas o resultados de herramientas.
- Listado, búsqueda o memoria entre sesiones.
- Explicar causas, evaluar rentabilidad, pronosticar o calcular métricas no soportadas por
  herramientas.
- Escribir en Meta u otro sistema externo.
- Cambiar de host o modelo sin actualizar la ruta, configuración, pruebas y M03a.
- Aprobar `G-CHAT-BASE`, ejecutar `db:push` de `0017` o crear secretos externos.
- Iniciar M28.3a o aprobar `G-VR02` por mera existencia de código o tests unitarios.

## Contexto histórico verificado en la rama fuente

| Qué | Dónde | Qué implica |
|---|---|---|
| La UI de chat ya existe y el acceso está en la navegación real | `src/components/app/chat.tsx`; `src/components/app/shell.tsx` | No hace falta crear `src/components/app-nav.tsx` si la navegación existente satisface el requisito; las rutas de II.13 son sugeridas |
| La rama fuente contiene un módulo independiente de contexto efímero | `src/modules/chat/context.ts` en `mf/M25a-ca50` | Es material candidato histórico; no fue restaurado y debe rediseñarse por turnos completos para satisfacer el corte aprobado |
| La UI agrega preguntas del usuario al contexto y a su historial visible | `src/components/app/chat.tsx` | Es integración parcial de CA-61; no hay respuestas, Action ni consumo del contexto por el modelo |
| La implementación histórica limita 12 mensajes independientes y 12.000 puntos de código | `src/modules/chat/context.ts` en `mf/M25a-ca50` | No es el contrato aprobado: D-M25a.2-05 y D-M25a.2-06 fijan 6 turnos completos y 12.000 puntos de código agregados |
| La UI usa 12.000 como `maxLength` mientras la decisión fija 500 caracteres redactados | `src/components/app/chat.tsx`; `src/modules/chat/redaction.ts` | La discrepancia documental quedó resuelta por D-M25a.1-05 y D-M25a.2-10; el código candidato todavía debe alinearse |
| Schema, detector, guarda, render, adaptador y orquestador existen como candidatos | `src/modules/chat/{output-schema,numeric-candidates,guard,render,llm,orchestrator}.ts` | Pruebas unitarias no equivalen a integración ni a VR-02 |
| No existen Actions, ejecutor real ni repository integrado | árbol local del 2026-11-03 | El recorrido de producción sigue ausente |

## Diseño concreto

### 1. Dependencias y condición de entrada

M25a.2 solo puede pasar a planificación e implementación cuando:

1. M25a.1 esté cerrada y `G-CHAT-BASE` aprobado;
2. `0017` esté aplicada y verificada en el proyecto `app` por el usuario;
3. el repository de registro y voto y el ejecutor real estén disponibles;
4. esta spec haya incorporado esos contratos sin redefinirlos;
5. no queden preguntas abiertas que alteren comportamiento visible o límites;
6. una auditoría la declare `APROBABLE`; y
7. el usuario la apruebe expresamente y luego apruebe su plan.

La existencia de código candidato no satisface estas condiciones.

### 2. Frontera con M25a.1

M25a.2 recibe de M25a.1:

- herramientas ejecutables con JWT/RLS y resultados validados;
- evidencia textual exacta de métricas y cobertura;
- configuración compartida de límites;
- repository `server-only` para registrar la consulta y guardar el voto;
- identificador opaco del registro; y
- garantías de CA-38c, privilegios, retención e aislamiento directo.

M25a.2 no acepta `company_id` del cliente, no reconstruye SQL y no duplica funciones de
`worker_api`.

### 3. Salida estructurada y guarda

La salida tiene `text` y `claims`. Cada claim conserva la forma normativa de CA-50: `span`,
`kind`, referencia al resultado del turno actual y los metadatos aplicables de métrica,
unidad, moneda, cuenta y período.

La guarda:

1. detecta todos los candidatos definidos por CA-50;
2. exige cobertura por un claim válido;
3. resuelve referencias solo contra el turno actual;
4. compara valor y metadatos con la evidencia real;
5. recalcula comparaciones cualitativas;
6. rechaza porcentajes, ratios y variaciones sin herramienta; y
7. produce `guard_rejected` y abstención controlada ante cualquier fallo.

El contrato de evidencia debe pertenecer a la base determinística de M25a.1. La guarda lo
consume; `tools/results.ts` no debe depender de un schema definido en `guard.ts`.

### 4. Modelo y orquestación

El modelo confirmado por la ruta es `deepseek-ai/DeepSeek-V4.1-Flash`, servido por DeepInfra.
Las dos llamadas usan salida estricta y validación Zod final:

1. selección de herramientas y argumentos del catálogo cerrado;
2. redacción de `text` + `claims` a partir de resultados ejecutados en el turno.

El servidor asigna los identificadores de llamada. El modelo no define identidad, tenant,
conexión ni referencias de un turno anterior.

El máximo de llamadas y los tokens salen de la configuración compartida. Los valores están
confirmados por `D-M25a.1-06` y `D-M25a.2-11`; su autoridad proviene de esas decisiones, no
del código candidato.

### 5. Presentación

Una respuesta aceptada muestra siempre:

- cuenta truncada;
- período;
- zona horaria;
- presencia, estado temporal y captura parcial;
- composición del total parcial cuando corresponde; y
- frescura, incluido el rango de `fetched_at` si hubo extracciones distintas.

Las cifras `user_provided` se diferencian de las observadas. La forma concreta depende del
resultado final entregado por M25a.1 y no se inventa aquí.

### 6. Server Actions y límites del turno

Las Actions construyen K01 dentro del servidor y no reciben tenant autoritativo del cliente.
El turno:

1. valida entrada;
2. aplica concurrencia por usuario;
3. inicia un presupuesto total de duración;
4. redacta mediante la función única de M25a.1;
5. orquesta y ejecuta herramientas;
6. valida y presenta la respuesta o abstención; y
7. registra mediante el repository de M25a.1.

Los 60 segundos aprobados son duración total, no un timeout independiente renovado para
cada llamada al modelo. El mecanismo concreto de concurrencia y deadline se decide en esta
spec o su plan sin ampliar la infraestructura ni inventar persistencia.

La Action de feedback construye K01, recibe el identificador opaco y uno de los dos votos, y
delega al repository. Su firma pública depende del contrato aprobado de M25a.1.

### 7. Contexto visible de sesión

`src/modules/chat/context.ts` y `tests/unit/chat-context.test.ts` son las únicas ubicaciones de
código autorizadas por el corte anticipado del 2026-11-06. Esta autorización no alcanza la
integración visible ni reemplaza la aprobación futura de la spec completa.

Requisitos confirmados por la ruta:

- la conversación visible vive solo durante la sesión del navegador;
- no hay listado, búsqueda ni memoria entre sesiones;
- el contexto no sustituye K01 ni se vuelve fuente de identidad, tenant o datos
  autoritativos; y
- la conversación no se persiste como historial en la base de datos.

Contrato aprobado para el corte unitario:

- vive únicamente en memoria de cada instancia y no mantiene estado global compartido;
- representa turnos completos y exitosos, cada uno con pregunta ya redactada y respuesta ya
  validada;
- admite como máximo `6` turnos y `12.000` puntos de código Unicode agregados;
- al superar un límite descarta turnos completos desde el más antiguo y nunca trunca pregunta
  o respuesta;
- rechaza explícitamente un turno individual que no entra en el presupuesto;
- no incorpora errores, abstenciones ni reintentos fallidos;
- no acepta roles `system`, identidad, tenant, empresa, conexión, cuenta, SQL ni campos
  adicionales;
- produce instantáneas inmutables y aisladas entre instancias;
- no usa base de datos, cookies, `localStorage`, `sessionStorage`, archivos ni red; y
- reiniciar la instancia elimina el contexto.

El consumo futuro por el modelo queda fuera de este corte. El contexto no es evidencia ni
fuente autoritativa. La implementación histórica basada en mensajes independientes es solo
material candidato y no se restaura como contrato.

La ruta no define por sí sola el ciclo de vida exacto ni los límites de la memoria. Las
decisiones `D-M25a.2-05` a `D-M25a.2-09` los concretan para esta microfase:

- el historial visible conserva todos los mensajes mientras la pantalla del chat permanece
  en la sesión activa;
- la memoria del modelo contiene como máximo los últimos `6` turnos completos y exitosos;
- cada turno de memoria contiene la pregunta redactada y la respuesta validada;
- la memoria tiene un máximo agregado de `12.000` puntos de código;
- al superar cantidad o tamaño se descartan turnos completos desde el más antiguo y nunca
  se cortan mensajes;
- errores, reintentos fallidos y abstenciones permanecen visibles, pero no entran en la
  memoria del modelo;
- el contexto se entrega solo a la selección de herramientas, como información no
  autoritativa, y nunca como evidencia para la respuesta final; y
- todo el estado vive en memoria y se reinicia al abandonar la pantalla, recargarla o
  cambiar de usuario o empresa, sin base de datos ni almacenamiento del navegador.

Estas decisiones cierran `Q-M25a.2-01`, `Q-M25a.2-02` y `Q-M25a.2-09`; la autorización para
implementarlas aisladamente queda registrada por `D-M25a.2-12`.

**Límite explícito:** conversación visible de sesión no implica automáticamente enviar todo
el historial al modelo. La ruta no define memoria conversacional del modelo; `D-M25a.2-05`
y `D-M25a.2-07` autorizan únicamente la ventana aprobada para la selección de herramientas,
sin convertirla en evidencia ni incorporarla a la respuesta final.

La UI candidata mantiene además un array visual separado. Antes de integrar respuestas y
reintentos debe fijarse una única regla de actualización para evitar divergencia entre lo
visible y el contexto acotado.

### 8. Discrepancia de longitudes

El estado candidato admite 12.000 caracteres por mensaje visible, mientras `D-M25a.1-05`
confirma 500 puntos de código para la pregunta redactada que se registra y envía al modelo.
`D-M25a.2-10` resuelve cómo relacionar ambos valores.

**Decisión aprobada `D-M25a.2-10`:** `500` puntos de código es el máximo de cada pregunta
redactada; `12.000` es exclusivamente el presupuesto agregado de la memoria del modelo. La
pregunta se redacta primero y, si todavía supera `500`, se rechaza explícitamente. No se
trunca en silencio. M25a.1 sigue siendo dueña del máximo redactado y M25a.2, de esta política
visible y de memoria.

Queda prohibido acreditar el recorrido si existe truncado silencioso, si la UI y el registro
representan preguntas materialmente distintas sin aviso, o si la pregunta original se
persiste para compensar la diferencia.

### 9. UI, feedback y reintento

La UI debe mostrar preguntas y respuestas de la sesión, aviso de registro/finalidad y dos
botones de utilidad por respuesta o abstención. Un voto posterior reemplaza al anterior.

Ante `model_unavailable`, conserva la pregunta visible y permite reintentar sin reescribirla.
Cada reintento genera un registro aparte conforme a M25a.1.

**Decisión aprobada `D-M25a.2-08`:** errores, intentos fallidos y abstenciones se conservan
en el historial visible, pero no se incorporan a la memoria posterior del modelo. Solo un
turno completo con respuesta validada puede ingresar en esa memoria.

El acceso `/app/chat` ya existe en `src/components/app/shell.tsx`. El plan futuro debe
registrar ese hecho en vez de crear un archivo de navegación paralelo sin necesidad.

### 10. VR-02

Antes de correrla se congela un conjunto sintético con preguntas respondibles y preguntas
que exigen abstención. Se verifican los umbrales de DEC-21, el identificador y precisión del
modelo, el esquema estricto y la información visible del modelo.

Una corrida simulada o una suite unitaria no reemplaza VR-02.

## Pendientes técnicos de integración

### Resolubles dentro de M25a

| ID | Pendiente | Resolución requerida |
|---|---|---|
| PT-M25a-08 | `context.ts` y el historial visual son dos estados | Fijar una actualización coherente para usuario, respuesta, error y reintento |
| PT-M25a-09 | El código candidato todavía usa 12.000 como límite visible frente a los 500 redactados aprobados | Implementar D-M25a.1-05 y D-M25a.2-10 sin truncado silencioso |
| PT-M25a-10 | El timeout candidato se renueva por llamada al modelo | Aplicar un deadline total compartido por Action, herramientas y modelo |
| PT-M25a-11 | Falta concurrencia por usuario | Definir el mecanismo server-side y sus pruebas sin aceptar identidad del cliente |
| PT-M25a-12 | `render.ts` decide outcome pero no construye toda la presentación | Completar la presentación una vez disponible el contrato real de resultados |

### Dependientes de M16c o M25a.1

`docs/FASES/FASE1/M25a.1/spec.md` es el documento dueño de `PT-M25a-01` a
`PT-M25a-07`: dependencia entre resultados y guarda, separación de pruebas, valores
compartidos, contratos de resultados, `connection_status`, firmas de registro/voto y
`purge_connection`. M25a.2 consume su resolución y no duplica esos pendientes.

| ID | Pendiente | Dependencia obligatoria |
|---|---|---|
| PT-M25a-13 | Identificador opaco usado por la Action y la UI | Contrato de persistencia aprobado en M25a.1 |
| PT-M25a-14 | Registro del outcome final y CA-38c | Repository real y `G-CHAT-BASE`; M25a.2 no los reimplementa |

### Dependientes del usuario o del proveedor

| ID | Pendiente | Dependencia obligatoria |
|---|---|---|
| PT-M25a-15 | Llamada real al modelo | Cuenta de DeepInfra y clave cargada por el usuario, sin pegarla en el chat |
| PT-M25a-16 | Precisión, esquema estricto y latencia reales | VR-02 sobre DeepInfra con evaluación congelada |

## Archivos previstos

Esta tabla no autoriza la implementación completa mientras el estado siga no habilitante. La
única excepción es el corte unitario de contexto identificado expresamente en sus filas.

| Archivo | Nuevo o modificado | Para qué | Base documental / estado |
|---|---|---|---|
| `docs/FASES/FASE1/M25a.2/spec.md` | Nuevo | Este borrador anticipado | Artefactos del pipeline y autorización expresa del usuario, 2026-11-03 |
| `src/modules/chat/output-schema.ts` | Nuevo | Salida `text` + `claims` | II.13 paso 1 |
| `src/modules/chat/llm.ts` | Nuevo | Adaptador DeepInfra | II.13 paso 2 |
| `src/modules/chat/limits.ts` | Modificado/compartido | Tokens, llamadas, concurrencia y duración | II.13 pasos 2, 3 y 7 |
| `src/modules/chat/orchestrator.ts` | Nuevo | Orquestación en dos pasos | II.13 paso 3 |
| `src/modules/chat/numeric-candidates.ts` | Nuevo | Detector CA-50 | II.13 paso 4 |
| `src/modules/chat/guard.ts` | Nuevo | Guarda determinística | II.13 paso 5 |
| `src/modules/chat/render.ts` | Nuevo | Presentación y abstención | II.13 paso 6 |
| `src/modules/chat/actions.ts` | Nuevo | Actions de turno y feedback | II.13 paso 7 |
| `src/modules/chat/repository.ts` | Compartido con M25a.1 | Registro y voto ya acreditados | II.13 paso 7; no duplica M25a.1 |
| `src/modules/chat/context.ts` | Nuevo | Contexto efímero por turnos completos | Corte limitado aprobado el 2026-11-06; no integra UI ni modelo |
| `src/app/(app)/app/chat/page.tsx` | Modificado si hace falta | Datos iniciales y recorrido de chat | II.13 paso 8 |
| `src/components/app/chat.tsx` | Modificado | Conversación, aviso, reintento y feedback | II.13 paso 8 |
| `src/components/app/chat.module.css` | Modificado si hace falta | Estados visuales de respuesta y feedback | II.13 paso 8 |
| `tests/unit/chat-context.test.ts` | Nuevo | Límites e invariantes del contexto efímero | Corte limitado aprobado el 2026-11-06; prueba exclusivamente unitaria |
| `tests/component/chat-page.test.tsx` | Nuevo | Conversación visible de sesión | II.13 paso 8 |
| `tests/unit/chat-guard.test.ts` | Nuevo | Guarda y casos CA-50b | II.13 paso 9 |
| `tests/unit/chat-adversarial.test.ts` | Nuevo | Modelo, orquestador y adversarios | II.13 paso 9; separar casos de resultados de M25a.1 |
| `tests/app/chat-actions.test.ts` | Nuevo | Actions, aislamiento y límites | II.13 paso 9 |
| `docs/FASES/FASE1/meta_first/vr-02.md` | Nuevo | Evaluación congelada e informe | II.13 paso 10 |
| `docs/FASES/FASE1/M25a.2/plan.md` | Nuevo | Plan exclusivo del corte unitario | Aprobación expresa del usuario, 2026-11-06 |
| `docs/FASES/FASE1/M25a.2/revisiones/*.md` | Futuros | Auditoría de la spec completa | No pertenecen al corte unitario |

`src/components/app/shell.tsx` ya contiene el acceso al chat. No se prevé modificarlo salvo
que una prueba futura demuestre que el requisito de navegación no está satisfecho.

## Criterios de aceptación

### Heredados de la ruta

| ID | Qué exige |
|---|---|
| CA-50/50b/50c | Salida estructurada, guarda determinística y referencias solo al turno actual |
| CA-51/51b | Período, zona, cobertura, parciales y frescura visibles |
| CA-52 | Cuenta truncada y período siempre visibles |
| CA-53/53b | Modelo fijo, esquema estricto, reintento e identificadores solicitado/informado |
| CA-54 | Aislamiento ante preguntas directas e instrucciones inyectadas |
| CA-55 | Solo gasto e impresiones; sin causalidad ni rentabilidad presentada como hecho |
| CA-61 | Conversación visible solo durante la sesión |
| CA-65 | Aviso visible de registro y finalidad |
| CA-69 | Botones binarios en respuestas y abstenciones; último voto válido mediante K01 |
| CA-70 | Llamadas, tokens, concurrencia y duración total en servidor |
| VR-02 | Evaluación congelada y umbrales DEC-21 aprobados |

### Operativos de esta microfase

| ID | Criterio verificable | Traza |
|---|---|---|
| M25a.2-C01 | Ningún texto del modelo con candidatos numéricos llega a UI sin claims válidos | CA-50/50b |
| M25a.2-C02 | Claims solo resuelven contra resultados del turno actual y metadatos coincidentes | CA-50c |
| M25a.2-C03 | El servidor recalcula comparaciones y rechaza ratios/variaciones no soportados | CA-50 |
| M25a.2-C04 | La presentación muestra cuenta, período, zona, cobertura, parciales y frescura | CA-51/51b/52 |
| M25a.2-C05 | Modelo caído conserva la pregunta visible y permite un reintento separado | CA-53 |
| M25a.2-C06 | Adaptador usa modelo fijo, esquema estricto y registra IDs solicitado/informado | CA-53b |
| M25a.2-C07 | Preguntas directas e instrucciones inyectadas no amplían tenant, herramientas ni datos | CA-54 |
| M25a.2-C08 | El chat no explica causas ni rentabilidad como hechos | CA-55 |
| M25a.2-C09 | La conversación visible no persiste ni sobrevive como memoria entre sesiones | CA-61 |
| M25a.2-C10 | La UI muestra aviso de registro/finalidad | CA-65 |
| M25a.2-C11 | Toda respuesta y abstención ofrece feedback binario y el último voto queda guardado | CA-69 |
| M25a.2-C12 | Se aplican máximo de llamadas, tokens, un turno concurrente y deadline total | CA-70 |
| M25a.2-C13 | Actions construyen K01 y no aceptan identidad autoritativa del cliente | CA-49/54/69 |
| M25a.2-C14 | La memoria aprobada se envía solo a la selección de herramientas, como contexto no autoritativo, y nunca como evidencia o entrada de la respuesta final | CA-61; D-M25a.2-07 |
| M25a.2-C15 | La política de 12.000 frente a 500 está decidida y no produce truncado silencioso | CA-61/66; Q-M25a.2-03 |
| M25a.2-C16 | `npm run verify` y `npm run test:app` pasan sin omitir casos obligatorios | Ficha, III.3, CB-05/06 |
| M25a.2-C17 | VR-02 cumple todos los umbrales DEC-21 | VR-02 |

## Casos de prueba

Ninguna prueba se acredita por su existencia o por una ejecución anterior a esta spec.

| ID | Criterios | Tipo | Comando | Resultado esperado | ¿Falla sin implementación? |
|---|---|---|---|---|---|
| M25a.2-T01 | C01–C03 | unit | `npm run test:unit` | Casos adversarios obligatorios de CA-50b aceptan o rechazan correctamente | Sí |
| M25a.2-T02 | C02 | unit | `npm run test:unit` | Historial o referencia de otro turno no introduce cifras | Sí |
| M25a.2-T03 | C06 | unit | `npm run test:unit` | Petición estricta, modelo fijo, tokens y respuestas inválidas controladas | Sí |
| M25a.2-T04 | C04 | unit/component | `npm run test` | Presentación completa y abstención sin texto no validado | Sí |
| M25a.2-T05 | C05 | component/app | `npm run test`; `npm run test:app` | Caída conserva pregunta y reintenta sin reescritura | Sí |
| M25a.2-T06 | C07/C13 | app | `npm run test:app` | Pregunta directa, instrucción inyectada y SQL no cruzan tenant ni catálogo | Sí |
| M25a.2-T07 | C09/C14/C15 | unit/component | `npm run test` | Contexto efímero, frontera de memoria y longitud aprobada | Sí |
| M25a.2-T08 | C10/C11 | component/app | `npm run test`; `npm run test:app` | Aviso y botones aparecen en respuestas y abstenciones; último voto gana | Sí |
| M25a.2-T09 | C12 | unit/app | `npm run test:unit`; `npm run test:app` | Exceso de llamadas/tokens, segundo turno y deadline se rechazan | Sí |
| M25a.2-T10 | C08 | adversaria/VR | informe VR-02 | No presenta causalidad o rentabilidad como hecho | Sí |
| M25a.2-T11 | C17 | evaluación real | informe VR-02 | Todos los umbrales DEC-21 pasan | Sí |
| M25a.2-T12 | C16 | repositorio | `npm run verify`; `npm run test:app` | Verificación completa en verde, sin omisiones | Depende del árbol completo |

La herramienta elegida incorrectamente se mide en VR-02; no se presenta como garantía de la
guarda.

## Verificación

Comandos obligatorios de la ruta:

```text
npm run verify
npm run test:app
```

Además, VR-02 debe estar aprobada. Una suite omitida o una corrida simulada no acredita el
gate. La evidencia registra commit/base, hashes aprobados, resultados, conteos, omisiones,
identificador y precisión del modelo, latencia y cumplimiento de cada umbral.

## Intervenciones del usuario y acciones reservadas

| Paso | Qué hace el usuario | Cómo se verifica después |
|---|---|---|
| Antes de M25a.2 | Verifica que `0017` quedó aplicada al proyecto `app` | Verificación operativa posterior a M25a.1, sin suites contra `app` |
| Aprobación de spec/plan | Aprueba cada artefacto solo después de auditoría `APROBABLE` | Estado e hash quedan vinculados por el pipeline |
| Al habilitar M25a.2 | Crea la cuenta de DeepInfra y carga `DEEPINFRA_API_KEY` | Presencia y llamada controlada, sin mostrar ni registrar el valor |
| Cierre | Aprueba `G-VR02` después de pruebas e informe | `PROJECT_STATE.md` se actualiza solo por pedido explícito |

## Trampas y riesgos

1. Enviar todo el contexto al modelo solo porque existe en memoria.
2. Truncar de 12.000 a 500 sin que el comportamiento esté decidido y visible.
3. Mantener dos historiales que diverjan ante respuesta, error o reintento.
4. Usar el timeout de cada llamada como si fuera duración total del turno.
5. Aplicar concurrencia con una identidad aportada por el cliente.
6. Aceptar un número porque aparece en algún resultado sin validar metadatos y referencia.
7. Confiar en JSON válido sin esquema estricto y validación Zod.
8. Mostrar contenido rechazado junto a una advertencia en vez de abstener.
9. Duplicar persistencia o funciones ya acreditadas en M25a.1.
10. Registrar preguntas, respuestas, resultados o el cuerpo de errores del proveedor.
11. Presentar unit tests con `fetch` simulado como validación de DeepInfra o VR-02.
12. Cambiar host/modelo como primera respuesta a un fallo de evaluación.

## Decisiones de la microfase

| ID | Decisión | Motivo | Decidió | Fecha |
|---|---|---|---|---|
| D-M25a.2-00 | Autorizar anticipadamente esta documentación sin habilitar planificación ni implementación | Preparar la integración sin alterar dependencias | Usuario | 2026-11-03 |
| D-M25a.2-01 | Aplicar la distribución de responsabilidades fijada por la Enmienda M25a | La Parte I aprobada es la autoridad superior | Usuario, en la ruta | 2026-11-01 |
| D-M25a.2-02 | Registrar `context.ts` y `chat-context.test.ts` como ubicaciones candidatas, sin autorizar por ello implementación | Preservar el trabajo actual y hacerlo auditable dentro de M25a.2 | Usuario | 2026-11-03 |
| D-M25a.2-03 | No inferir que el contexto visible se envía completo al modelo | CA-61 define visibilidad y no define memoria del modelo | Usuario | 2026-11-03 |
| D-M25a.2-04 | Documentar 12.000 frente a 500 sin elegir un valor arbitrario | La ruta no resuelve todavía esa relación | Usuario | 2026-11-03 |
| D-M25a.2-05 | Conservar todo el historial visible durante la sesión activa de la pantalla y mantener en memoria del modelo solo los últimos `6` turnos completos y exitosos, con pregunta redactada y respuesta validada | Cerrar la frontera entre historial visible y memoria del modelo | Usuario | 2026-11-03 |
| D-M25a.2-06 | Aplicar un máximo agregado de `12.000` puntos de código a la memoria; descartar turnos completos antiguos y no cortar mensajes | Acotar memoria sin alterar el historial visible | Usuario | 2026-11-03 |
| D-M25a.2-07 | Enviar la memoria solo a la selección de herramientas, como contexto no autoritativo; excluirla de la evidencia y de la entrada de la respuesta final | Mantener la guarda ligada exclusivamente al turno actual | Usuario | 2026-11-03 |
| D-M25a.2-08 | Excluir errores, reintentos fallidos y abstenciones de la memoria del modelo, aunque permanezcan visibles | Evitar contaminar el contexto con intentos no exitosos | Usuario | 2026-11-03 |
| D-M25a.2-09 | Mantener el contexto solo en memoria y reiniciarlo al abandonar la pantalla, recargar o cambiar de usuario o empresa | Cumplir CA-61 y evitar persistir el texto original | Usuario | 2026-11-03 |
| D-M25a.2-10 | Separar `500` por pregunta redactada de `12.000` agregados para memoria; redactar antes de validar y rechazar el exceso sin truncado silencioso | Cerrar la discrepancia visible sin duplicar la propiedad de M25a.1 | Usuario | 2026-11-03 |
| D-M25a.2-11 | Aplicar `4` llamadas a herramientas, `800` tokens por cada llamada al modelo, `1` turno concurrente por usuario y `60` segundos de deadline total | Confirmar los valores de CA-70 asignados a M25a.2 | Usuario | 2026-11-03 |
| D-M25a.2-12 | Autorizar antes de `G-CHAT-BASE` únicamente el núcleo puro y unitario del contexto conversacional en `context.ts` y su prueba, conforme a D-M25a.2-05 a D-M25a.2-10, sin UI, modelo, integración, persistencia ni contratos externos | Avanzar una pieza independiente sin habilitar M25a.2 completa ni alterar sus dependencias o gates | Usuario | 2026-11-06 |

D-M25a.2-12 reemplaza únicamente el efecto no habilitante de D-M25a.2-02 para estos dos
archivos y este corte limitado; no altera el estado ni el alcance del resto de la spec.

## Preguntas cerradas

| ID | Resolución | Decisión |
|---|---|---|
| Q-M25a.2-01 | La memoria usa solo los últimos seis turnos completos y exitosos y llega únicamente a la selección de herramientas | D-M25a.2-05; D-M25a.2-07; D-M25a.2-08 |
| Q-M25a.2-02 | Máximo de seis turnos y 12.000 puntos agregados, con descarte de turnos completos antiguos | D-M25a.2-05; D-M25a.2-06; D-M25a.2-08 |
| Q-M25a.2-03 | 500 puntos por pregunta redactada y 12.000 agregados para memoria, sin truncado silencioso | D-M25a.1-05; D-M25a.2-10 |
| Q-M25a.2-09 | Memoria de la pantalla reiniciada al abandonarla, recargar o cambiar usuario/empresa | D-M25a.2-09 |

## Supuestos e hipótesis

| ID | Hipótesis | Cómo y cuándo se verifica |
|---|---|---|
| H-M25a.2-01 | M25a.1 entregará resultados suficientes para la presentación completa | Revisar contratos y pruebas al aprobar `G-CHAT-BASE` |
| H-M25a.2-02 | El repository devolverá un identificador opaco utilizable por feedback sin exponer tenant | Revisar spec y recorrido real de M25a.1 |
| H-M25a.2-03 | DeepInfra admite el esquema estricto requerido con el modelo fijado | Verificar en VR-02; una simulación no confirma la hipótesis |
| H-M25a.2-04 | El turno puede aplicar un deadline total dentro del runtime configurado | Probar herramientas, dos llamadas y latencia p95 antes de VR-02 |

Una hipótesis refutada se transforma en pregunta o hallazgo; no amplía silenciosamente el
alcance.

## Preguntas abiertas

| ID | Pregunta | Opciones | Recomendación | Evidencia |
|---|---|---|---|---|
| Q-M25a.2-04 | ¿Qué mecanismo server-side aplica un turno concurrente por usuario y un deadline total? | Los valores están aprobados en 1 turno y 60 s totales; falta definir el mecanismo sin identidad del cliente ni persistencia no autorizada | Solución mínima, inyectable y verificable; D-M25a.2-11 no cierra el mecanismo | CA-70; II.13 paso 7 |
| Q-M25a.2-05 | ¿Cuál es la firma pública de las Actions y su resultado para UI/reintento/feedback? | Derivarla del repository y del identificador opaco aprobados | Esperar `G-CHAT-BASE`; no inventar DTO | II.13 paso 7 |
| Q-M25a.2-06 | ¿Qué forma concreta usa la presentación para cobertura, parciales y frescura? | Derivarla del resultado real de M25a.1 | Esperar contrato final; no duplicar DTO | CA-51/51b; II.13 paso 6 |
| Q-M25a.2-07 | ¿Cuál es el texto exacto del aviso de CA-65? | Fijar una copia que declare registro, finalidad y límites de redacción sin ampliar la política | Resolver antes del plan y prueba de componente | CA-65 y límite declarado de CA-66 |
| Q-M25a.2-08 | ¿M25a.2 actualiza `SECURITY.md` y/o `ARCHITECTURE.md` al pasar el modelo y chat de previstos a vigentes? | A: no cambia propiedades; B: requiere autorización de archivos transversales | Evaluar antes del plan; si B, cambiar la ruta antes de editar | Contrato documental de `AGENTS.md` |

Mientras estas preguntas sigan abiertas o falte `G-CHAT-BASE`, la spec no puede declararse
`APROBABLE`.

## Hallazgos relacionados

- `H-E1-22`: su parte persistente pertenece a M16c y llega a M25a.2 solo a través de
  M25a.1; esta microfase no la sustituye.

No se asignan IDs canónicos nuevos en este borrador. Los pendientes técnicos viven aquí
hasta que una revisión confirme que alguno debe registrarse en `docs/HALLAZGOS.md`.

## Auditorías

- Auditoría formal de esta versión: pendiente.
- No existe todavía un informe en `docs/FASES/FASE1/M25a.2/revisiones/`.

Hasta resolver preguntas, recibir dependencias, volver a auditar y obtener aprobación
expresa, el único estado válido es:

**BORRADOR ANTICIPADO — NO APROBADO — NO HABILITANTE.**
