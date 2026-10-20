# ADR-0041: Enlaces guest de solo lectura con sesión anónima

**Fecha:** 2026-10-20
**Estado:** Aceptado
**Tarea:** PBL-016 — Enlace guest de solo lectura (`docs/post-mvp-backlog.md`)

## Contexto

PBL-016 reduce la fricción para compartir un tablero con personas externas sin
darles edición. Hasta ahora toda lectura de `workspaces` y `elements` exigía una
membership (ADR-0034), y no existe backend propio ni Cloud Functions. La
autorización efectiva debe seguir viviendo en Firestore Rules, sin duplicar el
tablero en una copia que se quedaría obsoleta.

El proyecto tiene habilitada la autenticación anónima de Firebase con limpieza de
cuentas anónimas a los 30 días, lo que permite identificar una sesión guest para
las rules sin pedir registro.

## Decisión

1. **Token aleatorio y hash como identidad del enlace.** El enlace contiene un
   token de 256 bits (`crypto.getRandomValues`, base64url). Solo se persiste su
   hash SHA-256 como id de `guest_links/{tokenHash}`. El token no se guarda y se
   muestra una única vez en el share dialog; si se pierde, se crea otro enlace.

2. **Entidad `GuestLink` en Domain.** Campos `tokenHash`, `workspaceId`,
   `createdBy`, `createdAt`, `updatedAt` y `revokedAt?`, con rol fijo `viewer`.
   Invariantes: hash SHA-256 hexadecimal, timestamps válidos y revocación
   idempotente. Domain sigue sin depender de React, Firebase ni UI.

3. **Un único enlace activo por workspace.** `createGuestLink` exige owner
   (`workspace:update`), revoca los enlaces activos anteriores y persiste uno
   nuevo. `revokeGuestLink` exige owner y es idempotente. La UI de owner lista
   los enlaces activos, pero no puede recuperar el token.

4. **Sesión guest como puente de autorización.** Al abrir `/view/:token`:
   - el cliente calcula el hash y hace `get` de `guest_links/{tokenHash}`
     (el id no adivinable actúa como capability);
   - si el enlace está revocado, muestra el estado sin autenticarse;
   - si está activo, garantiza una sesión de Firebase (reutiliza la del usuario
     si ya está autenticado; si no, `signInAnonymously`);
   - crea/actualiza `guest_sessions/{uid}` con `workspaceId` y `tokenHash`.

5. **Rules.**
   - `guest_links`: `get` por id (capability), `list` solo miembros, create y
     update (solo `revokedAt`/`updatedAt`) solo owner, delete denegado.
   - `guest_sessions`: solo el propio uid; create/update exige que el enlace
     exista, siga activo y pertenezca al mismo workspace.
   - `workspaces.read` y `elements.read`: membership **o** guest con sesión y
     enlace activos. `storage.rules` aplica el mismo criterio a las imágenes.
   - Memberships, invitations, comments y presence siguen siendo solo para
     miembros. Un guest no puede escribir elementos ni crear workspaces
     (se rechaza `sign_in_provider == 'anonymous'` en create).
   - Revocar actualiza `revokedAt`; las siguientes lecturas/escrituras fallan de
     inmediato.

6. **UI de solo lectura aislada.** `/view/:token` vive fuera de `RequireAuth` y
   renderiza una vista propia con el `Canvas` en `readOnly`, nombre del
   workspace, badge “View only” y estados loading/inválido/revocado/error. No
   monta share, miembros, comentarios, presencia, plan ni persistencia. Los
   guards tratan una sesión con `email === null` como guest y no la dejan entrar
   en las rutas normales de workspaces.

7. **i18n y accesibilidad.** Todos los textos nuevos están en `messages.ts`
   (en/es). La vista usa `aria-readonly`, headings y estados `role="status"` /
   `role="alert"` reutilizando los patrones existentes.

## Alternativas consideradas

- **Guardar una copia del workspace y sus elementos dentro del enlace:** rechazada;
  duplica la fuente de verdad, se queda obsoleta y rompe la expectativa de ver el
  tablero actual.
- **Custom claims o Cloud Functions para emitir tokens de guest:** rechazada;
  introduce backend nuevo cuando las rules y la sesión anónima cubren el caso.
- **Permitir lectura anónima de `workspaces`/`elements` sin sesión:** rechazada;
  las rules no pueden ligar la petición a un token concreto sin una sesión.
- **Token en claro persistido para poder re-copiarlo:** rechazada; un enlace
  filtrado seguiría disponible y el token dejaría de ser de un solo uso.
- **Realtime en la vista guest:** fuera de alcance; la vista carga el estado al
  abrir. La revocación se aplica a la siguiente lectura y no se cachea en las
  rules.

## Consecuencias

- Compartir un tablero no requiere invitar ni crear una cuenta; el guest no
  accede a miembros, invitaciones, comentarios ni escritura.
- El owner controla el acceso con crear/revocar y el token es de un solo uso
  visible. No hay expiración propia del enlace; las cuentas anónimas se limpian
  a los 30 días según la configuración del proyecto.
- Las rules son la frontera efectiva; manipular el cliente no permite leer
  otros workspaces ni escribir.
- Firestore gana dos colecciones (`guest_links`, `guest_sessions`) y Storage una
  rama de lectura guest. No se añaden dependencias ni backend.
- Una pestaña guest ya cargada mantiene el tablero en memoria hasta recargar;
  las operaciones posteriores fallan por rules. Si se requiere invalidación
  visual inmediata, se puede añadir una suscripción/polling al documento del
  enlace en una tarea posterior.
