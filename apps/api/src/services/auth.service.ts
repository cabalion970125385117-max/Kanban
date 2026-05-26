import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { User, UserRole } from '@questboard/shared';

const REFRESH_PREFIX = 'refresh:';
const RESET_PREFIX = 'reset:';
const FAILED_LOGIN_PREFIX = 'failed_login:';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60; // 15 minutes

function parseExpiry(str: string): number {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const n = parseInt(match[1]);
  const unit = match[2];
  const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (map[unit] ?? 60);
}

function signAccessToken(user: { id: string; email: string; name: string; role: UserRole }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
  );
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = uuidv4();
  const expiry = parseExpiry(env.REFRESH_TOKEN_EXPIRES_IN);
  await redis.set(`${REFRESH_PREFIX}${token}`, userId, 'EX', expiry);
  return token;
}

function pickUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    avatar_id: row.avatar_id as string | null,
    role: row.role as UserRole,
    status: row.status as User['status'],
    created_at: (row.created_at as Date).toISOString(),
    last_login_at: row.last_login_at ? (row.last_login_at as Date).toISOString() : null,
  };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  avatar_archetype?: string;
}): Promise<{ accessToken: string; refreshToken: string; user: User }> {
  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1 OR name = $2',
    [input.email.toLowerCase(), input.name],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError(409, 'Email or username already taken', 'CONFLICT');
  }

  const hash = await bcrypt.hash(input.password, 12);

  let avatarId: string | null = null;
  if (input.avatar_archetype) {
    // Assign a variant that minimizes duplicates in the DB
    const variantRes = await db.query(
      `SELECT variant, COUNT(*) as cnt FROM users
       JOIN avatars ON users.avatar_id = avatars.id
       WHERE avatars.archetype = $1
       GROUP BY variant ORDER BY cnt ASC LIMIT 1`,
      [input.avatar_archetype],
    );
    const variant = variantRes.rows[0]?.variant ?? 1;
    const avatarRes = await db.query(
      'SELECT id FROM avatars WHERE archetype = $1 AND variant = $2',
      [input.avatar_archetype, variant],
    );
    avatarId = avatarRes.rows[0]?.id ?? null;
  }

  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, avatar_id, role, status)
     VALUES ($1, $2, $3, $4, 'member', 'active')
     RETURNING id, name, email, avatar_id, role, status, created_at, last_login_at`,
    [input.name, input.email.toLowerCase(), hash, avatarId],
  );

  const user = pickUser(result.rows[0]);
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  return { accessToken, refreshToken, user };
}

export async function login(input: {
  identifier: string;
  password: string;
}): Promise<{ accessToken: string; refreshToken: string; user: User }> {
  const lockKey = `${FAILED_LOGIN_PREFIX}${input.identifier.toLowerCase()}`;
  const attempts = await redis.get(lockKey);
  if (attempts && parseInt(attempts) >= MAX_FAILED_ATTEMPTS) {
    throw new AppError(429, 'Account temporarily locked due to too many failed attempts', 'ACCOUNT_LOCKED');
  }

  const result = await db.query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.avatar_id, u.role, u.status,
            u.created_at, u.last_login_at
     FROM users u
     WHERE (u.email = $1 OR u.name = $1) AND u.status != 'suspended'`,
    [input.identifier.toLowerCase()],
  );

  const row = result.rows[0];
  const validPassword = row ? await bcrypt.compare(input.password, row.password_hash as string) : false;

  if (!row || !validPassword) {
    const newAttempts = await redis.incr(lockKey);
    if (newAttempts === 1) await redis.expire(lockKey, LOCK_DURATION);
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (row.status === 'inactive') {
    throw new AppError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
  }

  await redis.del(lockKey);
  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [row.id]);

  const user = pickUser(row);
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  return { accessToken, refreshToken, user };
}

export async function refresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; user: User }> {
  const userId = await redis.get(`${REFRESH_PREFIX}${refreshToken}`);
  if (!userId) throw new AppError(401, 'Invalid or expired refresh token', 'TOKEN_INVALID');

  const result = await db.query(
    `SELECT id, name, email, avatar_id, role, status, created_at, last_login_at
     FROM users WHERE id = $1 AND status = 'active'`,
    [userId],
  );
  if (!result.rows[0]) throw new AppError(401, 'User not found', 'USER_NOT_FOUND');

  // Rotate refresh token
  await redis.del(`${REFRESH_PREFIX}${refreshToken}`);
  const user = pickUser(result.rows[0]);
  const newAccessToken = signAccessToken(user);
  const newRefreshToken = await createRefreshToken(user.id);
  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
}

export async function logout(refreshToken: string): Promise<void> {
  await redis.del(`${REFRESH_PREFIX}${refreshToken}`);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const result = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (!result.rows[0]) return; // Don't reveal existence

  const token = uuidv4();
  await redis.set(`${RESET_PREFIX}${token}`, result.rows[0].id as string, 'EX', 30 * 60);
  // TODO: send email with reset link containing token
  console.log(`Password reset token for ${email}: ${token}`);
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const userId = await redis.get(`${RESET_PREFIX}${token}`);
  if (!userId) throw new AppError(400, 'Invalid or expired reset token', 'TOKEN_INVALID');

  const hash = await bcrypt.hash(newPassword, 12);
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  await redis.del(`${RESET_PREFIX}${token}`);
}
