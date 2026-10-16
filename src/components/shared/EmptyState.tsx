import React from 'react';
import { Plus } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No tasks here yet',
  description = 'Drop a task here or create one.',
  actionLabel = 'Add task',
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-white border border-fb-border shadow-fb-card max-w-lg mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-gray-50 border border-fb-border flex items-center justify-center text-fb-text-muted mb-4 shadow-xs">
        <Plus className="w-5 h-5 text-fb-text-secondary" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-fb-text-primary mb-1">
        {title}
      </h3>

      <p className="text-xs text-fb-text-secondary max-w-xs mb-5 leading-relaxed">
        {description}
      </p>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-fb-border bg-white hover:bg-gray-50 text-xs font-semibold text-fb-text-primary transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
        >
          <Plus className="w-3.5 h-3.5 text-fb-text-secondary" aria-hidden="true" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
