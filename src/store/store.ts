import { create } from 'zustand';
import {
  AppResult,
  BulkUpdateTasksInput,
  ContainerNode,
  ContainerType,
  Grant,
  PermissionContext,
  PositionSnapshot,
  StaticActivityEntry,
  Task,
  TaskMoveTransactionSnapshot,
  TaskPriority,
  TaskStatus,
  User,
  failure,
  success,
} from '../domain/types';
import {
  DEFAULT_STATUS_TEMPLATES,
  VALID_PARENT_TYPES,
} from '../domain/constants';
import {
  can,
  canArchiveContainer,
  canCreateContainer,
  canCreateTask,
  canDeleteTask,
  canEditTask,
  canMoveTask,
  canRenameContainer,
  canReorderContainer,
} from '../domain/permissions';
import { reindexPositions } from '../domain/ordering';
import { resolveDestinationStatus } from '../domain/task-movement';
import {
  INITIAL_ACTIVITY,
  INITIAL_CONTAINERS,
  INITIAL_GRANTS,
  INITIAL_NEXT_TASK_NUMBER,
  INITIAL_STATUSES,
  INITIAL_TASKS,
  INITIAL_USERS,
} from './fixtures';
import { getStoredActiveUserId, setStoredActiveUserId } from './session';

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  statusId?: string;
  assigneeIds?: string[];
  dueDate?: string | null;
}

export interface AppStoreState {
  // Canonical State
  containersById: Record<string, ContainerNode>;
  tasksById: Record<string, Task>;
  statusesById: Record<string, TaskStatus>;
  usersById: Record<string, User>;
  grants: Grant[];
  nextTaskNumber: number;
  activityByTaskId: Record<string, StaticActivityEntry[]>;

  // Session State
  activeUserId: string;
  viewMode: 'board' | 'list';
  simulateFailureNext: boolean;
  taskMutationInFlight: boolean;

  // Container Mutations
  createContainer: (
    parentId: string | null,
    name: string,
    type: ContainerType,
    isPrivate?: boolean
  ) => AppResult<ContainerNode>;
  createList: (
    parentId: string,
    name: string
  ) => AppResult<{ container: ContainerNode; statuses: TaskStatus[] }>;
  renameContainer: (id: string, name: string) => AppResult<ContainerNode>;
  archiveContainer: (id: string) => AppResult<ContainerNode>;
  moveContainerUp: (id: string) => AppResult<void>;
  moveContainerDown: (id: string) => AppResult<void>;

  // Task Mutations
  createTask: (listId: string, data: CreateTaskInput) => AppResult<Task>;
  updateTask: (
    taskId: string,
    patch: Partial<Omit<Task, 'id' | 'createdAt'>>
  ) => AppResult<Task>;
  deleteTask: (taskId: string) => AppResult<Task>;
  moveTaskStatus: (
    taskId: string,
    newStatusId: string,
    newPosition: number,
    rollbackDelayMs?: number
  ) => Promise<AppResult<Task>>;
  moveTaskToList: (
    taskId: string,
    destListId: string,
    targetStatusId?: string
  ) => AppResult<Task>;
  reorderTask: (
    taskId: string,
    newPosition: number,
    rollbackDelayMs?: number
  ) => Promise<AppResult<Task>>;
  bulkUpdateTasks: (input: BulkUpdateTasksInput) => AppResult<Task[]>;

  // Session Mutations
  setActiveUser: (userId: string) => AppResult<void>;
  setViewMode: (mode: 'board' | 'list') => void;
  toggleSimulateFailure: () => void;
  setTaskMutationInFlight: (inFlight: boolean) => void;
  resetData: () => void;
}

/**
 * Constructs a PermissionContext from store state slices.
 */
export function getPermissionContext(state: {
  containersById: Record<string, ContainerNode>;
  grants: Grant[];
  usersById: Record<string, User>;
}): PermissionContext {
  return {
    containersById: state.containersById,
    grants: state.grants,
    usersById: state.usersById,
  };
}

function getTaskEntry(
  tasksById: Record<string, Task>,
  taskId: string
): { key: string; task: Task } | undefined {
  if (tasksById[taskId]) {
    return { key: taskId, task: tasksById[taskId]! };
  }
  for (const [key, t] of Object.entries(tasksById)) {
    if (t.id === taskId) {
      return { key, task: t };
    }
  }
  return undefined;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  // Initial Canonical State
  containersById: { ...INITIAL_CONTAINERS },
  tasksById: { ...INITIAL_TASKS },
  statusesById: { ...INITIAL_STATUSES },
  usersById: { ...INITIAL_USERS },
  grants: [...INITIAL_GRANTS],
  nextTaskNumber: INITIAL_NEXT_TASK_NUMBER,
  activityByTaskId: { ...INITIAL_ACTIVITY },

  // Initial Session State
  activeUserId: getStoredActiveUserId(),
  viewMode: 'board',
  simulateFailureNext: false,
  taskMutationInFlight: false,

  // ==========================================
  // Container Mutations
  // ==========================================

  // 1. Create Container (Workspace / Space / Folder)
  createContainer: (parentId, name, type, isPrivate = false) => {
    const state = get();
    const trimmedName = name.trim();
    const context = getPermissionContext(state);

    // Check capability for container creation
    const targetParentId = parentId || 'ws-flowboard';
    if (!canCreateContainer(state.activeUserId, targetParentId, context)) {
      return failure('FORBIDDEN', 'Permission denied to create containers');
    }

    if (!trimmedName) {
      return failure('VALIDATION_ERROR', 'Container name cannot be empty');
    }

    if (trimmedName.length > 100) {
      return failure(
        'VALIDATION_ERROR',
        'Container name must not exceed 100 characters'
      );
    }

    // Validate parentage hierarchy
    if (type === 'workspace') {
      if (parentId !== null) {
        return failure(
          'INVALID_PARENTAGE',
          'Workspace must not have a parent container'
        );
      }
    } else {
      if (!parentId) {
        return failure(
          'INVALID_PARENTAGE',
          `${type} container must have a parent container`
        );
      }
      const parent = state.containersById[parentId];
      if (!parent || parent.archived) {
        return failure(
          'INVALID_PARENTAGE',
          `Parent container not found or archived`
        );
      }
      const requiredParentType = VALID_PARENT_TYPES[type];
      if (parent.type !== requiredParentType) {
        return failure(
          'INVALID_PARENTAGE',
          `Cannot create ${type} under a ${parent.type}. Required parent type: ${requiredParentType}`
        );
      }
    }

    // Compute sibling position
    const siblings = Object.values(state.containersById).filter(
      (c) => c.parentId === parentId && !c.archived
    );
    const newPosition = siblings.length;
    const newId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const newContainer: ContainerNode = {
      id: newId,
      name: trimmedName,
      type,
      parentId,
      position: newPosition,
      isPrivate,
      archived: false,
    };

    set((s) => ({
      containersById: {
        ...s.containersById,
        [newId]: newContainer,
      },
    }));

    return success(newContainer);
  },

  // 2. Atomic Create List (Container + 3 Default Statuses)
  createList: (parentId, name) => {
    const state = get();
    const trimmedName = name.trim();
    const context = getPermissionContext(state);

    if (!canCreateContainer(state.activeUserId, parentId, context)) {
      return failure('FORBIDDEN', 'Permission denied to create lists');
    }

    if (!trimmedName) {
      return failure('VALIDATION_ERROR', 'List name cannot be empty');
    }

    const parent = state.containersById[parentId];
    if (!parent || parent.archived) {
      return failure(
        'INVALID_PARENTAGE',
        'Parent container not found or archived'
      );
    }
    if (parent.type !== 'folder') {
      return failure(
        'INVALID_PARENTAGE',
        'Lists must be created inside a Folder'
      );
    }

    const siblings = Object.values(state.containersById).filter(
      (c) => c.parentId === parentId && !c.archived
    );
    const listId = `list-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const listContainer: ContainerNode = {
      id: listId,
      name: trimmedName,
      type: 'list',
      parentId,
      position: siblings.length,
      isPrivate: false,
      archived: false,
    };

    const newStatuses: TaskStatus[] = DEFAULT_STATUS_TEMPLATES.map(
      (tmpl, idx) => ({
        id: `status-${listId}-${idx}`,
        name: tmpl.name,
        category: tmpl.category,
        color: tmpl.color,
        position: idx,
        listId,
      })
    );

    const statusMapUpdates: Record<string, TaskStatus> = {};
    for (const status of newStatuses) {
      statusMapUpdates[status.id] = status;
    }

    // Atomic commit
    set((s) => ({
      containersById: {
        ...s.containersById,
        [listId]: listContainer,
      },
      statusesById: {
        ...s.statusesById,
        ...statusMapUpdates,
      },
    }));

    return success({ container: listContainer, statuses: newStatuses });
  },

  // 3. Rename Container
  renameContainer: (id, name) => {
    const state = get();
    const trimmedName = name.trim();
    const context = getPermissionContext(state);

    if (!canRenameContainer(state.activeUserId, id, context)) {
      return failure('FORBIDDEN', 'Permission denied to rename containers');
    }

    const target = state.containersById[id];
    if (!target) {
      return failure('NOT_FOUND', `Container ${id} not found`);
    }

    if (!trimmedName) {
      return failure('VALIDATION_ERROR', 'Container name cannot be empty');
    }

    const updated: ContainerNode = {
      ...target,
      name: trimmedName,
    };

    set((s) => ({
      containersById: {
        ...s.containersById,
        [id]: updated,
      },
    }));

    return success(updated);
  },

  // 4. Archive Container (Soft-delete)
  archiveContainer: (id) => {
    const state = get();
    const context = getPermissionContext(state);

    if (!canArchiveContainer(state.activeUserId, id, context)) {
      return failure('FORBIDDEN', 'Permission denied to archive containers');
    }

    const target = state.containersById[id];
    if (!target) {
      return failure('NOT_FOUND', `Container ${id} not found`);
    }

    const updated: ContainerNode = {
      ...target,
      archived: true,
    };

    // Reindex remaining active siblings to ensure contiguous 0..n-1
    const activeSiblings = Object.values(state.containersById)
      .filter((c) => c.parentId === target.parentId && c.id !== id && !c.archived)
      .sort((a, b) => a.position - b.position);

    const reindexedSiblings = reindexPositions(activeSiblings);
    const updatedContainerMap = { ...state.containersById, [id]: updated };
    for (const sibling of reindexedSiblings) {
      updatedContainerMap[sibling.id] = sibling;
    }

    set({ containersById: updatedContainerMap });

    return success(updated);
  },

  // 5. Move Container Up
  moveContainerUp: (id) => {
    const state = get();
    const context = getPermissionContext(state);

    if (!canReorderContainer(state.activeUserId, id, context)) {
      return failure('FORBIDDEN', 'Permission denied to reorder containers');
    }

    const target = state.containersById[id];
    if (!target || target.archived) {
      return failure('NOT_FOUND', `Container ${id} not found or archived`);
    }

    const siblings = Object.values(state.containersById)
      .filter((c) => c.parentId === target.parentId && !c.archived)
      .sort((a, b) => a.position - b.position);

    const currentIndex = siblings.findIndex((c) => c.id === id);
    if (currentIndex <= 0) {
      // Already at top
      return success(undefined);
    }

    const prevSibling = siblings[currentIndex - 1]!;
    const swapped = [...siblings];
    swapped[currentIndex - 1] = target;
    swapped[currentIndex] = prevSibling;

    const reindexed = reindexPositions(swapped);
    const updatedMap = { ...state.containersById };
    for (const c of reindexed) {
      updatedMap[c.id] = c;
    }

    set({ containersById: updatedMap });
    return success(undefined);
  },

  // 6. Move Container Down
  moveContainerDown: (id) => {
    const state = get();
    const context = getPermissionContext(state);

    if (!canReorderContainer(state.activeUserId, id, context)) {
      return failure('FORBIDDEN', 'Permission denied to reorder containers');
    }

    const target = state.containersById[id];
    if (!target || target.archived) {
      return failure('NOT_FOUND', `Container ${id} not found or archived`);
    }

    const siblings = Object.values(state.containersById)
      .filter((c) => c.parentId === target.parentId && !c.archived)
      .sort((a, b) => a.position - b.position);

    const currentIndex = siblings.findIndex((c) => c.id === id);
    if (currentIndex === -1 || currentIndex >= siblings.length - 1) {
      // Already at bottom
      return success(undefined);
    }

    const nextSibling = siblings[currentIndex + 1]!;
    const swapped = [...siblings];
    swapped[currentIndex] = nextSibling;
    swapped[currentIndex + 1] = target;

    const reindexed = reindexPositions(swapped);
    const updatedMap = { ...state.containersById };
    for (const c of reindexed) {
      updatedMap[c.id] = c;
    }

    set({ containersById: updatedMap });
    return success(undefined);
  },

  // ==========================================
  // Task Mutations (All guarded by taskMutationInFlight)
  // ==========================================

  // 7. Create Task
  createTask: (listId, data) => {
    const state = get();
    if (state.taskMutationInFlight) {
      return failure(
        'MUTATION_IN_FLIGHT',
        'Another task mutation is currently in flight'
      );
    }

    const context = getPermissionContext(state);

    // Permission guard: task.create capability on list
    if (!canCreateTask(state.activeUserId, listId, context)) {
      return failure(
        'FORBIDDEN',
        'You do not have permission to create tasks in this list'
      );
    }

    const trimmedTitle = data.title?.trim();
    if (!trimmedTitle) {
      return failure('VALIDATION_ERROR', 'Task title cannot be empty');
    }
    if (trimmedTitle.length > 500) {
      return failure(
        'VALIDATION_ERROR',
        'Task title must not exceed 500 characters'
      );
    }

    const list = state.containersById[listId];
    if (!list || list.type !== 'list' || list.archived) {
      return failure('NOT_FOUND', 'Target list does not exist or is archived');
    }

    // Status: requested valid status or default lowest position 'todo' category status in this list
    const listStatuses = Object.values(state.statusesById)
      .filter((s) => s.listId === listId)
      .sort((a, b) => a.position - b.position);

    const requestedStatus = data.statusId
      ? state.statusesById[data.statusId]
      : undefined;

    const targetStatus =
      (requestedStatus && requestedStatus.listId === listId
        ? requestedStatus
        : undefined) ||
      listStatuses.find((s) => s.category === 'todo') ||
      listStatuses[0];

    if (!targetStatus) {
      return failure(
        'INVARIANT_VIOLATION',
        'List has no statuses configured'
      );
    }

    // Position: appended to end of status column
    const tasksInColumn = Object.values(state.tasksById).filter(
      (t) => t.primaryListId === listId && t.statusId === targetStatus.id
    );

    const now = new Date().toISOString();
    const taskId = `FE-${state.nextTaskNumber}`;

    const newTask: Task = {
      id: taskId,
      title: trimmedTitle,
      description: data.description || '',
      primaryListId: listId,
      statusId: targetStatus.id,
      priority: data.priority || 'none',
      assigneeIds: data.assigneeIds || [],
      dueDate: data.dueDate !== undefined ? data.dueDate : null,
      position: tasksInColumn.length,
      createdAt: now,
      updatedAt: now,
    };

    set((s) => ({
      tasksById: {
        ...s.tasksById,
        [taskId]: newTask,
      },
      nextTaskNumber: s.nextTaskNumber + 1,
    }));

    return success(newTask);
  },

  // 8. Update Task
  updateTask: (taskId, patch) => {
    const state = get();
    if (state.taskMutationInFlight) {
      return failure(
        'MUTATION_IN_FLIGHT',
        'Another task mutation is currently in flight'
      );
    }

    const entry = getTaskEntry(state.tasksById, taskId);
    if (!entry) {
      return failure('NOT_FOUND', `Task ${taskId} not found`);
    }
    const currentTask = entry.task;
    const context = getPermissionContext(state);

    // Capability check: task.update inherited from task.primaryListId
    if (!canEditTask(state.activeUserId, currentTask, context)) {
      return failure('FORBIDDEN', 'You do not have permission to edit this task');
    }

    if (patch.title !== undefined) {
      const trimmed = patch.title.trim();
      if (!trimmed) {
        return failure('VALIDATION_ERROR', 'Task title cannot be empty');
      }
      if (trimmed.length > 500) {
        return failure(
          'VALIDATION_ERROR',
          'Task title must not exceed 500 characters'
        );
      }
    }

    // If changing status via updateTask, validate statusId belongs to primary list
    if (patch.statusId && patch.statusId !== currentTask.statusId) {
      const targetStatus = state.statusesById[patch.statusId];
      if (!targetStatus || targetStatus.listId !== currentTask.primaryListId) {
        return failure(
          'VALIDATION_ERROR',
          `Status ${patch.statusId} does not belong to list ${currentTask.primaryListId}`
        );
      }
    }

    const updatedTask: Task = {
      ...currentTask,
      ...patch,
      title: patch.title !== undefined ? patch.title.trim() : currentTask.title,
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      tasksById: {
        ...s.tasksById,
        [entry.key]: updatedTask,
      },
    }));

    return success(updatedTask);
  },

  // 9. Delete Task
  deleteTask: (taskId) => {
    const state = get();
    if (state.taskMutationInFlight) {
      return failure(
        'MUTATION_IN_FLIGHT',
        'Another task mutation is currently in flight'
      );
    }

    const entry = getTaskEntry(state.tasksById, taskId);
    if (!entry) {
      return failure('NOT_FOUND', `Task ${taskId} not found`);
    }
    const task = entry.task;
    const context = getPermissionContext(state);

    // Capability check: task.delete on primary list
    if (!canDeleteTask(state.activeUserId, task, context)) {
      return failure(
        'FORBIDDEN',
        'You do not have permission to delete this task'
      );
    }

    // Reindex remaining tasks in the column to guarantee contiguous 0..n-1 positions
    const remainingInColumn = Object.values(state.tasksById)
      .filter(
        (t) =>
          t.id !== task.id &&
          t.primaryListId === task.primaryListId &&
          t.statusId === task.statusId
      )
      .sort((a, b) => a.position - b.position);

    const reindexed = reindexPositions(remainingInColumn);

    const newTasksMap = { ...state.tasksById };
    delete newTasksMap[entry.key];
    for (const t of reindexed) {
      const tEntry = getTaskEntry(newTasksMap, t.id);
      if (tEntry) {
        newTasksMap[tEntry.key] = t;
      }
    }

    set({ tasksById: newTasksMap });
    return success(task);
  },

  // 10. Move Task Status (Same list or Kanban column drop with Optimistic UI & Transaction Rollback)
  moveTaskStatus: async (taskId, newStatusId, newPosition, rollbackDelayMs = 300) => {
    const state = get();
    if (state.taskMutationInFlight) {
      return failure(
        'MUTATION_IN_FLIGHT',
        'Another task mutation is currently in flight'
      );
    }

    const entry = getTaskEntry(state.tasksById, taskId);
    if (!entry) {
      return failure('NOT_FOUND', `Task ${taskId} not found`);
    }
    const task = entry.task;

    const targetStatus = state.statusesById[newStatusId];
    if (!targetStatus || targetStatus.listId !== task.primaryListId) {
      return failure(
        'VALIDATION_ERROR',
        `Status ${newStatusId} does not belong to list ${task.primaryListId}`
      );
    }

    const context = getPermissionContext(state);

    // Capability check: task.move on the list
    if (!can(state.activeUserId, 'task.move', task.primaryListId, context)) {
      return failure(
        'FORBIDDEN',
        'You do not have permission to move this task'
      );
    }

    // 1. Acquire concurrency lock
    set({ taskMutationInFlight: true });

    // 2. Capture Transaction Snapshot before any optimistic mutation
    const oldStatusId = task.statusId;
    const isSameColumn = oldStatusId === newStatusId;

    const sourceSiblingsBefore: PositionSnapshot[] = Object.values(state.tasksById)
      .filter((t) => t.primaryListId === task.primaryListId && t.statusId === oldStatusId && t.id !== task.id)
      .map((t) => ({ taskId: t.id, position: t.position }));

    const destinationSiblingsBefore: PositionSnapshot[] = !isSameColumn
      ? Object.values(state.tasksById)
          .filter((t) => t.primaryListId === task.primaryListId && t.statusId === newStatusId)
          .map((t) => ({ taskId: t.id, position: t.position }))
      : [];

    const snapshot: TaskMoveTransactionSnapshot = {
      movedTaskId: task.id,
      movedTaskStatusBefore: oldStatusId,
      movedTaskPositionBefore: task.position,
      movedTaskUpdatedAtBefore: task.updatedAt,
      sourceSiblingPositionsBefore: sourceSiblingsBefore,
      destinationSiblingPositionsBefore: destinationSiblingsBefore,
    };

    const now = new Date().toISOString();

    try {
      // 3. Optimistically compute and apply new positions to store
      let updatedTasksMap: Record<string, Task>;

      if (isSameColumn) {
        // Reorder within same status column
        const columnTasks = Object.values(state.tasksById)
          .filter(
            (t) =>
              t.primaryListId === task.primaryListId &&
              t.statusId === oldStatusId
          )
          .sort((a, b) => a.position - b.position);

        const filtered = columnTasks.filter((t) => t.id !== task.id);
        const clampedPosition = Math.max(
          0,
          Math.min(newPosition, filtered.length)
        );
        filtered.splice(clampedPosition, 0, { ...task, updatedAt: now });

        const reindexed = reindexPositions(filtered);
        updatedTasksMap = { ...state.tasksById };
        for (const t of reindexed) {
          const tEntry = getTaskEntry(updatedTasksMap, t.id);
          if (tEntry) {
            updatedTasksMap[tEntry.key] = t;
          }
        }
      } else {
        // Cross-status move within same list
        const oldColumnTasks = Object.values(state.tasksById)
          .filter(
            (t) =>
              t.id !== task.id &&
              t.primaryListId === task.primaryListId &&
              t.statusId === oldStatusId
          )
          .sort((a, b) => a.position - b.position);
        const reindexedOld = reindexPositions(oldColumnTasks);

        const newColumnTasks = Object.values(state.tasksById)
          .filter(
            (t) =>
              t.id !== task.id &&
              t.primaryListId === task.primaryListId &&
              t.statusId === newStatusId
          )
          .sort((a, b) => a.position - b.position);

        const clampedPos = Math.max(
          0,
          Math.min(newPosition, newColumnTasks.length)
        );
        newColumnTasks.splice(clampedPos, 0, {
          ...task,
          statusId: newStatusId,
          updatedAt: now,
        });
        const reindexedNew = reindexPositions(newColumnTasks);

        updatedTasksMap = { ...state.tasksById };
        for (const t of reindexedOld) {
          const tEntry = getTaskEntry(updatedTasksMap, t.id);
          if (tEntry) {
            updatedTasksMap[tEntry.key] = t;
          }
        }
        for (const t of reindexedNew) {
          const tEntry = getTaskEntry(updatedTasksMap, t.id);
          if (tEntry) {
            updatedTasksMap[tEntry.key] = t;
          }
        }
      }

      // Optimistic commit: UI reflects moved task immediately
      set({ tasksById: updatedTasksMap });

      // 4. Check if simulation is armed
      if (state.simulateFailureNext) {
        // Clear flag immediately (single-shot)
        set({ simulateFailureNext: false });

        // Hold optimistic state briefly for observability while lock is held
        if (rollbackDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, rollbackDelayMs));
        }

        // 5. Deterministic Field-Scoped Rollback:
        // Restore ONLY captured fields: statusId, position, updatedAt, sibling positions
        const currentState = get();
        const rollbackTasksMap = { ...currentState.tasksById };

        // Restore moved task
        const movedEntry = getTaskEntry(rollbackTasksMap, snapshot.movedTaskId);
        if (movedEntry) {
          rollbackTasksMap[movedEntry.key] = {
            ...movedEntry.task,
            statusId: snapshot.movedTaskStatusBefore,
            position: snapshot.movedTaskPositionBefore,
            updatedAt: snapshot.movedTaskUpdatedAtBefore,
          };
        }

        // Restore source siblings
        for (const sibling of snapshot.sourceSiblingPositionsBefore) {
          const sEntry = getTaskEntry(rollbackTasksMap, sibling.taskId);
          if (sEntry) {
            rollbackTasksMap[sEntry.key] = {
              ...sEntry.task,
              position: sibling.position,
            };
          }
        }

        // Restore destination siblings
        for (const sibling of snapshot.destinationSiblingPositionsBefore) {
          const dEntry = getTaskEntry(rollbackTasksMap, sibling.taskId);
          if (dEntry) {
            rollbackTasksMap[dEntry.key] = {
              ...dEntry.task,
              position: sibling.position,
            };
          }
        }

        set({ tasksById: rollbackTasksMap });

        return failure(
          'SIMULATED_FAILURE',
          'Changes were reverted safely.'
        );
      }

      return success(updatedTasksMap[entry.key]!);
    } finally {
      // 6. Guarantee concurrency lock is released
      set({ taskMutationInFlight: false });
    }
  },

  // 11. Move Task To Different List
  moveTaskToList: (taskId, destListId, targetStatusId) => {
    const state = get();
    if (state.taskMutationInFlight) {
      return failure(
        'MUTATION_IN_FLIGHT',
        'Another task mutation is currently in flight'
      );
    }

    const entry = getTaskEntry(state.tasksById, taskId);
    if (!entry) {
      return failure('NOT_FOUND', `Task ${taskId} not found`);
    }
    const task = entry.task;

    const destList = state.containersById[destListId];
    if (!destList || destList.type !== 'list' || destList.archived) {
      return failure('NOT_FOUND', 'Destination list not found or archived');
    }

    const context = getPermissionContext(state);

    // Symmetric capability check: task.move on BOTH source list and destination list
    if (!canMoveTask(state.activeUserId, task, destListId, context)) {
      return failure(
        'FORBIDDEN',
        'You do not have permission to move tasks across these lists'
      );
    }

    if (task.primaryListId === destListId && (!targetStatusId || targetStatusId === task.statusId)) {
      return success(task);
    }

    const sourceStatus = state.statusesById[task.statusId];
    const destStatuses = Object.values(state.statusesById).filter(
      (s) => s.listId === destListId
    );

    if (!sourceStatus || destStatuses.length === 0) {
      return failure(
        'INVARIANT_VIOLATION',
        'Source or destination status set is missing'
      );
    }

    const remappedStatus =
      (targetStatusId && destStatuses.find((s) => s.id === targetStatusId)) ||
      resolveDestinationStatus(sourceStatus, destStatuses);

    // Reindex remaining tasks in source column (contiguous 0..n-1)
    const remainingSource = Object.values(state.tasksById)
      .filter(
        (t) =>
          t.id !== task.id &&
          t.primaryListId === task.primaryListId &&
          t.statusId === task.statusId
      )
      .sort((a, b) => a.position - b.position);
    const reindexedSource = reindexPositions(remainingSource);

    // Append to destination column and reindex destination column (contiguous 0..n-1)
    const existingDest = Object.values(state.tasksById)
      .filter(
        (t) =>
          t.primaryListId === destListId &&
          t.statusId === remappedStatus.id
      )
      .sort((a, b) => a.position - b.position);

    const now = new Date().toISOString();
    const movedTask: Task = {
      ...task,
      primaryListId: destListId,
      statusId: remappedStatus.id,
      position: existingDest.length,
      updatedAt: now,
    };

    const reindexedDest = reindexPositions([...existingDest, movedTask]);

    const updatedTasksMap = { ...state.tasksById };
    for (const t of reindexedSource) {
      const tEntry = getTaskEntry(updatedTasksMap, t.id);
      if (tEntry) {
        updatedTasksMap[tEntry.key] = t;
      }
    }
    for (const t of reindexedDest) {
      const tEntry = getTaskEntry(updatedTasksMap, t.id);
      if (tEntry) {
        updatedTasksMap[tEntry.key] = t;
      }
    }

    set({ tasksById: updatedTasksMap });
    return success(movedTask);
  },

  // 12. Reorder Task (Same status column, contiguous 0..n-1 with optimistic DnD)
  reorderTask: async (taskId, newPosition, rollbackDelayMs = 300) => {
    const entry = getTaskEntry(get().tasksById, taskId);
    if (!entry) return failure('NOT_FOUND', `Task ${taskId} not found`);
    return get().moveTaskStatus(entry.key, entry.task.statusId, newPosition, rollbackDelayMs);
  },

  // 13. Bulk Update Tasks (Dense List Multi-Select with all-or-nothing preflight validation)
  bulkUpdateTasks: (input) => {
    const state = get();
    if (state.taskMutationInFlight) {
      return failure(
        'MUTATION_IN_FLIGHT',
        'Another task mutation is currently in flight'
      );
    }

    if (!input.taskIds || input.taskIds.length === 0) {
      return failure('VALIDATION_ERROR', 'No tasks selected for bulk update');
    }

    const context = getPermissionContext(state);

    // 1. Permission Check: task.update capability on active list
    if (!can(state.activeUserId, 'task.update', input.listId, context)) {
      return failure(
        'FORBIDDEN',
        'You do not have permission to update tasks on this list'
      );
    }

    // 2. Target status validation (if changing status)
    if (input.statusId) {
      const targetStatus = state.statusesById[input.statusId];
      if (!targetStatus || targetStatus.listId !== input.listId) {
        return failure(
          'VALIDATION_ERROR',
          `Status ${input.statusId} does not belong to list ${input.listId}`
        );
      }
    }

    // 3. Target assignee validation (if adding assignees)
    if (input.addAssigneeIds && input.addAssigneeIds.length > 0) {
      for (const uid of input.addAssigneeIds) {
        if (!state.usersById[uid]) {
          return failure('NOT_FOUND', `User ${uid} not found`);
        }
      }
    }

    // 4. Preflight Task Verification (All-or-nothing): every task must exist and belong to input.listId
    const tasksToUpdate: { key: string; task: Task }[] = [];
    for (const tid of input.taskIds) {
      const entry = getTaskEntry(state.tasksById, tid);
      if (!entry) {
        return failure('NOT_FOUND', `Task ${tid} not found`);
      }
      if (entry.task.primaryListId !== input.listId) {
        return failure(
          'VALIDATION_ERROR',
          `Task ${tid} does not belong to list ${input.listId}`
        );
      }
      tasksToUpdate.push(entry);
    }

    // 5. Check simulate failure (disarms single-shot flag, mutates zero tasks)
    if (state.simulateFailureNext) {
      set({ simulateFailureNext: false });
      return failure(
        'SIMULATED_FAILURE',
        'Simulated bulk update failure'
      );
    }

    // 6. Atomic Commit:
    const now = new Date().toISOString();
    const updatedTasksMap = { ...state.tasksById };
    const affectedStatusIds = new Set<string>();
    const resultTasks: Task[] = [];

    // If changing status, find existing tasks in target status column that are NOT being bulk-moved
    let currentDestColumnTasks: Task[] = [];
    if (input.statusId) {
      affectedStatusIds.add(input.statusId);
      currentDestColumnTasks = Object.values(state.tasksById)
        .filter(
          (t) =>
            t.primaryListId === input.listId &&
            t.statusId === input.statusId &&
            !input.taskIds.includes(t.id)
        )
        .sort((a, b) => a.position - b.position);
    }

    for (let i = 0; i < tasksToUpdate.length; i++) {
      const { key, task } = tasksToUpdate[i]!;
      const oldStatusId = task.statusId;
      affectedStatusIds.add(oldStatusId);

      let newStatusId = task.statusId;
      let newPosition = task.position;

      if (input.statusId) {
        newStatusId = input.statusId;
        newPosition = currentDestColumnTasks.length + i;
      }

      let newAssignees = task.assigneeIds;
      if (input.addAssigneeIds && input.addAssigneeIds.length > 0) {
        // Additive assignees: merge with existing, deduplicate, never replace
        newAssignees = Array.from(
          new Set([...task.assigneeIds, ...input.addAssigneeIds])
        );
      }

      const updatedTask: Task = {
        ...task,
        statusId: newStatusId,
        position: newPosition,
        assigneeIds: newAssignees,
        updatedAt: now,
      };

      updatedTasksMap[key] = updatedTask;
      resultTasks.push(updatedTask);
    }

    // Contiguously reindex all affected columns (0..n-1)
    for (const statusId of affectedStatusIds) {
      const colTasks = Object.values(updatedTasksMap)
        .filter(
          (t) => t.primaryListId === input.listId && t.statusId === statusId
        )
        .sort((a, b) => a.position - b.position);
      const reindexed = reindexPositions(colTasks);
      for (const t of reindexed) {
        const entry = getTaskEntry(updatedTasksMap, t.id);
        if (entry) {
          updatedTasksMap[entry.key] = t;
        }
      }
    }

    set({ tasksById: updatedTasksMap });
    return success(resultTasks);
  },

  // Session: Set Active User
  setActiveUser: (userId) => {
    const state = get();
    if (state.taskMutationInFlight) {
      return failure(
        'INVARIANT_VIOLATION',
        'Cannot switch user while a task mutation is in flight'
      );
    }

    if (!state.usersById[userId]) {
      return failure('NOT_FOUND', `User ${userId} not found`);
    }

    setStoredActiveUserId(userId);
    set({ activeUserId: userId });
    return success(undefined);
  },

  // Session: Set View Mode
  setViewMode: (mode) => set({ viewMode: mode }),

  // Session: Toggle Simulate Failure
  toggleSimulateFailure: () =>
    set((s) => ({ simulateFailureNext: !s.simulateFailureNext })),

  // Concurrency lock setter
  setTaskMutationInFlight: (inFlight) => set({ taskMutationInFlight: inFlight }),

  // Reset to initial fixtures
  resetData: () => {
    setStoredActiveUserId('user-alice');
    set({
      containersById: { ...INITIAL_CONTAINERS },
      tasksById: { ...INITIAL_TASKS },
      statusesById: { ...INITIAL_STATUSES },
      usersById: { ...INITIAL_USERS },
      grants: [...INITIAL_GRANTS],
      nextTaskNumber: INITIAL_NEXT_TASK_NUMBER,
      activityByTaskId: { ...INITIAL_ACTIVITY },
      activeUserId: 'user-alice',
      viewMode: 'board',
      simulateFailureNext: false,
      taskMutationInFlight: false,
    });
  },
}));
