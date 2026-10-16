import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { ActiveListRoute } from '../../hooks/useActiveList';
import { Topbar } from './Topbar';
import { WorkspaceHeader } from './WorkspaceHeader';
import { Sidebar } from '../sidebar/Sidebar';
import { RestrictedCard } from '../shared/RestrictedCard';
import { NotFoundCard } from '../shared/NotFoundCard';

export interface AppShellProps {
  route: ActiveListRoute;
  onNewTask?: () => void;
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  route,
  onNewTask,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  const {
    state: routeState,
    activeListId,
    activeList,
    targetContainer,
    fallbackList,
    navigateToList,
  } = route;

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileSidebarOpen]);

  const handleSelectRoute = (listId: string) => {
    navigateToList(listId);
    setMobileSidebarOpen(false);
  };

  // In non-access states (forbidden, not-found, no-visible-lists), no sidebar item should be marked active
  const sidebarActiveListId = routeState === 'access' ? activeListId : null;

  return (
    <div className="h-screen w-full max-w-full flex bg-fb-canvas overflow-hidden font-sans">
      {/* Desktop Sidebar (fixed 248px or compact 68px rail, hidden on mobile/tablet) */}
      <aside
        aria-label="Desktop navigation sidebar"
        className={`hidden lg:flex lg:flex-col ${
          desktopSidebarCollapsed ? 'w-[68px] min-w-[68px]' : 'w-[248px] min-w-[248px]'
        } bg-fb-sidebar shrink-0 border-r border-gray-800 z-30 transition-[width] duration-200 ease-in-out`}
      >
        <Sidebar
          activeListId={sidebarActiveListId}
          onSelectList={handleSelectRoute}
          isCollapsed={desktopSidebarCollapsed}
          onToggleCollapse={() => setDesktopSidebarCollapsed((prev) => !prev)}
        />
      </aside>

      {/* Mobile/Tablet Off-Canvas Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation sidebar"
            className="relative w-[260px] max-w-[85vw] bg-fb-sidebar h-full shadow-2xl flex flex-col z-10"
          >
            <Sidebar
              activeListId={sidebarActiveListId}
              onSelectList={handleSelectRoute}
              onCloseMobile={() => setMobileSidebarOpen(false)}
              isMobile
            />
          </aside>
        </div>
      )}

      {/* Right Region: Topbar + Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full h-full overflow-hidden">
        {/* Topbar with routing state awareness for breadcrumbs */}
        <Topbar
          activeListId={sidebarActiveListId}
          routeState={routeState}
          onNavigate={navigateToList}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          <div className="w-full max-w-full min-w-0 mx-auto">
            {/* Workspace Header is ONLY rendered for valid, accessible lists (never on forbidden 403, 404, or empty states) */}
            {routeState === 'access' && activeList && (
              <WorkspaceHeader
                activeList={activeList}
                activeListId={activeListId}
                onNewTask={onNewTask}
              />
            )}

            {/* Viewport Content: Explicit product states */}
            {routeState === 'forbidden' ? (
              <RestrictedCard
                targetContainer={targetContainer}
                containerName={targetContainer?.name}
                fallbackList={fallbackList}
                onNavigate={navigateToList}
              />
            ) : routeState === 'not-found' ? (
              <NotFoundCard
                fallbackList={fallbackList}
                onNavigate={navigateToList}
              />
            ) : routeState === 'no-visible-lists' ? (
              <div
                role="status"
                aria-label="No accessible lists"
                className="p-12 text-center rounded-2xl bg-white border border-fb-border text-fb-text-muted text-sm max-w-md mx-auto my-16 shadow-fb-card"
              >
                <div className="w-12 h-12 rounded-full bg-gray-50 border border-fb-border flex items-center justify-center text-fb-text-muted mx-auto mb-4 shadow-xs">
                  <Lock className="w-6 h-6 text-fb-text-secondary" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-fb-text-primary mb-1">
                  No accessible lists
                </h3>
                <p className="text-xs text-fb-text-secondary leading-relaxed">
                  Your account doesn&apos;t currently have access to any lists in this workspace.
                </p>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
