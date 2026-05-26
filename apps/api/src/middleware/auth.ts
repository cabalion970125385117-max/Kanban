import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';
import { UserRole } from '@questboard/shared';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token', 'TOKEN_INVALID');
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }
    next();
  };
}
