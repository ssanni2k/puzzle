import type { PieceData } from '../index.js';

export interface PuzzleContours {
  width: number;
  height: number;
  cols: number;
  rows: number;
  pieces: PieceData[];
  piecesBaseUrl: string;
}