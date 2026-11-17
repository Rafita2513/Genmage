export const DARK_LUMA = 24;
export const BORDER_DARK_FRACTION = 0.98;
export const MIN_BORDER_FRACTION = 0.02;
export const MIN_AREA_FRACTION = 0.5;
export const INSET_PX = 1;

/** isBorder[i] es true si la fila (o columna) i es casi negra en todos los fotogramas. */
function borderLines(frames, count, length, indexOf) {
  const isBorder = new Array(count).fill(true);
  for (const { data } of frames) {
    for (let line = 0; line < count; line++) {
      if (!isBorder[line]) continue;
      let dark = 0;
      for (let k = 0; k < length; k++) if (data[indexOf(line, k)] <= DARK_LUMA) dark++;
      if (dark / length < BORDER_DARK_FRACTION) isBorder[line] = false;
    }
  }
  return isBorder;
}

function runFromStart(isBorder) {
  let n = 0;
  while (n < isBorder.length && isBorder[n]) n++;
  return n;
}

function runFromEnd(isBorder) {
  let n = 0;
  while (n < isBorder.length && isBorder[isBorder.length - 1 - n]) n++;
  return n;
}

/**
 * Detecta franjas negras comunes a todos los fotogramas.
 * @param {{data:Uint8ClampedArray,width:number,height:number}[]} frames
 * @returns {{x:number,y:number,width:number,height:number}|null} rectángulo normalizado (0–1)
 */
export function detectBlackBorders(frames) {
  if (frames.length === 0) return null;
  const { width: w, height: h } = frames[0];

  const rows = borderLines(frames, h, w, (y, x) => y * w + x);
  const cols = borderLines(frames, w, h, (x, y) => y * w + x);
  let top = runFromStart(rows);
  let bottom = runFromEnd(rows);
  let left = runFromStart(cols);
  let right = runFromEnd(cols);
  if (top >= h || left >= w) return null; // todo negro

  const minV = Math.ceil(MIN_BORDER_FRACTION * h);
  const minH = Math.ceil(MIN_BORDER_FRACTION * w);
  if (top < minV) top = 0;
  if (bottom < minV) bottom = 0;
  if (left < minH) left = 0;
  if (right < minH) right = 0;
  if (top + bottom + left + right === 0) return null;

  if (top) top += INSET_PX;
  if (bottom) bottom += INSET_PX;
  if (left) left += INSET_PX;
  if (right) right += INSET_PX;

  const width = (w - left - right) / w;
  const height = (h - top - bottom) / h;
  if (width <= 0 || height <= 0 || width * height < MIN_AREA_FRACTION) return null;
  return { x: left / w, y: top / h, width, height };
}

/** Convierte un rectángulo normalizado en píxeles enteros (null = fotograma completo). */
export function toPixelRect(rect, width, height) {
  if (!rect) return { sx: 0, sy: 0, sw: width, sh: height };
  const sx = Math.round(rect.x * width);
  const sy = Math.round(rect.y * height);
  const sw = Math.max(1, Math.min(width - sx, Math.round(rect.width * width)));
  const sh = Math.max(1, Math.min(height - sy, Math.round(rect.height * height)));
  return { sx, sy, sw, sh };
}
