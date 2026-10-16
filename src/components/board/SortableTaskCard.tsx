import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../domain/types';
import { TaskCard } from './TaskCard';

export interface SortableTaskCardProps {
  task: Task;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SortableTaskCard: React.FC<SortableTaskCardProps> = ({
  task,
  disabled = false,
  onClick,
  className = '',
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled,
    data: {
      type: 'task',
      task,
      statusId: task.statusId,
    },
  });

  const style: React.CSSProperties = {
    // DND-EXCEPTION: inline styles required for @dnd-kit transform and transition
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // When Enter is pressed on the focused card, open the Task Detail Drawer
    if (!disabled && e.key === 'Enter') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        handleKeyDown(e);
      }}
      className={`touch-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${className}`}
    >
      <TaskCard
        task={task}
        onClick={onClick}
        isDragging={isDragging}
        disabled={disabled}
        tabIndex={-1}
      />
    </div>
  );
};
