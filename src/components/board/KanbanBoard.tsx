import React, { useState, useMemo, useContext } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  KeyboardCode,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Task } from '../../domain/types';
import { useAppStore } from '../../store/store';
import { getKanbanColumns } from '../../store/selectors';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { EmptyState } from '../shared/EmptyState';
import { ToastContext } from '../shared/Toast';

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
  const tasksById = useAppStore((state) => state.tasksById);
  const statusesById = useAppStore((state) => state.statusesById);
  const taskMutationInFlight = useAppStore((state) => state.taskMutationInFlight);
  const moveTaskStatus = useAppStore((state) => state.moveTaskStatus);
  const reorderTask = useAppStore((state) => state.reorderTask);
  const toastContext = useContext(ToastContext);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasksById[activeTaskId] || null;
  }, [activeTaskId, tasksById]);

  // Sensors: Pointer (4px distance constraint), Touch (250ms hold), Keyboard (Space to drag/drop, Enter for drawer)
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 4, // 4px distance allows normal clicks to open the task drawer without drag
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // 250ms touch delay for mobile drag initiation
      tolerance: 5,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
    keyboardCodes: {
      start: [KeyboardCode.Space],
      cancel: [KeyboardCode.Esc],
      end: [KeyboardCode.Space],
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const handleDragStart = (event: DragStartEvent) => {
    if (taskMutationInFlight) return;
    setActiveTaskId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);

    // Cancel / dropped outside valid target -> strict no-op
    if (!over || taskMutationInFlight) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeTaskItem = tasksById[activeId];
    if (!activeTaskItem) return;

    const sourceStatusId = activeTaskItem.statusId;

    let targetStatusId: string;
    let targetPosition: number;

    const overStatus = statusesById[overId];
    if (overStatus && overStatus.listId === listId) {
      // Dropped directly on a column droppable
      targetStatusId = overStatus.id;
      const targetColumn = columns.find((c) => c.status.id === targetStatusId);
      const targetTasks = targetColumn?.tasks || [];

      if (sourceStatusId === targetStatusId) {
        // Dropped on its own column container -> move to bottom
        targetPosition = Math.max(0, targetTasks.length - 1);
        const activeIndex = targetTasks.findIndex((t) => t.id === activeId);
        // Dropping in same place is a strict no-op
        if (activeIndex === targetPosition) return;
      } else {
        // Dropped on another column container -> append to bottom
        targetPosition = targetTasks.length;
      }
    } else {
      // Dropped over a card in some column
      const overTaskItem = tasksById[overId];
      if (!overTaskItem || overTaskItem.primaryListId !== listId) return;

      targetStatusId = overTaskItem.statusId;
      const targetColumn = columns.find((c) => c.status.id === targetStatusId);
      const targetTasks = targetColumn?.tasks || [];
      const overIndex = targetTasks.findIndex((t) => t.id === overId);

      if (sourceStatusId === targetStatusId) {
        const activeIndex = targetTasks.findIndex((t) => t.id === activeId);
        // Dropping in same place is a strict no-op
        if (activeIndex === overIndex || overIndex < 0) return;
        targetPosition = overIndex;
      } else {
        // Cross-column drop onto a card:
        // If dropped on the last card in the column and below its midpoint, append to bottom
        const isBelowLastCard =
          overIndex === targetTasks.length - 1 &&
          Boolean(
            event.active.rect.current.translated &&
            over &&
            over.rect &&
            event.active.rect.current.translated.top >
              over.rect.top + over.rect.height / 2
          );

        if (isBelowLastCard) {
          targetPosition = targetTasks.length;
        } else {
          targetPosition = overIndex >= 0 ? overIndex : targetTasks.length;
        }
      }
    }

    // Single store mutation on drop (zero store writes on drag-over)
    if (sourceStatusId === targetStatusId) {
      const result = reorderTask(activeId, targetPosition);
      if (!result.success && toastContext) {
        toastContext.showToast({
          type: 'error',
          title: 'Cannot reorder task',
          body: result.error.message,
        });
      }
    } else {
      const result = moveTaskStatus(activeId, targetStatusId, targetPosition);
      if (!result.success && toastContext) {
        toastContext.showToast({
          type: 'error',
          title: 'Cannot move task',
          body: result.error.message,
        });
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
  };

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
              taskMutationInFlight={taskMutationInFlight}
              onTaskClick={onTaskClick}
              onCreateTask={(statusId) => onCreateTask(statusId)}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div
            style={{
              // DND-EXCEPTION: inline styles required for @dnd-kit DragOverlay positioning and elevation
              cursor: 'grabbing',
              transform: 'rotate(2deg)',
            }}
            className="w-[320px] max-w-[340px] pointer-events-none shadow-2xl rounded-xl ring-2 ring-fb-primary/50"
          >
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
