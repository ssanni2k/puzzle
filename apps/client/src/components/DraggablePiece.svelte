<script lang="ts">
  import type { PieceData } from '@puzzle-app/shared';
  import { nextZ, SNAP_DISTANCE, SNAP_ANGLE } from '../lib/dnd.js';

  let {
    piece,
    x,
    y,
    rotation,
    locked,
    pieceUrl,
    snapTargetX,
    snapTargetY,
    scale,
    onlock,
    onmoveend,
  }: {
    piece: PieceData;
    x: number;
    y: number;
    rotation: number;
    locked: boolean;
    pieceUrl: string;
    snapTargetX: number;
    snapTargetY: number;
    scale: number;
    onlock: (pieceId: string, targetX: number, targetY: number) => void;
    onmoveend: (pieceId: string, x: number, y: number) => void;
  } = $props();

  let localX = $state(x);
  let localY = $state(y);
  let localRotation = $state(rotation);
  let isDragging = $state(false);
  let localLocked = $state(locked);
  let zIdx = $state(nextZ());
  let lastClientX = $state(0);
  let lastClientY = $state(0);

  $effect(() => {
    if (!isDragging) {
      localX = x;
      localY = y;
      localRotation = rotation;
      localLocked = locked;
    }
  });

  function handlePointerDown(e: PointerEvent) {
    if (localLocked) return;
    isDragging = true;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    zIdx = nextZ();
    e.preventDefault();
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging || localLocked) return;
    const s = scale || 1;
    localX += (e.clientX - lastClientX) / s;
    localY += (e.clientY - lastClientY) / s;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
  }

  function handlePointerUp() {
    if (!isDragging) return;
    isDragging = false;

    if (localLocked) return;

    const dx = localX - snapTargetX;
    const dy = localY - snapTargetY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < SNAP_DISTANCE && Math.abs(localRotation) < SNAP_ANGLE) {
      localLocked = true;
      requestAnimationFrame(() => {
        localX = snapTargetX;
        localY = snapTargetY;
        localRotation = 0;
      });
      onlock(piece.id, snapTargetX, snapTargetY);
    } else {
      onmoveend(piece.id, localX, localY);
    }
  }

  const transitionStyle = $derived(
    localLocked && !isDragging
      ? 'left 0.2s ease, top 0.2s ease, transform 0.2s ease'
      : 'none',
  );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="piece"
  class:locked={localLocked}
  class:dragging={isDragging}
  style="left:{localX}px; top:{localY}px; width:{piece.width}px; height:{piece.height}px; transform:rotate({localRotation}deg); z-index:{zIdx}; transition:{transitionStyle};"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
>
  <img src={pieceUrl} alt="" draggable="false" />
</div>

<style>
  .piece {
    position: absolute;
    cursor: grab;
    user-select: none;
    touch-action: none;
    will-change: left, top;
  }

  .piece.dragging {
    cursor: grabbing;
  }

  .piece.locked {
    pointer-events: none;
    filter: brightness(1.05);
  }

  .piece img {
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }
</style>