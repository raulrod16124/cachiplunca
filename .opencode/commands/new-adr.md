---
description: Crea un ADR nuevo con el siguiente número disponible y el formato del proyecto.
agent: docs-scribe
---

Carga las skills `cachiplunca-workflow` y `cachiplunca-jira-authoring`.

Argumentos:

$ARGUMENTS

1. Lee `docs/adr/` y determina el siguiente número disponible.
2. Usa `docs/adr/TEMPLATE.md` como estructura.
3. Crea `docs/adr/<NNNN>-<slug>.md` con:
   - contexto;
   - decisión;
   - alternativas consideradas;
   - consecuencias;
   - referencias a la tarea y archivos reales.
4. Enlaza la tarea JIRA correspondiente si existe.
5. Si el ADR sustituye a otro, indícalo en el estado y en la cabecera.

No modifiques código. No inventes contexto: si falta una decisión, pregunta.
No hagas commit.
