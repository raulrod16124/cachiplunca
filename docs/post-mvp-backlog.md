# Cachiplunca — Post-MVP Backlog (Mini Jira)

> Fuente de verdad para la evolución posterior al MVP. Cada tarea está pensada para ejecutarse en una sesión independiente, con alcance cerrado, criterios verificables y las mínimas decisiones abiertas posibles.
>
> El MVP sigue viviendo en [`mvp-backlog.md`](mvp-backlog.md). Este documento empieza donde termina el MVP y no lo reemplaza.

---

## 0. Cómo usar este documento

Protocolo por sesión:

1. Lee `AGENTS.md` y este documento antes de tocar código.
2. Comprueba rama, estado de Git y cambios locales.
3. Elige la primera tarea `TODO` del tablero cuyas dependencias estén `DONE`. Respeta el orden de releases salvo que el usuario indique otra prioridad.
4. Lee la tarea, sus dependencias, el código relacionado y los ADR aplicables.
5. Formula un plan breve antes de implementar.
6. Implementa únicamente el alcance de la tarea. No introduzcas mejoras colaterales.
7. Añade o actualiza tests.
8. Ejecuta los quality gates.
9. Revisa diff, regresiones, seguridad y acoplamientos.
10. Comprueba los criterios de aceptación uno por uno.
11. Actualiza el estado de la tarea y añade una línea en el [registro de sesiones](#8-registro-de-sesiones).
12. Crea o actualiza un ADR si la decisión es arquitectónicamente relevante.

Estados permitidos:

```text
TODO
IN PROGRESS
BLOCKED
DONE
```

Reglas de estado:

- Solo puede haber **una** tarea `IN PROGRESS` a la vez.
- Una tarea pasa a `DONE` solo si el alcance está implementado, los criterios se cumplen, los tests pasan y no hay bloqueos conocidos.
- Una tarea `BLOCKED` debe documentar causa, evidencia, dependencia que falta y condición para desbloquearla.

---

## 1. Principios de evolución

- **Sencillez primero.** Reutiliza comandos, puertos, stores y servicios existentes antes de crear abstracciones nuevas.
- **Sin entidades especulativas.** No se añade una entidad de dominio hasta que un caso de uso concreto la necesite.
- **Una sola fuente de verdad.** Las tareas del plan se derivan de los `TaskElement` del canvas; no se crea un modelo de proyecto paralelo.
- **Clean Architecture + Hexagonal.** Domain no depende de React, Firebase, styled-components ni `@raulrod/ui`. Application depende de puertos. Infrastructure contiene adapters. Presentation no importa Firebase.
- **SOLID aplicado con criterio.** Interfaces pequeñas, dependencias explícitas y responsabilidades separadas; sin capas ceremoniales.
- **UI sencilla.** Las funcionalidades nuevas viven en la top bar, un panel lateral o el menú contextual existente. Evitar multiplicar ajustes y modos.
- **i18n desde el primer día.** Todo texto visible nuevo pasa por `src/presentation/i18n/messages.ts`.
- **Accesibilidad por defecto.** Teclado, foco predecible, roles ARIA y `prefers-reduced-motion` cuando aplique.
- **Sin dependencias nuevas** sin justificación, impacto y alternativa considerada. Si la decisión es relevante, queda en un ADR.
- **Sin copiar branding, assets, textos ni UI distintiva** de productos competidores.

---

## 2. Convenciones

| Campo | Significado                                                                 |
| ----- | --------------------------------------------------------------------------- |
| `S`   | Cabe en una sesión.                                                         |
| `M`   | Una o dos sesiones.                                                         |
| `L`   | Dos o tres sesiones. Dividir en fases dentro de la misma tarea.             |
| `QW`  | Quick win: esfuerzo `S`, alto impacto visible y bajo riesgo arquitectónico. |
| `P0`  | Necesario para sostener la promesa principal del producto.                  |
| `P1`  | Alto valor para el usuario objetivo.                                        |
| `P2`  | Mejora valiosa, no bloqueante.                                              |

Definition of Done:

- [ ] Alcance implementado y criterios de aceptación cumplidos.
- [ ] Tests de dominio/funciones puras cuando exista lógica nueva.
- [ ] Tests de Application con puertos fake cuando haya casos de uso.
- [ ] Tests de mapper/adapter cuando haya persistencia nueva.
- [ ] Tests de integración de Presentation cuando se cablee UI.
- [ ] E2E cuando se complete un journey de usuario.
- [ ] `npm run lint`, `npm run format:check`, `npx tsc -b --noEmit`, `npm test` y `npm run build` en verde.
- [ ] `npm run test:rules` cuando se toquen `firestore.rules` o `storage.rules`.
- [ ] Estado actualizado en este documento y sesión registrada.
- [ ] ADR si hay decisión arquitectónica relevante.

---

## 3. Tablero

| ID      | Tarea                                        | Release | Prioridad | Esfuerzo | Depende de     | QW  | Estado |
| ------- | -------------------------------------------- | ------- | --------- | -------- | -------------- | --- | ------ |
| PBL-001 | Seguridad de lectura y verificación de email | R1      | P0        | M        | `mvp TASK-127` | No  | DONE   |
| PBL-002 | Borrar workspace desde la UI                 | R1      | P0        | S        | —              | Sí  | DONE   |
| PBL-003 | Paleta de colores de nota                    | R1      | P1        | S        | —              | Sí  | DONE   |
| PBL-004 | Ayuda de atajos                              | R1      | P2        | S        | —              | Sí  | DONE   |
| PBL-005 | Export JSON y PDF del tablero                | R1      | P1        | S        | —              | Sí  | DONE   |
| PBL-006 | Duplicar workspace                           | R1      | P1        | M        | —              | No  | DONE   |
| PBL-007 | Plantillas de arranque y empty states        | R1      | P0        | M        | —              | No  | DONE   |
| PBL-008 | Command palette (Cmd/Ctrl + K)               | R1      | P1        | M        | —              | No  | DONE   |
| PBL-009 | Vista Plan de tareas                         | R2      | P0        | M        | —              | No  | DONE   |
| PBL-010 | Crear tarea desde nota o frame               | R2      | P1        | S        | PBL-009        | Sí  | DONE   |
| PBL-011 | Kanban del plan                              | R2      | P2        | M        | PBL-009        | No  | DONE   |
| PBL-012 | Alineación y distribución                    | R2      | P1        | M        | —              | No  | DONE   |
| PBL-013 | Comentarios MVP                              | R2      | P0        | L        | PBL-001        | No  | DONE   |
| PBL-014 | Temporizador de sesión local                 | R3      | P2        | S        | —              | Sí  | DONE   |
| PBL-015 | Imágenes                                     | R3      | P1        | L        | PBL-001        | No  | TODO   |
| PBL-016 | Enlace guest de solo lectura                 | R3      | P1        | L        | PBL-001        | No  | TODO   |
| PBL-017 | Vista presentación por frames                | R3      | P2        | M        | PBL-009        | No  | TODO   |
| PBL-018 | Notificaciones in-app                        | R3      | P2        | S        | —              | Sí  | TODO   |

Leyenda de releases:

- **R1 — Completar y pulir:** cierra deuda visible, activación y navegación.
- **R2 — De canvas a plan:** convierte el canvas en un plan compartido.
- **R3 — Sesión compartida y contenido:** facilita workshops y enriquece el tablero.

---

## 4. Quick wins

Tareas que deberían resolverse primero dentro de su release por relación impacto/esfuerzo:

| ID      | Quick win                      | Por qué                                                                  |
| ------- | ------------------------------ | ------------------------------------------------------------------------ |
| PBL-002 | Borrar workspace desde la UI   | El comando ya existe; solo falta confirmación, wiring y E2E.             |
| PBL-003 | Paleta de colores de nota      | `NoteElement.color` ya existe en dominio y renderer; solo falta la UI.   |
| PBL-004 | Ayuda de atajos                | Solo UI; los atajos ya están implementados y probados.                   |
| PBL-005 | Export JSON y PDF              | Serialización pura + descarga/print; sin backend ni dependencias nuevas. |
| PBL-010 | Crear tarea desde nota o frame | Reutiliza `createElement`; no requiere dominio nuevo.                    |
| PBL-014 | Temporizador de sesión local   | Estado local y accesible; sin persistencia ni cambios de backend.        |
| PBL-018 | Notificaciones in-app          | La lista de invitaciones pendientes ya existe; falta badge y aviso.      |

---

# 5. Release 1 — Completar y pulir

### PBL-001 — Seguridad de lectura y verificación de email

**Priority:** P0 · **Effort:** M · **Depends:** `mvp TASK-127` · **Status:** DONE

#### Objetivo

Cerrar el último gap de seguridad del MVP antes de abrir el producto a más usuarios.

#### Alcance

- Verificar que una invitación solo puede aceptarse con el email destinatario.
- Acotar la lectura de workspaces y memberships a las membresías del usuario.
- Actualizar `firestore.rules` y sus tests.
- Marcar `TASK-127` como `DONE` en `mvp-backlog.md`.

#### Criterios de aceptación

- [x] Un usuario autenticado no puede leer un workspace del que no es miembro.
- [x] Una invitación no puede aceptarse con un email distinto al destinatario.
- [x] Los tests de rules cubren ambos casos.
- [x] No se rompe el flujo actual de invitación, aceptación ni board.
- [x] Quality gates aplicables en verde.

#### Fuera de alcance

- Rediseñar autenticación o invitaciones.
- Añadir guest access (PBL-016).

#### Notas técnicas

- `firestore.rules` es la autorización efectiva; la UI solo refleja permisos.
- Revisar ADR-0023 y ADR-0031.
- Ejecutar `npm run test:rules` con el emulador.

---

### PBL-002 — Borrar workspace desde la UI

**Priority:** P0 · **Effort:** S · **Depends:** — · **Status:** DONE · **Quick win**

#### Objetivo

Permitir que el owner elimine un workspace desde la interfaz con confirmación destructiva.

#### Alcance

- Acción de borrado en la card del workspace o en su menú contextual.
- Diálogo de confirmación que muestre el nombre del workspace.
- Cablear `deleteWorkspace`, ya existente en `src/app/config/workspace-services.ts`, desde `AppRoutes` hasta `WorkspacesPage`.
- Actualizar la lista tras el borrado y manejar errores.
- E2E del flujo de borrado.

#### Criterios de aceptación

- [ ] El owner puede borrar y el workspace desaparece de la lista.
- [ ] Editor y Viewer no ven la acción habilitada.
- [ ] La confirmación es explícita y cancelable.
- [ ] Los errores se muestran sin romper la lista.
- [ ] Tests de Presentation y E2E en verde.

#### Fuera de alcance

- Papelera, soft delete o restauración.
- Borrado en cascada desde backend más allá de lo que ya hace el comando.

#### Notas técnicas

- Solo Presentation y composición; no requiere cambios de dominio ni infraestructura.
- Reutilizar `Dialog`, `Button` y patrones de confirmación existentes de `@raulrod/ui`.

---

### PBL-003 — Paleta de colores de nota

**Priority:** P1 · **Effort:** S · **Depends:** — · **Status:** DONE · **Quick win**

#### Objetivo

Aprovechar el color ya soportado por `NoteElement` para organizar visualmente las notas.

#### Alcance

- Selector de 5–6 colores de tema accesibles en el menú contextual de una nota.
- Acción para volver al color por defecto.
- Persistir el cambio mediante `UpdateElement`.
- Respetar permisos de solo lectura.

#### Criterios de aceptación

- [x] El color se aplica y persiste tras recargar.
- [x] Undo/redo restauran el color anterior.
- [x] La UI es navegable con teclado y tiene etiquetas accesibles.
- [x] Los colores mantienen contraste legible con el texto.
- [x] Tests de Presentation y del flujo de actualización.

#### Fuera de alcance

- Selector libre de color o entrada hexadecimal.
- Colores por usuario o por estado.

#### Notas técnicas

- `withNoteColor`, `UpdateElementInput.color` y `NoteRenderer` ya existen.
- Usar tokens de tema; no hardcodear colores de marca.

---

### PBL-004 — Ayuda de atajos

**Priority:** P2 · **Effort:** S · **Depends:** — · **Status:** DONE · **Quick win**

#### Objetivo

Hacer descubribles los atajos existentes sin añadir funcionalidad nueva al canvas.

#### Alcance

- Diálogo accesible que se abre con `?` o desde el menú de ayuda.
- Atajos agrupados por contexto: canvas, selección, edición y colaboración.
- Incluir la ayuda en la command palette (PBL-008) cuando exista.
- Textos i18n.

#### Criterios de aceptación

- [x] La lista coincide exactamente con los atajos implementados.
- [x] Se abre y cierra con teclado; el foco queda atrapado mientras está abierto.
- [x] `Escape` cierra sin efectos colaterales.
- [x] Tests de apertura, cierre y contenido mínimo.

#### Fuera de alcance

- Atajos personalizables.
- Documentar atajos no implementados.

#### Notas técnicas

- Extraer etiquetas desde las constantes de teclado existentes si es viable; evitar dos fuentes de verdad.
- No hay atajos propios de colaboración implementados; el catálogo omite grupos vacíos. La ayuda se incorporó después como acción de la command palette de PBL-008.
- Catálogo puro en `src/presentation/canvas/keyboard-shortcuts.ts`; el diálogo solo renderiza datos y la apertura con `?` ignora campos editables y modales abiertos.

---

### PBL-005 — Export JSON y PDF del tablero

**Priority:** P1 · **Effort:** S · **Depends:** — · **Status:** DONE · **Quick win**

#### Objetivo

Permitir que el plan salga del canvas para compartirse, imprimirse o archivarse.

#### Alcance

- Exportar los elementos del workspace actual a JSON con envoltura versionada:
  `{ version, workspaceId, exportedAt, elements }`.
- Generar un nombre de fichero legible a partir del workspace y la fecha.
- Vista imprimible del tablero y export a PDF mediante `window.print()`.
- Permitir export a Owner, Editor y Viewer.

#### Criterios de aceptación

- [x] El JSON incluye todos los elementos y no incluye datos sensibles de usuarios.
- [x] La serialización vive en una función pura con tests.
- [x] La descarga funciona en navegador.
- [x] La vista imprimible oculta controles y mantiene el contenido legible.
- [x] No se añaden dependencias nuevas.

#### Fuera de alcance

- Importación, PNG rasterizado o formatos de otros productos.
- Export por selección o por frame.

#### Notas técnicas

- Serializador puro en Application.
- Descarga mediante el adapter de navegador existente o uno mínimo en `src/infrastructure/browser`.

---

### PBL-006 — Duplicar workspace

**Priority:** P1 · **Effort:** M · **Depends:** — · **Status:** DONE

#### Objetivo

Permitir reutilizar un tablero como punto de partida sin reconstruirlo.

#### Alcance

- Acción "Duplicate" en la card del workspace para el owner.
- Copiar metadatos del workspace y todos sus elementos con IDs nuevos.
- Remapear conectores para que apunten a los elementos copiados.
- Nombre inicial `Copy of <original>`.
- Crear membership de owner para el usuario actual.
- Mantener al usuario en la lista de workspaces y mostrar el duplicado para que lo abra cuando quiera.

#### Criterios de aceptación

- [x] El workspace duplicado es independiente del original.
- [x] Los conectores apuntan a los nuevos elementos, nunca a los originales.
- [x] El owner queda como miembro del duplicado.
- [x] No se copian miembros ni invitaciones.
- [x] Tests de la función pura de remapeo y E2E del flujo.

#### Fuera de alcance

- Duplicar miembros, roles o invitaciones.
- Copia entre workspaces distintos.
- Duplicado parcial o por selección.

#### Notas técnicas

- Reutilizar `loadWorkspaceElements`, `createWorkspaceWithOwner` y `createElement`.
- El remapeo de IDs y conectores debe ser una función pura testeada.
- Si falla la copia de elementos, informar y permitir reintentar; no introducir transacciones nuevas si no son necesarias.

---

### PBL-007 — Plantillas de arranque y empty states

**Priority:** P0 · **Effort:** M · **Depends:** — · **Status:** DONE

#### Objetivo

Reducir el canvas vacío y acelerar el primer valor con estructuras de planificación listas para usar.

#### Alcance

- Tres plantillas propias: retrospectiva, kickoff de proyecto y brainstorming.
- Selector "Blank / Template" en el diálogo de creación de workspace.
- Datos de plantilla como estructuras puras en Application, sin React.
- Generación de elementos con IDs nuevos al crear el workspace.
- Empty state del board con CTA para añadir el primer elemento.
- Nombres y descripciones i18n.

#### Criterios de aceptación

- [x] Cada plantilla crea frames, notas y tareas coherentes.
- [x] La opción "Blank" mantiene el comportamiento actual.
- [x] No se añaden tipos de elemento ni entidades de dominio nuevas.
- [x] La generación de una plantilla está cubierta por tests puros.
- [x] E2E de creación con al menos una plantilla.

#### Fuera de alcance

- Marketplace de plantillas.
- Guardar un tablero como plantilla.
- Previews gráficas elaboradas.

#### Notas técnicas

- Las plantillas son datos + una función pura que devuelve entradas compatibles con `CreateElement`.
- La UI solo selecciona y muestra nombre/descripción; no contiene la lógica de composición.
- No añadir persistencia nueva.

---

### PBL-008 — Command palette (Cmd/Ctrl + K)

**Priority:** P1 · **Effort:** M · **Depends:** — · **Status:** DONE

#### Objetivo

Mejorar descubrimiento y navegación sin añadir nuevas pantallas.

#### Alcance

- Abrir/cerrar con `Cmd/Ctrl + K` y `Escape`.
- Acciones: crear Text, Note, Task, Frame, Link y Connector; fit view; undo/redo; compartir; volver a workspaces.
- Buscar workspaces por nombre.
- Buscar elementos del tablero actual por texto plano.
- Navegación con teclado y anuncio accesible del resultado.
- Textos i18n.

#### Criterios de aceptación

- [x] La palette funciona tanto en Workspaces como en el board.
- [x] Las acciones no disponibles no aparecen o están deshabilitadas de forma explícita.
- [x] Ejecutar una acción replica el comportamiento existente sin duplicar lógica.
- [x] No se introducen dependencias nuevas.
- [x] Tests de apertura, filtrado, ejecución y cierre.

#### Fuera de alcance

- Búsqueda difusa global, historial de comandos o IA.
- Atajos personalizables.

#### Notas técnicas

- Reutilizar handlers y comandos existentes del shell.
- Mantener el listener de teclado scoped al layout; no crear un event bus global.
- Usar `Dialog`/`Input` de `@raulrod/ui` y patrones de focus existentes.
- `CanvasCommandHandle` expone crear elemento/conector libre o ligado, fit, undo/redo y centrar/seleccionar un elemento, reutilizando los handlers internos del canvas.
- Búsqueda de elementos pura en Application (`searchElements`) y búsqueda de workspaces por nombre en Presentation; resultados acotados y sin entidades nuevas.
- La selección de un resultado usa `Viewport.center`/`CanvasViewportStore.center`, conservando el zoom.
- El atajo ignora inputs, editores y modales abiertos; con la palette abierta, Cmd/Ctrl + K la cierra.

---

# 6. Release 2 — De canvas a plan

### PBL-009 — Vista Plan de tareas

**Priority:** P0 · **Effort:** M · **Depends:** — · **Status:** DONE

#### Objetivo

Convertir el canvas en un plan consultable sin salir del workspace.

#### Alcance

- Panel lateral conmutable desde la top bar.
- Lista de `TaskElement` agrupada por estado y ordenada por fecha de vencimiento.
- Mostrar título, asignado, estado y vencimiento.
- Filtrar por estado y por "Mis tareas".
- Al seleccionar una tarea, centrar el viewport y seleccionar el elemento.
- Cambiar estado desde el panel reutilizando `UpdateElement`.
- Empty state con CTA para crear una tarea.

#### Criterios de aceptación

- [x] La vista refleja cambios locales y remotos en tiempo real.
- [x] No existe estado duplicado de tareas: todo se deriva de `elements`.
- [x] Los filtros y el cambio de estado son accesibles con teclado.
- [x] En modo solo lectura no se puede cambiar el estado.
- [x] Tests del selector puro y de integración del panel.

#### Fuera de alcance

- Kanban (PBL-011), timeline o estados personalizados.
- Crear un modelo de proyecto separado del canvas.

#### Notas técnicas

- Selector puro en Application (`selectTaskPlan`) que reciba `elements` y filtros.
- Centrar mediante `CanvasViewportStore` y el patrón de fit existente.
- No añadir entidad `Plan` ni store nuevo.
- Implementado en `src/application/services/task-plan.ts` (`selectTaskPlan`) y `TaskPlanPanel`; el panel reduce el ancho del canvas para que `focusElement`/`center` sigan siendo correctos. Ver ADR-0036.

---

### PBL-010 — Crear tarea desde nota o frame

**Priority:** P1 · **Effort:** S · **Depends:** PBL-009 · **Status:** DONE · **Quick win**

#### Objetivo

Convertir información capturada en acciones sin copiar y pegar.

#### Alcance

- Acción en el menú contextual de una nota o frame: "Create task from note/frame".
- Crear una `Task` con posición desplazada y título derivado del texto plano.
- Para notas largas, truncar el título y conservar el contenido completo en `notes` si aplica.
- Mantener la nota o frame original.
- Seleccionar la tarea recién creada.

#### Criterios de aceptación

- [x] La tarea se crea, se selecciona y se puede editar.
- [x] La nota o frame original no se modifica ni se elimina.
- [x] Si no hay texto utilizable, la acción aparece deshabilitada.
- [x] Undo/redo funcionan.
- [x] Tests de extracción de texto plano y del flujo de creación.

#### Fuera de alcance

- Conversión destructiva o sustitución automática.
- Conversión de tareas a notas.

#### Notas técnicas

- Reutilizar `createElement` y las factorías de dominio.
- Extracción de texto plano como función pura testeada.
- No añadir tipos de dominio.
- Implementado con `taskDraftFromElement`/`taskPositionFromElement` en `src/application/services/task-from-element.ts`; el menú contextual crea y selecciona la tarea, conserva el elemento origen y pasa por el historial existente.

---

### PBL-011 — Kanban del plan

**Priority:** P2 · **Effort:** M · **Depends:** PBL-009 · **Status:** DONE

#### Objetivo

Ofrecer una lectura por estado del plan ya existente.

#### Alcance

- Toggle Lista / Board dentro del panel Plan.
- Cuatro columnas basadas en `TASK_STATUSES`.
- Tarjetas con título, asignado y vencimiento.
- Cambio de estado mediante menú accesible.
- Contadores por columna y empty states.
- Actualización en tiempo real.

#### Criterios de aceptación

- [x] El cambio de estado persiste y se refleja en el canvas.
- [x] La vista es navegable con teclado y sin drag obligatorio.
- [x] En solo lectura no se puede cambiar el estado.
- [x] No se crean estados ni entidades nuevas.
- [x] Tests de integración del panel.

#### Fuera de alcance

- Drag & drop entre columnas.
- Swimlanes, WIP limits o campos personalizados.

#### Notas técnicas

- Reutilizar los selectores de PBL-009.
- Persistir con `UpdateElement`; no crear store nuevo.
- Implementado con `selectTaskPlanBoard` en `src/application/services/task-plan.ts` (misma derivación que `selectTaskPlan`, con columnas vacías) y un toggle Lista/Board con `Tabs` en `TaskPlanPanel`; las tarjetas son compactas (título a dos líneas, metadatos truncados) con menú accesible de estado y el panel se ensancha solo en board sin scroll horizontal. Ver ADR-0037.

---

### PBL-012 — Alineación y distribución

**Priority:** P1 · **Effort:** M · **Depends:** — · **Status:** DONE

#### Objetivo

Acelerar la organización visual con operaciones geométricas predecibles.

#### Alcance

- Con 2+ elementos seleccionados: alinear izquierda, centro horizontal, derecha, arriba, centro vertical y abajo.
- Con 3+ elementos: distribuir horizontal y verticalmente.
- Acciones en toolbar o menú contextual.
- Reutilizar historial y persistencia de movimiento existentes.
- Respetar solo lectura.

#### Criterios de aceptación

- [x] Las operaciones son puras y están cubiertas por tests con casos límite.
- [x] Solo cambian posiciones, nunca tamaños.
- [x] Undo/redo restauran el estado anterior.
- [x] Las acciones son accesibles con teclado.
- [x] No se introducen dependencias nuevas.

#### Fuera de alcance

- Smart guides, snapping o auto-layout.
- Agrupación de elementos.

#### Notas técnicas

- Función pura en Application que reciba `Element[]` y devuelva posiciones/elementos actualizados.
- Reutilizar el comando de movimiento y el patrón de historial existente.
- Implementado con `alignElements`/`distributeElements` en `src/application/services/element-alignment.ts`; los conectores se excluyen, la distribución usa huecos iguales entre bordes y el contenedor persiste con `commitElements` para un único paso de historial. UI en el desplegable “Alinear y distribuir” de la toolbar. Ver ADR-0038.

---

### PBL-013 — Comentarios MVP

**Priority:** P0 · **Effort:** L · **Depends:** PBL-001 · **Status:** DONE

#### Objetivo

Habilitar colaboración asíncrona ligada a elementos, sin convertir el producto en un chat.

#### Fases

- [x] **a. Domain:** entidad `Comment` con `id`, `workspaceId`, `elementId`, `authorId`, `body`, `createdAt` y `resolvedAt?`; invariantes y tests.
- [x] **b. Application:** puerto de persistencia y casos de uso crear, listar y resolver; tests con fake.
- [x] **c. Infrastructure:** adapter Firestore en subcolección `workspaces/{workspaceId}/comments`, mapper y tests.
- [x] **d. Rules:** permisos de lectura/escritura por membership; tests de rules.
- [x] **e. Presentation:** panel de comentarios por elemento, crear y resolver; i18n y accesibilidad.
- [x] **f. Integración/E2E:** comentar, recargar y ver el comentario; resolver.

#### Criterios de aceptación

- [x] Los comentarios persisten y se asocian al elemento correcto.
- [x] Solo los miembros del workspace pueden leer y crear comentarios.
- [x] Resolver conserva el historial y marca el hilo como resuelto.
- [x] Presentation no importa Firebase.
- [x] Quality gates y `npm run test:rules` en verde.

#### Fuera de alcance

- Respuestas anidadas, menciones, notificaciones y reacciones.
- Comentarios a nivel de workspace o de selección múltiple.

#### Notas técnicas

- Una tarea `L` puede ocupar varias sesiones; mantener el estado `IN PROGRESS` y marcar fases.
- Reutilizar el patrón de puertos/repositorios y mappers de elementos.
- Subcolección independiente: no inflar el documento del workspace.
- Implementado con `Comment`/`CommentId` en Domain, `CommentRepository` + casos de uso en Application, adapter Firestore en `workspaces/{workspaceId}/comments`, rules por membership y `CommentsPanel` ligado a la selección única. Cualquier miembro puede resolver; los viewers pueden comentar sin editar el canvas. Sin realtime ni entidades nuevas. Los elementos con comentarios sin resolver muestran un indicador con contador que abre el panel; los resueltos dejan de aparecer en el tablero pero conservan el historial en el panel. Ver ADR-0039.

---

# 7. Release 3 — Sesión compartida y contenido

### PBL-014 — Temporizador de sesión local

**Priority:** P2 · **Effort:** S · **Depends:** — · **Status:** DONE · **Quick win**

#### Objetivo

Apoyar sesiones de trabajo sin añadir estado compartido ni backend.

#### Alcance

- Botón de temporizador en la top bar.
- Presets de 1, 3, 5 y 10 minutos.
- Iniciar, pausar y reiniciar.
- Anuncio accesible del tiempo restante sin interrumpir.
- Respetar `prefers-reduced-motion`.

#### Criterios de aceptación

- [x] El temporizador no escribe en Firestore ni en el workspace.
- [x] Los controles son accesibles con teclado.
- [x] Los tests usan temporizadores falsos.
- [x] No afecta al rendimiento del canvas.
- [x] Textos i18n.

#### Fuera de alcance

- Temporizador compartido o sincronizado entre usuarios.
- Alarmas de audio configurables.

#### Notas técnicas

- Mantener el estado local en Presentation; extraer un reducer puro si facilita los tests.
- No crear puerto ni persistencia.
- Implementado con `sessionTimerReducer` en `src/presentation/features/workspace-shell/session-timer.ts` y `SessionTimer` en la top bar; el tiempo se calcula desde `endsAt`, el intervalo solo corre mientras está activo y al finalizar se abre un diálogo central con opción de reiniciar. Sin animaciones ni cambios de dominio, almacenamiento o reglas.

---

### PBL-015 — Imágenes

**Priority:** P1 · **Effort:** L · **Depends:** PBL-001 · **Status:** TODO

#### Objetivo

Cerrar el gap de contenido visual del tablero.

#### Fases

- [ ] **a. Domain:** `ImageElement` con URL, texto alternativo y tamaño; validadores y tests.
- [ ] **b. Application:** puerto de storage y caso de uso de subida; fake y tests.
- [ ] **c. Infrastructure:** adapter de Firebase Storage, mapper de persistencia y tests.
- [ ] **d. Rules:** `storage.rules` y `firestore.rules` para el nuevo tipo; tests.
- [ ] **e. Presentation:** renderer, inserción desde toolbar, redimensionado y eliminación.
- [ ] **f. Integración/E2E:** subir, ver, recargar y eliminar.

#### Criterios de aceptación

- [ ] La imagen se sube, se renderiza y persiste tras recargar.
- [ ] Se validan tipo y tamaño máximo con errores claros.
- [ ] El texto alternativo es editable y accesible.
- [ ] Los permisos respetan roles del workspace.
- [ ] Rules tests y quality gates en verde.

#### Fuera de alcance

- Ficheros genéricos, vídeo, recorte o anotaciones sobre imagen.
- Integración con Drive u otros proveedores.

#### Notas técnicas

- GAP-02 es el punto de partida.
- No importar Firebase en Presentation; subir mediante puerto.
- Añadir límites de tamaño para controlar costes.

---

### PBL-016 — Enlace guest de solo lectura

**Priority:** P1 · **Effort:** L · **Depends:** PBL-001 · **Status:** TODO

#### Objetivo

Reducir la fricción para compartir un plan con personas externas sin darles edición.

#### Fases

- [ ] **a. Domain/Application:** modelo de enlace con token no adivinable, workspace, rol de solo lectura y estado activo/revocado; casos de uso crear/revocar.
- [ ] **b. Infrastructure:** persistencia Firestore y mapper.
- [ ] **c. Rules:** lectura de workspace y elementos solo con token válido; tests.
- [ ] **d. Presentation:** acción "Copy view link" en el share dialog, modo de solo lectura y estado de enlace revocado.
- [ ] **e. E2E:** abrir enlace en sesión anónima y verificar que no se puede editar.

#### Criterios de aceptación

- [ ] El enlace no permite editar ni acceder a miembros, invitaciones o comentarios.
- [ ] El owner puede revocarlo y deja de funcionar de inmediato.
- [ ] El token no se deduce del workspaceId.
- [ ] Rules tests cubren acceso válido, revocado y manipulado.
- [ ] Quality gates en verde.

#### Fuera de alcance

- Edición por guest, comentarios de guest o enlaces con contraseña.
- Acceso anónimo a otros recursos.

#### Notas técnicas

- No implementar hasta que PBL-001 esté cerrado.
- La autorización vive en rules; la UI solo refleja el modo lectura.
- Revisar impacto en `ListWorkspaces` y navegación.

---

### PBL-017 — Vista presentación por frames

**Priority:** P2 · **Effort:** M · **Depends:** PBL-009 · **Status:** TODO

#### Objetivo

Convertir el tablero en un entregable narrable sin exportarlo.

#### Alcance

- Acción "Present" en la top bar.
- Recorrido secuencial por frames ordenados por posición.
- Controles anterior/siguiente, salir y contador.
- Ocultar toolbar y elementos de edición durante la presentación.
- Navegación con teclado y `Escape` para salir.
- Respetar solo lectura.

#### Criterios de aceptación

- [ ] La presentación encuadra cada frame correctamente.
- [ ] No se puede editar mientras se presenta.
- [ ] La navegación es accesible y predecible.
- [ ] No se persiste estado de presentación.
- [ ] Tests de integración de controles y navegación.

#### Fuera de alcance

- Modo presentador compartido, temporizador o transiciones animadas.
- Export a PDF de la presentación.

#### Notas técnicas

- Reutilizar `CanvasViewportStore` y el encuadre de fit existente.
- El orden de frames se deriva de posiciones; no añadir campo de orden.

---

### PBL-018 — Notificaciones in-app

**Priority:** P2 · **Effort:** S · **Depends:** — · **Status:** TODO · **Quick win**

#### Objetivo

Cerrar el bucle de invitaciones sin introducir email ni backend nuevo.

#### Alcance

- Badge con el número de invitaciones pendientes en la navegación de workspaces.
- Aviso in-app al recibir una invitación nueva mientras la app está abierta.
- Acción directa para aceptar o abrir la invitación.
- Marcar como leída al aceptar o descartar.

#### Criterios de aceptación

- [ ] El badge refleja las invitaciones pendientes del email autenticado.
- [ ] Aceptar actualiza el badge y la lista.
- [ ] No se muestran datos de invitaciones de otros usuarios.
- [ ] Es accesible y tiene textos i18n.
- [ ] Tests de integración del badge y del aviso.

#### Fuera de alcance

- Email, push notifications o digest.
- Centro de notificaciones con historial completo.

#### Notas técnicas

- Reutilizar `ListPendingInvitationsForUser` y la lista de pendientes existente.
- No añadir persistencia nueva.

---

## 8. Registro de sesiones

Añadir una línea por sesión. El detalle técnico extenso sigue viviendo en `docs/adr/session-log.md` cuando haya decisiones relevantes.

| Fecha      | Tarea   | Resultado | Notas                                                                                                                                                                                                                                                                                                            |
| ---------- | ------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-19 | —       | Creado    | Creación del backlog post-MVP y priorización inicial.                                                                                                                                                                                                                                                            |
| 2026-10-19 | PBL-002 | DONE      | Borrado de workspace desde la card con confirmación; roles por workspace desde `ListWorkspaces`; unit, integración y E2E.                                                                                                                                                                                        |
| 2026-10-19 | PBL-001 | DONE      | Lecturas de workspaces/invitations acotadas por membership/destinatario; accept con `email_verified`; flujo de verificación con envío y refresh; rules, unit, integración y E2E.                                                                                                                                 |
| 2026-10-19 | PBL-003 | DONE      | Paleta de 5 colores de tema en el menú contextual de nota, reset a por defecto, `color: null` en `UpdateElement`, undo/redo, persistencia y E2E.                                                                                                                                                                 |
| 2026-10-19 | PBL-004 | DONE      | Ayuda de atajos accesible desde `?` y la top bar; catálogo puro por contextos, i18n en/es, foco atrapado, cierre con `Escape` y tests de contenido.                                                                                                                                                              |
| 2026-10-19 | PBL-005 | DONE      | Export JSON versionado y descarga desde browser; vista imprimible escalada con `window.print()`; disponible para Owner, Editor y Viewer; serializer puro, i18n, unit, integración y E2E.                                                                                                                         |
| 2026-10-19 | PBL-006 | DONE      | Duplicado owner-only desde la card con actualización del listado y apertura manual; copia de metadatos y elementos con IDs nuevos, remapeo de conectores y frames, compensación best-effort, i18n, unit, integración y E2E.                                                                                      |
| 2026-10-19 | PBL-006 | DONE      | Follow-up: edición de nombre y descripción desde la card con icono y diálogo; acciones de card compactadas en iconos accesibles; unit, integración y E2E.                                                                                                                                                        |
| 2026-10-19 | PBL-007 | DONE      | Plantillas puras de retrospectiva, kickoff y brainstorming; selector Blank/Template en el diálogo; elementos con IDs nuevos y rollback best-effort; empty state del board con CTA; i18n en/es, unit, integración y E2E.                                                                                          |
| 2026-10-20 | PBL-008 | DONE      | Command palette en Workspaces y board con Cmd/Ctrl + K; acciones de creación (incluido conector libre y ligado), fit, undo/redo, compartir, atajos y navegación; búsqueda de workspaces y elementos; `CanvasCommandHandle`, búsqueda pura, i18n en/es, unit, integración y E2E.                                  |
| 2026-10-20 | PBL-009 | DONE      | Vista Plan de tareas derivada de `elements`: selector puro `selectTaskPlan`, panel lateral con filtros por estado y “Mis tareas”, selección/centrado vía `focusElement`, cambio de estado con `UpdateElement`, solo lectura, empty states, i18n en/es, unit, integración y E2E.                                  |
| 2026-10-20 | PBL-010 | DONE      | Crear tarea desde nota o frame: extracción pura de texto plano y posición desplazada en Application; acción accesible en el menú contextual, deshabilitada sin texto y oculta en solo lectura; título truncado con notas completas, selección de la tarea nueva, undo/redo, i18n en/es, unit, integración y E2E. |
| 2026-10-20 | PBL-011 | DONE      | Kanban del plan: `selectTaskPlanBoard` con columna por estado y `selectTaskPlan` derivado; toggle Lista/Board con `Tabs`, contadores, empty states por columna, cambio de estado accesible reutilizando `UpdateElement`, solo lectura, i18n en/es, unit, integración y E2E.                                      |
| 2026-10-20 | PBL-012 | DONE      | Alineación y distribución: `alignElements`/`distributeElements` puros con huecos iguales, conectores excluidos y no-op sin historial; desplegable accesible en la toolbar, persistencia con `commitElements`, undo/redo en un paso, solo lectura, i18n en/es, unit, integración y E2E.                           |
| 2026-10-20 | PBL-013 | DONE      | Comentarios por elemento: `Comment`/`CommentId` con resolución única, puerto y casos de uso, subcolección Firestore con mapper, rules por membership, panel desde la top bar ligado a la selección, viewers pueden comentar, i18n en/es, unit, integración, rules y E2E.                                         |
| 2026-10-20 | PBL-014 | DONE      | Temporizador local en la top bar: presets 1/3/5/10 min, reducer puro con `endsAt`, controles iniciar/pausar/reanudar/reiniciar, tiempo accesible sin interrupciones y diálogo central al finalizar con opción de reiniciar; estado aislado sin Firestore, i18n en/es, unit con fake timers, integración y E2E.   |

---

## 9. Parking lot

Ideas valiosas que no entran todavía para no diluir el foco ni la sencillez:

- Reacciones efímeras y "levantar mano".
- Seguir presentador / sincronizar viewport.
- Temporizador compartido entre participantes.
- Historial de versiones y restauración.
- Notificaciones por email y digest.
- Offline-first y cache local.
- Responsive avanzado para tablet y gestos táctiles.
- Agrupación de elementos y panel de capas.
- Snap guides y alineación inteligente.
- Drag & drop en el kanban.
- Estados y campos personalizados de tarea.
- Embeds (Figma, YouTube, Google Docs).
- Integraciones (Google Calendar, Slack, Notion, Drive).
- Resumen de tablero asistido por IA.
- Marketplace o plantillas creadas por usuarios.
- Billing, analytics avanzadas y roles personalizados.

Criterio para desbloquear una idea del parking:

1. Resuelve una fricción observada en usuarios reales.
2. No duplica una fuente de verdad existente.
3. Cabe en una tarea `S` o `M`, o se puede dividir en fases claras.
4. No exige una dependencia o infraestructura nueva sin ADR.
