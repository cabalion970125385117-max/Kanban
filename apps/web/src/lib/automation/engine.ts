/**
 * Local-first automation engine.
 * Called from mutation onSuccess handlers; evaluates rules and fires actions
 * directly against the IndexedDB API layer + Zustand store.
 */
import { getDB, uid, now } from '@/lib/db';
import { useBoardStore } from '@/stores/board.store';
import { notificationBus } from '@/components/shared/NotificationDrawer';
import * as cardsApi from '@/api/cards.api';
import type { Card, AutomationRule, RuleCondition, RuleAction } from '@questboard/shared';

// Prevent re-entrant execution (action firing another trigger for the same card)
const _executing = new Set<string>();

export type AutomationEvent =
  | { type: 'card.moved'; card: Card; toColumnId: string }
  | { type: 'card.created'; card: Card }
  | { type: 'card.priority_changed'; card: Card; newPriority: string }
  | { type: 'substep.all_complete'; card: Card };

export async function triggerAutomation(boardId: string, event: AutomationEvent): Promise<void> {
  const lockKey = `${boardId}:${event.card.id}`;
  if (_executing.has(lockKey)) return;

  try {
    const db = await getDB();
    const rules = await db.getAllFromIndex('automation_rules', 'by-board', boardId);
    const active = rules.filter((r) => r.is_active && r.trigger_type === event.type);
    if (!active.length) return;

    _executing.add(lockKey);

    for (const rule of active) {
      if (!matchesTriggerConfig(rule, event)) continue;
      if (!evaluateConditions(rule.conditions, event.card)) continue;
      await executeActions(rule.actions, event.card, boardId, rule.name);
    }
  } finally {
    _executing.delete(lockKey);
  }
}

function matchesTriggerConfig(rule: AutomationRule, event: AutomationEvent): boolean {
  const cfg = rule.trigger_config;
  if (event.type === 'card.moved' && cfg.toColumnId) {
    return cfg.toColumnId === event.toColumnId;
  }
  return true;
}

function evaluateConditions(conditions: RuleCondition[], card: Card): boolean {
  return conditions.every((cond) => {
    const cardValue = getCardField(card, cond.field);
    switch (cond.op) {
      case 'eq': return cardValue === cond.value;
      case 'neq': return cardValue !== cond.value;
      case 'contains': return cardValue.toLowerCase().includes(cond.value.toLowerCase());
      case 'not_contains': return !cardValue.toLowerCase().includes(cond.value.toLowerCase());
      default: return true;
    }
  });
}

function getCardField(card: Card, field: string): string {
  switch (field) {
    case 'priority': return card.priority;
    case 'column_id': return card.column_id;
    case 'title': return card.title;
    default: return '';
  }
}

async function executeActions(
  actions: RuleAction[],
  card: Card,
  boardId: string,
  ruleName: string,
): Promise<void> {
  for (const action of actions) {
    try {
      await executeAction(action, card, boardId, ruleName);
    } catch {
      // Individual action failure doesn't stop other actions
    }
  }
}

async function executeAction(
  action: RuleAction,
  card: Card,
  boardId: string,
  ruleName: string,
): Promise<void> {
  switch (action.type) {
    case 'set_priority': {
      if (!action.priority) return;
      const updated = await cardsApi.updateCard(card.id, { priority: action.priority });
      useBoardStore.getState().updateCard(card.id, { priority: updated.priority });
      break;
    }
    case 'move_card': {
      if (!action.column_id) return;
      const updated = await cardsApi.moveCard(card.id, { columnId: action.column_id, position: 0 });
      useBoardStore.getState().moveCardOptimistic(card.id, card.column_id, action.column_id, 0);
      void updated;
      break;
    }
    case 'send_notification': {
      const message = action.message ?? `Rule "${ruleName}" fired on card "${card.title}"`;
      const db = await getDB();
      const userId = (await db.getAll('sessions'))[0]?.userId ?? '';
      const notifId = uid();
      const createdAt = now();
      if (userId) {
        await db.put('notifications', {
          id: notifId,
          user_id: userId,
          type: 'system',
          title: `Automation: ${ruleName}`,
          message,
          is_read: false,
          created_at: createdAt,
        });
      }
      notificationBus.push({ id: notifId, message: `[${ruleName}] ${message}`, is_read: false, created_at: createdAt });
      break;
    }
  }
}
