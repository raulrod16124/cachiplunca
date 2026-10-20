# Architecture

Cachiplunca is a browser application built with **Clean Architecture + Hexagonal
Architecture**. Dependencies point inward: UI and infrastructure depend on
application contracts, and the domain depends on nothing but itself and shared
language.

This document is a living overview. The rationale behind individual decisions
lives in the [ADRs](adr/).

## Layers

| Layer                | Responsibility                                                                                       | May depend on                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/domain`         | Entities, value objects and invariants: workspaces, elements, memberships, invitations, guest links. | `domain`, `shared`                                                         |
| `src/application`    | Commands, queries, ports, stores and pure services (canvas, persistence, realtime, plan, export).    | `application`, `domain`, `shared`                                          |
| `src/infrastructure` | Firebase adapters (Auth, Firestore, Storage, presence), browser adapters and crypto.                 | `infrastructure`, `application`, `domain`, `shared`                        |
| `src/presentation`   | React components, canvas, hooks, features, i18n, theme and UI styles.                                | `presentation`, `application`, `domain`, `shared`                          |
| `src/app`            | Composition root: service factories, providers and routes.                                           | `app`, `presentation`, `application`, `domain`, `infrastructure`, `shared` |
| `src/shared`         | Cross-cutting types, errors and small pure utilities.                                                | `shared`                                                                   |
| `src/test`           | Unit, integration, contract, rules, performance and fixtures.                                        | Any layer (tests are consumers)                                            |

```text
Presentation ──► Application ──► Domain
       │               ▲
       │               │
       └──────────► Shared ◄──────────┐
                                      │
Infrastructure ──► Application ports ─┘

app/ composes every layer and is never imported by them.
```

The important rule is not just the direction of imports but the absence of
concrete implementations in the inner layers:

- **Domain** does not import React, Firebase, styled-components, `@raulrod/ui`,
  Node APIs or browser APIs.
- **Application** does not import React, UI libraries, Firebase or
  infrastructure. It only knows ports.
- **Infrastructure** implements application ports with concrete adapters.
- **Presentation** never imports Firebase or infrastructure. It receives use
  cases and ports through props, context or the composition root.
- **`src/app`** is the only place that instantiates adapters and wires them
  together.

## Composition root

`src/App.tsx` and `src/app/config/*-services.ts` create the concrete adapters and
inject them into the application and presentation layers. Routes live in
`src/app/routes`, while providers used by the UI live in
`src/presentation/providers`.

This keeps Firebase out of the UI and makes the application testable with fakes.

## Key patterns

### Commands and queries

State-changing operations are explicit commands; reads are explicit queries.
Both return discriminated unions instead of throwing for expected failures. This
makes error handling part of the type contract and keeps the UI predictable.

### Ports and adapters

Persistence, authentication, realtime, presence, image storage and file download
are defined as ports in `src/application/ports`. Firebase and browser APIs are
implemented only in `src/infrastructure`.

### Optimistic updates and persistence

Canvas edits are applied locally first and persisted through a persistence
orchestrator with a debounced batcher. Failed mutations roll back; remote changes
are reconciled through the realtime subscription manager. This keeps the canvas
responsive without hiding persistence errors.

### Realtime collaboration

Firestore listeners drive remote element updates, remote cursors and presence.
The conflict strategy is **last write wins** with an explicit revision model; it
does not attempt CRDT semantics. See ADR-0013 and ADR-0016.

### Canvas rendering

The canvas separates pure application helpers (hit testing, bounds, visibility,
alignment, plan selection) from React rendering. Rendering uses viewport culling,
memoized element views and stable ARIA labels. Performance invariants and budgets
are documented in [`docs/performance/`](performance/).

### Authorization

Effective authorization lives in Firebase Security Rules. Domain and application
also expose a permission matrix and frontend guards so the UI reflects
permissions early, but the rules remain the security boundary. See ADR-0021,
ADR-0023 and ADR-0034.

## Enforcement

The boundaries above are enforced by an executable test:
`src/test/unit/architecture/layer-boundaries.test.ts`. It scans production
sources and fails on:

- relative imports outside the allowed dependency graph;
- forbidden packages in restricted layers;
- browser APIs in `domain`, `application` and `shared`;
- production imports from `src/test`.

Because the gate runs in `npm test`, it also runs in CI.

The gate resolves imports with path resolution and regular expressions. It does
not interpret conditional dynamic imports (the project does not use them) or
evaluate semantic coupling inside a layer.

## Testing strategy

| Suite          | Purpose                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| Unit           | Domain invariants, pure application services, presentation components.        |
| Contract       | Port behavior shared by fakes and Firebase adapters.                          |
| Integration    | UI journeys with in-memory fakes for application ports.                       |
| Security Rules | Firestore and Storage rules against Firebase emulators.                       |
| End-to-end     | Playwright journeys against Firebase emulators with real rules.               |
| Performance    | Structural render guard in `npm test` and absolute budgets in `npm run perf`. |

## Further reading

- [ADR index](adr/) — architecture decision records.
- [Performance](performance/) — canvas performance strategy and budgets.
- [AGENTS.md](../AGENTS.md) — engineering conventions for contributors and agents.
