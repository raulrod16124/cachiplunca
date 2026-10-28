---
name: cachiplunca-jira-authoring
description: Use when the user provides a list of tasks in chat and wants them converted into a complete local Cachiplunca JIRA document or appended to an existing JIRA. Covers destination selection, codebase research, ID allocation, duplicates, dependencies, task cards, validation and index updates.
compatibility: opencode
---

# Cachiplunca JIRA authoring

## When to use

Use this skill when the user says things like:

- "estas son las próximas tareas"
- "convierte esto en un JIRA"
- "añade estas tareas al JIRA de esta fase"
- "crea un JIRA para esta nueva fase"

The output is documentation only. Never implement code as part of this skill.

## Input contract

Preferred input:

```text
/jira-add [documento-destino]

1. Título de la tarea
   - Contexto u objetivo: ...
   - Criterios deseados: ...
2. Otra tarea
   - ...
```

If the target is missing, read `docs/jiras/INDEX.md`:

1. The active phase is the highest `Orden` whose phase `Estado` is not `DONE`.
   Propose appending there.
2. If the list looks like a new phase, propose a new document.
3. If it is ambiguous, ask before writing.

Never create a new JIRA document silently.

## Destination rules

- Existing local JIRA: append the new cards and update its map, graph and Change
  Log.
- New JIRA: create `docs/jiras/<YYYY-MM-DD>-<slug>.md` from
  `references/jira-document-template.md`.
- Existing legacy JIRA in `docs/`: edit it only when the user explicitly asks.
- Always update `docs/jiras/INDEX.md`.

## ID allocation

1. Read all IDs in the target document and in the index.
2. Next ID = highest existing ID for that prefix + 1.
3. Never reuse an ID, even if a card is deleted.
4. A new prefix starts at `001` and must be registered in the index.
5. If a prefix already exists in another document, do not duplicate it. Propose
   appending to that document or using a new prefix.

## Pipeline

1. Validate destination, prefix and phase.
2. Read index, document header and task map.
3. Detect duplicates by title, objective and affected files.
4. Research the codebase for every task.
5. Assign metadata: priority, type, size, risk, layers, dependencies and ADR.
6. Write complete cards using `references/task-template.md`.
7. Update the task map table and dependency graph.
8. Update document header, DoD and Change Log.
9. Update `docs/jiras/INDEX.md`.
10. Validate the whole document.
11. Return a summary with IDs, files and open questions.

## Research protocol

For each task:

- Use `grep`, `glob` and `read` to find symbols, files, tests, rules and ADRs.
- Read neighbouring tests and implementation files to match existing patterns.
- Verify every referenced path exists, or mark it explicitly as `nuevo`.
- Cite evidence as `src/.../file.ts:123`; if the line may move, cite the file and
  symbol instead.
- Check `src/test/unit/architecture/layer-boundaries.test.ts` before assigning
  layers.
- Check `src/presentation/i18n/messages.ts` for visible text.
- Check `firestore.rules`, `storage.rules` and indexes for backend changes.
- Read `docs/adr/` before proposing a new ADR.
- Do not invent APIs, files, behaviour or acceptance criteria.

If a task cannot be made independently workable, mark it `BLOCKED` and list
concrete questions. Do not fill gaps with vague assumptions.

## Duplicate detection

Treat tasks as likely duplicates when they share most of:

- title or objective;
- affected files or symbols;
- user-visible behaviour;
- acceptance criteria.

If the duplicate is `DONE`, only create a new task when the new request is a
regression or a genuinely different behaviour. Ask before merging or deleting.

## Dependencies

- Infer real dependencies: schema, port, shared component, ADR decision, data
  migration.
- Verify every dependency exists.
- Detect cycles.
- Update the recommended order graph.
- If two tasks touch the same file in conflicting ways, say so and recommend an
  order.

## Acceptance criteria quality

Each criterion must be observable and testable. Prefer:

- "Pressing Ctrl/Cmd + V with an image creates one image element."
- "An editor cannot delete another member."

Avoid:

- "Improve the experience."
- "Make it work better."
- "Refactor the component."

## ADR rule

Mark `ADR: Sí` when the task crosses layers, changes a contract, changes a
security boundary or makes a decision future tasks must respect. Describe the
decision in the card. The implementer assigns the final ADR number when the ADR
is created.

## Validation before finishing

- IDs unique and sequential.
- States valid.
- Dependencies exist and have no cycles.
- Files exist or are marked `nuevo`.
- Scope and out-of-scope are non-empty and non-contradictory.
- Acceptance criteria are measurable.
- Tests map to acceptance criteria.
- i18n ES/EN when there is visible text.
- Accessibility when there is interaction.
- Rules and indexes when Firestore/Storage is touched.
- ADR when a boundary or relevant decision changes.
- No references to the chat ("as discussed above").
- No secrets, local paths or environment values.
- Change Log, task map, graph and index updated.
- Every card has a complete Definition of Ready.

Run `node scripts/jira.mjs validate` after writing and fix every reported error.

## Output

Report:

```text
JIRA: docs/jiras/...
Tareas creadas: <IDs>
Duplicados: ...
Dependencias: ...
Preguntas abiertas: ...
Siguiente tarea recomendada: <ID>
Archivos modificados: ...
```

Never implement code. Never commit.
