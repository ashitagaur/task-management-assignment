import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Task, TaskStatus, User } from '../../domain/types';
import { StatusPill } from '../shared/StatusPill';
import { PriorityBadge } from '../shared/PriorityBadge';
import { Avatar } from '../shared/Avatar';
import { useAppStore } from '../../store/store';
import { formatDueDate } from '../board/TaskCard';

export interface ListRowProps {
  task: Task;
  status?: TaskStatus;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onClick: () => void;
  className?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  task,
  status,
  isSelected = false,
  onToggleSelect,
  onClick,
  className = '',
}) => {
  const usersById = useAppStore((state) => state.usersById);
  const dueInfo = formatDueDate(task.dueDate);

  const assignees = task.assigneeIds
    .map((id) => usersById[id])
    .filter((u): u is User => Boolean(u));

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Task ${task.id}: ${task.title}`}
      className={`group border-b border-fb-border last:border-b-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:bg-gray-50 ${
        isSelected
          ? 'bg-fb-primary-soft/40 hover:bg-fb-primary-soft/50'
          : 'hover:bg-gray-50/80'
      } ${className}`}
    >
      {/* 0. SELECT CHECKBOX */}
      <td
        className="py-3 pl-4 pr-1 w-10 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.()}
          aria-label={`Select task ${task.id}`}
          className="w-4 h-4 rounded border-fb-border text-fb-primary focus:ring-fb-primary cursor-pointer accent-fb-primary"
        />
      </td>
      {/* 1. TASK: ID + Title */}
      <td className="py-3 px-4 min-w-[260px] max-w-md">
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-medium text-fb-text-muted group-hover:text-fb-text-secondary transition-colors">
            {task.id}
          </span>
          <span className="text-xs font-semibold text-fb-text-primary truncate">
            {task.title}
          </span>
        </div>
      </td>

      {/* 2. STATUS */}
      <td className="py-3 px-4 whitespace-nowrap">
        {status ? (
          <StatusPill status={status} size="sm" />
        ) : (
          <span className="text-xs text-fb-text-muted">—</span>
        )}
      </td>

      {/* 3. PRIORITY */}
      <td className="py-3 px-4 whitespace-nowrap">
        <PriorityBadge priority={task.priority} size="sm" />
      </td>

      {/* 4. ASSIGNEES */}
      <td className="py-3 px-4 whitespace-nowrap">
        {assignees.length > 0 ? (
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
        ) : (
          <span className="text-xs text-fb-text-muted italic">Unassigned</span>
        )}
      </td>

      {/* 5. DUE */}
      <td className="py-3 px-4 whitespace-nowrap">
        {dueInfo ? (
          <div
            className={`inline-flex items-center gap-1.5 text-xs ${
              dueInfo.isOverdue
                ? 'text-fb-urgent-text font-medium'
                : 'text-fb-text-secondary'
            }`}
            title={dueInfo.isOverdue ? 'Overdue' : 'Due date'}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{dueInfo.text}</span>
          </div>
        ) : (
          <span className="text-xs text-fb-text-muted">—</span>
        )}
      </td>

      {/* Trailing arrow */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <ChevronRight
          className="w-4 h-4 text-fb-text-subtle group-hover:text-fb-text-secondary transition-colors inline-block"
          aria-hidden="true"
        />
      </td>
    </tr>
  );
};
