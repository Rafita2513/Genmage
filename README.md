# Genmage

PWA para iPhone: eliges un vídeo de tu galería, la app saca sus mejores momentos como fotos de alta calidad, los ves en un carrusel y guardas en Fotos solo los que marques. Todo ocurre en el teléfono; el vídeo no se sube a ningún sitio.

- Diseño: [`docs/superpowers/specs/2026-11-16-genmage-design.md`](docs/superpowers/specs/2026-11-16-genmage-design.md)
- Plan: [`docs/superpowers/plans/2026-11-16-genmage.md`](docs/superpowers/plans/2026-11-16-genmage.md)

## Cuántas fotos salen

10 por cada minuto de vídeo, redondeando hacia arriba (hasta 1:00 → 10, hasta 2:00 → 20…), con tope de 100 y como máximo una por segundo. La duración se redondea al segundo más cercano.

## Recorte de bordes negros

En la pantalla de inicio, la casilla **Recortar bordes negros** (activada por defecto) detecta las franjas negras de las grabaciones de pantalla y recorta las fotos a la zona útil. Si el vídeo no tiene franjas, no recorta nada. Desactívala para obtener siempre el fotograma completo.

## Probar en el PC

```bash
npm test
```

```bash
npm run serve
```

`npm run serve` sirve la app en <http://localhost:8080>. Para la prueba de humo con navegador (Playwright):

```bash
npm run e2e
```

Si Playwright no encuentra su Chromium, indica uno con la variable `CHROMIUM_PATH`.

## Publicar

La app es un sitio estático: basta subir esta carpeta (sin `node_modules`, `docs` ni `tests`) a un hosting con **HTTPS**; sin HTTPS, iOS no permite compartir archivos. Opciones gratuitas: GitHub Pages o Cloudflare Pages.

Cada vez que cambies un archivo de la app, sube `CACHE_VERSION` en `sw.js` para que los móviles descarguen la versión nueva.

URL publicada (GitHub Pages, rama `main`): <https://rafita2513.github.io/Genmage/>

## Instalar en el iPhone y comprobarla

1. Abre la URL en **Safari**.
2. Toca Compartir → **Añadir a pantalla de inicio**, y abre la app desde el icono.
3. Elige un vídeo de unos 30 s: deben salir 10 fotos y el botón debe decir "Guardar 0 fotos" (desactivado).
4. Marca 3 fotos y toca "Guardar 3 fotos": en la hoja Compartir elige **Guardar imágenes** y comprueba en Fotos que están a la resolución del vídeo.
5. Repite con un vídeo **vertical**: las fotos deben salir en vertical.
6. Repite con un vídeo de más de 2 minutos: 30 fotos o más, sin que la app se recargue.
7. Abre la hoja Compartir y ciérrala sin guardar: el carrusel debe seguir ahí.

Si algo falla, anota qué vídeo (duración, vertical u horizontal) y qué pasó.
