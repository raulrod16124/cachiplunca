# ADR-0042: Presentación por frames del tablero (PBL-017)

**Fecha:** 2026-10-20
**Estado:** Aceptado
**Tarea:** PBL-017 — Vista presentación por frames (`docs/post-mvp-backlog.md`)

## Contexto

El workspace ya organiza el contenido del canvas en frames. PBL-017 pide recorrerlos secuencialmente como una presentación, sin exportar el tablero ni introducir un modelo de diapositivas paralelo. El canvas ya dispone de `CanvasViewportStore.fit` y de las posiciones de los elementos como única fuente de verdad.

La presentación debe ocultar la UI de edición, impedir cambios, funcionar también en tableros de solo lectura y no persistir ningún estado nuevo. El enlace guest (`/view/:token`) no tiene top bar y queda fuera de alcance.

## Decisión

1. **El orden se deriva de las posiciones.** `selectPresentationFrames(elements)` vive en Application, filtra `FrameElement` y ordena por `position.y`, `position.x` y `id`. Es puro, no muta la entrada y no añade un campo de orden ni una entidad `Slide`.

2. **La presentación es estado efímero de Presentation.** El layout guarda el `frameId` presentado y deriva el índice del array actual de frames. No se escribe en Firestore, en el workspace ni en el historial. Si el frame presentado desaparece por un cambio remoto, la presentación termina.

3. **Se reutiliza el canvas y su viewport.** No se monta un segundo canvas. `BoardPresentation` llama a `CanvasViewportStore.fit` con los bounds del frame y un padding de 64 px, y repite el encuadre cuando cambia el frame o el tamaño real del canvas (por ejemplo, al cerrar un panel lateral). El zoom queda limitado por el propio store.

4. **Modo de solo lectura durante la presentación.** El layout pasa `readOnly || presenting` al canvas y oculta top bar, toolbar, selección, cursores remotos, menú contextual, command palette y ayuda. La edición, el historial y la persistencia ya están desactivados por `readOnly`, por lo que no se duplican guardas.

5. **Controles y teclado accesibles.** Los controles anteriores/siguiente/salir viven en la parte inferior con `IconButton` y `Tooltip` de `@raulrod/ui`; el contador es una región `status` con `aria-live`. Las flechas y PageUp/PageDown navegan, `Escape` sale y los eventos se capturan antes que los atajos del canvas para que no muevan la selección por debajo. Al entrar el foco va al contenedor de la presentación; al salir vuelve al canvas.

6. **La acción está en la top bar.** El botón Present se deshabilita con tooltip cuando no hay frames y permanece disponible en tableros de solo lectura, porque presentar no muta datos.

## Alternativas consideradas

- **Montar un canvas aislado en un overlay:** rechazado; duplicaría el montaje, la medición y los listeners del canvas, y complicaría el retorno al estado de edición.
- **Crear una entidad `Slide` o guardar el orden:** rechazado; duplicaría la fuente de verdad y exigiría persistencia nueva.
- **Ocultar todos los elementos salvo el frame actual:** rechazado; el objetivo es encuadrar frames, no recortar el canvas. El contenido alrededor puede seguir visible.
- **Presentar también desde el enlace guest:** fuera de alcance de PBL-017; el guest no tiene top bar. Se puede añadir después reutilizando `BoardPresentation`.
- **Añadir la acción a la command palette:** rechazado para mantener el alcance; ya existe el botón descriptivo en la top bar.

## Consecuencias

- La presentación funciona con cualquier rol, incluidos viewers, sin cambios de reglas ni de permisos.
- No hay persistencia ni dependencias nuevas; todo el estado vive en Presentation.
- El orden de frames es determinista aunque dos frames compartan posición.
- El encuadre se recalcula al cambiar el tamaño del canvas, evitando desajustes al ocultar los paneles laterales.
- El enlace guest puede incorporar la presentación más adelante sin tocar Domain ni Application.
