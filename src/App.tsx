import { useActiveList } from './hooks/useActiveList';
import { AppShell } from './components/app/AppShell';
import { useAppStore } from './store/store';

export function App() {
  const route = useActiveList();
  const viewMode = useAppStore((state) => state.viewMode);

  return (
    <AppShell route={route}>
      {route.activeList ? (
        <section
          id="view-container"
          aria-label={`${route.activeList.name} ${viewMode} view container`}
          className="space-y-4"
        >
          {/* View Container Placeholder for T08 (Kanban) / T09 (Dense List) */}
          <div className="p-8 sm:p-12 text-center rounded-2xl bg-white border border-fb-border shadow-fb-card">
            <h2 className="text-base font-semibold text-fb-text-primary capitalize mb-1.5">
              {viewMode} View
            </h2>
            <p className="text-xs text-fb-text-secondary max-w-md mx-auto leading-relaxed">
              {viewMode === 'board'
                ? 'Kanban board will display status columns and draggable task cards for this list.'
                : 'Dense tabular list will display tasks with sorting and status filters.'}
            </p>
          </div>
        </section>
      ) : (
        <div className="p-12 text-center text-fb-text-muted text-sm">
          No list selected. Please choose a list from the navigation.
        </div>
      )}
    </AppShell>
  );
}

export default App;
