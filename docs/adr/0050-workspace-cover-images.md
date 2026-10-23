# ADR-0050: Imagen de portada de tablero (CACH-NXT-019)

**Fecha:** 2026-10-23
**Estado:** Aceptado

## Contexto

Los tableros no tenían identidad visual propia: la lista y el topbar solo mostraban un icono genérico y el nombre. La infraestructura de imágenes de elementos ya subía archivos a `workspaces/{workspaceId}/images/{imageId}` y borraba best-effort, pero el workspace no tenía campos para una portada ni un ciclo de vida asociado.

La portada es un metadato compartido del tablero. Debe verse en la tarjeta de cuadrícula, en la fila de lista y en el topbar, y debe existir un estado por defecto agradable cuando el owner decide no subir imagen.

## Decisión

1. **Campos en `Workspace`.** `coverImageUrl: string | null` y `coverImageStoragePath: string | null` forman una pareja. O ambos existen o ambos son `null`; el dominio rechaza media pareja, URLs que no sean HTTP(S) y paths fuera de `workspaces/{workspaceId}/images/`.

2. **Compatibilidad con datos antiguos.** El mapper Firestore lee documentos sin campos de portada como `null`. `toWorkspaceDocument` escribe ambos campos de forma explícita.

3. **Puerto y repositorio.** `WorkspaceCreateInput` y `WorkspaceUpdateInput` aceptan los campos de forma opcional. El repositorio Firestore solo actualiza un campo de portada si viene en el input, igual que nombre y descripción.

4. **Creación sin portada bloqueante.** El diálogo crea primero el workspace, después sube la imagen con `ImageServices.uploadImage` y por último actualiza el documento. Si la subida o la actualización fallan, el tablero queda creado sin portada, se muestra un aviso y el diálogo permanece abierto para informar. Si la subida tuvo éxito pero falló la actualización, se borra el objeto recién subido best-effort.

5. **Edición con limpieza posterior.** Al reemplazar se sube la nueva imagen, se confirma la actualización y solo entonces se borra la anterior. Al quitar se actualiza a `null` y después se borra la anterior. Un fallo de borrado de Storage no bloquea ni cambia el resultado de la edición.

6. **Sin cambios en reglas.** Se reutiliza la ruta existente de imágenes. Las reglas de Storage ya permiten a owner/editor subir y borrar, y las de Firestore ya limitan la actualización de metadatos al owner. No se añaden índices.

7. **Duplicado sin portada.** `duplicate-workspace` no copia URL ni path. La copia nace sin portada y el original conserva la suya, evitando que dos tableros compartan el mismo objeto de Storage.

8. **Render reutilizable con fondo temático.** Un componente `WorkspaceCover` muestra la imagen con `object-fit: cover` o un fondo por defecto construido con tokens del tema. En cuadrícula la portada ocupa la franja superior de la tarjeta (aspecto 16:7, entre 96 y 160 px, menos de la mitad de la tarjeta). En lista se muestra como miniatura cuadrada a la izquierda del nombre. En el topbar aparece como miniatura junto al nombre. Las imágenes de fondo son decorativas (`alt=""`) y usan `loading="lazy"` fuera del topbar.

## Alternativas consideradas

- **Guardar la portada como elemento del canvas:** rechazada; la portada es identidad del tablero, no contenido del tablero.
- **Crear el workspace con la URL ya resuelta:** rechazada porque el `workspaceId` es necesario para construir el path de Storage y lo genera el repositorio.
- **Bloquear la creación si falla la imagen:** rechazada; la portada es opcional y no debe impedir crear el tablero.
- **Borrar la imagen anterior antes de confirmar la actualización:** rechazada; un fallo de Firestore dejaría el tablero apuntando a un objeto borrado.
- **Copiar la portada al duplicar:** rechazada; compartiría un objeto de Storage entre tableros y rompería la limpieza independiente.

## Consecuencias

- Los tableros pueden tener identidad visual sin cambiar el modelo de permisos.
- Los datos antiguos siguen funcionando sin migración.
- La limpieza de portadas al borrar un workspace queda fuera de alcance; se puede abordar en una tarea específica.
- La UI no muestra errores de limpieza best-effort, pero nunca deja de confirmar la operación principal.

## Referencias

- `docs/CACHIPLUNCA_NEXT_PRODUCT_JIRA.md` — `CACH-NXT-019`
- `src/domain/workspace/workspace.ts`
- `src/application/ports/workspace-repository.ts`
- `src/application/commands/update-workspace.ts`
- `src/infrastructure/firebase/firebase-workspace-mapper.ts`
- `src/infrastructure/firebase/firebase-workspace-repository.ts`
- `src/presentation/components/workspace-cover.tsx`
- `src/presentation/features/workspaces/components/`
- `src/presentation/features/workspace-shell/components/workspace-top-bar.tsx`
