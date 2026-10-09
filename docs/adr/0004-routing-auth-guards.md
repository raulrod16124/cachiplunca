# ADR-0004: Routing de aplicación con react-router-dom y guards de sesión

**Fecha:** 2026-10-08
**Estado:** Aceptado
**Tarea:** TASK-014 — Auth guards (`docs/mvp-backlog.md`)

## Contexto

TASK-014 exige "definir guard de rutas", "resolver el estado de carga" y "redirigir usuarios anónimos al acceso", con los criterios "un usuario anónimo no puede acceder a workspaces" y "no hay redirecciones prematuras durante la restauración de sesión". El proyecto no tenía ningún router: `src/app/routes/` estaba vacío, no había dependencia de routing y la navegación era estado local de `AuthFlow` (`sign-in`/`sign-up`), sin URLs, sin deep links y sin lugar donde colgar un guard. El journey del MVP (landing → registro/login → workspaces → shell del workspace) requiere navegación por URL, y las tareas siguientes (TASK-023, TASK-024, TASK-025) construyen sobre rutas protegidas.

## Decisión

1. **Dependencia `react-router-dom` v7 con `<BrowserRouter>` declarativo.** Justificación: la navegación por URL es requisito de guards y deep links; es el estándar de facto en React, con mantenimiento activo y compatibilidad con React 19. Impacto: solo capas `app/` y `presentation/` — Domain, Application e Infrastructure no lo importan. Mantenimiento: un bump de versión semántico, sin configuración propia.
2. **Guards en `src/app/routes/`**, próximos a la composición:
   - `RequireAuth` envuelve `/workspaces`: `loading` → `SessionLoading` sin navegar; `anonymous` → `<Navigate to="/login" replace>`; `authenticated` → `<Outlet />`.
   - `RequireAnonymous` envuelve `/login` y `/register`: `loading` → `SessionLoading` sin navegar; `authenticated` → `<Navigate to="/workspaces" replace>`; `anonymous` → `<Outlet />`.
   - La resolución del estado de carga vive exclusivamente en los guards: el estado `loading` de `SessionState` se traduce a UI (`SessionLoading`, `role="status"`) y **nunca** a una navegación, lo que satisface el criterio de "sin redirecciones prematuras".
3. **Mapa de rutas en `AppRoutes`** (`src/app/routes/app-routes.tsx`): `/` → `/register` (conserva el comportamiento previo de abrir el formulario de registro), `/login` y `/register` (guest), `/workspaces` (protegida, placeholder mínimo hasta TASK-023), `*` → `/`. Los casos de uso de auth (`registerUser`, `loginUser`, `logoutUser`) llegan por props desde `App.tsx`; no se introduce un contexto nuevo.
4. **`AuthFlow` eliminado.** Sus tres estados pasan a rutas/guards/páginas: `AuthLayout` + `LoginPage` + `RegisterPage` (toggles con `useNavigate()`) y `WorkspacesPage` (placeholder con email y `SignOutButton`, que concentra la lógica de sign-out que tenía `AuthFlow`). Sin código muerto tras la migración.
5. **Tests con `MemoryRouter`.** Guards unitarios (ruta protegida/guest con marcadores), integración `auth-routes.test.tsx` con un `LocationProbe` que afirma la URL en cada transición, y fixture `PendingAuthPort` para mantener la app en `loading` hasta que el test decida resolver la sesión.

## Consecuencias

- Las tareas futuras de UI añaden rutas en `AppRoutes` sin tocar los guards; cuando exista más de una ruta protegida, `RequireAuth` deberá guardar la ruta de origen (`location.state.from`) para volver tras el login — hoy es un no-op con un solo destino y se evita por YAGNI.
- El guard es UX, no seguridad: la autorización efectiva sigue en Firebase Security Rules (restricción de TASK-016).
- El bundle de JS crece con react-router (dependencia de runtime justificada; medible con `npm run build`).
- jsdom (jest-environment-jsdom 29) no expone `TextEncoder`, que react-router v7 necesita al importar → polyfill en `jest.setup.cjs` cargado por `setupFilesAfterEnv`. CJS en la raíz, como `jest.config.cjs`, para no introducir tipos `node` en el programa de la app.
- `RegisterForm` muestra su estado "Account created" solo de forma efímera: al resolverse la sesión, `RequireAnonymous` navega a `/workspaces` (comportamiento equivalente al de `AuthFlow`, que también sustituía el formulario).

## Alternativas consideradas

- **Guard sin router (estado local + callback de redirect):** descartada; sin URLs ni deep links, el criterio quedaría cubierto solo a nivel de componente y habría que rehacer el trabajo al introducir routing.
- **`createBrowserRouter` (data router con loaders/actions):** descartada por simpleza; no hay loaders remotos que justifiquen la API de datos.
- **TanStack Router:** descartada; más peso y curva de aprendizaje para un alcance que react-router cubre.
- **`Button href` de `@raulrod/ui` para los toggles login/registro:** descartado; `Button` renderiza un ancla cruda con `href`, que provocaría una recarga completa de la página. Se usa `useNavigate()` conservando el estilo `variant="link"` (la semántica de enlace real queda para navegación primaria, no para estos toggles).
