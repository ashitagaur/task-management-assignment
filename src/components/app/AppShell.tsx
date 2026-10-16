import React, { useState, useEffect } from 'react';
import { X, Layers, Layout, FolderKanban } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { getVisibleLists } from '../../store/selectors';
import { ActiveListRoute } from '../../hooks/useActiveList';
import { Topbar } from './Topbar';
import { WorkspaceHeader } from './WorkspaceHeader';

export interface AppShellProps {
  route: ActiveListRoute;
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ route, children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  // Reusable Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full text-gray-300 select-none">
      {/* Brand Header */}
      <div className="h-[58px] min-h-[58px] px-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-fb-primary flex items-center justify-center text-white shadow-md">
            <Layout className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">Flowboard</span>
        </div>

        {mobileSidebarOpen && (
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation sidebar"
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation placeholder for T06 (ready for T07 full hierarchical tree) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <div>
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            WORKSPACE
          </div>
          <div className="px-2 py-1 text-xs font-semibold text-gray-200 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-fb-primary" />
            <span>Flowboard Workspace</span>
          </div>
        </div>

        <div>
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
            <span>VISIBLE LISTS</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400">
              T06 Route Sync
            </span>
          </div>

          <div className="space-y-1">
            {visibleLists.map((list) => {
              const isActive = list.id === activeListId;

              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => handleSelectRoute(list.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${
                    isActive
                      ? 'bg-fb-sidebar-active text-white font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderKanban className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span className="truncate">{list.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 text-[11px] text-gray-400 leading-relaxed">
          <span className="text-gray-300 font-medium block mb-0.5">T07 Sidebar Target:</span>
          Full collapsible Workspace → Space → Folder → List hierarchy tree mounts here in T07.
        </div>
      </div>
    </div>
  );

  const fallbackList = visibleLists[0];

  return (
    <div className="h-screen w-screen flex bg-fb-canvas overflow-hidden font-sans">
      {/* Desktop Sidebar (fixed 248px, hidden on mobile/tablet) */}
      <aside
        aria-label="Desktop navigation sidebar"
        className="hidden lg:flex lg:flex-col w-[248px] min-w-[248px] bg-fb-sidebar shrink-0 border-r border-gray-800 z-30"
      >
        {sidebarContent}
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
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Right Region: Topbar + Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <Topbar
          activeListId={activeListId}
          onNavigate={navigateToList}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Main Content Viewport with clean reset key={activeUserId} */}
        <main
          key={activeUserId}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8"
        >
          <div className="max-w-7xl mx-auto">
            {/* Workspace Header */}
            <WorkspaceHeader
              activeList={activeList}
              activeListId={activeListId}
            />

            {/* Viewport Content */}
            {isForbidden ? (
              <div
                role="alert"
                className="p-6 rounded-2xl bg-white border border-fb-border shadow-fb-card text-center max-w-lg mx-auto my-12"
              >
                <div className="w-12 h-12 rounded-full bg-fb-danger-soft text-fb-danger flex items-center justify-center mx-auto mb-3">
                  <X className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-fb-text-primary mb-1">
                  Access Restricted
                </h2>
                <p className="text-xs text-fb-text-secondary mb-4 leading-relaxed">
                  You do not have permission to view this list. The complete 403 Restricted Card UI will be mounted in T07.
                </p>
                {fallbackList && (
                  <button
                    type="button"
                    onClick={() => navigateToList(fallbackList.id)}
                    className="px-4 py-2 rounded-lg bg-fb-primary text-white text-xs font-semibold hover:bg-fb-primary/90 transition-colors shadow-fb-button"
                  >
                    Go to {fallbackList.name}
                  </button>
                )}
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
