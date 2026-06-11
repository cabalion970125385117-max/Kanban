import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BUILTIN_TEMPLATES,
  getAllTemplates,
  deleteUserTemplate,
  createBoardFromTemplate,
} from '@/api/templates.api';
import type { Template } from '@/api/templates.api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

const PRIORITY_COLOURS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

function TemplatePreview({ template }: { template: Template }) {
  return (
    <div className="space-y-3">
      {/* Columns preview */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Columns ({template.columns.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {template.columns.map((col) => (
            <span
              key={col.order_index}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: col.colour }}
            >
              {col.name}
              {col.wip_limit != null && (
                <span className="opacity-70">WIP {col.wip_limit}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Sample cards preview */}
      {template.sample_cards.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Sample cards ({template.sample_cards.length})
          </p>
          <div className="space-y-1.5">
            {template.sample_cards.map((card, i) => {
              const col = template.columns[card.column_index];
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PRIORITY_COLOURS[card.priority] }}
                  />
                  <span className="flex-1 text-[var(--color-text)] truncate">{card.title}</span>
                  {col && (
                    <span
                      className="text-xs text-white px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: col.colour }}
                    >
                      {col.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function BoardTemplateGallery({ onClose }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Template>(BUILTIN_TEMPLATES[0]);
  const [boardName, setBoardName] = useState('');
  const [boardNameError, setBoardNameError] = useState('');
  const [includeSamples, setIncludeSamples] = useState(true);

  const { data: templates = [] } = useQuery({
    queryKey: ['board-templates'],
    queryFn: getAllTemplates,
  });

  const builtins = templates.filter((t) => t.is_builtin);
  const userSaved = templates.filter((t) => !t.is_builtin);

  const deleteTemplate = useMutation({
    mutationFn: deleteUserTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-templates'] });
      // If deleted template was selected, fall back to first builtin
      if (!selected.is_builtin) setSelected(BUILTIN_TEMPLATES[0]);
      toast.success('Template deleted');
    },
  });

  const createBoard = useMutation({
    mutationFn: () => createBoardFromTemplate(selected, boardName, includeSamples),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success(`Board "${board.name}" created from template!`);
      navigate(`/boards/${board.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCreate = () => {
    const trimmed = boardName.trim();
    if (!trimmed) {
      setBoardNameError('Board name is required');
      return;
    }
    setBoardNameError('');
    createBoard.mutate();
  };

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
            <h2 className="text-lg font-bold text-[var(--color-text)]">Board Templates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-muted)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: template list */}
          <div className="w-52 flex-shrink-0 border-r border-[var(--color-border)] overflow-y-auto py-3">
            {/* Built-in */}
            <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              Built-in
            </p>
            {builtins.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={cn(
                  'w-full text-left px-4 py-2 flex items-center gap-2 text-sm transition-colors',
                  selected.id === t.id
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]',
                )}
              >
                <span className="text-base leading-none">{t.icon}</span>
                <span className="truncate">{t.name}</span>
              </button>
            ))}

            {/* User saved */}
            {userSaved.length > 0 && (
              <>
                <div className="mt-3 mb-1 px-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Saved
                  </p>
                </div>
                {userSaved.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'group flex items-center gap-1 pr-1 transition-colors',
                      selected.id === t.id ? 'bg-[var(--color-accent)]/10' : 'hover:bg-[var(--color-bg)]',
                    )}
                  >
                    <button
                      onClick={() => setSelected(t)}
                      className={cn(
                        'flex-1 text-left px-4 py-2 flex items-center gap-2 text-sm',
                        selected.id === t.id
                          ? 'text-[var(--color-accent)] font-medium'
                          : 'text-[var(--color-text)]',
                      )}
                    >
                      <span className="text-base leading-none">{t.icon}</span>
                      <span className="truncate">{t.name}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate.mutate(t.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-[var(--color-danger)] text-[var(--color-text-muted)] transition-all"
                      title="Delete template"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Right: preview + create form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Template header */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{selected.icon}</span>
                <h3 className="text-xl font-bold text-[var(--color-text)]">{selected.name}</h3>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                {selected.description}
              </p>
            </div>

            <TemplatePreview template={selected} />

            {/* Create form */}
            <div className="border-t border-[var(--color-border)] pt-5 space-y-3">
              <p className="text-sm font-semibold text-[var(--color-text)]">Create board from this template</p>

              <div>
                <Input
                  placeholder={`e.g. ${selected.name} — Q3`}
                  value={boardName}
                  onChange={(e) => {
                    setBoardName(e.target.value);
                    if (boardNameError) setBoardNameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                  className={boardNameError ? 'border-[var(--color-danger)]' : ''}
                />
                {boardNameError && (
                  <p className="text-xs text-[var(--color-danger)] mt-1">{boardNameError}</p>
                )}
              </div>

              {selected.sample_cards.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={includeSamples}
                    onChange={(e) => setIncludeSamples(e.target.checked)}
                    className="rounded accent-[var(--color-accent)]"
                  />
                  Include {selected.sample_cards.length} sample cards
                </label>
              )}

              <Button onClick={handleCreate} loading={createBoard.isPending} className="w-full">
                Create Board
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
