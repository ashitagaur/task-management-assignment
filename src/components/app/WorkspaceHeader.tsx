import React, { useMemo } from 'react';
import { SlidersHorizontal, ArrowUpDown, Plus, Eye } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { getBreadcrumbs, getTaskCount } from '../../store/selectors';
import { getEffectiveCapabilities } from '../../domain/permissions';
import { ContainerNode } from '../../domain/types';
import { ViewModeToggle } from './ViewModeToggle';

export interface WorkspaceHeaderProps {
  activeList: ContainerNode | null;
  activeListId: string | null;
  onNewTask?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  activeList,
  activeListId,
  onNewTask,
}) => {
  const fullState = useAppStore((state) => state);
  const activeUserId = useAppStore((state) => state.activeUserId);
  const usersById = useAppStore((state) => state.usersById);

  const currentUser = usersById[activeUserId];

  // Derive task count for the current active list
  const taskCount = useMemo(() => {
    if (!activeListId) return 0;
    return getTaskCount(fullState, activeListId);
  }, [fullState, activeListId]);

  // Derive ancestor breadcrumb subtitle (e.g. "Q2 Launch · Engineering")
  const ancestorSubtitle = useMemo(() => {
    if (!activeListId) return '';
    const crumbs = getBreadcrumbs(fullState, activeListId).filter(
      (c) => c.type !== 'workspace'
    );
    if (crumbs.length <= 1) return '';
    return crumbs
      .slice(0, crumbs.length - 1)
      .reverse()
      .map((c) => c.name)
      .join(' · ');
  }, [fullState, activeListId]);

  // Determine whether to display the perspective banner via capability check
  // Shows for users who do not have administrative permission bypass
  const showPerspectiveBanner = useMemo(() => {
    if (!currentUser) return false;
    const capabilities = getEffectiveCapabilities(currentUser.role);
    return !capabilities.has('permission.bypass');
  }, [currentUser]);

  const listName = activeList?.name ?? (activeListId ? 'Restricted List' : 'Select a List');

  return (
    <div className="mb-6 space-y-4 w-full max-w-full min-w-0">
      {/* Row 1: Title, Task Count, Subtitle (matches Figma Frame 1:3 & 1:62) */}
      <div className="w-full max-w-full min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold text-fb-text-primary tracking-tight truncate">
            {listName}
          </h1>
          {activeList && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-fb-text-secondary border border-fb-border shrink-0">
              {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
            </span>
          )}
        </div>
        {ancestorSubtitle && (
          <p className="text-xs text-fb-text-muted mt-1 font-medium truncate">
            {ancestorSubtitle}
          </p>
        )}
      </div>

      {/* Row 2: ViewModeToggle on Left, Action buttons on Right (EXACT match to Figma Frame 1:3 & 1:62) */}
      <div className="flex items-center justify-between gap-3 flex-wrap w-full max-w-full min-w-0">
        <ViewModeToggle />

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Filter tasks (visual placeholder)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-fb-border bg-white text-fb-text-secondary hover:text-fb-text-primary text-xs font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Filter</span>
          </button>

          <button
            type="button"
            aria-label="Sort tasks (visual placeholder)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-fb-border bg-white text-fb-text-secondary hover:text-fb-text-primary text-xs font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
          >
            <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sort</span>
          </button>

          <button
            type="button"
            onClick={onNewTask}
            aria-label="Create new task"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-fb-primary hover:bg-fb-primary/90 text-white text-xs font-semibold shadow-fb-button transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary focus-visible:ring-offset-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>New task</span>
          </button>
        </div>
      </div>

      {/* Permission perspective banner (Requirement P-15, Figma Node 1:871) */}
      {showPerspectiveBanner && currentUser && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 p-3 rounded-xl bg-fb-success-banner border border-fb-success/20 flex items-center gap-3 text-xs w-full max-w-full min-w-0"
        >
          <div className="w-6 h-6 rounded-full bg-fb-success-soft text-fb-success flex items-center justify-center shrink-0">
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-fb-text-primary truncate block">
              Viewing as {currentUser.name.split(' ')[0]} ·{' '}
              <span className="capitalize">{currentUser.role}</span>
            </span>
            <p className="text-[11px] text-fb-text-secondary mt-0.5 truncate sm:whitespace-normal">
              This workspace is tailored for {currentUser.name.split(' ')[0]}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
