const CROP_KEY = 'genmage.cropBorders';

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // el acceso mismo puede lanzar (datos del sitio bloqueados)
  }
}

/** ¿Recortar bordes negros? Activado por defecto; nunca lanza. */
export function loadCropSetting(storage = defaultStorage()) {
  try {
    return storage?.getItem(CROP_KEY) !== '0';
  } catch {
    return true;
  }
}

export function saveCropSetting(value, storage = defaultStorage()) {
  try {
    storage?.setItem(CROP_KEY, value ? '1' : '0');
  } catch {
    /* sin almacenamiento: la preferencia solo dura esta sesión */
  }
}
