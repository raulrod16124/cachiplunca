---
description: Revisa el cambio actual contra Clean Architecture, tests, seguridad y reglas de Firebase.
agent: build
---

Carga las skills `cachiplunca-workflow`, `cachiplunca-architecture`,
`cachiplunca-testing` y, si aplica, `cachiplunca-firebase`.

Argumentos:

$ARGUMENTS

1. Identifica la tarea y el diff actual (`git status`, `git diff`, `git diff
--stat`).
2. Delega la revisión de arquitectura y tests en `architecture-reviewer`.
3. Si el cambio toca Firestore, Storage, reglas o índices, delega también en
   `rules-reviewer`.
4. Agrupa los hallazgos por severidad: `blocker`, `major`, `minor`.
5. Indica archivo, línea, motivo y recomendación.
6. Si no hay hallazgos, dilo explícitamente.

No edites código durante la revisión. No hagas commit.
