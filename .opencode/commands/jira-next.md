---
description: Selecciona y trabaja la siguiente tarea JIRA pendiente, o planifica una tarea concreta.
agent: build
---

Carga la skill `cachiplunca-workflow` y ejecuta el flujo de trabajo de
Cachiplunca.

Argumentos:

$ARGUMENTS

Interpretación:

- vacío: selecciona la siguiente tarea `TODO` elegible e impleméntala.
- `plan`: selecciona la siguiente tarea elegible, delega en `task-planner` y
  devuelve el plan sin modificar código.
- `<ID>`: trabaja o planifica esa tarea concreta.

Selección:

1. Ejecuta `node scripts/jira.mjs next` para obtener la tarea elegible.
2. Si el script no está disponible, lee `docs/jiras/INDEX.md`, carga los JIRA
   activos y aplica el mismo orden.
3. Excluye tareas con dependencias que no estén `DONE` o con preguntas
   bloqueantes.
4. Si hay empate, pregunta o elige la primera explicando el motivo.
5. Si no hay tareas elegibles, informa de bloqueos y tareas en `REVIEW`.

Ejecución, salvo que el argumento sea `plan`:

1. Comprueba que `git status` esté limpio.
2. Marca la tarea `IN PROGRESS` en el JIRA.
3. Crea la rama `feat/<prefijo-lower>-<nnn>-<slug>` si no existe.
4. Delega el plan en `task-planner`.
5. Escribe primero el test que falla.
6. Implementa el cambio mínimo.
7. Delega la verificación en `gate-runner`. Si algún gate falla, corrige y
   vuelve a ejecutar los gates afectados.
8. Delega la revisión en `architecture-reviewer`. Si el cambio toca Firestore,
   Storage, reglas o índices, delega también en `rules-reviewer`.
9. Corrige los hallazgos `blocker` y `major`; justifica cualquier `minor` que no
   se aborde.
10. Si la tarea requiere ADR, crea o actualiza el ADR antes de cerrar.
11. Delega el cierre documental en `docs-scribe` para actualizar JIRA, Change
    Log, `docs/jiras/INDEX.md` y `.local/session-log.md`.
12. Cierra en `DONE` si la DoD está cumplida. Si queda validación manual o
    visual, deja `REVIEW` y explica qué falta.
13. Entrega un mensaje de commit listo, sin ejecutar `git commit` ni `git push`.

Si el argumento es `plan`, detente después de `task-planner` y no modifiques
código ni documentación.

No hagas commit. No hagas push. No elimines documentos JIRA.
