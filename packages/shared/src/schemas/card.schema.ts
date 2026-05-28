import { z } from 'zod';

export const createCardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(140),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  column_id: z.string().uuid(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  estimate_hours: z.number().positive().nullable().optional(),
});
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  estimate_hours: z.number().positive().nullable().optional(),
  cover_colour: z.string().nullable().optional(),
});
export type UpdateCardInput = z.infer<typeof updateCardSchema>;

export const moveCardSchema = z.object({
  columnId: z.string().uuid(),
  position: z.number().int().min(0),
});
export type MoveCardInput = z.infer<typeof moveCardSchema>;

export const listCardsQuerySchema = z.object({
  columnId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  label: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>;
