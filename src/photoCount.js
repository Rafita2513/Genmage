const PHOTOS_PER_MINUTE = 10;
const MAX_PHOTOS = 100;

/**
 * Cuántas fotos sacar de un vídeo según su duración.
 * 10 por cada minuto (redondeando hacia arriba), tope de 100 y como máximo
 * una por segundo de vídeo. La duración se redondea al segundo más cercano,
 * que es lo que muestra el reproductor.
 */
export function photoCountFor(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError(`Duración inválida: ${durationSeconds}`);
  }
  const seconds = Math.round(durationSeconds);
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const byMinutes = Math.min(MAX_PHOTOS, minutes * PHOTOS_PER_MINUTE);
  return Math.min(byMinutes, Math.max(1, seconds));
}
