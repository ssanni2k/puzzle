export function createDnd(el: HTMLElement, options: {
  onDragStart?: (e: PointerEvent) => void;
  onDragMove?: (e: PointerEvent, dx: number, dy: number) => void;
  onDragEnd?: (e: PointerEvent) => void;
}) {
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    el.setPointerCapture(e.pointerId);
    el.style.zIndex = '1000';
    options.onDragStart?.(e);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;
    options.onDragMove?.(e, dx, dy);
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    el.style.zIndex = '';
    options.onDragEnd?.(e);
  }

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);

  return {
    destroy() {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
    },
  };
}