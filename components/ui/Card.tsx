import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-xl border border-white/8 bg-charcoal-medium/60 p-5', className)} {...props} />
);

const badgeVariants: Record<string, string> = {
  default: 'bg-white/10 text-offwhite/80',
  lime: 'bg-lime/15 text-lime',
  forest: 'bg-forest/25 text-lime',
  outline: 'border border-white/15 text-offwhite/70',
  warning: 'bg-amber-500/15 text-amber-400',
  danger: 'bg-red-500/15 text-red-400',
};

export const Badge = ({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof badgeVariants }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
      badgeVariants[variant],
      className
    )}
    {...props}
  />
);

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-white/10">
    <p className="text-offwhite font-medium">{title}</p>
    {description && <p className="text-offwhite/50 text-sm mt-1.5 max-w-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
