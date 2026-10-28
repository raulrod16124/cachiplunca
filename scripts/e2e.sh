#!/usr/bin/env bash
# Runs the Playwright E2E suite against the Firebase emulators (Auth + Firestore + Storage).
# Extra arguments are forwarded to `playwright test`, e.g.:
#   ./scripts/e2e.sh 00-repro --reporter=list
set -euo pipefail
cd "$(dirname "$0")/.."

# Free port 5173 from a previous dev server so Playwright can start its own.
if lsof -ti:5173 >/dev/null 2>&1; then
  lsof -ti:5173 | xargs kill -9 || true
  sleep 1
fi

npx firebase emulators:exec --only auth,firestore,storage --project demo-cachiplunca \
  "node node_modules/@playwright/test/cli.js test ${*:---reporter=list}"
