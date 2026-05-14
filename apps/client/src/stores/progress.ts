interface PieceState {
  x: number;
  y: number;
  rotation: number;
  locked: boolean;
}

interface ProgressState {
  pieces: Record<string, PieceState>;
  completed: boolean;
}

function createProgressStore() {
  let state = $state<ProgressState>({
    pieces: {},
    completed: false,
  });

  function lockPiece(pieceId: string, x: number, y: number) {
    state.pieces = {
      ...state.pieces,
      [pieceId]: { x, y, rotation: 0, locked: true },
    };
  }

  function movePiece(pieceId: string, x: number, y: number, rotation: number) {
    const existing = state.pieces[pieceId];
    if (existing?.locked) return;
    state.pieces = {
      ...state.pieces,
      [pieceId]: { x, y, rotation, locked: false },
    };
  }

  function reset() {
    state = { pieces: {}, completed: false };
  }

  function load(saved: ProgressState) {
    state = saved;
  }

  return {
    get state() { return state; },
    lockPiece,
    movePiece,
    reset,
    load,
  };
}

export const progressStore = createProgressStore();