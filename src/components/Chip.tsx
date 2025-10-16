import React from 'react';

type ChipProps = {
  children: React.ReactNode;
  variant?: 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export default function Chip({
  children,
  variant = 'outline',
  size = 'md',
  className = '',
}: ChipProps) {
  const base = 'inline-flex items-center rounded-full font-medium transition';
  const sizeCls =
    size === 'lg'
      ? 'px-6 py-3 text-lg'
      : size === 'sm'
      ? 'px-3 py-1 text-sm'
      : 'px-4 py-1.5 text-base';

  const style =
    variant === 'filled'
      ? 'bg-slate-200 text-slate-900 border border-slate-300 shadow-sm'
      : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50';

  return (
    <span className={`${base} ${sizeCls} ${style} ${className}`}>
      {children}
    </span>
  );
}
