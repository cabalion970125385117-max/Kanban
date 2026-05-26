import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar_archetype: z
    .enum(['knight', 'mage', 'archer', 'paladin', 'rogue', 'sorcerer', 'berserker', 'herald'])
    .optional(),
  role: z.enum(['admin', 'member', 'guest']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  role: z.enum(['admin', 'member', 'guest']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
