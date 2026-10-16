import React from 'react';
import { Flag } from 'lucide-react';
import { TaskPriority } from '../../domain/types';
import { PRIORITY_CONFIG } from '../../domain/constants';

export interface PriorityBadgeProps {
  priority: TaskPriority;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
  size = 'sm',
  className = '',
}) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.none;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border select-none ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} ${sizeClasses} ${className}`}
    >
      {showIcon && (
        <Flag className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />
      )}
      <span>{config.label}</span>
    </span>
  );
};
