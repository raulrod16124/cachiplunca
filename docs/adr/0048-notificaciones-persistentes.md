# ADR-0048: Notificaciones persistentes de comentarios (CACH-NXT-007)

**Fecha:** 2026-10-23
**Estado:** Aceptado

## Contexto

La campana de la aplicación solo mostraba invitaciones pendientes. Los comentarios se guardan en `workspaces/{workspaceId}/comments` y no generaban ningún aviso para el resto de miembros. `CACH-NXT-011` cerró la edición temporal de comentarios y dejó el modelo estable para añadir avisos sin volver a tocar su semántica.

La campana debía convertirse en un centro de notificaciones general con invitaciones y comentarios, manteniendo intacto el flujo de aceptar invitaciones.

## Decisión

1. **Entidad `Notification` propia.** Vive en `notifications` (colección top-level) con `type: 'comment'`, destinatario, tablero, elemento, comentario, autor, preview y `readAt?`. No se reutiliza `Membership` ni `Comment` para evitar mezclar responsabilidades.

2. **ID determinista por comentario y destinatario.** El id es `commentId_recipientId`. Los reintentos del notificador son idempotentes (`setDoc` sobrescribe el mismo documento) y no generan duplicados.

3. **Preview acotado.** `bodyPreview` normaliza espacios y se limita a 140 caracteres. `actorName` usa el nombre visible, email o el fallback de la UI.

4. **Notificador best-effort.** `createComment` guarda primero el comentario, registra actividad y después ejecuta `notifyComment`. Cualquier fallo del notificador se captura y no altera el resultado del comentario. El notificador lista memberships, obtiene el workspace y crea una notificación por cada miembro distinto del autor con un único `writeBatch`.

5. **Provider compuesto.** `PendingInvitationsProvider` se conserva sin cambios. `NotificationsProvider` se monta dentro y consume `usePendingInvitations`, combinando el contador de invitaciones con los comentarios no leídos. Así se evita duplicar el estado de invitaciones y se mantiene la aceptación existente.

6. **Diálogo general con tabs.** La campana muestra un contador combinado (`aria-live`) y un diálogo “Notificaciones” con tabs “Invitaciones” y “Comentarios”. Cada notificación de comentario es un control accesible con autor, tablero, preview y estado leído/no leído. El tab inicial prioriza invitaciones pendientes y, si no las hay, comentarios no leídos.

7. **Deep link con query params.** Al pulsar una notificación se marca como leída (optimista y best-effort) y se navega a `/workspaces/{workspaceId}?elementId=...&commentId=...`. El workspace lee los params, selecciona el elemento, abre el panel de comentarios, hace foco y scroll al comentario y limpia los params con `replace: true` para no reabrirlo en cada render. Si el elemento o el comentario ya no existen, se limpian los params sin romper el layout.

8. **Reglas como frontera de seguridad.** `notifications` solo es legible por su destinatario. La creación exige que el actor sea el usuario autenticado, que no se notifique a sí mismo, que el actor y el destinatario pertenezcan al workspace y que el payload respete tipos y límites. La actualización solo permite `readAt` al destinatario. El borrado queda denegado.

9. **Índice compuesto.** Se añade `recipientId ASC, createdAt DESC` para la query del listener por destinatario ordenada por creación descendente.

10. **Sin push, email, preferencias ni historial propio.** Fuera de alcance por decisión de producto; el diálogo muestra las notificaciones recientes del usuario y no hay página de historial.

## Alternativas consideradas

- **Notificar desde el panel de comentarios:** rechazada; la lógica debe vivir en Application para que cualquier caller del comando notifique igual.
- **Reutilizar invitaciones como tipo de notificación:** rechazada; mezclaría dos ciclos de vida y rompería la aceptación existente.
- **Leer notificaciones por workspace en la home:** rechazada; se usa la colección agregada por destinatario y un único listener.
- **Marcar como leída de forma bloqueante antes de navegar:** rechazada; degradaría el deep link ante fallos de red. Se aplica de forma optimista con best-effort.
- **Permitir borrar notificaciones:** rechazada para esta tarea; el producto solo contempla marcar como leídas.

## Consecuencias

- Los miembros reciben avisos persistentes de comentarios, incluso tras recargar.
- El autor no se notifica a sí mismo y un fallo de notificación no rompe el comentario.
- La campana conserva la aceptación de invitaciones y añade el flujo de comentarios.
- Las reglas impiden spam, suplantación de autor y lectura de notificaciones ajenas.
- El coste de escritura crece linealmente con el número de miembros, mitigado con un único batch y sin listeners por workspace.
- El deep link depende de que el elemento y el comentario sigan existiendo; el caso “no encontrado” se resuelve limpiando los params.

## Referencias

- `docs/CACHIPLUNCA_NEXT_PRODUCT_JIRA.md` — `CACH-NXT-007`
- `src/domain/notification/notification.ts`
- `src/application/services/notify-comment.ts`
- `src/application/commands/create-comment.ts`
- `src/infrastructure/firebase/firebase-notification-repository.ts`
- `src/presentation/features/notifications/`
- `src/presentation/features/workspace-shell/components/comments-panel.tsx`
- `firestore.rules`, `firestore.indexes.json`
