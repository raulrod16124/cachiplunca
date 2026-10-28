---
description: Cierra la tarea actual tras verificar la DoD y actualizar JIRA, índice, Change Log y session log.
agent: build
---

Carga las skills `cachiplunca-workflow`, `cachiplunca-testing` y
`cachiplunca-architecture`.

Argumentos:

$ARGUMENTS

Si no hay argumentos, usa la tarea `IN PROGRESS` del JIRA activo.

1. Identifica la tarea y su documento.
2. Delega la verificación en el subagente `gate-runner`.
3. Si algún gate falla, no cierres la tarea: informa del fallo y deja el estado
   actual.
4. Si todos los gates pasan, comprueba la DoD de la ficha y la skill.
5. Delega en `docs-scribe` la actualización de:
   - estado de la tarea;
   - Change Log;
   - `docs/jiras/INDEX.md`;
   - `.local/session-log.md`;
   - ADR si aplica.
6. Cierra en `DONE` si la DoD está completa. Si queda validación manual o
   visual, deja `REVIEW` y explica qué falta.
7. Entrega un mensaje de commit listo, sin ejecutarlo.

No hagas commit ni push. No borres documentos JIRA.
