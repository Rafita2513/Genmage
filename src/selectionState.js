/** Qué fotos del carrusel están marcadas. Empieza vacía. */
export function createSelection() {
  const marked = new Set();
  return {
    toggle(id) {
      if (marked.has(id)) marked.delete(id);
      else marked.add(id);
    },
    isSelected: (id) => marked.has(id),
    count: () => marked.size,
    clear: () => marked.clear(),
  };
}
