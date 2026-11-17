# Recorte de bordes negros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar y recortar las franjas negras de grabaciones de pantalla para que las fotos de Genmage salgan limpias, con un interruptor en la pantalla de inicio.

**Architecture:** Un módulo puro `src/crop.js` detecta el rectángulo útil a partir de ~20 fotogramas en gris. `analyzeVideo` lo calcula antes del análisis y se lo pasa a la `FrameSource` con `setCrop`; la fuente lo aplica tanto a los fotogramas de análisis como a las fotos finales. La preferencia del interruptor vive en `src/settings.js`.

**Tech Stack:** JavaScript ES modules, `node:test`, Playwright (humo en escritorio), el mismo sitio estático de GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-16-recorte-bordes-design.md` (amplía `2026-11-16-genmage-design.md`). Código existente: `src/analyze.js`, `src/frames.js`, `src/app.js`, `index.html`, `sw.js`, `tests/e2e/smoke.mjs`.

## Global Constraints

- Muestreo: 20 fotogramas repartidos por todo el vídeo, a `ANALYSIS_WIDTH = 320` px.
- Borde = fila o columna con luminancia ≤ 24 en al menos el 98 % de sus píxeles en **todos** los fotogramas muestreados; se recorre desde cada lado hacia dentro hasta la primera fila o columna que no lo es. Cada lado se mide por separado.
- Margen: 1 píxel de análisis hacia dentro en cada lado recortado.
- Bordes menores del 2 % de esa dimensión se ignoran.
- No recortar si ningún lado tiene borde o si la zona útil queda por debajo del 50 % del área del fotograma.
- Rectángulo normalizado (0–1) para valer a 320 px y a resolución original; las fotos finales salen recortadas a resolución completa (con el tope `MAX_CANVAS_PIXELS` ya existente).
- Casilla "Recortar bordes negros" en la pantalla de inicio, **activada por defecto**, recordada en `localStorage` con `try/catch`; desactivada = comportamiento actual.
- Textos en español. Sin dependencias nuevas en runtime.

## Review Focus

- Vídeo sin franjas: no cambia (sin recorte). Test en Task 1.
- Vídeo casi negro en todo el muestreo: no se recorta de más. Test en Task 1.
- Franja solo en un lado (p. ej. arriba): se recorta solo ese lado. Test en Task 1.
- `localStorage` no disponible o que lanza (modo privado): la casilla funciona y vale `true` por defecto. Test en Task 2.
- Cancelar durante la detección: rechaza con `AbortError` sin recortar ni extraer nada; y con recorte activado y sin franjas, la fuente recibe `setCrop(null)`. Tests en Task 3.

## Archivos

```
src/crop.js               detectBlackBorders, toPixelRect (nuevo)
src/settings.js           loadCropSetting, saveCropSetting (nuevo)
src/analyze.js            opción cropBorders (modificar)
src/frames.js             setCrop en la FrameSource (modificar)
src/app.js, index.html    casilla y cableado (modificar)
sw.js                     CACHE_VERSION y SHELL (modificar)
tests/unit/crop.test.js, settings.test.js, analyze.test.js (ampliar)
tests/e2e/smoke.mjs       vídeo con franjas (modificar)
```

Tipos: `Rect = { x: number; y: number; width: number; height: number }` (fracciones 0–1 del fotograma). `GrayFrame` y `FrameSource` como en el plan anterior; `FrameSource` gana `setCrop?(rect: Rect | null): void`.

---

### Task 1: Detección de franjas negras

**Files:**
- Create: `src/crop.js`, `tests/unit/crop.test.js`

**Interfaces:**
- Produces: `detectBlackBorders(frames: GrayFrame[]): Rect | null`; `toPixelRect(rect: Rect | null, width: number, height: number): { sx: number; sy: number; sw: number; sh: number }` (enteros; `null` → fotograma completo); constantes exportadas `DARK_LUMA = 24`, `BORDER_DARK_FRACTION = 0.98`, `MIN_BORDER_FRACTION = 0.02`, `MIN_AREA_FRACTION = 0.5`, `INSET_PX = 1`.

- [ ] **Step 1: Escribir `crop.test.js` (falla).** Fotogramas sintéticos 40×60 con contenido gris 128 y franjas a 0; para cada caso se pasan 2 fotogramas. Aserciones (con tolerancia 1e-9):
  - barras de 10 filas arriba y abajo → `x 0`, `width 1`, `y = 11/60`, `height = 38/60`;
  - barras de 6 columnas a izquierda y derecha → `x = 7/40`, `width = 26/40`, `y 0`, `height 1`;
  - franja solo arriba de 10 filas → `y = 11/60`, `height = 49/60`, `x 0`, `width 1`;
  - sin franjas → `null`; todo negro → `null`; lista vacía → `null`;
  - 1 sola fila negra arriba (< 2 % de 60) → `null`;
  - barras de 20 filas arriba y abajo (zona útil 30 %) → `null`;
  - fila 0 con 1 píxel brillante de 40 (97,5 % oscuro) y el resto como contenido → no cuenta como borde → `null`;
  - barra de 10 filas arriba en el fotograma A y un píxel brillante en la fila 5 en el B → solo se recortan las 5 primeras filas: `y = 6/60`;
  - `toPixelRect(null, 1080, 1920)` → `{sx:0, sy:0, sw:1080, sh:1920}`; `toPixelRect({x:0.25,y:0,width:0.5,height:1}, 1080, 1920)` → `{sx:270, sy:0, sw:540, sh:1920}`.
- [ ] **Step 2: Ejecutar** `npm test`. Esperado: FALLA (módulo no existe).
- [ ] **Step 3: Implementar** ambas funciones y las constantes en `src/crop.js`: una fila/columna es borde si en cada fotograma la fracción de píxeles ≤ `DARK_LUMA` es ≥ `BORDER_DARK_FRACTION`; contar filas/columnas consecutivas desde cada lado; si un lado cubre toda la dimensión devolver `null`; poner a 0 los bordes menores de `ceil(MIN_BORDER_FRACTION × dimensión)` px; si los cuatro son 0 devolver `null`; sumar `INSET_PX` a cada lado con borde; si el área resultante < `MIN_AREA_FRACTION` devolver `null`; normalizar.
- [ ] **Step 4: Ejecutar** `npm test`. Esperado: PASA.
- [ ] **Step 5: Commit** (`feat: detect black borders`).

### Task 2: Preferencia del interruptor

**Files:**
- Create: `src/settings.js`, `tests/unit/settings.test.js`

**Interfaces:**
- Produces: `loadCropSetting(storage?: { getItem(k: string): string | null }): boolean` (por defecto `true`); `saveCropSetting(value: boolean, storage?: { setItem(k: string, v: string): void }): void`; clave `genmage.cropBorders` con valores `'1'`/`'0'`. `storage` por defecto `globalThis.localStorage`; nunca lanza.

- [ ] **Step 1: Escribir tests (fallan):** sin valor guardado → `true`; guardar `false` y leer → `false`; guardar `true` → `true`; almacenamiento que lanza en `getItem` → `true`; que lanza en `setItem` → no lanza; `storage` indefinido → `true`.
- [ ] **Step 2: Ejecutar** `npm test`. Esperado: FALLA.
- [ ] **Step 3: Implementar** `loadCropSetting` y `saveCropSetting` con `try/catch`.
- [ ] **Step 4: Ejecutar** `npm test`. Esperado: PASA.
- [ ] **Step 5: Commit.**

### Task 3: Detección dentro de `analyzeVideo`

**Files:**
- Modify: `src/analyze.js`, `tests/unit/analyze.test.js`

**Interfaces:**
- Consumes: `detectBlackBorders` (Task 1).
- Produces: `CROP_SAMPLES = 20` (exportada); `analyzeVideo(source, opts?: { onProgress?, signal?, cropBorders?: boolean })`. Con `cropBorders` verdadero y `source.setCrop` disponible: muestrear `grayAt((k + 0.5) / CROP_SAMPLES × duration)` para `k = 0…19`, llamar `source.setCrop(detectBlackBorders(frames))` (se llama siempre, con `null` si no hay franjas) y después seguir con el análisis normal. Sin `cropBorders`, no se llama a `setCrop`.

- [ ] **Step 1: Añadir tests (fallan)** con una `BarsSource` nueva (no la existente: sus tiempos dependen de los tramos) cuyo `grayAt` devuelve fotogramas 16×24 con 4 filas negras arriba y abajo y `setCrop` guardado en un espía; `jpegAt` como en los otros tests. Casos: (a) `cropBorders: true` → `setCrop` llamado una vez con un `Rect` no nulo, antes de cualquier `jpegAt`; (b) `cropBorders: true` con fotogramas sin franjas → `setCrop(null)`; (c) `cropBorders` omitido → `setCrop` no se llama; (d) `signal` ya abortada y `cropBorders: true` → rechaza con `AbortError`, sin llamar a `setCrop` ni a `jpegAt`; (e) una fuente sin `setCrop` con `cropBorders: true` no falla.
- [ ] **Step 2: Ejecutar** `npm test`. Esperado: FALLA.
- [ ] **Step 3: Implementar** la fase de detección en `analyzeVideo`, comprobando la señal antes de cada muestra.
- [ ] **Step 4: Ejecutar** `npm test`. Esperado: PASA (también los tests anteriores).
- [ ] **Step 5: Commit.**

### Task 4: Aplicar el recorte en el navegador y añadir la casilla

**Files:**
- Modify: `src/frames.js`, `src/app.js`, `index.html`, `styles.css`, `sw.js`, `README.md`

**Interfaces:**
- Consumes: `toPixelRect` (Task 1), `loadCropSetting`/`saveCropSetting` (Task 2), `analyzeVideo` con `cropBorders` (Task 3).
- Produces: `openVideo(...)` devuelve además `setCrop(rect: Rect | null): void`; `width`/`height` pasan a ser los de la foto final y se actualizan con el recorte.

- [ ] **Step 1: `frames.js`:** guardar el recorte actual; `grayAt` dibuja la región `toPixelRect(crop, videoWidth, videoHeight)` en un canvas de análisis de `ANALYSIS_WIDTH` de ancho con la proporción del recorte (recrearlo al cambiar el recorte); `jpegAt` dibuja esa misma región en un canvas de `fitWithin(sw, sh, MAX_CANVAS_PIXELS)`. Los dos canvas se reconstruyen en `setCrop`.
- [ ] **Step 2: `index.html` y `styles.css`:** en `#home`, antes de la nota, `<label class="toggle"><input id="crop-toggle" type="checkbox"> Recortar bordes negros</label>` con estilo de casilla táctil (≥ 44 px de alto).
- [ ] **Step 3: `app.js`:** al iniciar, `crop-toggle.checked = loadCropSetting()`; al cambiar, `saveCropSetting(checked)`; al procesar un vídeo, pasar `cropBorders: crop-toggle.checked` a `analyzeVideo`.
- [ ] **Step 4: `sw.js`:** añadir `src/crop.js` y `src/settings.js` a `SHELL` y subir `CACHE_VERSION` a `genmage-v2`. **`README.md`:** una línea explicando la casilla.
- [ ] **Step 5: Ejecutar** `npm test` (esperado PASA) y `node --check` sobre `src/*.js` y `sw.js`.
- [ ] **Step 6: Commit.**

### Task 5: Prueba de humo con franjas

**Files:**
- Modify: `tests/e2e/smoke.mjs`

- [ ] **Step 1: Modificar el vídeo de prueba:** dibujar la animación solo en la zona `y ∈ [40, 320]` y dejar 40 px de franja negra arriba y abajo.
- [ ] **Step 2: Ajustar aserciones:** con la casilla por defecto (marcada) la primera foto sale con ancho 640 y alto entre 270 y 280; tras "← Otro vídeo", desmarcar `#crop-toggle` y volver a cargar el vídeo → la primera foto es de `[640, 360]`; en la nueva visita la casilla sigue desmarcada (preferencia recordada tras recargar la página). Mantener el resto de la prueba.
- [ ] **Step 3: Ejecutar** `npm run e2e` (con `CHROMIUM_PATH` si hace falta). Esperado: PASA. Si el negro del WebM comprimido queda por encima de la luminancia 24, ajustar el fondo del vídeo de prueba, no las constantes de la app.
- [ ] **Step 4: Commit.** No publicar sin pedir antes permiso al usuario (la subida al repositorio actualiza su web).
