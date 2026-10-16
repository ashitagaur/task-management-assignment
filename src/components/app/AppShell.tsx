import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/store';
import { getVisibleLists } from '../../store/selectors';
import { ActiveListRoute } from '../../hooks/useActiveList';
import { Topbar } from './Topbar';
import { WorkspaceHeader } from './WorkspaceHeader';
import { Sidebar } from '../sidebar/Sidebar';
import { RestrictedCard } from '../shared/RestrictedCard';

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

  const activeUserId = useAppStore((state) => state.activeUserId);
  const fullState = useAppStore((state) => state);
  const visibleLists = getVisibleLists(fullState);

  const { activeListId, activeList, isForbidden, navigateToList } = route;

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

  const fallbackList = visibleLists[0] || null;
  // When a route is forbidden, the workspace chrome (sidebar highlight, topbar breadcrumbs, header & banner)
  // renders the accessible active context (e.g. Backlog) while presenting the 403 Restricted Card for the target resource,
  // matching Figma Frame 1:882 (04 · Permissions / Bob).
  const contextList = isForbidden && fallbackList ? fallbackList : activeList;
  const contextListId = contextList?.id || activeListId;

  return (
    <div className="h-screen w-screen flex bg-fb-canvas overflow-hidden font-sans">
      {/* Desktop Sidebar (fixed 248px or compact 68px rail, hidden on mobile/tablet) */}
      <aside
        aria-label="Desktop navigation sidebar"
        className={`hidden lg:flex lg:flex-col ${desktopSidebarCollapsed ? 'w-[68px] min-w-[68px]' : 'w-[248px] min-w-[248px]'
          } bg-fb-sidebar shrink-0 border-r border-gray-800 z-30 transition-[width] duration-200 ease-in-out`}
      >
        <Sidebar
          activeListId={contextListId}
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
              activeListId={contextListId}
              onSelectList={handleSelectRoute}
              onCloseMobile={() => setMobileSidebarOpen(false)}
              isMobile
            />
          </aside>
        </div>
      )}

      {/* Right Region: Topbar + Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <Topbar
          activeListId={contextListId}
          onNavigate={navigateToList}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Main Content Viewport with clean reset key={activeUserId} */}
        <main
          key={activeUserId}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8"
        >
          <div className="mx-auto">
            {/* Workspace Header & Permission Feedback Banner (always rendered when user has accessible lists) */}
            {contextList && (
              <WorkspaceHeader
                activeList={contextList}
                activeListId={contextListId}
                onNewTask={onNewTask}
              />
            )}

            {/* Viewport Content */}
            {isForbidden ? (
              <RestrictedCard
                targetContainer={activeList}
                containerName={activeList?.name}
                fallbackList={fallbackList}
                onNavigate={navigateToList}
              />
            ) : visibleLists.length === 0 ? (
              <div
                role="status"
                aria-label="No visible lists"
                className="p-8 text-center rounded-2xl bg-white border border-fb-border text-fb-text-muted text-xs max-w-md mx-auto my-12"
              >
                No lists are visible to your account.
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
