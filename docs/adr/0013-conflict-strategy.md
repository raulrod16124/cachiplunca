# ADR-0013: Estrategia de conflictos (Last-Write-Wins por elemento)

**Fecha:** 2026-10-12
**Estado:** Aceptado

## Contexto

El MVP de colaboración (§5 del backlog) exige una **estrategia de consistencia simple** para cambios concurrentes: actualizaciones locales optimistas, persistencia automática y sincronización realtime, **sin CRDT**. Las tareas previas dejaron la política implícita y dispersa:

- ADR-0010 introdujo `applyRemoteElementChanges` con un guard monotónico mínimo (`isStrictlyNewer`) y difirió **explícitamente** “Last-Write-Wins completo y resolución de empates” a TASK-081.
- ADR-0011 introdujo `rollbackFailedMutation` reutilizando el mismo guard.
- ADR-0012 cerró la reconexión sin tocar la semántica de conflictos.

El problema: `isStrictlyNewer` no resuelve empates (`updatedAt` igual), por lo que dos réplicas podían **divergir** si recibían las mismas dos versiones en distinto orden de llegada. Además, la política no estaba documentada ni unificada en un único lugar.

## Decisión

1. **Módulo puro en Application.** Nuevo `src/application/services/element-conflict-resolution.ts`, sin React ni Firebase, como **única fuente de verdad** de la política de conflictos. Exporta `compareElementVersions`, `isStrictlyNewer`, `resolveElementVersion` y `canonicalizeElement`.

2. **LWW por elemento sobre `updatedAt`.** `compareElementVersions` define un orden total por `updatedAt`. La resolución es **por elemento** (`id`), de modo que operaciones concurrentes sobre elementos distintos nunca colisionan: cada documento es su propio dominio de conflicto. Esto habilita las “operaciones independientes por elemento” del backlog.

3. **Desempate determinista y simétrico.** `resolveElementVersion(a, b)` devuelve la versión con `updatedAt` mayor; en empate, la de **serialización canónica mayor** (`canonicalizeElement` ordena claves y normaliza `Date` a ISO). Es **simétrica** (`resolveElementVersion(a, b) === resolveElementVersion(b, a)`) y por tanto **convergente**: todas las réplicas llegan al mismo resultado con independencia del orden de llegada. El desempate canónico actúa solo como último recurso (empates de milisegundo) y no introduce ni `updatedBy` ni contador de versión.

4. **El reducer remoto usa el resolutor.** `applyRemoteElementChanges` reemplaza el guard `isStrictlyNewer` por `resolveElementVersion(incoming, existing) === incoming`, conservando el resto del contrato de ADR-0010 (ignorar `origin: 'local'`, aislar por workspace, ordenar con `sortElementsForLoad` y devolver la misma referencia si no hay cambios).

5. **Asimetría deliberada en el rollback.** `rollbackFailedMutation` **mantiene** `isStrictlyNewer` (estrictamente mayor), no el desempate canónico. En un rollback, un empate significa que la versión actual **es** la mutación optimista que se va a revertir; tratar un remoto con el mismo milisegundo como “ganador” impediría revertir. Se documenta como decisión intencional, coherente con ADR-0011.

6. **Borrado remoto gana en el MVP.** Un cambio `removed` remoto elimina el elemento sin comparación de versión (un borrado no transporta `updatedAt`). El modelado de borrados con marca de tiempo queda fuera del MVP.

7. **Sin CRDT, sin versionado.** No se introduce CRDT, reloj vectorial ni contador de revisión (explícitamente fuera de alcance). LWW por `updatedAt` es suficiente para el MVP.

8. **Sin listeners nuevos.** La estrategia no altera el lifecycle realtime; sigue apoyándose en `RealtimeSubscriptionManager` (ADR-0008), que garantiza una única suscripción al port por workspace (“no se crean listeners duplicados”).

## Alternativas consideradas

- **Mantener el guard “incumbent gana en empate” (sin desempate):** rechazada; determinista por cliente pero no convergente entre réplicas ante distinto orden de llegada.
- **Añadir `updatedBy`/contador de versión al dominio:** rechazada; implica cambio de esquema, mappers y persistencia para resolver un caso límite que el desempate canónico ya cubre sin coste estructural.
- **Comparar propiedades individuales (merge por campo):** rechazada; excede el “LWW para propiedades simples” y roza la semántica de CRDT que el MVP prohíbe.
- **CRDT (p. ej. Yjs/Automerge):** fuera de alcance por §5; sería un ADR propio y una dependencia estructural nueva.
- **Resolución de conflictos en Infrastructure/adapter:** rechazada; la política es regla de negocio/consistencia y debe ser pura y testeable sin Firebase.

## Consecuencias

- Existe una política de conflictos **explícita, pura, determinista y convergente**, en un único módulo reutilizado por los caminos remoto y de rollback.
- Los conflictos previsibles (mismo elemento, distinto `updatedAt`; empate de `updatedAt`) tienen resultado definido y reproducible; elementos distintos no interfieren.
- ADR-0010/0011 quedan implementados sin reabrir el port, el adapter ni la persistencia.
- Fuera de alcance y diferido: historial local frente a cambios remotos (TASK-088), presencia/cursores (TASK-082/084) y CRDT/offline-first completo.
