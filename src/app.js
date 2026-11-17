import { openVideo } from './frames.js';
import { analyzeVideo } from './analyze.js';
import { createSelection } from './selectionState.js';
import { fileNameFor, saveToPhotos } from './share.js';
import { renderCarousel, renderFallbackGrid } from './carousel.js';
import { loadCropSetting, saveCropSetting } from './settings.js';

const $ = (id) => document.getElementById(id);
const screens = ['home', 'processing', 'results', 'fallback', 'error'];

const input = $('video-input');
const saveButton = $('save');
const cropToggle = $('crop-toggle');
const toast = $('toast');

let video = null;
let controller = null;
let snapshots = [];
let urls = new Map();
let selection = createSelection();
let toastTimer = 0;

function show(name) {
  for (const id of screens) $(id).hidden = id !== name;
  window.scrollTo(0, 0);
}

function say(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 4000);
}

function releaseResults() {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls = new Map();
  snapshots = [];
  selection = createSelection();
  $('gallery').replaceChildren();
  $('fallback-grid').replaceChildren();
  toast.hidden = true;
}

function reset() {
  controller?.abort();
  controller = null;
  video?.dispose();
  video = null;
  releaseResults();
  show('home');
}

function updateSaveButton() {
  const n = selection.count();
  saveButton.textContent = `Guardar ${n} ${n === 1 ? 'foto' : 'fotos'}`;
  saveButton.disabled = n === 0;
  $('hint').hidden = n > 0;
}

function onProgress(done, total) {
  const percent = Math.round((done / total) * 100);
  $('progress-title').textContent = `Analizando… ${percent} %`;
  $('progress-detail').textContent = `${done} de ${total} fotos`;
  $('progress-bar').value = percent;
}

cropToggle.checked = loadCropSetting();
cropToggle.addEventListener('change', () => saveCropSetting(cropToggle.checked));

input.addEventListener('change', async () => {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  releaseResults();
  controller = new AbortController();
  const { signal } = controller;
  $('progress-title').textContent = 'Analizando…';
  $('progress-detail').textContent = 'Preparando el vídeo';
  $('progress-bar').value = 0;
  show('processing');

  let opened = null;
  try {
    opened = await openVideo(file);
    video = opened;
    const result = await analyzeVideo(opened, { onProgress, signal, cropBorders: cropToggle.checked });
    if (signal.aborted) return;
    snapshots = result;
    for (const snap of snapshots) urls.set(snap.id, URL.createObjectURL(snap.blob));
    renderCarousel($('gallery'), snapshots, urls, selection, updateSaveButton);
    updateSaveButton();
    show('results');
  } catch (err) {
    // Si se canceló o ya empezó otro vídeo, este intento no debe tocar nada.
    if (signal.aborted || err?.name === 'AbortError') return;
    releaseResults();
    show('error');
  } finally {
    opened?.dispose();
    if (video === opened) video = null;
  }
});

saveButton.addEventListener('click', async () => {
  const chosen = snapshots.filter((s) => selection.isSelected(s.id));
  if (chosen.length === 0) return;
  const files = chosen.map(
    (s) =>
      new File([s.blob], fileNameFor(snapshots.indexOf(s) + 1, s.time), { type: 'image/jpeg' }),
  );
  const outcome = await saveToPhotos(files);
  if (outcome === 'shared') say('Fotos guardadas');
  else if (outcome === 'unsupported') {
    renderFallbackGrid($('fallback-grid'), chosen, urls);
    show('fallback');
  }
});

$('back').addEventListener('click', reset);
$('cancel').addEventListener('click', reset);
$('error-back').addEventListener('click', reset);
$('fallback-back').addEventListener('click', () => show('results'));

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
