import { Badge } from '@/components/ui/badge';
import type { Priority } from '@questboard/shared';

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <Badge variant={priority} className={className}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
