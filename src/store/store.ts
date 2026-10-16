import { create } from 'zustand';
import {
  AppResult,
  ContainerNode,
  ContainerType,
  Grant,
  StaticActivityEntry,
  Task,
  TaskStatus,
  User,
  failure,
  success,
} from '../domain/types';
import {
  DEFAULT_STATUS_TEMPLATES,
  VALID_PARENT_TYPES,
} from '../domain/constants';
import { canManageContainers } from '../domain/permissions';
import { reindexPositions } from '../domain/ordering';
import {
  INITIAL_ACTIVITY,
  INITIAL_CONTAINERS,
  INITIAL_GRANTS,
  INITIAL_NEXT_TASK_NUMBER,
  INITIAL_STATUSES,
  INITIAL_TASKS,
  INITIAL_USERS,
} from './fixtures';

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

  // Session Mutations
  setActiveUser: (userId: string) => AppResult<void>;
  setViewMode: (mode: 'board' | 'list') => void;
  toggleSimulateFailure: () => void;
  setTaskMutationInFlight: (inFlight: boolean) => void;
  resetData: () => void;
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
  activeUserId: 'user-alice',
  viewMode: 'board',
  simulateFailureNext: false,
  taskMutationInFlight: false,

  // 1. Create Container
  createContainer: (parentId, name, type, isPrivate = false) => {
    const state = get();
    const trimmedName = name.trim();

    if (!canManageContainers(state.activeUserId, state.usersById)) {
      return failure('FORBIDDEN', 'Only workspace administrators can manage containers');
    }

    if (!trimmedName) {
      return failure('VALIDATION_ERROR', 'Container name cannot be empty');
    }

    // Parentage verification against strict 4-tier hierarchy
    if (type === 'workspace') {
      if (parentId !== null) {
        return failure('INVALID_PARENTAGE', 'Workspace must not have a parent container');
      }
    } else {
      if (!parentId) {
        return failure('INVALID_PARENTAGE', `${type} container must have a parent container`);
      }
      const parent = state.containersById[parentId];
      if (!parent || parent.archived) {
        return failure('INVALID_PARENTAGE', `Parent container not found or archived`);
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

    if (!canManageContainers(state.activeUserId, state.usersById)) {
      return failure('FORBIDDEN', 'Only workspace administrators can create lists');
    }

    if (!trimmedName) {
      return failure('VALIDATION_ERROR', 'List name cannot be empty');
    }

    const parent = state.containersById[parentId];
    if (!parent || parent.archived) {
      return failure('INVALID_PARENTAGE', 'Parent container not found or archived');
    }
    if (parent.type !== 'folder') {
      return failure('INVALID_PARENTAGE', 'Lists must be created inside a Folder');
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

    const newStatuses: TaskStatus[] = DEFAULT_STATUS_TEMPLATES.map((tmpl, idx) => ({
      id: `status-${listId}-${idx}`,
      name: tmpl.name,
      category: tmpl.category,
      color: tmpl.color,
      position: idx,
      listId,
    }));

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

    if (!canManageContainers(state.activeUserId, state.usersById)) {
      return failure('FORBIDDEN', 'Only workspace administrators can rename containers');
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

    if (!canManageContainers(state.activeUserId, state.usersById)) {
      return failure('FORBIDDEN', 'Only workspace administrators can archive containers');
    }

    const target = state.containersById[id];
    if (!target) {
      return failure('NOT_FOUND', `Container ${id} not found`);
    }

    const updated: ContainerNode = {
      ...target,
      archived: true,
    };

    // Reindex remaining active siblings
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

    if (!canManageContainers(state.activeUserId, state.usersById)) {
      return failure('FORBIDDEN', 'Only workspace administrators can reorder containers');
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

    if (!canManageContainers(state.activeUserId, state.usersById)) {
      return failure('FORBIDDEN', 'Only workspace administrators can reorder containers');
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
  resetData: () =>
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
    }),
}));
