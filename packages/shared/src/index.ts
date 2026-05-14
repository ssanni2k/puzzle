import type { PuzzleStatus } from './schemas/puzzle.js';

export type { RegisterInput, LoginInput, ChangePasswordInput } from './schemas/auth.js';
export type { CreatePuzzleInput, UpdatePuzzleInput, PuzzleQueryInput, PuzzleStatus } from './schemas/puzzle.js';
export type { SaveProgressInput } from './schemas/progress.js';
export type { PuzzleContours } from './schemas/contours.js';

export { registerSchema, loginSchema, changePasswordSchema } from './schemas/auth.js';
export { createPuzzleSchema, updatePuzzleSchema, puzzleQuerySchema, puzzleStatusEnum } from './schemas/puzzle.js';
export { saveProgressSchema } from './schemas/progress.js';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface Puzzle {
  id: string;
  userId: string;
  title: string;
  gridCols: number;
  gridRows: number;
  imageKey: string;
  contoursKey: string | null;
  status: PuzzleStatus;
  isPublic: boolean;
  completionsCount: number;
  createdAt: string;
}

export interface Progress {
  id: string;
  userId: string;
  puzzleId: string;
  stateJson: Record<string, unknown>;
  completed: boolean;
  updatedAt: string;
}

export interface PieceData {
  id: string;
  row: number;
  col: number;
  path: string;
  targetX: number;
  targetY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  top: 'tab' | 'blank' | 'flat';
  right: 'tab' | 'blank' | 'flat';
  bottom: 'tab' | 'blank' | 'flat';
  left: 'tab' | 'blank' | 'flat';
}