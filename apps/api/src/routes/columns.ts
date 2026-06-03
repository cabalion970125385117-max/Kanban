import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import {
  createColumnSchema,
  updateColumnSchema,
  reorderColumnsSchema,
} from '@questboard/shared';
import * as boardService from '../services/board.service';
import { emitToBoard } from '../socket/index';

const router = Router();
router.use(authenticate);

function requireMember(options?: { adminOnly?: boolean }) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params.id;
      const { role } = await boardService.checkMembership(boardId, req.user!.id);
      if (options?.adminOnly && role !== 'admin') {
        return next(new AppError(403, 'Board admin required', 'FORBIDDEN'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

router.get('/:id/columns', requireMember(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const columns = await boardService.getColumns(req.params.id);
    res.json(columns);
  } catch (err) { next(err); }
});

router.post('/:id/columns', requireMember(), validate(createColumnSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const column = await boardService.createColumn(
      req.params.id,
      req.body.name as string,
      req.body.colour as string,
      req.body.wip_limit as number | null | undefined,
    );
    emitToBoard(req.params.id, 'column:created', { column });
    res.status(201).json(column);
  } catch (err) { next(err); }
});

router.post('/:id/columns/reorder', requireMember(), validate(reorderColumnsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await boardService.reorderColumns(req.params.id, req.body.order as string[]);
    res.json({ message: 'Reordered' });
  } catch (err) { next(err); }
});

router.put('/:id/columns/:cid', requireMember(), validate(updateColumnSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const column = await boardService.updateColumn(req.params.id, req.params.cid, req.body as {
      name?: string;
      colour?: string;
      order_index?: number;
      wip_limit?: number | null;
    });
    emitToBoard(req.params.id, 'column:updated', { columnId: req.params.cid, patch: req.body });
    res.json(column);
  } catch (err) { next(err); }
});

router.delete('/:id/columns/:cid', requireMember({ adminOnly: true }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await boardService.deleteColumn(req.params.id, req.params.cid);
    emitToBoard(req.params.id, 'column:deleted', { columnId: req.params.cid });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
