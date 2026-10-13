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

**Priority:** P0 · **Depends:** TASK-033 · **Status:** DONE

#### Objetivo

Completar **Multi-selection** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Multi-selection**.
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

### TASK-035 — Drag selection

**Priority:** P1 · **Depends:** TASK-034 · **Status:** DONE

#### Objetivo

Completar **Drag selection** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Drag selection**.
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

### TASK-036 — Selection keyboard interactions

**Priority:** P0 · **Depends:** TASK-034 · **Status:** DONE

#### Objetivo

Completar **Selection keyboard interactions** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Selection keyboard interactions**.
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
- [x] La interacción principal es navegable con teclado y mantiene foco predecible.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-037 — BaseElement

**Priority:** P0 · **Depends:** TASK-026 · **Status:** DONE

#### Objetivo

Definir el contrato común de elementos del canvas y sus invariantes.

#### Alcance

- BaseElement con campos compartidos.
- Unión discriminada de tipos concretos.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [x] Los tipos se distinguen sin casts.
- [x] Invariantes cubiertos por tests.
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

### TASK-038 — TextElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** DONE

#### Objetivo

Completar **TextElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **TextElement**.
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

### TASK-039 — NoteElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** DONE

#### Objetivo

Completar **NoteElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **NoteElement**.
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

### TASK-040 — TaskElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** DONE

#### Objetivo

Completar **TaskElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **TaskElement**.
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

### TASK-041 — FrameElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** DONE

#### Objetivo

Completar **FrameElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **FrameElement**.
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

### TASK-042 — ConnectorElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** DONE

#### Objetivo

Completar **ConnectorElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **ConnectorElement**.
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

### TASK-043 — LinkElement

**Priority:** P0 · **Depends:** TASK-037 · **Status:** DONE

#### Objetivo

Completar **LinkElement** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **LinkElement**.
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

### TASK-044 — CreateElement command

**Priority:** P0 · **Depends:** TASK-038 a TASK-043 · **Status:** DONE

#### Objetivo

Implementar el comando de creación de elementos.

#### Alcance

- Crear cualquier tipo MVP.
- Generar ID y metadatos.
- Validar payload.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [x] Cada tipo válido puede crearse.
- [x] La operación es apta para history/undo.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] La interacción representa correctamente posición, tamaño y estado relevante.
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-045 — UpdateElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** DONE

#### Objetivo

Implementar el comando de actualización de elementos.

#### Alcance

- Comando puro de actualización de un elemento existente a partir de un patch tipado por tipo.
- Generar metadatos (`updatedAt`) mediante dependencias inyectadas.
- Validar payload y tipo del patch frente al elemento.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] La interacción representa correctamente posición, tamaño y estado relevante.
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-046 — MoveElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** DONE

#### Objetivo

Completar **MoveElement command** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **MoveElement command**.
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
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-047 — ResizeElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** DONE

#### Objetivo

Completar **ResizeElement command** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **ResizeElement command**.
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
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-048 — DeleteElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** DONE

#### Objetivo

Completar **DeleteElement command** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **DeleteElement command**.
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
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-049 — DuplicateElement command

**Priority:** P0 · **Depends:** TASK-044 · **Status:** DONE

#### Objetivo

Completar **DuplicateElement command** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **DuplicateElement command**.
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
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-050 — Canvas rendering abstraction

**Priority:** P0 · **Depends:** TASK-037 · **Status:** DONE

#### Objetivo

Completar **Canvas rendering abstraction** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Canvas rendering abstraction**.
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
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-051 — Text renderer

**Priority:** P0 · **Depends:** TASK-038, TASK-050 · **Status:** DONE

#### Objetivo

Completar **Text renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Text renderer**.
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
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-052 — Note renderer

**Priority:** P0 · **Depends:** TASK-039, TASK-050 · **Status:** DONE

#### Objetivo

Completar **Note renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Note renderer**.
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
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-053 — Task renderer

**Priority:** P0 · **Depends:** TASK-040, TASK-050 · **Status:** DONE

#### Objetivo

Completar **Task renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Task renderer**.
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
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-054 — Frame renderer

**Priority:** P0 · **Depends:** TASK-041, TASK-050 · **Status:** DONE

#### Objetivo

Completar **Frame renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Frame renderer**.
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
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-055 — Connector renderer

**Priority:** P0 · **Depends:** TASK-042, TASK-050 · **Status:** DONE

#### Objetivo

Completar **Connector renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Connector renderer**.
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
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-056 — Link renderer

**Priority:** P0 · **Depends:** TASK-043, TASK-050 · **Status:** DONE

#### Objetivo

Completar **Link renderer** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Link renderer**.
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
- No introducir tipos de elementos ni interacciones futuras.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-057 — Move elements

**Priority:** P0 · **Depends:** TASK-046, TASK-051, TASK-052, TASK-053 · **Status:** DONE

#### Objetivo

Completar **Move elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Move elements**.
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

### TASK-058 — Resize elements

**Priority:** P0 · **Depends:** TASK-047 · **Status:** DONE

#### Objetivo

Completar **Resize elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Resize elements**.
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

### TASK-059 — Delete elements

**Priority:** P0 · **Depends:** TASK-048 · **Status:** DONE

#### Objetivo

Completar **Delete elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Delete elements**.
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

### TASK-060 — Duplicate elements

**Priority:** P0 · **Depends:** TASK-049 · **Status:** DONE

#### Objetivo

Completar **Duplicate elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Duplicate elements**.
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

### TASK-061 — Copy/paste

**Priority:** P1 · **Depends:** TASK-060 · **Status:** DONE

#### Objetivo

Completar **Copy/paste** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Copy/paste**.
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

### TASK-062 — Keyboard shortcuts

**Priority:** P0 · **Depends:** TASK-059, TASK-061 · **Status:** DONE

#### Objetivo

Completar **Keyboard shortcuts** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Keyboard shortcuts**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] La interacción principal es navegable con teclado y mantiene foco predecible.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-063 — Command interface

**Priority:** P0 · **Depends:** TASK-044 · **Status:** DONE

#### Objetivo

Definir la interfaz común de comandos ejecutables y reversibles.

#### Alcance

- Contrato execute/undo o equivalente.
- Resultado/metadatos mínimos.

#### Criterios de aceptación

- [x] Es testeable sin React.
- [x] Permite implementar undo/redo sin conocer UI.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-064 — Command history manager

**Priority:** P0 · **Depends:** TASK-063 · **Status:** DONE

#### Objetivo

Completar **Command history manager** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Command history manager**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-065 — Undo

**Priority:** P0 · **Depends:** TASK-064 · **Status:** DONE

#### Objetivo

Completar **Undo** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Undo**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-066 — Redo

**Priority:** P0 · **Depends:** TASK-065 · **Status:** DONE

#### Objetivo

Completar **Redo** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Redo**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-067 — History edge cases

**Priority:** P0 · **Depends:** TASK-066 · **Status:** DONE

#### Objetivo

Completar **History edge cases** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **History edge cases**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Undo/redo no corrompe el estado ante secuencias válidas.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.
- Los comandos/historial son independientes de React y persistencia.

### TASK-068 — Element repository port

**Priority:** P0 · **Depends:** TASK-037 · **Status:** DONE

#### Objetivo

Definir el port de persistencia de elementos.

#### Alcance

- Lectura por workspace.
- Crear/actualizar/eliminar.
- Contrato compatible con batching si se necesita.
- Mantener la interacción desacoplada de la persistencia.

#### Criterios de aceptación

- [x] Application no conoce persistencia concreta.
- [x] Cubre las operaciones del MVP.
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
- Los mappers entre persistencia y dominio son explícitos.
- No se devuelven documentos Firestore directamente a Application.

### TASK-069 — Firestore element repository

**Priority:** P0 · **Depends:** TASK-068 · **Status:** DONE

#### Objetivo

Completar **Firestore element repository** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Firestore element repository**.
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
- Los mappers entre persistencia y dominio son explícitos.
- No se devuelven documentos Firestore directamente a Application.
- El SDK de Firebase solo aparece en Infrastructure/configuración.

### TASK-070 — Load workspace elements

**Priority:** P0 · **Depends:** TASK-069 · **Status:** DONE

#### Objetivo

Completar **Load workspace elements** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Load workspace elements**.
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

### TASK-071 — Persist element mutations

**Priority:** P0 · **Depends:** TASK-069 · **Status:** DONE

#### Objetivo

Completar **Persist element mutations** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Persist element mutations**.
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

### TASK-072 — Persistence orchestration

**Priority:** P0 · **Depends:** TASK-071 · **Status:** DONE

#### Objetivo

Completar **Persistence orchestration** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Persistence orchestration**.
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

### TASK-073 — Debounce/batching

**Priority:** P0 · **Depends:** TASK-072 · **Status:** DONE

#### Objetivo

Completar **Debounce/batching** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Debounce/batching**.
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

### TASK-074 — Sync status

**Priority:** P1 · **Depends:** TASK-072 · **Status:** DONE

#### Objetivo

Completar **Sync status** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Sync status**.
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

### TASK-075 — Recovery after refresh

**Priority:** P0 · **Depends:** TASK-070, TASK-073 · **Status:** DONE

#### Objetivo

Completar **Recovery after refresh** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Recovery after refresh**.
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

### TASK-076 — Realtime port

**Priority:** P0 · **Depends:** TASK-068 · **Status:** DONE

#### Objetivo

Definir el port de colaboración realtime.

#### Alcance

- Suscripción a cambios.
- Publicación de cambios locales.
- Lifecycle y cleanup.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [x] Application usa realtime mediante port.
- [x] No se expone Firestore a Presentation.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-077 — Firestore realtime adapter

**Priority:** P0 · **Depends:** TASK-076 · **Status:** DONE

#### Objetivo

Completar **Firestore realtime adapter** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Firestore realtime adapter**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] No se crean listeners duplicados.

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

**Priority:** P0 · **Depends:** TASK-077 · **Status:** DONE

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

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] La interacción representa correctamente posición, tamaño y estado relevante.
- [x] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-079 — Optimistic updates

**Priority:** P0 · **Depends:** TASK-078 · **Status:** DONE

#### Objetivo

Aplicar cambios locales de forma optimista y revertirlos de forma determinista si la persistencia falla, sin pisar cambios remotos más nuevos.

#### Alcance

- Implementar el comportamiento necesario para **Optimistic updates**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Rollback por elemento (modificado/creado/borrado) con guard monótono `updatedAt` y descarte de pendientes tras el fallo.

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

### TASK-080 — Reconnect handling

**Priority:** P0 · **Depends:** TASK-078 · **Status:** DONE

#### Objetivo

Completar **Reconnect handling** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Reconnect handling**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-081 — Conflict strategy

**Priority:** P0 · **Depends:** TASK-078 · **Status:** DONE

#### Objetivo

Definir e implementar la estrategia de consistencia para cambios concurrentes.

#### Alcance

- Optimistic local updates.
- Last-write-wins para propiedades simples cuando sea adecuado.
- Reglas para operaciones independientes por elemento.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [x] La estrategia está documentada.
- [x] Los conflictos previsibles son deterministas.
- [x] No se introduce CRDT.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-082 — Presence port/model

**Priority:** P0 · **Depends:** TASK-076 · **Status:** DONE

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

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] No se crean listeners duplicados.
- [x] La presencia no modifica ni bloquea el documento persistido.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-083 — Connected users

**Priority:** P0 · **Depends:** TASK-082 · **Status:** DONE

#### Objetivo

Completar **Connected users** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Connected users**.
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

### TASK-084 — Remote cursors

**Priority:** P1 · **Depends:** TASK-082, TASK-028 · **Status:** DONE

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

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] No se crean listeners duplicados.
- [x] La presencia no modifica ni bloquea el documento persistido.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.

### TASK-085 — Presence cleanup

**Priority:** P0 · **Depends:** TASK-083 · **Status:** DONE

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

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] No se crean listeners duplicados.
- [x] La presencia no modifica ni bloquea el documento persistido.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-086 — Remote create/delete

**Priority:** P0 · **Depends:** TASK-078 · **Status:** DONE

#### Objetivo

Completar **Remote create/delete** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Remote create/delete**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-087 — Remote move/resize

**Priority:** P0 · **Depends:** TASK-078 · **Status:** DONE

#### Objetivo

Completar **Remote move/resize** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Remote move/resize**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] No se crean listeners duplicados.

#### Fuera de alcance

- No ampliar el alcance más allá de lo descrito en esta tarea.
- No introducir CRDT ni offline-first completo.

#### Constraints técnicos

- Domain no importa React, Firebase, styled-components, `@raulrod/ui` ni APIs del navegador.
- Application depende de ports, no de implementaciones concretas.
- Infrastructure contiene adapters concretos.
- Presentation concentra React, UI y composición de dependencias.

### TASK-088 — Local history vs remote changes

**Priority:** P0 · **Depends:** TASK-065, TASK-078 · **Status:** DONE

#### Objetivo

Completar **Local history vs remote changes** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Local history vs remote changes**.
- Integrarlo con las capas existentes sin romper sus límites.
- Añadir o actualizar tests relevantes.
- Gestionar lifecycle y cleanup de suscripciones.
- Distinguir cambios locales y remotos cuando sea necesario.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Undo/redo no corrompe el estado ante secuencias válidas.
- [x] No se crean listeners duplicados.

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

**Priority:** P0 · **Depends:** TASK-016 · **Status:** DONE

#### Objetivo

Completar **Membership repository port** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Membership repository port**.
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

**Priority:** P0 · **Depends:** TASK-089 · **Status:** DONE

#### Objetivo

Completar **Firestore membership repository** dejando un resultado verificable y apto para las tareas dependientes.

#### Alcance

- Implementar el comportamiento necesario para **Firestore membership repository**.
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

**Priority:** P0 · **Depends:** TASK-090 · **Status:** DONE

#### Objetivo

Al crear un workspace desde la app, el usuario que lo crea queda registrado como **owner** mediante el `MembershipRepository`, dejando el flujo reproducible y sin workspaces huérfanos.

#### Alcance

- `createCreateOwnerMembership(membershipRepository)` (`src/application/commands/create-owner-membership.ts`): crea la membership con `role: 'owner'` para `(userId, workspaceId)` y normaliza errores con `toAppError`.
- `createCreateWorkspaceWithOwner({ workspaceRepository, createOwnerMembership })` (`src/application/commands/create-workspace-with-owner.ts`): compone validación (reusa `validateCreateWorkspaceInput`) + creación del workspace + membership de owner.
- Compensación best-effort: si falla la membership tras persistir el workspace, se borra el workspace y se devuelve el error original; si el borrado también falla, el error se anota con `details.workspaceRollbackFailed: true`.
- Wiring: `workspace-services` expone `createWorkspaceWithOwner` (con `createFirebaseWorkspaceRepository` + `createFirebaseMembershipRepository`); `App.tsx`, `app-routes` y `WorkspacesPage` derivan el `ownerId` de la sesión y adaptan el contrato del `CreateWorkspaceDialog` (sin cambios en el dialog).

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito (conflicto de membership y fallo de compensación).
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.

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

**Priority:** P0 · **Depends:** TASK-090 · **Status:** DONE

#### Objetivo

Permitir invitar a un colaborador por email creando una **invitación pendiente** desacoplada de la membership, con token de un solo uso persistido hasheado, sin conceder acceso hasta su aceptación (TASK-094).

#### Alcance

- Dominio `Invitation` (`src/domain/invitation/`) + `InvitationStatus` (`pending`/`accepted`/`revoked`) + `InvitationId` (`src/domain/shared/value-objects/invitation-id.ts`). Normaliza y valida el email, valida rol/token/timestamps, deriva la expiración (`isExpired`) y expone transiciones inmutables `accept`/`revoke`.
- Port `InvitationRepository` (`src/application/ports/invitation-repository.ts`): `create`, `findByTokenHash`, `listPendingByWorkspace`, `updateStatus`. `create` rechaza con `conflict/INVITATION_ALREADY_EXISTS` ante invitación pendiente duplicada o id repetido; `updateStatus` rechaza con `notFound` sobre inexistente.
- Code `INVITATION_ALREADY_EXISTS: 'invitation/already-exists'` (kind `conflict`) en `src/shared/errors/app-error.ts`.
- Use case `createInviteMember(deps)` (`src/application/commands/invite-member.ts`): valida email/rol, construye la entidad con `generateId`/`now`/`ttlMs` (TTL por defecto 7 días) y token vía `issueToken()` inyectado; persiste solo `tokenHash` y devuelve el token en claro una sola vez.
- `FakeInvitationRepository` + contrato ejecutable (`src/test/fixtures/fake-invitation-repository.ts`, `src/test/contract/invitation-repository-contract.ts`) y tests unitarios de dominio y caso de uso.
- ADR nuevo: `docs/adr/0018-invitation-model.md`.

#### Criterios de aceptación

- [x] El comportamiento definido por el objetivo está implementado y reproducible.
- [x] Las dependencias de la tarea se respetan.
- [x] Los errores previsibles tienen comportamiento explícito.
- [x] Los tests relevantes pasan sin regresiones.
- [x] TypeScript strict, Oxlint y Prettier no reportan errores.
- [x] Puede probarse con ports fake sin Firebase.

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

## 2026-10-09 — TASK-034

- Resultado: Multi-selection de punta a punta y desacoplada de la persistencia. En Application (React-free): `SelectionSnapshot` pasa a `{ selectedIds: readonly string[] }` y el store gana `select(id)` (reemplaza), `toggle(id)` (añade/quita) y conserva `clear()`/`getSnapshot`/`subscribe`, con igualdad por pertenencia (orden-insensible), referencia de snapshot estable para `useSyncExternalStore` y no-op silencioso ante cambio nulo. En Presentation: `useSelection` amplía su callback a `onSelect(id, additive)` y calcula `additive` desde `shiftKey || metaKey || ctrlKey`; `SelectionOverlay` acepta una lista de ítems y dibuja la caja envolvente (`Bounds.union`) con `data-selection-count`/`data-selected-ids`, mostrando los 8 handles solo cuando hay un único ítem; `Canvas` cablea el `onSelect` al store (`null` → `clear`, modificador → `toggle`, resto → `select`) y marca `data-selected` por nodo vía `Set`. El hit-test (`findSelectableAt`) y pan/zoom no se tocan.
- Tests/quality gates: 525 tests pasan (50 suites, +11: reescritura de los 7 de `selection-store` a conjunto, 3 nuevos de modificador en `useSelection` y 4 de multiselección en `canvas` —añadir, quitar, limpiar con modificador en vacío y caja envolvente sin handles—); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente). Smoke manual con `npm run dev` pendiente.
- Decisiones: (1) modificador `Shift` y `Ctrl/Cmd` (cualquiera) para toggle aditivo; (2) representación por caja envolvente con handles solo con 1 ítem, dejando el resize de grupo a TASK-058; (3) el clic (con o sin modificador) en espacio vacío siempre limpia la selección por previsibilidad; (4) la semántica de selección (`select`/`toggle`) vive en el store de Application y el modificador se resuelve en Presentation, sin acoplar el store al DOM; (5) sin ADR por ser una decisión local de interacción.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-035 (Drag selection).

## 2026-10-09 — TASK-035

- Resultado: Drag selection (marquee) de punta a punta y desacoplada de la persistencia. En Application (React-free): `findSelectablesInBounds(items, worldBounds)` en `src/application/services/canvas-hit-test.ts` (preserva el orden de entrada y usa `Bounds.intersects`) y el `SelectionStore` gana `selectMany(ids)` (reemplaza, dedupe por `Set`, no-op ante conjunto igual) y `addMany(ids)` (unión sin duplicados). En Presentation: nuevo hook `useSpacePressed` (keydown/keyup/blur en `window`, ignora `event.repeat` y targets editables, `preventDefault`); nuevo hook `useDragSelection` (listener en el contenedor, umbral `DRAG_SELECTION_THRESHOLD = 4`, rect en coords pantalla normalizado a `Bounds.fromXYWH(via screenToWorld)`, `onSelect(ids, additive)`/`onClear`, ignora presses con Space o iniciados sobre `[data-selectable]`/interactivos o con hit de ítem, `pointercancel` cancela sin commit y devuelve `{ rect, ref }`); `useSelection` mantiene `onSelect(id, additive)` pero solo actúa cuando hay hit (el vacío pasa a `onDragSelection`); `usePan` se re-bindea a **Space+drag** y **botón central** y añade **pan con rueda plana** (ctrl/meta sigue siendo zoom), eliminando su antiguo guard `[data-selectable]`; `Canvas` cablea los cuatro hooks (pan, zoom, selection, drag-selection), pinta `<Marquee data-testid="drag-selection-rect">`, expone `data-pan-key`/`data-selecting` y actualiza el hint a `Drag to select · Space + drag to pan · Ctrl/Cmd + scroll to zoom`.
- Tests/quality gates: 564 tests pasan (52 suites, +39: 6 de `findSelectablesInBounds`, 6 de `selectMany`/`addMany` en `selection-store`, 5 de `useSpacePressed`, ~14 de `useDragSelection`, reescritura de pan a space/middle/wheel y de selección a hit-only, y 4 nuevos de integración del marquee en `canvas`); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente). Smoke manual con `npm run dev` pendiente.
- Decisiones: (1) **drag plano = marquee** y el pan pasa a **Space+drag**, **botón central** y **rueda plana** (antes el wheel plano era no-op); `Ctrl/Cmd+wheel` sigue siendo zoom — cambio de binding sin ADR por precedente local (TASK-029/030/031/033/034); (2) el módulo de marquee es aditivo con `Shift`/`Ctrl`/`Cmd` y usa **unión** (`addMany`), mientras el rect no aditivo **reemplaza** (`selectMany`); (3) un click (con o sin modificador) en vacío siempre limpia, de modo que `useSelection` delega el manejo del vacío al marquee; (4) la selección es estado efímero de interacción en Application (mismo patrón que el viewport), no dominio ni persistencia; (5) la semántica de conjuntos vive en el store y el modificador se resuelve en Presentation; (6) sin ADR por ser una decisión local de interacción.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-036 (Selection keyboard interactions).

## 2026-10-09 — TASK-036

- Resultado: Selection keyboard interactions de punta a punta y desacopladas de la persistencia. En Application (React-free): `resolveSelectionKeyCommand({ key, ctrlKey, metaKey, altKey })` en `src/application/services/selection-keyboard.ts` con `SelectionKeyCommand = 'clear' | 'select-all' | null` (Escape → clear; Ctrl/Cmd+A case-insensitive → select-all; Alt desactiva el atajo). En Presentation: hook `useSelectionKeyboard` en `src/presentation/canvas/hooks/use-selection-keyboard.ts` (listener `keydown` en el contenedor, no en `window`, con `latestRef` para no re-registrar; ignora `event.repeat` y targets editables; `preventDefault()` al resolver comando; cleanup al desmontar) que emite `onClear`/`onSelectAll(allIds)`. `Canvas` pasa a ser focusable (`tabIndex={0}`, ya tenía `role="application"`), añade `aria-keyshortcuts="Escape Control+A Meta+A"`, outline de `:focus-visible`, cablea el hook (`allIds`, `clear`, `selectMany`) y amplía el hint con "Esc to clear · Ctrl/Cmd + A to select all".
- Tests/quality gates: 586 tests pasan (54 suites, +22: 7 de `resolveSelectionKeyCommand`, 10 de `useSelectionKeyboard` y 5 de integración en `canvas` —focusable/aria, Escape limpia con foco en el canvas, Ctrl+A y Cmd+A seleccionan todo, e ignora comandos sin foco—); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente). Smoke manual con `npm run dev` pendiente.
- Decisiones: (1) alcance de teclado limitado a comandos de selección a nivel de canvas (Escape/select-all); la navegación con flechas y el foco por ítem se difieren a TASK-109 (Keyboard navigation) y TASK-110 (Focus management) para no duplicar alcance; (2) la semántica tecla→comando vive en Application (testeable sin React/DOM) y la detección de target editable/DOM en Presentation, coherente con TASK-029→035; (3) listener en el contenedor en vez de `window` para no interferir con formularios y exigir foco en el canvas (a diferencia de `useSpacePressed`, que sí es global); (4) `preventDefault` de Ctrl/Cmd+A evita el "seleccionar todo" del navegador; (5) sin ADR por ser una decisión local de interacción.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-037 (BaseElement).

## 2026-10-10 — TASK-044

- Resultado: CreateElement command en Application (React/Firebase-free). `createCreateElement({ generateId, now? })` en `src/application/commands/create-element.ts` recibe un `CreateElementInput` (unión discriminada por `type` con campos compartidos `workspaceId/createdBy/position/size/rotation?` y específicos por tipo) y devuelve `CreateElementResult = ok | error`; genera el `ElementId` y los timestamps vía deps inyectadas y delega la construcción/invariantes en las factories de dominio (`createTextElement`…`createLinkElement`), sin duplicar validación. Los `Error` de dominio se traducen a `AppError` de kind `validation` (`VALIDATION_INVALID_INPUT`) con `cause`. Exportado en `src/application/commands/index.ts`. Sin wiring de UI (llega con TASK-050+) ni persistencia (TASK-068+).
- Tests/quality gates: 711 tests pasan (62 suites, +17 en `src/test/unit/application/commands/create-element.test.ts`: creación de los 6 tipos, id/metadatos deterministas, defaults de dominio, payloads inválidos → error de validación sin excepción cruda, inmutabilidad del input, estatelessness y reversibilidad create→delete por id); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) el id se inyecta como dependencia (`generateId: () => ElementId`) en vez de usar `crypto.randomUUID()` en Application — mantiene el comando puro y testeable de forma determinista, coherente con el patrón factory+DI y con ADR-0005 ("el id lo genera el adapter", aquí diferido a la composición); (2) la validación vive en el dominio: el comando solo traduce sus `Error` a `validation`/`VALIDATION_INVALID_INPUT`, sin duplicar invariantes ni introducir `fieldErrors` (no hay flujo de formulario); (3) la reversibilidad (history/undo) se difiere a la interfaz `Command` de TASK-063 y al manager de TASK-064, dejando constancia en tests de que la inversa de un create es un delete por id; (4) sin ADR por ser una decisión local que sigue el patrón ya establecido.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-045 (UpdateElement command).

## 2026-10-10 — TASK-045

- Resultado: UpdateElement command en Application (React/Firebase-free). `createUpdateElement({ now? })` en `src/application/commands/update-element.ts` recibe un `UpdateElementInput` (unión discriminada por `type` con `element` + patch por tipo) y devuelve `UpdateElementResult = ok | error`; aplica los factories `withX` de dominio ya existentes (content, color, title, status, assignee, dueDate, parentFrameId, endpoints, url) y un nuevo helper puro `withRotation` en el dominio, con un único `updatedAt` derivado de `now`. `null` en campos opcionales limpia (task.assigneeId/dueDate, frame.parentFrameId, link.title). El helper `toValidationAppError` se extrajo a `src/application/commands/to-validation-app-error.ts` y `create-element.ts` pasa a reutilizarlo. Exportado en `src/application/commands/index.ts`.
- Tests/quality gates: 732 tests pasan (63 suites, +21: 18 de `update-element.test.ts` y 5 de `withRotation` en `element-types.test.ts`); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) el comando es puro y recibe el elemento actual, devolviendo el elemento actualizado, para que el historial (TASK-064+) capture el estado previo sin acoplarse a persistencia; (2) la actualización genérica incluye `rotation` (no hay tarea dedicada a rotar) mediante `withRotation`, que valida finitud y revalida el elemento; `position`/`size` se difieren a TASK-046 (Move) y TASK-047 (Resize); (3) el patch se tipa por discriminante y un desajuste `input.type !== element.type` así como un patch vacío son errores de validación explícitos, igual que los `Error` de dominio traducidos a `validation`/`VALIDATION_INVALID_INPUT`; (4) `null` se usa como "limpiar" y `undefined` como "sin cambio", explícito en la unión; (5) sin ADR por seguir el patrón local ya establecido en TASK-044.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-046 (MoveElement command).

## 2026-10-10 — TASK-046

- Resultado: MoveElement command en Application (React/Firebase-free). Nuevo helper puro `withPosition(element, position, updatedAt?)` en `src/domain/element/element-types.ts` (gemelo de `withRotation`: spread inmutable de `{ position, updatedAt }`, valida finitud de coordenadas y revalida el elemento con `validateElement`). `createMoveElement({ now? })` en `src/application/commands/move-element.ts` recibe `MoveElementInput { element, position }` (posición **absoluta** de destino) y devuelve `MoveElementResult = ok | error`; calcula `updatedAt` desde el reloj inyectado y delega la mutación en `withPosition`. Los `Error` de dominio se traducen a `AppError` de kind `validation` (`VALIDATION_INVALID_INPUT`) con `cause`, reutilizando `toValidationAppError`. Exportado en `src/application/commands/index.ts`. Sin wiring de UI (llega con TASK-057) ni persistencia (TASK-068+).
- Tests/quality gates: 746 tests pasan (64 suites, +14: 4 de `withPosition` en `element-types.test.ts` y 10 de `move-element.test.ts` —movimiento de los 6 tipos preservando campos específicos, `updatedAt` determinista preservando `createdAt`, fallback a reloj real, posición inválida y fallo de dominio → error de validación sin excepción cruda, inmutabilidad del input/elemento, estatelessness, reversibilidad move↔move-back para undo/redo—); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) la posición se expresa como **destino absoluto** (no delta), alineada con la estrategia last-write-wins de TASK-081 y con la actualización parcial de la propiedad `position` en persistencia; la inversa para undo es la posición previa y no depende de un estado base posiblemente desactualizado; (2) `withPosition` vive en el dominio junto a `withRotation` (misma firma y revalidación) para no duplicar invariantes en Application; (3) el comando es puro, recibe el elemento actual y el reloj por DI, de modo que el historial (TASK-064+) capture el estado previo sin acoplarse a persistencia; (4) sin ADR por seguir el patrón local ya establecido en TASK-044/TASK-045.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-047 (ResizeElement command).

## 2026-10-10 — TASK-047

- Resultado: ResizeElement command en Application (React/Firebase-free). Nuevo helper puro `withSize(element, size, updatedAt?)` en `src/domain/element/element-types.ts` (gemelo de `withRotation`/`withPosition`: spread inmutable de `{ size, updatedAt }`, valida finitud de `width`/`height` y revalida el elemento con `validateElement`). `createResizeElement({ now? })` en `src/application/commands/resize-element.ts` recibe `ResizeElementInput { element, size }` (tamaño **absoluto**, `Size` VO) y devuelve `ResizeElementResult = ok | error`; calcula `updatedAt` desde el reloj inyectado y delega la mutación en `withSize`. Los `Error` de dominio se traducen a `AppError` de kind `validation` (`VALIDATION_INVALID_INPUT`) con `cause`, reutilizando `toValidationAppError`. Exportado en `src/application/commands/index.ts`. Sin wiring de UI (llega con TASK-058) ni persistencia (TASK-068+).
- Tests/quality gates: 762 tests pasan (65 suites, +16: 5 de `withSize` en `element-types.test.ts` y 11 de `resize-element.test.ts` —resize de los 6 tipos preservando campos específicos, invariabilidad de la posición, `updatedAt` determinista preservando `createdAt`, fallback a reloj real, tamaño inválido y fallo de dominio → error de validación sin excepción cruda, inmutabilidad del input/elemento, estatelessness, reversibilidad resize↔resize-back para undo/redo—); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) el tamaño se expresa como **absoluto** (no delta ni acoplamiento de posición), gemelo de `MoveElement`; el resize desde handles que desplazan el ancla se compone con `MoveElement` en la capa de interacción (TASK-058) para no introducir una combinación especulativa en Application; (2) `withSize` vive en el dominio junto a `withRotation`/`withPosition` (misma firma y revalidación) para no duplicar invariantes; (3) el comando es puro, recibe el elemento actual y el reloj por DI, de modo que el historial (TASK-064+) capture el estado previo sin acoplarse a persistencia; (4) sin ADR por seguir el patrón local ya establecido en TASK-044/TASK-045/TASK-046.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-048 (DeleteElement command).

## 2026-10-10 — TASK-048

- Resultado: DeleteElement command en Application (React/Firebase-free). `createDeleteElement()` en `src/application/commands/delete-element.ts` recibe `DeleteElementInput { element }` y devuelve `DeleteElementResult = ok | error`; valida el elemento con `validateElement` del dominio y lo devuelve como payload de undo (re-inserción), sin acoplarse a persistencia. Los `Error` de dominio se traducen a `AppError` de kind `validation` (`VALIDATION_INVALID_INPUT`) con `cause`, reutilizando `toValidationAppError`. Exportado en `src/application/commands/index.ts`. Sin wiring de UI (llega con TASK-059) ni persistencia (TASK-068+).
- Tests/quality gates: 769 tests pasan (66 suites, +7 en `src/test/unit/application/commands/delete-element.test.ts`: aceptación de los 6 tipos devolviendo el elemento como payload, preservación de campos específicos, elemento inválido → error de validación sin excepción cruda, inmutabilidad del input/elemento, estatelessness, undo de un create por id y redo sobre el elemento restaurado); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) contrato **por elemento** (no por id sobre colección) para ser simétrico con Create/Move/Resize/Update y no introducir una abstracción de colección antes de que el dominio/persistencia la definan (TASK-068+); (2) el comando devuelve el elemento eliminado como payload, de modo que la inversa (restaurarlo) es exactamente el create existente y undo/redo no necesita estado extra; (3) sin dependencias inyectadas: una eliminación no genera timestamps, así que no hay reloj; (4) sin ADR por seguir el patrón local ya establecido en TASK-044→047.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-049 (DuplicateElement command).

## 2026-10-10 — TASK-049

- Resultado: DuplicateElement command en Application (React/Firebase-free). Nuevo helper puro `duplicateElement(source, { id, createdAt, updatedAt?, position? })` en `src/domain/element/element-types.ts` (gemelo de `withPosition`/`withSize`): valida el origen con `validateElement` **antes** de sobrescribir metadatos, aplica spread inmutable sobre `{ ...source }` reemplazando `id`/`createdAt`/`updatedAt` y, si se provee, `position` (default = posición del origen), y revalida la copia. Al ser unión discriminada, el spread conserva el tipo concreto y sus campos específicos. `createDuplicateElement({ generateId, now? })` en `src/application/commands/duplicate-element.ts` recibe `DuplicateElementInput { element, position? }` (posición **absoluta** opcional), genera `id` y `createdAt = updatedAt` vía deps inyectadas, delega en `duplicateElement` y traduce errores con `toValidationAppError`. Exportado en `src/application/commands/index.ts`. Sin wiring de UI (llega con TASK-060) ni persistencia (TASK-068+).
- Tests/quality gates: 790 tests pasan (67 suites, +21: 10 de `duplicateElement` en `element-types.test.ts` y 11 de `duplicate-element.test.ts` —duplicación de los 6 tipos con id/timestamps nuevos, preservación de metadatos compartidos y campos específicos, endpoints intactos al duplicar un connector, `position` opcional absoluta, fallback a reloj real, ids distintos por invocación, elemento origen inválido → error de validación sin excepción cruda, inmutabilidad input/origen, estatelessness y reversibilidad undo/redo por id—); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) `position` **opcional** con default = posición del origen, de modo que la convención de offset visual quede en la UI (TASK-060) y el comando permanezca puro, coherente con `MoveElement` (posición absoluta); (2) duplicar es una operación **por elemento** y conserva los endpoints de un `Connector` (el remapeo multi-elemento es TASK-061 Copy/paste); (3) el helper de dominio **valida el origen antes** de sobrescribir `createdAt`/`updatedAt`, para no "sanar" un elemento corrupto al copiarlo; (4) el comando es puro, con `generateId`/`now` por DI, para que el historial (TASK-064+) capture la copia sin acoplarse a persistencia; (5) sin ADR por seguir el patrón local ya establecido en TASK-044→048.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-050 (Canvas rendering abstraction).

## 2026-10-10 — TASK-051

- Resultado: Text renderer implementado sobre la abstracción de TASK-050. Nuevo `TextRenderer` en `src/presentation/canvas/renderers/text-renderer.tsx` que cumple el contrato `ElementRenderer` (`{ element, selected }` → `ReactElement | null`), estrecha la unión con `isTextElement` y devuelve `null` ante elementos no-text (sin casts). El contenido se pinta en un `styled.div` con `position:absolute; inset:0`, `white-space:pre-wrap`, `word-break:break-word` y token `var(--rr-color-text-default)`, preservando saltos de línea y espacios; contenido vacío renderiza sin placeholder (la edición llega con una tarea futura). Exportado en el barrel `renderers/index.ts`. `ElementView` sigue aportando posición, tamaño, rotación y atributos de interacción, así que el renderer solo aporta contenido.
- Tests/quality gates: 807 tests pasan (70 suites, +6 en `src/test/unit/presentation/canvas/renderers/text-renderer.test.tsx`: render del contenido, atributo `data-element-content`, preservación de espacios/saltos, contenido vacío sin romper, `null` ante un `NoteElement` y delegación real vía `ElementView` con `renderers={{ text: TextRenderer }}` sin fallback); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) el renderer es de presentación pura y defensivo ante el tipo ancho `Element` (`null` en vez de cast), coherente con `resolveElementRenderer`; (2) contenido vacío sin placeholder textual para no introducir UI de edición fuera de alcance; (3) sin registro central ni wiring en `Canvas` todavía — el `ElementRendererRegistry` es opcional y los elementos no se cargan hasta TASK-070, de modo que añadir un registro ahora sería una abstracción especulativa; (4) sin ADR por ser una decisión local de presentación.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-052 (Note renderer).

## 2026-10-11 — TASK-054

- Resultado: Frame renderer implementado sobre la abstracción de TASK-050. Nuevo `FrameRenderer` en `src/presentation/canvas/renderers/frame-renderer.tsx` que cumple el contrato `ElementRenderer`, estrecha la unión con `isFrameElement` y devuelve `null` ante elementos no-frame (sin casts). Renderiza el `title` en una cabecera destacada sobre un contenedor con borde punteado (`--rr-color-border-default`) y fondo sutil (`--rr-color-background-subtle`), tokens `--rr-*` coherentes con los demás renderers; `position/size/rotation` y atributos de interacción siguen viniendo de `ElementView`, así que el renderer solo aporta contenido. `parentFrameId` no tiene representación visual (sin UI de anidación en el MVP). Exportado en `renderers/index.ts`.
- Tests/quality gates: 830 tests pasan (73 suites, +6 en `src/test/unit/presentation/canvas/renderers/frame-renderer.test.tsx`: render del título, atributo `data-element-content`/`data-element-type=frame`, nodo `[data-frame-title]`, frame con `parentFrameId` sin romper, `null` ante un `TextElement` y delegación real vía `ElementView` con `renderers={{ frame: FrameRenderer }}` sin fallback); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) estética de "contenedor" (cabecera + borde punteado) confirmada con el usuario, sin copiar branding de Miro; (2) `parentFrameId` no se renderiza: la anidación/agrupación es tarea futura y mostrar el id crudo sería ruido visual; (3) sin registro central ni wiring en `Canvas` (los elementos no se cargan hasta TASK-070), coherente con TASK-051→053; (4) sin ADR por ser una decisión local de presentación.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-055 (Connector renderer).

## 2026-10-11 — TASK-056

- Resultado: Link renderer implementado sobre la abstracción de TASK-050. Nuevo `LinkRenderer` en `src/presentation/canvas/renderers/link-renderer.tsx` que cumple el contrato `ElementRenderer`, estrecha la unión con `isLinkElement` y devuelve `null` ante elementos no-link (sin casts). Renderiza el `title` (solo si está presente) como titular destacado y el `url` como texto no interactivo (sin `<a>`), sobre un contenedor con tokens `--rr-*` (`--rr-color-background-default`, `--rr-color-text-default`, `--rr-color-link-default`, `--rr-font-size-200`, `--rr-radius-100`) y `overflow-wrap:anywhere` para urls largas; `position/size/rotation` y atributos de interacción siguen viniendo de `ElementView`, así que el renderer solo aporta contenido. Atributos de test `data-element-content`, `data-element-type="link"`, `data-link-url` y `data-link-title`. Exportado en `renderers/index.ts`.
- Tests/quality gates: 842 tests pasan (75 suites, +6 en `src/test/unit/presentation/canvas/renderers/link-renderer.test.tsx`: render del url, título presente/ausente, atributos `data-*`, `null` ante un `TextElement` y delegación real vía `ElementView` con `renderers={{ link: LinkRenderer }}` sin fallback); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) el renderer es **solo visual** (sin `<a>`) confirmado con el usuario: evita XSS vía esquemas peligrosos (`javascript:`) sin introducir validación/sanitización especulativa, y la apertura del enlace no está en el backlog; (2) `title` opcional se omite cuando está ausente (el campo puede no existir en el objeto, patrón del dominio), coherente con TASK-053; (3) sin registro central ni wiring en `Canvas` (los elementos no se cargan hasta TASK-070), coherente con TASK-051→055; (4) sin ADR por ser una decisión local de presentación.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-058 (Resize elements).

## 2026-10-11 — TASK-057

- Resultado: **Move elements** completado con interacción controlada por callback, desacoplada de persistencia (llega en TASK-068+). En Application, `src/application/services/element-move.ts`: `resolveMoveIds(hitId, selectedIds)` devuelve la selección completa si el elemento pulsado está seleccionado, o solo el id pulsado si no; `moveElementsByDelta(elements, ids, delta, { now? })` aplica un delta de mundo **absoluto** desde la línea base capturada en el `pointerdown` (idempotente por diseño), delega la mutación en `createMoveElement`/`withPosition`, preserva el orden y el resto de elementos y devuelve `ok | error` (traduciendo validaciones a `AppError`). Exportado en `services/index.ts`.
- En Presentation, `src/presentation/canvas/hooks/use-element-move.ts`: arrastre con umbral `DRAG_SELECTION_THRESHOLD` (4px) reutilizado, `setPointerCapture`, baseline capturada al pulsar (evita acumulación), conversión con `Viewport.screenToWorld`, respeto a gestos aditivos (Shift/Cmd/Ctrl), botón central, `isInteractiveTarget` y `spacePressed` (cede el turno a pan); expone `{ isMoving, ref }` y emite `onMoveElements(elements)` solo cuando el callback existe (Canvas controlado, sin store de elementos). Sin arrastre → `onSelectOnly(id)` en el `pointerup` para colapsar la selección. Exportado en `hooks/index.ts` y cableado en `Canvas` vía prop `onMoveElements?`: `handleSelect` difiere el colapso cuando se pulsa un item ya seleccionado, `data-moving` + cursor `grabbing`, y `elementMoveRef` compartido en `setContainerRef`.
- Decisiones confirmadas con el usuario tras revisar el backlog: (1) Canvas controlado por callback (`onMoveElements`) + helper puro en Application, sin store nuevo de elementos (el board store llega en TASK-070/072); (2) el arrastre mueve **toda la multiselección** y un click sin arrastre colapsa la selección al item pulsado; (3) la semántica de tolerancia de drag/re-selección (Espacio, modificadores) se propaga de TASK-046/051.
- Tests/quality gates: +36 casos netos → `element-move.test.ts` (12) en `src/test/unit/application/services/`, `use-element-move.test.tsx` (11) en `src/test/unit/presentation/canvas/hooks/` y 3 casos de integración en `canvas.test.tsx` (move simple con `data-moving`, colapso de multiselección por click y arrastre de selección completa sin perderla); 866 tests pasan (77 suites). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Bloqueos: ninguno.
- Siguiente tarea: TASK-058 (Resize elements).

## 2026-10-11 — TASK-060

- Resultado: **Duplicate elements** de punta a punta y desacoplado de la persistencia (llega en TASK-068+). En Application, `src/application/services/element-duplicate.ts`: `DEFAULT_DUPLICATE_OFFSET = Position.create(16, 16)`, `DuplicateElementsDeps { generateId, now?, offset? }` y `duplicateElements(elements, ids, deps)` → `{ status:'ok', elements, duplicatedIds } | { status:'error', error }`; recorre los elementos en orden, delega cada copia en `createDuplicateElement` (TASK-049) con `position = origen + offset` (offset inyectable, default 16px), concatena las copias al final sin mutar la entrada y traduce errores de dominio a `validation`/`VALIDATION_INVALID_INPUT`. `SelectionKeyCommand` se amplía con `'duplicate'` resuelto por `Ctrl/Cmd + D` (case-insensitive, `Alt` lo desactiva) en `selection-keyboard.ts`. Exportado en `services/index.ts`.
- En Presentation, `src/presentation/canvas/hooks/use-element-duplicate.ts` (espejo de `use-element-delete.ts`): listener `keydown` en el contenedor, `latestRef`, ignora `event.repeat` y targets editables; sin selección, sin `generateId` o sin callback es inerte y no llama a `preventDefault`. `use-selection-keyboard.ts` ignora también `'duplicate'` (no limpia la selección con Ctrl/Cmd+D). `Canvas` gana `onDuplicateElements?(elements, duplicatedIds)` y `generateId?()`, cablea `elementDuplicateRef` en `setContainerRef`, y al completar la duplicación auto-selecciona las copias vía `selectionStore.selectMany(duplicatedIds)`; `aria-keyshortcuts` y el hint incorporan el atajo. Exportado en `hooks/index.ts`.
- Tests/quality gates: 950 tests pasan (84 suites, +33: 9 de `duplicateElements` en `src/test/unit/application/services/element-duplicate.test.ts` —duplicado simple y múltiple preservando orden, offset por defecto y custom, lista vacía/sin match, inmutabilidad, timestamps del reloj inyectado, ids distintos por invocación y origen inválido → error de validación—; 14 de `useElementDuplicate`; 6 de `resolveSelectionKeyCommand`; 1 de `useSelectionKeyboard`; 3 de integración en `canvas.test.tsx` —atajo, multiselección y auto-selección de copias, y no-op sin selección—). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) el disparador es `Ctrl/Cmd + D`, simétrico con el `Delete` de TASK-059, sin introducir todavía la capa centralizada de atajos (TASK-062); (2) las copias se **auto-seleccionan**: el servicio devuelve `duplicatedIds` y el owner de la selección sigue siendo el `SelectionStore`, sin moverlo a Application; (3) el offset visual fijo `(16,16)` vive en Application/Presentation, honrando la decisión de TASK-049 ("la convención de offset visual quede en la UI") sin tocar el comando puro; (4) `generateId` y `onDuplicateElements` son opcionales: sin ellos el atajo queda inerte, coherente con el patrón de callbacks controlados de TASK-057→059 (la carga real de elementos y su composición llegan en TASK-070+); (5) sin ADR por seguir el patrón local ya establecido en TASK-057→059.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-061 (Copy/paste).

## 2026-10-11 — TASK-066

- Resultado: Redo expuesto de punta a punta sobre el motor que ya existía en TASK-064 (`CommandHistory.redo()`/`canRedo()`), sin lógica nueva en el manager. En Application, `resolveSelectionKeyCommand` (`src/application/services/selection-keyboard.ts`) amplía `SelectionKeyCommand` con `'redo'` y lo resuelve con **Ctrl/Cmd + Shift + Z** y **Ctrl/Cmd + Y** (`Alt` desactiva ambos, `z` sin shift sigue siendo `undo`). En Presentation, nuevo hook `src/presentation/canvas/hooks/use-element-redo.ts` espejo de `use-element-undo.ts` (listener `keydown` en el contenedor, `latestRef`, ignora `event.repeat`/targets editables, guarda `command !== 'redo'`, comprueba `history.canRedo()`, `preventDefault()` y emite `onRedoElements(result.state)` solo en `ok`, cleanup al desmontar); `use-selection-keyboard.ts` añade `'redo'` a la lista de comandos ignorados; `canvas.tsx` gana la prop `onRedoElements?`, cablea `elementRedoRef` en `setContainerRef` y amplía `aria-keyshortcuts` (`Control+Shift+Z Meta+Shift+Z Control+Y Meta+Y`) y el hint ("Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo"); exportado en `hooks/index.ts`. Sin wiring en `WorkspaceShell*` (paridad con TASK-065: no hay store de elementos hasta TASK-070+).
- Tests/quality gates: 1048 tests pasan (91 suites, +8 netos tras reconciliar los 2 preexistentes de hint/`aria-keyshortcuts`: reescritura del caso "Shift ignorado" y 8 nuevos en `selection-keyboard.test.ts` —Ctrl/Cmd+Shift+Z, mayúscula, Ctrl/Cmd+Y, `Shift+Z` sin modificador y `Alt`—, 12 de `use-element-redo.test.tsx` —Ctrl/Cmd+Shift+Z, Ctrl+Y, nada que rehacer, `preventDefault` solo cuando aplica, keydown repetido, target editable, `disabled`, sin history, no-op y cleanup— y 4 de integración en el `describe('redo')` de `canvas.test.tsx`). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) redo se apoya en `CommandHistory.redo()` (que **re-ejecuta** el comando) y reutiliza el patrón de callback controlado de TASK-065, sin tocar el manager ni introducir un método `redo` en `Command`; (2) se soportan dos atajos, `Ctrl/Cmd + Shift + Z` (estándar, simétrico con undo) y `Ctrl/Cmd + Y` (alias Windows/Linux), decidido con el usuario; (3) la detección tecla→comando vive en Application (testeable sin React/DOM) y el DOM en Presentation, coherente con TASK-029→065; (4) `onRedoElements` opcional: sin él el atajo queda inerte, misma estrategia que `onUndoElements`; (5) sin ADR por ser una decisión local de interacción.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-067 (History edge cases).

## 2026-10-12 — TASK-071

- Resultado: Persistencia de mutaciones de elementos en la capa Application, desacoplada de la UI y de la orquestación. Nuevo servicio `src/application/services/element-persistence.ts`: `createElementPersistence(elementRepository: ElementRepository)` devuelve `ElementPersistence` con `save`, `saveMany`, `remove` y `removeMany`, cada uno con resultado discriminado `{ status: 'ok' } | { status: 'error', error: AppError }` y traducción de errores vía `toAppError` (nunca se filtran errores crudos del repositorio). Las listas vacías (`saveMany`/`removeMany`) son no-op y no invocan al repositorio. Solo depende del port; sin React, Firebase ni styled-components. Exportado en `src/application/services/index.ts`.
- Tests/quality gates: 1144 tests pasan (96 suites, +11 en `src/test/unit/application/services/element-persistence.test.ts` con `FakeElementRepository`: save recuperable, saveMany por lote, remove/removeMany efectivos, no-op con listas vacías verificado con `jest.spyOn`, mapeo de fallos a `AppError` —incluido `notFound`/`NOT_FOUND_RESOURCE`—, `isAppError` en errores mapeados e inmutabilidad de las colecciones de entrada). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) alcance acotado a Application por acuerdo con el usuario: el cableado del `Canvas` y la orquestación de persistencia corresponden a TASK-072 y el debounce/batching a TASK-073; (2) el resultado `ok` no devuelve el elemento (el repositorio ya lo validó y el owner del estado es la UI): mantiene el contrato mínimo y evita duplicar datos; (3) las listas vacías no tocan el repositorio para no generar operaciones innecesarias con Firestore; (4) sin ADR por reutilizar el patrón ya establecido en `load-workspace-elements` (port inyectado, unión discriminada, `toAppError`).
- Bloqueos: ninguno.
- Siguiente tarea: TASK-072 (Persistence orchestration).

## 2026-10-12 — TASK-081

- Resultado: Estrategia de conflictos explícita, pura y convergente, sin CRDT. Nuevo `src/application/services/element-conflict-resolution.ts`: `compareElementVersions` (orden total por `updatedAt`), `isStrictlyNewer` (movido aquí desde `remote-element-updates`), `resolveElementVersion(a, b)` (LWW por elemento con desempate determinista y **simétrico**) y `canonicalizeElement` (serialización estable con claves ordenadas y `Date` a ISO). `applyRemoteElementChanges` pasa a usar `resolveElementVersion` en `added`/`modified`, conservando el contrato de ADR-0010 (ignora `origin: 'local'`, aísla por workspace, ordena con `sortElementsForLoad`, misma referencia sin cambios). `rollbackFailedMutation` **mantiene** `isStrictlyNewer` de forma intencional: en un rollback, un empate de `updatedAt` significa que el estado actual es la mutación optimista a revertir (ver ADR-0013 §5). Sin listeners nuevos ni cambios en el port/adapter.
- Tests/quality gates: 1315 tests pasan (106 suites; +casos: 12 de `element-conflict-resolution.test.ts` —orden estricto en ambos sentidos, empate simétrico, misma referencia, `id` distinto lanza, canonicalización determinista—, 2 nuevos en `remote-element-updates.test.ts` —convergencia ante empate en distinto orden de llegada y ediciones concurrentes a elementos independientes— y 1 en `optimistic-element-updates.test.ts` —rollback con remoto de igual `updatedAt`—). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde.
- Decisiones: (1) el desempate en empate de `updatedAt` es una **comparación canónica simétrica**, elegida con el usuario para garantizar convergencia entre réplicas sin cambiar el esquema; (2) la política vive en un único módulo puro de Application reutilizado por el camino remoto y el de rollback, eliminando la duplicación previa; (3) se documenta la estrategia en `docs/adr/0013-conflict-strategy.md` por ser una decisión transversal de consistencia realtime (§9); (4) fuera de alcance: CRDT, versionado/`updatedBy`, merge por campo e historial local vs remoto (TASK-088).
- Bloqueos: ninguno.
- Siguiente tarea: TASK-082 (Presence port/model).

## 2026-10-12 — TASK-082

- Resultado: Port, modelo y adapter Firebase de presencia efímera. Dominio: `src/domain/collaboration/presence.ts` (`Presence` con `userId`, `workspaceId`, `lastSeenAt`; `static create`, `refresh` inmutable para heartbeats, `isFor`, `equals` y `toJSON`) y barrel `src/domain/collaboration/index.ts`. Application: `src/application/ports/presence-port.ts` (`PresencePort.subscribe(workspaceId, listener, onError?, onConnectionChange?): Unsubscribe`, `announce(presence): Promise<void>` para publicar presencia local y `withdraw(workspaceId, userId): Promise<void>` para limpiarla al desconectar; cambios `joined`/`updated`/`left` con `origin: 'local' | 'remote'`, reutilizando `RealtimeChangeOrigin`/`RealtimeConnectionListener` de `realtime-port` como indica ADR-0012). Barrel de ports actualizado.
- Infrastructure: `src/infrastructure/firebase/firebase-presence-mapper.ts` (`toPresenceDocument`/`fromPresenceDocument`, con lectura de `Date` o `Timestamp`) y `src/infrastructure/firebase/firebase-presence-adapter.ts` (`createFirebasePresenceAdapter(db)`: `subscribe` con `onSnapshot({ includeMetadataChanges: true })` sobre `query(collection('presence'), where('workspaceId', '==', …))`, descarta el primer snapshot, mapea `added`→`joined`, `modified`→`updated`, `removed`→`left` (userId desde el id `${workspaceId}_${userId}`), origen `hasPendingWrites ? 'local' : 'remote'`, estado de conexión `fromCache ? 'reconnecting' : 'connected'`, y `announce`/`withdraw` como `setDoc`/`deleteDoc` con errores mapeados). La presencia vive en la colección `presence`, totalmente separada de `elements`, por lo que no modifica ni bloquea el documento persistido.
- Alcance: port + model + adapter. El servicio de aplicación de "Connected users" y el cableado en Presentation quedan para TASK-083/084/085 (no se toca App.tsx todavía porque aún no hay consumidor).
- Tests/quality gates: `src/test/fixtures/fake-presence-port.ts` (fake con `announce`/`withdraw` que emiten `joined`/`updated`/`left` e infiere estado efímero), `src/test/contract/presence-port-contract.ts` (13 casos de contrato: entrega, aislamiento por workspace, unsubscribe idempotente, errores, cambios de conexión, una suscripción activa por subscribe) ejecutado tanto en `src/test/unit/application/ports/fake-presence-port.test.ts` (+5 casos del fake) como en `src/test/unit/infrastructure/firebase/firebase-presence-adapter.test.ts` (contrato + 13 casos del adapter: descarte del primer snapshot, mapeo de cambios/origen, `announce`/`withdraw`, mapeo de errores, documento corrupto, metadata, separación de `elements`), y `src/test/unit/domain/collaboration/presence.test.ts` (8 casos del modelo) + `src/test/unit/infrastructure/firebase/firebase-presence-mapper.test.ts` (10 casos del mapper). 62 tests de presencia en total. `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde.
- Decisiones: (1) la presencia es efímera: modelo sin persistencia, adapter sobre una colección `presence` aparte, sin heartbeat/TTL (fuera del MVP); (2) se reutiliza el vocabulario de conexión del realtime port (ADR-0012) en vez de duplicarlo; (3) `withdraw(workspaceId, userId)` modela "limpiar presencia al desconectar" que consumirá TASK-085; (4) `announce`/`withdraw` son async para propagar errores de Firestore como `AppError` (patrón del `ElementRepository`).
- Bloqueos: ninguno.
- Siguiente tarea: TASK-083 (Connected users).

## 2026-10-12 — TASK-083

- Resultado: Servicio de Application `createConnectedUsersStore(presencePort, workspaceId)` en `src/application/services/connected-users-store.ts` (React/Firebase-free) que deriva de la presencia efímera la lista de usuarios conectados. Snapshot estable `{ users: readonly Presence[], error: AppError | null }` (referencia estable + guarda de igualdad, apto para `useSyncExternalStore`); suscripción perezosa al `PresencePort` con el primer subscriber y liberación con el último (patrón de `session-store`), una única suscripción por store. Reductor puro exportado `reduceConnectedUsers(users, event, workspaceId)`: `joined`/`updated` → upsert por `userId` (filtro defensivo `presence.isFor`), `left` → remove, ignora eventos de otro workspace y devuelve orden determinista por `userId`; errores del puerto fijados en `error` conservando `users` y limpiados en el siguiente cambio. Exportado en `services/index.ts`. Sin composición ni UI (llegan en TASK-084/085 y tareas de presentación con consumidor real).
- Tests/quality gates: 1391 tests pasan (111 suites, +14 en `src/test/unit/application/services/connected-users-store.test.ts`: 6 del reductor —join/update/left, aislamiento por workspace, orden y no mutación— y 8 del store con `FakePresencePort` —estado inicial, lazy connect, una suscripción compartida, timeline de cambios, no-op sin notificación ni cambio de snapshot, error conservando usuarios y limpieza, reconexión tras el último unsubscribe y unsubscribe idempotente—). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) el store queda **scopeado a un workspace** mediante la fábrica (el `workspaceId` es una dependencia), de modo que la suscripción perezosa no necesita un parámetro adicional y el ciclo de vida coincide con el de la pantalla; (2) el error vive en el snapshot (`error`) para que la UI pueda consumirlo por `useSyncExternalStore` sin canal aparte, conservando los usuarios conocidos y limpiándose con el siguiente cambio válido; (3) se incluyen cambios `local` y `remote` (la presencia propia también forma parte de los conectados); (4) sin composición ni hook: TASK-084 (Remote cursors), TASK-085 (Presence cleanup) y las tareas de presentación conservan su alcance; (5) sin ADR por reutilizar el patrón de store de Application ya establecido (`session-store`, `realtime-connection-store`).
- Bloqueos: ninguno.
- Siguiente tarea: TASK-084 (Remote cursors).

## 2026-10-12 — TASK-084

- Resultado: Cursores remotos sobre el canal de presencia existente, sin colección ni port nuevos. Dominio: `Presence` gana `cursor: Position | null` con `moveCursor(cursor)` inmutable (no-op por referencia si no cambia), `refresh` que conserva el cursor, getter `cursor` y `equals`/`toJSON` que lo incluyen. Infrastructure: `toPresenceDocument` omite `cursor` cuando es `null` y `fromPresenceDocument` lo parsea tolerando ausencia/`null` (round-trip y compatibilidad con documentos previos).
- Application: nuevo `src/application/services/cursor-broadcaster.ts` (`createCursorBroadcaster` con throttle **leading + trailing**, `DEFAULT_CURSOR_THROTTLE_MS = 80`, scheduler inyectable, descarte de posiciones repetidas, errores de `announce` traducidos con `toAppError` y expuestos por `onError`, `flush`/`stop`) y `src/application/services/remote-cursors-store.ts` (`createRemoteCursorsStore` con suscripción perezosa única y snapshot estable apto para `useSyncExternalStore`, `EMPTY_REMOTE_CURSORS_STORE` y el reductor puro `reduceRemoteCursors` que ignora `origin: 'local'`, el propio usuario, otros workspaces y presencias sin cursor, elimina al usuario que se va y devuelve orden determinista por `userId`). Exportados en `services/index.ts`. Sin React ni Firebase.
- Composición: nuevo `src/app/config/presence-services.ts` (`createPresenceServices` → `createFirebasePresenceAdapter(getFirebaseFirestore())`), cableado como prop **opcional** `presencePort` en `App.tsx → AppRoutes → WorkspaceShellPage → WorkspaceShellContainer`; el `localUserId` se deriva de `useSession()` en la page (patrón de `workspaces-page`).
- Presentation: `useCursorBroadcast` traduce `pointermove` a coordenadas de mundo (`screenToWorld`, respeta `disabled`) y `RemoteCursorsOverlay` pinta una capa `pointer-events: none`/`aria-hidden` posicionando cada cursor con `viewport.worldToScreen`. `Canvas` recibe `remoteCursors`/`onCursorMove` opcionales y fusiona el ref del hook con `setContainerRef`; el contenedor crea store y broadcaster con `useMemo`, lee el snapshot con `useSyncExternalStore` y hace `flush()` + `stop()` al desmontar. La suscripción al `PresencePort` sigue siendo única y compartida (sin listeners duplicados).
- Tests/quality gates: 1436 tests pasan (115 suites; +~45: `presence.test.ts` cursores, `firebase-presence-mapper.test.ts` cursor round-trip/validación, nuevo `remote-cursors-store.test.ts` —12 del reductor y 9 del store con `FakePresencePort`—, nuevo `cursor-broadcaster.test.ts` —8 con `ManualScheduler`, incluye leading/trailing, coalescing, flush y `onError`—, nuevo `remote-cursors-overlay.test.tsx` —4— y nuevo `use-cursor-broadcast.test.tsx` —4—). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) el cursor viaja como campo del documento de presencia, reutilizando la suscripción y garantizando que no toca ni bloquea `elements`; (2) emisión con throttle leading+trailing en Application (puro y testeable) para acotar escrituras sin perder la posición final; (3) consumo derivado por un reductor puro + store perezoso, con lifecycle de suscripción compartido; (4) UI de presentación delgada (`useCursorBroadcast` + `RemoteCursorsOverlay`) sin hablar con Firebase; (5) alcance acotado a TASK-084: TTL/heartbeat, interpolación y etiquetas con nombre y la limpieza al desconectar (TASK-085) quedan fuera. Documentado en `docs/adr/0014-remote-cursors.md`.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-085 (Presence cleanup).

## 2026-10-13 — TASK-090

- Resultado: Repository de Membership sobre Firestore. `createFirebaseMembershipRepository(db)` en `src/infrastructure/firebase/firebase-membership-repository.ts` (factory + DI, patrón de ADR-0002) cumple el contrato ya definido en TASK-089. Documento con id compuesto determinista `${workspaceId}_${userId}` (convención de `presence`), de modo que `findByUserAndWorkspace` es un `getDoc` directo (sin índice compuesto) y `listByWorkspace`/`listByUser` son `query(where('workspaceId'|'userId','==',…))`. `create` construye/valida la entidad antes de escribir y prechequea existencia (el `setDoc` de Firestore sobrescribe) → duplicado lanza `conflict`/`MEMBERSHIP_ALREADY_EXISTS`; `updateRole` hace `updateDoc` parcial (`role`, `updatedAt`) preservando `createdAt`; `delete`/`updateRole` sobre membership inexistente lanzan `notFound`/`NOT_FOUND_RESOURCE`. Mapper puro `firebase-membership-mapper.ts` (sin import del SDK; lee `Date` o `Timestamp`-like vía `toDate()`, valida rol con `validateRole`). Errores concretos traducidos con `mapFirebaseError`. Sin composición todavía (el wiring llega con TASK-091+).
- Tests/quality gates: 1506 tests pasan (118 suites, +21 en `src/test/unit/infrastructure/firebase/firebase-membership-repository.test.ts`: contrato completo de membership vía `describeMembershipRepositoryContract` + 7 casos del adapter —persistencia bajo id determinista `ws-1_user-1` con `Date`, no-escritura con rol inválido, `unavailable`→network, `permission-denied`→authorization sin escribir, `updateRole` parcial preservando `createdAt`, lectura de `Timestamp`-like y documento corrupto→validation—); `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente). Smoke manual contra Firebase real pendiente de verificación con `npm run dev`.
- Decisiones: (1) id compuesto determinista `${workspaceId}_${userId}` en una colección plana `memberships`, elegido con el usuario para evitar índice compuesto en producción y ser coherente con la colección `presence`; (2) el mapper no recibe el id del documento porque la identidad de `Membership` son los campos `(userId, workspaceId)`, no el id persistido; (3) la validación de rol/entidad vive en Domain (`Membership.create`/`updateRole`) y el adapter solo la traduce a `validation`/`VALIDATION_INVALID_INPUT`, igual que el resto de repositorios; (4) el prechequeo de duplicado sigue el patrón ya usado por el workspace repo para `update`/`delete`; (5) sin ADR por reutilizar ADR-0002/0005 y no introducir decisiones arquitectónicas nuevas.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-091 (Create owner membership).

## 2026-10-13 — TASK-091

- Resultado: El creador de un workspace queda registrado como **owner**. Nuevo `createCreateOwnerMembership(membershipRepository)` (`src/application/commands/create-owner-membership.ts`): crea la membership `(userId, workspaceId, role: 'owner')` y traduce errores con `toAppError`. Nuevo `createCreateWorkspaceWithOwner({ workspaceRepository, createOwnerMembership })` (`src/application/commands/create-workspace-with-owner.ts`): reusa `validateCreateWorkspaceInput`, crea el workspace y luego la membership de owner. Compensación best-effort: si falla la membership, borra el workspace y devuelve el error original; si el borrado también falla, anota el error con `details.workspaceRollbackFailed: true` y `cause`. Composición en `workspace-services` (`createWorkspaceWithOwner` con workspace + membership repos de Firestore) y wiring en `App.tsx`/`app-routes`/`WorkspacesPage` (el `ownerId` se deriva de `useSession()` con `useMemo` y se adapta al contrato del `CreateWorkspaceDialog`, que no cambia).
- Tests/quality gates: 1520 tests pasan (120 suites; +14: `create-owner-membership.test.ts` —ok, conflicto, owners independientes, error de red, normalización—, `create-workspace-with-owner.test.ts` —ok con membership, trim/descripción, invalid-input sin tocar repos, fallo de workspace, rollback, rollback fallido anotado, normalización, scoping—, case de membership en `workspace-error-messages.test.ts` y el `create-workspace-flow.test.tsx` actualizado a la composición con assertions de owner). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) la creación del workspace se mantiene como use case independiente (`create-workspace.ts` intacto) y la composición con owner vive en un caso de uso nuevo, evitando acoplar `createWorkspace` a membership y preservando el contrato del `CreateWorkspaceDialog`; (2) compensación best-effort con borrado del workspace ante fallo de membership (acordado con el usuario) para no dejar workspaces sin owner; (3) el fallo de compensación no se silencia: queda observable en `error.details.workspaceRollbackFailed`; (4) `MEMBERSHIP_ALREADY_EXISTS` se mapea a un mensaje explícito en `describeCreateWorkspaceError`; (5) sin ADR por no introducir decisiones arquitectónicas nuevas.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-092 (Invite member use case).

## 2026-10-13 — TASK-092

- Resultado: Modelo de **invitación pendiente**. Dominio `src/domain/invitation/` con `InvitationStatus` (`pending`/`accepted`/`revoked`), entidad `Invitation` (`id`, `workspaceId`, `email`, `role`, `tokenHash`, `status`, `invitedBy`, `expiresAt`, timestamps) y `InvitationId` en `src/domain/shared/value-objects/invitation-id.ts`; normaliza/valida el email, valida rol/token/timestamps, deriva la expiración con `isExpired(now)` y expone transiciones inmutables `accept`/`revoke` (solo desde `pending`).
- Port `InvitationRepository` (`create`, `findByTokenHash`, `listPendingByWorkspace`, `updateStatus`): `create` rechaza con `conflict/INVITATION_ALREADY_EXISTS` ante pendiente duplicada `(workspaceId, email)` o id repetido; `updateStatus` rechaza con `notFound` sobre inexistente. Nuevo code `INVITATION_ALREADY_EXISTS: 'invitation/already-exists'` (kind `conflict`).
- Use case `createInviteMember({ invitationRepository, generateId, issueToken, now?, ttlMs? })` (`src/application/commands/invite-member.ts`): valida email/rol (reusa `isValidEmail`/`isValidRole`), calcula `expiresAt` con TTL por defecto `INVITATION_TTL_MS` (7 días), obtiene `{ token, tokenHash }` mediante `issueToken()` inyectado (la criptografía queda en composición), persiste solo `tokenHash` y devuelve el token en claro una sola vez. Errores de invariantes→`validation`; errores del repo con `toAppError` (preserva conflict/network, normaliza inesperados a `unknown`).
- `FakeInvitationRepository` + contrato ejecutable (`src/test/fixtures/fake-invitation-repository.ts`, `src/test/contract/invitation-repository-contract.ts`) como especificación del futuro adapter Firestore. ADR nuevo `docs/adr/0018-invitation-model.md`.
- Tests/quality gates: 1562 tests pasan (123 suites; +42 en `invitation.test.ts` —invariantes de dominio y transiciones—, `invite-member.test.ts` —ok/token, no persistir el token en claro, TTL custom, invalid-input sin tocar el repo, conflicto, independencia por workspace/email, preservación de red, normalización a unknown— y `fake-invitation-repository.test.ts` —contrato completo—). `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde (el aviso de chunk >500 kB es el bundle de Firebase, preexistente).
- Decisiones: (1) entidad `Invitation` separada de `Membership` con id y ciclo de vida propios (la membership solo nace al aceptar, TASK-094); (2) email como identidad funcional, normalizado y validado en dominio (sin importar `src/shared`); (3) token de un solo uso persistido **hasheado** y devuelto en claro una única vez, con `issueToken()` inyectado para no meter Web Crypto en Application; (4) expiración derivada, sin estado almacenado ni job; (5) el port incluye anticipadamente `findByTokenHash`/`listPendingByWorkspace`/`updateStatus` para TASK-093/094 (mismo criterio que ADR-0017); (6) autorización del invitador y adapter Firestore diferidos a TASK-095/097 y a la tarea de adapter; (7) sin restringir el rol invitado (se admite `owner`, como el dominio). Documentado en `docs/adr/0018-invitation-model.md`.
- Bloqueos: ninguno.
- Siguiente tarea: TASK-093 (Invitation UI).

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
