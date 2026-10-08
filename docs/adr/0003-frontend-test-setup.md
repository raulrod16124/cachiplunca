# ADR-0003: Configuración de tests de frontend (jsdom + Testing Library + ESM)

**Fecha:** 2026-10-08
**Estado:** Aceptado
**Tarea:** TASK-011 — Registro (`docs/mvp-backlog.md`)

## Contexto

TASK-011 introduce el primer componente React con comportamiento (`RegisterForm`). El setup de Jest heredado de ADR-0001 era solo unitario en entorno `node`: `testMatch` limitado a `*.test.ts`, sin `transform` para JSX ni lib DOM, y sin librería de testing de componentes. Además, `@raulrod/ui`, `@raulrod/icons` y `@raulrod/tokens` publican ESM puro (`"type": "module"` y `exports` solo con condición `import`), inaccesible para el runner CJS de Jest por dos motivos: el resolutor no encuentra la entrada y el fichero usa sintaxis ESM.

## Decisión

1. **Entorno `jsdom` global en `jest.config.cjs`.** Los tests de dominio/application no usan el DOM y corren igual en jsdom; un único entorno evita la complejidad de `projects` mientras la suite sea pequeña.
2. **Testing Library como stack de tests de UI:** `@testing-library/react`, `@raulrod/ui` como base, `@testing-library/dom` (peer obligatorio de RTL 16) y `@testing-library/jest-dom` con setup en `src/test/setup/jest-dom.ts`. `jest-environment-jsdom` se alineó a `^29.7.0` para coincidir con Jest 29 (la v30 instalada era incompatible con el runner).
3. **`testMatch` ampliado a `*.test.ts` y `*.test.tsx`**; `tsconfig.jest.json` añade `lib` DOM, `jsx: react-jsx` y `allowJs` (necesario para transpilar el punto 4).
4. **Paquetes ESM-only de `@raulrod/*` se resuelven con `moduleNameMapper`** hacia `dist/index.js` **y se transpilan a CJS** mediante `transform` (`ts-jest` con `allowJs`) restringido por `transformIgnorePatterns: ['/node_modules/(?!(@raulrod)/)']`. Solo esa familia se transforma; el resto de dependencias siguen intactas.
5. **Los tests de UI viven en `src/test/unit/presentation/…` y dependen del caso de uso + `FakeAuthPort`, nunca de Firebase.** `RegisterForm` recibe `registerUser` por props: la inyección de dependencias mantiene Presentation testeable sin tocar `app/config`.

## Consecuencias

- Cualquier componente futuro puede testearse con `render`/`screen` sin configuración adicional.
- No subir Jest a v30 sin revisar a la vez `ts-jest`, `jest-environment-jsdom` y `@types/jest`; hoy coexisten `@types/jest` 30 con runtime 29 (solo tipado).
- Si `@raulrod/*` publica CJS en el futuro, eliminar `moduleNameMapper` y `transformIgnorePatterns`.
- `firebase-app.ts` (con `import.meta.env`) no debe importarse desde ningún test: solo `app/config` lo referencia.

## Alternativas consideradas

- **`projects` de Jest (node para unitarios, jsdom para UI):** descartada por complejidad innecesaria actual.
- **Ejecutar Jest en modo ESM (`--experimental-vm-modules`):** descartada por fragilidad con `ts-jest` y mayor coste de mantenimiento.
- **No testear la UI (solo casos de uso):** descartada; la tarea exige que las entradas inválidas muestren errores controlados y la verificación en DOM lo prueba de forma reproducible.
