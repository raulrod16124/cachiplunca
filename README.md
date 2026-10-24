<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/dark_theme_logo_cachiplunca.png">
    <img src="public/brand/dark_theme_logo_cachiplunca.png" width="112" alt="Cachiplunca">
  </picture>
</p>

<h1 align="center">Cachiplunca</h1>

<p align="center">
  <strong>From scattered ideas to shared plans.</strong>
</p>

<p align="center">
  A collaborative visual workspace for small teams. Think, organize and plan on
  one infinite canvas, then share the result with the people who need it.
</p>

<p align="center">
  <a href="https://raulrod16124.github.io/cachiplunca/"><strong>Try the live app</strong></a>
  ·
  <a href="docs/architecture.md">Architecture</a>
  ·
  <a href="docs/adr/">ADRs</a>
  ·
  <a href="LICENSE">MIT License</a>
</p>

<p align="center">
  <a href="https://github.com/raulrod16124/cachiplunca/actions/workflows/ci.yml">
    <img src="https://github.com/raulrod16124/cachiplunca/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license">
  </a>
</p>

## Why Cachiplunca

Most workshops end where the real work begins: someone exports the board, rewrites
the notes and rebuilds the decisions in a task tracker. Cachiplunca closes that
loop.

The board is the plan. Capture ideas freely, group them into frames, turn notes
and frames into tasks, and present or share the same canvas without exporting
your thinking into another tool.

- **One place from idea to task.** Notes, tasks, frames, images, links and
  connectors live on the same canvas. A planning view is derived from the board,
  not copied out of it.
- **Collaboration without ceremony.** Teammates see changes, cursors and presence
  in real time. There are three clear roles and a read-only link for stakeholders
  who do not need an account.
- **Structure when you need it.** Start from a retrospective, project kickoff or
  brainstorming template, or open a blank board and make your own structure.
- **Built to be used, not just demoed.** Keyboard shortcuts, undo/redo, autosave,
  comments, notifications, accessibility preferences and English/Spanish UI.
- **Yours to host.** The source is MIT-licensed and runs on your own Firebase
  project.

## Who it is for

Cachiplunca is designed for small product, design and engineering teams that think
visually and plan together: discovery sessions, kickoffs, retrospectives,
brainstorming, lightweight roadmaps and project planning.

It is also useful for facilitators who want a ready-made structure and for teams
that need to share a visual plan with clients or stakeholders without giving them
edit access.

It is intentionally lightweight. It is not a full project-management suite, and
the board remains the source of truth for tasks and planning views.

## What you can do

### Explore ideas on an infinite canvas

- Pan, zoom, navigate with a grid and select with a marquee or multi-selection.
- Seven element types: **text, note, task, frame, connector, link and image**.
- Rich-text formatting with fonts, sizes, colors, highlights, lists and
  alignment; note colors and image uploads (including drag and drop).
- Move, resize, rotate, align, distribute, reorder and duplicate elements.
- Copy/paste elements or plain text, undo/redo, and use keyboard shortcuts.
- Search and jump to elements from the command palette.

### Turn thinking into a plan

- A task plan derived from the board with **list** and **board/kanban** views.
- Create tasks from notes and frames, or add them directly to the canvas.
- Task statuses: **Todo, In progress, Completed and Blocked**.
- Assign teammates, set due dates, filter by status and show only your tasks.
- Board templates for **retrospective**, **project kickoff** and **brainstorming**,
  plus a blank start.
- Present the board frame by frame, or export it as JSON or a print-ready PDF.

### Collaborate with clear access

- Real-time element updates, presence, remote cursors, sync status and reconnect
  handling.
- Roles: **Owner** manages the board and its members, **Editor** edits content and
  invites people, **Viewer** reads the board.
- Create email-addressed, one-time invitation links and share them directly;
  pending invitations also appear in-app for the invited address. Email
  verification is required to accept. Cachiplunca does not send the invitation
  email for you.
- Comments on elements, with editing, resolution and unresolved-comment
  indicators.
- An in-app notification center for invitations and comment activity.
- Read-only guest links that open the board without an account. Guests cannot see
  member details, invitations or comments.
- Private favorite boards, board cover images, board search and grid/list views.
- Boards are ordered by real activity, not just by when they were created.

### Make it yours

- Command palette (`Ctrl/Cmd + K`) for creating elements, finding content and
  moving between boards.
- A local focus/session timer for workshops (not shared or saved with the board).
- English and Spanish UI, system/light/dark themes, four font sizes and reduced
  motion.
- Keyboard-first navigation and accessible labels throughout the canvas.
- Desktop-first experience. Mobile layouts are not a current target.

## How it is built

Cachiplunca follows **Clean Architecture + Hexagonal Architecture**. Dependencies
point inward: the UI and infrastructure depend on application contracts, and the
domain is independent of React, Firebase and browser APIs.

In the codebase, a board is modelled as a `Workspace`; the UI calls it a board.

```text
Presentation ──► Application ──► Domain
       │               ▲
       │               │
       └──────────► Shared ◄──────────┐
                                      │
Infrastructure ──► Application ports ─┘

app/ composes every layer and is never imported by them.
```

| Path                 | Responsibility                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `src/domain`         | Entities, value objects and invariants: boards, elements, memberships, invitations, guest links.   |
| `src/application`    | Commands, queries, ports, stores and pure services for canvas, persistence, realtime and planning. |
| `src/infrastructure` | Firebase adapters (Auth, Firestore, Storage, presence), browser adapters and crypto.               |
| `src/presentation`   | React components, canvas, feature UI, hooks, i18n, theme and styles.                               |
| `src/app`            | Composition root: service factories, providers and routes.                                         |
| `src/shared`         | Cross-cutting types, errors and small pure utilities.                                              |
| `src/test`           | Unit, contract, integration, rules, end-to-end fixtures and performance suites.                    |

Key architectural choices:

- **Ports and adapters** isolate Firebase from the application and make use cases
  testable with in-memory fakes.
- **Commands and queries** return discriminated unions instead of throwing for
  expected failures, so error handling is part of the type contract.
- **Optimistic canvas edits** are persisted through a debounced batcher and
  reconciled with remote changes. Failed mutations roll back.
- **Last-write-wins collaboration**, not CRDT. The board remains the single source
  of truth for tasks and plan views.
- **Firestore Security Rules are the authorization boundary.** Frontend guards only
  reflect permissions early.
- **Viewport culling, memoized rendering and executable performance budgets** keep
  large boards responsive.
- **Executable architecture enforcement** fails tests when layer boundaries or
  forbidden imports are broken.

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

## Documentation

| Document                                       | Content                                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | Layers, dependency rules, patterns and enforcement.       |
| [`docs/adr/`](docs/adr/)                       | Architecture Decision Records and their rationale.        |
| [`docs/performance/`](docs/performance/)       | Canvas performance strategy, budgets and how to run them. |
| [`AGENTS.md`](AGENTS.md)                       | Engineering conventions for contributors and agents.      |

## Contributing

Read [`AGENTS.md`](AGENTS.md) before contributing. The project uses TypeScript
strict mode, Oxlint, Prettier and tests for domain logic and pure functions.

## License

[MIT](LICENSE) © Raúl Rodríguez
