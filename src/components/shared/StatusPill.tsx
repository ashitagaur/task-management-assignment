import React from 'react';
import { TaskStatus } from '../../domain/types';
import { STATUS_COLOR_STYLES } from '../../domain/constants';

export interface StatusPillProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = 'sm',
  className = '',
}) => {
  const styles = STATUS_COLOR_STYLES[status.color] || STATUS_COLOR_STYLES.gray;

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-xs gap-1.5'
      : 'px-3 py-1 text-xs gap-2';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border select-none ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} aria-hidden="true" />
      <span>{status.name}</span>
    </span>
  );
};
