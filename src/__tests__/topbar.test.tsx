import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Topbar } from '../components/app/Topbar';
import { useAppStore } from '../store/store';

describe('Topbar Routing States', () => {
  beforeEach(() => {
    useAppStore.getState().resetData();
    useAppStore.setState({ activeUserId: 'user-alice' });
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
});
