import React from 'react';
import { Calendar } from 'lucide-react';
import { Task, User } from '../../domain/types';
import { PRIORITY_CONFIG } from '../../domain/constants';
import { PriorityBadge } from '../shared/PriorityBadge';
import { Avatar } from '../shared/Avatar';
import { useAppStore } from '../../store/store';

export interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  className?: string;
  isDragging?: boolean;
  disabled?: boolean;
  tabIndex?: number;
}

export function formatDueDate(dueDateStr: string | null): { text: string; isOverdue: boolean } | null {
  if (!dueDateStr) return null;
  const target = new Date(dueDateStr);
  if (isNaN(target.getTime())) return { text: dueDateStr, isOverdue: false };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: 'Today', isOverdue: false };
  if (diffDays === 1) return { text: 'Tomorrow', isOverdue: false };
  if (diffDays === -1) return { text: 'Yesterday', isOverdue: true };

  const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { text: formatted, isOverdue: diffDays < 0 };
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  className = '',
  isDragging = false,
  disabled = false,
  tabIndex,
}) => {
  const usersById = useAppStore((state) => state.usersById);
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.none;
  const dueInfo = formatDueDate(task.dueDate);

  const assignees = task.assigneeIds
    .map((id) => usersById[id])
    .filter((u): u is User => Boolean(u));

  const cursorClass = disabled
    ? 'cursor-not-allowed opacity-60'
    : isDragging
    ? 'cursor-grabbing'
    : 'cursor-grab active:cursor-grabbing';

  const effectiveTabIndex = tabIndex !== undefined ? tabIndex : disabled ? -1 : 0;

  return (
    <div
      role={tabIndex === -1 ? undefined : 'button'}
      tabIndex={effectiveTabIndex}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Task ${task.id}: ${task.title}`}
      className={`group relative bg-white rounded-xl border border-fb-border p-3.5 shadow-fb-card hover:shadow-md hover:border-gray-300 transition-all select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${cursorClass} ${className}`}
    >
      {/* Top row: Task ID + Priority indicator dot */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-medium text-fb-text-muted group-hover:text-fb-text-secondary transition-colors">
          {task.id}
        </span>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${priorityConfig.dotColor}`}
          title={`Priority: ${priorityConfig.label}`}
          aria-hidden="true"
        />
      </div>

      {/* Task Title */}
      <h4 className="text-xs font-semibold text-fb-text-primary leading-snug line-clamp-2 mb-3">
        {task.title}
      </h4>

      {/* Bottom metadata row */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        {/* Left: Priority badge */}
        <PriorityBadge priority={task.priority} size="sm" />

        {/* Right: Due Date + Assignees */}
        <div className="flex items-center gap-2 shrink-0">
          {dueInfo && (
            <div
              className={`flex items-center gap-1 text-[11px] ${
                dueInfo.isOverdue
                  ? 'text-fb-urgent-text font-medium'
                  : 'text-fb-text-muted'
              }`}
              title={dueInfo.isOverdue ? 'Overdue' : 'Due date'}
            >
              <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>{dueInfo.text}</span>
            </div>
          )}

          {assignees.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {assignees.map((assignee) => (
                <Avatar
                  key={assignee.id}
                  initials={assignee.initials}
                  name={assignee.name}
                  size="xs"
                  className="ring-2 ring-white"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
