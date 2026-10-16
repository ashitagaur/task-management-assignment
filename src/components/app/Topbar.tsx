import React from 'react';
import { Menu, Search } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { UserSwitcher } from './UserSwitcher';
import { RouteState } from '../../hooks/useActiveList';

export interface TopbarProps {
  activeListId: string | null;
  routeState?: RouteState;
  onNavigate: (listId: string) => void;
  onToggleMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeListId,
  routeState = 'access',
  onNavigate,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="h-16 min-h-[64px] bg-white border-b border-fb-border px-4 lg:px-6 flex items-center justify-between gap-3 z-20 shrink-0 w-full max-w-full min-w-0">
      {/* Left: Mobile menu toggle + Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-fb-text-secondary hover:text-fb-text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary shrink-0"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 overflow-hidden flex-1">
          <Breadcrumbs
            activeListId={activeListId}
            routeState={routeState}
            onNavigate={onNavigate}
          />
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
            className="w-full h-[38px] pl-9 pr-3 text-xs rounded-lg border border-fb-border bg-white text-fb-text-primary placeholder:text-fb-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary cursor-default"
          />
        </div>

        {/* Simulation mode indicator matching Figma Frame 1:3 & 1:38 */}
        <div
          className="hidden sm:flex items-center gap-1.5 h-[38px] px-3 rounded-lg border border-amber-200/80 bg-amber-50/60 text-xs text-amber-900 select-none cursor-default font-medium"
          title="Simulation mode (configured in T13)"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
          <span>Simulation: Normal</span>
        </div>

        {/* User Switcher */}
        <UserSwitcher />
      </div>
    </header>
  );
};
