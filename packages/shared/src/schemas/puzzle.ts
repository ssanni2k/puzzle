import { z } from 'zod';

export const createPuzzleSchema = z.object({
  title: z.string().min(1).max(200),
  gridCols: z.number().int().min(3).max(10),
  gridRows: z.number().int().min(3).max(10),
});

export const updatePuzzleSchema = z.object({
  isPublic: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
});

export const puzzleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().optional(),
  mine: z.coerce.boolean().default(false),
});

export const puzzleStatusEnum = z.enum(['pending', 'processing', 'ready', 'error']);

export type CreatePuzzleInput = z.infer<typeof createPuzzleSchema>;
export type UpdatePuzzleInput = z.infer<typeof updatePuzzleSchema>;
export type PuzzleQueryInput = z.infer<typeof puzzleQuerySchema>;
export type PuzzleStatus = z.infer<typeof puzzleStatusEnum>;