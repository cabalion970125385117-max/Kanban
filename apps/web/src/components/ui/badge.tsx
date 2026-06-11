import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        low: 'bg-blue-100 text-blue-700',
        medium: 'bg-yellow-100 text-yellow-700',
        high: 'bg-orange-100 text-orange-700',
        critical: 'bg-red-100 text-[var(--color-danger)] font-semibold',
        admin: 'bg-purple-100 text-purple-700',
        maintenance: 'bg-amber-100 text-amber-700',
        member: 'bg-gray-100 text-gray-700',
        guest: 'bg-green-100 text-green-700',
        active: 'bg-green-100 text-green-700',
        inactive: 'bg-gray-100 text-gray-500',
        suspended: 'bg-red-100 text-red-700',
        default: 'bg-[var(--color-accent)] text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
