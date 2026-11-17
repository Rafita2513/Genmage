const pad2 = (n) => String(n).padStart(2, '0');

/** Nombre de archivo: `genmage-03-01m42s.jpg` (índice desde 1, tiempo en m/s). */
export function fileNameFor(index, timeSeconds) {
  const total = Math.round(timeSeconds);
  return `genmage-${pad2(index)}-${pad2(Math.floor(total / 60))}m${pad2(total % 60)}s.jpg`;
}

/**
 * Abre la hoja Compartir de iOS con las fotos (ahí está "Guardar imágenes").
 * Debe llamarse directamente desde un gesto del usuario.
 * @returns {Promise<'shared'|'cancelled'|'unsupported'>}
 */
export async function saveToPhotos(files, nav = globalThis.navigator) {
  if (typeof nav?.share !== 'function' || !nav.canShare?.({ files })) return 'unsupported';
  try {
    await nav.share({ files });
    return 'shared';
  } catch (err) {
    return err?.name === 'AbortError' ? 'cancelled' : 'unsupported';
  }
}
