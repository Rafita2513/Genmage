import { photoCountFor } from './photoCount.js';
import { frameScore } from './scoring.js';
import { planSegments, candidateTimes, pickBest } from './selection.js';

export const CANDIDATES_PER_SEGMENT = 6;

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

/**
 * Elige los mejores momentos de un vídeo.
 * @param {{duration:number, grayAt:(t:number)=>Promise<any>, jpegAt:(t:number)=>Promise<Blob>}} source
 * @param {{onProgress?:(done:number,total:number)=>void, signal?:AbortSignal}} [opts]
 * @returns {Promise<{id:string,time:number,blob:Blob}[]>}
 */
export async function analyzeVideo(source, { onProgress, signal } = {}) {
  const total = photoCountFor(source.duration);
  const segments = planSegments(source.duration, total);
  const snapshots = [];

  for (const segment of segments) {
    const scored = [];
    // Secuencial: un <video> solo admite una búsqueda a la vez.
    for (const time of candidateTimes(segment, CANDIDATES_PER_SEGMENT)) {
      throwIfAborted(signal);
      scored.push({ time, score: frameScore(await source.grayAt(time)) });
    }
    const best = pickBest(scored);
    throwIfAborted(signal);
    const blob = await source.jpegAt(best.time);
    snapshots.push({ id: `s${segment.index}`, time: best.time, blob });
    onProgress?.(snapshots.length, total);
  }
  return snapshots;
}
