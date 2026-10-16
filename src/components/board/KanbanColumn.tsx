import React from 'react';
import { Plus } from 'lucide-react';
import { Task, TaskStatus } from '../../domain/types';
import { STATUS_COLOR_STYLES } from '../../domain/constants';
import { TaskCard } from './TaskCard';

export interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask: (statusId: string) => void;
  className?: string;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onTaskClick,
  onCreateTask,
  className = '',
}) => {
  const statusStyles = STATUS_COLOR_STYLES[status.color] || STATUS_COLOR_STYLES.gray;

  return (
    <div
      className={`flex flex-col min-w-[280px] sm:min-w-[310px] w-[320px] max-w-[340px] shrink-0 bg-[#F0F2F6] rounded-2xl p-3 max-h-full ${className}`}
      data-status-id={status.id}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 px-1 py-1 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusStyles.dot}`}
            aria-hidden="true"
          />
          <h3 className="text-xs font-bold text-fb-text-primary uppercase tracking-wider truncate">
            {status.name}
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-white text-[11px] font-semibold text-fb-text-secondary border border-fb-border shrink-0 shadow-2xs">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onCreateTask(status.id)}
          aria-label={`Add task to ${status.name}`}
          title={`Add task to ${status.name}`}
          className="p-1 rounded-lg text-fb-text-muted hover:text-fb-text-primary hover:bg-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Task Card List */}
      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto min-h-[140px] pr-0.5">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300/80 rounded-xl p-6 text-center text-xs text-fb-text-muted select-none">
            No tasks in this column
          </div>
        )}
      </div>

      {/* Column bottom button: "+ Add task" matching Figma Screenshot 1 & 4 */}
      <div className="pt-2 mt-auto">
        <button
          type="button"
          onClick={() => onCreateTask(status.id)}
          className="w-full py-2 px-3 rounded-xl border border-transparent hover:border-fb-border bg-transparent hover:bg-white/80 text-xs font-semibold text-fb-text-secondary hover:text-fb-text-primary flex items-center justify-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
        >
          <Plus className="w-3.5 h-3.5 text-fb-text-secondary" aria-hidden="true" />
          <span>Add task</span>
        </button>
      </div>
    </div>
  );
};
