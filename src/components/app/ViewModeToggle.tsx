import React from 'react';
import { Columns3, List } from 'lucide-react';
import { useAppStore } from '../../store/store';

export const ViewModeToggle: React.FC = () => {
  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);

  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex items-center p-1 bg-gray-100/90 rounded-lg border border-fb-border-soft select-none"
    >
      <button
        type="button"
        id="view-mode-board"
        aria-pressed={viewMode === 'board'}
        aria-label="Switch to Board view"
        onClick={() => setViewMode('board')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${
          viewMode === 'board'
            ? 'bg-white text-fb-text-primary shadow-sm font-semibold'
            : 'text-fb-text-secondary hover:text-fb-text-primary'
        }`}
      >
        <Columns3 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Board</span>
      </button>

      <button
        type="button"
        id="view-mode-list"
        aria-pressed={viewMode === 'list'}
        aria-label="Switch to List view"
        onClick={() => setViewMode('list')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${
          viewMode === 'list'
            ? 'bg-white text-fb-text-primary shadow-sm font-semibold'
            : 'text-fb-text-secondary hover:text-fb-text-primary'
        }`}
      >
        <List className="w-3.5 h-3.5" aria-hidden="true" />
        <span>List</span>
      </button>
    </div>
  );
};
