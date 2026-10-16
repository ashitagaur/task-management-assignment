import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../App';
import { useAppStore } from '../store/store';

describe('End-to-End Application Workflow Tests', () => {
  beforeEach(() => {
    window.location.hash = '#/list/list-sprint-18';
    sessionStorage.clear();
    useAppStore.getState().resetData();
    useAppStore.setState({ activeUserId: 'user-alice' });
  });

  it('E2E Flow 1: Alice boots app, inspects hierarchy, creates a task via drawer, and sees card on board', async () => {
    render(<App />);

    // 1. Initial shell and chrome verification
    expect(screen.getByRole('button', { name: /current user: alice/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Sprint 18' })).toBeInTheDocument();

    // 2. Open task creation drawer via header CTA
    const newTaskBtn = screen.getByRole('button', { name: /create new task/i });
    fireEvent.click(newTaskBtn);

    // 3. Verify drawer opens in Create mode
    const drawerTitle = await screen.findByRole('dialog', { name: /create new task/i });
    expect(drawerTitle).toBeInTheDocument();

    // 4. Fill in task details
    const titleInput = screen.getByPlaceholderText(/task title\.\.\./i);
    fireEvent.change(titleInput, { target: { value: 'Automated E2E Delivered Task' } });

    // 5. Submit form
    const createBtn = screen.getByRole('button', { name: /^create task$/i });
    fireEvent.click(createBtn);

    // 6. Verify task card appears on the board
    await waitFor(() => {
      expect(screen.getByText('Automated E2E Delivered Task')).toBeInTheDocument();
    });
  });

  it('E2E Flow 2: User switcher dropdown switches perspective from Alice to Bob, instantly pruning tree', async () => {
    render(<App />);

    // Initially Alice sees Sprint 18 and Marketing in sidebar navigation
    const sidebar = screen.getByRole('complementary', { name: /desktop navigation sidebar/i });
    expect(within(sidebar).getByText('Sprint 18')).toBeInTheDocument();
    expect(within(sidebar).getByText('Marketing')).toBeInTheDocument();

    // Open User Switcher dropdown
    const switcherBtn = screen.getByRole('button', { name: /current user: alice/i });
    fireEvent.click(switcherBtn);

    // Select Bob from dropdown
    const bobOption = await screen.findByRole('button', { name: /bob member/i });
    fireEvent.click(bobOption);

    // Switcher now reflects Bob
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /current user: bob/i })).toBeInTheDocument();
    });

    // Bob has an explicit deny grant on Sprint 18 and no grant on private Marketing:
    // Both must be completely pruned from the sidebar navigation tree
    expect(within(sidebar).queryByText('Sprint 18')).not.toBeInTheDocument();
    expect(within(sidebar).queryByText('Marketing')).not.toBeInTheDocument();

    // Backlog remains visible and accessible to Bob
    expect(within(sidebar).getByText('Backlog')).toBeInTheDocument();
  });

  it('E2E Flow 3: Toggle to Dense List view, select tasks, and apply bulk status update via dock', async () => {
    render(<App />);

    // Switch view to Dense List
    const listViewToggleBtn = screen.getByRole('button', { name: /switch to list view/i });
    fireEvent.click(listViewToggleBtn);

    // Table view renders with checkboxes
    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);

    // Select first two task checkboxes (index 0 is header select-all, 1 and 2 are rows)
    fireEvent.click(checkboxes[1]!);
    fireEvent.click(checkboxes[2]!);

    // Floating BulkActionDock appears with selection count
    expect(await screen.findByText(/2 tasks selected/i)).toBeInTheDocument();

    // Open Change Status menu in dock
    const changeStatusBtn = screen.getByRole('button', { name: /^change status$/i });
    fireEvent.click(changeStatusBtn);

    // Select 'Done' status
    const doneOption = screen.getByRole('menuitem', { name: /done/i });
    fireEvent.click(doneOption);

    // Verify dock dismisses after operation
    await waitFor(() => {
      expect(screen.queryByText(/2 tasks selected/i)).not.toBeInTheDocument();
    });
  });

  it('E2E Flow 4: Navigation to non-existent route renders 404 card and minimal topbar', async () => {
    window.location.hash = '#/list/non-existent-route-id';
    render(<App />);

    // 404 NotFoundCard is rendered
    expect(await screen.findByText(/sorry, we can't find that page\./i)).toBeInTheDocument();

    // Context controls (Search, Simulation) are hidden in header
    expect(screen.queryByPlaceholderText(/search tasks\.\.\./i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /toggle mutation failure simulation/i })).not.toBeInTheDocument();

    // Fallback CTA exists
    expect(screen.getByRole('button', { name: /go to my workspace/i })).toBeInTheDocument();
  });
});
