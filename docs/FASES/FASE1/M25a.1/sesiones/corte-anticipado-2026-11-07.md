# M25a.1 — Evidencia del corte anticipado determinístico

## Alcance

Esta sesión acredita únicamente el trabajo independiente de M16c autorizado por el plan de
M25a.1:

- redacción determinística de preguntas y límite de 500 puntos de código;
- configuración compartida de límites y período máximo inclusivo de 93 días;
- catálogo cerrado y schemas estrictos de las cuatro herramientas; y
- propiedad del schema candidato de evidencia en `tools/results.ts` y su adaptación pura.

No acredita la microfase completa ni habilita trabajo sucesor.

## Revisión de Git

- Rama verificada: `mf/M25a1-independent`.
- HEAD verificado al iniciar el cierre: `e51f748d2bd583a0ae52f188ac115c59ec1561c6`.
- El working tree y el índice estaban limpios.
- La historia propia de la rama contenía los commits relevantes:
  - `210d6651e2b74d86afd14085373b5af4fcb7722d`;
  - `4189b3b12c3066ec4dbf4477efaa154e390b4ad4`.

## Archivos del corte

- `src/modules/chat/redaction.ts`
- `src/modules/chat/limits.ts`
- `src/modules/chat/tools/schema.ts`
- `src/modules/chat/tools/results.ts`
- `src/modules/chat/guard.ts`
- `tests/unit/chat-redaction.test.ts`
- `tests/unit/chat-limits.test.ts`
- `tests/unit/chat-tools.test.ts`
- `tests/unit/chat-guard.test.ts`

## Evidencia TDD resumida

### Redacción

Las pruebas se escribieron antes de completar la implementación y cubren patrones sensibles,
prioridad, tarjetas con Luhn, CBU/CVU, identificadores externos, falsos positivos,
idempotencia, Unicode y el límite sin truncado. La regresión del importe
`+12.345.678,90` se reprodujo con una prueba fallida antes de ajustar la detección general de
teléfonos; luego quedó verde sin desactivar teléfonos internacionales válidos.

### Límites

Las pruebas fijaron primero los cinco valores compartidos, su inmutabilidad y el conteo
inclusivo de días calendario. La implementación posterior aceptó 93 días y rechazó 94,
incluidos períodos de un día, años bisiestos y fechas inválidas.

### Catálogo

Las pruebas definieron primero el catálogo cerrado de `connection_status`, `coverage`,
`daily_series` y `total`, los argumentos estrictos, las métricas permitidas y el rechazo de
identidad, conexión, cuenta, tablas y SQL. La implementación reutiliza el contrato de período
existente.

### Evidencia y adaptación candidata

Las pruebas verifican que `tools/results.ts` sea dueño del schema candidato, que la guarda lo
consuma sin dependencia inversa y que solo se adapten valores estructuralmente válidos
presentes en resultados sintéticos del turno. Esta forma no se presenta como contrato final.

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

## Limitaciones

- No hay SQL, migraciones ni pgTAP del chat.
- No hay herramientas ni ejecutor reales.
- No se fijan contratos finales de resultados ni contratos de M16c.
- `G-SYNC` sigue pendiente para el trabajo dependiente.
- Este cierre limitado no acredita M25a.1 completa ni `G-CHAT-BASE`.
- No se usaron secretos, datos reales ni cuerpos sensibles.
