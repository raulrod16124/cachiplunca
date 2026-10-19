# Cachiplunca — Known Gaps (MVP)

> Huecos conocidos detectados durante la verificación E2E del flujo MVP (2026-10-16). Cada gap incluye impacto, evidencia y condición de cierre. Fuente complementaria de `docs/mvp-backlog.md`.

---

## GAP-01 — No hay UI para editar contenido de elementos (P0)

**Estado:** cerrado (2026-10-16) · **Impacto:** alto (el tablero acepta elementos pero nacían vacíos y no se podían rellenar)

El comando `UpdateElement` existía testeado pero no estaba cableado en Presentation. Se ha completado el journey de edición:

- Registro de renderers por defecto (`default-renderer-registry.ts`) conectado en `Canvas`; antes de esto **ningún** elemento usaba su renderer real (todos caían al `DefaultElementRenderer`, una caja vacía), por lo que ni el contenido existente se veía.
- Edición inline vía `ElementEditorOverlay` (`src/presentation/canvas/components/element-editor-overlay.tsx`): doble clic o Enter con un elemento seleccionado abre un editor in-place (textarea para text/note, input para title de task/frame, dos campos para link). Enter con Ctrl/Cmd y blur confirman; Escape cancela; los cambios se commitean por `UpdateElement` y se persisten con el batcher existente.
- Los elementos recién creados entran directamente en modo edición.
- Tests: unitarios del overlay, integración de `Canvas` (doble clic/Enter/commit/readOnly), container (`handleUpdateElement` + persistencia) y E2E (`edits text inline and persists it across reloads`).

**Condición de cierre cumplida:** `UpdateElement` conectado con los renderers, con tests de integración y E2E.

---

## GAP-02 — No existe el tipo de elemento `image` ni storage de imágenes

**Estado:** documentado · **Impacto:** medio (funcionalidad esperada por usuarios, fuera del alcance actual)

- `ELEMENT_TYPES` (`src/domain/element/element-types.ts`) define `text | note | task | frame | connector | link`; no hay `image`.
- `src/infrastructure/storage/` está vacío: no hay adapter de Firebase Storage ni puerto de subida de ficheros.
- Subir/almacenar/servear imágenes requiere: tipo de dominio, puerto + adapter de storage, reglas de Storage, quotas y UI de inserción. No está en "MVP incluye" ni en "Fuera del MVP" de `docs/mvp-backlog.md`; queda explícito aquí como gap.

**Condición de cierre:** decisión de producto (incluir en MVP o posponer a post-MVP) y, si se incluye, tarea dedicada con alcance completo (dominio + storage + rules + UI).

---

## GAP-03 — No hay UI para borrar un workspace

**Estado:** abierto · **Impacto:** bajo-medio

`deleteWorkspace` existe como comando pero no se pasa desde `App.tsx` ni hay botón/dialogo de borrado en la UI (solo "Leave workspace" en el share dialog). TASK-102 cubrió la autorización del borrado, no la presentación.

**Condición de cierre:** tarea de UI (confirmación destructiva + wiring del comando + E2E).

---

## GAP-04 — Limitaciones heredadas de ADR-0023 (Security Rules)

**Estado:** conocido/aceptado · **Impacto:** medio en producción, nulo con emuladores

- Cualquier usuario autenticado puede leer workspaces ajenos (`firestore.rules`). La UI ya acota "Your workspaces" a las memberships del usuario (`ListWorkspaces`), pero la frontera de lectura sigue siendo global; el cierre completo es TASK-127.
- El email del invitado no se verifica antes de aceptar la invitación (TODO TASK-127). La lista de invitaciones pendientes por email y el accept desde esa lista reutilizan la misma comprobación de email que el enlace; siguen sujetos a este gap.
- El banner "Running in emulator mode…" lo inyecta el SDK de Firebase en dev; no es código de la app.

**Condición de cierre:** TASK-127/126 (parcialmente DONE según backlog) + reglas de lectura por membership.

---

## Checklist manual — Fase 2 (post E2E automatizado)

Lo siguiente no lo cubre la suite Playwright actual y debe verificarse manualmente antes de declare de MVP:

- [x] **Edición de contenido (GAP-01):** crear elemento → doble clic → escribir → persiste tras reload (cubierto también por E2E automatizado).
- [ ] **Imágenes (GAP-02):** confirmar con producto si el MVP las requiere.
- [ ] **Borrado de workspace (GAP-03).**
- [ ] **Multi-usuario en tiempo real:** dos navegadores en el mismo tablero → cursores remotos, elementos que aparecen en ambos, estado de conexión.
- [ ] **Reconexión:** cortar red 10s en el board → badge de reconexión → recuperación sin perder cambios.
- [ ] **Cross-browser:** smoke en Firefox/Safari (la suite E2E solo usa Chromium).
- [ ] **Responsive:** uso real en tablet (el layout es de escritorio).
- [ ] **Screen reader:** recorrido VoiceOver/NVDA del board (la suite cubre áRIA tree, no lectura real).
- [ ] **Rendimiento real:** harness de `src/test/perf/browser` con 1000+ elementos en máquina real.

---

## E2E automatizado (cerrado en esta fase)

La suite Playwright (`e2e/`, 12 specs) cubre el journey MVP feliz y negativos contra emuladores Firebase con `firestore.rules` reales:

- registro → login → logout;
- creación de workspace → board con toolbar usable (regresión del bug de altura 0 del canvas);
- crear elementos, undo/redo/delete, persistencia tras reload;
- compartir: invitar Viewer → aceptar invitación → board de solo lectura con badge "View only";
- negativos: token inválido, nombre vacío, acciones destructivas deshabilitadas en tablero vacío.

Ejecución: `./scripts/e2e.sh` (requiere Java para el emulador de Firestore; Chromium instalado con `npx playwright install chromium`).
