/**
 * MarkdownEditor — Write/Preview split-pane editor for card descriptions.
 * Supports @mention autocomplete via MentionPicker.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, Pencil, Bold, Italic, Heading2, List, Code2, Link, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownPreview } from './MarkdownPreview';
import { MentionPicker } from './MentionPicker';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  boardId: string;
  /** Called on @mention — for typing indicator / notifications */
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

type Tab = 'write' | 'preview';

function wrapSelection(
  ta: HTMLTextAreaElement,
  before: string,
  after: string,
  setter: (v: string) => void,
) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  const next =
    ta.value.slice(0, start) +
    before +
    (selected || 'text') +
    after +
    ta.value.slice(end);
  setter(next);
  // Restore selection on next tick
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(
      start + before.length,
      start + before.length + (selected || 'text').length,
    );
  });
}

function insertLine(
  ta: HTMLTextAreaElement,
  prefix: string,
  setter: (v: string) => void,
) {
  const pos = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf('\n', pos - 1) + 1;
  const next =
    ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart);
  setter(next);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
  });
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  onCancel,
  boardId,
  onTypingStart,
  onTypingStop,
  placeholder = 'Add a description… (supports **markdown**)',
  autoFocus = false,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<Tab>('write');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.max(120, ta.scrollHeight)}px`;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\S*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(cursor - match[0].length);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = useCallback(
    (name: string) => {
      const ta = taRef.current;
      if (!ta) return;
      const after = value.slice(ta.selectionStart ?? value.length);
      const next = `${value.slice(0, mentionStart)}@${name} ${after}`;
      onChange(next);
      setMentionQuery(null);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = mentionStart + name.length + 2;
        ta.setSelectionRange(pos, pos);
      });
    },
    [value, mentionStart, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let MentionPicker handle Enter/Escape when open
    if (mentionQuery !== null) return;

    if (e.key === 'Escape') {
      onCancel?.();
    }
    // Ctrl/Cmd+Enter = save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSave?.();
    }
    // Tab = insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const next = value.slice(0, start) + '  ' + value.slice(ta.selectionEnd);
      onChange(next);
      requestAnimationFrame(() => ta.setSelectionRange(start + 2, start + 2));
    }
  };

  const TOOLBAR = [
    {
      icon: <Bold className="h-3.5 w-3.5" />,
      title: 'Bold (Ctrl+B)',
      action: () => taRef.current && wrapSelection(taRef.current, '**', '**', onChange),
    },
    {
      icon: <Italic className="h-3.5 w-3.5" />,
      title: 'Italic (Ctrl+I)',
      action: () => taRef.current && wrapSelection(taRef.current, '_', '_', onChange),
    },
    {
      icon: <Heading2 className="h-3.5 w-3.5" />,
      title: 'Heading',
      action: () => taRef.current && insertLine(taRef.current, '## ', onChange),
    },
    {
      icon: <List className="h-3.5 w-3.5" />,
      title: 'Bullet list',
      action: () => taRef.current && insertLine(taRef.current, '- ', onChange),
    },
    {
      icon: <Code2 className="h-3.5 w-3.5" />,
      title: 'Inline code',
      action: () => taRef.current && wrapSelection(taRef.current, '`', '`', onChange),
    },
    {
      icon: <Link className="h-3.5 w-3.5" />,
      title: 'Link',
      action: () => taRef.current && wrapSelection(taRef.current, '[', '](url)', onChange),
    },
    {
      icon: <AtSign className="h-3.5 w-3.5" />,
      title: 'Mention',
      action: () => {
        const ta = taRef.current;
        if (!ta) return;
        const pos = ta.selectionStart;
        const next = value.slice(0, pos) + '@' + value.slice(pos);
        onChange(next);
        setMentionQuery('');
        setMentionStart(pos);
        requestAnimationFrame(() => ta.focus());
      },
    },
  ];

  return (
    <div className="border border-[var(--color-accent)] rounded-lg overflow-hidden">
      {/* Tab bar + toolbar */}
      <div className="flex items-center justify-between bg-[var(--color-bg)] border-b border-[var(--color-border)] px-2 py-1">
        {/* Tabs */}
        <div className="flex gap-0">
          {(['write', 'preview'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'text-xs px-3 py-1 rounded font-medium capitalize transition-colors',
                tab === t
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              )}
            >
              {t === 'write' ? <><Pencil className="h-3 w-3 inline mr-1" />Write</> : <><Eye className="h-3 w-3 inline mr-1" />Preview</>}
            </button>
          ))}
        </div>

        {/* Toolbar (write tab only) */}
        {tab === 'write' && (
          <div className="flex gap-0.5">
            {TOOLBAR.map((btn, i) => (
              <button
                key={i}
                title={btn.title}
                onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
              >
                {btn.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor / Preview body */}
      {tab === 'write' ? (
        <div className="relative">
          <textarea
            ref={taRef}
            autoFocus={autoFocus}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={onTypingStart}
            onBlur={onTypingStop}
            placeholder={placeholder}
            className="w-full min-h-[120px] text-sm px-3 py-2 resize-none outline-none font-mono bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            style={{ height: 'auto' }}
          />

          {/* @mention picker */}
          {mentionQuery !== null && (
            <MentionPicker
              boardId={boardId}
              query={mentionQuery}
              onSelect={insertMention}
              onClose={() => setMentionQuery(null)}
              anchorRef={taRef}
            />
          )}
        </div>
      ) : (
        <div className="min-h-[120px] px-3 py-2 bg-[var(--color-surface)]">
          <MarkdownPreview markdown={value} />
        </div>
      )}

      {/* Footer actions */}
      {(onSave || onCancel) && (
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-bg)] border-t border-[var(--color-border)]">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            Ctrl+Enter to save · Esc to cancel · **bold** _italic_ `code`
          </span>
          <div className="flex gap-1.5">
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-xs px-2 py-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Cancel
              </button>
            )}
            {onSave && (
              <button
                onClick={onSave}
                className="text-xs px-3 py-1 rounded bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
