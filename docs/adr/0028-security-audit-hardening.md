# ADR-0028: Endurecimiento de reglas tras la auditoría de seguridad (TASK-120)

**Fecha:** 2026-10-15
**Estado:** Aceptado
**Tarea:** TASK-120 — Security audit (`docs/mvp-backlog.md`)

## Contexto

TASK-120 audita la postura de seguridad del MVP. La autorización efectiva vive en
`firestore.rules` (ADR-0023), replicando la `PERMISSION_MATRIX` de ADR-0021; la UI
solo refleja permisos (ADR-0022). El informe completo está en
`docs/audits/security-audit.md`.

La auditoría confirma controles sólidos (sin sinks XSS, token de invitación con
CSPRNG + SHA-256, errores traducidos, `storage.rules` deny-all) y detecta una
escalada **Critical**: `memberships.create` admite self-join con `role` arbitrario,
de modo que cualquier autenticado puede crear `memberships/{ws}_{uid}` con
`role: 'owner'`. Como `workspaces.read` es global (limitación ya anotada en
ADR-0023), puede enumerar los ids y tomar el control de cualquier workspace. Un
editor puede además invitar con `role: 'owner'` y auto-asignarse `owner`.

La corrección de esa escalada cambia el modelo de autorización/persistencia
(anclar la membership a una invitación válida o a la propiedad del workspace),
exige ADR y tarea propia, y no debe colarse en una auditoría.

## Decisión

1. **En TASK-120 se corrigen los hallazgos acotados que no cambian el modelo:**

   - **Invitaciones (High):** el `update` por owner/editor exige `resource.data.workspaceId`
     como workspace autorizador y prohíbe mutar `workspaceId`, `invitedBy`, `createdAt`
     y `tokenHash`. Cierra la inyección de invitaciones entre workspaces.
   - **Elementos (Low):** `createdBy` pasa a ser inmutable en `update` (evita spoofing de autoría).
   - **Guards (Low):** `resolveRedirect` rechaza targets con backslash, que los
     navegadores normalizan a URLs protocol-relative.

2. **La escalada por self-join (F1/F1a) se difiere a TASK-126** (P0, requiere ADR
   propio). Diseño recomendado: anclar la creación de membership a una invitación
   válida (el aceptante aporta `invitationId`/`tokenHash` y las rules validan email,
   workspace, rol y estado `pending` vía `get()`), o a la propiedad del workspace en
   la ruta de creación; y acotar el rol otorgable por rol del actor (solo `owner`
   concede `owner`). Mientras no se cierre, TASK-124 (validación final) depende de
   TASK-126.

3. **Las lecturas globales y la verificación de email se difieren a TASK-127** (P1):
   acotar `workspaces.read`/`invitations.read` a membership con índices y exigir
   `email_verified` en el accept.

4. **La suite de reglas es la frontera de regresión:** los cambios se acompañan de
   tests en `src/test/rules/firestore.rules.test.ts` (verificados en rojo contra las
   reglas previas y en verde tras el cambio).

## Alternativas consideradas

- **Parche de rules-only para el self-join:** rechazado; las rules no pueden
  consultar invitaciones sin un ancla en el documento, y restringir el auto-registro
  a `viewer` rompería las invitaciones de editor/owner. Requiere cambio de modelo.
- **Confiar en los guards del cliente para el rol otorgable:** rechazado (ADR-0022).
- **Endurecer `email_verified` en TASK-120:** rechazado; hoy no existe flujo de
  verificación y bloquearía la aceptación legítima. Se pospone a TASK-127.

## Consecuencias

- La inyección cross-workspace de invitaciones y el spoofing de `createdBy` quedan
  cerrados y cubiertos por tests.
- Persiste un riesgo **Critical** aceptado de forma transitoria: self-join con rol
  arbitrario. Queda documentado, con tarea P0 asignada y como dependencia de la
  validación final del MVP.
- TASK-126 introducirá el cambio de modelo de autorización y su propio ADR; TASK-127
  reducirá la exposición de PII y endurecerá la identidad.
