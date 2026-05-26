export type UserRole = 'admin' | 'member' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type HeroArchetype =
  | 'knight'
  | 'mage'
  | 'archer'
  | 'paladin'
  | 'rogue'
  | 'sorcerer'
  | 'berserker'
  | 'herald';

export interface Avatar {
  id: string;
  archetype: HeroArchetype;
  variant: 1 | 2 | 3 | 4;
  sprite_url: string;
  thumb_url: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_id: string | null;
  avatar?: Avatar;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}

export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
