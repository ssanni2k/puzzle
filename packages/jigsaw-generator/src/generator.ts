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
  tabSize?: number;
  seed?: number;
}

export function generateEdges(rows: number, cols: number, seed?: number): EdgeConfig[][] {
  const edges: EdgeConfig[][] = [];
  const rng = createRng(seed ?? Date.now());

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

function randomEdge(rng: () => number): EdgeType {
  return rng() > 0.5 ? 'tab' : 'blank';
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generatePieces(options: GenerateOptions): PieceData[] {
  const { cols, rows, width, height, tabSize = 0.15 } = options;
  const edges = generateEdges(rows, cols, options.seed);
  const cellW = width / cols;
  const cellH = height / rows;
  const tab = cellW * tabSize;
  const pieces: PieceData[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const edgeConf = edges[row][col];
      const offsetX = edgeConf.left === 'tab' ? tab : edgeConf.left === 'blank' ? -tab : 0;
      const offsetY = edgeConf.top === 'tab' ? tab : edgeConf.top === 'blank' ? -tab : 0;

      pieces.push({
        id: `piece-${row}-${col}`,
        row,
        col,
        path: buildPiecePath(cellW, cellH, tab, edgeConf),
        targetX: col * cellW,
        targetY: row * cellH,
        offsetX,
        offsetY,
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
): string {
  const parts: string[] = [];
  parts.push(`M 0 0`);

  parts.push(drawEdgeH(cellW, tab, edges.top));
  parts.push(drawEdgeV(cellH, tab, edges.right));
  parts.push(drawEdgeH(cellW, tab, edges.bottom, true));
  parts.push(drawEdgeV(cellH, tab, edges.left, true));
  parts.push('Z');

  return parts.join(' ');
}

function drawEdgeH(length: number, tab: number, type: EdgeType, reverse = false): string {
  if (type === 'flat') {
    return reverse ? `L 0 ${length}` : `L ${length} 0`;
  }
  const dir = type === 'tab' ? -1 : 1;
  const half = length / 2;
  const neckW = tab * 0.4;

  if (!reverse) {
    return [
      `L ${half - neckW} 0`,
      `C ${half - neckW * 2} ${dir * tab * 0.6}, ${half - tab * 0.3} ${dir * tab}, ${half} ${dir * tab}`,
      `C ${half + tab * 0.3} ${dir * tab}, ${half + neckW * 2} ${dir * tab * 0.6}, ${half + neckW} 0`,
      `L ${length} 0`,
    ].join(' ');
  }

  return [
    `L ${length - half + neckW} ${length}`,
    `C ${length - half + neckW * 2} ${length + dir * tab * 0.6}, ${length - half + tab * 0.3} ${length + dir * tab}, ${length - half} ${length + dir * tab}`,
    `C ${length - half - tab * 0.3} ${length + dir * tab}, ${length - half - neckW * 2} ${length + dir * tab * 0.6}, ${length - half - neckW} ${length}`,
    `L 0 ${length}`,
  ].join(' ');
}

function drawEdgeV(length: number, tab: number, type: EdgeType, reverse = false): string {
  if (type === 'flat') {
    return reverse ? `L 0 0` : `L 0 ${length}`;
  }
  const dir = type === 'tab' ? 1 : -1;
  const half = length / 2;
  const neckW = tab * 0.4;
  const xBase = reverse ? length : 0;

  if (!reverse) {
    return [
      `L 0 ${half - neckW}`,
      `C ${dir * tab * 0.6} ${half - neckW * 2}, ${dir * tab} ${half - tab * 0.3}, ${dir * tab} ${half}`,
      `C ${dir * tab} ${half + tab * 0.3}, ${dir * tab * 0.6} ${half + neckW * 2}, 0 ${half + neckW}`,
      `L 0 ${length}`,
    ].join(' ');
  }

  return [
    `L ${length} ${length - half + neckW}`,
    `C ${length + dir * tab * 0.6} ${length - half + neckW * 2}, ${length + dir * tab} ${length - half + tab * 0.3}, ${length + dir * tab} ${length - half}`,
    `C ${length + dir * tab} ${length - half - tab * 0.3}, ${length + dir * tab * 0.6} ${length - half - neckW * 2}, ${length} ${length - half - neckW}`,
    `L ${length} 0`,
  ].join(' ');
}