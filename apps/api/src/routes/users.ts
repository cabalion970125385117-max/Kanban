import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUserSchema, listUsersQuerySchema } from '@questboard/shared';
import { db } from '../config/db';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRole('admin'),
  validate(listUsersQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, search, role, status } = req.query as {
        page: number;
        limit: number;
        search?: string;
        role?: string;
        status?: string;
      };
      const offset = ((page as unknown as number) - 1) * (limit as unknown as number);

      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (search) {
        conditions.push(`(name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`);
        params.push(`%${search}%`);
        paramIdx++;
      }
      if (role) {
        conditions.push(`role = $${paramIdx}`);
        params.push(role);
        paramIdx++;
      }
      if (status) {
        conditions.push(`status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [countRes, dataRes] = await Promise.all([
        db.query(`SELECT COUNT(*) FROM users ${where}`, params),
        db.query(
          `SELECT u.id, u.name, u.email, u.avatar_id, u.role, u.status, u.created_at, u.last_login_at,
                  a.archetype as avatar_archetype, a.variant as avatar_variant,
                  a.sprite_url, a.thumb_url
           FROM users u LEFT JOIN avatars a ON u.avatar_id = a.id
           ${where}
           ORDER BY u.created_at DESC
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          [...params, limit, offset],
        ),
      ]);

      res.json({
        data: dataRes.rows,
        total: parseInt(countRes.rows[0].count as string),
        page,
        limit,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar_id, u.role, u.status, u.created_at, u.last_login_at,
              a.archetype as avatar_archetype, a.variant as avatar_variant,
              a.sprite_url, a.thumb_url
       FROM users u LEFT JOIN avatars a ON u.avatar_id = a.id
       WHERE u.id = $1`,
      [req.params.id],
    );
    if (!result.rows[0]) throw new AppError(404, 'User not found', 'NOT_FOUND');
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(updateUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;

    // Non-admins can only update themselves; admins can update anyone
    if (req.user!.role !== 'admin' && req.user!.id !== targetId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const { name, avatar_archetype, role, status } = req.body as {
      name?: string;
      avatar_archetype?: string;
      role?: string;
      status?: string;
    };

    // Only admins can change role/status
    if ((role || status) && req.user!.role !== 'admin') {
      throw new AppError(403, 'Only admins can change role or status', 'FORBIDDEN');
    }

    let avatarId: string | undefined;
    if (avatar_archetype) {
      const variantRes = await db.query(
        `SELECT variant, COUNT(*) as cnt FROM users
         JOIN avatars ON users.avatar_id = avatars.id
         WHERE avatars.archetype = $1 AND users.id != $2
         GROUP BY variant ORDER BY cnt ASC LIMIT 1`,
        [avatar_archetype, targetId],
      );
      const variant = variantRes.rows[0]?.variant ?? 1;
      const avatarRes = await db.query(
        'SELECT id FROM avatars WHERE archetype = $1 AND variant = $2',
        [avatar_archetype, variant],
      );
      avatarId = avatarRes.rows[0]?.id;
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (name) { sets.push(`name = $${idx++}`); params.push(name); }
    if (avatarId) { sets.push(`avatar_id = $${idx++}`); params.push(avatarId); }
    if (role) { sets.push(`role = $${idx++}`); params.push(role); }
    if (status) { sets.push(`status = $${idx++}`); params.push(status); }

    if (!sets.length) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    params.push(targetId);
    const result = await db.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, avatar_id, role, status, created_at, last_login_at`,
      params,
    );
    if (!result.rows[0]) throw new AppError(404, 'User not found', 'NOT_FOUND');
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/:id',
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
      if (!result.rows[0]) throw new AppError(404, 'User not found', 'NOT_FOUND');
      res.json({ message: 'User deleted' });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin' && req.user!.id !== req.params.id) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }
    const result = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/notifications/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin' && req.user!.id !== req.params.id) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }
    await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.params.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
