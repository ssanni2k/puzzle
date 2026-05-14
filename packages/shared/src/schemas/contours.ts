export interface PuzzleContours {
  width: number;
  height: number;
  cols: number;
  rows: number;
  pieces: import('./index.js').PieceData[];
}