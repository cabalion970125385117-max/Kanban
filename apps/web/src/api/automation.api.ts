import { getDB, uid, now } from '@/lib/db';
import type { AutomationRule, TriggerType, RuleCondition, RuleAction } from '@questboard/shared';

export interface CreateRuleInput {
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, string>;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export async function getRules(boardId: string): Promise<AutomationRule[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('automation_rules', 'by-board', boardId);
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function createRule(boardId: string, data: CreateRuleInput): Promise<AutomationRule> {
  const db = await getDB();
  const rule: AutomationRule = {
    id: uid(),
    board_id: boardId,
    name: data.name,
    trigger_type: data.trigger_type,
    trigger_config: data.trigger_config,
    conditions: data.conditions,
    actions: data.actions,
    is_active: true,
    created_at: now(),
  };
  await db.put('automation_rules', rule);
  return rule;
}

export async function updateRule(
  ruleId: string,
  patch: Partial<Omit<AutomationRule, 'id' | 'board_id' | 'created_at'>>,
): Promise<AutomationRule> {
  const db = await getDB();
  const existing = await db.get('automation_rules', ruleId);
  if (!existing) throw new Error('Rule not found');
  const updated = { ...existing, ...patch };
  await db.put('automation_rules', updated);
  return updated;
}

export async function deleteRule(ruleId: string): Promise<void> {
  const db = await getDB();
  await db.delete('automation_rules', ruleId);
}
