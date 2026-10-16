import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Task } from '../../domain/types';
import { useAppStore } from '../../store/store';
import { getSortedTasks } from '../../store/selectors';
import { ListRow } from './ListRow';
import { ListTipBanner } from './ListTipBanner';
import { EmptyState } from '../shared/EmptyState';

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
    <div className={`space-y-6 w-full max-w-full min-w-0 ${className}`}>
      {/* Table Card Container */}
      <div className="w-full max-w-full min-w-0 bg-white rounded-2xl border border-fb-border shadow-fb-card overflow-hidden">
        <div className="w-full max-w-full min-w-0 overflow-x-auto [contain:paint]">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-fb-border bg-gray-50/75 text-[11px] font-bold text-fb-text-muted uppercase tracking-wider select-none">
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
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Informational Footer Tip (Figma Node 1:772) */}
      <ListTipBanner />
    </div>
  );
};
