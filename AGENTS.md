# Cachiplunca — engineering conventions

- Use TypeScript strict mode.
- Use Oxlint. Do not use ESLint.
- Use Prettier for formatting.
- Use @raulrod/ui as the base UI component library.
- UI dependencies belong to the presentation layer.
- Domain must not depend on React, Firebase, styled-components or @raulrod/ui.
- Application must not depend on React or UI libraries.
- Infrastructure contains Firebase adapters.
- Respect Clean Architecture and Hexagonal Architecture.
- Prefer explicit types over any.
- Add tests for domain logic and pure functions.
- Do not add comments unless they explain a non-obvious decision.
- Do not commit, amend, push or create PRs unless explicitly requested.

## Commands

```bash
npm run dev            # Vite dev server
npm test               # Jest, includes the architecture boundary gate
npm run lint           # Oxlint
npm run format:check   # Prettier check
npx tsc -b --noEmit    # Type check
npm run verify         # tsc + lint + format:check + tests (+ JIRA validate locally)
npm run test:rules     # Firestore/Storage rules against emulators
npm run test:e2e       # Playwright against emulators
npm run perf           # Performance budgets
npm run build          # Production build
```

## Task workflow

Use the OpenCode commands when they fit:

- `/jira-add` — turn a chat task list into complete local JIRA cards.
- `/jira-next` — select and work the next eligible JIRA task. Use
  `/jira-next plan` to plan without changing code.
- `/jira-close` — close a JIRA document when every task is `DONE`.
- `/task-verify` — run the quality gates for the current task.
- `/task-close` — verify and close the current task.
- `/review` — review architecture, tests and security.
- `/new-adr` — create an ADR with the next number.
- `/e2e <spec>` — run a scoped Playwright spec.

Deterministic JIRA helpers:

```bash
npm run jira:list
npm run jira:next
npm run jira:validate
```

Manual workflow:

1. Read `AGENTS.md`, `docs/architecture.md` and the relevant JIRA card.
2. Use `docs/jiras/INDEX.md` to locate the active local JIRA.
3. Check dependencies; only start a task whose dependencies are `DONE`.
4. Create a branch named `feat/<prefix>-<nnn>-<slug>`.
5. Write or update the failing test first.
6. Implement the smallest change that satisfies the card.
7. Run the gates required by the change.
8. Update the JIRA status, Change Log, `docs/jiras/INDEX.md` and `.local/session-log.md`.
9. Leave a ready-to-use commit message. Do not commit.

Local JIRA documents live in `docs/jiras/` and are ignored by git. Existing
JIRA documents remain in `docs/` and are referenced from the index. Never
delete a JIRA document automatically.

## Skills

Use the project skills when the task matches:

- `cachiplunca-workflow` — task selection, states, gates, branch, close and
  session log.
- `cachiplunca-jira-authoring` — turn a chat task list into a complete JIRA
  document or append tasks to an existing one.
- `cachiplunca-architecture` — layers, ports, commands, queries and AppError.
- `cachiplunca-testing` — test placement, fakes, Jest, rules, e2e and perf.
- `cachiplunca-ui` — components, @raulrod/ui, tokens, i18n, accessibility and
  canvas interactions.
- `cachiplunca-firebase` — Firestore/Storage rules, indexes, adapters and image
  cleanup.

Subagents: `jira-author`, `task-planner`, `gate-runner`,
`architecture-reviewer`, `rules-reviewer` and `docs-scribe`.

The global `react-typescript-best-practices` skill still applies to React and
TypeScript work.

## Definition of Done

- Scope implemented; out of scope untouched.
- `npx tsc -b --noEmit` passes.
- `npm run lint` passes.
- `npm run format:check` passes.
- `npm test` passes.
- `npm run test:rules` passes when Firestore/Storage is touched.
- `npm run test:e2e` passes when real user flows are touched.
- i18n ES/EN parity for visible text.
- No forbidden imports between layers.
- ADR updated when a layer boundary or relevant decision changes.
- JIRA status, Change Log, index and session log updated.

## Further reading

- `docs/architecture.md`
- `docs/adr/`
- `docs/performance/README.md`
