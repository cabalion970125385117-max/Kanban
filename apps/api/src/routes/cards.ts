import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import {
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
  listCardsQuerySchema,
} from '@questboard/shared';
import * as boardService from '../services/board.service';
import * as cardService from '../services/card.service';

// ─── Board-scoped card routes (/boards/:id/cards) ─────────────

export const boardCardsRouter = Router();
boardCardsRouter.use(authenticate);

function requireBoardMember(options?: { guestForbidden?: boolean }) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params.id;
      const { role } = await boardService.checkMembership(boardId, req.user!.id);
      if (options?.guestForbidden && role === 'guest') {
        return next(new AppError(403, 'Guests cannot create cards', 'FORBIDDEN'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

boardCardsRouter.get(
  '/:id/cards',
  requireBoardMember(),
  validate(listCardsQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await cardService.getCards(req.params.id, req.query as unknown as Parameters<typeof cardService.getCards>[1]);
      res.json(result);
    } catch (err) { next(err); }
  },
);

boardCardsRouter.post(
  '/:id/cards',
  requireBoardMember({ guestForbidden: true }),
  validate(createCardSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await cardService.createCard(req.params.id, req.user!.id, req.body as Parameters<typeof cardService.createCard>[2]);
      res.status(201).json(card);
    } catch (err) { next(err); }
  },
);

// ─── Card-level routes (/cards/:id) ───────────────────────────

const router = Router();
router.use(authenticate);

async function loadCardBoard(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const card = await cardService.getCardById(req.params.id);
    await boardService.checkMembership(card.board_id, req.user!.id);
    (req as Request & { card: typeof card }).card = card;
    next();
  } catch (err) {
    next(err);
  }
}

router.get('/:id', loadCardBoard, async (req: Request, res: Response) => {
  res.json((req as Request & { card: unknown }).card);
});

router.put('/:id', loadCardBoard, validate(updateCardSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = (req as Request & { card: { board_id: string } }).card;
    const card = await cardService.updateCard(req.params.id, existing.board_id, req.body as Parameters<typeof cardService.updateCard>[2]);
    res.json(card);
  } catch (err) { next(err); }
});

router.delete('/:id', loadCardBoard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = (req as Request & { card: { board_id: string } }).card;
    await cardService.archiveCard(req.params.id, existing.board_id);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/:id/move', loadCardBoard, validate(moveCardSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = (req as Request & { card: { board_id: string } }).card;
    const card = await cardService.moveCard(
      req.params.id,
      existing.board_id,
      req.body.columnId as string,
      req.body.position as number,
      req.user!.id,
    );
    res.json(card);
  } catch (err) { next(err); }
});

export default router;
