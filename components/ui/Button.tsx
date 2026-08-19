'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants: Record<string, string> = {
  primary: 'bg-lime text-charcoal hover:bg-lime/90 font-semibold',
  secondary: 'bg-charcoal-medium text-offwhite border border-white/10 hover:border-lime/50',
  ghost: 'bg-transparent text-offwhite/80 hover:text-offwhite hover:bg-white/5',
  danger: 'bg-transparent text-red-400 border border-red-400/30 hover:bg-red-400/10',
};

const sizes: Record<string, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
  lg: 'text-base px-5 py-3 rounded-xl gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
