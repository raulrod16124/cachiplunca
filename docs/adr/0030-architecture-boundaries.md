# ADR-0030: Fronteras de capas ejecutables y contexto de sesión en Presentation (TASK-122)

**Fecha:** 2026-10-15
**Estado:** Aceptado

## Contexto

TASK-122 audita que la implementación respeta Clean/Hexagonal. La visión vigente de
la arquitectura está en `docs/architecture.md`. Dos decisiones quedaron abiertas:

1. Las reglas de frontera (Domain sin React/Firebase/DOM, Application sin
   implementaciones concretas, Presentation sin Firebase/Infrastructure, `app/` como
   composición) vivían solo en AGENTS.md y en el backlog: ningún quality gate las
   hacía cumplir, de modo que una regresión de imports pasaría lint, typecheck, tests
   y build sin sonar.
2. `SessionProvider`/`useSession` estaban en `src/app/providers/` y tres páginas de
   Presentation los importaban (`../../../app/providers/session-provider`),
   invirtiendo la dirección de composición: la capa de UI dependía de la capa que
   instancia las implementaciones concretas. La nota de ADR-0002 describía esa
   ubicación; esta auditoría la reconsidera.

## Decisión

1. **Gate ejecutable de fronteras en la suite principal.**
   `src/test/unit/architecture/layer-boundaries.test.ts` define como tabla las capas
   permitidas, los paquetes prohibidos por capa (`react`, `firebase`, `styled-components`,
   `@raulrod/*`, `node:*`), las APIs de navegador prohibidas en domain/application/shared
   y la inaccesibilidad de `src/test` desde producción. Corre en `npm test`, por lo que
   CI (TASK-129) lo hereda sin configuración. Se optó por un test de Jest frente a un
   script aparte porque solo así es bloqueante en los gates existentes.

2. **El contexto de sesión vive en Presentation.** `SessionProvider`/`useSession` se
   mueven a `src/presentation/providers/session-provider.tsx`; `App.tsx` (composición)
   le inyecta el `SessionStore` y los guards/páginas lo consumen. Regla resultante:
   `app/` puede importar cualquier capa, ninguna capa importa `app/`. La ubicación
   anterior queda supersedida en la nota de ADR-0002.

3. **`tsconfig.app.json` añade `"node"` a `types`** para que el gate pueda usar
   `node:fs` dentro de la suite. Es un alcance solo de tipos: a cambio, el gate prohíbe
   `node:*` en todas las capas de producción, de modo que el código desplegable sigue
   siendo exclusivamente de navegador.

4. **Infrastructure puede importar contratos de `application/`** (ports y tipos de
   comandos/queries), no solo de `application/ports`, mientras la dirección sea
   Infrastructure → Application (hallazgo A4, aceptado).

## Alternativas consideradas

- **Script externo (`scripts/check-architecture.mjs`) invocado desde `package.json`:**
  descartado; no falla dentro de `npm test` ni dentro de los tests por fichero, y
  requeriría encadenar gates manualmente.
- **`dependency-cruiser` u otra herramienta de reglas de arquitectura:** descartado por
  la regla de no añadir dependencias sin justificar; una tabla en un test cubre el
  alcance del MVP con cero dependencias y es legible en el propio repo.
- **Informar las infracciones sin corregir A1 (excepción con ADR):** descartado; era
  una inversión de capas de nueve puntos de import, mecánica de bajo riesgo y sin
  contrapartida funcional.
- **Mantener el proveedor en `app/` justificándolo como excepción:** descartado; el
  proveedor solo depende de `application/` y React, no aporta nada vivir en la capa de
  composición y su ubicación invitaba a enchufarle adapters (acoplamiento futuro de
  Presentation con Infrastructure).

## Consecuencias

- Cualquier frontera nueva (capa, paquete o excepción) se declara en la tabla del gate;
  fuera de esa tabla, nada impide el import, así que mantenerla es responsabilidad de
  cada tarea que toque arquitectura.
- El gate usa resolución de rutas + regex: no cubre imports dinámicos condicionales
  (no existen en el código) ni reglas semánticas dentro de una capa.
- `src/test` queda fuera del gate; los tests pueden consumir todas las capas.
- Los tests unitarios de rutas/guards y el harness de integración importan ahora el
  proveedor desde `src/presentation/providers/`; el comportamiento cubierto no cambia.
