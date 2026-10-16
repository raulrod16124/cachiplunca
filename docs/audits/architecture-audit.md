# Architecture audit

**Tarea:** TASK-122 — Architecture audit (`docs/mvp-backlog.md`)
**Fecha:** 2026-10-15
**Alcance:** las seis capas de producción (`src/domain`, `src/application`, `src/shared`, `src/infrastructure`, `src/presentation`, `src/app`) más el entrypoint (`src/App.tsx`, `src/main.tsx`). `src/test` se audita solo como consumidor, no como fuente de reglas. Reglas de referencia: AGENTS.md y `docs/mvp-backlog.md` §3 (Presentation → Application → Domain; Infrastructure → Application ports → Domain; `app/` como composición).

## Método

1. Inventario de imports relativos entre capas con `rg` sobre los 218 ficheros `.ts`/`.tsx` de producción, resolviendo cada especificador a la capa de destino.
2. Inventario de imports de paquetes externos por capa (React, styled-components, `@raulrod/*`, `firebase`/`@firebase/*`, `node:*`).
3. Búsqueda de APIs de navegador (`window.`, `document.`, `navigator.`, `localStorage`, `sessionStorage`) en Domain, Application y Shared.
4. Verificación de que ningún código de producción importa desde `src/test`.
5. Revisión de barriles (`index.ts`) en busca de re-exports que filtren implementaciones concretas hacia capas superiores.
6. Contraste de las excepciones encontradas con los ADR existentes (ADR-0002, ADR-0004).
7. Clasificación de hallazgos por severidad y acción concreta, y cierre con un gate reproducible.

## Controles verificados (fortalezas)

- **Domain, Application y Shared sin dependencias prohibidas:** 0 imports de `react`, `firebase`, `styled-components`, `@raulrod/*` o `node:*`; 0 accesos a APIs del navegador; 0 imports relativos hacia `infrastructure`, `presentation` o `app`.
- **Application depende de abstracciones:** ningún fichero de `src/application` menciona `infrastructure` ni `firebase`; sus puertos son contratos consumibles con fakes en tests sin SDK.
- **Infrastructure apunta hacia dentro:** los adapters importan `application/ports`, `application/commands` (tipos de contrato) y `domain/`, nunca `presentation` ni `app`; el SDK de Firebase solo vive en `src/infrastructure/firebase/`.
- **Presentation no toca Firebase ni Infrastructure:** 0 imports de `firebase`/`@firebase/*` y 0 imports hacia `src/infrastructure`; la composición concreta (`app/config/*-services.ts`) es el único lugar donde se instancian adapters.
- **Composición aislada en `app/` + entrypoint:** solo `App.tsx` y `src/app/config/*` importan implementaciones concretas.
- **Sin fugas hacia tests:** ningún fichero de producción importa desde `src/test`.
- **Barriles limpios:** los `index.ts` de `application/*` re-exportan solo símbolos de su propia capa.

## Hallazgos

| ID  | Severidad | Estado    | Resumen                                                                                                                   | Evidencia                                                                                                                                 | Acción concreta                                                                                                                        |
| --- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Medium    | Corregido | Inversión de composición: Presentation importaba desde `app/` (`useSession`), situando la UI bajo la capa de composición. | `accept-invitation-page.tsx:4`, `workspaces-page.tsx:4`, `workspace-shell-page.tsx:23` (antes `../../../app/providers/session-provider`). | `SessionProvider`/`useSession` movidos a `src/presentation/providers/`; `App.tsx`, guards y tests importan desde Presentation.         |
| A2  | Medium    | Corregido | Las fronteras de capas eran solo documentales: una regresión de imports no habría fallado ningún quality gate.            | No existía ningún test/script de dependencias entre capas.                                                                                | Gate `src/test/unit/architecture/layer-boundaries.test.ts` (4 aserciones) ejecutándose en `npm test`; verificado en rojo con canarios. |
| A3  | Low       | Corregido | `tsconfig.app.json` no incluía `node` en `types`, por lo que el gate no podía usar `node:fs` dentro de la suite.          | `tsconfig.app.json` (`types: ["vite/client", "jest"]`).                                                                                   | Añadido `"node"`; a cambio, el gate prohíbe `node:*` en todas las capas de producción (solo tests pueden usar APIs de Node).           |
| A4  | Low       | Aceptado  | Infrastructure importa un tipo desde `application/commands`, no solo desde `application/ports`.                           | `src/infrastructure/crypto/invitation-token.ts:1` (`IssuedInvitationToken`).                                                              | Aceptado: sigue dentro de la capa Application y en la dirección Infrastructure → Application; documentado aquí y en ADR-0030.          |
| A5  | Low       | Aceptado  | `App.tsx` y `main.tsx` viven en la raíz de `src/` y no pertenecen a una carpeta de capa.                                  | `src/App.tsx`, `src/main.tsx`.                                                                                                            | El gate los trata como capa `app` (composición), coherente con ADR-0004.                                                               |

No quedan dependencias prohibidas sin justificar: A1 y A3 se corrigieron, A4 y A5 quedan justificados (esta auditoría y ADR-0030).

## Correcciones aplicadas en esta tarea

1. **A1** — `src/app/providers/session-provider.tsx` → `src/presentation/providers/session-provider.tsx` (y su test unitario a `src/test/unit/presentation/providers/`). Actualizados 11 puntos de import: 3 páginas de Presentation, `App.tsx`, los dos guards y 5 ficheros de test. `src/app/providers/` desaparece; `app/` queda como composición pura (config + routes), y ningún módulo de Presentation depende de `app/`.
2. **A2** — `src/test/unit/architecture/layer-boundaries.test.ts`: tabla ejecutable de fronteras (imports relativos por capa, paquetes prohibidos por capa, `node:*` universal, APIs de navegador en domain/application/shared, `src/test` inaccesible desde producción). Validado en rojo con dos canarios (Presentation → `app/`, y `node:fs` en `app/`).
3. **A3** — `types: ["vite/client", "jest", "node"]` en `tsconfig.app.json`, sin errores de solapamiento con `lib: DOM` (`tsc -b` en verde).

## Seguimientos recomendados (fuera de alcance de TASK-122)

- **TASK-123 (MVP documentation):** enlazar este informe y ADR-0030 desde la documentación del MVP.
- **TASK-129 (CI):** el gate de fronteras ya corre en `npm test`, por lo que el pipeline de CI lo hereda automáticamente.

## Limitaciones

- El gate resuelve imports por resolución de rutas y expresiones regulares sobre la sintaxis de import/export; no interpreta imports dinámicos condicionales (el proyecto no los usa) ni reglas semánticas de negocio (eso pertenece a auditorías de dominio).
- No audita el interior de las capas (acoplamiento entre módulos de la misma capa, tamaño de módulos ni duplicación), solo las fronteras.
- `src/test` queda fuera del gate por diseño: los tests consumen varias capas legítimamente.
