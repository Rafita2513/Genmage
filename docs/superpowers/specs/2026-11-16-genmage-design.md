# Genmage — diseño

Fecha: 2026-11-16 · Estado: pendiente de aprobación

## Intención

Quien lo usa quiere guardar recuerdos de sus vídeos como fotos. Elige un vídeo de su galería del iPhone, la app extrae los mejores momentos con buena calidad, los muestra en un carrusel y guarda en la galería solo los que la persona deja seleccionados. Es de uso personal.

## Objetivos

- Elegir un vídeo de la galería del iPhone y obtener fotos de sus mejores momentos.
- Calidad: cada foto sale a la resolución original del vídeo.
- Ver los resultados en un carrusel, con cada foto marcada como seleccionada o no.
- Un botón "Guardar X fotos" guarda solo las seleccionadas; las demás se descartan y no queda rastro.

## Fuera de alcance

- Cuentas, nube, subir vídeos a internet, compartir en redes.
- Editar fotos (recortes, filtros).
- Android y escritorio como objetivos (puede abrirse en ellos, pero no se prueba ni se optimiza).
- Detección de caras o de acción. Queda como posible mejora futura.

## Anti-objetivos (sería un fracaso aunque funcione)

- Fotos de baja calidad o redimensionadas.
- Que el vídeo salga del teléfono.
- Una selección que repita casi la misma imagen o deje partes del vídeo sin cubrir.

## Restricciones

- El usuario tiene un iPhone y un PC con Windows, sin Mac. No tiene cuenta de desarrollador de Apple.
- Coste cero: hosting estático gratuito.
- Safari en iOS no permite escribir directo en la galería desde una web: el guardado pasa por la hoja "Compartir".

## Enfoques considerados

| Enfoque | Ventajas | Inconvenientes | Resultado |
|---|---|---|---|
| **A. PWA en Safari** | Sin Mac ni cuenta de Apple, gratis, acceso a los píxeles para medir calidad real | Guardar requiere un paso extra (Compartir → Guardar imágenes) | **Elegido por el usuario** |
| B. Expo + Expo Go | Guarda directo en la galería | Análisis de calidad pobre dentro de Expo Go; app propia exige cuenta de pago (99 $/año) | Descartado |
| C. Swift nativo | Mejor resultado | Necesita Mac y Xcode | Descartado |

## Decisiones del usuario

1. Plataforma: PWA para iPhone.
2. Todo se procesa en el teléfono.
3. Se guardan solo las fotos seleccionadas en el carrusel; las no seleccionadas se descartan al pulsar "Guardar X fotos".
4. Cantidad de fotos según la duración, de 10 en 10 por cada minuto:

| Duración del vídeo | Fotos |
|---|---|
| hasta 1:00 (incluido) | 10 |
| más de 1:00 y hasta 2:00 | 20 |
| más de 2:00 y hasta 3:00 | 30 |
| y así sucesivamente | 10 × minutos, redondeando hacia arriba |

## Decisiones mías (a revisar)

- **Tope de 100 fotos.** Con vídeos muy largos la cuenta crece sin límite y el carrusel y la memoria del móvil sufren. Se puede quitar o subir.
- **Todas las fotos empiezan sin seleccionar** (decisión del usuario) y se toca para marcar las que se quieren guardar. El botón "Guardar X fotos" aparece desactivado hasta que haya al menos una marcada.
- **Cómo se eligen los mejores momentos.** El vídeo se divide en tantos tramos iguales como fotos haya que sacar. En cada tramo se examinan varios fotogramas y gana el de mejor puntuación. Esto garantiza que la selección cubra todo el vídeo. Puntuación:
  - nitidez (varianza del Laplaciano sobre una copia reducida en gris), que penaliza el desenfoque y el movimiento borroso;
  - exposición (se penalizan los fotogramas casi negros o quemados).
  Solo los fotogramas ganadores se extraen a resolución completa.
- **Formato:** JPEG de alta calidad (≈0,95). Los vídeos vienen en .MOV/HEVC, que Safari reproduce de forma nativa.
- **Guardado:** `navigator.share` con los archivos; si no está disponible, se muestran las imágenes para mantener pulsado y guardar una a una.
- **Instalable:** manifiesto y service worker para que se pueda añadir a la pantalla de inicio y abrir sin conexión.
- **Tecnología:** HTML, CSS y JavaScript sin servidor ni framework pesado. Publicada como sitio estático con HTTPS (es obligatorio para compartir archivos).

## Flujo de pantallas

1. **Inicio:** botón "Elegir vídeo".
2. **Procesando:** barra de progreso ("Analizando… 40 %"). Muestra cuántas fotos se sacarán.
3. **Carrusel:** foto grande con su minuto, desliza a los lados; fila de miniaturas con marca de seleccionada; botón "Guardar X fotos", con X actualizado según la selección. Botón "← Otro vídeo".
4. **Guardado:** se abre la hoja Compartir de iOS; al terminar, mensaje de confirmación.

## Casos límite

- Vídeo muy corto (pocos segundos): se sacan menos fotos si no hay fotogramas distintos suficientes, nunca duplicados.
- Todas las fotos deseleccionadas: el botón de guardar queda desactivado.
- Cancelar la hoja Compartir: las fotos siguen en el carrusel.
- El navegador no puede leer el vídeo: mensaje claro y volver al inicio.

## Para quien construya

- Técnica concreta de lectura de fotogramas (búsqueda por tiempo o `requestVideoFrameCallback`), número de candidatos por tramo y umbrales de nitidez y exposición se ajustan con vídeos reales.
- Atención a los límites de memoria y de tamaño de lienzo de Safari en iOS con vídeos 4K.
- Elección del hosting estático gratuito (por ejemplo GitHub Pages o Cloudflare Pages).
- La prueba final exige un iPhone real; en el PC se puede probar el análisis con un navegador de escritorio y un vídeo de ejemplo.
