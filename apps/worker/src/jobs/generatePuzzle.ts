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

async function cleanupPieces(piecesDir: string): Promise<void> {
  try {
    const objects = minioClient.listObjects(BUCKET_PIECES, `${piecesDir}/`, false);
    for await (const obj of objects) {
      if (obj.name) {
        await minioClient.removeObject(BUCKET_PIECES, obj.name);
      }
    }
  } catch {
    // ignore cleanup errors
  }
}

export async function generatePuzzle(data: GeneratePuzzleData): Promise<void> {
  const { puzzleId, imageKey, gridCols, gridRows } = data;

  const baseKey = imageKey.replace(/\.[^.]+$/, '');
  const piecesDir = `${baseKey}/pieces`;

  try {
    await markStatus(puzzleId, 'processing');

    const imageBuffer = await downloadImage(imageKey);

    const processedImage = await sharp(imageBuffer)
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();

    const processedKey = `${baseKey}_processed.jpg`;
    await minioClient.putObject(BUCKET_IMAGES, processedKey, processedImage, processedImage.length, {
      'Content-Type': 'image/jpeg',
    });

    let pieces: PieceData[];
    try {
      pieces = generatePieces({
        cols: gridCols,
        rows: gridRows,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
      });
    } catch (err) {
      console.error(`Puzzle ${puzzleId} piece generation failed:`, err);
      await markStatus(puzzleId, 'error');
      return;
    }

    await cleanupPieces(piecesDir);

    try {
      await sliceAndUploadPieces(processedImage, pieces, piecesDir);
    } catch (err) {
      await cleanupPieces(piecesDir);
      throw err;
    }

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
      .set({ status: 'ready', contoursKey, imageKey: processedKey })
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
  const uploadedKeys: string[] = [];

  try {
    for (const piece of pieces) {
      const pieceBuffer = await slicePiece(sourceBuffer, piece);
      const pieceKey = `${piecesDir}/${piece.id}.png`;

      await minioClient.putObject(BUCKET_PIECES, pieceKey, pieceBuffer, pieceBuffer.length, {
        'Content-Type': 'image/png',
      });
      uploadedKeys.push(pieceKey);
    }
  } catch (err) {
    for (const key of uploadedKeys) {
      try {
        await minioClient.removeObject(BUCKET_PIECES, key);
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

async function slicePiece(
  sourceBuffer: Buffer,
  piece: PieceData,
): Promise<Buffer> {
  const extractLeft = Math.max(0, Math.round(piece.targetX - piece.offsetX));
  const extractTop = Math.max(0, Math.round(piece.targetY - piece.offsetY));
  const extractWidth = Math.max(1, Math.min(Math.round(piece.width), IMAGE_WIDTH - extractLeft));
  const extractHeight = Math.max(1, Math.min(Math.round(piece.height), IMAGE_HEIGHT - extractTop));

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