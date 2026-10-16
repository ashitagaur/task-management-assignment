import React from 'react';
import { Task } from '../../domain/types';
import { useAppStore } from '../../store/store';
import { getKanbanColumns } from '../../store/selectors';
import { KanbanColumn } from './KanbanColumn';
import { EmptyState } from '../shared/EmptyState';

export interface KanbanBoardProps {
  listId: string;
  onTaskClick: (task: Task) => void;
  onCreateTask: (statusId?: string) => void;
  className?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  listId,
  onTaskClick,
  onCreateTask,
  className = '',
}) => {
  const columns = useAppStore((state) => getKanbanColumns(state, listId));

  const totalTasks = columns.reduce((acc, col) => acc + col.tasks.length, 0);

  if (columns.length === 0) {
    return (
      <EmptyState
        title="No statuses configured"
        description="This list doesn't have any Kanban columns configured yet."
        className="my-12"
      />
    );
  }

  if (totalTasks === 0) {
    return (
      <EmptyState
        title="No tasks here yet"
        description="Drop a task here or create one."
        actionLabel="Add task"
        onAction={() => onCreateTask()}
        className="my-12"
      />
    );
  }

  return (
    <div
      className={`w-full overflow-x-auto pb-4 pt-1 ${className}`}
      id="kanban-board-scroll-container"
    >
      <div className="inline-flex gap-4 min-w-full items-start px-0.5">
        {columns.map(({ status, tasks }) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={tasks}
            onTaskClick={onTaskClick}
            onCreateTask={(statusId) => onCreateTask(statusId)}
          />
        ))}
      </div>
    </div>
  );
};
