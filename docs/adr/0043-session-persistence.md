# ADR-0043: Persistencia de sesión y “Recordarme” (CACH-UX-006)

**Fecha:** 2026-10-21
**Estado:** Aceptado

## Contexto

Firebase Auth persiste la sesión por defecto y elige la mejor persistencia disponible (`indexedDBLocalPersistence`, `browserLocalPersistence` o `browserSessionPersistence`). Hasta ahora la aplicación no configuraba ese comportamiento de forma explícita: al iniciar sesión, la sesión sobrevivía al cierre del navegador.

El producto quiere que la persona decida si su sesión debe mantenerse al cerrar el navegador o limitarse a la pestaña actual. La opción no debe guardar la contraseña ni introducir coste adicional en Firebase, y debe conservar el comportamiento actual por defecto para no romper flujos existentes.

## Decisión

1. **La elección vive en Application.** `AuthPort` expone `setSessionPersistence(mode: 'local' | 'session')`. El tipo `SessionPersistence` se define en `src/application/ports/auth-port.ts`; ni Application ni Presentation conocen Firebase.

2. **El adapter de Firebase traduce la intención al SDK.** `createFirebaseAuthAdapter` implementa el método con `setPersistence(auth, browserLocalPersistence | browserSessionPersistence)` y convierte cualquier fallo con `mapFirebaseError`.

3. **La persistencia se configura antes de `signIn`.** `createLoginUser` llama a `setSessionPersistence` dentro del mismo `try` que autentica. Si la persistencia falla, no se intenta el login y el error se devuelve como `AppError`.

4. **“Recordarme” está marcado por defecto.** `LoginUserInput.remember` es opcional y se interpreta como `true` salvo que sea explícitamente `false`. Así se preserva el comportamiento existente para cualquier consumidor que no envíe el campo.

   | Valor de `remember` | Persistencia |
   | ------------------- | ------------ |
   | ausente o `true`    | `local`      |
   | `false`             | `session`    |

5. **El formulario solo envía la preferencia.** El checkbox usa el `Checkbox` de `@raulrod/ui`, está marcado por defecto y pasa `remember` al comando. No se almacena la contraseña ni se escribe nada en Firestore.

6. **Los errores de persistencia se mapean.** `auth/web-storage-unsupported` se traduce a `persistence`/`PERSISTENCE_UNAVAILABLE`; los tipos de persistencia inválidos o no soportados se tratan como configuración incorrecta (`AUTH_APP_MISCONFIGURED`). La UI no muestra códigos crudos del proveedor.

7. **Se descarta la persistencia en memoria.** `inMemoryPersistence` haría que recargar la página cerrara la sesión, lo que contradice el comportamiento esperado del login.

## Alternativas consideradas

- **No añadir la opción y dejar el comportamiento por defecto:** rechazado; el producto necesita una elección explícita para dispositivos compartidos.
- **Guardar la preferencia en Firestore o en el perfil:** rechazado; la persistencia es local al navegador, no un dato de la cuenta, y añadiría lecturas/escrituras.
- **Usar `inMemoryPersistence` al desmarcar:** rechazado; una recarga en la misma pestaña cerraría la sesión.
- **Configurar la persistencia también en el registro:** fuera de alcance; el registro mantiene el comportamiento actual (`local`) y el login es el único punto con elección.

## Consecuencias

- Con “Recordarme” marcado, la sesión se conserva al cerrar el navegador y se comparte entre pestañas del mismo perfil.
- Sin marcar, la sesión vive en el almacenamiento de la pestaña; abrir una pestaña nueva o cerrar la actual exige iniciar sesión de nuevo.
- La preferencia se aplica en el siguiente login. Cambiarla no cierra la sesión actual.
- No hay coste de Firebase: `setPersistence` es una operación local del SDK.
- En navegadores que bloquean almacenamiento persistente, el login puede fallar con un error de persistencia ya mapeado; el usuario puede reintentar sin “Recordarme”.
- Los tests de aplicación usan `FakeAuthPort`, que registra el modo solicitado; el adapter se prueba con el SDK mockeado; el e2e verifica el comportamiento entre pestañas.

## Referencias

- `docs/adr/0002-auth-port-adapter.md`
- `docs/CACHIPLUNCA_UX_IMPROVEMENTS_JIRA.md` — `CACH-UX-006`
