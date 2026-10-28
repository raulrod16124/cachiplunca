---
name: cachiplunca-firebase
description: Use when changing Cachiplunca Firestore or Storage behaviour, security rules, indexes, Firebase adapters, image cleanup, memberships, invitations, notifications or favorites. Covers emulator tests and the rules-as-security-boundary model.
compatibility: opencode
---

# Cachiplunca Firebase

## Boundary

- Firebase rules are the effective security boundary.
- The UI may hide forbidden actions, but rules must reject them anyway.
- Never trust client-provided fields; validate them in rules.
- Domain and application stay Firebase-free.
- Firebase SDK imports live only in `src/infrastructure/firebase`.
- Presentation receives services through the composition root.

## Adapters

- Ports live in `src/application/ports`.
- Adapters map Firestore documents to domain entities and back.
- Map missing legacy fields explicitly; do not silently invent values.
- Normalise SDK errors with the existing mapper; never leak raw Firebase errors.
- Contract tests cover the behaviour shared by fakes and adapters.
- Infrastructure tests mock the SDK and verify the mapping and calls.

## Firestore rules

When a change touches rules:

1. Update the rule and the index if needed.
2. Add allowed and denied tests in `src/test/rules/firestore.rules.test.ts`.
3. Cover owner, editor, viewer, non-member and unauthenticated actors.
4. Cover fields that must not change.
5. Run `npm run test:rules`.

Do not rely on frontend guards. The rules are the final gate.

## Storage rules

- Keep image paths scoped to the workspace.
- Cover owner/editor upload and delete; viewer and non-member denial.
- Keep deletion best-effort and idempotent (`object-not-found` is success).
- Do not delete an image before Firestore confirms the change.
- Do not delete an image still referenced by another element or cover.
- Document undo/redo, duplicate and legacy-data behaviour.
- Add allowed and denied tests in `src/test/rules/storage.rules.test.ts`.
- Run `npm run test:rules`.

## Indexes

- Add an index only when a query needs it.
- Update `firestore.indexes.json` and document the query.
- Verify the emulator does not warn about a missing index.

## Common domains

- Memberships and invitations: respect role matrix and email verification.
- Comments: author-only edit window and `editedAt`.
- Notifications: never allow impersonating another user.
- Favorites: private per user, deterministic ID.
- Activity: writes are best-effort and must not block the main operation.

## Verification

- `npm run test:rules` for Firestore/Storage changes.
- `npm test` for adapter, mapper, contract and application tests.
- `npm run test:e2e` when a real user flow or permission boundary changes.
- `npm run build` when Firebase configuration or app wiring changes.

## Guardrails

- Do not run Firebase against production.
- Do not deploy rules unless the user explicitly asks.
- Do not add broad rules to make a test pass.
- Do not expose member details, invitations or comments to guests.
- Do not commit secrets or environment values.
