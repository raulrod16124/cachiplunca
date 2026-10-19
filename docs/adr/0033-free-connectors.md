# ADR-0033: Conectores libres y anclaje al borde

**Fecha:** 2026-10-19
**Estado:** Aceptado

## Contexto

El canvas solo permitía crear conectores entre exactamente dos elementos
seleccionados. El conector guardaba `position/size` como el bounding box de
ambos elementos en el momento de la creación y dibujaba una diagonal fija
`2% → 98%` de esa caja. Al mover los elementos, la caja quedaba obsoleta, y el
hit-test basado en bounds hacía que el conector interceptara clics sobre el
contenido. No existía un conector independiente que el usuario pudiera ajustar.

Aplicaciones consolidadas resuelven el problema de forma convergente:
Excalidraw usa flechas con puntos locales y bindings opcionales; tldraw calcula
los extremos desde la geometría de la shape enlazada; Miro/FigJam dibujan los
conectores en una capa por debajo de los nodos y los anclan al borde.

## Decisión

1. **Un único tipo `connector` con extremos opcionales.** Cada extremo es
   `ElementId` (ligado) o `Position` local (libre), nunca ambos. Los documentos
   antiguos con dos `ElementId` siguen cargando sin migración.
2. **Puntos locales para los extremos libres.** Se almacenan relativos a
   `element.position`; mover, duplicar, pegar y rotar reutilizan los comandos
   existentes sin tocar los puntos. Arrastrar un extremo recalcula `position` y
   `size` a la caja de ambos puntos.
3. **Geometría derivada para conectores ligados.** Una función pura de
   Application (`resolveConnectorGeometry`) cruza el rayo centro-centro con el
   rectángulo de cada elemento y añade un gap. No se persiste la geometría: todos
   los clientes la recalculan desde los elementos actuales.
4. **Capa de conectores por debajo de los nodos.** Los conectores se renderizan
   primero; el wrapper tiene `pointer-events: none` y solo el trazo (con un hit
   path más ancho) recibe clics. El hit-test prioriza cajas de contenido sobre
   segmentos y usa distancia al segmento con tolerancia.
5. **Dos acciones explícitas en la toolbar.** “Add connector” crea un conector
   libre centrado en el viewport; “Connect selected elements” exige exactamente
   dos elementos no-conector. Un conector libre seleccionado muestra handles de
   extremo arrastrables.
6. **Borrado en cascada.** Al eliminar un elemento se eliminan los conectores
   ligados a él, reutilizando historial y persistencia existentes.

## Alternativas consideradas

- **Tipo nuevo `free-connector` o `line`:** rejected; duplicaba el concepto,
  renderer y acciones de toolbar, y complicaba el remapeo futuro de bindings.
- **Persistir la geometría resuelta de los ligados:** rejected; genera escrituras
  y conflictos por cada movimiento de nodo y no es necesaria porque la geometría
  es determinista en todos los clientes.
- **Puntos absolutos:** rejected; obliga a modificar mover/duplicar/pegar y
  rompe la reutilización de los comandos existentes.
- **Routing ortogonal/curvo o puertos fijos:** fuera de alcance; el anclaje
  automático al borde cubre el requisito actual y deja espacio para añadir
  routing después.

## Consecuencias

- El conector ligado no se puede mover como bloque (su geometría depende de los
  nodos); el libre sí.
- El anclaje usa bounds sin rotación, coherente con el resto del canvas.
- Los conectores quedan siempre detrás de los nodos y no participan en
  “bring to front/send to back”.
- Copiar/pegar un conector ligado conserva sus extremos originales; remapearlos
  cuando también se copian los nodos queda para una tarea futura.
