# Cachiplunca — MVP Backlog Operativo

> Fuente de verdad versionada para implementar el MVP de Cachiplunca sesión a sesión. Cada tarea define **objetivo, alcance, criterios de aceptación, límites y constraints técnicos** suficientes para que un agente como OpenCode pueda ejecutarla sin depender de contexto implícito.

**Producto:** Cachiplunca  
**Categoría:** Collaborative visual planning  
**Stack:** Node 22 · TypeScript · React · styled-components · `@raulrod/ui` · Jest · Firebase · Vite · Oxlint · Prettier  
**Arquitectura:** Clean Architecture + Hexagonal Architecture + SOLID  
**Rama de trabajo:** `development`  
**Estado del bootstrap:** completado  
**Fuente de verdad:** `docs/mvp-backlog.md`

---

# 0. Cómo usar este backlog

Este documento es un **contrato operativo de implementación**, no una lista de ideas.

Para ejecutar una tarea se debe leer:

1. esta tarea;
2. sus dependencias;
3. `AGENTS.md`;
4. el código existente;
5. los ADR relevantes de `docs/adr/`.

Una tarea termina cuando cumple sus criterios de aceptación y los quality gates aplicables.

## Protocolo de sesión para OpenCode

```text
Lee AGENTS.md y docs/mvp-backlog.md antes de tocar código.

1. Comprueba rama, estado de Git y cambios locales.
2. Localiza la siguiente tarea ejecutable:
   - si existe una única IN PROGRESS, continúa esa tarea;
   - si existen varias IN PROGRESS, detente y resuelve la inconsistencia;
   - si no existe IN PROGRESS, elige la primera TODO cuyas dependencias estén DONE;
   - no saltes tareas arbitrariamente.
3. Lee las dependencias y el código relacionado.
4. Revisa los ADR relevantes.
5. Formula un plan breve antes de implementar.
6. Implementa únicamente el alcance de la tarea.
7. Añade/actualiza tests.
8. Ejecuta los quality gates disponibles.
9. Revisa diff, regresiones, seguridad y acoplamientos.
10. Comprueba uno por uno los criterios de aceptación.
11. Si todo está correcto, marca la tarea DONE.
12. Si existe un bloqueo real, marca BLOCKED y documenta:
    - causa;
    - evidencia;
    - dependencia que falta;
    - condición para desbloquearla.
13. Registra una nota breve en Session Log y crea/actualiza un ADR
    si la decisión es arquitectónicamente relevante.
```

### Estados

```text
TODO
IN PROGRESS
BLOCKED
DONE
```

Una tarea solo puede pasar a `DONE` si:

- el alcance está implementado;
- los criterios están satisfechos;
- los tests relevantes pasan;
- no existe un bloqueo conocido;
- los quality gates aplicables pasan.

---

# 1. Contexto del producto

## Objetivo del MVP

> Create space → invite people → gather information → organize visually → turn it into a shared plan.

Cachiplunca es un workspace visual colaborativo para grupos pequeños. Combina libertad de canvas con semántica de planificación.

**Promesa:** de ideas dispersas a planes compartidos.

### Journey principal

```text
Landing
  ↓
Registro / Login
  ↓
Crear workspace
  ↓
Invitar personas
  ↓
Canvas vacío
  ↓
Añadir elementos
  ↓
Organizar visualmente
  ↓
Colaborar en tiempo real
  ↓
Convertir información en un plan compartido
```

## MVP incluye

- autenticación email/password;
- workspaces;
- memberships Owner/Editor/Viewer;
- invitaciones;
- canvas infinito;
- pan y zoom;
- selección y multiselección;
- Text, Note, Task, Frame, Connector y Link;
- crear, mover, redimensionar, eliminar y duplicar;
- copy/paste;
- keyboard shortcuts;
- undo/redo;
- autosave y recuperación tras refresh;
- realtime;
- presencia y cursores;
- reconnect;
- estrategia de consistencia simple;
- Firebase Security Rules;
- accesibilidad básica;
- baseline y optimización de rendimiento.

## Fuera del MVP

```text
Chat
Comentarios avanzados
Audio/video
IA
Google Maps
Google Calendar
Google Drive / Notion
Billing
Marketplace de templates
Aplicaciones móviles nativas
Offline-first completo
Version history avanzada
Automatizaciones
Analytics avanzadas
Cientos de tipos de elementos
```

---

# 2. Reglas de ingeniería

- TypeScript `strict`.
- Oxlint; no ESLint.
- Prettier para formatting.
- Jest para tests.
- `@raulrod/ui` como base de componentes de UI.
- styled-components en Presentation.
- Domain independiente de React, Firebase, styled-components, `@raulrod/ui` y APIs del navegador.
- Application depende de ports, no de Firebase.
- Infrastructure contiene adapters concretos.
- Presentation no accede directamente a Firebase.
- Preferir tipos explícitos y discriminated unions.
- Evitar `any`, casts innecesarios y mutaciones.
- No añadir dependencias sin justificar necesidad, impacto y mantenimiento.
- No crear abstracciones especulativas.
- Refactors grandes deben ser tareas separadas.
- No introducir scope creep.
- No copiar branding, assets, código, textos ni UI distintiva de Miro.
- Los cambios arquitectónicos significativos deben quedar en `docs/adr/`.
- Los cambios locales de sesión que no sean fuente de verdad pueden registrarse en `.local/`, que no se versiona.

## Quality gates

```bash
npm run lint
npm run format:check
npx tsc -b --noEmit
npm test
npm run build
```

---

# 3. Arquitectura objetivo

```text
src/
├── app/
│   ├── routes/
│   ├── providers/
│   ├── config/
│   └── App.tsx
├── domain/
│   ├── board/
│   ├── element/
│   ├── user/
│   ├── collaboration/
│   └── shared/
├── application/
│   ├── commands/
│   ├── queries/
│   ├── services/
│   └── ports/
├── infrastructure/
│   ├── firebase/
│   ├── repositories/
│   ├── realtime/
│   └── storage/
├── presentation/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── canvas/
│   └── styles/
├── shared/
│   ├── utils/
│   ├── types/
│   ├── constants/
│   └── errors/
└── test/
    ├── unit/
    ├── integration/
    └── fixtures/
```

Dependencias permitidas:

```text
Presentation
      ↓
Application
      ↓
Domain

Infrastructure
      ↓
Application ports
      ↓
Domain
```

> Las implementaciones concretas se conectan en composición; las capas de negocio dependen de abstracciones.

---

# 4. Modelo de dominio de referencia

## Entidades

```text
User
Workspace
Membership
Element
```

## Value Objects

```text
WorkspaceId
UserId
ElementId
Position
Size
Bounds
Transform
Viewport
```

## Elementos

```ts
type Element =
  TextElement | NoteElement | TaskElement | FrameElement | ConnectorElement | LinkElement;
```

Campos compartidos esperados:

```text
id
workspaceId
position
size
rotation
createdBy
createdAt
updatedAt
```

Campos específicos:

```text
Task:
  title
  status
  assigneeId?
  dueDate?

Frame:
  title
  position
  size
  parentFrameId?

Connector:
  sourceElementId
  targetElementId

Link:
  url
  title?
```

Los detalles definitivos deben emerger de las invariantes del dominio y documentarse si difieren de esta referencia.

---

# 5. Estrategia de colaboración

El MVP usa:

- actualizaciones locales optimistas;
- persistencia automática;
- sincronización realtime;
- last-write-wins para propiedades simples cuando sea adecuado;
- operaciones independientes por elemento;
- tratamiento explícito de cambios remotos frente al historial local;
- reconnect;
- presencia efímera.

**No usar CRDT en el MVP** salvo necesidad demostrada y ADR aprobado.

---

# 6. Backlog

### TASK-001 — Bootstrap del proyecto

**Priority:** P0 · **Depends:** Ninguna · **Status:** DONE

#### Objetivo

Conservar como completado el trabajo de **Bootstrap del proyecto** y evitar que futuras sesiones lo repitan.

#### Alcance

- Verificar que la configuración existente sigue disponible.
- No rehacer el bootstrap salvo incidencia real.

#### Criterios de aceptación

- [ ] La configuración existente sigue funcionando.
- [ ] OpenCode no vuelve a ejecutar esta tarea.

#### Fuera de alcance

- No recrear ni migrar la configuración existente sin una tarea explícita.

#### Constraints técnicos

- Cambios sustanciales requieren una tarea explícita o ADR.

### TASK-002 — Configurar TypeScript strict

**Priority:** P0 · **Depends:** TASK-001 · **Status:** DONE

#### Objetivo

Conservar como completado el trabajo de **Configurar TypeScript strict** y evitar que futuras sesiones lo repitan.

#### Alcance

- Verificar que la configuración existente sigue disponible.
- No rehacer el bootstrap salvo incidencia real.

#### Criterios de aceptación

- [ ] La configuración existente sigue funcionando.
- [ ] OpenCode no vuelve a ejecutar esta tarea.

#### Fuera de alcance

- No recrear ni migrar la configuración existente sin una tarea explícita.

#### Constraints técnicos

- Cambios sustanciales requieren una tarea explícita o ADR.

### TASK-003 — Configurar lint y formatting

**Priority:** P0 · **Depends:** TASK-001 · **Status:** DONE

#### Objetivo

Conservar como completado el trabajo de **Configurar lint y formatting** y evitar que futuras sesiones lo repitan.

#### Alcance

- Verificar que la configuración existente sigue disponible.
- No rehacer el bootstrap salvo incidencia real.

#### Criterios de aceptación

- [ ] La configuración existente sigue funcionando.
- [ ] OpenCode no vuelve a ejecutar esta tarea.

#### Fuera de alcance

- No recrear ni migrar la configuración existente sin una tarea explícita.

#### Constraints técnicos

- Cambios sustanciales requieren una tarea explícita o ADR.

### TASK-004 — Configurar Jest

**Priority:** P0 · **Depends:** TASK-001 · **Status:** DONE

#### Objetivo

Conservar como completado el trabajo de **Configurar Jest** y evitar que futuras sesiones lo repitan.

#### Alcance

- Verificar que la configuración existente sigue disponible.
- No rehacer el bootstrap salvo incidencia real.

#### Criterios de aceptación

- [ ] La configuración existente sigue funcionando.
- [ ] OpenCode no vuelve a ejecutar esta tarea.

#### Fuera de alcance

- No recrear ni migrar la configuración existente sin una tarea explícita.

#### Constraints técnicos

- Cambios sustanciales requieren una tarea explícita o ADR.

### TASK-005 — Crear estructura Clean/Hexagonal

**Priority:** P0 · **Depends:** TASK-002 · **Status:** DONE

#### Objetivo

Conservar como completado el trabajo de **Crear estructura Clean/Hexagonal** y evitar que futuras sesiones lo repitan.

#### Alcance

- Verificar que la configuración existente sigue disponible.
- No rehacer el bootstrap salvo incidencia real.

#### Criterios de aceptación

- [ ] La configuración existente sigue funcionando.
- [ ] OpenCode no vuelve a ejecutar esta tarea.

#### Fuera de alcance

- No recrear ni migrar la configuración existente sin una tarea explícita.

#### Constraints técnicos

- Cambios sustanciales requieren una tarea explícita o ADR.

### TASK-006 — Definir convenciones de dependencias

**Priority:** P0 · **Depends:** TASK-005 · **Status:** DONE

#### Objetivo

Conservar como completado el trabajo de **Definir convenciones de dependencias** y evitar que futuras sesiones lo repitan.

#### Alcance

- Verificar que la configuración existente sigue disponible.
- No rehacer el bootstrap salvo incidencia real.

#### Criterios de aceptación

- [ ] La configuración existente sigue funcionando.
- [ ] OpenCode no vuelve a ejecutar esta tarea.

#### Fuera de alcance

- No recrear ni migrar la configuración existente sin una tarea explícita.

#### Constraints técnicos

- Cambios sustanciales requieren una tarea explícita o ADR.

### TASK-007 — Crear error model base

**Priority:** P0 · **Depends:** TASK-005 · **Status:** DONE

#### Objetivo

Definir un modelo común de errores de dominio y aplicación para desacoplar los casos de uso de Firebase.

#### Alcance

- Crear errores tipados para validación, autorización, persistencia, red y colaboración cuando sean necesarios.
- Definir cómo Infrastructure traduce errores concretos a errores de aplicación.

#### Criterios de aceptación

- [x] Los casos de uso no exponen errores crudos de Firebase.
- [x] Los errores relevantes están cubiertos por tests.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-008 — Configurar CI

**Priority:** P0 · **Depends:** TASK-003, TASK-004 · **Status:** DONE

#### Objetivo

Conservar como completado el trabajo de **Configurar CI** y evitar que futuras sesiones lo repitan.

#### Alcance

- Verificar que la configuración existente sigue disponible.
- No rehacer el bootstrap salvo incidencia real.

#### Criterios de aceptación

- [ ] La configuración existente sigue funcionando.
- [ ] OpenCode no vuelve a ejecutar esta tarea.

#### Fuera de alcance

- No recrear ni migrar la configuración existente sin una tarea explícita.

#### Constraints técnicos

- Cambios sustanciales requieren una tarea explícita o ADR.

### TASK-009 — Configurar Firebase

**Priority:** P0 · **Depends:** TASK-001 · **Status:** DONE

#### Objetivo

Conservar como completado el trabajo de **Configurar Firebase** y evitar que futuras sesiones lo repitan.

#### Alcance

- Verificar que la configuración existente sigue disponible.
- No rehacer el bootstrap salvo incidencia real.

#### Criterios de aceptación

- [ ] La configuración existente sigue funcionando.
- [ ] OpenCode no vuelve a ejecutar esta tarea.

#### Fuera de alcance

- No recrear ni migrar la configuración existente sin una tarea explícita.

#### Constraints técnicos

- Cambios sustanciales requieren una tarea explícita o ADR.

### TASK-010 — Auth port y adapter

**Priority:** P0 · **Depends:** TASK-005, TASK-009 · **Status:** DONE

#### Objetivo

Definir el port de autenticación y su adapter Firebase, aislando el SDK de Firebase de Domain/Application.

#### Alcance

- Definir contratos para registro, login, logout y observación de sesión.
- Traducir usuario autenticado y errores a modelos de aplicación.

#### Criterios de aceptación

- [x] Application puede probarse con un fake del port.
- [x] Firebase solo aparece en Infrastructure/composición.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-011 — Registro

**Priority:** P0 · **Depends:** TASK-010 · **Status:** DONE

#### Objetivo

Implementar el registro mediante email/password sobre el port de autenticación.

#### Alcance

- Validar entradas.
- Crear la identidad del usuario.
- Mapear errores de email existente, validación y red.
- Conectar el caso de uso con la UI.

#### Criterios de aceptación

- [x] Un usuario válido puede registrarse.
- [x] Entradas inválidas muestran errores controlados.
- [x] No se expone el error bruto del SDK.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-012 — Login/logout

**Priority:** P0 · **Depends:** TASK-010 · **Status:** DONE

#### Objetivo

Implementar login y logout con estados explícitos de carga, éxito y error.

#### Alcance

- Login email/password.
- Logout.
- Manejo de credenciales inválidas y errores de red.
- Tests de éxito y fallo.

#### Criterios de aceptación

- [x] Credenciales válidas abren el estado autenticado.
- [x] Credenciales inválidas no autentican.
- [x] Logout limpia la sesión.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-013 — Restauración de sesión

**Priority:** P0 · **Depends:** TASK-012 · **Status:** DONE

#### Objetivo

Restaurar la sesión al recargar la aplicación sin listeners duplicados.

#### Alcance

- Suscribirse al estado de autenticación.
- Modelar loading/authenticated/anonymous.
- Liberar suscripciones.

#### Criterios de aceptación

- [x] Refresh conserva una sesión válida.
- [x] Una sesión inválida produce estado anónimo.
- [x] No quedan listeners duplicados.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-014 — Auth guards

**Priority:** P0 · **Depends:** TASK-013 · **Status:** DONE

#### Objetivo

Proteger rutas y flujos que requieren autenticación.

#### Alcance

- Definir guard de rutas.
- Resolver el estado de carga.
- Redirigir usuarios anónimos al acceso.

#### Criterios de aceptación

- [x] Un usuario anónimo no puede acceder a workspaces.
- [x] No hay redirecciones prematuras durante la restauración de sesión.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-015 — Workspace entity

**Priority:** P0 · **Depends:** TASK-005 · **Status:** DONE

#### Objetivo

Definir la entidad Workspace y sus invariantes de dominio.

#### Alcance

- Identidad, nombre, timestamps y metadatos mínimos.
- Validaciones de creación y actualización.

#### Criterios de aceptación

- [ ] No depende de Firebase ni React.
- [ ] Invariantes cubiertos por tests.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-016 — Membership entity

**Priority:** P0 · **Depends:** TASK-005 · **Status:** DONE

#### Objetivo

Definir Membership y el modelo de roles del MVP.

#### Alcance

- UserId, WorkspaceId, rol y timestamps.
- Roles Owner, Editor y Viewer.

#### Criterios de aceptación

- [ ] Roles tipados.
- [ ] Las reglas básicas pueden evaluarse sin UI.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-017 — Workspace repository port

**Priority:** P0 · **Depends:** TASK-015 · **Status:** DONE

#### Objetivo

Definir el port de persistencia de Workspace.

#### Alcance

- Contratos para crear, listar, actualizar y eliminar.
- Modelo de errores y resultados.

#### Criterios de aceptación

- [x] Los casos de uso no conocen Firestore.
- [x] El port puede probarse con un fake.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los mappers entre persistencia y dominio son explícitos.
- No se devuelven documentos Firestore directamente a Application.

### TASK-018 — Firestore workspace repository

**Priority:** P0 · **Depends:** TASK-017, TASK-009 · **Status:** DONE

#### Objetivo

Implementar el repository de Workspace sobre Firestore.

#### Alcance

- Mapear documentos a entidades.
- Persistir IDs/timestamps.
- Traducir errores.

#### Criterios de aceptación

- [x] Lectura y escritura funcionan con Firebase.
- [x] El mapping está aislado y testeado.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los mappers entre persistencia y dominio son explícitos.
- No se devuelven documentos Firestore directamente a Application.
- El SDK de Firebase solo aparece en Infrastructure/configuración.

### TASK-019 — CreateWorkspace use case

**Priority:** P0 · **Depends:** TASK-017 · **Status:** DONE

#### Objetivo

Completar **CreateWorkspace use case** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **CreateWorkspace use case**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Definir entradas y salidas del caso de uso.
- Cubrir reglas de negocio con tests unitarios.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Puede probarse con ports fake sin Firebase.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-020 — ListWorkspaces use case

**Priority:** P0 · **Depends:** TASK-017 · **Status:** DONE

#### Objetivo

Completar **ListWorkspaces use case** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **ListWorkspaces use case**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Definir entradas y salidas del caso de uso.
- Cubrir reglas de negocio con tests unitarios.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Puede probarse con ports fake sin Firebase.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-021 — UpdateWorkspace use case

**Priority:** P0 · **Depends:** TASK-017 · **Status:** DONE

#### Objetivo

Completar **UpdateWorkspace use case** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **UpdateWorkspace use case**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Definir entradas y salidas del caso de uso.
- Cubrir reglas de negocio con tests unitarios.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Puede probarse con ports fake sin Firebase.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-022 — DeleteWorkspace use case

**Priority:** P0 · **Depends:** TASK-017 · **Status:** DONE

#### Objetivo

Completar **DeleteWorkspace use case** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **DeleteWorkspace use case**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Definir entradas y salidas del caso de uso.
- Cubrir reglas de negocio con tests unitarios.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Puede probarse con ports fake sin Firebase.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-023 — Workspace list UI

**Priority:** P0 · **Depends:** TASK-020 · **Status:** DONE

#### Objetivo

Completar **Workspace list UI** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Workspace list UI**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Los estados loading/error/empty relevantes son explícitos.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Usar `@raulrod/ui` como base; wrappers propios solo cuando aporten valor.

### TASK-024 — Create workspace flow

**Priority:** P0 · **Depends:** TASK-019 · **Status:** DONE

#### Objetivo

Completar **Create workspace flow** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Create workspace flow**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-025 — Workspace shell

**Priority:** P0 · **Depends:** TASK-023 · **Status:** DONE

#### Objetivo

Completar **Workspace shell** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Workspace shell**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-026 — Position, Size, Bounds

**Priority:** P0 · **Depends:** TASK-005 · **Status:** DONE

#### Objetivo

Definir los value objects geométricos base del canvas.

#### Alcance

- Position, Size y Bounds.
- Validaciones y operaciones puras necesarias.

#### Criterios de aceptación

- [x] No dependen del DOM.
- [x] Casos límite cubiertos por tests.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-027 — Transform y Viewport

**Priority:** P0 · **Depends:** TASK-026 · **Status:** DONE

#### Objetivo

Definir Transform y Viewport para representar la cámara del canvas.

#### Alcance

- Traslación, escala y viewport.
- Valores por defecto e invariantes.

#### Criterios de aceptación

- [x] Permiten convertir entre espacio mundo y pantalla.
- [x] No dependen de React.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-028 — Coordinate transformations

**Priority:** P0 · **Depends:** TASK-027 · **Status:** DONE

#### Objetivo

Implementar transformaciones puras entre coordenadas de mundo y pantalla.

#### Alcance

- worldToScreen y screenToWorld.
- Operaciones necesarias para zoom/pan.
- Tests con zoom y pan no triviales.

#### Criterios de aceptación

- [x] Las conversiones son inversas dentro de la precisión esperada.
- [x] No dependen del DOM.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-029 — Pan

**Priority:** P0 · **Depends:** TASK-028 · **Status:** DONE

#### Objetivo

Completar **Pan** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Pan**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-030 — Zoom

**Priority:** P0 · **Depends:** TASK-028 · **Status:** DONE

#### Objetivo

Implementar zoom centrado en el punto de interacción.

#### Alcance

- Wheel/pointer.
- Límites razonables.
- Conservar el punto bajo el cursor cuando corresponda.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [x] No genera escalas inválidas.
- [x] La experiencia mantiene estable el punto de referencia.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-031 — Reset/fit view

**Priority:** P1 · **Depends:** TASK-030 · **Status:** DONE

#### Objetivo

Completar **Reset/fit view** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Reset/fit view**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-032 — Grid

**Priority:** P2 · **Depends:** TASK-029 · **Status:** DONE

#### Objetivo

Completar **Grid** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Grid**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-033 — Single selection

**Priority:** P0 · **Depends:** TASK-029 · **Status:** DONE

#### Objetivo

Completar **Single selection** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Single selection**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-034 — Multi-selection

**Priority:** P0 · **Depends:** TASK-033 · **Status:** TODO

#### Objetivo

Completar **Multi-selection** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Multi-selection**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-035 — Drag selection

**Priority:** P1 · **Depends:** TASK-034 · **Status:** TODO

#### Objetivo

Completar **Drag selection** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Drag selection**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-036 — Selection keyboard interactions

**Priority:** P0 · **Depends:** TASK-034 · **Status:** TODO

#### Objetivo

Completar **Selection keyboard interactions** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Selection keyboard interactions**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] La interacción principal es navegable con teclado y mantiene foco predecible.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-037 — BaseElement

**Priority:** P0 · **Depends:** TASK-026 · **Status:** TODO

#### Objetivo

Definir el contrato común de elementos del canvas y sus invariantes.

#### Alcance

- BaseElement con campos compartidos.
- Unión discriminada de tipos concretos.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] Los tipos se distinguen sin casts.
- [ ] Invariantes cubiertos por tests.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-038 — TextElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** TODO

#### Objetivo

Completar **TextElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **TextElement**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-039 — NoteElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** TODO

#### Objetivo

Completar **NoteElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **NoteElement**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-040 — TaskElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** TODO

#### Objetivo

Completar **TaskElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **TaskElement**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-041 — FrameElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** TODO

#### Objetivo

Completar **FrameElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **FrameElement**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-042 — ConnectorElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** TODO

#### Objetivo

Completar **ConnectorElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **ConnectorElement**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-043 — LinkElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** TODO

#### Objetivo

Completar **LinkElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **LinkElement**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-044 — CreateElement command

**Priority:** P0 · **Depends:** TASK-038 a TASK-043 · **Status:** TODO

#### Objetivo

Implementar el comando de creación de elementos.

#### Alcance

- Crear cualquier tipo MVP.
- Generar ID y metadatos.
- Validar payload.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] Cada tipo válido puede crearse.
- [ ] La operación es apta para history/undo.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-045 — UpdateElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** TODO

#### Objetivo

Completar **UpdateElement command** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **UpdateElement command**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-046 — MoveElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** TODO

#### Objetivo

Completar **MoveElement command** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **MoveElement command**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-047 — ResizeElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** TODO

#### Objetivo

Completar **ResizeElement command** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **ResizeElement command**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-048 — DeleteElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** TODO

#### Objetivo

Completar **DeleteElement command** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **DeleteElement command**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-049 — DuplicateElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** TODO

#### Objetivo

Completar **DuplicateElement command** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **DuplicateElement command**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-050 — Canvas rendering abstraction

**Priority:** P0 · **Depends:** TASK-037 · **Status:** TODO

#### Objetivo

Completar **Canvas rendering abstraction** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Canvas rendering abstraction**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-051 — Text renderer

**Priority:** P0 · **Depends:** TASK-038, TASK-050 · **Status:** TODO

#### Objetivo

Completar **Text renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Text renderer**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-052 — Note renderer

**Priority:** P0 · **Depends:** TASK-039, TASK-050 · **Status:** TODO

#### Objetivo

Completar **Note renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Note renderer**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-053 — Task renderer

**Priority:** P0 · **Depends:** TASK-040, TASK-050 · **Status:** TODO

#### Objetivo

Completar **Task renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Task renderer**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-054 — Frame renderer

**Priority:** P0 · **Depends:** TASK-041, TASK-050 · **Status:** TODO

#### Objetivo

Completar **Frame renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Frame renderer**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-055 — Connector renderer

**Priority:** P0 · **Depends:** TASK-042, TASK-050 · **Status:** TODO

#### Objetivo

Completar **Connector renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Connector renderer**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-056 — Link renderer

**Priority:** P0 · **Depends:** TASK-043, TASK-050 · **Status:** TODO

#### Objetivo

Completar **Link renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Link renderer**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-057 — Move elements

**Priority:** P0 · **Depends:** TASK-046, TASK-051, TASK-052, TASK-053 · **Status:** TODO

#### Objetivo

Completar **Move elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Move elements**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-058 — Resize elements

**Priority:** P0 · **Depends:** TASK-047 · **Status:** TODO

#### Objetivo

Completar **Resize elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Resize elements**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-059 — Delete elements

**Priority:** P0 · **Depends:** TASK-048 · **Status:** TODO

#### Objetivo

Completar **Delete elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Delete elements**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-060 — Duplicate elements

**Priority:** P0 · **Depends:** TASK-049 · **Status:** TODO

#### Objetivo

Completar **Duplicate elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Duplicate elements**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-061 — Copy/paste

**Priority:** P1 · **Depends:** TASK-060 · **Status:** TODO

#### Objetivo

Completar **Copy/paste** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Copy/paste**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-062 — Keyboard shortcuts

**Priority:** P0 · **Depends:** TASK-059, TASK-061 · **Status:** TODO

#### Objetivo

Completar **Keyboard shortcuts** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Keyboard shortcuts**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción principal es navegable con teclado y mantiene foco predecible.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-063 — Command interface

**Priority:** P0 · **Depends:** TASK-044 · **Status:** TODO

#### Objetivo

Definir la interfaz común de comandos ejecutables y reversibles.

#### Alcance

- Contrato execute/undo o equivalente.
- Resultado/metadatos mínimos.

#### Criterios de aceptación

- [ ] Es testeable sin React.
- [ ] Permite implementar undo/redo sin conocer UI.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-064 — Command history manager

**Priority:** P0 · **Depends:** TASK-063 · **Status:** TODO

#### Objetivo

Completar **Command history manager** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Command history manager**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-065 — Undo

**Priority:** P0 · **Depends:** TASK-064 · **Status:** TODO

#### Objetivo

Completar **Undo** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Undo**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-066 — Redo

**Priority:** P0 · **Depends:** TASK-065 · **Status:** TODO

#### Objetivo

Completar **Redo** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Redo**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-067 — History edge cases

**Priority:** P0 · **Depends:** TASK-066 · **Status:** TODO

#### Objetivo

Completar **History edge cases** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **History edge cases**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-068 — Element repository port

**Priority:** P0 · **Depends:** TASK-037 · **Status:** TODO

#### Objetivo

Definir el port de persistencia de elementos.

#### Alcance

- Lectura por workspace.
- Crear/actualizar/eliminar.
- Contrato compatible con batching si se necesita.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] Application no conoce persistencia concreta.
- [ ] Cubre las operaciones del MVP.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los mappers entre persistencia y dominio son explícitos.
- No se devuelven documentos Firestore directamente a Application.

### TASK-069 — Firestore element repository

**Priority:** P0 · **Depends:** TASK-068 · **Status:** TODO

#### Objetivo

Completar **Firestore element repository** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Firestore element repository**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los mappers entre persistencia y dominio son explícitos.
- No se devuelven documentos Firestore directamente a Application.
- El SDK de Firebase solo aparece en Infrastructure/configuración.

### TASK-070 — Load workspace elements

**Priority:** P0 · **Depends:** TASK-069 · **Status:** TODO

#### Objetivo

Completar **Load workspace elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Load workspace elements**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-071 — Persist element mutations

**Priority:** P0 · **Depends:** TASK-069 · **Status:** TODO

#### Objetivo

Completar **Persist element mutations** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Persist element mutations**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-072 — Persistence orchestration

**Priority:** P0 · **Depends:** TASK-071 · **Status:** TODO

#### Objetivo

Completar **Persistence orchestration** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Persistence orchestration**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-073 — Debounce/batching

**Priority:** P0 · **Depends:** TASK-072 · **Status:** TODO

#### Objetivo

Completar **Debounce/batching** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Debounce/batching**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-074 — Sync status

**Priority:** P1 · **Depends:** TASK-072 · **Status:** TODO

#### Objetivo

Completar **Sync status** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Sync status**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-075 — Recovery after refresh

**Priority:** P0 · **Depends:** TASK-070, TASK-073 · **Status:** TODO

#### Objetivo

Completar **Recovery after refresh** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Recovery after refresh**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-076 — Realtime port

**Priority:** P0 · **Depends:** TASK-068 · **Status:** TODO

#### Objetivo

Definir el port de colaboración realtime.

#### Alcance

- Suscripción a cambios.
- Publicación de cambios locales.
- Lifecycle y cleanup.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [ ] Application usa realtime mediante port.
- [ ] No se expone Firestore a Presentation.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-077 — Firestore realtime adapter

**Priority:** P0 · **Depends:** TASK-076 · **Status:** TODO

#### Objetivo

Completar **Firestore realtime adapter** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Firestore realtime adapter**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- El SDK de Firebase solo aparece en Infrastructure/configuración.

### TASK-078 — Remote element updates

**Priority:** P0 · **Depends:** TASK-077 · **Status:** TODO

#### Objetivo

Completar **Remote element updates** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Remote element updates**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-079 — Optimistic updates

**Priority:** P0 · **Depends:** TASK-078 · **Status:** TODO

#### Objetivo

Completar **Optimistic updates** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Optimistic updates**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-080 — Reconnect handling

**Priority:** P0 · **Depends:** TASK-078 · **Status:** TODO

#### Objetivo

Completar **Reconnect handling** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Reconnect handling**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-081 — Conflict strategy

**Priority:** P0 · **Depends:** TASK-078 · **Status:** TODO

#### Objetivo

Definir e implementar la estrategia de consistencia para cambios concurrentes.

#### Alcance

- Optimistic local updates.
- Last-write-wins para propiedades simples cuando sea adecuado.
- Reglas para operaciones independientes por elemento.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [ ] La estrategia está documentada.
- [ ] Los conflictos previsibles son deterministas.
- [ ] No se introduce CRDT.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-082 — Presence port/model

**Priority:** P0 · **Depends:** TASK-076 · **Status:** TODO

#### Objetivo

Completar **Presence port/model** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Presence port/model**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.
- Mantener la presencia como estado efímero.
- Limpiar presencia al desconectar.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] No se crean listeners duplicados.
- [ ] La presencia no modifica ni bloquea el documento persistido.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-083 — Connected users

**Priority:** P0 · **Depends:** TASK-082 · **Status:** TODO

#### Objetivo

Completar **Connected users** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Connected users**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-084 — Remote cursors

**Priority:** P1 · **Depends:** TASK-082, TASK-028 · **Status:** TODO

#### Objetivo

Completar **Remote cursors** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Remote cursors**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.
- Mantener la presencia como estado efímero.
- Limpiar presencia al desconectar.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] No se crean listeners duplicados.
- [ ] La presencia no modifica ni bloquea el documento persistido.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-085 — Presence cleanup

**Priority:** P0 · **Depends:** TASK-083 · **Status:** TODO

#### Objetivo

Completar **Presence cleanup** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Presence cleanup**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.
- Mantener la presencia como estado efímero.
- Limpiar presencia al desconectar.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] No se crean listeners duplicados.
- [ ] La presencia no modifica ni bloquea el documento persistido.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-086 — Remote create/delete

**Priority:** P0 · **Depends:** TASK-078 · **Status:** TODO

#### Objetivo

Completar **Remote create/delete** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Remote create/delete**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-087 — Remote move/resize

**Priority:** P0 · **Depends:** TASK-078 · **Status:** TODO

#### Objetivo

Completar **Remote move/resize** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Remote move/resize**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-088 — Local history vs remote changes

**Priority:** P0 · **Depends:** TASK-065, TASK-078 · **Status:** TODO

#### Objetivo

Completar **Local history vs remote changes** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Local history vs remote changes**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Undo/redo no corrompe el estado ante secuencias válidas.
- [ ] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-089 — Membership repository port

**Priority:** P0 · **Depends:** TASK-016 · **Status:** TODO

#### Objetivo

Completar **Membership repository port** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Membership repository port**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los mappers entre persistencia y dominio son explícitos.
- No se devuelven documentos Firestore directamente a Application.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-090 — Firestore membership repository

**Priority:** P0 · **Depends:** TASK-089 · **Status:** TODO

#### Objetivo

Completar **Firestore membership repository** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Firestore membership repository**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los mappers entre persistencia y dominio son explícitos.
- No se devuelven documentos Firestore directamente a Application.
- El SDK de Firebase solo aparece en Infrastructure/configuración.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-091 — Create owner membership

**Priority:** P0 · **Depends:** TASK-090 · **Status:** TODO

#### Objetivo

Completar **Create owner membership** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Create owner membership**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-092 — Invite member use case

**Priority:** P0 · **Depends:** TASK-090 · **Status:** TODO

#### Objetivo

Completar **Invite member use case** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Invite member use case**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Definir entradas y salidas del caso de uso.
- Cubrir reglas de negocio con tests unitarios.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Puede probarse con ports fake sin Firebase.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-093 — Invitation UI

**Priority:** P0 · **Depends:** TASK-092 · **Status:** TODO

#### Objetivo

Completar **Invitation UI** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Invitation UI**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los estados loading/error/empty relevantes son explícitos.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.
- Usar `@raulrod/ui` como base; wrappers propios solo cuando aporten valor.

### TASK-094 — Accept invitation

**Priority:** P0 · **Depends:** TASK-092 · **Status:** TODO

#### Objetivo

Completar **Accept invitation** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Accept invitation**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-095 — Authorization policy

**Priority:** P0 · **Depends:** TASK-016 · **Status:** TODO

#### Objetivo

Definir la política de autorización Owner/Editor/Viewer como lógica explícita.

#### Alcance

- Matriz de permisos por operación.
- Funciones puras para evaluar autorización.

#### Criterios de aceptación

- [ ] La política es testeable sin Firebase.
- [ ] Viewer no puede modificar elementos ni miembros.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-096 — Frontend permission guards

**Priority:** P0 · **Depends:** TASK-095 · **Status:** TODO

#### Objetivo

Completar **Frontend permission guards** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Frontend permission guards**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-097 — Firebase Security Rules

**Priority:** P0 · **Depends:** TASK-090, TASK-095 · **Status:** TODO

#### Objetivo

Aplicar la autorización efectiva mediante Firebase Security Rules.

#### Alcance

- Reglas para workspaces, memberships y elementos.
- Validar identidad y rol.

#### Criterios de aceptación

- [ ] Un Viewer no puede escribir manipulando el cliente.
- [ ] Casos allow/deny están testeados.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-098 — Security Rules tests

**Priority:** P0 · **Depends:** TASK-097 · **Status:** TODO

#### Objetivo

Completar **Security Rules tests** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Security Rules tests**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-099 — Change member role

**Priority:** P0 · **Depends:** TASK-097 · **Status:** TODO

#### Objetivo

Completar **Change member role** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Change member role**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-100 — Remove member

**Priority:** P0 · **Depends:** TASK-097 · **Status:** TODO

#### Objetivo

Completar **Remove member** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Remove member**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-101 — Leave workspace

**Priority:** P1 · **Depends:** TASK-097 · **Status:** TODO

#### Objetivo

Completar **Leave workspace** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Leave workspace**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-102 — Delete workspace authorization

**Priority:** P0 · **Depends:** TASK-097 · **Status:** TODO

#### Objetivo

Completar **Delete workspace authorization** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Delete workspace authorization**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-103 — Design tokens

**Priority:** P0 · **Depends:** TASK-003 · **Status:** TODO

#### Objetivo

Completar **Design tokens** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Design tokens**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-104 — Core UI components

**Priority:** P0 · **Depends:** TASK-103 · **Status:** TODO

#### Objetivo

Completar **Core UI components** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Core UI components**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los estados loading/error/empty relevantes son explícitos.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Usar `@raulrod/ui` como base; wrappers propios solo cuando aporten valor.

### TASK-105 — Workspace top bar

**Priority:** P0 · **Depends:** TASK-104 · **Status:** TODO

#### Objetivo

Completar **Workspace top bar** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Workspace top bar**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los estados loading/error/empty relevantes son explícitos.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Usar `@raulrod/ui` como base; wrappers propios solo cuando aporten valor.

### TASK-106 — Canvas toolbar

**Priority:** P0 · **Depends:** TASK-104 · **Status:** TODO

#### Objetivo

Completar **Canvas toolbar** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Canvas toolbar**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] Los estados loading/error/empty relevantes son explícitos.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Usar `@raulrod/ui` como base; wrappers propios solo cuando aporten valor.

### TASK-107 — Share dialog

**Priority:** P0 · **Depends:** TASK-104, TASK-093 · **Status:** TODO

#### Objetivo

Completar **Share dialog** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Share dialog**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los estados loading/error/empty relevantes son explícitos.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Usar `@raulrod/ui` como base; wrappers propios solo cuando aporten valor.

### TASK-108 — Loading/error/empty states

**Priority:** P0 · **Depends:** TASK-104 · **Status:** TODO

#### Objetivo

Completar **Loading/error/empty states** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Loading/error/empty states**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-109 — Keyboard navigation

**Priority:** P0 · **Depends:** TASK-062 · **Status:** TODO

#### Objetivo

Completar **Keyboard navigation** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Keyboard navigation**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los estados loading/error/empty relevantes son explícitos.
- [ ] La interacción principal es navegable con teclado y mantiene foco predecible.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Usar `@raulrod/ui` como base; wrappers propios solo cuando aporten valor.

### TASK-110 — Focus management

**Priority:** P0 · **Depends:** TASK-104 · **Status:** TODO

#### Objetivo

Completar **Focus management** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Focus management**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los estados loading/error/empty relevantes son explícitos.
- [ ] La interacción principal es navegable con teclado y mantiene foco predecible.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Usar `@raulrod/ui` como base; wrappers propios solo cuando aporten valor.

### TASK-111 — Canvas accessibility strategy

**Priority:** P0 · **Depends:** TASK-050 · **Status:** TODO

#### Objetivo

Definir una estrategia de accesibilidad específica para el canvas.

#### Alcance

- Keyboard para acciones principales.
- Roles/nombres accesibles para controles.
- Alternativa textual mínima cuando corresponda.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] Las operaciones principales no dependen exclusivamente del puntero.
- [ ] La estrategia queda documentada.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.
- [ ] Los estados loading/error/empty relevantes son explícitos.
- [ ] La interacción principal es navegable con teclado y mantiene foco predecible.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Usar `@raulrod/ui` como base; wrappers propios solo cuando aporten valor.

### TASK-112 — Reduced motion / contrast

**Priority:** P1 · **Depends:** TASK-103 · **Status:** TODO

#### Objetivo

Completar **Reduced motion / contrast** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Reduced motion / contrast**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-113 — Canvas performance baseline

**Priority:** P0 · **Depends:** TASK-057 · **Status:** TODO

#### Objetivo

Medir una línea base de rendimiento del canvas antes de optimizar.

#### Alcance

- Escenarios de 100, 1.000, 5.000 y 10.000 elementos cuando sea viable.
- Medir render, pan, zoom, selección y memoria.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] Existe método reproducible y registro de métricas.
- [ ] Las optimizaciones posteriores se justifican con datos.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Optimizar solo cuellos de botella demostrados por medición.

### TASK-114 — Rendering optimization

**Priority:** P1 · **Depends:** TASK-113 · **Status:** TODO

#### Objetivo

Completar **Rendering optimization** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Rendering optimization**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] La interacción representa correctamente posición, tamaño y estado relevante.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Optimizar solo cuellos de botella demostrados por medición.

### TASK-115 — Performance regression test

**Priority:** P1 · **Depends:** TASK-114 · **Status:** TODO

#### Objetivo

Completar **Performance regression test** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Performance regression test**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Optimizar solo cuellos de botella demostrados por medición.

### TASK-116 — Critical journey integration tests

**Priority:** P0 · **Depends:** TASK-075, TASK-088, TASK-102 · **Status:** TODO

#### Objetivo

Completar **Critical journey integration tests** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Critical journey integration tests**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-117 — Collaboration integration test

**Priority:** P0 · **Depends:** TASK-088, TASK-102 · **Status:** TODO

#### Objetivo

Completar **Collaboration integration test** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Collaboration integration test**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-118 — Permission integration tests

**Priority:** P0 · **Depends:** TASK-098 · **Status:** TODO

#### Objetivo

Completar **Permission integration tests** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Permission integration tests**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-119 — Error handling audit

**Priority:** P0 · **Depends:** TASK-116 · **Status:** TODO

#### Objetivo

Completar **Error handling audit** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Error handling audit**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los hallazgos quedan clasificados por severidad y con acción concreta.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-120 — Security audit

**Priority:** P0 · **Depends:** TASK-098 · **Status:** TODO

#### Objetivo

Completar **Security audit** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Security audit**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los hallazgos quedan clasificados por severidad y con acción concreta.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No confiar exclusivamente en guards del frontend.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- La autorización efectiva debe existir en backend/rules; la UI solo refleja permisos.

### TASK-121 — Dependency audit

**Priority:** P1 · **Depends:** TASK-116 · **Status:** TODO

#### Objetivo

Completar **Dependency audit** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Dependency audit**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los hallazgos quedan clasificados por severidad y con acción concreta.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-122 — Architecture audit

**Priority:** P0 · **Depends:** TASK-116 · **Status:** TODO

#### Objetivo

Auditar que la implementación respeta Clean Architecture y Hexagonal Architecture.

#### Alcance

- Revisar imports y dependencias entre capas.
- Detectar acoplamientos indebidos.
- Registrar excepciones justificadas.

#### Criterios de aceptación

- [ ] No quedan dependencias prohibidas sin justificación.
- [ ] Excepciones relevantes tienen ADR.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los hallazgos quedan clasificados por severidad y con acción concreta.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-123 — MVP documentation

**Priority:** P1 · **Depends:** TASK-122 · **Status:** TODO

#### Objetivo

Completar **MVP documentation** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **MVP documentation**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [ ] El comportamiento definido por el objetivo está implementado y reproducible.
- [ ] Las dependencias de la tarea se respetan.
- [ ] Los errores previsibles tienen comportamiento explícito.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-124 — Final MVP validation

**Priority:** P0 · **Depends:** TASK-119, TASK-120, TASK-122, TASK-123 · **Status:** TODO

#### Objetivo

Ejecutar la validación final del MVP y confirmar que es entregable.

#### Alcance

- Verificar journey principal.
- Ejecutar quality gates.
- Revisar backlog, documentación, seguridad y riesgos residuales.

#### Criterios de aceptación

- [ ] Criterios críticos satisfechos.
- [ ] Lint, typecheck, tests y build pasan.
- [ ] Backlog refleja el estado real.
- [ ] Los tests relevantes pasan sin regresiones.
- [ ] TypeScript strict, Oxlint y Prettier no reportan errores.
- [ ] Los hallazgos quedan clasificados por severidad y con acción concreta.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir funcionalidades nuevas durante la validación.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

---

# 7. Definition of Done del MVP

## Producto

- [ ] Registro/login funcionando.
- [ ] Crear, abrir, renombrar y eliminar workspace.
- [ ] Invitar colaboradores.
- [ ] Owner/Editor/Viewer funcionando.
- [ ] Canvas infinito.
- [ ] Pan y zoom.
- [ ] Selección y multiselección.
- [ ] Text, Note, Task, Frame, Connector y Link.
- [ ] Crear/mover/redimensionar/eliminar/duplicar.
- [ ] Copy/paste.
- [ ] Undo/redo.
- [ ] Autosave.
- [ ] Recuperación tras refresh.
- [ ] Realtime.
- [ ] Presence.
- [ ] Remote cursors.
- [ ] Reconnect.
- [ ] Viewer no puede modificar.

## Ingeniería

- [ ] Clean Architecture respetada.
- [ ] Hexagonal Architecture respetada.
- [ ] Domain independiente.
- [ ] Ports/adapters definidos.
- [ ] Tests unitarios.
- [ ] Tests de integración.
- [ ] Tests de Security Rules.
- [ ] CI verde.
- [ ] TypeScript sin errores.
- [ ] Oxlint verde.
- [ ] Prettier check verde.
- [ ] Build verde.
- [ ] Performance medida y aceptable.
- [ ] Accesibilidad básica validada.
- [ ] README actualizado.
- [ ] ADRs relevantes registrados.

---

# 8. Quality gates finales

```bash
npm run lint
npm run format:check
npx tsc -b --noEmit
npm test
npm run build
```

Además:

- revisar `git diff`;
- revisar dependencias prohibidas entre capas;
- comprobar Security Rules;
- probar el journey principal con dos usuarios;
- comprobar refresh/reconnect;
- validar Viewer contra intentos reales de escritura;
- revisar riesgos de rendimiento identificados en TASK-113;
- comprobar que no quedan tareas P0 incompletas.

---

# 9. Documentación y ADRs

Los ADRs viven en:

```text
docs/adr/
```

Formato:

```text
# ADR-XXX — Título

## Contexto

## Decisión

## Alternativas consideradas

## Consecuencias

## Estado
```

Crear ADR para decisiones transversales como:

- estrategia de renderizado del canvas;
- modelo de consistencia realtime;
- estrategia de conflictos;
- almacenamiento;
- cambios relevantes de arquitectura;
- nueva dependencia estructural.

No crear ADR para decisiones locales triviales.

---

# 10. Session Log

<!--
Añadir una entrada breve por sesión.

## YYYY-MM-DD — TASK-XXX
- Resultado:
- Tests/quality gates:
- Decisiones:
- Bloqueos:
- Siguiente tarea:
-->

## 2026-10-08 — TASK-011

- Resultado: Registro implementado de punta a punta: validadores puros (`src/shared/utils/validation.ts`), caso de uso `createRegisterUser` con resultado discriminado (`ok`/`invalid-input`/`error`) en `src/application/commands/register-user.ts`, `RegisterForm` con `@raulrod/ui` en `src/presentation/features/auth/` y composición en `src/app/config/auth-services.ts` (único punto que instancia el adapter Firebase). Plantilla demo de Vite sustituida.
- Tests/quality gates: 98 tests pasan (9 suites); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit` y `npm run build` en verde. Smoke manual contra Firebase real pendiente de verificación con `npm run dev` (no ejecutado para no crear usuarios reales).
- Decisiones: Jest migra a entorno jsdom con Testing Library (`@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`) y soporte para paquetes ESM-only de `@raulrod/*` — ver ADR-0003.
- Nota: se corrigió el import de `@raulrod/tokens/styles.css` en `main.tsx` (sin él no se definían las variables `--rr-*` y la UI renderizaba sin formato); `@raulrod/tokens` pasa a ser dependencia directa.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-012 (Login/logout).

## 2026-10-08 — TASK-012

- Resultado: Login/logout de punta a punta sin tocar Infrastructure (el adapter ya exponía `signIn`/`signOut` y el mapper ya traducía `auth/invalid-credential`). Casos de uso `createLoginUser` y `createLogoutUser` en `src/application/commands/` con resultado discriminado; `describeLoginError` comparte con `describeRegisterError` el mapeo de fallos de red/persistencia; `LoginForm` con `@raulrod/ui`; `AuthFlow` en `src/presentation/features/auth/` compone sign-up, sign-in y estado autenticado con DI de casos de uso (testeable con `FakeAuthPort`); `App.tsx` solo compone servicios.
- Tests/quality gates: 126 tests pasan (13 suites); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit` y `npm run build` en verde. Smoke manual con `npm run dev` pendiente (no se crean usuarios reales desde el agente).
- Decisiones: vista inicial en `sign-up` para conservar el landing de TASK-011 y retorno a `sign-in` tras logout; el login valida email y password no vacío sin longitud mínima (la valida el servidor); los errores de credenciales se muestran como mensaje amigable, nunca el código del provider.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-013 (Restauración de sesión).

## 2026-10-08 — TASK-013

- Resultado: Restauración de sesión de punta a punta. `createSessionStore` en `src/application/services/` envuelve `AuthPort.observeSession` con un estado tri-estado `loading/authenticated/anonymous`, snapshot con referencia estable (requisito de `useSyncExternalStore`) y suscripción perezosa al puerto: se conecta con el primer subscriber y se libera con el último. `SessionProvider`/`useSession` en `src/app/providers/` consumen el store; el store se compone en `createAuthServices()`. `AuthFlow` pasa a derivar el usuario de `useSession()` (fuente única de verdad): se eliminó el estado local de usuario y los callbacks `onLoggedIn`/`onRegistered` de `LoginForm`/`RegisterForm`. Placeholder `role="status"` durante `loading` para evitar el flash del formulario en refresh.
- Tests/quality gates: 148 tests pasan (15 suites, +22); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit` y `npm run build` en verde. Cobertura clave: refresh con sesión persistida sin interacción, fallback a anónimo con sesión nula/error del puerto, 1 listener de puerto bajo `<StrictMode>` y 0 tras unmount. Smoke manual con `npm run dev` pendiente (no se crean usuarios reales desde el agente).
- Decisiones: tri-estado modelado en Application (no en Presentation) para que TASK-014 (auth guards) pueda evaluarlo sin React; el store conserva el último snapshot resuelto al remontar para evitar flicker de `loading` bajo StrictMode; `FakeAuthPort` gana `activeSessionListenerCount()` y `emitSessionError()` como apoyo de tests.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-014 (Auth guards).

## 2026-10-08 — TASK-018

- Resultado: Repository de Workspace sobre Firestore. `createFirebaseWorkspaceRepository(db)` en `src/infrastructure/firebase/firebase-workspace-repository.ts` (factory + DI, patrón de ADR-0002) cumple el contrato de ADR-0005: id auto-generado con `doc(collection)`, `setDoc` en creación, `updateDoc` parcial (last-write-wins por propiedad), prechequeo de existencia en `update`/`delete` (el `deleteDoc` de Firestore es silencioso con ids inexistentes) y traducción de errores con `mapFirebaseError` ampliado con códigos Firestore (`unauthenticated`, `invalid-argument`, `resource-exhausted`, `failed-precondition`, `aborted`, `cancelled`). Mapper puro `firebase-workspace-mapper.ts` (sin import del SDK; acepta `Date` y `Timestamp`-like vía `toDate()`, id solo en la ruta del documento). `getFirebaseFirestore()` añadido en `firebase-app.ts`. Nada se compone todavía: el wiring llega con TASK-019+.
- Tests/quality gates: 257 tests pasan (25 suites, +29); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit` y `npm run build` en verde. La suite de contrato se extrajo a `src/test/contract/workspace-repository-contract.ts` y se ejecuta contra el fake y contra el adapter con `firebase/firestore` mockeado por un Firestore en memoria fiel (`src/test/fixtures/in-memory-firestore.ts`: `deleteDoc` idempotente, `updateDoc` → `not-found`). Smoke manual contra Firebase real pendiente de verificación con `npm run dev` (no se ejecuta para no tocar el proyecto real).
- Decisiones: (1) el test de "instancias independientes" sale del contrato compartido porque era semántica del fake —dos adapters sobre el mismo `db` deben compartir datos— y se mantiene como test específico del fake; (2) las fechas se persisten como `Date` (el SDK las convierte a `Timestamp`) para mantener el mapper puro y testeable sin mock del SDK; (3) los fallos de mapping de un documento guardado se traducen a `validation`+`VALIDATION_INVALID_INPUT` con `cause`, igual que el resto de invariantes de dominio. Ver ADR-0006.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-019 (CreateWorkspace use case).

## 2026-10-08 — TASK-023

- Resultado: Cierre de **Workspace list UI** (implementada en el commit `a18a74a` sin actualizar el backlog). `WorkspacesListContainer` con máquina de estados `idle/loading/success/error`, `try/catch` en la carga para que un rechazo de `listWorkspaces()` pase a estado error con retry (antes quedaba colgado en `loading` con un rejection sin manejar) y prop `refreshToken` para refrescar la lista desde fuera (la usará TASK-024 tras crear un workspace). `WorkspacesList` con estados explícitos: skeleton con `role="status"` + `aria-busy` + `VisuallyHidden`, error con `role="alert"` y retry, empty con CTA de creación y grid de tarjetas.
- Tests/quality gates: 310 tests pasan (31 suites, +2: rechazo → error+retry y refetch por `refreshToken`); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit` y `npm run build` en verde (se corrigió el formato de `workspaces-list.tsx`, único archivo que hacía fallar `format:check`). Smoke manual con `npm run dev` pendiente.
- Decisiones: se descartó el guard de desmonte planeado — con React 18+ `setState` tras unmount es no-op silencioso y el guard no aportaba comportamiento verificable (tests tautológicos); el `try/catch` era el fix real. Un guard de carreras request-id se evita como abstracción especulativa.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-024 (Create workspace flow).

## 2026-10-08 — TASK-024

- Resultado: Create workspace flow de punta a punta. `workspace-services.ts` expone `createWorkspace` (reutiliza `createCreateWorkspace` de TASK-019 sobre el mismo repositorio; único punto de composición con Infrastructure). `CreateWorkspaceDialog` en `src/presentation/features/workspaces/components/` usa `Dialog` de `@raulrod/ui` en modo controlado con el patrón de `LoginForm`: `noValidate`, `fieldErrors` del `invalid-input` del caso de uso, `formError` traducido por `describeCreateWorkspaceError` (red/persistencia/sesión/permisos, nunca código crudo), `submitting` con botón `loading` y reset de campos al reabrir. Triggers propios (botones de la cabecera y del estado vacío) en lugar de `Dialog.Trigger`: el `useFocusReturn` del diálogo captura `document.activeElement` al abrir y devuelve el foco al botón que lo abrió, con foco atrapado y Escape/backdrop para cerrar. Refresco de la lista vía `refreshToken` en `WorkspacesListContainer` (prop añadida en TASK-023) incrementado tras `onCreated`.
- Tests/quality gates: 323 tests pasan (34 suites, +13: 7 del diálogo con `FakeWorkspaceRepository` real en validación/éxito, 4 del mapeo de errores, 2 de integración del flujo completo —crear desde el estado vacío con validación intermedia y cancelar sin tocar la lista—); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit` y `npm run build` en verde (el aviso de chunk >500 kB es preexistente: bundle de Firebase). Smoke manual con `npm run dev` pendiente.
- Decisiones: diálogo controlado por `WorkspacesPage` (los dos triggers deben compartir un único diálogo) sin `Dialog.Trigger` porque este renderiza un `<button>` sin estilos de `@raulrod/ui` y no admite `asChild`; el reset de campos se hace al abrir (no al cerrar) para que un cierre accidental no filtre datos a la siguiente apertura.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-025 (Workspace shell).

## 2026-10-09 — TASK-030

- Resultado: Zoom centrado en el cursor de punta a punta. `Viewport.zoom(factor, anchorScreen)` en `src/domain/shared/value-objects/viewport.ts`: conserva el punto de anclaje mediante `worldAnchor - anchorScreen / newScale` y valida que el factor sea finito y mayor que cero. `CanvasViewportStore` gana `zoom(factor, anchorScreen)` con clamp de escala en `[0.1, 5]` (`MIN_CANVAS_SCALE`/`MAX_CANVAS_SCALE`) y no-op silencioso al alcanzar un límite (el `publish` compara con `equals`). Hook `useZoom` en `src/presentation/canvas/hooks/use-zoom.ts`: `Ctrl/Cmd + wheel`, `preventDefault` para no robar el scroll de página, `factor = exp(±sensitivity)` (por defecto 0.15) y anclaje en coordenadas locales del contenedor vía `getBoundingClientRect`. `Canvas` combina los refs de `usePan` y `useZoom` con un callback ref y expone `data-scale` como estado de zoom; el hint pasa a "Drag to pan · Ctrl/Cmd + scroll to zoom".
- Tests/quality gates: 455 tests pasan (46 suites, +27: 10 de `Viewport.zoom`, 6 del store, 8 de `useZoom`, 2 de integración del canvas por rueda y 1 del hint actualizado); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente). Smoke manual con `npm run dev` pendiente.
- Decisiones: (1) `Ctrl/Cmd + wheel` en lugar de wheel directo para no interceptar el scroll de página y dejar `wheel` libre para un pan vertical futuro; (2) límites `0.1x–5x` aplicados en Application (fuente de verdad del viewport) y no en el value object, que solo valida la positividad/finitud del factor; (3) sin pinch-to-zoom táctil ni indicador de porcentaje de zoom en esta tarea (fuera de alcance; el porcentaje corresponde a TASK-031/TASK-106); (4) sin ADR por ser una decisión local de interacción, no arquitectónica.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-031 (Reset/fit view).

## 2026-10-09 — TASK-031

- Resultado: Reset/fit view de punta a punta. `Viewport.fit(bounds, padding, minScale?, maxScale?)` en `src/domain/shared/value-objects/viewport.ts`: calcula `scale = min(availableW/bounds.width, availableH/bounds.height)` con clamp opcional y centra el contenido con `tx = centerX - width/(2*scale)`; bounds vacío, `available <= 0` o escala no finita devuelven `Viewport.default`. `CanvasViewportStore` gana `fit(contentBounds, padding = DEFAULT_FIT_PADDING /* 48 */)`: `null`/bounds vacío delega en `reset()` y en caso contrario aplica `Viewport.fit` con el clamp `[MIN_CANVAS_SCALE, MAX_CANVAS_SCALE]`; `reset(size?)` (ya existente y antes huérfano) queda conectado. Nuevo `ViewportControls` en `src/presentation/canvas/components/viewport-controls.tsx`: overlay inferior-derecha con el porcentaje de zoom (`Math.round(scale*100)`, `aria-label="Zoom level"`, `aria-live="polite"`) suscrito vía `useSyncExternalStore` y un `Button` "Reset view" de `@raulrod/ui` con icono `Maximize`; `Canvas` lo renderiza dentro del contenedor. El control queda excluido del pan por el `isInteractiveTarget` de `usePan`.
- Tests/quality gates: 471 tests pasan (46 suites, +16: 8 de `Viewport.fit`, 6 del store `fit`, 2 de integración del canvas para zoom % y reset); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) la matemática de encuadre vive en Domain (`Viewport.fit`) y los límites de escala en Application, coherente con TASK-030; (2) `fit` recibe `Bounds | null` y trata el contenido vacío como reset, de modo que la UI actual (sin elementos, TASK-037+) ya usa un camino definido y testeable; (3) indicador de % de zoom incluido aquí al haber sido diferido expresamente desde TASK-030 (TASK-106 conserva la toolbar); (4) sin atajos de teclado ni `ResizeObserver`/sincronización del tamaño real del contenedor (fuera de alcance); (5) sin ADR por ser una decisión local de interacción, no arquitectónica.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-032 (Grid).

## 2026-10-09 — TASK-033

- Resultado: Single selection de punta a punta y desacoplada de la persistencia. En Application (React-free): `createSelectionStore()` en `src/application/services/selection-store.ts` (snapshot `{ selectedId: string | null }`, `getSnapshot`/`subscribe`/`select`/`clear`, guarda de igualdad en `publish`, calcado de `canvas-viewport-store`) y `findSelectableAt(items, worldPoint)` en `src/application/services/canvas-hit-test.ts` con `SelectableItem = { id, bounds }`, hit-test por `Bounds.contains` y orden z (último encima). En Presentation: hook `useSelection` (listener nativo `pointerdown` en el contenedor, `Viewport.screenToWorld` + hit-test, respeta `disabled` e `isInteractiveTarget` mediante refs para no re-registrar listeners en cada render), componente `SelectionOverlay` (contorno + 8 handles en coordenadas mundo, `aria-hidden` hasta TASK-036) y `Canvas` que recibe `selectionStore` e `items`, pinta nodos placeholder `[data-selectable]` y el overlay. El guard de `usePan` se amplía con `[data-selectable]` para que un press sobre un ítem no inicie pan. Store inyectado con `useRef` en `WorkspaceShellContainer` → `WorkspaceShellLayout` → `Canvas`.
- Tests/quality gates: 514 tests pasan (50 suites, +43: 5 de `findSelectableAt`, 7 de `selection-store`, 8 de `useSelection`, 6 de selección en `canvas` y ajuste de los 10 preexistentes al nuevo prop); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente). Smoke manual con `npm run dev` pendiente.
- Decisiones: (1) la selección es estado efímero de interacción en Application (mismo patrón que el viewport), no dominio ni persistencia; (2) al no existir aún elementos (TASK-037+), `Canvas` acepta `items: readonly SelectableItem[]` con prompts `{ id, bounds }` y los pinta como nodos placeholder; el render real (TASK-050+) reutilizará el mismo store y hit-test; (3) el `pointerdown` de selección convive con el de pan vía el guard `[data-selectable]` en `usePan`, sin acoplar ambas lógicas; (4) el overlay es puramente visual pese a representar posición/tamaño/estado; teclado y foco son TASK-036; (5) sin ADR por ser una decisión local de interacción.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-034 (Multi-selection).

---

# 11. Decision Log

<!--
Índice breve de decisiones relevantes. Las decisiones arquitectónicas importantes
deben tener su ADR correspondiente en docs/adr/.
-->

---

# 12. Backlog futuro — fuera del MVP

```text
CRDT avanzado
Offline-first completo
Chat
Comentarios avanzados
IA
Integraciones externas
Mapas
Calendario
Templates marketplace
Billing
Analytics avanzada
Mobile
Vídeo/audio
Automatizaciones
Version history avanzada
Más tipos de elementos
```

Estas ideas no deben convertirse en tareas MVP sin una nueva planificación.

---

# 13. Principio de cierre

**Producto real**

> Un grupo pequeño puede transformar información dispersa en un plan visual compartido.

**Ingeniería senior**

> El sistema tiene dominio explícito, arquitectura mantenible, colaboración realtime, persistencia, undo/redo, seguridad, accesibilidad, testing y rendimiento medido.

Flujo objetivo:

```text
Create workspace
      ↓
Invite people
      ↓
Gather information
      ↓
Organize visually
      ↓
Collaborate
      ↓
Turn ideas into a shared plan
```
