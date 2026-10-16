import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, X, ChevronDown, UserPlus } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { STATUS_COLOR_STYLES } from '../../domain/constants';

export interface BulkActionDockProps {
  listId: string;
  selectionCount: number;
  onClear: () => void;
  onApplyStatus: (statusId: string) => void;
  onApplyAssignee: (userId: string) => void;
}

export const BulkActionDock: React.FC<BulkActionDockProps> = ({
  listId,
  selectionCount,
  onClear,
  onApplyStatus,
  onApplyAssignee,
}) => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);

  const statusesById = useAppStore((state) => state.statusesById);
  const usersById = useAppStore((state) => state.usersById);

  const dockRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
        setAssigneeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectionCount === 0) return null;

  // Filter statuses belonging to the active list, sorted by position
  const listStatuses = Object.values(statusesById)
    .filter((s) => s.listId === listId)
    .sort((a, b) => a.position - b.position);

  const allUsers = Object.values(usersById);

  const handleSelectStatus = (statusId: string) => {
    setStatusMenuOpen(false);
    onApplyStatus(statusId);
  };

  const handleSelectAssignee = (userId: string) => {
    setAssigneeMenuOpen(false);
    onApplyAssignee(userId);
  };

  return (
    <div
      ref={dockRef}
      role="region"
      aria-label="Bulk actions dock"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl bg-fb-sidebar text-white rounded-2xl shadow-2xl border border-gray-700/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-fade-in"
    >
      {/* Left: Selection Count badge and Clear */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 bg-fb-sidebar-active border border-gray-700 px-2.5 py-1 rounded-lg">
          <CheckSquare className="w-4 h-4 text-fb-primary" aria-hidden="true" />
          <span className="text-xs font-semibold text-white">
            {selectionCount} {selectionCount === 1 ? 'task' : 'tasks'} selected
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          title="Deselect all tasks"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Right: Actions Dropdowns */}
      <div className="flex items-center gap-2 relative">
        {/* Change Status Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setStatusMenuOpen((prev) => !prev);
              setAssigneeMenuOpen(false);
            }}
            aria-expanded={statusMenuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
          >
            <span>Change Status</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
          </button>

          {statusMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 bottom-full mb-2 w-48 bg-white text-fb-text-primary rounded-xl shadow-fb-modal border border-fb-border py-1 z-50 animate-fade-in"
            >
              <div className="px-3 py-1.5 text-[11px] font-bold text-fb-text-muted uppercase tracking-wider border-b border-fb-border">
                Move to Status
              </div>
              {listStatuses.map((st) => {
                const styles = STATUS_COLOR_STYLES[st.color] || STATUS_COLOR_STYLES.gray;
                return (
                  <button
                    key={st.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelectStatus(st.id)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:bg-gray-100"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${styles.dot}`} aria-hidden="true" />
                    <span className="font-medium text-fb-text-primary truncate">{st.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Assignees Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setAssigneeMenuOpen((prev) => !prev);
              setStatusMenuOpen(false);
            }}
            aria-expanded={assigneeMenuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fb-primary hover:bg-fb-primary/90 text-xs font-semibold text-white transition-colors shadow-fb-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Assignee</span>
            <ChevronDown className="w-3.5 h-3.5 text-purple-200" aria-hidden="true" />
          </button>

          {assigneeMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 bottom-full mb-2 w-52 bg-white text-fb-text-primary rounded-xl shadow-fb-modal border border-fb-border py-1 z-50 animate-fade-in"
            >
              <div className="px-3 py-1.5 text-[11px] font-bold text-fb-text-muted uppercase tracking-wider border-b border-fb-border">
                Assign User
              </div>
              {allUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectAssignee(user.id)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:bg-gray-100"
                >
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fb-text-primary truncate">{user.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
