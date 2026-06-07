export type EdgeType = 'tab' | 'blank' | 'flat';

export interface EdgeConfig {
  top: EdgeType;
  right: EdgeType;
  bottom: EdgeType;
  left: EdgeType;
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

function flip(edge: EdgeType): EdgeType {
  if (edge === 'tab') return 'blank';
  if (edge === 'blank') return 'tab';
  return 'flat';
}

function randomEdge(rng: SeededRng): EdgeType {
  return rng.next() > 0.5 ? 'tab' : 'blank';
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