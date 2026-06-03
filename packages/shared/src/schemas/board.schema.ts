import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
});
export type CreateBoardInput = z.infer<typeof createBoardSchema>;

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(200),
});
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;

export const addBoardMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'guest']).default('member'),
});
export type AddBoardMemberInput = z.infer<typeof addBoardMemberSchema>;

export const createColumnSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex colour').default('#5B4FCF'),
  wip_limit: z.number().int().positive().nullable().optional(),
});
export type CreateColumnInput = z.infer<typeof createColumnSchema>;

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order_index: z.number().int().min(0).optional(),
  wip_limit: z.number().int().positive().nullable().optional(),
});
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;

export const reorderColumnsSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex colour'),
});
export type CreateLabelInput = z.infer<typeof createLabelSchema>;

export const updateLabelSchema = createLabelSchema.partial();
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
