# ADR-0007: Interfaz común de comandos reversibles

**Fecha:** 2026-10-11
**Estado:** Aceptado

## Contexto

TASK-044–TASK-049 dejaron los comandos de elementos (`create-element`, `update-element`, `move-element`, `resize-element`, `delete-element`, `duplicate-element`) como factorías puras con firma `(input) => { status: 'ok', element } | { status: 'error', error }`. Cada una transforma un único `Element` y no comparte ningún contrato.

TASK-064–TASK-067 (command history manager, undo, redo y edge cases) y TASK-088 (historial local frente a cambios remotos) necesitan una abstracción común para ejecutar y revertir operaciones sobre un estado, sin depender de React ni de persistencia. TASK-063 define únicamente ese contrato: `execute`/`undo` o equivalente, y un resultado/metadatos mínimos.

## Decisión

1. **El contrato vive en `src/application/commands/command.ts`** y es genérico sobre el estado (`Command<S>`). `S` es el estado que la operación transforma (en el board será la colección de elementos), pero la interfaz no fija ese tipo: se mantiene desacoplada de entidades concretas, de React, de Firebase y de la persistencia.

2. **`Command<S>` expone `metadata`, `execute(state)` y `undo(state)`.** `execute` aplica el avance y `undo` la reversión, ambos como funciones puras `(state: S) => CommandResult<S>`. Los comandos no mutan la entrada: devuelven un estado nuevo. Cumple literalmente "contrato execute/undo o equivalente" y permite construir undo/redo sin conocer la UI.

3. **`CommandResult<S>` es una unión discriminada** `{ status: 'ok'; state: S } | { status: 'error'; error: AppError }`. Reutiliza `AppError` (ADR-0001): los comandos nunca lanzan errores previsibles ni exponen errores crudos; los devuelven como valor. El consumidor (history manager) decide si propaga o descarta.

4. **`CommandMetadata` es mínimo: `{ label: string }`.** Es información de presentación (p. ej. "Move elem-1") que el historial puede exponer sin que el comando sepa nada de UI. No se añaden ids, timestamps ni flags especulativos: se ampliará cuando TASK-064–TASK-067 lo requieran.

5. **Se incluye la factoría `createFunctionCommand<S>({ metadata, apply, revert })`** para materializar el contrato a partir de dos funciones puras. Es el punto de composición que usarán los comandos reales y el history manager; evita que cada consumidor reimplemente el objeto `Command`.

6. **No se refactorizan los comandos de elementos existentes (TASK-044–TASK-049).** Su firma actual sigue siendo válida y se compondrá dentro de comandos reversibles cuando TASK-064+ lo necesiten. Cambiarlos ahora sería scope creep y rompería tests y consumidores sin necesidad.

## Consecuencias

- TASK-064 (command history manager) puede implementarse y testearse únicamente con `Command<S>` y `createFunctionCommand`, sin tocar React ni persistencia.
- El contrato es testeable con TypeScript puro: `command.test.ts` compone `createMoveElement` sobre `readonly Element[]` y verifica `execute`, `undo`, `execute→undo→redo`, la ruta de error (`AppError` de validación sin lanzar) y que las secuencias válidas no corrompen el estado.
- Los comandos de elementos existentes permanecen intactos; integrarlos como comandos reversibles es trabajo de TASK-064+.
- Si en el futuro el historial necesita más metadatos (agrupación, coalescing, origen local/remoto), se amplía `CommandMetadata` o el contexto del history manager de forma aditiva.
