import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Topbar } from '../components/app/Topbar';
import { AppShell } from '../components/app/AppShell';
import { ActiveListRoute } from '../hooks/useActiveList';
import { useAppStore } from '../store/store';

describe('Topbar Routing States & Shell Stability', () => {
  beforeEach(() => {
    useAppStore.getState().resetData();
    useAppStore.setState({ activeUserId: 'user-alice' });
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders Search, Simulation toggle, and User Switcher on valid access route', () => {
    render(
      <Topbar
        activeListId="list-sprint-18"
        routeState="access"
        onNavigate={() => {}}
        onToggleMobileSidebar={() => {}}
      />
    );

    // Search input is rendered
    expect(screen.getByPlaceholderText(/search tasks\.\.\./i)).toBeInTheDocument();

    // Simulation button is rendered
    expect(screen.getByRole('button', { name: /toggle mutation failure simulation/i })).toBeInTheDocument();

    // User switcher is rendered
    expect(screen.getByRole('button', { name: /current user: alice/i })).toBeInTheDocument();
  });

  it('hides Search and Simulation button on page not found route, showing ONLY User Switcher', () => {
    render(
      <Topbar
        activeListId={null}
        routeState="not-found"
        onNavigate={() => {}}
        onToggleMobileSidebar={() => {}}
      />
    );

    // Breadcrumbs hide Page not found text
    expect(screen.queryByText('Page not found')).not.toBeInTheDocument();

    // Search input is HIDDEN
    expect(screen.queryByPlaceholderText(/search tasks\.\.\./i)).not.toBeInTheDocument();

    // Simulation toggle is HIDDEN
    expect(screen.queryByRole('button', { name: /toggle mutation failure simulation/i })).not.toBeInTheDocument();

    // User Switcher is the ONLY action control on the right
    expect(screen.getByRole('button', { name: /current user: alice/i })).toBeInTheDocument();
  });

  it('preserves collapsed sidebar state from sessionStorage on initial render without flashing', () => {
    sessionStorage.setItem('flowboard.sidebarCollapsed', 'true');

    const mockRoute: ActiveListRoute = {
      state: 'access',
      activeListId: 'list-sprint-18',
      activeList: useAppStore.getState().containersById['list-sprint-18'] as any,
      isForbidden: false,
      isNotFound: false,
      targetContainer: null,
      fallbackList: null,
      navigateToList: () => {},
    };

    render(
      <AppShell route={mockRoute}>
        <div data-testid="test-content">Task Content</div>
      </AppShell>
    );

    const aside = screen.getByLabelText(/desktop navigation sidebar/i);
    // Mounted directly in compact 68px width
    expect(aside.className).toContain('w-[68px]');
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();

    // Clicking toggle updates sessionStorage and expands
    const toggleBtn = screen.getByRole('button', { name: /expand sidebar/i });
    fireEvent.click(toggleBtn);
    expect(sessionStorage.getItem('flowboard.sidebarCollapsed')).toBe('false');
    expect(aside.className).toContain('w-[248px]');
  });
});
