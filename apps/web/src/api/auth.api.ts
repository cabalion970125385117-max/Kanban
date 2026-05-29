/**
 * auth.api.ts — local-first implementation backed by IndexedDB + bcryptjs.
 * No server required.
 */
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { getDB, uid, now } from '@/lib/db';
import { seedDB } from '@/lib/db/seed';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthTokens, User, Avatar } from '@questboard/shared';
import type { LoginInput, RegisterInput } from '@questboard/shared';
import type { AvatarRow, UserRow } from '@/lib/db';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeError(message: string): Error {
  return Object.assign(new Error(message), { response: { data: { message } } });
}

function toUser(row: UserRow, avatar?: AvatarRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar_id: row.avatar_id,
    avatar: avatar as Avatar | undefined,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
  };
}

// ─── public API ───────────────────────────────────────────────────────────────

async function recordLoginAttempt(identifier: string, success: boolean, userId: string | null) {
  try {
    const db = await getDB();
    await db.put('login_attempts', { id: uid(), identifier, success, userId, timestamp: now() });
  } catch {
    // non-fatal
  }
}

export async function login(data: LoginInput): Promise<AuthTokens> {
  await seedDB();
  const db = await getDB();

  // Accept username OR email in the identifier field
  let user = await db.getFromIndex('users', 'by-email', data.identifier);
  if (!user) {
    const byName = await db.getAllFromIndex('users', 'by-name', data.identifier);
    user = byName[0];
  }
  if (!user) {
    await recordLoginAttempt(data.identifier, false, null);
    throw makeError('Invalid credentials');
  }

  const valid = await verifyPassword(data.password, user.password_hash);
  if (!valid) {
    await recordLoginAttempt(data.identifier, false, user.id);
    throw makeError('Invalid credentials');
  }

  await db.put('users', { ...user, last_login_at: now() });

  const token = uid();
  const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
  await db.put('sessions', { token, userId: user.id, expiresAt: Date.now() + SESSION_TTL });

  await recordLoginAttempt(data.identifier, true, user.id);

  const avatar = user.avatar_id ? (await db.get('avatars', user.avatar_id)) ?? undefined : undefined;
  return { accessToken: token, user: toUser(user, avatar) };
}

export async function register(data: RegisterInput): Promise<AuthTokens> {
  await seedDB();
  const db = await getDB();

  const existing = await db.getFromIndex('users', 'by-email', data.email);
  if (existing) throw makeError('Email already registered');

  const hash = await hashPassword(data.password);
  const archetype = data.avatar_archetype ?? 'knight';
  const avatars = await db.getAllFromIndex('avatars', 'by-archetype', archetype);
  const avatar = avatars[0];

  const userId = uid();
  const row: UserRow = {
    id: userId,
    name: data.name,
    email: data.email,
    password_hash: hash,
    avatar_id: avatar?.id ?? null,
    role: 'member',
    status: 'active',
    created_at: now(),
    last_login_at: now(),
  };
  await db.put('users', row);

  const token = uid();
  const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
  await db.put('sessions', { token, userId, expiresAt: Date.now() + SESSION_TTL });

  return { accessToken: token, user: toUser(row, avatar) };
}

export async function logout(): Promise<void> {
  // Token is cleared from localStorage by the auth store; nothing server-side.
}

export async function refreshToken(): Promise<AuthTokens> {
  // Validate an existing session token stored in auth store
  const token = useAuthStore.getState().accessToken;
  if (!token) throw makeError('Not authenticated');

  const db = await getDB();
  const session = await db.get('sessions', token);
  if (!session || session.expiresAt < Date.now()) {
    throw makeError('Session expired');
  }
  const user = await db.get('users', session.userId);
  if (!user) throw makeError('User not found');
  const avatar = user.avatar_id ? (await db.get('avatars', user.avatar_id)) ?? undefined : undefined;
  return { accessToken: token, user: toUser(user, avatar) };
}

export async function requestPasswordReset(_email: string): Promise<void> {
  // No-op in local mode
}

export async function getAvatars(): Promise<Avatar[]> {
  await seedDB();
  const db = await getDB();
  return (await db.getAll('avatars')) as Avatar[];
}
