export type UserRole = 'admin' | 'maintenance' | 'member' | 'guest';
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

export interface Board {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  archived_at: string | null;
  member_count?: number;
}

export interface BoardMember {
  board_id: string;
  user_id: string;
  role: UserRole;
  user?: Pick<User, 'id' | 'name' | 'email'> & { avatar?: Pick<Avatar, 'thumb_url'> };
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  colour: string;
  order_index: number;
  wip_limit: number | null;
  created_at: string;
  card_count?: number;
}

export interface Label {
  id: string;
  board_id: string;
  name: string;
  colour: string;
}

export interface Card {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  start_date: string | null;
  end_date: string | null;
  estimate_hours: number | null;
  order_index: number;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  owners?: Array<{ id: string; name: string; avatar?: Pick<Avatar, 'thumb_url'> }>;
  labels?: Label[];
  substep_count?: number;
  substep_done?: number;
}

export interface Substep {
  id: string;
  card_id: string;
  name: string;
  is_complete: boolean;
  order_index: number;
  target_date: string | null;
  created_at: string;
}

export interface TimeLog {
  id: string;
  card_id: string;
  user_id: string;
  user_name?: string;
  minutes: number;
  is_billable: boolean;
  logged_at: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
}

// ─── Automation ───────────────────────────────────────────────────────────────

export type TriggerType =
  | 'card.moved'
  | 'card.created'
  | 'card.priority_changed'
  | 'substep.all_complete';

export type ConditionField = 'priority' | 'column_id' | 'title';
export type ConditionOp = 'eq' | 'neq' | 'contains' | 'not_contains';

export interface RuleCondition {
  field: ConditionField;
  op: ConditionOp;
  value: string;
}

export type ActionType = 'set_priority' | 'move_card' | 'send_notification';

export interface RuleAction {
  type: ActionType;
  priority?: Priority;
  column_id?: string;
  message?: string;
}

export interface AutomationRule {
  id: string;
  board_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, string>;
  conditions: RuleCondition[];
  actions: RuleAction[];
  is_active: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  card_id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}
