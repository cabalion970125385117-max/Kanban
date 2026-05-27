import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateRule, useUpdateRule } from '@/hooks/useAutomation';
import type {
  AutomationRule,
  Column,
  TriggerType,
  ConditionField,
  ConditionOp,
  ActionType,
  RuleCondition,
  RuleAction,
  Priority,
} from '@questboard/shared';

const TRIGGERS: { value: TriggerType; label: string }[] = [
  { value: 'card.moved', label: 'Card moved to column' },
  { value: 'card.created', label: 'Card created' },
  { value: 'card.priority_changed', label: 'Priority changed' },
  { value: 'substep.all_complete', label: 'All subtasks complete' },
];

const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'column_id', label: 'Column' },
  { value: 'title', label: 'Title' },
];

const CONDITION_OPS: { value: ConditionOp; label: string }[] = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
];

const ACTIONS: { value: ActionType; label: string }[] = [
  { value: 'set_priority', label: 'Set priority' },
  { value: 'move_card', label: 'Move card to column' },
  { value: 'send_notification', label: 'Send notification' },
];

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

interface RuleBuilderProps {
  boardId: string;
  columns: Column[];
  rule?: AutomationRule | null;
  onClose: () => void;
}

export function RuleBuilder({ boardId, columns, rule, onClose }: RuleBuilderProps) {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('card.moved');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, string>>({});
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [actions, setActions] = useState<RuleAction[]>([{ type: 'set_priority', priority: 'high' }]);
  const [nameError, setNameError] = useState('');

  const createRule = useCreateRule(boardId);
  const updateRule = useUpdateRule(boardId);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setTriggerType(rule.trigger_type);
      setTriggerConfig(rule.trigger_config);
      setConditions(rule.conditions);
      setActions(rule.actions);
    }
  }, [rule]);

  const handleSave = () => {
    if (!name.trim()) { setNameError('Rule name is required'); return; }
    if (actions.length === 0) return;
    setNameError('');

    const payload = {
      name: name.trim(),
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      conditions,
      actions,
    };

    if (rule) {
      updateRule.mutate({ ruleId: rule.id, patch: payload }, { onSuccess: onClose });
    } else {
      createRule.mutate(payload, { onSuccess: onClose });
    }
  };

  const addCondition = () =>
    setConditions((c) => [...c, { field: 'priority', op: 'eq', value: 'high' }]);

  const updateCondition = (i: number, patch: Partial<RuleCondition>) =>
    setConditions((c) => c.map((cond, idx) => (idx === i ? { ...cond, ...patch } : cond)));

  const removeCondition = (i: number) =>
    setConditions((c) => c.filter((_, idx) => idx !== i));

  const addAction = () =>
    setActions((a) => [...a, { type: 'send_notification', message: '' }]);

  const updateAction = (i: number, patch: Partial<RuleAction>) =>
    setActions((a) => a.map((act, idx) => (idx === i ? { ...act, ...patch } : act)));

  const removeAction = (i: number) =>
    setActions((a) => a.filter((_, idx) => idx !== i));

  const selectClass = 'w-full text-sm border border-[var(--color-border)] rounded-md px-2 py-1.5 bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]';

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-[var(--color-text)]">{rule ? 'Edit rule' : 'New automation rule'}</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="rule-name">Rule name</Label>
            <Input
              id="rule-name"
              placeholder="e.g. Escalate urgent cards"
              value={name}
              onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
              error={nameError}
            />
          </div>

          {/* Trigger */}
          <div className="space-y-2">
            <Label>When…</Label>
            <select
              className={selectClass}
              value={triggerType}
              onChange={(e) => { setTriggerType(e.target.value as TriggerType); setTriggerConfig({}); }}
            >
              {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            {triggerType === 'card.moved' && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">to column</span>
                <select
                  className={selectClass}
                  value={triggerConfig.toColumnId ?? ''}
                  onChange={(e) => setTriggerConfig({ toColumnId: e.target.value })}
                >
                  <option value="">Any column</option>
                  {columns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>If… (optional conditions)</Label>
              <button
                onClick={addCondition}
                className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            {conditions.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)]">No conditions — rule fires on every matching trigger.</p>
            )}
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  className={selectClass}
                  value={cond.field}
                  onChange={(e) => updateCondition(i, { field: e.target.value as ConditionField })}
                >
                  {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select
                  className={selectClass}
                  value={cond.op}
                  onChange={(e) => updateCondition(i, { op: e.target.value as ConditionOp })}
                >
                  {CONDITION_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {cond.field === 'priority' ? (
                  <select
                    className={selectClass}
                    value={cond.value}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : cond.field === 'column_id' ? (
                  <select
                    className={selectClass}
                    value={cond.value}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {columns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
                  </select>
                ) : (
                  <input
                    className={selectClass}
                    placeholder="value"
                    value={cond.value}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                  />
                )}
                <button onClick={() => removeCondition(i)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Then…</Label>
              <button
                onClick={addAction}
                className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            {actions.map((action, i) => (
              <div key={i} className="space-y-1.5 bg-[var(--color-bg)] rounded-lg p-3 border border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <select
                    className={selectClass}
                    value={action.type}
                    onChange={(e) => updateAction(i, { type: e.target.value as ActionType, priority: undefined, column_id: undefined, message: undefined })}
                  >
                    {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  {actions.length > 1 && (
                    <button onClick={() => removeAction(i)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] flex-shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {action.type === 'set_priority' && (
                  <select
                    className={selectClass}
                    value={action.priority ?? 'high'}
                    onChange={(e) => updateAction(i, { priority: e.target.value as Priority })}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                {action.type === 'move_card' && (
                  <select
                    className={selectClass}
                    value={action.column_id ?? ''}
                    onChange={(e) => updateAction(i, { column_id: e.target.value })}
                  >
                    <option value="">Select column…</option>
                    {columns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
                  </select>
                )}
                {action.type === 'send_notification' && (
                  <input
                    className={selectClass}
                    placeholder="Notification message (optional)"
                    value={action.message ?? ''}
                    onChange={(e) => updateAction(i, { message: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-3">
          <Button
            onClick={handleSave}
            loading={createRule.isPending || updateRule.isPending}
            className="flex-1"
          >
            {rule ? 'Save changes' : 'Create rule'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
