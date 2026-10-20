# ADR-0040: Imágenes con Firebase Storage y tipo de elemento `image` (PBL-015)

**Fecha:** 2026-10-20
**Estado:** Aceptado
**Tarea:** PBL-015 — Imágenes (`docs/post-mvp-backlog.md`)

## Contexto

PBL-015 cierra GAP-02: el tablero no tenía un tipo de elemento visual ni almacenamiento de ficheros. El MVP ya dispone de una unión discriminada de elementos, persistencia Firestore genérica, reglas de autorización por membership y un patrón de puertos/adapters.

El objetivo es permitir subir imágenes, renderizarlas, persistirlas tras recargar, eliminar el elemento y respetar los roles del workspace, sin acoplar Presentation a Firebase ni introducir dependencias nuevas.

## Decisión

1. **`ImageElement` en Domain.** Extiende `BaseElement` con `src` (URL de descarga) y `alt?`. `createImageElement` valida `src` no vacío y `alt` string; `withImageSrc`/`withImageAlt` revalidan y permiten eliminar el alt con `undefined`. El tamaño sigue viviendo en `BaseElement`. Domain no conoce Storage ni React.

2. **Puerto de Storage en Application.** `ImageStoragePort.uploadImage({ storagePath, file })` recibe bytes (`ArrayBuffer`), nombre, tipo y tamaño, y devuelve la URL. El caso de uso `createUploadImage` valida tipo y tamaño antes de tocar el puerto, construye la ruta y genera el id de imagen con una dependencia inyectada.

3. **Ruta y límites.** Las imágenes se guardan en `workspaces/{workspaceId}/images/{imageId}-{fileNameSaneado}`. Se aceptan PNG, JPEG, WebP y GIF de hasta 5 MB. La validación existe en Application (mensajes claros) y en `storage.rules` (frontera efectiva).

4. **Adapter Firebase Storage.** `createFirebaseImageStorage` usa `uploadBytes` con `contentType` y metadatos del nombre original, obtiene la URL con `getDownloadURL` y traduce errores con `mapFirebaseError`. `getFirebaseStorage` conecta al emulador cuando `VITE_USE_EMULATORS === 'true'`.

5. **Persistencia Firestore.** El mapper de elementos serializa `type: 'image'`, `src` y `alt?`; el repositorio, realtime, duplicado, pegado y export reutilizan el modelo genérico. No se crea una colección paralela ni un store de imágenes.

6. **Autorización.** `storage.rules` permite leer a miembros y escribir/eliminar solo owner/editor, derivando el rol de la membership en Firestore. `firestore.rules` valida la forma del documento `image` en create/update (`src` string no vacío y `alt` string opcional). La UI refleja permisos con `canCreateElement`; los viewers no ven la creación habilitada.

7. **Presentación.** La toolbar abre un selector de fichero nativo; al elegir un archivo, el contenedor sube, crea el elemento con el alt derivado del nombre y lo selecciona. El renderer muestra la imagen con `object-fit: contain` y `alt` accesible. Doble clic abre un editor inline de descripción que persiste con `UpdateElement`. La command palette expone la acción y la búsqueda indexa alt y src.

## Alternativas consideradas

- **Solo URL manual (sin Storage):** rechazado; no cumple el alcance de PBL-015 ni permite controlar tipo/tamaño.
- **Guardar el binario en Firestore:** rechazado; límites de documento, coste y reglas inadecuadas.
- **Diálogo de inserción con alt previo:** rechazado para mantener el flujo corto; el alt por defecto se deriva del nombre y se puede editar con doble clic.
- **Borrar el objeto de Storage al eliminar el elemento:** pospuesto; requiere coordinar undo/redo y persistencia. El límite de tamaño controla el coste y el archivo huérfano no es accesible sin membership.
- **Store o entidad `Image` separada:** rechazado; duplicaría la fuente de verdad del canvas.

## Consecuencias

- Las imágenes se suben, renderizan y persisten tras recargar; el alt es editable y accesible.
- Owner/editor pueden subir y eliminar; viewer solo lee. Las rules cubren accesos válidos, no autorizados, tipos y tamaños inválidos.
- Presentation no importa Firebase y el dominio permanece puro.
- No se añaden dependencias: `firebase/storage` ya forma parte de `firebase` y el icono `Image` existe en `@raulrod/icons`.
- Los E2E y los tests de rules requieren el emulador de Storage (puerto 9199).
- Queda como follow-up la limpieza best-effort de objetos huérfanos al borrar elementos.
