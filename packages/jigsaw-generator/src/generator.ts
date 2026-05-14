import type { PieceData } from '@puzzle-app/shared';

export type EdgeType = 'tab' | 'blank' | 'flat';

export interface EdgeConfig {
  top: EdgeType;
  right: EdgeType;
  bottom: EdgeType;
  left: EdgeType;
}

export interface GenerateOptions {
  cols: number;
  rows: number;
  width: number;
  height: number;
  tabRatio?: number;
  seed?: number;
}

interface SeededRng {
  next: () => number;
}

function createRng(seed: number): SeededRng {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return {
    next: () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    },
  };
}

export function generateEdges(rows: number, cols: number, seed?: number): EdgeConfig[][] {
  const rng = createRng(seed ?? Date.now());
  const edges: EdgeConfig[][] = [];

  for (let row = 0; row < rows; row++) {
    edges[row] = [];
    for (let col = 0; col < cols; col++) {
      edges[row][col] = {
        top: row === 0 ? 'flat' : flip(edges[row - 1][col].bottom),
        right: col === cols - 1 ? 'flat' : randomEdge(rng),
        bottom: row === rows - 1 ? 'flat' : randomEdge(rng),
        left: col === 0 ? 'flat' : flip(edges[row][col - 1].right),
      };
    }
  }

  return edges;
}

function flip(edge: EdgeType): EdgeType {
  if (edge === 'tab') return 'blank';
  if (edge === 'blank') return 'tab';
  return 'flat';
}

function randomEdge(rng: SeededRng): EdgeType {
  return rng.next() > 0.5 ? 'tab' : 'blank';
}

export function generatePieces(options: GenerateOptions): PieceData[] {
  const { cols, rows, width, height, tabRatio = 0.2 } = options;
  const edges = generateEdges(rows, cols, options.seed);
  const cellW = width / cols;
  const cellH = height / rows;
  const tab = Math.min(cellW, cellH) * tabRatio;
  const pieces: PieceData[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const edgeConf = edges[row][col];
      const leftExt = edgeConf.left === 'tab' ? tab : 0;
      const topExt = edgeConf.top === 'tab' ? tab : 0;
      const rightExt = edgeConf.right === 'tab' ? tab : 0;
      const bottomExt = edgeConf.bottom === 'tab' ? tab : 0;

      const fullPath = buildPiecePath(cellW, cellH, tab, edgeConf, leftExt, topExt);
      const pieceW = leftExt + cellW + rightExt;
      const pieceH = topExt + cellH + bottomExt;

      pieces.push({
        id: `piece-${row}-${col}`,
        row,
        col,
        path: fullPath,
        targetX: col * cellW,
        targetY: row * cellH,
        offsetX: leftExt,
        offsetY: topExt,
        width: pieceW,
        height: pieceH,
        top: edgeConf.top,
        right: edgeConf.right,
        bottom: edgeConf.bottom,
        left: edgeConf.left,
      });
    }
  }

  return pieces;
}

function buildPiecePath(
  cellW: number,
  cellH: number,
  tab: number,
  edges: EdgeConfig,
  leftExt: number,
  topExt: number,
): string {
  const offsetX = leftExt;
  const offsetY = topExt;
  const totalW = leftExt + cellW + (edges.right === 'tab' ? tab : 0);
  const totalH = topExt + cellH + (edges.bottom === 'tab' ? tab : 0);

  const startX = offsetX;
  const startY = offsetY;

  const topEndX = offsetX + cellW;
  const rightEndY = offsetY + cellH;
  const bottomEndX = offsetX;
  const bottomStartY = offsetY + cellH;
  const leftEndY = offsetY;

  const parts: string[] = [];
  parts.push(`M ${startX} ${startY}`);

  // Top edge: left to right
  parts.push(drawEdge(
    startX, startY,
    topEndX, startY,
    edges.top,
    tab,
    false,
  ));

  // Right edge: top to bottom
  parts.push(drawEdge(
    topEndX, startY,
    topEndX, rightEndY,
    edges.right,
    tab,
    true,
  ));

  // Bottom edge: right to left
  parts.push(drawEdge(
    topEndX, bottomStartY,
    bottomEndX, bottomStartY,
    edges.bottom,
    tab,
    false,
  ));

  // Left edge: bottom to top
  parts.push(drawEdge(
    bottomEndX, bottomStartY,
    bottomEndX, leftEndY,
    edges.left,
    tab,
    true,
  ));

  parts.push('Z');
  return parts.join(' ');
}

function drawEdge(
  fromX: number, fromY: number,
  toX: number, toY: number,
  type: EdgeType,
  tab: number,
  isVertical: boolean,
): string {
  if (type === 'flat') {
    return `L ${toX} ${toY}`;
  }

  const outward = type === 'tab' ? 1 : -1;
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  if (isVertical) {
    return drawVerticalEdge(fromX, fromY, toX, toY, outward, tab, midX);
  } else {
    return drawHorizontalEdge(fromX, fromY, toX, toY, outward, tab, midY);
  }
}

function drawHorizontalEdge(
  fromX: number, fromY: number,
  toX: number, toY: number,
  outward: number,
  tab: number,
  midY: number,
): string {
  const len = toX - fromX;
  const perpY = outward;

  const neckW = len * 0.12;
  const neckNarrow = tab * 0.35;

  const p1x = fromX + len * 0.34;
  const p1y = fromY;
  const p2x = fromX + len * 0.38;
  const p2y = fromY + perpY * neckNarrow;
  const p3x = fromX + len * 0.38;
  const p3y = fromY + perpY * tab * 0.75;
  const p4x = fromX + len * 0.50;
  const p4y = fromY + perpY * tab;
  const p5x = fromX + len * 0.62;
  const p5y = fromY + perpY * tab * 0.75;
  const p6x = fromX + len * 0.62;
  const p6y = fromY + perpY * neckNarrow;
  const p7x = fromX + len * 0.66;
  const p7y = fromY;

  return [
    `L ${p1x} ${p1y}`,
    `C ${p1x} ${p2y}, ${p2x} ${p3y}, ${p4x} ${p4y}`,
    `C ${p5x} ${p5y}, ${p6x} ${p6y}, ${p7x} ${p7y}`,
    `L ${toX} ${toY}`,
  ].join(' ');
}

function drawVerticalEdge(
  fromX: number, fromY: number,
  toX: number, toY: number,
  outward: number,
  tab: number,
  midX: number,
): string {
  const len = toY - fromY;
  const perpX = outward;

  const neckW = tab * 0.35;
  const neckY = len * 0.12;

  const p1x = fromX;
  const p1y = fromY + len * 0.34;
  const p2x = fromX + perpX * neckW;
  const p2y = fromY + len * 0.38;
  const p3x = fromX + perpX * tab * 0.75;
  const p3y = fromY + len * 0.38;
  const p4x = fromX + perpX * tab;
  const p4y = fromY + len * 0.50;
  const p5x = fromX + perpX * tab * 0.75;
  const p5y = fromY + len * 0.62;
  const p6x = fromX + perpX * neckW;
  const p6y = fromY + len * 0.62;
  const p7x = fromX;
  const p7y = fromY + len * 0.66;

  return [
    `L ${p1x} ${p1y}`,
    `C ${p2x} ${p2y}, ${p3x} ${p3y}, ${p4x} ${p4y}`,
    `C ${p5x} ${p5y}, ${p6x} ${p6y}, ${p7x} ${p7y}`,
    `L ${toX} ${toY}`,
  ].join(' ');
}