# Administración de usuarios

Herramienta de terminal para inspeccionar usuarios de Firebase Auth, detectar
duplicados por email y borrar cuentas con limpieza de datos personales en
Firestore.

El script vive fuera de `src/` y usa `firebase-admin` como dependencia de
desarrollo. No participa en la aplicación ni en las fronteras de Clean
Architecture.

## Comandos

```bash
npm run admin:users -- doctor
npm run admin:users -- list --json
npm run admin:users -- duplicates --by mailbox
npm run admin:users -- delete --pattern '^viewer\+[0-9]+-[0-9]+@example\.com$' --dry-run
npm run admin:users -- cascade --uids-file .local/admin/users-<timestamp>.json
```

`delete` es dry-run por defecto. Solo borra con `--yes`.

## Entornos

### Emulador

```bash
npx firebase emulators:exec --only auth,firestore --project demo-cachiplunca \
  "node scripts/admin/users.mjs list --emulator"
```

O con los emuladores ya arrancados:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
npm run admin:users -- list
```

El proyecto de emulador debe empezar por `demo-`.

### Producción

El script usa Application Default Credentials por defecto:

```bash
gcloud auth application-default login
npm run admin:users -- list --project your-project-id
```

También acepta una service account:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/ruta/service-account.json \
npm run admin:users -- list --project your-project-id
```

También se puede usar `FIREBASE_SERVICE_ACCOUNT_PATH` o
`FIREBASE_SERVICE_ACCOUNT_JSON`. O explícitamente:

```bash
npm run admin:users -- list --project your-project-id \
  --service-account /ruta/service-account.json
```

La service account necesita, como mínimo:

- `roles/firebaseauth.admin` para Auth.
- `roles/datastore.user` para el cascade de Firestore.

No se imprimen credenciales ni secretos. Los reportes con emails se guardan en
`.local/admin/`, que está ignorado por git. Si usas `--report`, apunta a
`.local/admin/` o fuera del repositorio.

Este repositorio es público: no commitees service accounts, exports de Auth ni
reportes con emails o UIDs. Sustituye `your-project-id` por el ID real al
ejecutar los ejemplos.

## Identificar usuarios

```bash
npm run admin:users -- list
npm run admin:users -- list --json
npm run admin:users -- list --format csv
npm run admin:users -- list --signed-in
npm run admin:users -- list --never-signed-in
npm run admin:users -- list --verified
npm run admin:users -- list --unverified
npm run admin:users -- list --anonymous
npm run admin:users -- list --no-email
npm run admin:users -- list --disabled
```

Filtros disponibles: `--email`, `--domain`, `--suffix`, `--pattern`, `--status`,
`--signed-in`, `--authenticated`, `--never-signed-in`, `--verified`,
`--unverified`, `--anonymous`, `--no-anonymous`, `--no-email`, `--disabled`,
`--no-disabled`.

Estados calculados:

- `active`: tiene email, sesión iniciada y email verificado.
- `unverified`: tiene email y sesión, pero no está verificado.
- `never-signed-in`: existe en Auth pero no ha iniciado sesión.
- `disabled`: cuenta deshabilitada.
- `anonymous`: usuario anónimo sin email.
- `no-email`: usuario sin email que no es anónimo.

## Duplicados

```bash
npm run admin:users -- duplicates --by exact
npm run admin:users -- duplicates --by domain
npm run admin:users -- duplicates --by mailbox
npm run admin:users -- duplicates --by alias
```

Estrategias:

- `exact`: mismo email normalizado. Firebase normalmente impide duplicados
  exactos, pero puede ocurrir con importaciones o configuraciones especiales.
- `domain`: mismo dominio, por ejemplo todos los `@example.com`.
- `mailbox`: normaliza mayúsculas, etiquetas `+alias` y, en Gmail, puntos.
  `viewer+1792532133889-1@example.com` y `viewer@example.com` caen en el mismo
  grupo.
- `alias`: agrupa por la parte anterior al `+` y el dominio.

Cada grupo muestra un superviviente recomendado según `--keep-policy`:
`verified-first`, `recent-login`, `oldest` o `newest`.

## Borrado

```bash
npm run admin:users -- delete --email user@example.com --dry-run
npm run admin:users -- delete --domain example.com --max-delete 10 --dry-run
npm run admin:users -- delete --suffix '+qa@example.com' --unverified --dry-run
npm run admin:users -- delete --pattern '^viewer\+[0-9]+-[0-9]+@example\.com$' --dry-run
npm run admin:users -- delete --anonymous --dry-run
npm run admin:users -- delete --no-email --dry-run
```

`--anonymous` selecciona usuarios con proveedor anónimo. `--no-email` selecciona
usuarios sin email que no son anónimos. No se pueden combinar entre sí ni con
`--email`, `--domain`, `--suffix` o `--pattern`.

Para ejecutar:

```bash
npm run admin:users -- delete --pattern '^viewer\+[0-9]+-[0-9]+@example\.com$' --yes
```

Para limpiar duplicados conservando uno por grupo:

```bash
npm run admin:users -- delete --domain example.com \
  --group-by mailbox --keep-policy verified-first --dry-run
```

Protecciones:

- Sin `--yes` no se borra nada.
- `--max-delete` limita el número de cuentas; por defecto 50.
- Si se supera el límite hay que usar `--force`.
- Si un usuario es `owner` de algún workspace, se bloquea salvo `--force`.
- `--keep-uid` protege UIDs concretos.
- `--no-cascade` borra solo Auth.
- `--no-invitations` evita borrar invitaciones por email.

Antes de borrar en producción conviene exportar Auth:

```bash
firebase auth:export .local/auth-backup.json --project your-project-id
```

## Cascade de Firestore

Al borrar una cuenta se eliminan sus datos personales:

- `user_settings/{uid}`
- `guest_sessions/{uid}`
- `favorites` con `userId == uid`
- `memberships` con `userId == uid`
- `notifications` con `recipientId == uid`
- `presence` con `userId == uid`
- `invitations` con `email == email` de la cuenta

No se borra contenido compartido: `workspaces.createdBy`,
`comments.authorId`, `elements.createdBy`, `guest_links.createdBy`,
`notifications.actorId` ni `invitations.invitedBy`. Si se borra un owner hay que
transferir la propiedad o usar `--force` de forma consciente.

Auth y Firestore no comparten transacción. El script borra primero Auth, luego
Firestore y guarda un reporte con los UIDs eliminados. Si el cascade falla, se
puede reintentar de forma idempotente:

```bash
npm run admin:users -- cascade --uids-file .local/admin/users-<timestamp>.json --yes
```

## Tests

```bash
npm run test:admin
npm run test:admin:emulator
```

El primer comando prueba la lógica pura. El segundo levanta Auth y Firestore en
el emulador y verifica listado, duplicados, dry-run, borrado y cascade.
