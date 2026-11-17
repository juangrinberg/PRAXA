# Segunda enmienda M26b — Unificación documental

**Estado:** APROBADA por el usuario el 2026-11-16 e integrada documentalmente en la ruta en esa fecha.

## 1. Objeto

Reemplazar las microfases `M26b.1` y `M26b.2` por una única microfase `M26b`, una única spec y un único plan, sin reducir el alcance, las 18 decisiones originales, los 22 criterios operativos ni los 29 casos de prueba.

Esta enmienda no aprueba la nueva spec ni un plan, no autoriza implementación, no cierra el checkpoint ni el gate final y no modifica código.

## 2. Decisiones expresas

| ID | Decisión | Motivo | Usuario | Fecha |
|---|---|---|---|---|
| D-EM26b-U-01 | Una sola microfase `M26b`, una sola spec `M26b/spec.md` y un solo plan | Unificar el recorrido documental y operativo | Usuario | 2026-11-16 |
| D-EM26b-U-02 | Excepción expresa al límite ordinario de ocho horas; D-M26b-08 queda histórica y superada | Conservar íntegramente el alcance sin volver a dividir M26b | Usuario | 2026-11-16 |
| D-EM26b-U-03 | `G-STRATEGY-ENGINE` queda como checkpoint interno y `G-STRATEGIES` como único gate final | Mantener una revisión intermedia del motor sin crear una sucesora artificial | Usuario | 2026-11-16 |

## 3. Alcance que se conserva

- Motor determinístico R1–R4, contrato versionado, adaptador server-only y aritmética decimal.
- Umbrales 30/25/25, pisos 1000/100/30, muestra asimétrica aprobada y comparación solo contra historial propio.
- Acciones manuales cerradas; sin LLM autoritativo, montos, porcentajes, promesas, causalidad ni automatización.
- Interfaz protegida, estados honestos, tarjetas accesibles, navegación y enlace a Diagnóstico.
- Demo sintética exclusiva, recorrido autenticado real, pruebas unitarias, de componentes, app, RLS, seguridad y rendimiento.
- Cero persistencia nueva, SQL, RPC, migraciones, escritura externa o integración con chat.

M16f, `G-TIENDA`, `G-GA4-FUSION` y todos los demás compromisos de la ruta permanecen intactos.

## 4. Dependencias y gates

| Elemento | Regla unificada |
|---|---|
| Entrada de M26b | `G-DIAG` cerrado, código M25b integrado, spec y plan únicos aprobados y pedido expreso del usuario |
| `G-STRATEGY-ENGINE` | Checkpoint interno después de verificar motor, adaptador y sus pruebas; requiere aprobación expresa y no cierra M26b |
| Continuación a interfaz/demo | Mismo plan y misma microfase; solo por pedido expreso posterior al checkpoint |
| `G-ANOMALIES` | No bloquea comenzar M26b ni el checkpoint; bloquea `G-STRATEGIES` |
| `G-STRATEGIES` | Único gate final; requiere checkpoint, `G-ANOMALIES`, todas las pruebas y los recorridos real/demo |
| M28.3a | Sigue requiriendo `G-STRATEGIES` además de todas sus dependencias anteriores |

El paralelismo con M16f es únicamente de planificación. `AGENTS.md` sigue exigiendo una microfase por vez y solo a pedido del usuario.

## 5. Cambios autorizados

- `docs/FASES/FASE1/meta_first/plan.md`: sustituir las dos fichas y las dos secciones por M26b, registrar la excepción y convertir el gate intermedio en checkpoint.
- `docs/FASES/FASE1/meta_first/spec.md`: enmendar DEC-26, el título de §16b, CA-91, CA-93 y CA-94, sin cambiar los contratos funcionales.
- `docs/PROJECT_STATE.md`: mostrar M26b como única siguiente habilitada y eliminar la espera artificial de M26b.2.
- `docs/FASES/FASE1/M26b/spec.md`: consolidar la única definición normativa.
- `docs/FASES/FASE1/M26b/revisiones/spec-audit-1.md`: conservar como antecedente la auditoría de M26b.1 y declarar que su dictamen no se transfiere.
- Retirar `docs/FASES/FASE1/M26b.1/spec.md` y `docs/FASES/FASE1/M26b.2/spec.md` únicamente después de verificar la consolidación.

## 6. Incorporación de la auditoría anterior

La spec unificada debe resolver:

- A-01: IDs R1 incluyen anomalía/métrica/regla en la clave canónica.
- A-02: la demo forma parte del mismo corte y su rama se define antes de dependencias reales.
- A-03: contratos, catálogos, estados, errores, contadores, período siguiente y helper M25b quedan exhaustivos.
- A-04: matriz total de acción, prioridad, calidad, warning y omisión.
- A-05: referencia vigente y descripción correcta de las métricas históricas de campaña.
- A-06: trazabilidad completa y comandos reproducibles.
- A-07: precedencia determinística de compatibilidad con los campos existentes, sin SQL/RPC nueva ni causas inventadas.

La auditoría sigue con dictamen `REQUIERE CORRECCIONES` sobre su hash histórico. La spec unificada permanece `BORRADOR` y requiere una auditoría nueva.

## 7. Verificación de migración

Antes de retirar las specs hijas se exige:

1. exactamente 18 IDs `D-M26b-01` a `D-M26b-18`, con texto, motivo, responsable y fecha originales;
2. exactamente 22 IDs `M26b-C-01` a `M26b-C-22`;
3. exactamente 29 IDs `M26b-T-01` a `M26b-T-29`;
4. cero definiciones duplicadas o IDs huérfanos;
5. todos los archivos de implementación de las dos fichas anteriores dentro de la ficha unificada;
6. ninguna referencia normativa activa a una spec hija retirada;
7. `git diff --check` sin errores.

## 8. Exclusiones

- No aprobar la spec ni crear/aprobar un plan.
- No implementar código, ejecutar despliegues ni cerrar gates.
- No hacer commit, push o merge.
- No reducir pruebas, criterios, decisiones, seguridad, aislamiento, read-only o condiciones comerciales.
- No volver a dividir M26b sin una nueva decisión expresa del usuario.
