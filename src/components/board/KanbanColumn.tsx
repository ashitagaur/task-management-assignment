import React from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '../../domain/types';
import { STATUS_COLOR_STYLES } from '../../domain/constants';
import { SortableTaskCard } from './SortableTaskCard';

export interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  taskMutationInFlight?: boolean;
  onTaskClick: (task: Task) => void;
  onCreateTask: (statusId: string) => void;
  className?: string;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  taskMutationInFlight = false,
  onTaskClick,
  onCreateTask,
  className = '',
}) => {
  const statusStyles = STATUS_COLOR_STYLES[status.color] || STATUS_COLOR_STYLES.gray;

  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: {
      type: 'column',
      statusId: status.id,
    },
  });

  return (
    <div
      className={`flex flex-col min-w-[280px] sm:min-w-[310px] w-[320px] max-w-[340px] shrink-0 bg-[#F0F2F6] rounded-2xl p-3 max-h-full transition-shadow ${
        isOver ? 'ring-2 ring-fb-primary/40 bg-[#E8EDF5]' : ''
      } ${className}`}
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

      {/* Task Card List with SortableContext & Droppable */}
      <SortableContext
        id={status.id}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex-1 flex flex-col gap-2.5 overflow-y-auto min-h-[140px] pr-0.5 rounded-xl transition-all ${
            isOver ? 'bg-fb-primary-soft/30 p-1' : ''
          }`}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              disabled={taskMutationInFlight}
              onClick={() => onTaskClick(task)}
            />
          ))}

          {tasks.length === 0 && (
            <div
              className={`flex-1 flex items-center justify-center border-2 border-dashed ${
                isOver
                  ? 'border-fb-primary bg-white/80 text-fb-primary font-medium'
                  : 'border-gray-300/80 text-fb-text-muted'
              } rounded-xl p-6 text-center text-xs select-none transition-colors`}
            >
              {isOver ? 'Drop task here' : 'No tasks in this column'}
            </div>
          )}
        </div>
      </SortableContext>

      {/* Column bottom button: "+ Add task" */}
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
