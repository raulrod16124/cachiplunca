# ADR-0001: Modelo de errores de dominio y aplicación

**Fecha:** 2026-10-08
**Estado:** Aceptado
**Tarea:** TASK-007 — Crear error model base (`docs/mvp-backlog.md`)

## Contexto

El MVP debe desacoplar los casos de uso de Firebase desde el primer momento: Application y Domain no pueden conocer el SDK de Firebase ni exponer sus errores crudos. El backlog exige un modelo común de errores tipados (validación, autorización, persistencia, red, colaboración) y definir cómo Infrastructure traduce errores concretos a errores de aplicación.

No existía ningún código de errores ni tests ejecutables en el repositorio.

## Decisión

1. **`AppError` es una discriminated union** en `src/shared/errors/app-error.ts`, discriminada por `kind: 'validation' | 'authorization' | 'notFound' | 'conflict' | 'persistence' | 'network' | 'collaboration' | 'unknown'`. Cada miembro comparte `code`, `message` y los opcionales `details` y `cause`.

2. **`cause` preserva el error original para trazabilidad, pero nunca se expone a la UI.** El `message` es siempre nuestro, sanitizado por la capa que traduce.

3. **Códigos canónicos en `ERROR_CODES`** (`const` object literal; los enums están prohibidos por `erasableSyntaxOnly`). Los consumidores comparan contra estas constantes, nunca contra strings sueltos.

4. **`createAppError` usa un switch exhaustivo** sobre los kinds, sin casts. La exhaustividad la garantiza el compilador (`strict` + return type): añadir un kind sin manejarlo produce un error de tipado.

5. **`toAppError(unknown)`** es el traductor genérico de última instancia para Application: identidad si ya es `AppError`; si no, envuelve preservando `cause` y código estructural si existe.

6. **Infrastructure traduce con mappers dedicados.** `mapFirebaseError` (`src/infrastructure/firebase/firebase-error-mapper.ts`) es la única capa que conoce errores crudos de Firebase:
   - detecta códigos **por estructura** (`{ code: string }`), sin importar el SDK → puro y testeable;
   - traduce mediante **tabla** (`FIREBASE_ERROR_MAP`) a `kind`/`code`/`message` propios;
   - códigos de proveedor no mapeados se conservan como `code` con mensaje genérico (trazabilidad sin exponer mensajes crudos);
   - es idempotente: si recibe un `AppError` lo devuelve tal cual.

7. **Application y Domain solo importan desde `src/shared/errors`.** Los ports que defina TASK-010 y TASK-017 usarán `AppError` como modelo de error común, testeables con fakes sin Firebase.

## Consecuencias

- Los casos de uso y la UI pueden ramificar por `kind` sin conocer Firebase ni ninguna infraestructura.
- Añadir un nuevo proveedor implica un mapper nuevo en Infrastructure, sin tocar Application.
- Se añadió configuración mínima de Jest (`jest.config.cjs` + `tsconfig.jest.json` con ts-jest) como prerequisito para cumplir los criterios de tests de la tarea; era un gap pendiente de TASK-004.
- `tsconfig.app.json` incluye `jest` en `types` para que `tsc -b` también type-checkee los tests.
