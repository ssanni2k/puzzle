import { z } from 'zod';

export const saveProgressSchema = z.object({
  stateJson: z.record(z.unknown()),
  completed: z.boolean().default(false),
});

export type SaveProgressInput = z.infer<typeof saveProgressSchema>;