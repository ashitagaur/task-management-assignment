import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAppStore } from '../store/store';
import { useDrawer } from '../hooks/useDrawer';
import { TaskDrawer } from '../components/drawer/TaskDrawer';
import { ToastProvider } from '../components/shared/Toast';

// Inner component where useDrawer is called inside ToastProvider context
function DrawerInner({ initialAction }: { initialAction?: 'create' | 'edit' }) {
  const drawer = useDrawer();

  React.useEffect(() => {
    if (initialAction === 'create') {
      drawer.openCreate('list-backlog');
    } else if (initialAction === 'edit') {
      drawer.openEdit('FE-101');
    }
  }, [initialAction]);

  return (
    <>
      <button
        type="button"
        data-testid="trigger-open-create"
        onClick={() => drawer.openCreate('list-backlog')}
      >
        Open Create
      </button>
      <button
        type="button"
        data-testid="trigger-open-edit"
        onClick={() => drawer.openEdit('FE-101')}
      >
        Open Edit
      </button>
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

function TestDrawerApp({ initialAction }: { initialAction?: 'create' | 'edit' }) {
  return (
    <ToastProvider>
      <DrawerInner initialAction={initialAction} />
    </ToastProvider>
  );
}

describe('TaskDrawer Component Tests (TE-02 / TE-07)', () => {
  beforeEach(() => {
    useAppStore.getState().resetData();
  });

  it('renders Create mode with empty fields and "Create task" CTA', () => {
    render(<TestDrawerApp initialAction="create" />);

    // Verify modal dialog is open in Create mode
    const dialog = screen.getByRole('dialog', { name: /create new task/i });
    expect(dialog).toBeInTheDocument();

    // Verify title input is blank
    const titleInput = screen.getByPlaceholderText(/task title\.\.\./i) as HTMLInputElement;
    expect(titleInput.value).toBe('');

    // Verify Create CTA button is rendered
    const createButton = screen.getByRole('button', { name: /^create task$/i });
    expect(createButton).toBeInTheDocument();
  });

  it('renders Edit mode with populated fields and "Save changes" CTA', () => {
    render(<TestDrawerApp initialAction="edit" />);

    // Verify modal dialog is open in Edit mode
    const dialog = screen.getByRole('dialog', { name: /edit task FE-101/i });
    expect(dialog).toBeInTheDocument();

    // Verify title input is populated with fixture task title
    const titleInput = screen.getByPlaceholderText(/task title\.\.\./i) as HTMLInputElement;
    expect(titleInput.value).toBe('Design high-fidelity authentication token flow');

    // Verify Save CTA button is rendered
    const saveButton = screen.getByRole('button', { name: /^save changes$/i });
    expect(saveButton).toBeInTheDocument();

    // Verify clean state indicator
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('marks as dirty when a field is edited ("Unsaved changes")', () => {
    render(<TestDrawerApp initialAction="edit" />);

    const titleInput = screen.getByPlaceholderText(/task title\.\.\./i) as HTMLInputElement;
    expect(screen.getByText('Saved')).toBeInTheDocument();

    // Mutate the title field
    fireEvent.change(titleInput, { target: { value: 'Updated task title' } });

    // Verify dirty indicator flips to Unsaved
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    expect(screen.getByTitle('Unsaved changes')).toBeInTheDocument();
  });

  it('shows discard confirmation prompt on requestClose when dirty', () => {
    render(<TestDrawerApp initialAction="edit" />);

    const titleInput = screen.getByPlaceholderText(/task title\.\.\./i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Draft with unsaved edits' } });

    // Click close/cancel button to trigger requestClose()
    const closeButton = screen.getByRole('button', { name: /close task drawer/i });
    fireEvent.click(closeButton);

    // Verify discard confirmation modal appears
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(screen.getByText(/you have unsaved edits to this task/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discard changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep editing/i })).toBeInTheDocument();

    // Keep editing returns to drawer without closing
    fireEvent.click(screen.getByRole('button', { name: /keep editing/i }));
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /edit task FE-101/i })).toBeInTheDocument();
  });

  it('closes immediately on requestClose when clean without showing confirmation', () => {
    render(<TestDrawerApp initialAction="edit" />);

    // Verify drawer is open
    expect(screen.getByRole('dialog', { name: /edit task FE-101/i })).toBeInTheDocument();

    // Click close button while drawer is clean (no edits)
    const closeButton = screen.getByRole('button', { name: /close task drawer/i });
    fireEvent.click(closeButton);

    // Verify discard modal was NOT shown and drawer closed immediately
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /edit task FE-101/i })).not.toBeInTheDocument();
  });
});
