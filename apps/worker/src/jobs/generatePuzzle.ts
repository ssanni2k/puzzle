import { generatePieces } from '@puzzle-app/jigsaw-generator';
import type { PieceData } from '@puzzle-app/shared';
import { minioClient, BUCKET_IMAGES, BUCKET_PIECES } from '../minio.js';
import { db } from '../db.js';
import { puzzles } from '../schema.js';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

interface GeneratePuzzleData {
  puzzleId: string;
  imageKey: string;
  gridCols: number;
  gridRows: number;
}

export async function generatePuzzle(data: GeneratePuzzleData): Promise<void> {
  const { puzzleId, imageKey, gridCols, gridRows } = data;

  try {
    await markStatus(puzzleId, 'processing');

    const imageBuffer = await downloadImage(imageKey);

    const processedImage = await sharp(imageBuffer)
      .resize(800, 600, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();

    await minioClient.putObject(BUCKET_IMAGES, imageKey, processedImage, processedImage.length, {
      'Content-Type': 'image/jpeg',
    });

    const pieces: PieceData[] = generatePieces({
      cols: gridCols,
      rows: gridRows,
      width: 800,
      height: 600,
    });

    const contoursKey = `${imageKey.replace(/\.[^.]+$/, '')}/contours.json`;
    const contoursData = JSON.stringify(pieces);

    await minioClient.putObject(BUCKET_PIECES, contoursKey, Buffer.from(contoursData), contoursData.length, {
      'Content-Type': 'application/json',
    });

    await db
      .update(puzzles)
      .set({ status: 'ready', contoursKey })
      .where(eq(puzzles.id, puzzleId));

    console.log(`Puzzle ${puzzleId} generated: ${pieces.length} pieces`);
  } catch (err) {
    console.error(`Puzzle ${puzzleId} generation failed:`, err);
    await markStatus(puzzleId, 'error');
  }
}

async function markStatus(puzzleId: string, status: string) {
  await db
    .update(puzzles)
    .set({ status })
    .where(eq(puzzles.id, puzzleId));
}

async function downloadImage(key: string): Promise<Buffer> {
  const stream = await minioClient.getObject(BUCKET_IMAGES, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk as Buffer);
  }
  return Buffer.concat(chunks);
}