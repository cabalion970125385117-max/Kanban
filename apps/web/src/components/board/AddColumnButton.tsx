import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateColumn } from '@/hooks/useBoard';

interface AddColumnButtonProps {
  boardId: string;
}

export function AddColumnButton({ boardId }: AddColumnButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const createColumn = useCreateColumn(boardId);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createColumn.mutate(
      { name: trimmed, colour: '#5B4FCF' },
      {
        onSuccess: () => {
          setName('');
          setOpen(false);
        },
      },
    );
  };

  if (!open) {
    return (
      <div className="flex-shrink-0 w-64">
        <Button
          variant="ghost"
          className="w-full h-10 border-2 border-dashed border-white/30 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/50"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add column
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-64 bg-[var(--color-surface)] rounded-lg p-3 shadow-md">
      <Input
        autoFocus
        placeholder="Column name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') { setOpen(false); setName(''); }
        }}
        className="mb-2"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} loading={createColumn.isPending} className="flex-1">
          Add
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setOpen(false); setName(''); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
