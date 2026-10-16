# Error handling audit

**Tarea:** TASK-119 — Error handling audit (`docs/mvp-backlog.md`)
**Fecha:** 2026-10-15
**Alcance:** Domain, Application, Infrastructure, Presentation y entrypoint (`src/main.tsx`, `src/App.tsx`). El modelo de errores de referencia es ADR-0001. Security Rules quedan fuera (cubiertas por TASK-097/098).

## Método

1. Inventario de puntos de captura (`catch`), emisiones (`throw`) y traducciones (`mapFirebaseError`, `toAppError`, `toValidationAppError`, `toValidationError`, `toCollaborationError`).
2. Trazado de las rutas de error capa por capa (Infrastructure → Application → Presentation).
3. Revisión de los fallbacks de UI que muestran `AppError.message`.
4. Revisión de patrones fire-and-forget (`void`, `.then`, `.catch`) en Presentation y servicios de Application.
5. Clasificación de hallazgos por severidad y acción concreta.

## Controles verificados (fortalezas)

- `Element`, Workspace, Membership e Invitation repositories envuelven **todas** sus llamadas a Firestore en `withMappedErrors` → `mapFirebaseError`; no se filtra el SDK ni errores crudos a Application.
- Auth, realtime y presence adapters traducen errores en `try/catch` y en callbacks `onError` (nunca exponen el error del SDK).
- `AppError` es una discriminated union con creación exhaustiva por `kind` (ADR-0001).
- Los ports/casos de uso devuelven uniones `ok | invalid-input | error`; no dependen de excepciones para el control de flujo normal.
- Los `catch` de Presentation normalizan con `toAppError` antes de mapear a copy.
- Sin `console.*` en código de producción (ahora además prohibido por lint, ver F7).

## Hallazgos

| ID  | Severidad | Estado    | Resumen                                                              | Evidencia                                                                                                                                                | Acción concreta                                                                                                                                                                                            |
| --- | --------- | --------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | High      | Corregido | Sin Error Boundary global ni handlers `error`/`unhandledrejection`.  | `src/main.tsx:8-11`, `src/App.tsx:20-23`; no existe `componentDidCatch`/`ErrorBoundary` en `src/`.                                                       | Cerrado en **TASK-125**: `ErrorBoundary` en `src/presentation/components/error-boundary.tsx` (root de `main.tsx`) + `installGlobalErrorHandlers` en `src/presentation/providers/global-error-handlers.ts`. |
| F2  | Medium    | Parcial   | `unknown` puede mostrar el mensaje crudo en la UI.                   | `src/shared/errors/to-app-error.ts:13`; defaults `return error.message` en `src/presentation/features/**/*-error-messages.ts`.                           | Corregido el render directo en `workspaces-list-container` (F2a). Decidir vía ADR si `unknown` debe sanearse en el boundary o en `toAppError`.                                                             |
| F2a | Medium    | Corregido | `WorkspacesListContainer` renderizaba `error.message` sin mapear.    | `src/presentation/features/workspaces/components/workspaces-list-container.tsx`.                                                                         | Sustituido por `describeListWorkspacesError` con fallback genérico. Tests añadidos/actualizados.                                                                                                           |
| F3  | Medium    | Abierto   | Normalizadores de error duplicados y potencialmente divergentes.     | `toValidationError` x4 (`firebase-*-repository.ts`), `toCollaborationError` x2 (`firebase-presence-adapter.ts:170`, `firebase-realtime-adapter.ts:139`). | Tarea de refactor separada: extraer helpers compartidos en Infrastructure manteniendo el comportamiento.                                                                                                   |
| F4  | Low       | Aceptado  | `catch` que traga errores sin señal.                                 | `workspace-shell-container.tsx:558` (resolución de rol), `invitation-link.tsx:27` (portapapeles), `workspaces-list.tsx:42` (formato de fecha).           | El fallo de rol deniega por defecto (fail-closed), aceptable en MVP. Portapapeles/fecha son no bloqueantes.                                                                                                |
| F5  | Low       | Aceptado  | Llamadas async fire-and-forget dependen de que el callee no rechace. | `accept-invitation-page.tsx:38` (`.then` sin `.catch`); ~15 `void` en Presentation.                                                                      | Contratos garantizan uniones sin throw; mitigado por F6. Reconsiderar junto a F1 (handler global).                                                                                                         |
| F6  | Medium    | Corregido | El batcher podía quedar envenenado por un throw inesperado.          | `src/application/services/element-persistence-batcher.ts:74-75`.                                                                                         | `resolvePersistResult` normaliza el error a `AppError` y mantiene la cadena resuelta. Test añadido.                                                                                                        |
| F7  | Low       | Corregido | Sin control preventivo contra `console.*` en producción.             | `.oxlintrc.json`.                                                                                                                                        | Regla `no-console: error` (off en `src/test/**`).                                                                                                                                                          |

## Correcciones aplicadas en esta tarea

1. **F2a** — `describeListWorkspacesError` en `src/presentation/features/workspaces/workspace-error-messages.ts`; `workspaces-list-container.tsx` lo usa en lugar de `error.message`.
2. **F6** — endurecimiento de `element-persistence-batcher.ts`: un `throw` inesperado del orchestrator se traduce a `AppError` (`kind: 'unknown'`) y la cola de persistencia sigue operativa.
3. **F7** — regla `no-console` en `.oxlintrc.json`.

## Seguimientos recomendados (fuera de alcance de TASK-119)

- **TASK-125 (High):** ✅ Cerrada — Error Boundary en el root con fallback recuperable + handlers `window.error`/`unhandledrejection`.
- **ADR / tarea (F2):** definir si el mensaje de `unknown` se sanea en el boundary de Presentation o en `toAppError`, y alinear los defaults de los helpers.
- **Tarea de refactor (F3):** unificar `toValidationError`/`toCollaborationError` en Infrastructure.

## Limitaciones

- Esta auditoría es estática (revisión de código y comportamiento observable por tests); no incluye análisis en runtime ni telemetría (fuera del MVP).
- No se modificó el modelo de errores compartido (`toAppError`) porque preservar el mensaje es una convención deliberada y cubierta por tests; cambiarla requiere ADR y su propia tarea.
