---
name: cachiplunca-architecture
description: Use when implementing or reviewing Cachiplunca code in domain, application, infrastructure, presentation or app. Enforces Clean Architecture layers, allowed imports, ports and adapters, commands and queries, AppError and the composition root.
compatibility: opencode
---

# Cachiplunca architecture

## Layer map

| Layer                | May depend on                                                              |
| -------------------- | -------------------------------------------------------------------------- |
| `src/domain`         | `domain`, `shared`                                                         |
| `src/application`    | `application`, `domain`, `shared`                                          |
| `src/infrastructure` | `infrastructure`, `application`, `domain`, `shared`                        |
| `src/presentation`   | `presentation`, `application`, `domain`, `shared`                          |
| `src/app`            | `app`, `presentation`, `application`, `domain`, `infrastructure`, `shared` |
| `src/shared`         | `shared`                                                                   |
| `src/test`           | Any layer; tests are consumers                                             |

The executable gate is
`src/test/unit/architecture/layer-boundaries.test.ts`. Run it through `npm test`.

## Hard rules

- Domain does not import React, Firebase, styled-components, `@raulrod/*`, Node
  APIs or browser APIs.
- Application does not import React, UI libraries, Firebase or infrastructure.
- Presentation does not import Firebase or infrastructure.
- Infrastructure implements application ports; it does not own UI.
- `src/app` is the only composition root and is never imported by other layers.
- Production code never imports from `src/test`.

## Commands and queries

- State-changing operations are explicit commands in `src/application/commands`.
- Reads are explicit queries in `src/application/queries`.
- Expected failures return discriminated unions, not thrown exceptions.
- Validate input with pure functions before calling a port.
- Normalise unexpected errors through `toAppError`.
- Preserve `AppError` instances when they already describe the failure.

Typical command shape:

```ts
export type Result =
  | { readonly status: 'ok'; readonly value: T }
  | { readonly status: 'invalid-input'; readonly fieldErrors: FieldErrors }
  | { readonly status: 'error'; readonly error: AppError };
```

## Ports and adapters

- Ports live in `src/application/ports`.
- Adapters live in `src/infrastructure`.
- Ports use domain types; adapters map external data to domain entities.
- Application tests use fakes, never Firebase.
- Contract tests cover behaviour shared by fakes and adapters.

## Composition root

- `src/app/config/*-services.ts` instantiates adapters.
- `src/App.tsx` and providers wire services.
- Presentation receives use cases and ports through props, context or the
  composition root.
- Do not instantiate Firebase inside presentation components.

## Error model

- `AppError` is a discriminated union by `kind`.
- Use `toAppError` at infrastructure and external boundaries.
- Do not expose raw Firebase errors to the UI.
- Validation errors use `invalid-input` with field errors; unexpected failures
  use `error`.

## Review checklist

Before finishing:

- [ ] No forbidden import between layers.
- [ ] Domain has no framework or browser dependency.
- [ ] Application only knows ports.
- [ ] Infrastructure maps external data to domain types.
- [ ] Presentation does not import Firebase or infrastructure.
- [ ] Commands and queries return explicit results.
- [ ] Errors are normalised and preserved correctly.
- [ ] Tests use fakes for application and mock the SDK for infrastructure.
- [ ] The architecture boundary test passes.
