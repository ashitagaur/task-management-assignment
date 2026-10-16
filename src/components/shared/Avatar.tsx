import React from 'react';

export interface AvatarProps {
  initials: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-xs font-semibold',
  lg: 'w-10 h-10 text-sm font-semibold',
};

function getAvatarColor(initials: string): string {
  const norm = initials.toUpperCase();
  if (norm.includes('AA') || norm.includes('AG')) {
    return 'bg-fb-primary-soft text-fb-primary border-fb-primary/20';
  }
  if (norm.includes('BM')) {
    return 'bg-fb-success-soft text-fb-success border-fb-success/20';
  }
  if (norm.includes('CM')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-gray-100 text-fb-text-secondary border-gray-200';
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  name,
  size = 'md',
  className = '',
}) => {
  const colorClass = getAvatarColor(initials);
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full border select-none shrink-0 ${sizeClass} ${colorClass} ${className}`}
      aria-hidden={!name}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
};
