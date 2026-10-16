import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/store';

describe('T13: Optimistic Kanban DnD with Transaction Rollback', () => {
  beforeEach(() => {
    useAppStore.getState().resetData();
    useAppStore.setState({ activeUserId: 'user-alice' });
  });

  it('commits normal cross-status move successfully without rollback', async () => {
    const store = useAppStore.getState();
    const task = store.tasksById['FE-101']!;
    expect(task.statusId).toBe('status-sp18-todo');

    // Normal move: Todo -> In Progress
    const result = await useAppStore.getState().moveTaskStatus('FE-101', 'status-sp18-prog', 0, 0);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const updated = useAppStore.getState().tasksById['FE-101']!;
    expect(updated.statusId).toBe('status-sp18-prog');
    expect(updated.position).toBe(0);
    expect(useAppStore.getState().taskMutationInFlight).toBe(false);
    expect(useAppStore.getState().simulateFailureNext).toBe(false);
  });

  it('commits normal intra-column reorder successfully', async () => {
    const todoTasksBefore = Object.values(useAppStore.getState().tasksById)
      .filter((t) => t.primaryListId === 'list-sprint-18' && t.statusId === 'status-sp18-todo')
      .sort((a, b) => a.position - b.position);

    expect(todoTasksBefore.length).toBeGreaterThan(1);
    const firstTask = todoTasksBefore[0]!;

    const result = await useAppStore.getState().reorderTask(firstTask.id, 1, 0);
    expect(result.success).toBe(true);

    const updatedTask = useAppStore.getState().tasksById[firstTask.id]!;
    expect(updatedTask.position).toBe(1);
    expect(useAppStore.getState().taskMutationInFlight).toBe(false);
  });

  it('rolls back cross-status move cleanly when simulation is armed', async () => {
    const store = useAppStore.getState();
    const taskBefore = store.tasksById['FE-101']!;
    const originalStatusId = taskBefore.statusId;
    const originalPosition = taskBefore.position;
    const originalUpdatedAt = taskBefore.updatedAt;
    const originalTitle = taskBefore.title;
    const originalListId = taskBefore.primaryListId;
    const originalAssignees = [...taskBefore.assigneeIds];

    // Siblings in source column before mutation
    const sourceSiblingsBefore = Object.values(store.tasksById)
      .filter((t) => t.primaryListId === taskBefore.primaryListId && t.statusId === originalStatusId)
      .map((t) => ({ id: t.id, position: t.position }));

    // Siblings in destination column before mutation
    const destSiblingsBefore = Object.values(store.tasksById)
      .filter((t) => t.primaryListId === taskBefore.primaryListId && t.statusId === 'status-sp18-done')
      .map((t) => ({ id: t.id, position: t.position }));

    // 1. Arm simulation
    useAppStore.setState({ simulateFailureNext: true });
    expect(useAppStore.getState().simulateFailureNext).toBe(true);

    // 2. Execute move with a brief 30ms rollback delay
    const movePromise = useAppStore.getState().moveTaskStatus('FE-101', 'status-sp18-done', 0, 30);

    // While in flight: concurrency lock must be held
    expect(useAppStore.getState().taskMutationInFlight).toBe(true);

    // Concurrency check: setActiveUser must be blocked while mutation is in flight
    const userSwitchAttempt = useAppStore.getState().setActiveUser('user-bob');
    expect(userSwitchAttempt.success).toBe(false);
    if (!userSwitchAttempt.success) {
      expect(userSwitchAttempt.error.code).toBe('INVARIANT_VIOLATION');
    }

    // Await simulated failure & rollback
    const result = await movePromise;

    // 3. Verify failure result
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('SIMULATED_FAILURE');
      expect(result.error.message).toBe('Changes were reverted safely.');
    }

    // 4. Verify single-shot disarm and lock release
    expect(useAppStore.getState().simulateFailureNext).toBe(false);
    expect(useAppStore.getState().taskMutationInFlight).toBe(false);

    // 5. Verify task field restoration
    const rolledBackTask = useAppStore.getState().tasksById['FE-101']!;
    expect(rolledBackTask.statusId).toBe(originalStatusId);
    expect(rolledBackTask.position).toBe(originalPosition);
    expect(rolledBackTask.updatedAt).toBe(originalUpdatedAt);

    // Verify unrelated task fields were not modified
    expect(rolledBackTask.title).toBe(originalTitle);
    expect(rolledBackTask.primaryListId).toBe(originalListId);
    expect(rolledBackTask.assigneeIds).toEqual(originalAssignees);

    // 6. Verify source and destination sibling positions are exact
    for (const sib of sourceSiblingsBefore) {
      expect(useAppStore.getState().tasksById[sib.id]?.position).toBe(sib.position);
    }
    for (const sib of destSiblingsBefore) {
      expect(useAppStore.getState().tasksById[sib.id]?.position).toBe(sib.position);
    }
  });

  it('rolls back intra-column reorder cleanly when simulation is armed', async () => {
    const store = useAppStore.getState();
    const taskBefore = store.tasksById['FE-101']!;
    const originalPos = taskBefore.position;

    useAppStore.setState({ simulateFailureNext: true });

    const result = await useAppStore.getState().reorderTask('FE-101', 2, 20);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('SIMULATED_FAILURE');
    }

    const taskAfter = useAppStore.getState().tasksById['FE-101']!;
    expect(taskAfter.position).toBe(originalPos);
    expect(useAppStore.getState().simulateFailureNext).toBe(false);
    expect(useAppStore.getState().taskMutationInFlight).toBe(false);
  });
});
