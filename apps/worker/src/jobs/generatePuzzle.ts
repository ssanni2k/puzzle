import { generatePieces } from '@puzzle-app/jigsaw-generator';
import type { PieceData, PuzzleContours } from '@puzzle-app/shared';
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

const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 600;

export async function generatePuzzle(data: GeneratePuzzleData): Promise<void> {
  const { puzzleId, imageKey, gridCols, gridRows } = data;

  try {
    await markStatus(puzzleId, 'processing');

    const imageBuffer = await downloadImage(imageKey);

    const processedImage = await sharp(imageBuffer)
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();

    await minioClient.putObject(BUCKET_IMAGES, imageKey, processedImage, processedImage.length, {
      'Content-Type': 'image/jpeg',
    });

    const pieces: PieceData[] = generatePieces({
      cols: gridCols,
      rows: gridRows,
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
    });

    const baseKey = imageKey.replace(/\.[^.]+$/, '');
    const piecesDir = `${baseKey}/pieces`;

    await sliceAndUploadPieces(processedImage, pieces, piecesDir);

    const contoursKey = `${baseKey}/contours.json`;
    const contours: PuzzleContours = {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      cols: gridCols,
      rows: gridRows,
      pieces,
      piecesBaseUrl: piecesDir,
    };

    const contoursData = JSON.stringify(contours);
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

async function sliceAndUploadPieces(
  sourceBuffer: Buffer,
  pieces: PieceData[],
  piecesDir: string,
): Promise<void> {
  for (const piece of pieces) {
    const pieceBuffer = await slicePiece(sourceBuffer, piece);
    const pieceKey = `${piecesDir}/${piece.id}.png`;

    await minioClient.putObject(BUCKET_PIECES, pieceKey, pieceBuffer, pieceBuffer.length, {
      'Content-Type': 'image/png',
    });
  }
}

async function slicePiece(
  sourceBuffer: Buffer,
  piece: PieceData,
): Promise<Buffer> {
  const extractLeft = Math.max(0, Math.round(piece.targetX - piece.offsetX));
  const extractTop = Math.max(0, Math.round(piece.targetY - piece.offsetY));
  const extractWidth = Math.min(Math.round(piece.width), IMAGE_WIDTH - extractLeft);
  const extractHeight = Math.min(Math.round(piece.height), IMAGE_HEIGHT - extractTop);

  const maskSvg = [
    `<svg width="${extractWidth}" height="${extractHeight}" xmlns="http://www.w3.org/2000/svg">`,
    `  <path d="${piece.path}" fill="white" />`,
    `</svg>`,
  ].join('\n');

  return sharp(sourceBuffer)
    .extract({ left: extractLeft, top: extractTop, width: extractWidth, height: extractHeight })
    .composite([{
      input: Buffer.from(maskSvg),
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();
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