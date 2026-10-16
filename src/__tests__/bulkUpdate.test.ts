import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/store';
import { getSortedTasks } from '../store/selectors';

describe('T14: Bulk Update (Dense List Multi-Select) Atomicity', () => {
  beforeEach(() => {
    useAppStore.getState().resetData();
    useAppStore.setState({ activeUserId: 'user-alice' });
  });

  it('fails atomically when a non-existent task ID is included (mutates 0 tasks)', () => {
    const store = useAppStore.getState();
    const task1 = store.tasksById['FE-101']!;
    const originalStatus = task1.statusId;

    const result = useAppStore.getState().bulkUpdateTasks({
      taskIds: ['FE-101', 'non-existent-task-id'],
      listId: 'list-sprint-18',
      statusId: 'status-sp18-done',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }

    // Zero tasks mutated
    expect(useAppStore.getState().tasksById['FE-101']?.statusId).toBe(originalStatus);
  });

  it('fails atomically when a task from another list is included (mutates 0 tasks)', () => {
    const store = useAppStore.getState();
    const taskSprint18 = store.tasksById['FE-101']!;
    const originalStatus = taskSprint18.statusId;

    // FE-110 belongs to list-backlog, not list-sprint-18
    const result = useAppStore.getState().bulkUpdateTasks({
      taskIds: ['FE-101', 'FE-110'],
      listId: 'list-sprint-18',
      statusId: 'status-sp18-done',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }

    // Zero tasks mutated
    expect(useAppStore.getState().tasksById['FE-101']?.statusId).toBe(originalStatus);
  });

  it('fails atomically when target status does not belong to the list', () => {
    const store = useAppStore.getState();
    const taskSprint18 = store.tasksById['FE-101']!;
    const originalStatus = taskSprint18.statusId;

    // status-bkl-todo belongs to list-backlog, not list-sprint-18
    const result = useAppStore.getState().bulkUpdateTasks({
      taskIds: ['FE-101', 'FE-102'],
      listId: 'list-sprint-18',
      statusId: 'status-bkl-todo',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }

    expect(useAppStore.getState().tasksById['FE-101']?.statusId).toBe(originalStatus);
  });

  it('fails atomically and disarms when simulation is armed (mutates 0 tasks)', () => {
    useAppStore.setState({ simulateFailureNext: true });

    const store = useAppStore.getState();
    const originalStatus1 = store.tasksById['FE-101']!.statusId;
    const originalStatus2 = store.tasksById['FE-102']!.statusId;

    const result = useAppStore.getState().bulkUpdateTasks({
      taskIds: ['FE-101', 'FE-102'],
      listId: 'list-sprint-18',
      statusId: 'status-sp18-done',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('SIMULATED_FAILURE');
    }

    // Single-shot simulation disarmed
    expect(useAppStore.getState().simulateFailureNext).toBe(false);

    // Zero tasks mutated
    expect(useAppStore.getState().tasksById['FE-101']?.statusId).toBe(originalStatus1);
    expect(useAppStore.getState().tasksById['FE-102']?.statusId).toBe(originalStatus2);
  });

  it('atomically updates status and positions in rendered order', () => {
    const store = useAppStore.getState();
    // In Sprint 18, FE-101 and FE-102 are in status-sp18-todo
    // Move both to status-sp18-done
    const existingDoneTasks = Object.values(store.tasksById).filter(
      (t) => t.primaryListId === 'list-sprint-18' && t.statusId === 'status-sp18-done'
    );
    const existingDoneCount = existingDoneTasks.length;

    const result = useAppStore.getState().bulkUpdateTasks({
      taskIds: ['FE-101', 'FE-102'],
      listId: 'list-sprint-18',
      statusId: 'status-sp18-done',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.length).toBe(2);

    const updated1 = useAppStore.getState().tasksById['FE-101']!;
    const updated2 = useAppStore.getState().tasksById['FE-102']!;

    expect(updated1.statusId).toBe('status-sp18-done');
    expect(updated2.statusId).toBe('status-sp18-done');

    // Appended in passed rendered order
    expect(updated1.position).toBe(existingDoneCount);
    expect(updated2.position).toBe(existingDoneCount + 1);

    // Contiguous positions in target column
    const allDoneAfter = Object.values(useAppStore.getState().tasksById)
      .filter((t) => t.primaryListId === 'list-sprint-18' && t.statusId === 'status-sp18-done')
      .sort((a, b) => a.position - b.position);

    allDoneAfter.forEach((t, idx) => {
      expect(t.position).toBe(idx);
    });
  });

  it('additively adds assignees with deduplication without replacing existing assignees', () => {
    const store = useAppStore.getState();
    // FE-101 has assignees ['user-alice', 'user-bob']
    // FE-102 has assignee ['user-alice']
    expect(store.tasksById['FE-101']?.assigneeIds).toEqual(['user-alice', 'user-bob']);
    expect(store.tasksById['FE-102']?.assigneeIds).toEqual(['user-alice']);

    // Bulk add 'user-carol' and 'user-bob'
    const result = useAppStore.getState().bulkUpdateTasks({
      taskIds: ['FE-101', 'FE-102'],
      listId: 'list-sprint-18',
      addAssigneeIds: ['user-carol', 'user-bob'],
    });

    expect(result.success).toBe(true);

    const updated1 = useAppStore.getState().tasksById['FE-101']!;
    const updated2 = useAppStore.getState().tasksById['FE-102']!;

    // FE-101 already had bob, so adding carol + bob should result in alice, bob, carol (deduplicated)
    expect(updated1.assigneeIds).toContain('user-alice');
    expect(updated1.assigneeIds).toContain('user-bob');
    expect(updated1.assigneeIds).toContain('user-carol');
    expect(updated1.assigneeIds.length).toBe(3);

    // FE-102 had alice, now gets carol and bob
    expect(updated2.assigneeIds).toContain('user-alice');
    expect(updated2.assigneeIds).toContain('user-bob');
    expect(updated2.assigneeIds).toContain('user-carol');
    expect(updated2.assigneeIds.length).toBe(3);
  });

  it('preserves Dense List visual rendered order when sorted by Priority and bulk moved to target status', () => {
    const store = useAppStore.getState();
    const listId = 'list-sprint-18';
    const targetStatusId = 'status-sp18-done';

    // A. Sort Dense List by Priority descending
    const sortedByPriority = getSortedTasks(store, listId, 'priority', 'desc');
    expect(sortedByPriority.length).toBeGreaterThanOrEqual(3);

    // B. Select 3 tasks that appear in a clear visual order
    const selectedThree = [
      sortedByPriority[0]!.id,
      sortedByPriority[1]!.id,
      sortedByPriority[2]!.id,
    ];

    // C. Bulk Change Status
    const result = useAppStore.getState().bulkUpdateTasks({
      taskIds: selectedThree,
      listId,
      statusId: targetStatusId,
    });
    expect(result.success).toBe(true);

    // D. Open Board / inspect destination column
    const boardColumnTasks = Object.values(useAppStore.getState().tasksById)
      .filter((t) => t.primaryListId === listId && t.statusId === targetStatusId)
      .sort((a, b) => a.position - b.position);

    // Filter to only the 3 moved tasks to check their relative ordering
    const movedInDestOrder = boardColumnTasks
      .filter((t) => selectedThree.includes(t.id))
      .map((t) => t.id);

    // Destination task order MUST match the visual Dense List order at the moment of bulk action
    expect(movedInDestOrder).toEqual(selectedThree);
  });

  it('preserves Dense List visual rendered order when sorted by Due Date and bulk moved to target status', () => {
    const store = useAppStore.getState();
    const listId = 'list-sprint-18';
    const targetStatusId = 'status-sp18-prog';

    // A. Sort Dense List by Due Date ascending
    const sortedByDueDate = getSortedTasks(store, listId, 'dueDate', 'asc');
    expect(sortedByDueDate.length).toBeGreaterThanOrEqual(3);

    // B. Select 3 tasks that appear in a clear visual order
    const selectedThree = [
      sortedByDueDate[0]!.id,
      sortedByDueDate[1]!.id,
      sortedByDueDate[2]!.id,
    ];

    // C. Bulk Change Status
    const result = useAppStore.getState().bulkUpdateTasks({
      taskIds: selectedThree,
      listId,
      statusId: targetStatusId,
    });
    expect(result.success).toBe(true);

    // D. Open Board / inspect destination column
    const boardColumnTasks = Object.values(useAppStore.getState().tasksById)
      .filter((t) => t.primaryListId === listId && t.statusId === targetStatusId)
      .sort((a, b) => a.position - b.position);

    // Filter to only the 3 moved tasks to check their relative ordering
    const movedInDestOrder = boardColumnTasks
      .filter((t) => selectedThree.includes(t.id))
      .map((t) => t.id);

    // Destination task order MUST match the visual Dense List order at the moment of bulk action
    expect(movedInDestOrder).toEqual(selectedThree);
  });
});

