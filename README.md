# Cachiplunca

**Workspace visual colaborativo para grupos pequeños.** De ideas dispersas a planes compartidos: un canvas infinito donde un equipo recopila información, la organiza visualmente y la convierte en un plan compartido.

## Producto

Journey principal:

```text
Registro/Login → Crear workspace → Invitar personas → Canvas vacío
  → Añadir y organizar elementos → Colaborar en tiempo real → Plan compartido
```

El MVP incluye:

- Autenticación email/password (Firebase Auth).
- Workspaces con roles **Owner / Editor / Viewer** e invitaciones por email.
- Canvas infinito con pan, zoom, selección simple y múltiple, marquee y grid.
- Seis tipos de elementos: **Text, Note, Task, Frame, Connector y Link** (crear, mover, redimensionar, eliminar, duplicar, copy/paste).
- Undo/redo, atajos de teclado y autosave con recuperación tras refresh.
- Realtime, presencia, cursores remotos y reconexión (last-write-wins, sin CRDT).
- Firebase Security Rules como autorización efectiva (la UI solo refleja permisos).

## Stack y arquitectura

| Área     | Tecnología                                   |
| -------- | -------------------------------------------- |
| Runtime  | Node 22 (`.nvmrc`)                           |
| Lenguaje | TypeScript strict                            |
| UI       | React 19 · styled-components · `@raulrod/ui` |
| Backend  | Firebase (Auth + Firestore)                  |
| Build    | Vite                                         |
| Tests    | Jest (unit/integration, rules, perf)         |
| Calidad  | Oxlint (sin ESLint) · Prettier               |

Arquitectura **Clean + Hexagonal** con dependencias dirigidas hacia dentro:

```text
Presentation  →  Application  →  Domain
Infrastructure →  Application ports  →  Domain
```

- `src/domain` — entidades, value objects e invariantes. Sin React, Firebase, styled-components ni APIs del navegador.
- `src/application` — casos de uso, comandos, stores y ports. Sin implementaciones concretas.
- `src/infrastructure` — adapters de Firebase (repositorios, realtime, presence, crypto).
- `src/presentation` — componentes React, canvas, hooks y estilos. Nunca importa Firebase.
- `src/app` — composición: config de servicios, rutas y entrypoint.

Las fronteras de capas están vigiladas por un gate ejecutable en `npm test`
(`src/test/unit/architecture/layer-boundaries.test.ts`). El detalle está en la
[auditoría de arquitectura](docs/audits/architecture-audit.md) y en
[ADR-0030](docs/adr/0030-architecture-boundaries.md).

## Puesta en marcha

Prerrequisitos:

- **Node 22** (`nvm use` para respetar `.nvmrc`).
- Un proyecto de Firebase con **Email/Password** habilitado en Authentication.
- Java (solo necesario para `npm run test:rules`, que usa el emulador de Firestore).

Pasos:

```bash
npm install
cp .env.example .env.local   # rellena la config web de tu proyecto Firebase
npm run dev
```

Variables en `.env.local` (config web de Firebase, _Project settings → Your apps_):

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Las Security Rules se despliegan contra el proyecto seleccionado en `.firebaserc` (`cachiplunca-dev`):

```bash
npx firebase deploy --only firestore:rules
```

## Scripts

| Script                 | Descripción                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo con HMR                                   |
| `npm run build`        | typecheck (`tsc -b`) + build de producción                       |
| `npm run preview`      | Vista previa del build                                           |
| `npm run lint`         | Oxlint                                                           |
| `npm run lint:fix`     | Oxlint con auto-fix                                              |
| `npm run format`       | Prettier --write                                                 |
| `npm run format:check` | Prettier --check                                                 |
| `npm test`             | Suite unitaria/integración (Jest, `--runInBand`)                 |
| `npm run test:rules`   | Tests de Firebase Security Rules contra el emulador de Firestore |
| `npm run perf`         | Medición + regression budgets de rendimiento del canvas          |
| `npm run perf:dev`     | App de rendimiento en modo desarrollo (`perf.html`)              |

## Testing

- **Unit/integration** (`npm test`): dominio, application, presentation (jsdom + Testing Library), fronteras de arquitectura y presupuestos estructurales de render. Fakes de ports en `src/test/fixtures/`.
- **Security Rules** (`npm run test:rules`): `@firebase/rules-unit-testing` sobre el emulador de Firestore con proyecto demo `demo-cachiplunca` (no toca recursos reales).
- **Rendimiento** (`npm run perf`): línea base y regression budgets del canvas a 10.000 elementos. Detalle en [`docs/performance/`](docs/performance/).

## Estructura

```text
src/
├── app/             # composición: config de servicios, rutas, App.tsx
├── domain/          # entidades, value objects, invariantes
├── application/     # comandos, queries, services, ports
├── infrastructure/  # adapters Firebase (repos, realtime, presence)
├── presentation/    # componentes, features, hooks, canvas, estilos
├── shared/          # utils, types, constants, errors
└── test/            # unit/, integration/, contract/, rules/, perf/, fixtures/
```

## Documentación

| Documento                                    | Contenido                                                  |
| -------------------------------------------- | ---------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                     | Reglas de ingeniería y convenciones del repo               |
| [`docs/mvp-backlog.md`](docs/mvp-backlog.md) | Backlog operativo del MVP (fuente de verdad)               |
| [`docs/adr/`](docs/adr/)                     | Architecture Decision Records + session log                |
| [`docs/audits/`](docs/audits/)               | Auditorías: errores, seguridad, dependencias, arquitectura |
| [`docs/performance/`](docs/performance/)     | Línea base, optimización y regression de rendimiento       |

## Quality gates

```bash
npm run lint
npm run format:check
npx tsc -b --noEmit
npm test
npm run build
```

## Licencia

[MIT](LICENSE) © Raúl Rodríguez
