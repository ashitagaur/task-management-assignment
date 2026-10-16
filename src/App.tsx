import { useActiveList } from './hooks/useActiveList';
import { useSimulatedLoad } from './hooks/useSimulatedLoad';
import { AppShell } from './components/app/AppShell';
import { useAppStore } from './store/store';
import { useDrawer } from './hooks/useDrawer';
import { KanbanBoard } from './components/board/KanbanBoard';
import { ListView } from './components/list/ListView';
import { LoadingSkeleton } from './components/shared/LoadingSkeleton';
import { TaskDrawer } from './components/drawer/TaskDrawer';
import { ToastProvider } from './components/shared/Toast';

function AppContent() {
  const route = useActiveList();
  const viewMode = useAppStore((state) => state.viewMode);
  const drawer = useDrawer();
  const { isLoading, isFading } = useSimulatedLoad(route.activeListId, 250);

  const handleOpenCreate = (statusId?: string) => {
    if (route.activeList) {
      drawer.openCreate(route.activeList.id, statusId);
    }
  };

  return (
    <>
      <AppShell
        route={route}
        onNewTask={() => handleOpenCreate()}
      >
        {route.state === 'access' && route.activeList ? (
          <section
            id="view-container"
            aria-label={`${route.activeList.name} ${viewMode} view container`}
            className="w-full max-w-full min-w-0 relative"
          >
            {/* View Content: renders in-place, smoothly fading in during initial crossfade */}
            <div
              className={
                isFading
                  ? 'transition-opacity duration-200 ease-out opacity-100'
                  : isLoading
                  ? 'opacity-0'
                  : ''
              }
              aria-hidden={isLoading && !isFading}
            >
              {viewMode === 'board' ? (
                <KanbanBoard
                  listId={route.activeList.id}
                  onTaskClick={(task) => drawer.openEdit(task.id)}
                  onCreateTask={handleOpenCreate}
                />
              ) : (
                <ListView
                  listId={route.activeList.id}
                  onTaskClick={(task) => drawer.openEdit(task.id)}
                  onCreateTask={() => handleOpenCreate()}
                />
              )}
            </div>

            {/* Shimmer skeleton overlay: visible ONLY during initial app load / refresh */}
            {isLoading && (
              <div
                className={`absolute inset-0 z-10 bg-fb-canvas transition-opacity duration-200 ease-out pointer-events-none ${
                  isFading ? 'opacity-0' : 'opacity-100'
                }`}
                aria-hidden="true"
              >
                <LoadingSkeleton viewMode={viewMode} />
              </div>
            )}
          </section>
        ) : null}
      </AppShell>

      <TaskDrawer
        isOpen={drawer.isOpen}
        mode={drawer.mode}
        taskId={drawer.taskId}
        draft={drawer.draft}
        isDirty={drawer.isDirty}
        showDiscardModal={drawer.showDiscardModal}
        showDeleteModal={drawer.showDeleteModal}
        onUpdateField={drawer.updateField}
        onRequestClose={drawer.requestClose}
        onConfirmDiscard={drawer.confirmDiscard}
        onCancelDiscard={drawer.cancelDiscard}
        onRequestDelete={drawer.requestDelete}
        onConfirmDelete={drawer.confirmDelete}
        onCancelDelete={drawer.cancelDelete}
        onSave={drawer.save}
      />
    </>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
