# ADR-0046: Actividad real del tablero (CACH-NXT-013)

**Fecha:** 2026-10-22
**Estado:** Aceptado

## Contexto

`Workspace.updatedAt` se actualizaba al crear el tablero y al editar su nombre o descripción, pero no cuando cambiaba el contenido. La lista de tableros mostraba esa fecha como si fuera actividad, por lo que en la práctica solía coincidir con la creación y no reflejaba el trabajo real.

La decisión de producto es que la actividad incluya cambios de elementos y comentarios, sin confundirla con la edición de metadatos. Además, CACH-NXT-005 necesita un dato fiable para ordenar los tableros por uso reciente.

## Decisión

1. **Tres fechas con significados distintos.**
   - `createdAt`: creación del tablero, inmutable.
   - `updatedAt`: última edición de metadatos (nombre o descripción).
   - `lastActivityAt`: última actividad real (elementos o comentarios).
     El getter `activityAt` expone `lastActivityAt` y el dominio garantiza que nunca es anterior a `createdAt`.

2. **Compatibilidad con datos antiguos.** Los documentos sin `lastActivityAt` se leen usando `updatedAt` como fallback. No se ejecuta ninguna migración masiva. Un tablero nuevo inicializa `lastActivityAt` con `createdAt` porque ambos coinciden en el alta.

3. **Puerto explícito.** `WorkspaceRepository.touchActivity(id, at?)` actualiza únicamente `lastActivityAt` y devuelve la entidad resultante. No reutiliza `update`, que sigue reservado a metadatos y a `updatedAt`.

4. **Actividad de elementos en Application.** `ElementPersistenceOrchestrator` recibe opcionalmente el repositorio de workspace y el `workspaceId`. Tras un delta con cambios y una persistencia correcta, registra actividad. Los no-ops y los fallos de persistencia no tocan la fecha. Un fallo al registrar actividad es best-effort y nunca convierte un guardado correcto en error.

5. **Agrupación mediante el batcher existente.** La actividad de elementos se registra una vez por flush del `ElementPersistenceBatcher`, que ya aplica debounce. No se escribe en cada movimiento intermedio del puntero.

6. **Comentarios best-effort.** `createComment` y `resolveComment` reciben un `recordActivity` opcional y lo invocan solo después de guardar correctamente. La actividad usa `createdAt` del comentario o el instante de resolución y se ignora cualquier fallo.

7. **Reglas como frontera de seguridad.** El owner mantiene el update completo de metadatos. Owner y editor pueden actualizar únicamente `lastActivityAt`, siempre que sea un timestamp no anterior a `createdAt`. Viewer, outsiders y anónimos no pueden modificarlo. El resto de campos sigue requiriendo owner.

8. **Presentación.** La tarjeta muestra la actividad con `formatRelativeDate(activityAt)` y la creación con una fecha corta. CACH-NXT-005 reutiliza `activityAt` para ordenar.

## Alternativas consideradas

- **Seguir usando `updatedAt`:** rechazado; no refleja el contenido y mezcla metadatos con actividad.
- **Actualizar `updatedAt` desde elementos:** rechazado; rompe el significado de la fecha de metadatos y dificulta distinguir ediciones del tablero.
- **Escribir actividad en cada movimiento:** rechazado por coste y ruido; el debounce del batcher ya agrupa los cambios.
- **Hacer fallar el guardado si falla la actividad:** rechazado; la actividad es un efecto secundario y no debe bloquear al usuario.
- **Permitir a editor actualizar el documento completo:** rechazado; ampliaría permisos sin necesidad.
- **Backfill masivo:** fuera de alcance; el fallback cubre los datos históricos.

## Consecuencias

- Los tableros nuevos y los modificados a partir de ahora ordenan por actividad real.
- Los datos antiguos siguen siendo legibles y ordenan por `updatedAt` hasta su primera actividad.
- Cada flush de persistencia de elementos y cada comentario añaden, como máximo, una escritura adicional best-effort.
- CACH-NXT-005 puede implementarse sin tocar de nuevo el modelo ni las reglas.
- No se añaden dependencias ni cambios en `@raulrod/ui` o `@raulrod/tokens`.

## Referencias

- `docs/CACHIPLUNCA_NEXT_PRODUCT_JIRA.md` — `CACH-NXT-013`, `CACH-NXT-005`
- `src/domain/workspace/workspace.ts`
- `src/application/services/element-persistence-orchestrator.ts`
- `src/application/services/element-persistence-batcher.ts`
- `src/application/commands/create-comment.ts`
- `src/application/commands/resolve-comment.ts`
- `src/infrastructure/firebase/firebase-workspace-mapper.ts`
- `firestore.rules`
