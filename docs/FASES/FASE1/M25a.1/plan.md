# M25a.1 — Plan del corte anticipado determinístico

**Estado:** IMPLEMENTADO Y VERIFICADO — CIERRE LIMITADO APROBADO POR EL USUARIO EL 2026-11-07

**Evidencia:** [corte anticipado del 2026-11-07](sesiones/corte-anticipado-2026-11-07.md)

**Base verificada del cierre:** `f8a0b8bce563456365217b86bc6d91a116d78aae`

**Alcance de aprobación:** solo el cierre limitado; no aprueba M25a.1 completa, M25a.2
completa, `G-CHAT-BASE` ni `G-VR02`.

**Aprobación:** usuario, 2026-11-03

**Autoridad:** Enmienda M25a.1 del 2026-11-03 en
`docs/FASES/FASE1/meta_first/plan.md` y decisiones `D-M25a.1-05` a
`D-M25a.1-08`

**Límite:** este plan no cubre la implementación completa de M25a.1, no depende de
`G-SYNC`, no produce `G-CHAT-BASE` y no habilita M25a.2.

## Objetivo

Implementar y verificar solamente las primitivas determinísticas que no dependen de M16c:

1. redacción CA-66 hasta 500 puntos de código, sin truncado silencioso;
2. configuración compartida de CA-70 y validación TypeScript del período de 93 días;
3. catálogo y schemas estrictos de entrada de las cuatro herramientas; y
4. propiedad correcta del schema candidato de evidencia y separación de sus pruebas.

## Condición de entrada

- La Enmienda M25a.1 del 2026-11-03 está aprobada y vigente.
- `D-M25a.1-05` a `D-M25a.1-08` están aprobadas.
- Los cambios locales preexistentes se preservan; no se restaura ni reemplaza ningún archivo.
- La ausencia de `G-SYNC` no bloquea este corte, pero sí cualquier trabajo fuera de su lista
  cerrada.

## Alcance autorizado y procedimiento

### Bloque 1 — Redacción

Pruebas primero en `tests/unit/chat-redaction.test.ts`:

- conservar los patrones, prioridades, determinismo e idempotencia exigidos por CA-66;
- contar puntos de código;
- redactar todo el texto antes de validar su longitud;
- aceptar un resultado redactado de hasta 500 puntos de código; y
- rechazar explícitamente un resultado redactado mayor, sin devolver texto truncado.

Implementación limitada a `src/modules/chat/redaction.ts`. No se agrega persistencia, Action
ni llamada al modelo.

### Bloque 2 — Configuración y período

Pruebas primero en `tests/unit/chat-limits.test.ts` y `tests/unit/chat-tools.test.ts`:

- configuración inmutable con 93 días, 4 llamadas, 800 tokens, 1 turno concurrente y 60
  segundos totales;
- conteo inclusivo de días calendario; y
- rechazo en el schema TypeScript de períodos mayores a 93 días.

Implementación limitada a `src/modules/chat/limits.ts` y a la validación del período en
`src/modules/chat/tools/schema.ts`. No se aplican los otros cuatro límites en modelo,
orquestador o Actions. No se agrega enforcement SQL.

### Bloque 3 — Catálogo cerrado

Pruebas primero en `tests/unit/chat-tools.test.ts`:

- aceptar exactamente `coverage(period)`, `daily_series(metric, period)`,
  `total(metric, period)` y `connection_status()`;
- limitar `metric` a `spend` o `impressions`;
- rechazar propiedades adicionales y argumentos de tenant, conexión, cuenta, tabla o SQL; y
- reutilizar `periodSchema` sin definir DTOs de resultado.

Implementación limitada a `src/modules/chat/tools/schema.ts`.

### Bloque 4 — Propiedad de evidencia y separación de pruebas

Sin cambiar la forma candidata del schema de evidencia:

- `src/modules/chat/tools/results.ts` pasa a ser dueño del schema y tipo candidatos;
- `src/modules/chat/guard.ts` los consume y no cambia su comportamiento;
- los casos de adaptación de resultados pasan de `tests/unit/chat-adversarial.test.ts` a
  `tests/unit/chat-tools.test.ts`; y
- las pruebas de guarda y orquestador permanecen en sus suites actuales.

Este bloque no completa presencia, estado temporal, captura parcial, frescura,
`connection_status` ni ningún contrato pendiente de M16c.

### Bloque 5 — Estado arquitectónico

Solo después de que los bloques anteriores existan y pasen sus verificaciones, actualizar
`docs/ARCHITECTURE.md` para:

- marcar el módulo `chat` como parcial;
- identificar redacción, configuración y schemas como existentes; y
- mantener ejecutor, SQL, repository, Actions, modelo y recorrido completo como previstos.

No modificar `docs/SECURITY.md`: el corte no vuelve vigente ningún control integrado ni
cambia amenazas, fronteras, privilegios, secretos o invariantes.

## Archivos autorizados

- `src/modules/chat/redaction.ts`
- `src/modules/chat/limits.ts`
- `src/modules/chat/tools/schema.ts`
- `src/modules/chat/tools/results.ts`, solo para la reorganización aprobada
- `src/modules/chat/guard.ts`, solo para consumir el schema desde su nuevo dueño
- `tests/unit/chat-redaction.test.ts`
- `tests/unit/chat-limits.test.ts`
- `tests/unit/chat-tools.test.ts`
- `tests/unit/chat-adversarial.test.ts`, solo para retirar los casos trasladados
- `docs/ARCHITECTURE.md`, únicamente al cierre y conforme al Bloque 5
- documentos de evidencia y revisión autorizados por el pipeline

Si hace falta modificar otro archivo, el corte se detiene y se solicita una enmienda.

## Exclusiones obligatorias

No se implementan ni modifican:

- SQL, migraciones o pgTAP;
- `0017_chat_queries.sql`;
- `worker_api`, su allowlist, firmas o casts;
- repository o Server Actions;
- ejecutor real de herramientas;
- DTOs, RPCs o contratos de M16c;
- forma final de resultados, `connection_status`, presencia, estado temporal, captura parcial
  o frescura;
- `purge_connection`, CA-38c o pruebas de aplicación;
- modelo, orquestador, UI, contexto conversacional o feedback; y
- `docs/SECURITY.md`.

## Comprobaciones

Primero, pruebas unitarias dirigidas:

```bash
npm run test:unit -- tests/unit/chat-redaction.test.ts tests/unit/chat-limits.test.ts tests/unit/chat-tools.test.ts tests/unit/chat-guard.test.ts tests/unit/chat-adversarial.test.ts
```

Después, verificación completa del repositorio:

```bash
npm run verify
git diff --check
```

`npm run verify` ejecuta realmente, en este orden:

1. `npm run lint`;
2. `npm run typegen` (`next typegen`);
3. `npm run typecheck` (`tsc --noEmit`);
4. `npm run test` (proyectos Vitest `unit` y `component`); y
5. `npm run build` (`next build`).

Este corte no exige ni ejecuta `npm run test:policies` ni `npm run test:app`.

## Criterios de aceptación del corte

1. La redacción cumple CA-66, redacta antes de validar y rechaza explícitamente más de 500
   puntos de código sin truncar.
2. La configuración expone exactamente los cinco valores aprobados y permanece inmutable.
3. El schema TypeScript rechaza períodos mayores a 93 días calendario inclusivos.
4. El catálogo admite solo las cuatro herramientas y sus argumentos cerrados.
5. `tools/results.ts` no depende de `guard.ts`; la guarda consume el schema candidato sin
   cambio de comportamiento.
6. Las pruebas de adaptación pertenecen a `chat-tools.test.ts` y la suite adversaria conserva
   solo las responsabilidades de M25a.2.
7. `docs/ARCHITECTURE.md` refleja el estado parcial real, sin presentar integración prevista
   como existente.
8. Las pruebas dirigidas, `npm run verify` y `git diff --check` terminan correctamente.

## Resultado y límites del cierre

El cierre de este plan acredita solo el corte anticipado. No acredita:

- M25a.1 completa;
- `G-CHAT-BASE`;
- ejecución real de herramientas;
- persistencia, aislamiento SQL o feedback; ni
- habilitación de M25a.2.

Todo trabajo restante espera `G-SYNC`, los contratos finales de M16c y el plan completo de
M25a.1.

## Condiciones de parada

Detenerse y reportar si:

- una corrección exige un archivo no autorizado;
- hace falta definir un DTO, RPC, firma, cast o resultado de M16c;
- una prueba requiere SQL, pgTAP, `test:app` o una conexión real;
- la reorganización exige cambiar el comportamiento de la guarda; o
- dos iteraciones de corrección no convergen.
