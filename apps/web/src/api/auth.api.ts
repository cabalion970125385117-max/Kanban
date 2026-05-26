import client from './client';
import type { AuthTokens } from '@questboard/shared';
import type { LoginInput, RegisterInput } from '@questboard/shared';

export async function login(data: LoginInput): Promise<AuthTokens> {
  const res = await client.post<AuthTokens>('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterInput): Promise<AuthTokens> {
  const res = await client.post<AuthTokens>('/auth/register', data);
  return res.data;
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout');
}

export async function refreshToken(): Promise<AuthTokens> {
  const res = await client.post<AuthTokens>('/auth/refresh');
  return res.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await client.post('/auth/reset-password/request', { email });
}

export async function getAvatars(): Promise<
  Array<{ id: string; archetype: string; variant: number; sprite_url: string; thumb_url: string }>
> {
  const res = await client.get('/auth/avatars');
  return res.data;
}
