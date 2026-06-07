import type { PieceData } from '@puzzle-app/shared';
import { generateEdges } from './edges.js';
import { buildPiecePath } from './bezier.js';

export interface GenerateOptions {
  cols: number;
  rows: number;
  width: number;
  height: number;
  tabRatio?: number;
  seed?: number;
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