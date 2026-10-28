---
description: Ejecuta los quality gates de la tarea actual y resume los fallos sin corregir código.
agent: gate-runner
---

Carga la skill `cachiplunca-testing` y ejecuta los gates de la tarea actual.

Argumentos:

$ARGUMENTS

Si no hay argumentos, usa la tarea `IN PROGRESS` del JIRA activo o los archivos
cambiados en `git status`.

1. Determina los gates necesarios según la matriz de `cachiplunca-workflow`.
2. Ejecuta los gates.
3. Devuelve un resumen con PASS/FAIL, primer fallo, tests ejecutados y siguiente
   acción recomendada.

No edites archivos. No corrijas código. No hagas commit.
