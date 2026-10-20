# Cachiplunca

> From scattered ideas to shared plans.

[Live app](https://raulrod16124.github.io/cachiplunca/) · [Architecture](docs/architecture.md) · [ADRs](docs/adr/) · [License](LICENSE)

[![CI](https://github.com/raulrod16124/cachiplunca/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/raulrod16124/cachiplunca/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Cachiplunca is a collaborative visual workspace for small teams. It gives a group
an infinite canvas to collect information, organize it visually and turn it into a
shared plan — without switching between a whiteboard, a task tracker and a
presentation tool.

It is a web application, not a library or an SDK.

## What it solves

- **Brainstorming and workshops.** Capture notes, links and images freely, then
  group and connect ideas on an infinite canvas.
- **Retrospectives and project kickoffs.** Start from a template instead of an
  empty board.
- **Visual planning.** Organize work in frames, convert notes into tasks and read
  the plan as a list or a kanban board.
- **Lightweight collaboration.** Invite teammates with clear roles, work in real
  time and comment directly on elements.
- **Sharing without friction.** Publish a read-only link for stakeholders or
  present frames directly from the board.

## What you can do

### Canvas

- Infinite canvas with pan, zoom, grid, marquee selection and multi-selection.
- Seven element types: **text, note, task, frame, connector, link and image**.
- Rich-text editing, note colors, free connectors and image uploads.
- Alignment and distribution tools, z-order controls, duplicate and copy/paste.
- Undo/redo, keyboard shortcuts and autosave with recovery after refresh.

### Collaboration

- Realtime element updates, presence, remote cursors and reconnect handling.
- Roles: **Owner**, **Editor** and **Viewer**.
- Email invitations, email verification and pending-invitation notifications.
- Element comments with unresolved indicators.
- Read-only guest links backed by anonymous sessions.

### Planning and delivery

- Task plan derived from the board, with list and kanban views.
- Create tasks from notes and frames; assign owners and due dates.
- Workspace templates: blank, retrospective, project kickoff and brainstorming.
- Board presentation mode that walks through frames.
- Export to JSON or PDF.

### Everyday usability

- Command palette (`Ctrl/Cmd + K`) for actions, workspaces and board elements.
- Local session/focus timer.
- English and Spanish UI, with system, light and dark themes.
- Configurable font size and reduced motion.
- Keyboard-first navigation and accessible labels throughout the canvas.

## How it is built

Cachiplunca follows **Clean Architecture + Hexagonal Architecture**. The UI and
infrastructure depend on application contracts; the domain is independent of
React, Firebase and browser APIs.

```text
Presentation ──► Application ──► Domain
       │               ▲
       │               │
       └──────────► Shared ◄──────────┐
                                      │
Infrastructure ──► Application ports ─┘

app/ composes every layer and is never imported by them.
```

| Layer                | Contents                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `src/domain`         | Entities, value objects and invariants: workspaces, elements, memberships, invitations.     |
| `src/application`    | Commands, queries, ports, stores and pure services for canvas, persistence, realtime, plan. |
| `src/infrastructure` | Firebase adapters (Auth, Firestore, Storage, presence), browser adapters and crypto.        |
| `src/presentation`   | React components, canvas, feature UI, hooks, i18n, theme and styles.                        |
| `src/app`            | Composition root: service factories, providers and routes.                                  |
| `src/shared`         | Cross-cutting types, errors and small pure utilities.                                       |

Key architectural choices:

- **Ports and adapters** isolate Firebase from the application and make use cases
  testable with in-memory fakes.
- **Optimistic canvas edits** are persisted through a debounced batcher and
  reconciled with remote changes. Failed mutations roll back.
- **Last-write-wins collaboration**, not CRDT; the board remains the single source
  of truth for tasks and plan views.
- **Firestore Security Rules are the authorization boundary.** Frontend guards only
  reflect permissions early.
- **Viewport culling and memoized rendering** keep large boards responsive, with
  executable performance budgets.

Read [Architecture](docs/architecture.md) for the full dependency rules and
[ADRs](docs/adr/) for the decisions behind them.

## Stack

| Area     | Technology                                                        |
| -------- | ----------------------------------------------------------------- |
| Runtime  | Node 22                                                           |
| Language | TypeScript strict                                                 |
| UI       | React 19 · styled-components · `@raulrod/ui` · TipTap             |
| Backend  | Firebase Auth · Cloud Firestore · Firebase Storage                |
| Build    | Vite                                                              |
| Tests    | Jest · Testing Library · Firebase emulators · Playwright          |
| Quality  | Oxlint · Prettier · executable architecture gate · GitHub Actions |

## Quality

```bash
npm run lint
npm run format:check
npx tsc -b --noEmit
npm test
npm run test:rules
npm run test:e2e
npm run build
```

The repository includes unit, contract, integration, Security Rules, end-to-end
and performance suites. CI runs the quality gates, rules tests and production
dependency audit; merging to `main` deploys the app to GitHub Pages.

## Where to use it

- **Hosted app:** [raulrod16124.github.io/cachiplunca](https://raulrod16124.github.io/cachiplunca/)
  (deployed from `main` through GitHub Pages).
- **Source:** [github.com/raulrod16124/cachiplunca](https://github.com/raulrod16124/cachiplunca).
  The MIT license allows self-hosting with your own Firebase project.
- **Browser support:** desktop-first. The automated end-to-end suite runs on
  Chromium; mobile layouts are not a current target.

## Documentation

| Document                                       | Content                                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | Layers, dependency rules, patterns and enforcement.       |
| [`docs/adr/`](docs/adr/)                       | Architecture Decision Records and their rationale.        |
| [`docs/performance/`](docs/performance/)       | Canvas performance strategy, budgets and how to run them. |
| [`AGENTS.md`](AGENTS.md)                       | Engineering conventions for contributors and agents.      |

## License

[MIT](LICENSE) © Raúl Rodríguez
