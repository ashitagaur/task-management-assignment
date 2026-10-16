import React from 'react';
import { Menu, Search, Info } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { UserSwitcher } from './UserSwitcher';
import { RouteState } from '../../hooks/useActiveList';
import { useAppStore } from '../../store/store';

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
  const simulateFailureNext = useAppStore((state) => state.simulateFailureNext);
  const toggleSimulateFailure = useAppStore((state) => state.toggleSimulateFailure);
  const taskMutationInFlight = useAppStore((state) => state.taskMutationInFlight);

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
        {routeState === 'access' && (
          <>
            {/* Search input with Premium affordance */}
            <div className="relative group hidden md:block w-48 sm:w-60">
              <Search
                className="w-4 h-4 text-fb-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                readOnly
                tabIndex={0}
                aria-disabled="true"
                placeholder="Search tasks..."
                aria-label="Search tasks (Upgrade to Premium)"
                onKeyDown={(e) => e.preventDefault()}
                className="w-full h-[38px] pl-9 pr-8 text-xs rounded-lg border border-fb-border bg-gray-50/80 text-fb-text-muted placeholder:text-fb-text-muted/70 cursor-not-allowed select-none opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
              />
              <div
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-fb-text-muted"
                aria-hidden="true"
              >
                <Info className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Tooltip: Upgrade to Premium */}
              <div
                role="tooltip"
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 pointer-events-none px-2 py-1 text-[11px] font-medium text-white bg-gray-900 rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50"
              >
                Upgrade to Premium
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-gray-900" />
              </div>
            </div>

            {/* Interactive simulation toggle matching Figma Frame 1:3 & 1:38 */}
            <button
              type="button"
              onClick={toggleSimulateFailure}
              disabled={taskMutationInFlight}
              aria-pressed={simulateFailureNext}
              aria-label="Toggle mutation failure simulation"
              title={
                simulateFailureNext
                  ? 'Simulation armed: next task mutation will fail and rollback (click to disarm)'
                  : 'Simulation normal: mutations commit normally (click to arm failure)'
              }
              className={`hidden sm:flex items-center gap-1.5 h-[38px] px-3 rounded-lg border text-xs font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${
                simulateFailureNext
                  ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-amber-200/80 bg-amber-50/60 text-amber-900 hover:bg-amber-100/80'
              } ${taskMutationInFlight ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  simulateFailureNext ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                }`}
                aria-hidden="true"
              />
              <span>{simulateFailureNext ? 'Simulation: Armed' : 'Simulation: Normal'}</span>
            </button>
          </>
        )}

        {/* User Switcher */}
        <UserSwitcher />
      </div>
    </header>
  );
};
