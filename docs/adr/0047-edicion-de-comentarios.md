# ADR-0047: Edición de comentarios con ventana temporal (CACH-NXT-011)

**Fecha:** 2026-10-22
**Estado:** Aceptado

## Contexto

Los comentarios por elemento se crean y se resuelven, pero no se pueden corregir. Un error tipográfico obliga a crear otro comentario o a dejar el hilo con información incorrecta. El modelo actual solo conserva `createdAt` y `resolvedAt`, y las reglas de Firestore limitan la actualización a añadir `resolvedAt`.

La decisión de producto es permitir que el autor edite el cuerpo durante los primeros 15 minutos desde la creación, sin historial de versiones y sin que owners o moderadores puedan reescribir comentarios ajenos.

## Decisión

1. **Ventana temporal en Domain.** `COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000`. `Comment.editBody(body, editedAt)` valida el cuerpo con las mismas reglas que `create`, rechaza comentarios resueltos y rechaza ediciones fuera de la ventana. `canEdit(at)` expone la misma comprobación para que la UI no duplique la regla.

2. **`editedAt` opcional y persistido.** El dominio añade `editedAt?: Date`. El mapper lo omite cuando no existe y lo lee cuando está presente, manteniendo compatibles los comentarios antiguos. `resolve` conserva `editedAt`.

3. **Caso de uso explícito.** `editComment` recibe `workspaceId`, `commentId`, `actorId` y `body`. Carga el comentario, comprueba autoría y aplica `editBody` antes de guardar. Devuelve `notFound`, `authorization` o `validation` según corresponda. No registra actividad de tablero: editar un comentario no cambia el orden de actividad acordado en ADR-0046.

4. **La regla es la autoridad.** La ventana que aplica el cliente es UX; Firestore valida con `request.time` que el autor edita un comentario abierto, que solo cambian `body` y `editedAt` y que `editedAt` está entre `createdAt` y el instante del servidor dentro de los 15 minutos. La creación rechaza `editedAt` para evitar documentos falsamente editados.

5. **UI inline sin recargar.** El panel muestra el botón Editar solo al autor, con comentario abierto y dentro de la ventana. La edición sustituye temporalmente el cuerpo por un textarea con guardar/cancelar, actualiza el estado local y anuncia éxito o error. La etiqueta “Editado {when}” aparece cuando `editedAt` existe.

6. **Compatibilidad.** No hay migración de datos. Los comentarios sin `editedAt` siguen siendo válidos y editables si están dentro de la ventana desde su creación. No se añaden dependencias ni cambios en `@raulrod/ui` o `@raulrod/tokens`.

## Alternativas consideradas

- **Historial de versiones:** fuera de alcance; añade modelo, UI y reglas sin una necesidad de producto validada.
- **Edición sin límite temporal:** rechazada; permite reescribir conversaciones antiguas y complica la confianza en los hilos.
- **Edición por owners o moderadores:** rechazada; el criterio es que solo el autor corrige su propio contenido.
- **Confiar solo en la comprobación del cliente:** rechazada; la frontera de seguridad son las reglas.
- **Guardar `editedAt` como serverTimestamp:** rechazada para esta tarea; el comando y la regla ya acotan la ventana y el mapper existente trabaja con fechas.

## Consecuencias

- El autor puede corregir errores recientes sin crear ruido en el hilo.
- Los comentarios resueltos y los de otros usuarios permanecen inmutables.
- Las reglas cubren autoría, ventana, campos permitidos y resolución sin relajar el resto de permisos.
- Los datos antiguos y los fakes de tests siguen funcionando con un campo opcional.
- Un desfase de reloj entre cliente y servidor puede hacer que el cliente muestre la acción y el servidor la rechace; la UI informa del error de edición.

## Referencias

- `docs/CACHIPLUNCA_NEXT_PRODUCT_JIRA.md` — `CACH-NXT-011`
- `src/domain/comment/comment.ts`
- `src/application/commands/edit-comment.ts`
- `src/infrastructure/firebase/firebase-comment-mapper.ts`
- `src/presentation/features/workspace-shell/components/comments-panel.tsx`
- `firestore.rules`
