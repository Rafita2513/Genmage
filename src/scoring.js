const DARK_LIMIT = 16;
const BRIGHT_LIMIT = 240;

/**
 * Nitidez: varianza del Laplaciano de 4 vecinos sobre los píxeles interiores.
 * Más alta = más detalle y menos desenfoque.
 */
export function sharpness({ data, width, height }) {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        data[i - 1] + data[i + 1] + data[i - width] + data[i + width] - 4 * data[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/**
 * Exposición en [0,1]: 1 menos la fracción de píxeles casi negros o quemados.
 */
export function exposureFactor({ data }) {
  if (data.length === 0) return 0;
  let clipped = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < DARK_LIMIT || data[i] > BRIGHT_LIMIT) clipped++;
  }
  return 1 - clipped / data.length;
}

export function frameScore(frame) {
  return sharpness(frame) * exposureFactor(frame);
}
