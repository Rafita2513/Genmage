const clock = (seconds) => {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/**
 * Carrusel de fotos con miniaturas. Tocar una foto la marca o desmarca.
 * @param {HTMLElement} root
 * @param {{id:string,time:number,blob:Blob}[]} snapshots
 * @param {Map<string,string>} urls  id → URL del blob
 * @param {{toggle:(id:string)=>void,isSelected:(id:string)=>boolean}} selection
 * @param {() => void} onChange  se llama tras cada cambio de selección
 */
export function renderCarousel(root, snapshots, urls, selection, onChange) {
  root.replaceChildren();
  const slidesEl = el('div', 'slides', { role: 'list', 'aria-label': 'Fotos del vídeo' });
  const thumbsEl = el('div', 'thumbs');
  const slides = [];
  const thumbs = [];

  snapshots.forEach((snap, i) => {
    const label = `Foto ${i + 1} de ${snapshots.length}, minuto ${clock(snap.time)}`;

    const slide = el('figure', 'slide', { role: 'listitem', 'data-id': snap.id });
    const img = el('img', '', { src: urls.get(snap.id), alt: label, draggable: 'false' });
    const badge = el('span', 'badge', { 'aria-hidden': 'true' });
    badge.textContent = '✓';
    const caption = el('figcaption');
    caption.textContent = clock(snap.time);
    slide.append(img, badge, caption);
    slide.addEventListener('click', () => {
      selection.toggle(snap.id);
      refresh();
      onChange();
    });

    const thumb = el('button', 'thumb', { type: 'button', 'aria-label': label });
    thumb.append(el('img', '', { src: urls.get(snap.id), alt: '' }));
    thumb.addEventListener('click', () => {
      slide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });

    slides.push(slide);
    thumbs.push(thumb);
    slidesEl.append(slide);
    thumbsEl.append(thumb);
  });

  function refresh() {
    snapshots.forEach((snap, i) => {
      const on = selection.isSelected(snap.id);
      slides[i].classList.toggle('selected', on);
      slides[i].setAttribute('aria-selected', String(on));
      thumbs[i].classList.toggle('selected', on);
    });
  }

  function markCurrent() {
    const width = slidesEl.clientWidth || 1;
    const index = Math.min(slides.length - 1, Math.round(slidesEl.scrollLeft / (width + 12)));
    thumbs.forEach((t, i) => t.classList.toggle('current', i === index));
    thumbs[index]?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }
  slidesEl.addEventListener('scroll', markCurrent, { passive: true });

  root.append(slidesEl, thumbsEl);
  refresh();
  markCurrent();
}

/** Respaldo cuando el navegador no puede compartir archivos. */
export function renderFallbackGrid(root, snapshots, urls) {
  root.replaceChildren();
  snapshots.forEach((snap, i) => {
    const img = el('img', '', {
      src: urls.get(snap.id),
      alt: `Foto ${i + 1}, minuto ${clock(snap.time)}`,
    });
    root.append(img);
  });
  const tip = el('p', 'note');
  tip.textContent = 'Mantén pulsada cada foto y elige Guardar imagen.';
  root.prepend(tip);
}
