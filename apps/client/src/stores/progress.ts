import { writable } from 'svelte/store';

interface ProgressState {
  pieces: Record<string, { x: number; y: number; rotation: number; locked: boolean }>;
  completed: boolean;
}

function createProgressStore() {
  const { subscribe, set, update } = writable<ProgressState>({
    pieces: {},
    completed: false,
  });

  return {
    subscribe,
    set,
    update,
    lockPiece(pieceId: string, x: number, y: number) {
      update((state) => ({
        ...state,
        pieces: {
          ...state.pieces,
          [pieceId]: { x, y, rotation: 0, locked: true },
        },
      }));
    },
    reset() {
      set({ pieces: {}, completed: false });
    },
  };
}

export const progressStore = createProgressStore();