import { useActiveList } from './hooks/useActiveList';
import { AppShell } from './components/app/AppShell';
import { useAppStore } from './store/store';
import { useDrawer } from './hooks/useDrawer';
import { KanbanBoard } from './components/board/KanbanBoard';
import { ListView } from './components/list/ListView';
import { TaskDrawer } from './components/drawer/TaskDrawer';
import { ToastProvider } from './components/shared/Toast';

function AppContent() {
  const route = useActiveList();
  const viewMode = useAppStore((state) => state.viewMode);
  const drawer = useDrawer();

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
            className="w-full"
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
