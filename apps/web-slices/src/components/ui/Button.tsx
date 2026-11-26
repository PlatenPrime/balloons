import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const variantClass: Record<Variant, string> = {
  primary: 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'border-red-700 bg-red-700 text-white hover:bg-red-600',
};

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={[
        'inline-flex items-center justify-center rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-60',
        variantClass[variant],
        className,
      ].join(' ')}
      {...props}
    />
  );
}
