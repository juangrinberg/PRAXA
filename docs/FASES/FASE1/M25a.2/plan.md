# M25a.2 — Plan del corte anticipado de contexto

**Estado:** APROBADO PARA EJECUCIÓN LIMITADA — SOLO CONTEXTO UNITARIO

**Aprobación:** usuario, 2026-11-06

**Autoridad:** Enmienda M25a.2 del 2026-11-06 en
`docs/FASES/FASE1/meta_first/plan.md` y decisión `D-M25a.2-12` de la spec.

**Límite:** este plan no cubre M25a.2 completa, no requiere ni aprueba `G-CHAT-BASE`, no
produce `G-VR02` y no habilita trabajo sucesor.

## Objetivo

Implementar y verificar exclusivamente el núcleo puro y unitario de la memoria conversacional
efímera, sin integración con UI, modelo, servidor, herramientas, persistencia o contratos
externos.

## Condición de entrada

- La Enmienda M25a.2 del 2026-11-06 está aprobada y vigente.
- `D-M25a.2-05` a `D-M25a.2-10` y `D-M25a.2-12` están aprobadas.
- La ausencia de `G-CHAT-BASE` no bloquea este corte, pero sí todo trabajo fuera de su lista
  cerrada.
- Los cambios locales preexistentes se preservan.

## Archivos autorizados

- `src/modules/chat/context.ts`
- `tests/unit/chat-context.test.ts`
- `docs/FASES/FASE1/meta_first/plan.md`
- `docs/FASES/FASE1/M25a.2/spec.md`
- `docs/FASES/FASE1/M25a.2/plan.md`
- `docs/PROJECT_STATE.md`

Ningún otro archivo puede modificarse dentro de este corte.

## Contrato obligatorio

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

## Procedimiento TDD

1. Escribir primero las pruebas de `tests/unit/chat-context.test.ts`.
2. Ejecutar la prueba dirigida y registrar el fallo esperado.
3. Implementar únicamente `src/modules/chat/context.ts` hasta satisfacer el contrato.
4. Ejecutar la prueba dirigida.
5. Ejecutar `npm run verify`.
6. Ejecutar `git diff --check` y revisar que solo existan archivos autorizados.

## Pruebas previstas

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

## Criterio de aceptación

- La prueba unitaria dirigida termina aprobada.
- `npm run verify` termina aprobado.
- `git diff --check` termina aprobado.
- La evidencia no afirma que M25a.2, `G-CHAT-BASE` o `G-VR02` estén aprobados.
- No existe integración ni acceso a almacenamiento, red o contratos externos.

## Fuera de alcance

- UI e historial visual;
- DeepInfra, adaptadores del modelo y prompts;
- orquestador, guarda, render y herramientas;
- Server Actions, feedback y pruebas de aplicación;
- SQL, migraciones, pgTAP, RPCs, repositories y DTOs;
- M16c y el resto de M25a.1;
- consumo del contexto por el modelo; y
- VR-02.

## Condiciones de parada

- Hace falta modificar un archivo no enumerado.
- El contrato exige identidad, tenant, persistencia, red o una integración externa.
- Una prueba solo puede pasar ampliando el corte.
- Aparece una contradicción con D-M25a.2-05 a D-M25a.2-10 o con la ruta vigente.

## Resultado del cierre limitado

El cierre de este plan acredita únicamente el núcleo unitario del contexto efímero. M25a.2
completa continúa bloqueada por `G-CHAT-BASE`, la aplicación verificada de `0017`, la
aprobación de su spec completa y el resto de sus dependencias. No se inicia ninguna tarea
sucesora.
