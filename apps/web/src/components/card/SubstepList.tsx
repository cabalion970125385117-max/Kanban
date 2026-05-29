import { useState, useRef } from 'react';
import { CheckSquare, Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubsteps, useCreateSubstep, useUpdateSubstep, useDeleteSubstep } from '@/hooks/useSubsteps';

interface SubstepListProps {
  cardId: string;
}

export function SubstepList({ cardId }: SubstepListProps) {
  const { data: substeps = [] } = useSubsteps(cardId);
  const create = useCreateSubstep(cardId);
  const update = useUpdateSubstep(cardId);
  const remove = useDeleteSubstep(cardId);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const done = substeps.filter((s) => s.is_complete).length;
  const total = substeps.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const submitNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) { setAdding(false); return; }
    create.mutate({ name: trimmed }, {
      onSuccess: () => { setNewName(''); setAdding(false); },
    });
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const saveEdit = (id: string) => {
    const trimmed = editName.trim();
    if (trimmed) update.mutate({ id, name: trimmed });
    setEditingId(null);
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
          <CheckSquare className="h-3.5 w-3.5" />
          <span>Subtasks</span>
          {total > 0 && (
            <span className="text-[var(--color-accent)] font-semibold">{done}/{total}</span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          onClick={() => { setAdding(true); setNewName(''); }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="w-full h-1.5 bg-[var(--color-border)] rounded-full mb-3 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              pct === 100 ? 'bg-green-500' : 'bg-[var(--color-accent)]',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Substep items */}
      <div className="space-y-1">
        {substeps.map((step) => (
          <div
            key={step.id}
            className="group flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50"
          >
            <GripVertical className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab" />
            <input
              type="checkbox"
              checked={step.is_complete}
              onChange={(e) => update.mutate({ id: step.id, is_complete: e.target.checked })}
              className="accent-[var(--color-accent)] flex-shrink-0 w-4 h-4 cursor-pointer"
            />
            {editingId === step.id ? (
              <input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => saveEdit(step.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(step.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 text-sm border-b border-[var(--color-accent)] outline-none bg-transparent py-0.5"
              />
            ) : (
              <span
                onClick={() => startEdit(step.id, step.name)}
                className={cn(
                  'flex-1 text-sm cursor-pointer',
                  step.is_complete
                    ? 'line-through text-[var(--color-text-muted)]'
                    : 'text-[var(--color-text)]',
                )}
              >
                {step.name}
              </span>
            )}
            <button
              onClick={() => remove.mutate(step.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[var(--color-danger)] transition-opacity flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new form */}
      {adding && (
        <div className="mt-2 flex gap-1.5 items-center">
          <Input
            autoFocus
            placeholder="Subtask name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNew();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
            className="flex-1 h-7 text-sm"
          />
          <Button size="sm" className="h-7 text-xs" onClick={submitNew} loading={create.isPending}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => { setAdding(false); setNewName(''); }}
          >
            Cancel
          </Button>
        </div>
      )}

      {!adding && total === 0 && (
        <button
          onClick={() => setAdding(true)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] py-1 transition-colors"
        >
          + Add a subtask
        </button>
      )}
    </div>
  );
}
