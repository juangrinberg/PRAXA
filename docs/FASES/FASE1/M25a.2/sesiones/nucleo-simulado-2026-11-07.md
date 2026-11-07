# M25a.2 — Evidencia del núcleo simulado

## Alcance

Esta sesión acredita únicamente los cortes limitados e independientes de infraestructura
externa:

- contexto efímero de turnos completos y exitosos;
- salida estructurada, candidatos numéricos y guarda determinística;
- render seguro con abstención controlada;
- adaptador `server-only` probado con transporte y respuestas sintéticas; y
- orquestación simulada con modelo, ejecutor y señal de turno inyectados.

El recorrido verificado une contexto, selección, ejecución inyectada, respuesta, guarda,
render y actualización del contexto sin realizar integración real.

## Aprobación del cierre limitado

Fecha: `2026-11-07`.

> “Apruebo el cierre limitado verificado de los cortes anticipados de M25a.1 y del núcleo simulado de M25a.2 en el commit `f8a0b8bce563456365217b86bc6d91a116d78aae`, sin aprobar las fases completas ni sus gates.”

El commit aprobado es `f8a0b8bce563456365217b86bc6d91a116d78aae`. Esta aprobación se
limita a los cortes verificados y no alcanza M25a.1 completa, M25a.2 completa ni sus gates.

## Revisión de Git

- Rama verificada: `mf/M25a1-independent`.
- HEAD verificado al iniciar el cierre: `e51f748d2bd583a0ae52f188ac115c59ec1561c6`.
- El working tree y el índice estaban limpios.
- Commits relevantes:
  - `c1b5c9597bc1279b040e4c3413778236f68a98da`;
  - `e51f748d2bd583a0ae52f188ac115c59ec1561c6`.

## Archivos del núcleo

- `src/modules/chat/context.ts`
- `src/modules/chat/output-schema.ts`
- `src/modules/chat/numeric-candidates.ts`
- `src/modules/chat/guard.ts`
- `src/modules/chat/tools/results.ts`
- `src/modules/chat/render.ts`
- `src/modules/chat/llm.ts`
- `src/modules/chat/orchestrator.ts`
- `tests/unit/chat-context.test.ts`
- `tests/unit/chat-guard.test.ts`
- `tests/unit/chat-tools.test.ts`
- `tests/unit/chat-render.test.ts`
- `tests/unit/chat-llm.test.ts`
- `tests/unit/chat-orchestrator.test.ts`

## Evidencia TDD resumida

### Contexto

Las pruebas fijaron primero turnos exitosos, máximo de seis turnos, presupuesto agregado de
12.000 puntos de código, descarte de turnos completos, snapshots estrictos, copias defensivas
e inmutabilidad. La lectura posterior acepta `unknown`, revalida el total y los límites y
devuelve solo turnos seguros.

### Salida y guarda

Las pruebas precedieron al schema estricto, al detector de cifras y a la guarda. Cubren
formatos es-AR, referencias del turno actual, precisión decimal textual, cifras inventadas,
claims inválidos y comparaciones sin respaldo. Toda afirmación verificable se respalda o se
rechaza.

### Render

Las pruebas definieron primero respuestas completas, cobertura parcial, resultados inválidos
y abstención controlada. El render nunca devuelve texto rechazado y congela respuestas y
claims.

### Adaptador sintético

Las pruebas usan una función de transporte inyectada y respuestas sintéticas. Cubren modelo y
endpoint fijos, JSON Schema estricto, señal recibida, HTTP, timeout, transporte, contenido
inválido y modelo reportado inesperado, sin llamada real ni secreto real.

### Orquestación simulada

Las pruebas se escribieron antes de recuperar el candidato histórico. El rojo funcional
registró la ausencia de contexto consumido, señal compartida, máximo de cuatro llamadas y
`nextContext`. La implementación final revalida entrada, selección y resultados; asigna IDs
en servidor; comparte una única señal de 60.000 ms; mantiene la memoria fuera de la evidencia
final; y solo incorpora al contexto respuestas aceptadas.

## Comandos y resultados del cierre

```text
npm run test:unit -- tests/unit/chat-redaction.test.ts tests/unit/chat-context.test.ts tests/unit/chat-limits.test.ts tests/unit/chat-tools.test.ts tests/unit/chat-guard.test.ts tests/unit/chat-render.test.ts tests/unit/chat-llm.test.ts tests/unit/chat-orchestrator.test.ts
```

Resultado: `8` archivos de prueba aprobados, `242` pruebas aprobadas, exit `0`.

```text
npm run verify
```

Resultado: exit `0`.

- ESLint: aprobado.
- Generación de tipos de rutas: aprobada.
- TypeScript (`tsc --noEmit`): aprobado.
- Vitest unitario y de componentes: `34` archivos y `833` pruebas aprobadas.
- Build de Next.js: compilación, TypeScript, generación de páginas y optimización final
  aprobadas.

```text
git diff --check
git diff --check origin/main
```

Resultado: ambos comandos terminaron con exit `0`.

## Fronteras comprobadas

En estos cortes no hubo:

- red real ni acreditación del proveedor;
- secretos reales;
- SQL, migraciones o pgTAP;
- persistencia;
- UI conectada;
- Server Actions;
- repository; ni
- implementación o modificación de M16c.

## Limitaciones

- No acredita M25a.2 completa.
- No acredita funcionamiento real de DeepInfra.
- No acredita `G-CHAT-BASE` ni `G-VR02`.
- La integración con contratos finales, herramientas reales, K01, registro, feedback y UI
  sigue pendiente.
