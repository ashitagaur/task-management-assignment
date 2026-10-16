import { useState, useCallback, useMemo, useEffect } from 'react';
import { TaskPriority } from '../domain/types';
import {
  can,
  canCreateTask,
  canEditTask,
  canMoveTask,
} from '../domain/permissions';
import { resolveDestinationStatus } from '../domain/task-movement';
import { useAppStore, getPermissionContext } from '../store/store';
import { useToast } from '../components/shared/Toast';

export interface DrawerDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  statusId: string;
  primaryListId: string;
  assigneeIds: string[];
  dueDate: string | null;
}

const EMPTY_DRAFT: DrawerDraft = {
  title: '',
  description: '',
  priority: 'none',
  statusId: '',
  primaryListId: '',
  assigneeIds: [],
  dueDate: null,
};

export function useDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DrawerDraft>(EMPTY_DRAFT);
  const [initialDraft, setInitialDraft] = useState<DrawerDraft>(EMPTY_DRAFT);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { showToast } = useToast();

  const tasksById = useAppStore((state) => state.tasksById);
  const statusesById = useAppStore((state) => state.statusesById);
  const activeUserId = useAppStore((state) => state.activeUserId);
  const createTask = useAppStore((state) => state.createTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTaskStore = useAppStore((state) => state.deleteTask);
  const moveTaskToList = useAppStore((state) => state.moveTaskToList);

  // Automatically close drawer on user perspective switch to prevent draft/permission leaks
  useEffect(() => {
    setIsOpen(false);
    setTaskId(null);
    setShowDiscardModal(false);
    setShowDeleteModal(false);
  }, [activeUserId]);

  // Check if draft has unsaved changes compared to initialDraft
  const isDirty = useMemo(() => {
    if (!isOpen) return false;
    return (
      draft.title !== initialDraft.title ||
      draft.description !== initialDraft.description ||
      draft.priority !== initialDraft.priority ||
      draft.statusId !== initialDraft.statusId ||
      draft.primaryListId !== initialDraft.primaryListId ||
      draft.dueDate !== initialDraft.dueDate ||
      JSON.stringify(draft.assigneeIds.slice().sort()) !==
        JSON.stringify(initialDraft.assigneeIds.slice().sort())
    );
  }, [isOpen, draft, initialDraft]);

  const openCreate = useCallback(
    (listId: string, preferredStatusId?: string) => {
      const listStatuses = Object.values(statusesById)
        .filter((s) => s.listId === listId)
        .sort((a, b) => a.position - b.position);

      const defaultStatus =
        (preferredStatusId && statusesById[preferredStatusId]) ||
        listStatuses.find((s) => s.category === 'todo') ||
        listStatuses[0];

      const newDraft: DrawerDraft = {
        title: '',
        description: '',
        priority: 'none',
        statusId: defaultStatus ? defaultStatus.id : '',
        primaryListId: listId,
        assigneeIds: [],
        dueDate: null,
      };

      setMode('create');
      setTaskId(null);
      setDraft(newDraft);
      setInitialDraft(newDraft);
      setShowDiscardModal(false);
      setShowDeleteModal(false);
      setIsOpen(true);
    },
    [statusesById]
  );

  const openEdit = useCallback(
    (id: string) => {
      const task = tasksById[id];
      if (!task) return;

      const newDraft: DrawerDraft = {
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        statusId: task.statusId,
        primaryListId: task.primaryListId,
        assigneeIds: [...task.assigneeIds],
        dueDate: task.dueDate,
      };

      setMode('edit');
      setTaskId(id);
      setDraft(newDraft);
      setInitialDraft(newDraft);
      setShowDiscardModal(false);
      setShowDeleteModal(false);
      setIsOpen(true);
    },
    [tasksById]
  );

  const updateField = useCallback(
    <K extends keyof DrawerDraft>(field: K, value: DrawerDraft[K]) => {
      setDraft((prev) => {
        if (field === 'primaryListId' && typeof value === 'string' && value !== prev.primaryListId) {
          const destStatuses = Object.values(statusesById)
            .filter((s) => s.listId === value)
            .sort((a, b) => a.position - b.position);

          let defaultStatus =
            destStatuses.find((s) => s.category === 'todo') || destStatuses[0];

          if (mode === 'edit' && taskId && tasksById[taskId]) {
            const sourceStatus = statusesById[tasksById[taskId].statusId];
            if (sourceStatus && destStatuses.length > 0) {
              defaultStatus = resolveDestinationStatus(sourceStatus, destStatuses);
            }
          }

          return {
            ...prev,
            primaryListId: value,
            statusId: defaultStatus ? defaultStatus.id : '',
          };
        }

        return {
          ...prev,
          [field]: value,
        };
      });
    },
    [statusesById, mode, taskId, tasksById]
  );

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      setIsOpen(false);
      setTaskId(null);
    }
  }, [isDirty]);

  const confirmDiscard = useCallback(() => {
    setShowDiscardModal(false);
    setIsOpen(false);
    setTaskId(null);
  }, []);

  const cancelDiscard = useCallback(() => {
    setShowDiscardModal(false);
  }, []);

  const requestDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const cancelDelete = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!taskId) return;
    const result = deleteTaskStore(taskId);
    if (result.success) {
      showToast({
        type: 'success',
        title: 'Task deleted',
        body: `Task ${taskId} was permanently removed.`,
      });
      setShowDeleteModal(false);
      setIsOpen(false);
      setTaskId(null);
    } else {
      showToast({
        type: 'error',
        title: "Couldn't delete task",
        body: result.error.message,
      });
    }
  }, [taskId, deleteTaskStore, showToast]);

  const save = useCallback(() => {
    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) {
      showToast({
        type: 'error',
        title: 'Validation error',
        body: 'Task title cannot be empty.',
      });
      return false;
    }

    if (trimmedTitle.length > 500) {
      showToast({
        type: 'error',
        title: 'Validation error',
        body: 'Task title must not exceed 500 characters.',
      });
      return false;
    }

    const fullState = useAppStore.getState();
    const context = getPermissionContext(fullState);

    if (mode === 'create') {
      // Preflight create capability on destination list
      if (!canCreateTask(fullState.activeUserId, draft.primaryListId, context)) {
        showToast({
          type: 'error',
          title: 'Permission denied',
          body: 'You do not have permission to create tasks in this list.',
        });
        return false;
      }

      const result = createTask(draft.primaryListId, {
        title: trimmedTitle,
        description: draft.description,
        priority: draft.priority,
        statusId: draft.statusId,
        assigneeIds: draft.assigneeIds,
        dueDate: draft.dueDate,
      });

      if (!result.success) {
        showToast({
          type: 'error',
          title: "Couldn't create task",
          body: result.error.message,
        });
        return false;
      }

      showToast({
        type: 'success',
        title: 'Task created',
        body: `Created ${result.data.id}: "${result.data.title}"`,
      });

      setIsOpen(false);
      return true;
    } else {
      if (!taskId) return false;

      const currentTask = tasksById[taskId];
      if (!currentTask) {
        showToast({
          type: 'error',
          title: 'Task not found',
          body: `Task ${taskId} no longer exists.`,
        });
        return false;
      }

      const isCrossList = draft.primaryListId !== initialDraft.primaryListId;

      if (!isCrossList) {
        // === SAME-LIST EDIT: Single atomic store mutation ===
        if (!canEditTask(fullState.activeUserId, currentTask, context)) {
          showToast({
            type: 'error',
            title: 'Permission denied',
            body: 'You do not have permission to edit this task.',
          });
          return false;
        }

        const updateRes = updateTask(taskId, {
          title: trimmedTitle,
          description: draft.description,
          priority: draft.priority,
          statusId: draft.statusId,
          assigneeIds: draft.assigneeIds,
          dueDate: draft.dueDate,
        });

        if (!updateRes.success) {
          showToast({
            type: 'error',
            title: "Couldn't save changes",
            body: updateRes.error.message,
          });
          return false;
        }

        showToast({
          type: 'success',
          title: 'Changes saved',
          body: `Updated ${taskId}.`,
        });

        setInitialDraft({ ...draft });
        setIsOpen(false);
        return true;
      } else {
        // === CROSS-LIST EDIT: Preflight all failure points before first mutation ===
        if (!canEditTask(fullState.activeUserId, currentTask, context)) {
          showToast({
            type: 'error',
            title: 'Permission denied',
            body: 'You do not have permission to edit this task.',
          });
          return false;
        }

        if (!canMoveTask(fullState.activeUserId, currentTask, draft.primaryListId, context)) {
          showToast({
            type: 'error',
            title: 'Permission denied',
            body: 'You do not have permission to move tasks across these lists.',
          });
          return false;
        }

        const destList = fullState.containersById[draft.primaryListId];
        if (!destList || destList.type !== 'list' || destList.archived) {
          showToast({
            type: 'error',
            title: 'Invalid destination list',
            body: 'Destination list does not exist or is archived.',
          });
          return false;
        }

        if (!can(fullState.activeUserId, 'task.update', draft.primaryListId, context)) {
          showToast({
            type: 'error',
            title: 'Permission denied',
            body: 'You do not have permission to update tasks in the destination list.',
          });
          return false;
        }

        if (fullState.taskMutationInFlight) {
          showToast({
            type: 'error',
            title: 'Mutation in flight',
            body: 'Another task mutation is currently in flight.',
          });
          return false;
        }

        // Step 1: Relocate task via store (store owns resolveDestinationStatus, optional status target, and column reindexing)
        const moveRes = moveTaskToList(taskId, draft.primaryListId, draft.statusId);
        if (!moveRes.success) {
          showToast({
            type: 'error',
            title: "Couldn't move task to list",
            body: moveRes.error.message,
          });
          return false;
        }

        // Step 2: Apply metadata updates on relocated task
        const updateRes = updateTask(taskId, {
          title: trimmedTitle,
          description: draft.description,
          priority: draft.priority,
          assigneeIds: draft.assigneeIds,
          dueDate: draft.dueDate,
        });

        if (!updateRes.success) {
          showToast({
            type: 'error',
            title: "Couldn't save changes",
            body: updateRes.error.message,
          });
          return false;
        }

        showToast({
          type: 'success',
          title: 'Changes saved',
          body: `Moved and updated ${taskId}.`,
        });

        setInitialDraft({ ...draft });
        setIsOpen(false);
        return true;
      }
    }
  }, [
    mode,
    taskId,
    draft,
    initialDraft,
    tasksById,
    createTask,
    updateTask,
    moveTaskToList,
    showToast,
  ]);

  return {
    isOpen,
    mode,
    taskId,
    draft,
    isDirty,
    showDiscardModal,
    showDeleteModal,
    openCreate,
    openEdit,
    updateField,
    requestClose,
    confirmDiscard,
    cancelDiscard,
    requestDelete,
    cancelDelete,
    confirmDelete,
    save,
  };
}
