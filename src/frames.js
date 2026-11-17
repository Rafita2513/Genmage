export const ANALYSIS_WIDTH = 320;
export const JPEG_QUALITY = 0.95;
export const MAX_CANVAS_PIXELS = 16_000_000; // límite de área de canvas en iOS Safari
export const SEEK_TIMEOUT_MS = 5000;
const METADATA_TIMEOUT_MS = 15000;
const END_MARGIN = 0.05; // no buscar justo en el final del vídeo

/** Tamaño de salida: el original si cabe, o reducido manteniendo la proporción. */
export function fitWithin(width, height, maxPixels) {
  if (width * height <= maxPixels) return { width, height };
  const scale = Math.sqrt(maxPixels / (width * height));
  return { width: Math.floor(width * scale), height: Math.floor(height * scale) };
}

function once(target, okEvent, timeoutMs, failure) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(failure));
    }, timeoutMs);
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(failure));
    };
    function cleanup() {
      clearTimeout(timer);
      target.removeEventListener(okEvent, onOk);
      target.removeEventListener('error', onError);
    }
    target.addEventListener(okEvent, onOk);
    target.addEventListener('error', onError);
  });
}

/**
 * Abre un vídeo local y expone una FrameSource.
 * Rechaza con Error('VIDEO_UNREADABLE') si el navegador no puede leerlo.
 */
export async function openVideo(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  // Oculto pero dentro del DOM: iOS es más fiable así.
  video.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(video);

  const dispose = () => {
    video.removeAttribute('src');
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
  };

  try {
    const loaded = once(video, 'loadedmetadata', METADATA_TIMEOUT_MS, 'VIDEO_UNREADABLE');
    video.src = url;
    await loaded;
    if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth) {
      throw new Error('VIDEO_UNREADABLE');
    }
    // "Cebar" el decodificador: en iOS los primeros dibujos pueden salir negros.
    try {
      await video.play();
      video.pause();
    } catch {
      /* sin gesto o sin permiso: se sigue igual */
    }
  } catch {
    dispose();
    throw new Error('VIDEO_UNREADABLE');
  }

  const { duration, videoWidth, videoHeight } = video;

  async function seekTo(t) {
    const target = Math.min(Math.max(t, 0), Math.max(0, duration - END_MARGIN));
    if (Math.abs(video.currentTime - target) < 1e-3 && video.readyState >= 2) return;
    const seeked = once(video, 'seeked', SEEK_TIMEOUT_MS, 'SEEK_TIMEOUT');
    video.currentTime = target;
    await seeked;
  }

  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = ANALYSIS_WIDTH;
  analysisCanvas.height = Math.max(1, Math.round((ANALYSIS_WIDTH * videoHeight) / videoWidth));
  const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });

  const fullSize = fitWithin(videoWidth, videoHeight, MAX_CANVAS_PIXELS);
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = fullSize.width;
  fullCanvas.height = fullSize.height;
  const fullCtx = fullCanvas.getContext('2d');

  return {
    duration,
    width: fullSize.width,
    height: fullSize.height,
    dispose,

    async grayAt(t) {
      await seekTo(t);
      const { width, height } = analysisCanvas;
      analysisCtx.drawImage(video, 0, 0, width, height);
      const rgba = analysisCtx.getImageData(0, 0, width, height).data;
      const data = new Uint8ClampedArray(width * height);
      for (let i = 0, p = 0; i < data.length; i++, p += 4) {
        data[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
      }
      return { data, width, height };
    },

    async jpegAt(t) {
      await seekTo(t);
      fullCtx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);
      return new Promise((resolve, reject) => {
        fullCanvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('JPEG_FAILED'))),
          'image/jpeg',
          JPEG_QUALITY,
        );
      });
    },
  };
}
