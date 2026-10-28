---
name: cachiplunca-workflow
description: Use when starting, selecting, planning, verifying or closing a Cachiplunca task from the local JIRA documents. Defines task states, dependency checks, branch naming, test-first flow, quality gates, session log, JIRA lifecycle and the no-commit rule.
compatibility: opencode
---

# Cachiplunca workflow

## Sources of truth

- `AGENTS.md` — engineering conventions.
- `docs/architecture.md` — layers and boundaries.
- `docs/jiras/INDEX.md` — local JIRA registry and phase order.
- The selected JIRA card — scope, dependencies, acceptance criteria and DoD.
- `docs/adr/` — decisions that must be respected.
- `.local/session-log.md` — local session history.

Read only the index, the selected card and the files it references. Do not load
whole JIRA documents unless the card is unclear.

## Task states

- `TODO`: pending.
- `IN PROGRESS`: being worked on.
- `BLOCKED`: waiting for a dependency, decision or ADR.
- `REVIEW`: implemented, pending manual/visual validation.
- `DONE`: meets the Definition of Done.

`CANCELLED` is not part of the current vocabulary. If a task is dropped, ask the
user before changing or deleting its card.

## Selecting the next task

1. Read `docs/jiras/INDEX.md`.
2. Load the active JIRA documents in index order.
3. Filter `TODO` tasks.
4. Exclude tasks whose dependencies are not `DONE`.
5. Exclude tasks with open blocking questions.
6. Sort by: phase order, priority (`P0` first), recommended graph order, size,
   risk, then ID.
7. If there is a tie, ask or choose the first one and explain why.
8. If nothing is eligible, report blocked tasks, review tasks and completed
   phases. Do not invent work.

When `/jira-next` receives `plan`, only select and plan. Do not modify code.

## Starting a task

1. `git status` must be clean. If it is not, stop and report.
2. Mark the card `IN PROGRESS`.
3. Create a branch: `feat/<prefix-lower>-<nnn>-<slug>`.
4. Reuse an existing matching branch instead of creating a duplicate.
5. Do not commit, amend, push or create a PR.

Example: `feat/cach-prd-001-add-zoom-shortcuts`.

## Implementation

1. Write or update the failing test that describes the new behaviour.
2. Implement the smallest change that satisfies the card.
3. Respect the card's scope and out-of-scope list. Do not add unrelated
   refactors.
4. Use fakes for application tests; never use Firebase in unit tests.
5. Add i18n keys in both `en` and `es` for visible text.
6. If a canvas gesture is touched, cover the positive and negative cases.
7. If Firestore or Storage is touched, update rules, indexes and rules tests in
   the same change.
8. If a layer boundary or relevant decision changes, create or update the ADR
   before finishing.

## Gate matrix

| Change                     | Required gates                                                            |
| -------------------------- | ------------------------------------------------------------------------- |
| Any change                 | `npx tsc -b --noEmit`, `npm run lint`, `npm run format:check`, `npm test` |
| Domain/application         | Unit and contract tests                                                   |
| Presentation/UI            | Unit, integration and visual review                                       |
| Firestore/Storage          | `npm run test:rules`                                                      |
| Real user flow             | `npm run test:e2e` (prefer a scoped spec)                                 |
| Canvas/performance         | `npm run perf` when relevant                                              |
| App/routes/assets          | `npm run build`                                                           |
| Visible text               | ES/EN parity                                                              |
| Layer boundary or decision | ADR updated                                                               |

`npm run verify` runs the base gates: typecheck, lint, format check and tests.

## Closing a task

Set `DONE` only when:

- the scope is implemented and out-of-scope work is untouched;
- the required gates pass;
- i18n parity is satisfied when there is visible text;
- no forbidden imports exist;
- the ADR is updated if needed;
- the Change Log, index and session log are updated.

If a manual or visual validation remains, set `REVIEW` and state exactly what
is missing. `/jira-next` may close in `DONE` when the automated gates and the
card's acceptance criteria are satisfied.

## Session log

Append an entry to `.local/session-log.md` using
`references/session-log-template.md`. Never replace previous entries.

## Commit message

Inspect `git log --oneline -10` and match the repository style: lowercase,
imperative and concise, usually without a task ID. Leave the message ready but
do not run `git commit`.

Examples:

- `add image drag and drop to the board`
- `fix workspace title metadata in production`

## JIRA document lifecycle

1. `/jira-add` creates or updates a document in `docs/jiras/`.
2. `/jira-next` works tasks and updates their states.
3. `/jira-close` marks the document `DONE` when every task is `DONE`.
4. The file remains on disk. Never delete it automatically.

## Delegation map

- `jira-author`: create or update JIRA cards. Docs only.
- `task-planner`: read a card and return an implementation plan. No edits.
- `gate-runner`: run the required gates and report failures. No edits.
- `architecture-reviewer`: review layers, imports, commands, ports and ADR need.
- `rules-reviewer`: review Firestore/Storage rules, indexes and their tests.
- `docs-scribe`: update JIRA, index, Change Log, session log and ADR.

`/jira-next` orchestrates the full cycle: `task-planner` for the plan,
`gate-runner` for verification, `architecture-reviewer` and `rules-reviewer`
for review, and `docs-scribe` for closing documentation. The primary agent
implements the code and fixes the findings.

Commands:

- `/jira-add` — task list to JIRA.
- `/jira-next [plan|ID]` — select and work the next task.
- `/jira-close` — close a JIRA document when every task is `DONE`.
- `/task-verify` — run gates for the current task.
- `/task-close` — verify and close the current task.
- `/review` — architecture, tests and security review.
- `/new-adr` — create an ADR.
- `/e2e <spec>` — run a scoped Playwright spec.

The deterministic selector is available through:

```bash
npm run jira:list
npm run jira:next
npm run jira:validate
```

## Metrics

After closing a task, append a row to `docs/jiras/METRICS.md` when that local
file exists:

- date;
- task ID;
- time from selection to implementation start;
- time to green gates;
- missed gates;
- review findings by severity;
- notes.

After a few tasks, prune skills or agents that never trigger or add noise.

## Guardrails

- Do not start a task with unmet dependencies.
- Do not skip the failing test.
- Do not hide failures by weakening tests or retries.
- Do not modify `@raulrod/ui`, `@raulrod/tokens` or `node_modules`.
- Do not commit or push unless explicitly requested.
- Do not delete or rewrite JIRA history.
- Do not mark `DONE` with a failing gate or an open blocking question.
