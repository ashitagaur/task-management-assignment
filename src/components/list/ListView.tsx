import React, { useState, useRef, useEffect, useContext } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Task } from '../../domain/types';
import { useAppStore } from '../../store/store';
import { getSortedTasks } from '../../store/selectors';
import { ListRow } from './ListRow';
import { ListTipBanner } from './ListTipBanner';
import { EmptyState } from '../shared/EmptyState';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { BulkActionDock } from './BulkActionDock';
import { ToastContext } from '../shared/Toast';

export interface ListViewProps {
  listId: string;
  onTaskClick: (task: Task) => void;
  onCreateTask: () => void;
  className?: string;
}

export const ListView: React.FC<ListViewProps> = ({
  listId,
  onTaskClick,
  onCreateTask,
  className = '',
}) => {
  const [sortKey, setSortKey] = useState<'priority' | 'dueDate' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const tasks = useAppStore((state) =>
    getSortedTasks(state, listId, sortKey, sortDir)
  );
  const statusesById = useAppStore((state) => state.statusesById);
  const bulkUpdateTasks = useAppStore((state) => state.bulkUpdateTasks);
  const toastContext = useContext(ToastContext);

  const {
    isSelected,
    toggle,
    selectAllVisible,
    clear,
    selectionCount,
  } = useBulkSelection(listId);

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const visibleTaskIds = tasks.map((t) => t.id);
  const allSelected =
    visibleTaskIds.length > 0 && visibleTaskIds.every((id) => isSelected(id));
  const someSelected = visibleTaskIds.some((id) => isSelected(id));
  const isIndeterminate = someSelected && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleSort = (key: 'priority' | 'dueDate') => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(key === 'priority' ? 'desc' : 'asc');
    } else if (sortDir === (key === 'priority' ? 'desc' : 'asc')) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      // Third click resets sort
      setSortKey(null);
      setSortDir('asc');
    }
  };

  const handleBulkChangeStatus = (statusId: string) => {
    // Preserve current rendered order of selected tasks
    const orderedSelectedTaskIds = tasks
      .filter((t) => isSelected(t.id))
      .map((t) => t.id);

    const result = bulkUpdateTasks({
      taskIds: orderedSelectedTaskIds,
      listId,
      statusId,
    });

    if (result.success) {
      clear();
      toastContext?.showToast({
        type: 'success',
        title: 'Tasks updated',
        body: `Updated ${result.data.length} tasks`,
      });
    } else {
      toastContext?.showToast({
        type: 'error',
        title: 'Cannot update tasks',
        body: result.error.message,
      });
    }
  };

  const handleBulkAddAssignee = (userId: string) => {
    const orderedSelectedTaskIds = tasks
      .filter((t) => isSelected(t.id))
      .map((t) => t.id);

    const result = bulkUpdateTasks({
      taskIds: orderedSelectedTaskIds,
      listId,
      addAssigneeIds: [userId],
    });

    if (result.success) {
      clear();
      toastContext?.showToast({
        type: 'success',
        title: 'Assignee added',
        body: `Updated assignees on ${result.data.length} tasks`,
      });
    } else {
      toastContext?.showToast({
        type: 'error',
        title: 'Cannot update tasks',
        body: result.error.message,
      });
    }
  };

  const renderSortIcon = (key: 'priority' | 'dueDate') => {
    if (sortKey !== key) {
      return (
        <ArrowUpDown
          className="w-3.5 h-3.5 text-fb-text-subtle group-hover:text-fb-text-secondary transition-colors"
          aria-hidden="true"
        />
      );
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-fb-primary" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-fb-primary" aria-hidden="true" />
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="space-y-6 w-full max-w-full min-w-0">
        <EmptyState
          title="No tasks here yet"
          description="Drop a task here or create one."
          actionLabel="Add task"
          onAction={onCreateTask}
          className="my-8"
        />
        <ListTipBanner />
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 w-full max-w-full min-w-0 ${
        selectionCount > 0 ? 'pb-24' : ''
      } ${className}`}
    >
      {/* Table Card Container */}
      <div className="w-full max-w-full min-w-0 bg-white rounded-2xl border border-fb-border shadow-fb-card overflow-hidden">
        <div className="w-full max-w-full min-w-0 overflow-x-auto [contain:paint]">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-fb-border bg-gray-50/75 text-[11px] font-bold text-fb-text-muted uppercase tracking-wider select-none">
                {/* Checkbox Header */}
                <th scope="col" className="py-3 pl-4 pr-1 w-10 shrink-0">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => selectAllVisible(visibleTaskIds)}
                    aria-label="Select all visible tasks"
                    className="w-4 h-4 rounded border-fb-border text-fb-primary focus:ring-fb-primary cursor-pointer accent-fb-primary"
                  />
                </th>
                <th scope="col" className="py-3 px-4">
                  Task
                </th>
                <th scope="col" className="py-3 px-4">
                  Status
                </th>
                <th scope="col" className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleToggleSort('priority')}
                    className="group inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-fb-text-muted hover:text-fb-text-primary focus-visible:outline-none focus-visible:underline"
                    title="Sort by priority"
                  >
                    <span>Priority</span>
                    {renderSortIcon('priority')}
                  </button>
                </th>
                <th scope="col" className="py-3 px-4">
                  Assignees
                </th>
                <th scope="col" className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleToggleSort('dueDate')}
                    className="group inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-fb-text-muted hover:text-fb-text-primary focus-visible:outline-none focus-visible:underline"
                    title="Sort by due date"
                  >
                    <span>Due</span>
                    {renderSortIcon('dueDate')}
                  </button>
                </th>
                <th scope="col" className="py-3 px-3 w-8">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fb-border bg-white text-xs">
              {tasks.map((task) => (
                <ListRow
                  key={task.id}
                  task={task}
                  status={statusesById[task.statusId]}
                  isSelected={isSelected(task.id)}
                  onToggleSelect={() => toggle(task.id)}
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Informational Footer Tip (Figma Node 1:772) */}
      <ListTipBanner />

      {/* Floating Bulk Action Dock (Stretch B) */}
      <BulkActionDock
        listId={listId}
        selectionCount={selectionCount}
        onClear={clear}
        onApplyStatus={handleBulkChangeStatus}
        onApplyAssignee={handleBulkAddAssignee}
      />
    </div>
  );
};
