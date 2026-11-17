/** Divide la duración en `count` tramos contiguos e iguales. */
export function planSegments(duration, count) {
  const length = duration / count;
  return Array.from({ length: count }, (_, index) => ({
    index,
    start: index * length,
    end: index === count - 1 ? duration : (index + 1) * length,
  }));
}

/** `perSegment` instantes equiespaciados, estrictamente dentro del tramo. */
export function candidateTimes(segment, perSegment) {
  const length = segment.end - segment.start;
  return Array.from(
    { length: perSegment },
    (_, k) => segment.start + ((k + 1) / (perSegment + 1)) * length,
  );
}

/** Mayor puntuación; en empate, el instante más temprano. */
export function pickBest(scored) {
  if (scored.length === 0) throw new RangeError('No hay candidatos');
  let best = scored[0];
  for (const c of scored) {
    if (c.score > best.score || (c.score === best.score && c.time < best.time)) best = c;
  }
  return best;
}
