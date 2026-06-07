<script lang="ts">
  import type { PieceData } from '@puzzle-app/shared';
  import DraggablePiece from './DraggablePiece.svelte';

  interface HintHighlight {
    targetX: number;
    targetY: number;
    width: number;
    height: number;
  }

  interface Props {
    pieces: PieceData[];
    piecesBaseUrl: string;
    boardWidth?: number;
    boardHeight?: number;
    pieceStates: Record<string, { x: number; y: number; rotation: number; locked: boolean }>;
    scale: number;
    hintMode: boolean;
    hintHighlight: HintHighlight | null;
    showOriginal: boolean;
    originalImageUrl: string;
    onlock: (pieceId: string, x: number, y: number) => void;
    onmoveend: (pieceId: string, x: number, y: number) => void;
    onhintselect?: (pieceId: string) => void;
  }

  let {
    pieces,
    piecesBaseUrl,
    boardWidth = 800,
    boardHeight = 600,
    pieceStates,
    scale,
    hintMode,
    hintHighlight,
    showOriginal,
    originalImageUrl,
    onlock,
    onmoveend,
    onhintselect,
  }: Props = $props();

  const padding = 200;

  const totalWidth = $derived(boardWidth + padding * 2);
  const totalHeight = $derived(boardHeight + padding * 2);

  function getPieceUrl(piece: PieceData): string {
    return `${piecesBaseUrl}/${piece.id}.png`;
  }

  function getPieceX(piece: PieceData): number {
    const s = pieceStates[piece.id];
    return s ? s.x : piece.targetX + padding;
  }

  function getPieceY(piece: PieceData): number {
    const s = pieceStates[piece.id];
    return s ? s.y : piece.targetY + padding;
  }

  function getPieceRotation(piece: PieceData): number {
    const s = pieceStates[piece.id];
    return s ? s.rotation : 0;
  }

  function getPieceLocked(piece: PieceData): boolean {
    return pieceStates[piece.id]?.locked ?? false;
  }

  const lockedCount = $derived(
    Object.values(pieceStates).filter((s) => s.locked).length,
  );
  const totalCount = $derived(pieces.length);
</script>

<div class="board-wrapper">
  <div class="progress">
    Зафиксировано {lockedCount} из {totalCount}
  </div>

  <div class="board-scaler" style="transform: scale({scale});">
    <div class="board-container" style="width:{totalWidth}px; height:{totalHeight}px;">
      <div
        class="board-area"
        style="left:{padding}px; top:{padding}px; width:{boardWidth}px; height:{boardHeight}px;"
      >
      </div>

      {#if showOriginal}
        <img
          class="original-overlay"
          src={originalImageUrl}
          alt=""
          style="left:{padding}px; top:{padding}px; width:{boardWidth}px; height:{boardHeight}px;"
        />
      {/if}

      {#if hintHighlight}
        <div
          class="hint-target"
          style="left:{hintHighlight.targetX + padding}px; top:{hintHighlight.targetY + padding}px; width:{hintHighlight.width}px; height:{hintHighlight.height}px;"
        ></div>
      {/if}

      {#each pieces as piece (piece.id)}
        <DraggablePiece
          piece={piece}
          x={getPieceX(piece)}
          y={getPieceY(piece)}
          rotation={getPieceRotation(piece)}
          locked={getPieceLocked(piece)}
          pieceUrl={getPieceUrl(piece)}
          snapTargetX={piece.targetX + padding}
          snapTargetY={piece.targetY + padding}
          scale={scale}
          highlighted={hintMode && !getPieceLocked(piece)}
          onlock={onlock}
          onmoveend={onmoveend}
          onhintselect={onhintselect}
        />
      {/each}
    </div>
  </div>
</div>

<style>
  .board-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .progress {
    font-size: 1.1rem;
    font-weight: 600;
    color: #2d3748;
  }

  .board-scaler {
    transform-origin: top center;
  }

  .board-container {
    position: relative;
    background: #e8ecf0;
    border-radius: 8px;
    border: 2px solid #cbd5e0;
  }

  .board-area {
    position: absolute;
    border: 2px dashed #a0aec0;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.3);
  }

  .original-overlay {
    position: absolute;
    opacity: 0.5;
    pointer-events: none;
    border-radius: 4px;
    transition: opacity 0.5s ease;
  }

  .hint-target {
    position: absolute;
    border: 3px solid #4299e1;
    border-radius: 4px;
    background: rgba(66, 153, 225, 0.15);
    pointer-events: none;
    animation: hint-blink 0.6s ease-in-out 4;
  }

  @keyframes hint-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>