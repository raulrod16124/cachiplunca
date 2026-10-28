# Guía del flujo de trabajo OpenCode

Esta guía explica cómo trabajar en Cachiplunca usando las skills, subagentes,
comandos y scripts añadidos al proyecto.

El objetivo es que una tarea pueda empezar, planificarse, implementarse,
verificarse, revisarse, cerrarse y documentarse sin depender del historial de un
chat concreto.

## 1. Antes de empezar

Abre una sesión nueva de OpenCode para que cargue las skills, agentes y comandos
del proyecto.

Comprueba el estado:

```bash
npm run jira:next
npm run jira:validate
```

`jira:next` muestra la siguiente tarea `TODO` elegible. `jira:validate` revisa
IDs, estados, dependencias, ciclos y fichas nuevas.

## 2. Dónde vive cada cosa

| Elemento                  | Ruta                    |
| ------------------------- | ----------------------- |
| Convenciones del proyecto | `AGENTS.md`             |
| Arquitectura              | `docs/architecture.md`  |
| Skills                    | `.opencode/skills/`     |
| Subagentes                | `.opencode/agents/`     |
| Comandos                  | `.opencode/commands/`   |
| Configuración OpenCode    | `opencode.jsonc`        |
| JIRA local                | `docs/jiras/`           |
| Índice de fases           | `docs/jiras/INDEX.md`   |
| Métricas                  | `docs/jiras/METRICS.md` |
| Session log               | `.local/session-log.md` |
| ADRs                      | `docs/adr/`             |
| Selector JIRA             | `scripts/jira.mjs`      |
| Verificación base         | `scripts/verify.sh`     |

`docs/jiras/` y `.local/` están ignorados por git. Los JIRA son locales y no se
borran automáticamente.

## 3. Comandos disponibles

| Comando           | Para qué sirve                                                 |
| ----------------- | -------------------------------------------------------------- |
| `/jira-add`       | Convierte un listado de tareas del chat en fichas JIRA.        |
| `/jira-next`      | Selecciona y trabaja la siguiente tarea pendiente.             |
| `/jira-next plan` | Solo selecciona y planifica, sin modificar código.             |
| `/jira-next <ID>` | Trabaja una tarea concreta.                                    |
| `/jira-close`     | Cierra un documento JIRA cuando todas sus tareas están `DONE`. |
| `/task-verify`    | Ejecuta los gates de la tarea actual.                          |
| `/task-close`     | Verifica y cierra la tarea actual.                             |
| `/review`         | Revisa arquitectura, tests y seguridad.                        |
| `/new-adr`        | Crea un ADR con el siguiente número disponible.                |
| `/e2e <spec>`     | Ejecuta un spec acotado de Playwright.                         |

## 4. Añadir tareas desde el chat

Puedes pasar una lista libre. Ejemplo:

```text
/jira-add
1. Añadir atajos de teclado para el zoom
   - Contexto: el canvas solo permite zoom con botones
   - Criterio: Ctrl/Cmd + + y Ctrl/Cmd + - cambian el zoom
2. Recordar el email en el login
   - Criterio: tras cerrar sesión, el email sigue relleno
```

El flujo:

1. Resuelve el JIRA destino.
2. Si no hay destino, usa la fase activa o propone crear un JIRA nuevo.
3. Investiga el código real.
4. Asigna IDs únicos.
5. Detecta duplicados y dependencias.
6. Escribe fichas completas.
7. Actualiza mapa de tareas, grafo, Change Log e índice.
8. Ejecuta `node scripts/jira.mjs validate`.

Para forzar un JIRA nuevo:

```text
/jira-add
Crea un JIRA nuevo para esta fase con estas tareas:
1. ...
2. ...
```

Para añadir a un JIRA existente:

```text
/jira-add docs/jiras/2026-10-28-opencode-workflow-jira.md
1. ...
```

Cada ficha incluye contexto, situación actual, alcance, fuera de alcance,
archivos afectados, enfoque técnico, criterios de aceptación, tests,
validaciones, riesgos, Definition of Ready y preguntas abiertas.

## 5. Trabajar la siguiente tarea

Primero, si quieres revisar el plan:

```text
/jira-next plan
```

Después, para implementarla:

```text
/jira-next
```

O una tarea concreta:

```text
/jira-next CACH-NXT-010
```

El flujo completo:

```text
Selección
  → marcar IN PROGRESS
  → crear rama feat/<id>-<slug>
  → task-planner
  → test que falla
  → implementación mínima
  → gate-runner
  → architecture-reviewer / rules-reviewer
  → corregir hallazgos
  → docs-scribe
  → DONE o REVIEW
  → mensaje de commit
```

No se ejecuta `git commit` ni `git push`. El mensaje de commit se entrega listo
para que lo uses manualmente.

## 6. Verificar y revisar

Verificación:

```text
/task-verify
```

o directamente:

```bash
npm run verify
npm run jira:validate
```

Revisión:

```text
/review
```

`/review` delega en `architecture-reviewer` y, si el cambio toca Firebase, en
`rules-reviewer`.

## 7. Cerrar

Cerrar una tarea:

```text
/task-close
```

Cerrar un documento JIRA completo:

```text
/jira-close
```

`/jira-close` solo marca el documento como `DONE`. No borra el archivo. El
usuario decide si lo elimina después.

## 8. Subagentes

| Subagente               | Responsabilidad                                         | Edita código       |
| ----------------------- | ------------------------------------------------------- | ------------------ |
| `jira-author`           | Crear y actualizar fichas JIRA.                         | No                 |
| `task-planner`          | Leer una tarea y devolver un plan.                      | No                 |
| `gate-runner`           | Ejecutar gates y resumir fallos.                        | No                 |
| `architecture-reviewer` | Revisar capas, imports, patrones y ADR.                 | No                 |
| `rules-reviewer`        | Revisar Firestore/Storage, reglas e índices.            | No                 |
| `docs-scribe`           | Actualizar JIRA, índice, Change Log, session log y ADR. | Solo documentación |

El agente principal implementa el código y corrige los hallazgos.

## 9. Skills

| Skill                        | Cuándo se usa                                                  |
| ---------------------------- | -------------------------------------------------------------- |
| `cachiplunca-workflow`       | Ciclo de vida de tareas, estados, gates, cierre y session log. |
| `cachiplunca-jira-authoring` | Convertir listas del chat en JIRA.                             |
| `cachiplunca-architecture`   | Capas, puertos, comandos, queries y `AppError`.                |
| `cachiplunca-testing`        | Tests unitarios, contrato, integración, rules, e2e y perf.     |
| `cachiplunca-ui`             | Componentes, tokens, i18n, accesibilidad y canvas.             |
| `cachiplunca-firebase`       | Reglas, Storage, índices y adapters.                           |

La skill global `react-typescript-best-practices` sigue aplicando a React y
TypeScript.

## 10. Scripts deterministas

```bash
npm run jira:list
npm run jira:list TODO
npm run jira:next
npm run jira:next -- --all
npm run jira:card CACH-PRD-001
npm run jira:validate
npm run test:jira
```

También se pueden ejecutar directamente:

```bash
node scripts/jira.mjs list
node scripts/jira.mjs next
node scripts/jira.mjs card CACH-PRD-001
node scripts/jira.mjs validate
```

La **fase activa** es la de mayor `Orden` del índice cuyo estado no sea `DONE`.
`next` solo busca tareas `TODO` en esa fase y las ordena por prioridad, orden del
documento, tamaño y riesgo. `next --all` recorre todas las fases en orden
ascendente. `card <ID>` imprime una ficha completa sin cargar el documento entero.
El selector no elige tareas con dependencias pendientes ni con preguntas
bloqueantes. Su lógica pura vive en `scripts/jira-selector.mjs` y se cubre con
`npm run test:jira`.

## 11. Matriz de gates

| Cambio             | Gates                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| Cualquiera         | `npx tsc -b --noEmit`, `npm run lint`, `npm run format:check`, `npm test` |
| Dominio/aplicación | Unitarios y contrato                                                      |
| UI/presentación    | Unitarios, integración y revisión visual                                  |
| Firestore/Storage  | `npm run test:rules`                                                      |
| Flujo real         | `npm run test:e2e` o spec acotado                                         |
| Canvas/rendimiento | `npm run perf`                                                            |
| App/rutas/assets   | `npm run build`                                                           |
| Texto visible      | i18n ES/EN                                                                |
| Cruce de capas     | ADR                                                                       |

`npm run verify` ejecuta la base y, en local, valida los JIRA si existe
`docs/jiras/INDEX.md`.

## 12. Estados de una tarea

```text
TODO ──► IN PROGRESS ──► REVIEW ──► DONE
  ▲            │             │
  │            ▼             │
  └──────── BLOCKED ◄────────┘
```

- `TODO`: pendiente.
- `IN PROGRESS`: en curso.
- `BLOCKED`: espera dependencia, decisión o ADR.
- `REVIEW`: implementada, pendiente de validación manual/visual.
- `DONE`: cumple la Definition of Done.

## 13. Session log y métricas

Cada tarea debe dejar una entrada en `.local/session-log.md` con:

- fecha, ID y título;
- JIRA;
- rama;
- cambios;
- tests y gates;
- decisiones y ADR;
- estado final;
- siguiente tarea.

`docs/jiras/METRICS.md` registra tiempos, gates olvidados y hallazgos de revisión.
Revisa cada pocas tareas si alguna skill o agente no aporta valor y poda con
evidencia.

## 14. Commit

El flujo nunca hace commit. Cuando termines, revisa el mensaje generado y
ejecútalo tú:

```bash
git add <archivos>
git commit -m "<mensaje>"
```

No se debe commitear `docs/jiras/`, `.local/`, secretos ni artefactos de
Playwright.

## 15. Problemas frecuentes

| Problema                        | Solución                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------- |
| No aparece un comando o skill   | Abre una sesión nueva de OpenCode.                                            |
| `jira:next` no encuentra tareas | Ejecuta `npm run jira:list` y revisa dependencias y `BLOCKED`.                |
| Una tarea no está en el índice  | Añádela a `docs/jiras/INDEX.md`; el selector solo lee documentos registrados. |
| `jira:validate` falla           | Corrige IDs, dependencias, ciclos o secciones incompletas de la ficha.        |
| Un subagente no aparece         | Ejecuta `opencode agent list`.                                                |
| Hay cambios locales inesperados | `git status` y `git diff` antes de empezar.                                   |
| Un gate falla                   | Corrige el fallo; no debilites el test.                                       |

## 16. Ejemplo completo

```text
# 1. Añadir tareas
/jira-add
1. Añadir atajos de zoom
   - Criterio: Ctrl/Cmd + + y Ctrl/Cmd + - cambian el zoom
2. Recordar email en login
   - Criterio: el email persiste tras cerrar sesión

# 2. Planificar
/jira-next plan

# 3. Implementar
/jira-next

# 4. Verificar y revisar
/task-verify
/review

# 5. Cerrar la tarea
/task-close

# 6. Cuando toda la fase esté DONE
/jira-close
```
