import { generatePieces } from '@puzzle-app/jigsaw-generator';
import type { PieceData } from '@puzzle-app/shared';

interface GeneratePuzzleData {
  puzzleId: string;
  imageKey: string;
  gridCols: number;
  gridRows: number;
}

export async function generatePuzzle(data: GeneratePuzzleData): Promise<void> {
  const { puzzleId, gridCols, gridRows } = data;

  console.log(`Generating puzzle ${puzzleId} (${gridCols}x${gridRows})`);

  // TODO: download image from MinIO
  // TODO: resize with Sharp
  // TODO: generate pieces with jigsaw-generator
  // TODO: slice image into pieces with Sharp
  // TODO: upload pieces + contours metadata to MinIO
  // TODO: update puzzle status in DB to 'ready' (or 'error' on failure)

  const width = 800;
  const height = 600;

  const pieces: PieceData[] = generatePieces({
    cols: gridCols,
    rows: gridRows,
    width,
    height,
  });

  console.log(`Generated ${pieces.length} pieces for puzzle ${puzzleId}`);
}