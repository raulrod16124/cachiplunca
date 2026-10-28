---
description: Convierte un listado de tareas del chat en fichas JIRA locales completas.
agent: jira-author
---

Carga la skill `cachiplunca-jira-authoring` y trabaja con este flujo.

Entrada:

$ARGUMENTS

Pasos:

1. Si no hay un campo `$ARGUMENTS`, pide el listado de tareas y el JIRA destino.
2. Si hay un destino explícito, úsalo.
3. Si no hay destino:
   - lee `docs/jiras/INDEX.md`;
   - si hay una única fase activa, propón añadir allí;
   - si el listado parece una fase nueva, propón crear un documento nuevo en
     `docs/jiras/<YYYY-MM-DD>-<slug>.md`;
   - si hay ambigüedad, pregunta antes de escribir.
4. Delega en el subagente `jira-author`.
5. Exige que cada ficha sea autocontenida, con evidencia real del código,
   criterios medibles, tests, validaciones, riesgos y Definition of Ready.
6. Actualiza mapa de tareas, grafo, Change Log e índice.
7. Ejecuta `node scripts/jira.mjs validate` y corrige los errores.
8. Devuelve IDs creados, archivos modificados, dependencias, preguntas abiertas
   y siguiente tarea recomendada.

No implementes código. No borres documentos. No hagas commit.
