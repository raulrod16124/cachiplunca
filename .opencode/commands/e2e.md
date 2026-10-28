---
description: Ejecuta un spec de Playwright contra los emuladores de Firebase.
agent: gate-runner
---

Carga la skill `cachiplunca-testing`.

Argumentos:

$ARGUMENTS

1. Si hay un spec, ejecuta `bash scripts/e2e.sh <spec>`.
2. Si no hay spec, ejecuta la suite e2e completa con `npm run test:e2e`.
3. Resume el resultado, el primer fallo y el spec afectado.

No edites archivos. No actualices baselines visuales sin autorización explícita.
No hagas commit.
