# M25a.2 — Plan de cortes anticipados unitarios

**Estado:** APROBADO PARA EJECUCIÓN LIMITADA — CONTEXTO Y GUARDA PURA

**Aprobación:** usuario, 2026-11-06

**Autoridad:** Enmiendas M25a.2 del 2026-11-06 en
`docs/FASES/FASE1/meta_first/plan.md` y decisiones `D-M25a.2-12` y `D-M25a.2-13` de la spec.

**Límite:** este plan cubre únicamente los cortes puros y unitarios de contexto y de
salida/guarda. No cubre M25a.2 completa, no requiere ni aprueba `G-CHAT-BASE`, no produce
`G-VR02` y no habilita trabajo sucesor.

## Objetivo

Implementar y verificar exclusivamente:

1. el núcleo puro y unitario de la memoria conversacional efímera; y
2. el núcleo puro y unitario de salida estructurada, detección de candidatos y guarda
   determinística sobre evidencia candidata.

Ningún bloque integra UI, modelo, servidor, herramientas reales, persistencia o contratos
externos.

## Condición de entrada

- Las Enmiendas M25a.2 del 2026-11-06 están aprobadas y vigentes.
- `D-M25a.2-05` a `D-M25a.2-10`, `D-M25a.2-12` y `D-M25a.2-13` están aprobadas.
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

## Criterio de aceptación

- Las pruebas unitarias dirigidas de contexto, salida, candidatos, guarda y adaptación
  terminan aprobadas.
- La salida y los claims validan con schemas estrictos y toda afirmación verificable queda
  respaldada o es rechazada.
- Las referencias solo resuelven contra evidencia sintética del turno actual.
- `tools/results.ts` es dueño del contrato candidato y no depende de `guard.ts`.
- No existe `chat-adversarial.test.ts` creado o restaurado por este corte.
- `npm run verify` termina aprobado.
- `git diff --check` termina aprobado.
- La evidencia no afirma que M25a.2, `G-CHAT-BASE` o `G-VR02` estén aprobados.
- No existe integración ni acceso a almacenamiento, red o contratos externos.

## Fuera de alcance

- UI e historial visual;
- DeepInfra, adaptadores del modelo y prompts;
- orquestador, render, ejecutores y herramientas reales;
- Server Actions, feedback y pruebas de aplicación;
- SQL, migraciones, pgTAP, RPCs, repositories y DTOs;
- M16c y el resto de M25a.1;
- `tests/unit/chat-adversarial.test.ts`;
- consumo del contexto por el modelo; y
- VR-02.

## Condiciones de parada

- Hace falta modificar un archivo no enumerado.
- El contrato exige identidad, tenant, persistencia, red o una integración externa.
- Una prueba solo puede pasar ampliando el corte.
- Aparece una contradicción con D-M25a.2-05 a D-M25a.2-10, D-M25a.2-12,
  D-M25a.2-13 o con la ruta vigente.

## Resultado del cierre limitado

El cierre de este plan acredita únicamente los núcleos unitarios del contexto efímero y de
salida/guarda pura sobre evidencia candidata. No acredita integración ni un contrato final
de resultados. M25a.2 completa continúa bloqueada por `G-CHAT-BASE`, la aplicación
verificada de `0017`, la aprobación de su spec completa y el resto de sus dependencias. No
se inicia ninguna tarea sucesora.
