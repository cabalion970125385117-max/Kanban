import { Router, Request, Response, NextFunction } from 'express';
import { authRateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  resetPasswordRequestSchema,
  resetPasswordConfirmSchema,
} from '@questboard/shared';
import * as authService from '../services/auth.service';
import { env } from '../config/env';

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

router.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken, user } = await authService.register(req.body);
      res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
      res.status(201).json({ accessToken, user });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken, user } = await authService.login(req.body);
      const maxAge = req.body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined;
      res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, ...(maxAge ? { maxAge } : {}) });
      res.json({ accessToken, user });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      res.status(401).json({ message: 'No refresh token', code: 'TOKEN_MISSING' });
      return;
    }
    const { accessToken, refreshToken, user } = await authService.refresh(token);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (token) await authService.logout(token);
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/reset-password/request',
  authRateLimit,
  validate(resetPasswordRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.json({ message: 'If an account exists, a reset email has been sent' });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/reset-password/confirm',
  authRateLimit,
  validate(resetPasswordConfirmSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.confirmPasswordReset(req.body.token, req.body.password);
      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
