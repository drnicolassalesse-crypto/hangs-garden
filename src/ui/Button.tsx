import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const styles: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:bg-primary/40',
  secondary:
    'bg-card text-primary border border-primary/20 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50',
  ghost:
    'bg-transparent text-ink-muted hover:text-ink active:scale-[0.98] disabled:opacity-50',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`rounded-full px-5 py-3 font-medium transition ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
