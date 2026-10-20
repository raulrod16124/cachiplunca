# ADR-0037: Kanban del plan derivado del selector de PBL-009 (PBL-011)

**Fecha:** 2026-10-20
**Estado:** Aceptado

## Contexto

PBL-009 dejó el plan como una lista lateral derivada de `elements`, con `selectTaskPlan` omitiendo los grupos vacíos. PBL-011 pide una lectura por estado del mismo plan, con cuatro columnas, contadores y empty states por columna, sin crear estados, entidades ni stores nuevos.

La lista ya resuelve filtros (`status`, `onlyMine`), orden por vencimiento, selección vía `CanvasCommandHandle.focusElement` y cambio de estado vía `UpdateElement`. Duplicar esa lógica en el board habría creado dos fuentes de verdad.

## Decisión

1. **El board reutiliza el selector de PBL-009.** `selectTaskPlanBoard(elements, filters)` vive en Application junto a `selectTaskPlan`, comparte filtrado y orden, y devuelve una columna por cada `TASK_STATUSES` incluidas las vacías. `selectTaskPlan` se implementa como `selectTaskPlanBoard(...).filter(tasks.length > 0)`, de modo que la lista y el board no pueden divergir.

2. **La vista Lista/Board es estado efímero de Presentation.** El panel mantiene `view: 'list' | 'board'` en estado local, igual que los filtros (ADR-0036). No se persiste ni se comparte con el canvas.

3. **El toggle usa `Tabs` de `@raulrod/ui`.** Aporta tablist, roving tabindex, activación automática con flechas/Home/End y `tabpanel` asociado sin dependencias nuevas. Los paneles permanecen montados por el componente; el contenido inactivo no se renderiza para evitar duplicar nodos y consultas de test.

4. **Las columnas no exigen drag & drop.** El cambio de estado se hace desde un menú accesible (`DropdownMenu`) por tarjeta, reutilizando `onChangeStatus` y `UpdateElement`; el estado actual se marca con un check. En solo lectura no se muestra el menú: la columna ya comunica el estado.

5. **El panel se ensancha solo en la vista board.** Lista conserva el ancho estrecho de PBL-009 (`clamp(280px, 24vw, 360px)`); board usa `clamp(720px, 55vw, 960px)` con `max-width: calc(100vw - 280px)` para no asfixiar el canvas. El canvas sigue reduciéndose, por lo que `CanvasViewportStore.center` y `focusElement` mantienen su comportamiento.

6. **Las columnas se adaptan al ancho disponible sin scroll horizontal.** El grid usa 4 columnas iguales; a partir de 1280px de viewport pasa a 2 columnas (2×2) y a partir de 700px a una columna, de modo que las tarjetas nunca se comprimen ni obligan a desplazarse en horizontal. El scroll vertical queda en el body del panel.

7. **Tarjetas compactas y legibles.** El título se limita a dos líneas con ellipsis y `title` nativo; asignado y vencimiento se truncan en una línea cada uno para evitar texto apilado en columnas estrechas. El botón de menú (⋯) ocupa una esquina y deja el resto de la tarjeta como superficie de selección. Los contadores de columna usan la variante semántica de `TASK_STATUS_META` para escanear el board de un vistazo.

8. **Los empty states existentes mandan.** Sin tareas o sin coincidencias con los filtros se muestra el empty state global de PBL-009; el mensaje por columna vacía solo aparece cuando hay tareas visibles en otras columnas.

## Alternativas consideradas

- **Nuevo selector específico de board con lógica propia:** rechazado; duplicaría filtros y orden y permitiría que lista y board divergieran.
- **Drag & drop:** fuera de alcance por el backlog y por accesibilidad; el menú de estado cubre el caso con teclado.
- **Scroll horizontal con columnas fijas:** rechazado tras validar la UI; comprimía cabeceras y metadatos y sacaba columnas fuera del panel en pantallas medianas.
- **Ensanchar el panel también en la lista:** rechazado; la lista funciona bien en el ancho estrecho y el ensanche solo responde a la necesidad del board.
- **Drag handle o controles grandes de estado en cada tarjeta:** rechazado; robaban ancho al título y competían con la selección de la tarjeta.
- **Columnas con estado local propio:** rechazado; rompería la actualización en tiempo real derivada de `elements`.
- **Persistir la vista elegida:** rechazado; el panel es una lectura temporal y no hay preferencias de usuario en alcance.

## Consecuencias

- Lista y board comparten una única derivación de tareas; los cambios locales y remotos se reflejan en ambos.
- No hay cambios de dominio, persistencia, reglas ni dependencias.
- El panel cambia de ancho al alternar vista; el canvas se reajusta y el centrado del viewport sigue siendo correcto.
- El board no tiene scroll horizontal: 4, 2 o 1 columna según el viewport, con scroll vertical en el panel.
- El estado se cambia con un menú accesible por tarjeta; la columna ya no muestra badges de estado redundantes en solo lectura.
- Los tests cubren el selector de board, el toggle, contadores, empty states, selección, cambio de estado por menú, solo lectura, persistencia de integración y E2E.
