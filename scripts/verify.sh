#!/usr/bin/env bash
set -euo pipefail

npx tsc -b --noEmit
npm run lint
npm run format:check
npm run test:jira
npm test

if [ -f docs/jiras/INDEX.md ]; then
  node scripts/jira.mjs validate
fi
