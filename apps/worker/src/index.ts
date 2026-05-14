import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { generatePuzzle } from './jobs/generatePuzzle.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  'puzzle-generation',
  async (job) => {
    if (job.name === 'generate') {
      await generatePuzzle(job.data);
    }
  },
  { connection, concurrency: 2 },
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log('Worker started, waiting for jobs...');