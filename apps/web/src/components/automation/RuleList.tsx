import { Zap, Trash2, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdateRule, useDeleteRule } from '@/hooks/useAutomation';
import type { AutomationRule, Column } from '@questboard/shared';

const TRIGGER_LABELS: Record<string, string> = {
  'card.moved': 'Card moved to column',
  'card.created': 'Card created',
  'card.priority_changed': 'Priority changed',
  'substep.all_complete': 'All subtasks complete',
};

const ACTION_LABELS: Record<string, string> = {
  set_priority: 'Set priority',
  move_card: 'Move card',
  send_notification: 'Send notification',
};

interface RuleListProps {
  rules: AutomationRule[];
  boardId: string;
  columns: Column[];
  onNew: () => void;
  onEdit: (rule: AutomationRule) => void;
}

export function RuleList({ rules, boardId, columns, onNew, onEdit }: RuleListProps) {
  const updateRule = useUpdateRule(boardId);
  const deleteRule = useDeleteRule(boardId);

  const colName = (id: string) => columns.find((c) => c.id === id)?.name ?? id;

  const triggerSummary = (rule: AutomationRule) => {
    const base = TRIGGER_LABELS[rule.trigger_type] ?? rule.trigger_type;
    if (rule.trigger_type === 'card.moved' && rule.trigger_config.toColumnId) {
      return `${base} "${colName(rule.trigger_config.toColumnId)}"`;
    }
    return base;
  };

  const actionSummary = (rule: AutomationRule) => {
    return rule.actions.map((a) => {
      const label = ACTION_LABELS[a.type] ?? a.type;
      if (a.type === 'set_priority') return `${label} → ${a.priority}`;
      if (a.type === 'move_card' && a.column_id) return `${label} → "${colName(a.column_id)}"`;
      if (a.type === 'send_notification') return label;
      return label;
    }).join(', ');
  };

  return (
    <div className="space-y-3">
      {rules.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">⚡</div>
          <p className="text-[var(--color-text-muted)] mb-6">No automation rules yet.</p>
          <Button onClick={onNew}>
            <Plus className="h-4 w-4 mr-1" />
            Create first rule
          </Button>
        </div>
      )}

      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`bg-[var(--color-surface)] rounded-xl border p-4 flex items-start gap-4 transition-opacity ${
            rule.is_active ? 'border-[var(--color-border)]' : 'border-[var(--color-border)] opacity-50'
          }`}
        >
          {/* Icon */}
          <div className={`mt-0.5 rounded-lg p-2 flex-shrink-0 ${rule.is_active ? 'bg-[var(--color-accent)]/10' : 'bg-gray-100'}`}>
            <Zap className={`h-4 w-4 ${rule.is_active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(rule)}>
            <p className="font-semibold text-sm text-[var(--color-text)] truncate">{rule.name}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              <span className="font-medium">When:</span> {triggerSummary(rule)}
            </p>
            {rule.conditions.length > 0 && (
              <p className="text-xs text-[var(--color-text-muted)]">
                <span className="font-medium">If:</span> {rule.conditions.length} condition{rule.conditions.length > 1 ? 's' : ''}
              </p>
            )}
            <p className="text-xs text-[var(--color-text-muted)]">
              <span className="font-medium">Then:</span> {actionSummary(rule)}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => updateRule.mutate({ ruleId: rule.id, patch: { is_active: !rule.is_active } })}
              className="p-1.5 rounded hover:bg-[var(--color-bg)] text-[var(--color-text-muted)] transition-colors"
              title={rule.is_active ? 'Disable rule' : 'Enable rule'}
            >
              {rule.is_active
                ? <ToggleRight className="h-5 w-5 text-[var(--color-accent)]" />
                : <ToggleLeft className="h-5 w-5" />
              }
            </button>
            <button
              onClick={() => deleteRule.mutate(rule.id)}
              className="p-1.5 rounded hover:bg-red-50 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
              title="Delete rule"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
