# CACHIPLUNCA — <FASE> MINI JIRA

> **Estado global:** TODO
> **Versión del documento:** 1.0
> **Última actualización:** <YYYY-MM-DD>
> **Fase anterior:** <ruta o ninguna>
> **Documentos de referencia:** `docs/architecture.md`, ADRs en `docs/adr/`
> **Naturaleza:** <producto / hardening / documentación>
> **Documento local:** este JIRA se mantiene fuera de git en `docs/jiras/`.

---

## Cómo usar este documento

1. Lee las secciones **1–4** antes de tocar código.
2. Localiza tu tarea (`<PREFIJO>-XXX`) en la **sección 8**.
3. Comprueba que sus dependencias estén en `DONE`.
4. Marca la tarea como `IN PROGRESS` antes de empezar.
5. Trabaja solo en los archivos listados en su ficha; si necesitas tocar otro,
   justifícalo en el PR.
6. Escribe o actualiza primero el test que describe el comportamiento nuevo.
7. Ejecuta las validaciones de la ficha y la **Definition of Done** de la
   sección 9.
8. Actualiza el estado y añade una línea al **Change Log** en el mismo cambio.
9. Si el cambio cruza capas, crea o actualiza el ADR indicado antes de
   implementar.

### Vocabulario de estados

- `TODO`: pendiente.
- `IN PROGRESS`: alguien está trabajando en ella.
- `BLOCKED`: espera una decisión, dependencia o ADR.
- `REVIEW`: implementada, pendiente de revisión funcional/visual.
- `DONE`: cumple la Definition of Done.

### Regla de oro

> Cada tarea debe dejar el producto mejor para el usuario sin empeorar la
> arquitectura, la accesibilidad, el rendimiento ni la mantenibilidad.

---

## 1. Objetivo y criterio de éxito

### Objetivo

...

### Criterio de éxito

...

### Fuera de alcance de la fase

- ...

---

## 2. Relación con fases anteriores

| Fase | Documento | Estado | Relación |
| ---- | --------- | ------ | -------- |
| ...  | ...       | ...    | ...      |

### Reglas heredadas

| Regla                            | Aplicación en esta fase                                   |
| -------------------------------- | --------------------------------------------------------- |
| TypeScript strict y evitar `any` | Obligatorio en todo el código nuevo.                      |
| Clean Architecture               | Sin imports prohibidos entre capas.                       |
| i18n                             | Textos visibles en ES y EN.                               |
| Accesibilidad                    | Controles alcanzables por teclado y con nombre accesible. |
| Tests                            | Test de regresión para cada bug y fakes para application. |

---

## 3. Restricciones de arquitectura

- `src/domain` no depende de React, Firebase, styled-components, `@raulrod/ui`,
  Node ni APIs del navegador.
- `src/application` solo conoce puertos; no importa React, UI, Firebase ni
  infraestructura.
- `src/infrastructure` implementa adapters.
- `src/presentation` no importa Firebase ni infraestructura.
- `src/app` es el único composition root.
- La autorización efectiva vive en las reglas de Firebase.

---

## 4. Flujo de trabajo por sesión

### Antes de empezar

1. `git status` limpio.
2. Rama `feat/<prefijo>-<nnn>-<slug>`.
3. Leer la ficha completa.
4. Leer los tests existentes de los archivos afectados.
5. Verificar dependencias y ADR.
6. Marcar la tarea `IN PROGRESS`.

### Durante la implementación

1. Test que falla primero.
2. Cambio mínimo.
3. Sin refactors colaterales.
4. i18n ES/EN en el mismo cambio.
5. Reglas, índices y tests de reglas si toca Firebase.

### Antes de cerrar

```bash
npx tsc -b --noEmit
npm run lint
npm run format:check
npm test
```

Añadir `npm run test:rules`, `npm run test:e2e` o `npm run perf` según el
alcance.

---

## 5. Buenas prácticas transversales

### Código

- TypeScript strict; evitar `any`.
- `unknown` + type guards en fronteras.
- Sin comentarios salvo decisión no obvia.
- Funciones puras para geometría, ordenación y clasificación.

### Estilos y Design System

- Usar tokens `--rr-*` y `--cach-*`; no hardcodear colores.
- `IconButton`/`ToolbarButton` con `label` obligatorio.
- `:focus-visible` en todo control interactivo.
- No modificar `@raulrod/ui` ni `@raulrod/tokens` en `node_modules`.

### i18n

- Todo texto visible pasa por `t()`.
- Añadir la clave en `en` y `es`.
- Sin literales en `aria-label`, `title`, `placeholder`, `alt` o JSX visible.

### Accesibilidad

- Acciones nuevas alcanzables por teclado.
- Foco estable al cerrar diálogos y popovers.
- Respetar `prefers-reduced-motion`.
- Revisar contraste en claro y oscuro.

### Tests

- Un bug corregido lleva test de regresión.
- Application con fakes; infrastructure mockea Firebase.
- Presentación verifica comportamiento visible.
- Sin snapshots para lógica de negocio.
- Sin retries para ocultar flakiness.

### Seguridad

- Las reglas de Firestore/Storage son la frontera de seguridad.
- Validar campos del cliente también en reglas.
- No permitir suplantación de usuario.

### Rendimiento

- Evitar re-renders innecesarios en canvas.
- Limpiar listeners globales.
- Agrupar escrituras de actividad cuando aplique.

---

## 6. Mapa de tareas

| ID              | Tarea | Prioridad | Tamaño | Riesgo | Capas        | Depende de | ADR |
| --------------- | ----- | --------- | ------ | ------ | ------------ | ---------- | --- |
| `<PREFIJO>-001` | ...   | P1        | M      | Medio  | Presentation | —          | No  |

### Tamaño orientativo

| Tamaño | Significado                                    |
| ------ | ---------------------------------------------- |
| S      | Menos de media jornada.                        |
| M      | Una jornada aproximadamente.                   |
| L      | Dos o tres jornadas; conviene dividir en PR.   |
| XL     | Más de tres jornadas; requiere plan detallado. |

---

## 7. Dependencias y orden recomendado

```text
Fase 0 — ...
  001 ──► 002
```

### Justificación

- ...

---

## 8. Task Backlog

<!-- Insertar aquí las fichas generadas con references/task-template.md -->

---

## 9. Definition of Done

Una tarea solo pasa a `DONE` cuando:

- [ ] Su alcance está implementado y el fuera de alcance sigue fuera.
- [ ] Los tests nuevos y existentes pasan.
- [ ] `npx tsc -b --noEmit` pasa.
- [ ] `npm run lint` pasa.
- [ ] `npm run format:check` pasa.
- [ ] `npm test` pasa.
- [ ] `npm run test:rules` pasa si toca Firestore/Storage.
- [ ] `npm run test:e2e` pasa si toca flujos reales.
- [ ] Los snapshots visuales revisados y justificados si cambian.
- [ ] i18n ES/EN con paridad.
- [ ] No hay imports prohibidos entre capas.
- [ ] No se ha modificado `@raulrod/ui`, `@raulrod/tokens` ni `node_modules`.
- [ ] Los textos nuevos tienen nombres accesibles y buen contraste.
- [ ] La documentación/ADR está actualizada.
- [ ] El Change Log tiene una entrada.
- [ ] El PR indica tarea, alcance, tests, evidencia visual y riesgos.

---

## 10. Change Log

| Fecha        | Tarea | Cambio                  | Autor |
| ------------ | ----- | ----------------------- | ----- |
| <YYYY-MM-DD> | —     | Creación del documento. | —     |
