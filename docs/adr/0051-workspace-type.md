# ADR-0051: Tipo de tablero con icono propio (CACH-PRD-007)

**Fecha:** 2026-10-29
**Estado:** Aceptado

## Contexto

Los tableros no tenían un tipo de producto: `Workspace` solo guardaba nombre,
descripción, portada, autor y fechas. La lista y el topbar derivaban un icono
genérico (`LayoutGrid`) o del tono calculado a partir del nombre. El usuario
quiere que el tipo sea una propiedad real, persistida y editable, visible como
icono cuando no hay portada.

El tipo es un metadato compartido del tablero. Debe poder elegirse al crear y
editar, viajar por el puerto y los comandos, y validarse en las reglas de
Firestore, que son la frontera de seguridad.

## Decisión

1. **Tipo en el dominio.** Se define `WORKSPACE_TYPES = ['general', 'work',
'travel', 'tasks', 'ideas']` y `WorkspaceType` en
   `src/domain/workspace/workspace.ts`. `Workspace` expone `type`, lo acepta en
   `create` y `update`, y rechaza valores fuera del conjunto con
   `Invalid workspace type`. El valor por defecto es `general`.

2. **Compatibilidad con datos antiguos.** El mapper Firestore lee un `type`
   ausente o `null` como `general`; un valor fuera del conjunto produce error.
   `toWorkspaceDocument` escribe `type` de forma explícita. No se ejecuta
   migración de producción.

3. **Puerto, comandos y repositorio.** `WorkspaceCreateInput`,
   `WorkspaceUpdateInput`, `CreateWorkspaceInput`, `UpdateWorkspaceInput` y
   `CreateWorkspaceWithOwnerInput` aceptan `type` opcional. El repositorio
   Firestore escribe `type` en `create` y lo actualiza solo si viene en el
   input, igual que nombre y descripción. `duplicate-workspace` propaga
   `type: source.type` para que la copia conserve la identidad.

4. **Reglas de Firestore.** `create` acepta `type` ausente o uno de los cinco
   valores. `update` del owner admite `type` dentro de las claves permitidas y
   valida el conjunto. Un documento antiguo sin `type` puede actualizarse sin
   tocar ese campo. Los editores siguen limitados a `lastActivityAt`.

5. **Presentación.** `WorkspaceTypeIcon` centraliza el mapeo
   `general → Shapes`, `work → LayoutGrid`, `travel → CalendarDays`,
   `tasks → ClipboardList`, `ideas → Sparkles`, todos existentes en
   `@raulrod/icons`. La lista, la fila y el topbar usan el icono del tipo
   cuando no hay portada; la portada conserva prioridad. El tono calculado se
   mantiene como decoración de fondo, no como fuente del icono.

6. **Selector accesible.** Crear y editar tablero ofrecen los cinco tipos con
   etiquetas ES/EN y nombre accesible. El icono es decorativo porque el nombre
   del tipo está disponible en el selector.

## Alternativas consideradas

- **Derivar el tipo del nombre o del tono:** rechazada; no es editable ni
  persiste una intención real del usuario.
- **Tipos personalizados por usuario:** fuera de alcance; añade modelo,
  reglas e índices sin necesidad actual.
- **Migrar documentos existentes con un script:** rechazada; el fallback en
  lectura resuelve la compatibilidad sin tocar producción.
- **Validar solo en cliente:** rechazada; las reglas son la frontera de
  seguridad.
- **Cambiar el layout del canvas según el tipo:** fuera de alcance; el tipo es
  identidad del tablero, no comportamiento del lienzo.

## Consecuencias

- Los tableros tienen identidad de producto visible y editable.
- Los documentos antiguos siguen funcionando sin migración ni escrituras.
- La lista de tipos es extensible: añadir uno requiere dominio, mapper, reglas,
  i18n, icono y tests.
- El icono deja de depender del tono; el tono permanece como decoración.
- El modelo `Workspace` cambia, por lo que fixtures y expectativas deben
  incluir `type`.

## Referencias

- `docs/jiras/2026-10-28-product-polish-jira.md` — `CACH-PRD-007`
- `src/domain/workspace/workspace.ts`
- `src/application/ports/workspace-repository.ts`
- `src/application/commands/`
- `src/infrastructure/firebase/firebase-workspace-mapper.ts`
- `src/infrastructure/firebase/firebase-workspace-repository.ts`
- `firestore.rules`
- `src/presentation/components/workspace-type-icon.tsx`
- `src/presentation/components/workspace-cover.tsx`
- `src/presentation/features/workspaces/components/`
- `src/presentation/features/workspace-shell/components/workspace-top-bar.tsx`
