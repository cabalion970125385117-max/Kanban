import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RuleList } from '@/components/automation/RuleList';
import { RuleBuilder } from '@/components/automation/RuleBuilder';
import { useAutomationRules } from '@/hooks/useAutomation';
import { useBoard } from '@/hooks/useBoard';
import { useBoardStore } from '@/stores/board.store';
import type { AutomationRule } from '@questboard/shared';

export function AutomationPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  const { boardQuery, isLoading } = useBoard(boardId ?? '');
  const { data: rules = [], isLoading: rulesLoading } = useAutomationRules(boardId ?? '');
  const columns = useBoardStore((s) => s.columns);

  if (!boardId) { navigate('/boards'); return null; }

  const openNew = () => { setEditingRule(null); setBuilderOpen(true); };
  const openEdit = (rule: AutomationRule) => { setEditingRule(rule); setBuilderOpen(true); };
  const closeBuilder = () => { setBuilderOpen(false); setEditingRule(null); };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center gap-4 shadow-md">
        <Button
          variant="ghost" size="icon"
          onClick={() => navigate(`/boards/${boardId}`)}
          className="text-white hover:bg-white/10"
          title="Back to board"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Zap className="h-4 w-4 text-yellow-300 flex-shrink-0" />
          <h1 className="text-base font-bold truncate">
            {boardQuery.data?.name ?? 'Board'} — Automation
          </h1>
        </div>
        {!isLoading && (
          <Button
            size="sm"
            variant="ghost"
            onClick={openNew}
            className="text-white hover:bg-white/10 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New rule</span>
          </Button>
        )}
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-primary)]">Automation Rules</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Rules fire automatically when their trigger conditions are met.
            </p>
          </div>
          {rules.length > 0 && (
            <Button onClick={openNew} size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New rule
            </Button>
          )}
        </div>

        {(isLoading || rulesLoading) ? (
          <div className="space-y-3">
            {[1, 2].map((n) => <div key={n} className="h-24 skeleton rounded-xl" />)}
          </div>
        ) : (
          <RuleList
            rules={rules}
            boardId={boardId}
            columns={columns}
            onNew={openNew}
            onEdit={openEdit}
          />
        )}
      </main>

      {builderOpen && (
        <RuleBuilder
          boardId={boardId}
          columns={columns}
          rule={editingRule}
          onClose={closeBuilder}
        />
      )}
    </div>
  );
}
