# ADR-0049: Favoritos privados por usuario (CACH-NXT-017)

**Fecha:** 2026-10-23
**Estado:** Aceptado

## Contexto

Los tableros se listan por última actividad y la navegación no permitía destacar los que cada persona usa con más frecuencia. El concepto de favorito no existía y debía ser privado, persistente entre dispositivos y compatible con la autorización por membership.

Se descartó guardar los favoritos en `user_settings` o en el documento del workspace: `user_settings` es un documento único de preferencias globales y el workspace es compartido, por lo que ninguno representa bien la relación usuario-tablero ni permite crecer sin reescribir documentos completos.

## Decisión

1. **Entidad `Favorite` propia.** Vive en la colección raíz `favorites` e identifica una relación usuario-tablero con `userId`, `workspaceId` y `createdAt`. No reutiliza `Membership`, porque un favorito no concede permisos.

2. **ID determinista.** El id es `${userId}_${workspaceId}`. Evita duplicados, permite `setDoc` y `deleteDoc` idempotentes y hace que el toggle no dependa de IDs aleatorios.

3. **Puerto y repositorio.** `FavoriteRepository` expone `listByUser`, `add` y `remove`. El adaptador Firestore valida los documentos con un mapper tolerante a `Timestamp`, igual que el resto de colecciones.

4. **Servicio de aplicación.** `toggleFavorite({ userId, workspaceId, favorited })` comprueba primero la membership con `MembershipRepository`; si no existe devuelve un error de autorización. Después añade o elimina según el estado deseado, sin lecturas adicionales ni comprobaciones de existencia. La comprobación de membership se repite en las reglas como frontera de seguridad.

5. **Query sin índice.** `listFavorites` filtra por igualdad de `userId` y ordena en cliente por `createdAt` descendente con desempate por `workspaceId`. Al no usar `orderBy` no se necesita un índice compuesto.

6. **Estado optimista en presentación.** `FavoritesProvider` carga el conjunto de IDs al autenticarse y expone `toggleFavorite` con actualización inmediata, bloqueo por workspace mientras hay una operación en curso y rollback si el servicio falla. Un fallo de carga o de escritura no bloquea la lista de tableros.

7. **Acción reutilizable en cuadrícula y lista.** `WorkspacesList` recibe el conjunto de favoritos y muestra una estrella en ambas vistas. El botón usa `aria-pressed`, nombre accesible “Añadir a favoritos”/“Quitar de favoritos”, `stopPropagation` para no abrir el tablero y un icono relleno o contorneado para no depender solo del color.

8. **Reglas de Firestore.** Solo el propio usuario puede leer y borrar su favorito. La creación exige usuario autenticado no anónimo, `userId` propio, ID determinista, `createdAt` válido y membership en el workspace. La actualización queda denegada.

9. **Sin vista propia todavía.** La ruta `/favorites`, el filtrado por favoritos y el orden por actividad se implementan en `CACH-NXT-018`, reutilizando el mismo provider.

## Alternativas consideradas

- **Guardar un array de IDs en `user_settings`:** rechazada; mezcla preferencias globales con relaciones que crecen y complica el filtrado por tablero.
- **Guardar el flag en el workspace:** rechazada; los favoritos son privados y el workspace es compartido.
- **Usar IDs aleatorios:** rechazada; permitiría duplicados ante reintentos y hacía el borrado menos determinista.
- **Actualizar de forma bloqueante antes de pintar:** rechazada; empeora la percepción de latencia y no aporta seguridad, que ya vive en las reglas.
- **Leer la existencia del favorito antes de escribir:** rechazada; añade una lectura y expone la necesidad de permitir `get` sobre documentos inexistentes. El cliente envía el estado deseado y `setDoc`/`deleteDoc` son idempotentes.
- **Añadir `orderBy` en Firestore:** rechazada para esta tarea; exigiría un índice compuesto y el conjunto de favoritos es pequeño y ya se ordena en cliente.

## Consecuencias

- Cada usuario mantiene sus tableros favoritos entre sesiones y dispositivos.
- Los favoritos ajenos no se pueden leer, crear ni borrar.
- Un fallo de red revierte la estrella y muestra un aviso, sin perder la lista de tableros.
- La UI puede reutilizar el provider en la futura vista de Favoritos.
- No se añaden índices nuevos.

## Referencias

- `docs/CACHIPLUNCA_NEXT_PRODUCT_JIRA.md` — `CACH-NXT-017`
- `src/domain/favorite/`
- `src/application/ports/favorite-repository.ts`
- `src/application/commands/toggle-favorite.ts`
- `src/application/queries/list-favorites.ts`
- `src/infrastructure/firebase/firebase-favorite-repository.ts`
- `src/presentation/features/favorites/`
- `src/presentation/features/workspaces/components/workspaces-list.tsx`
- `firestore.rules`
