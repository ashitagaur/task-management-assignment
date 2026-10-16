import { useActiveList } from './hooks/useActiveList';
import { AppShell } from './components/app/AppShell';
import { useAppStore } from './store/store';
import { getListStatuses } from './store/selectors';

export function App() {
  const route = useActiveList();
  const viewMode = useAppStore((state) => state.viewMode);
  const fullState = useAppStore((state) => state);

  const statuses = route.activeListId
    ? getListStatuses(fullState, route.activeListId)
    : [];

  return (
    <AppShell route={route}>
      {route.activeList ? (
        <section
          id="view-container"
          aria-label={`${route.activeList.name} ${viewMode} view container`}
          className="space-y-4"
        >
          {/* View Container Placeholder for T08 (Kanban) / T09 (Dense List) */}
          <div className="p-6 rounded-2xl bg-white border border-fb-border shadow-fb-card">
            <div className="flex items-center justify-between mb-3 border-b border-fb-border-soft pb-3">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-fb-text-muted">
                  Current View Container
                </span>
                <h2 className="text-lg font-bold text-fb-text-primary capitalize">
                  {viewMode} View
                </h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-fb-primary-soft text-fb-primary">
                Active Route: #/list/{route.activeListId}
              </span>
            </div>

            <p className="text-xs text-fb-text-secondary leading-relaxed mb-4">
              {viewMode === 'board'
                ? 'Kanban Board with drag-and-drop columns (T08) will mount in this container.'
                : 'Dense Tabular List View with sortable columns (T09) will mount in this container.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-fb-canvas border border-fb-border-soft">
                <span className="text-[11px] text-fb-text-muted block font-medium">List Node ID</span>
                <span className="font-mono text-fb-text-primary font-semibold">{route.activeList.id}</span>
              </div>
              <div className="p-3 rounded-xl bg-fb-canvas border border-fb-border-soft">
                <span className="text-[11px] text-fb-text-muted block font-medium">Configured Statuses</span>
                <span className="font-semibold text-fb-text-primary">
                  {statuses.map((s) => s.name).join(' → ') || 'None'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-fb-canvas border border-fb-border-soft">
                <span className="text-[11px] text-fb-text-muted block font-medium">Selected View Mode</span>
                <span className="font-semibold text-fb-text-primary uppercase tracking-wide">{viewMode}</span>
              </div>
            </div>
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
