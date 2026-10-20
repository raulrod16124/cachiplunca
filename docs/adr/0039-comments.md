# ADR-0039: Comentarios por elemento en subcolección (PBL-013)

**Fecha:** 2026-10-20
**Estado:** Aceptado
**Tarea:** PBL-013 — Comentarios MVP (`docs/post-mvp-backlog.md`)

## Contexto

PBL-013 abre la colaboración asíncrona sobre el canvas sin convertir el producto en un chat. Los comentarios deben asociarse a un elemento, persistir, poder resolverse conservando el historial y respetar la frontera de seguridad de memberships ya definida en ADR-0021/ADR-0023.

El tablero ya tiene una fuente de verdad para sus elementos, un panel lateral de plan de tareas y un patrón de puertos/repositorios/mappers reutilizable para Firestore. El objetivo es añadir lo mínimo necesario sin inflar el documento del workspace ni mezclar comentarios con `elements`.

## Decisión

1. **Entidad `Comment` en Domain.** Campos `id`, `workspaceId`, `elementId`, `authorId`, `body`, `createdAt` y `resolvedAt?`, con `CommentId` como value object. Invariantes: body recortado no vacío de hasta 4.000 caracteres, timestamps válidos, `resolvedAt >= createdAt` y resolución única. Domain no conoce React, Firebase ni UI.

2. **Subcolección independiente.** La persistencia vive en `workspaces/{workspaceId}/comments/{commentId}`. Los comentarios no se guardan dentro del documento del workspace ni en `elements`, evitando documentos crecientes y manteniendo consultas acotadas por elemento.

3. **Puerto y casos de uso.** `CommentRepository` expone `listByElement`, `findById` y `save`. Application aporta `createComment`, `listComments` (orden cronológico puro con desempate por id) y `resolveComment`. Los errores se normalizan con el modelo de `AppError` existente.

4. **Adapter Firestore.** `firebase-comment-mapper` serializa fechas como `Date`/`Timestamp` y omite `resolvedAt` cuando no existe. El repositorio usa la subcolección anidada, consulta por `elementId` y traduce errores con `mapFirebaseError`.

5. **Autorización en rules.** Solo los miembros del workspace leen, crean y resuelven. `create` exige coherencia de `workspaceId` e `id` con la ruta, `authorId == request.auth.uid`, body string y ausencia de `resolvedAt`. `update` solo admite añadir `resolvedAt` sobre un comentario abierto; no se puede reescribir el historial ni resolver dos veces. `delete` queda denegado. La UI refleja permisos, pero las rules son la frontera efectiva.

6. **Panel lateral, sin realtime ni nueva entidad de UI.** La top bar añade un toggle de comentarios que abre un panel ligado a la selección única del canvas. Plan y comentarios son mutuamente excluyentes para no estrechar el canvas con dos paneles. El panel carga al abrir o cambiar de elemento y actualiza su estado local al crear o resolver, sin ampliar `RealtimeSubscriptionManager`. Los viewers pueden comentar aunque el canvas sea de solo lectura, porque comentar no es `element:write`.

7. **Autores sin datos denormalizados.** Domain mantiene solo `authorId`. Presentation reutiliza las etiquetas de miembros/presencia disponibles y cae a `shortUserId` cuando no hay nombre visible, evitando duplicar identidad en cada comentario.

## Alternativas consideradas

- **Comentarios dentro del documento del workspace:** rechazado; el documento crecería sin límite y las reglas/consultas se volverían más complejas.
- **Colección global `comments` con filtro por workspace:** rechazado; la subcolección hace que la autorización dependa de la ruta y evita índices compuestos adicionales.
- **Respuestas anidadas o menciones:** fuera de alcance de PBL-013; el modelo plano permite añadirlas después sin romper el contrato actual.
- **Realtime para comentarios:** rechazado por ahora; no es un criterio de aceptación y habría exigido extender el adaptador de tiempo real o añadir suscripciones específicas.
- **Entrada desde el menú contextual del elemento:** rechazado como única vía; el toggle de top bar es más descubrible y sigue el patrón del panel de plan. El panel funciona sobre la selección única existente.
- **Resolver solo owner/editor:** rechazado; el backlog define permisos por membership y resolver no modifica el contenido del canvas. Cualquier miembro puede cerrar un hilo.

## Consecuencias

- Los comentarios persisten asociados al elemento correcto y sobreviven a recargas.
- Las rules cubren lectura, creación, resolución y manipulación de campos sensibles con tests dedicados.
- El documento del workspace y los elementos no se inflan; las consultas se acotan por `elementId`.
- Presentation no importa Firebase y reutiliza los componentes y patrones de accesibilidad existentes.
- No se añaden dependencias, índices ni persistencia local.
- Los comentarios resueltos permanecen visibles como historial y no se pueden borrar desde la UI.
