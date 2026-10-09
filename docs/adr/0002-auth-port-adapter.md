# ADR-0002: Puerto de autenticación y adapter Firebase

**Fecha:** 2026-10-08
**Estado:** Aceptado
**Tarea:** TASK-010 — Auth port y adapter (`docs/mvp-backlog.md`)

## Contexto

El MVP necesita registro, login, logout y observación de sesión sin que Application ni Presentation conozcan el SDK de Firebase. ADR-0001 ya fija `AppError` como modelo de errores común y anticipa que los ports usarán ese modelo. No existía inicialización del SDK web de Firebase en el repositorio, aunque `.env.example` define las variables `VITE_FIREBASE_*` (TASK-009 dejó la configuración CLI del proyecto).

## Decisión

1. **`AuthPort` vive en `src/application/ports/auth-port.ts`** con contratos `signUp`, `signIn`, `signOut` y `observeSession`. La estructura `AuthUser` es un modelo de aplicación (`readonly`, sin dependencias de Firebase ni React).

2. **Todas las operaciones rechazan con `AppError`**, nunca con errores crudos del SDK. La traducción reutiliza `mapFirebaseError` (ADR-0001), por lo que el adapter no tiene lógica de mapeo propia de errores.

3. **`observeSession(listener, onError?)` devuelve `Unsubscribe`** y documenta por contrato que el listener se invoca con el estado actual al suscribirse (TASK-013 modelará `loading/authenticated/anonymous` sobre esta señal). El canal `onError` opcional evita tragar fallos de observación; se emite como `AppError`.

4. **El adapter se construye con DI: `createFirebaseAuthAdapter(auth: Auth)`.** La instancia `Auth` se inyecta desde composición, lo que permite testear el adapter con `jest.mock('firebase/auth')` sin tocar env, red ni estado global.

5. **La inicialización del SDK queda en `src/infrastructure/firebase/firebase-app.ts`** (`getFirebaseAuth()`), leyendo `import.meta.env.VITE_FIREBASE_*` con fallo explícito por variable ausente. Es el único módulo que importa `firebase/app` y no se importa desde tests, por lo que `import.meta.env` no llega a Jest.

6. **`FakeAuthPort` en `src/test/fixtures/fake-auth-port.ts` implementa el contrato** (alta con conflicto por email duplicado, credenciales inválidas, emisión al suscribirse, emisión solo en cambios de sesión, unsubscribe efectivo). Es la base para probar los casos de uso de TASK-011, TASK-012 y TASK-013 sin Firebase.

7. **La validación de entradas no está en el port ni en el adapter**; corresponde a los casos de uso (TASK-011).

## Consecuencias

- Application queda testeable con ports fake; ningún caso de uso importará `firebase/*`.
- Presentation seguirá sin acceder a Firebase: la composición (`app/providers`/`app/config`) será la única que llame a `getFirebaseAuth()` y `createFirebaseAuthAdapter`.
- Si más adelante se necesita otro proveedor de auth, basta un adapter nuevo que implemente `AuthPort`.
- `firebase-app.ts` queda sin consumidor hasta que TASK-011/TASK-012 conecten la UI; es la pieza mínima de composición necesaria para que el adapter sea utilizable.

## Actualización (TASK-013)

El tri-anticipado en el punto 3 se implementó como `createSessionStore(authPort)` en `src/application/services/`:

- `SessionState` es una unión discriminada `loading | authenticated | anonymous` vive en Application, de modo que TASK-014 (auth guards) pueda evaluarla sin React.
- El store se suscribe al puerto de forma perezosa (con el primer subscriber) y libera la suscripción con el último; conserva el último snapshot resuelto al remontar para evitar flicker de `loading` bajo `<StrictMode>`.
- `getSnapshot()` devuelve siempre la misma referencia mientras el estado no cambie (requisito de `useSyncExternalStore`); Presentation lo consume mediante `SessionProvider`/`useSession` en `src/app/providers/`.
