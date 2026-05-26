import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { submitBugReport } from '@/api/bugReport.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const bugSchema = z.object({
  title: z.string().min(1, 'Title is required').max(140),
  description: z.string().min(1, 'Description is required').max(2000),
  category: z.enum(['ui_bug', 'functionality', 'performance', 'security', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});
type BugFormInput = z.infer<typeof bugSchema>;

const CATEGORY_LABELS: Record<BugFormInput['category'], string> = {
  ui_bug: 'UI Bug',
  functionality: 'Functionality',
  performance: 'Performance',
  security: 'Security',
  other: 'Other',
};

const SEVERITY_LABELS: Record<BugFormInput['severity'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function BugReportDialog() {
  const { bugReportOpen, closeBugReport } = useUiStore();
  const { user } = useAuthStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<BugFormInput>({
      resolver: zodResolver(bugSchema),
      defaultValues: { category: 'functionality', severity: 'medium' },
    });

  if (!bugReportOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) closeBugReport();
  };

  const onSubmit = async (data: BugFormInput) => {
    await submitBugReport({
      ...data,
      current_page: window.location.pathname,
      submitted_by: user?.id ?? null,
    });
    toast.success('Bug report submitted — thank you!');
    reset();
    closeBugReport();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-[var(--color-danger)]" />
            <h2 className="text-base font-bold text-[var(--color-text)]">Report a Bug</h2>
          </div>
          <button
            onClick={closeBugReport}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="bug-title">Title</Label>
            <Input
              id="bug-title"
              placeholder="Short description of the bug"
              error={errors.title?.message}
              {...register('title')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bug-desc">Description</Label>
            <textarea
              id="bug-desc"
              rows={4}
              placeholder="Steps to reproduce, expected vs actual behaviour…"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-[var(--color-danger)]">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bug-category">Category</Label>
              <select
                id="bug-category"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                {...register('category')}
              >
                {(Object.keys(CATEGORY_LABELS) as BugFormInput['category'][]).map((k) => (
                  <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bug-severity">Severity</Label>
              <select
                id="bug-severity"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                {...register('severity')}
              >
                {(Object.keys(SEVERITY_LABELS) as BugFormInput['severity'][]).map((k) => (
                  <option key={k} value={k}>{SEVERITY_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Current Page</Label>
            <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-bg)] rounded px-3 py-2 border border-[var(--color-border)] font-mono">
              {window.location.pathname}
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={isSubmitting} className="flex-1">
              Submit Report
            </Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); closeBugReport(); }}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
