# ADR-0029: Override de dependencias para cerrar vulnerabilidades de producción (TASK-121)

**Fecha:** 2026-10-15
**Estado:** Aceptado
**Tarea:** TASK-121 — Dependency audit (`docs/mvp-backlog.md`)

## Contexto

TASK-121 audita las dependencias del MVP. El informe completo está en
`docs/audits/dependency-audit.md`.

El grafo **de producción** presentaba 4 vulnerabilidades `high` sin corrección
dentro de rango: `@firebase/firestore@4.17.2` (dependencia de `firebase@12.19.0`)
fija `@grpc/grpc-js` con `~1.9.0`, y toda la línea `1.9.x` cae dentro del rango
vulnerable `<=1.13.5` (`GHSA-m9gg-hp2v-232j` y `GHSA-f596-whhp-79r4`, revisión de
certificados y fuga de mensajes de error en `@grpc/grpc-js`). `npm audit` no puede
arreglarlo sin `--force`, y el `--force` que propone npm degrada `firebase` a
`9.14.0` (major descartado) o sube `firebase-tools` a 15 (exige JDK ≥21, ADR-0023).

`@grpc/grpc-js` solo se usa en el transporte Node (emulador/toolchain), no en el
bundle del navegador, que resuelve Firestore por `fetch`/webchannel.

## Decisión

1. **Se fija `@grpc/grpc-js` con un `override` de npm** en `package.json`:

   ```json
   "overrides": { "@grpc/grpc-js": "^1.14.6" }
   ```

   La línea `1.14.x` es la que ya resuelven otras ramas del árbol
   (`firebase-tools`, `google-gax`), por lo que se aplica una versión presente y
   probada en el proyecto, no una arbitraria. El override se propaga a todas las
   copias y deduplica el paquete a una sola entrada en el lockfile.

2. **La validación es funcional, no solo de metadatos:** cambios en la resolución
   de dependencias deben pasar `npm run test:rules` (Firestore real contra el
   emulador por gRPC en Node) además de los quality gates (lint, format, tsc,
   test, build). El override se aplicó tras verificar 68/68 rules tests y build.

3. **El override es transitorio:** debe reevaluarse al subir `firebase` a la v13
   (TASK-130) y eliminarse si upstream publica un rango parcheado.

## Alternativas consideradas

- **`npm audit fix --force`:** rechazado; degrada `firebase` a `9.14.0` (rompe el
  contrato del SDK y ADR-0006/0009) o sube `firebase-tools` a 15, que exige JDK ≥21
  (ADR-0023).
- **Aceptar las 4 vulnerabilidades `high` como riesgo de producción:** rechazado;
  son las únicas que afectan al runtime desplegado y tienen una mitigación verifiable
  sin cambio de major.
- **Reemplazar `firebase` por imports granulares (`@firebase/firestore` directo):**
  rechazado por ahora; cambia el modelo de dependencias y no aporta frente al override.
- **Forkear/parchear `@firebase/firestore`:** rechazado; coste de mantenimiento
  desproporcionado.

## Consecuencias

- Producción queda en **0 vulnerabilidades conocidas** (`npm audit --omit=dev`).
- `package-lock.json` registra la resolución forzada; `npm ci` es reproducible.
- Se asume el riesgo de que `@grpc/grpc-js` `1.14.x` no sea la versión declarada por
  `@firebase/firestore` (`~1.9.0`); se mitiga con la suite de rules sobre el
  emulador y se revisa al subir `firebase` (TASK-130).
- Los advisories restantes (`firebase-tools@14`, `jest@29`) son de desarrollo y se
  atendrán en TASK-128, sin afectar al despliegue.
