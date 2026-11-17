# Recorte de bordes negros — diseño

Fecha: 2026-11-16 · Estado: pendiente de aprobación · Amplía: `2026-11-16-genmage-design.md`

## Intención

Quien usa Genmage graba la pantalla del iPhone mientras ve un vídeo a pantalla completa (de Instagram o X) y luego lo elige en la app. La grabación suele traer franjas negras alrededor del vídeo. Genmage debe detectarlas y recortarlas para que las fotos salgan limpias en la galería.

## Objetivos

- Detectar automáticamente las franjas negras (arriba, abajo, izquierda, derecha) de un vídeo y recortar las fotos a la zona útil.
- Interruptor "Recortar bordes negros" en la pantalla de inicio, activado por defecto, que recuerda la última elección.
- Si la detección no es fiable, no recortar nada (la foto sale completa).

## Fuera de alcance

- Quitar texto, botones o iconos que la app ponga encima del vídeo.
- Recortar barras de interfaz que no sean negras.
- Recorte manual (se podría añadir después si hace falta).
- Descargar vídeos desde enlaces de Instagram o X: queda descartado.

## Anti-objetivos

- Recortar parte del vídeo real (un vídeo oscuro no debe interpretarse como borde).
- Que un vídeo sin franjas salga distinto de como sale hoy.

## Enfoques considerados

| Enfoque | Resultado |
|---|---|
| **A. Detectar franjas negras** en ~20 fotogramas: fiable, sencillo, no recorta si no hay franjas | **Elegido por el usuario** |
| B. Detectar la zona que cambia con el tiempo: frágil con vídeos casi estáticos | Descartado |
| C. Recorte manual arrastrando un rectángulo: un paso más por vídeo | Descartado por ahora |

## Cómo funciona (decisiones mías, a revisar)

- **Muestreo:** 20 fotogramas repartidos por todo el vídeo, a la misma resolución de análisis (320 px de ancho) que ya se usa.
- **Qué es un borde:** una fila o columna cuyos píxeles son casi negros (luminancia ≤ 24) en al menos el 98 % de su longitud **en todos** los fotogramas muestreados. Se recorre desde cada lado hacia dentro hasta la primera fila o columna que no cumple.
- **Margen:** se recorta además 1 píxel de análisis hacia dentro (≈ 3 píxeles en 1080p) para evitar restos de negro por la compresión.
- **Bordes mínimos:** los bordes menores de 2 % de esa dimensión se ignoran (ruido, no franjas).
- **Cuándo no recortar:** si la zona útil quedase por debajo del 50 % del área del fotograma, o si ningún lado tiene borde, no se recorta.
- **Se aplica a todo:** la puntuación de nitidez y exposición se calcula sobre la zona recortada, y las fotos finales salen recortadas a resolución completa. Las coordenadas se guardan normalizadas (0–1) para valer igual a 320 px y a resolución original.
- **Interruptor:** casilla en la pantalla de inicio, desactivada = comportamiento actual. Se recuerda en `localStorage`, con la app funcionando igual si no está disponible.
- **Coste:** 20 búsquedas de fotograma más por vídeo, antes del análisis (unos segundos en el iPhone).

## Casos límite

- Vídeo a pantalla completa sin franjas: no se recorta.
- Vídeo con escenas muy oscuras en todo el muestreo: el 98 % en todos los fotogramas y el mínimo del 50 % evitan recortar de más.
- Franjas distintas en cada lado (por ejemplo, solo arriba): cada lado se mide por separado.
- Vídeo girado o vertical: funciona igual, la detección no depende de la orientación.

## Para quien construya

- Un módulo de detección puro y probable con fotogramas sintéticos; el resto es pasar el rectángulo a la fuente de fotogramas y al interruptor.
- Verificar con una grabación real del iPhone con franjas, y con un vídeo sin franjas, que el resultado es el esperado.
