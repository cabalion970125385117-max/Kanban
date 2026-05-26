import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      res.status(422).json({ message: 'Validation error', errors });
      return;
    }
    req[target] = result.data;
    next();
  };
}
