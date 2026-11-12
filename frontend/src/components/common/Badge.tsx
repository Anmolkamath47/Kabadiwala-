import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'blue' | 'purple' | 'slate' | 'rose';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  className = '',
}) => {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
