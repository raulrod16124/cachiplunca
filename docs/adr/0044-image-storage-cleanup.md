# ADR-0044: Limpieza de imágenes huérfanas en Firebase Storage (CACH-UX-001)

**Fecha:** 2026-10-21
**Estado:** Aceptado

## Contexto

`ADR-0040` dejó como follow-up la limpieza de objetos de Storage al eliminar elementos `image`. Hasta ahora la subida devolvía la ruta de Storage, pero la presentación solo conservaba la URL de descarga (`src`). Al borrar un elemento se eliminaba el documento de Firestore y el objeto quedaba huérfano, ocupando espacio sin forma de recuperarlo desde la UI.

La limpieza debe coordinarse con el historial local: el usuario puede deshacer el borrado, y el objeto no puede desaparecer antes de que Firestore confirme la eliminación del elemento. Firestore y Storage no comparten transacción, por lo que la limpieza es siempre eventual.

## Decisión

1. **`ImageElement.storagePath` es opcional.** Se persiste junto a `src` y `alt` en el documento de Firestore. Es opcional para mantener compatibilidad con imágenes existentes y documentos antiguos; si falta, el elemento sigue siendo válido y no se intenta derivar la ruta desde la URL.

2. **El puerto de Storage expone borrado.** `ImageStoragePort.deleteImage({ storagePath })` se implementa con `deleteObject`. El adapter trata `storage/object-not-found` como éxito, por lo que la operación es idempotente. Los demás errores se traducen con `mapFirebaseError`.

3. **El comando de aplicación es best-effort.** `createDeleteImage` valida la ruta y devuelve un resultado; no lanza. La cola de limpieza ignora los errores para no romper la UI ni revertir el borrado del elemento.

4. **La limpieza se programa solo después de confirmar Firestore.** El batcher de persistencia notifica la mutación persistida con éxito (`onPersistedMutation`). La presentación calcula las imágenes huérfanas comparando el estado anterior y el siguiente y las encola.

5. **Se deduplica antes de borrar.** Una imagen candidata no se elimina si otro elemento del mismo estado sigue referenciando su `storagePath` o su `src`. Los duplicados y pegados conservan ambas propiedades, por lo que una copia protege el objeto.

6. **Borrado diferido con cancelación.** La cola vive en memoria y aplica una ventana de gracia de 30 segundos (`DEFAULT_IMAGE_CLEANUP_DELAY_MS`). Un undo cancela las rutas restauradas. Además, la cola vuelve a comprobar las referencias actuales justo antes de borrar, lo que cubre undos, pegados y otras mutaciones que ocurran mientras la limpieza está pendiente.

7. **Solo se limpian rutas del workspace actual.** Se exige el prefijo `workspaces/{workspaceId}/images/` para no borrar objetos traídos de otro workspace. Las imágenes antiguas sin ruta se omiten.

## Alternativas consideradas

- **Borrado inmediato tras Firestore:** rechazado; rompe undo y puede borrar una imagen compartida por copias.
- **Cola persistida en `localStorage`:** rechazada en esta fase; añade estado local que limpiar. Se puede evolucionar si el producto exige garantías tras recargar.
- **Derivar la ruta desde la URL de descarga:** rechazado; el formato de URL de Firebase no es un contrato estable y un error podría borrar el objeto equivocado.
- **Barrido de huérfanos al abrir el workspace:** rechazado; requiere listar Storage y coordina mal con elementos en vuelo.

## Consecuencias

- Las imágenes nuevas se pueden limpiar al eliminar el elemento; las antiguas sin `storagePath` quedan como limitación conocida.
- Un undo dentro de la ventana de gracia restaura el elemento y cancela la limpieza. Un undo después de la ventana puede restaurar un elemento cuya imagen ya no existe.
- Cerrar la pestaña durante la ventana deja el objeto huérfano; no hay cola persistida todavía.
- Al duplicar un workspace, las imágenes copiadas comparten el objeto de Storage original. La limpieza entre workspaces queda fuera de alcance: si se borra la imagen en el workspace original, la copia puede quedar rota. Se documenta como follow-up.
- El borrado de un workspace completo sigue sin limpiar sus elementos ni imágenes; también queda como follow-up independiente.
- No se modifican `storage.rules`: owner/editor ya pueden borrar. `firestore.rules` acepta el campo adicional porque su validación de imagen no restringe campos extra.
- La UI no muestra errores de limpieza; el estado de sincronización del tablero no se ve afectado.

## Referencias

- `docs/adr/0040-images.md`
- `docs/CACHIPLUNCA_UX_IMPROVEMENTS_JIRA.md` — `CACH-UX-001`
- `src/application/services/image-cleanup.ts`
- `src/application/services/element-persistence-batcher.ts`
