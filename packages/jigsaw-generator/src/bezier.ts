import type { EdgeConfig } from './edges.js';

export function buildPiecePath(
  cellW: number,
  cellH: number,
  tab: number,
  edges: EdgeConfig,
  leftExt: number,
  topExt: number,
): string {
  const offsetX = leftExt;
  const offsetY = topExt;

  const startX = offsetX;
  const startY = offsetY;

  const topEndX = offsetX + cellW;
  const rightEndY = offsetY + cellH;
  const bottomEndX = offsetX;
  const bottomStartY = offsetY + cellH;
  const leftEndY = offsetY;

  const parts: string[] = [];
  parts.push(`M ${startX} ${startY}`);

  parts.push(drawEdge(
    startX, startY,
    topEndX, startY,
    edges.top,
    tab,
    false,
  ));

  parts.push(drawEdge(
    topEndX, startY,
    topEndX, rightEndY,
    edges.right,
    tab,
    true,
  ));

  parts.push(drawEdge(
    topEndX, bottomStartY,
    bottomEndX, bottomStartY,
    edges.bottom,
    tab,
    false,
  ));

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
  type: 'tab' | 'blank' | 'flat',
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