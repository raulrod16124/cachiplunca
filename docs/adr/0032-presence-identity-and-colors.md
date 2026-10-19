# ADR-0032: Identidad visible y colores de los participantes

**Fecha:** 2026-10-19
**Estado:** Aceptado
**Contexto:** Presencia colaborativa (TASK-082 a TASK-085, ADR-0014, ADR-0015)

## Contexto

La presencia efímera (`Presence`) solo transportaba `userId`, `workspaceId`,
`lastSeenAt` y `cursor`. Como las memberships tampoco guardan nombre ni email y
`user_settings` es privado, el top bar identificaba a cada colaborador con los
últimos ocho caracteres de su `userId`, y los cursores remotos usaban un color
derivado de un hash independiente. El resultado era difícil de leer cuando hay
varios usuarios: sin nombre reconocible, sin relación visual entre el avatar y
el cursor de la misma persona y sin forma de consultar la lista completa.

Aplicaciones consolidadas (Figma, Miro, Google Docs, Notion, Linear) comparten
un patrón: iniciales/nombre visible, tooltip o lista de participantes y un color
estable por usuario reutilizado en avatar y cursor.

## Decisión

1. **La presencia transporta una etiqueta resuelta, no el email.** Se añade
   `displayName: string | null` a `Presence`. En composición se resuelve con la
   función pura de dominio `resolveUserDisplayName`: nombre guardado (trim) →
   parte local del email (antes de `@`) → `null`. Nunca se persiste el email
   completo, minimizando la exposición de datos personales en la colección
   `presence`, que leen todos los miembros del workspace.

2. **Compatibilidad hacia atrás.** El mapper de Firestore omite el campo cuando
   es `null` y tolera documentos antiguos sin `displayName` (se leen como
   `null`). No se modifican las reglas de seguridad: la autorización sigue
   basada en `userId == request.auth.uid` y en la membership.

3. **Los cursores remotos también llevan la etiqueta.** `RemoteCursor` incorpora
   `displayName`, de modo que la etiqueta del cursor muestra el nombre resuelto
   y cae al identificador corto cuando no existe.

4. **Colores en la capa de presentación.** La paleta y la asignación viven en
   `src/presentation/collaboration/presence-colors.ts`. Cada workspace-shell
   mantiene un asignador de sesión que:
   - deriva un índice inicial estable del `userId`;
   - sondea la paleta hasta encontrar un color libre;
   - conserva el color del usuario mientras dure la vista;
   - garantiza colores distintos para los primeros N usuarios de la paleta
     (18 colores con contraste ≥ 4.9:1 frente a texto blanco) y reutiliza el
     menos usado solo cuando se agota (repetición inevitable).

   El mismo `userColors` se pasa al top bar y al canvas para que avatar y cursor
   compartan color. El color nunca es el único identificador: siempre va
   acompañado de nombre, iniciales o identificador corto.

5. **UI del top bar.** Stack de avatares coloreados con tooltip
   `nombre (id corto)`, indicador `+N` y un `Popover` con la lista completa de
   participantes (nombre + `ID` corto). Se mantiene el contador `N connected`
   como etiqueta visible y en una región `aria-live`.

## Alternativas consideradas

- **Persistir el email completo en `presence`:** rechazado por privacidad; la
  etiqueta resuelta cubre la necesidad de identificación.
- **Nueva colección `profiles`:** rechazada para el alcance actual; añade
  escrituras, reglas y lecturas adicionales para un dato que ya viaja con la
  presencia efímera.
- **Color aleatorio no determinista por render:** rechazado; rompe la
  asociación avatar/cursor y provoca parpadeos.
- **Color solo por hash del `userId`:** rechazado; puede colisionar entre
  usuarios concurrentes y no garantiza unicidad.
- **Usar `sessionStorage` para conservar colores entre recargas:** diferido; la
  sesión de la vista actual es suficiente y evita un estado obsoleto.

## Consecuencias

- Los colaboradores se identifican por nombre (o parte local del email) y el
  identificador corto queda como apoyo para nombres duplicados o ausentes.
- Avatar y cursor de un mismo usuario comparten color, lo que reduce el coste
  cognitivo al seguir su actividad.
- Las presencias antiguas siguen funcionando; al reanunciarse adoptan el nombre
  resuelto.
- Por encima de 18 usuarios concurrentes los colores se repiten; nombres,
  iniciales e identificadores mantienen la diferenciación.
- El coste de escritura no cambia: el campo adicional viaja en el mismo
  documento de presencia.
