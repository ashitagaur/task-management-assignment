import React from 'react';
import { Menu, Search } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { UserSwitcher } from './UserSwitcher';

export interface TopbarProps {
  activeListId: string | null;
  onNavigate: (listId: string) => void;
  onToggleMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeListId,
  onNavigate,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="h-[58px] min-h-[58px] bg-white border-b border-fb-border px-4 lg:px-6 flex items-center justify-between gap-4 z-20 shrink-0">
      {/* Left: Mobile menu toggle + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-fb-text-secondary hover:text-fb-text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 overflow-hidden">
          <Breadcrumbs activeListId={activeListId} onNavigate={onNavigate} />
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Visual search input matching Figma Node 1:45 */}
        <div className="relative hidden md:block w-48 sm:w-60">
          <Search
            className="w-4 h-4 text-fb-text-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            readOnly
            placeholder="Search tasks..."
            aria-label="Search tasks (visual-only preview)"
            title="Search is visual-only in this version"
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-fb-border bg-white text-fb-text-primary placeholder:text-fb-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary cursor-default"
          />
        </div>

        {/* User Switcher */}
        <UserSwitcher />
      </div>
    </header>
  );
};
