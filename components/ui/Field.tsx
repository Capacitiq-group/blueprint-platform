'use client';

import { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Label = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('block text-xs font-medium uppercase tracking-wide text-offwhite/50 mb-1.5', className)} {...props} />
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-white/10 bg-charcoal-medium px-3.5 py-2.5 text-sm text-offwhite placeholder:text-offwhite/30 focus-ring focus:border-lime/50 transition-colors',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-white/10 bg-charcoal-medium px-3.5 py-2.5 text-sm text-offwhite placeholder:text-offwhite/30 focus-ring focus:border-lime/50 transition-colors resize-y min-h-[100px]',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-white/10 bg-charcoal-medium px-3.5 py-2.5 text-sm text-offwhite focus-ring focus:border-lime/50 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';
