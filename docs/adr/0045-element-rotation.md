# ADR-0045: Rotación de elementos en el canvas (CACH-UX-007)

**Fecha:** 2026-10-21
**Estado:** Aceptado

## Contexto

`BaseElement.rotation` existe en dominio, se valida, se persiste en Firestore y `ElementView` ya lo aplica al renderizar. Sin embargo, no existía ninguna interacción para cambiarlo desde el canvas: el overlay de selección solo ofrecía ocho handles de resize y el hit-test comprobaba el rectángulo sin rotación.

Añadir rotación afecta a tres piezas que deben mantenerse coherentes: la geometría pura, el hit-test de selección y el overlay visual. También debe integrarse con el historial y la persistencia existentes sin generar una entrada de undo por cada evento de puntero.

## Decisión

1. **La geometría vive en Application.** `src/application/services/element-rotate.ts` expone funciones puras para calcular el ángulo, normalizarlo a `[0, 360)`, aplicar snap y rotar un elemento con `withRotation`. El hook de Presentación solo orquesta eventos.

2. **El overlay rota con el elemento.** Para selección única no conectora, `SelectionOverlay` usa los mismos bounds y el mismo `transform: rotate(...)` que `ElementView`. El handle de rotación se sitúa sobre el borde superior y acompaña la rotación. No se muestra para conectores, selección múltiple, solo lectura ni presentación.

3. **El hit-test trabaja en espacio local.** `SelectableItem` incluye la rotación del elemento. Para comprobar un punto, se rota alrededor del centro del elemento en sentido inverso y luego se aplica `bounds.contains`. Para el marquee se usa el AABB de la caja rotada. La rotación `0` mantiene una ruta rápida idéntica al comportamiento anterior.

4. **Resize consciente de la rotación.** El delta del puntero se convierte al espacio local del elemento antes de calcular el nuevo tamaño. La caja conserva fijo el ancla opuesta del handle. Con rotación `0` el cálculo reduce al algoritmo existente, por lo que no cambia el comportamiento previo.

5. **Un gesto, una entrada de historial.** El gesto usa el patrón `transformGestureRef` con la etiqueta `Rotate elements`. Los movimientos intermedios se aplican y persisten mediante el flujo de move/resize; al terminar el gesto se registra una única ventana en `CommandHistory` y se hace flush de la persistencia.

6. **Teclado accesible.** El handle es un botón enfocable con nombre accesible. Las flechas izquierda/arriba restan `1°`, las derechas/abajo suman `1°`, y `Shift` aplica pasos de `15°`. Los eventos de flecha del handle no activan la navegación de selección del canvas. Se ignora la repetición automática para no inundar el historial.

7. **Sin cambios en dominio, Firebase ni UI compartida.** No se modifica `BaseElement.rotation`, el mapper de Firestore, las reglas ni `@raulrod/ui`. No se añaden dependencias.

## Alternativas consideradas

- **Hit-test por AABB rotado:** rechazado para selección por clic; produce falsos positivos en las esquinas vacías. Se mantiene solo para el marquee, donde el AABB es la semántica esperada.
- **Rotar el DOM desde el hook sin pasar por el dominio:** rechazado; el estado debe seguir viniendo de `Element`, y la rotación debe persistirse.
- **Registrar cada `pointermove` en el historial:** rechazado; un solo gesto generaría decenas de entradas de undo.
- **Rotación de conectores y selección múltiple:** fuera de alcance; requiere decidir semántica de anclajes y centro de selección.
- **Ignorar la rotación en resize:** rechazado; los handles rotados producirían saltos y tamaños inconsistentes.
- **Handle no enfocable o dentro de un contenedor `aria-hidden`:** rechazado; impediría la alternativa de teclado.

## Consecuencias

- La rotación es una interacción completa: overlay, hit-test, resize, historial, persistencia y teclado.
- Los datos existentes con `rotation` distinta de cero pasan a seleccionarse y manipularse correctamente.
- No hay migraciones ni cambios de esquema.
- La rotación de selección múltiple y de conectores queda como follow-up explícito.
- Los presupuestos de rendimiento de hit-test se mantienen para elementos sin rotación gracias a la ruta rápida.

## Referencias

- `docs/CACHIPLUNCA_UX_IMPROVEMENTS_JIRA.md` — `CACH-UX-007`
- `src/application/services/element-rotate.ts`
- `src/application/services/canvas-hit-test.ts`
- `src/presentation/canvas/components/selection-overlay.tsx`
- `src/presentation/canvas/hooks/use-element-rotate.ts`
