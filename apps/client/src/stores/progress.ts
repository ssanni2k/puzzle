import type { PieceData } from '@puzzle-app/shared';
import { api } from '../lib/api.js';

interface PieceState {
  x: number;
  y: number;
  rotation: number;
  locked: boolean;
}

interface ProgressState {
  puzzleId: string;
  pieces: Record<string, PieceState>;
  completed: boolean;
}

const STORAGE_PREFIX = 'puzzle-progress:';

function createProgressStore() {
  let state = $state<ProgressState>({
    puzzleId: '',
    pieces: {},
    completed: false,
  });

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function initFromContours(puzzleId: string, pieces: PieceData[], boardWidth: number, boardHeight: number): ProgressState {
    const padding = 200;
    const totalW = boardWidth + padding * 2;
    const totalH = boardHeight + padding * 2;

    const pieceStates: Record<string, PieceState> = {};
    for (const piece of pieces) {
      const inLeftZone = Math.random() < 0.25;
      const inRightZone = Math.random() < 0.25 && !inLeftZone;

      let x: number;
      let y: number;

      if (inLeftZone) {
        x = Math.random() * (padding - piece.width);
        y = Math.random() * (totalH - piece.height);
      } else if (inRightZone) {
        x = padding + boardWidth + Math.random() * (padding - piece.width);
        y = Math.random() * (totalH - piece.height);
      } else {
        x = Math.random() * totalW;
        y = Math.random() * (totalH - piece.height);
        if (x > padding && x < padding + boardWidth) {
          x = x < padding + boardWidth / 2
            ? Math.random() * padding
            : padding + boardWidth + Math.random() * padding;
        }
      }

      pieceStates[piece.id] = {
        x,
        y,
        rotation: (Math.random() - 0.5) * 10,
        locked: false,
      };
    }

    state = {
      puzzleId,
      pieces: pieceStates,
      completed: false,
    };

    saveToLocalStorage();
    return state;
  }

  function lockPiece(pieceId: string, targetX: number, targetY: number) {
    if (!state.pieces[pieceId]) return;
    state.pieces = {
      ...state.pieces,
      [pieceId]: { x: targetX, y: targetY, rotation: 0, locked: true },
    };

    const allLocked = Object.values(state.pieces).every((p) => p.locked);
    if (allLocked) {
      state.completed = true;
    }

    saveToLocalStorage();
    debouncedSaveToServer();
  }

  function movePiece(pieceId: string, x: number, y: number, rotation: number) {
    const existing = state.pieces[pieceId];
    if (existing?.locked) return;
    state.pieces = {
      ...state.pieces,
      [pieceId]: { x, y, rotation, locked: false },
    };
  }

  function reset(puzzleId: string) {
    localStorage.removeItem(STORAGE_PREFIX + puzzleId);
    state = { puzzleId: '', pieces: {}, completed: false };
  }

  function load(saved: ProgressState) {
    state = saved;
  }

  function loadFromLocalStorage(puzzleId: string): ProgressState | null {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + puzzleId);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ProgressState;
      if (parsed.puzzleId !== puzzleId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async function loadFromServer(puzzleId: string): Promise<ProgressState | null> {
    try {
      const data = await api.get<{ stateJson: Record<string, unknown>; completed: boolean }>(`/progress/${puzzleId}`);
      if (!data.stateJson || typeof data.stateJson !== 'object') return null;
      const pieces = data.stateJson as unknown as Record<string, PieceState>;
      return {
        puzzleId,
        pieces,
        completed: data.completed,
      };
    } catch {
      return null;
    }
  }

  function saveToLocalStorage() {
    if (!state.puzzleId) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + state.puzzleId, JSON.stringify(state));
    } catch {
      // storage full or unavailable
    }
  }

  function debouncedSaveToServer() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToServer, 3000);
  }

  async function saveToServer() {
    if (!state.puzzleId || !Object.keys(state.pieces).length) return;
    try {
      await api.put(`/progress/${state.puzzleId}`, {
        stateJson: state.pieces,
        completed: state.completed,
      });
    } catch {
      // will retry on next debounce
    }
  }

  function getLockedCount(): number {
    return Object.values(state.pieces).filter((p) => p.locked).length;
  }

  function getTotalCount(): number {
    return Object.keys(state.pieces).length;
  }

  return {
    get state() { return state; },
    initFromContours,
    lockPiece,
    movePiece,
    reset,
    load,
    loadFromLocalStorage,
    loadFromServer,
    saveToLocalStorage,
    saveToServer,
    getLockedCount,
    getTotalCount,
  };
}

export const progressStore = createProgressStore();