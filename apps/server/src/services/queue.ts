import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const puzzleQueue = new Queue('puzzle-generation', { connection });

export async function enqueuePuzzleGeneration(data: {
  puzzleId: string;
  imageKey: string;
  gridCols: number;
  gridRows: number;
}): Promise<void> {
  await puzzleQueue.add('generate', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}