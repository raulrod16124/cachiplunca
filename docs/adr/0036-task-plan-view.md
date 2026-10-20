# ADR-0036: Vista Plan de tareas derivada del canvas (PBL-009)

**Fecha:** 2026-10-20
**Estado:** Aceptado
**Tarea:** PBL-009 — Vista Plan de tareas (`docs/post-mvp-backlog.md`)

## Contexto

El workspace ya guarda las tareas como `TaskElement` dentro de `elements`, y el board recibe cambios locales y remotos por el mismo estado. PBL-009 pide una lectura de plan consultable sin salir del workspace, sin introducir un modelo de proyecto paralelo ni duplicar el estado de las tareas.

El canvas ya expone `CanvasCommandHandle.focusElement`, que selecciona un elemento y centra el viewport conservando el zoom (ADR-0035). La actualización de estado ya existe en `UpdateElement`, con historial, persistencia optimista y reconciliación remota.

## Decisión

1. **El plan se deriva de `elements`.** `selectTaskPlan(elements, filters)` vive en Application, es puro y devuelve grupos por estado en el orden canónico de `TASK_STATUSES`. Ignora elementos que no sean tareas, ordena por vencimiento ascendente (sin fecha al final) y no muta la entrada. No se crea entidad `Plan` ni store nuevo.

2. **Los filtros son estado efímero de Presentation.** El panel mantiene únicamente `status` y `onlyMine` en estado local. No se persisten ni se mezclan con el estado del board.

3. **El panel es una vista lateral del workspace.** `TaskPlanPanel` se compone en el layout junto al canvas, no como un modal ni una pantalla nueva. El canvas reduce su ancho cuando el panel está abierto, de modo que `CanvasViewportStore.center` sigue centrando correctamente y el panel no tapa el contenido.

4. **Selección y cambio de estado reutilizan la infraestructura existente.** Seleccionar una tarea llama a `CanvasCommandHandle.focusElement`; cambiar el estado construye un `UpdateElementInput` de tipo `task`. Así se heredan selección, centrado, historial, undo/redo, persistencia y realtime sin duplicar lógica.

5. **Solo lectura se refleja en la UI.** En modo lectura el panel muestra badges de estado y no ofrece controles de cambio. La autorización efectiva sigue viviendo en las reglas y en los permisos de Application.

6. **El asignado se muestra con el identificador corto.** No existe un directorio de usuarios en el workspace; se reutiliza `shortUserId`, el mismo criterio que la presencia y la lista de miembros (ADR-0024).

## Alternativas consideradas

- **Crear una entidad `Plan` o un store de tareas:** rechazado; duplicaría la fuente de verdad y quedaría desincronizado del canvas y de realtime.
- **Panel flotante sobre el canvas:** rechazado como opción principal; el centrado del viewport se calcularía sobre un área parcialmente tapada por el panel.
- **Pantalla o ruta separada:** rechazado; el objetivo es consultar el plan sin salir del workspace.
- **Reimplementar la selección/centrado dentro del panel:** rechazado; `CanvasCommandHandle.focusElement` ya cubre el comportamiento y evita dos implementaciones.

## Consecuencias

- El plan refleja automáticamente cambios locales y remotos porque se recalcula desde `elements`.
- No hay cambios de dominio, persistencia, reglas ni dependencias.
- Los filtros y el estado del panel se pierden al cerrar la vista, que es el comportamiento esperado para una lectura temporal.
- PBL-010 y PBL-011 pueden reutilizar el selector y el patrón de actualización de estado sin introducir un modelo nuevo.
