---
description: Cierra un documento JIRA local cuando todas sus tareas están DONE, sin borrarlo.
agent: jira-author
---

Carga las skills `cachiplunca-workflow` y `cachiplunca-jira-authoring`.

Argumentos:

$ARGUMENTS

1. Si no se indica documento, usa el JIRA activo de `docs/jiras/INDEX.md` o pide
   cuál cerrar.
2. Verifica que todas las tareas del documento estén en `DONE`.
3. Si queda alguna `TODO`, `IN PROGRESS`, `BLOCKED` o `REVIEW`, no cierres el
   documento: informa de las tareas pendientes.
4. Si todo está `DONE`, actualiza el estado global del documento a `DONE` y la
   fecha de última actualización.
5. Añade una entrada al Change Log.
6. Actualiza `docs/jiras/INDEX.md`.
7. Informa de que el archivo puede eliminarse manualmente si el usuario lo
   decide.

No borres el documento. No hagas commit.
