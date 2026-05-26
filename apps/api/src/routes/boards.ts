import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import {
  createBoardSchema,
  updateBoardSchema,
  addBoardMemberSchema,
  createLabelSchema,
  updateLabelSchema,
} from '@questboard/shared';
import * as boardService from '../services/board.service';

const router = Router();
router.use(authenticate);

// ─── Board membership guard ───────────────────────────────────

function requireMember(options?: { adminOnly?: boolean }) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params.id;
      const { role } = await boardService.checkMembership(boardId, req.user!.id);
      if (options?.adminOnly && role !== 'admin') {
        return next(new AppError(403, 'Board admin required', 'FORBIDDEN'));
      }
      (req as Request & { boardRole: string }).boardRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── Board CRUD ───────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const boards = await boardService.getBoards(req.user!.id);
    res.json(boards);
  } catch (err) { next(err); }
});

router.post('/', validate(createBoardSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await boardService.createBoard(req.user!.id, req.body.name as string);
    res.status(201).json(board);
  } catch (err) { next(err); }
});

router.get('/:id', requireMember(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await boardService.getBoardById(req.params.id);
    res.json(board);
  } catch (err) { next(err); }
});

router.put('/:id', requireMember({ adminOnly: true }), validate(updateBoardSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await boardService.updateBoard(req.params.id, req.body.name as string);
    res.json(board);
  } catch (err) { next(err); }
});

router.delete('/:id', requireMember({ adminOnly: true }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await boardService.archiveBoard(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Members ──────────────────────────────────────────────────

router.get('/:id/members', requireMember(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await boardService.getBoardMembers(req.params.id);
    res.json(members);
  } catch (err) { next(err); }
});

router.post('/:id/members', requireMember({ adminOnly: true }), validate(addBoardMemberSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await boardService.addBoardMember(req.params.id, req.body.userId as string, req.body.role as import('@questboard/shared').UserRole);
    res.status(201).json({ message: 'Member added' });
  } catch (err) { next(err); }
});

router.delete('/:id/members/:userId', requireMember({ adminOnly: true }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await boardService.removeBoardMember(req.params.id, req.params.userId);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Labels ───────────────────────────────────────────────────

router.get('/:id/labels', requireMember(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const labels = await boardService.getLabels(req.params.id);
    res.json(labels);
  } catch (err) { next(err); }
});

router.post('/:id/labels', requireMember(), validate(createLabelSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const label = await boardService.createLabel(req.params.id, req.body.name as string, req.body.colour as string);
    res.status(201).json(label);
  } catch (err) { next(err); }
});

router.put('/:id/labels/:lid', requireMember(), validate(updateLabelSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const label = await boardService.updateLabel(req.params.id, req.params.lid, req.body as { name?: string; colour?: string });
    res.json(label);
  } catch (err) { next(err); }
});

router.delete('/:id/labels/:lid', requireMember(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await boardService.deleteLabel(req.params.id, req.params.lid);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
