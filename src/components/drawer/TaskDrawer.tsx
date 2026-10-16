import React, { useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Check,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { TaskPriority } from '../../domain/types';
import {
  canViewNode,
  canCreateTask,
  canEditTask,
  canDeleteTask,
  canMoveTask,
} from '../../domain/permissions';
import { useAppStore, getPermissionContext } from '../../store/store';
import { Avatar } from '../shared/Avatar';
import { StatusPill } from '../shared/StatusPill';
import { DrawerDraft } from '../../hooks/useDrawer';
import { ConfirmDialog } from './ConfirmDialog';

export interface TaskDrawerProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  taskId: string | null;
  draft: DrawerDraft;
  isDirty: boolean;
  showDiscardModal: boolean;
  showDeleteModal: boolean;
  onUpdateField: <K extends keyof DrawerDraft>(field: K, value: DrawerDraft[K]) => void;
  onRequestClose: () => void;
  onConfirmDiscard: () => void;
  onCancelDiscard: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onSave: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  mode,
  taskId,
  draft,
  isDirty,
  showDiscardModal,
  showDeleteModal,
  onUpdateField,
  onRequestClose,
  onConfirmDiscard,
  onCancelDiscard,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onSave,
}) => {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const fullState = useAppStore((state) => state);
  const activeUserId = useAppStore((state) => state.activeUserId);
  const usersById = useAppStore((state) => state.usersById);
  const statusesById = useAppStore((state) => state.statusesById);
  const containersById = useAppStore((state) => state.containersById);
  const tasksById = useAppStore((state) => state.tasksById);
  const activityByTaskId = useAppStore((state) => state.activityByTaskId);
  const taskMutationInFlight = useAppStore((state) => state.taskMutationInFlight);

  const context = getPermissionContext(fullState);
  const currentTask = taskId ? tasksById[taskId] : undefined;

  // Capability checks
  const canDelete =
    mode === 'edit' && currentTask
      ? canDeleteTask(activeUserId, currentTask, context)
      : false;

  const canEdit =
    mode === 'edit' && currentTask
      ? canEditTask(activeUserId, currentTask, context)
      : true;

  const canCreate =
    mode === 'create'
      ? canCreateTask(activeUserId, draft.primaryListId, context)
      : true;

  const isReadOnly = mode === 'edit' ? !canEdit : !canCreate;

  // List eligibility rules:
  // Create mode: Destination list must be visible and user must have task.create capability
  // Edit mode: Current list is preserved; other lists require symmetric canMoveTask permissions
  const accessibleLists = Object.values(containersById).filter((c) => {
    if (c.type !== 'list' || c.archived) return false;
    if (!canViewNode(activeUserId, c.id, context)) return false;
    if (mode === 'create') {
      return canCreateTask(activeUserId, c.id, context);
    }
    // Edit mode
    if (currentTask && c.id === currentTask.primaryListId) return true;
    if (currentTask) {
      return canMoveTask(activeUserId, currentTask, c.id, context);
    }
    return false;
  });

  // Available statuses for currently selected list in draft
  const availableStatuses = Object.values(statusesById)
    .filter((s) => s.listId === draft.primaryListId)
    .sort((a, b) => a.position - b.position);

  const currentStatus = statusesById[draft.statusId] || availableStatuses[0];

  // Activities for this task (100% static read-only presentation)
  const activities = (taskId && activityByTaskId[taskId]) || [];

  // Focus management: store previous active element, lock body scroll, and restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (isReadOnly || !titleInputRef.current || titleInputRef.current.disabled) {
          closeButtonRef.current?.focus();
        } else {
          titleInputRef.current?.focus();
        }
      }, 50);
    } else {
      document.body.style.overflow = '';
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isReadOnly]);

  // Focus trap & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // When a confirmation modal is active, suspend drawer keyboard listeners
      if (showDiscardModal || showDeleteModal) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onRequestClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showDiscardModal, showDeleteModal, onRequestClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onRequestClose}
        className="fixed inset-0 z-drawer-backdrop bg-black/30 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel (Figma Node 1:501, width 488px) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Create new task' : `Edit task ${taskId}`}
        ref={drawerRef}
        className="fixed top-0 right-0 z-drawer h-full w-full sm:w-[488px] bg-white border-l border-fb-border shadow-fb-drawer flex flex-col animate-in slide-in-from-right duration-250 ease-out"
      >
        {/* Drawer Header (Figma Screenshot 5) */}
        <div className="h-16 min-h-[64px] px-6 border-b border-fb-border flex items-center justify-between gap-4 shrink-0 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            {mode === 'edit' ? (
              <>
                <span className="text-xs font-semibold text-fb-text-muted">
                  {taskId}
                </span>
                {currentStatus && <StatusPill status={currentStatus} size="sm" />}
              </>
            ) : (
              <span className="text-sm font-bold text-fb-text-primary">
                New Task
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Saved / Unsaved status indicator */}
            {mode === 'edit' && (
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border select-none ${
                  isDirty
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
                title={isDirty ? 'Unsaved changes' : 'All changes saved'}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDirty ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  aria-hidden="true"
                />
                <span>{isDirty ? 'Unsaved' : 'Saved'}</span>
              </div>
            )}

            {/* Delete button (Edit mode only, capability-guarded) */}
            {mode === 'edit' && canDelete && (
              <button
                type="button"
                onClick={onRequestDelete}
                disabled={taskMutationInFlight}
                aria-label="Delete task"
                title="Delete task"
                className="p-1.5 rounded-lg text-fb-text-muted hover:text-fb-danger hover:bg-fb-danger-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-danger cursor-pointer"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={onRequestClose}
              aria-label="Close task drawer"
              className="p-1.5 rounded-lg text-fb-text-muted hover:text-fb-text-primary hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Read-only feedback banner if user lacks edit/create capabilities */}
          {isReadOnly && (
            <div
              role="status"
              className="px-3.5 py-2 rounded-xl bg-gray-50 border border-fb-border flex items-center gap-2.5 text-xs text-fb-text-secondary select-none"
            >
              <Lock className="w-3.5 h-3.5 text-fb-text-muted shrink-0" aria-hidden="true" />
              <span>
                {mode === 'edit'
                  ? 'You have view-only access to this task based on your permissions.'
                  : 'You do not have permission to create tasks in this list.'}
              </span>
            </div>
          )}

          {/* 1. Title Input */}
          <div>
            <label htmlFor="task-drawer-title" className="sr-only">
              Task title
            </label>
            <input
              id="task-drawer-title"
              ref={titleInputRef}
              type="text"
              disabled={isReadOnly}
              placeholder="Task title..."
              value={draft.title}
              onChange={(e) => onUpdateField('title', e.target.value)}
              className={`w-full text-xl font-bold text-fb-text-primary placeholder:text-fb-text-subtle border-0 border-b border-transparent pb-1 transition-colors ${
                isReadOnly
                  ? 'cursor-not-allowed bg-transparent'
                  : 'hover:border-gray-200 focus:border-fb-primary focus:outline-none'
              }`}
            />
          </div>

          {/* 2. PROPERTIES SECTION (Figma Screenshot 5) */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-bold text-fb-text-muted uppercase tracking-wider">
              Properties
            </h4>

            <div className="space-y-2.5 text-xs">
              {/* Status Row */}
              <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                <span className="text-fb-text-secondary font-medium">Status</span>
                <div className="relative">
                  <select
                    id="task-drawer-status"
                    aria-label="Task status"
                    disabled={isReadOnly}
                    value={draft.statusId}
                    onChange={(e) => onUpdateField('statusId', e.target.value)}
                    className="w-full appearance-none px-3 py-1.5 rounded-lg border border-fb-border bg-white text-fb-text-primary font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary cursor-pointer pr-8 disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    {availableStatuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="w-3.5 h-3.5 text-fb-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Priority Row */}
              <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                <span className="text-fb-text-secondary font-medium">Priority</span>
                <div className="relative">
                  <select
                    id="task-drawer-priority"
                    aria-label="Task priority"
                    disabled={isReadOnly}
                    value={draft.priority}
                    onChange={(e) =>
                      onUpdateField('priority', e.target.value as TaskPriority)
                    }
                    className="w-full appearance-none px-3 py-1.5 rounded-lg border border-fb-border bg-white text-fb-text-primary font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary cursor-pointer pr-8 disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                    <option value="none">None</option>
                  </select>
                  <ChevronDown
                    className="w-3.5 h-3.5 text-fb-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Assignees Row */}
              <div className="grid grid-cols-[110px_1fr] items-start gap-2 pt-1">
                <span className="text-fb-text-secondary font-medium pt-1">Assignees</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(usersById).map((u) => {
                    const isSelected = draft.assigneeIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          const next = isSelected
                            ? draft.assigneeIds.filter((id) => id !== u.id)
                            : [...draft.assigneeIds, u.id];
                          onUpdateField('assigneeIds', next);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-fb-primary-soft text-fb-primary border-fb-primary/30'
                            : 'bg-white text-fb-text-secondary border-fb-border hover:bg-gray-50'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <Avatar initials={u.initials} name={u.name} size="xs" />
                        <span>{u.name.split(' ')[0]}</span>
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due Date Row */}
              <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                <span className="text-fb-text-secondary font-medium">Due date</span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="task-drawer-due-date"
                      type="date"
                      aria-label="Due date"
                      disabled={isReadOnly}
                      value={draft.dueDate || ''}
                      onChange={(e) =>
                        onUpdateField('dueDate', e.target.value ? e.target.value : null)
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-fb-border bg-white text-fb-text-primary text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary disabled:cursor-not-allowed disabled:bg-gray-50"
                    />
                  </div>
                  {draft.dueDate && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onUpdateField('dueDate', null)}
                      className="text-xs text-fb-text-muted hover:text-fb-text-primary px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Target List Row (Cross-list Move) */}
              <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                <span className="text-fb-text-secondary font-medium">List</span>
                <div className="relative">
                  <select
                    id="task-drawer-list"
                    aria-label="Target list"
                    disabled={isReadOnly || accessibleLists.length <= 1}
                    value={draft.primaryListId}
                    onChange={(e) => onUpdateField('primaryListId', e.target.value)}
                    className="w-full appearance-none px-3 py-1.5 rounded-lg border border-fb-border bg-white text-fb-text-primary font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary cursor-pointer pr-8 disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    {accessibleLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="w-3.5 h-3.5 text-fb-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. DESCRIPTION SECTION */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-fb-text-muted uppercase tracking-wider">
              Description
            </h4>
            <textarea
              id="task-drawer-description"
              rows={5}
              disabled={isReadOnly}
              placeholder="Add implementation notes, context, or acceptance criteria..."
              value={draft.description}
              onChange={(e) => onUpdateField('description', e.target.value)}
              className="w-full p-3 rounded-xl border border-fb-border bg-white text-fb-text-primary placeholder:text-fb-text-subtle text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary resize-y disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>

          {/* 4. ACTIVITY SECTION (Figma Screenshot 5 & Node 1:551) */}
          {mode === 'edit' && (
            <div className="space-y-3 pt-2">
              <h4 className="text-[11px] font-bold text-fb-text-muted uppercase tracking-wider">
                Activity
              </h4>

              {activities.length > 0 ? (
                <div className="space-y-3 border-l-2 border-gray-100 ml-2 pl-4">
                  {activities.map((act) => {
                    const user = usersById[act.userId];
                    return (
                      <div key={act.id} className="relative flex items-start gap-3 text-xs">
                        {user ? (
                          <Avatar
                            initials={user.initials}
                            name={user.name}
                            size="xs"
                            className="shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-fb-text-primary leading-tight">
                            <span className="font-semibold">
                              {user ? user.name : 'Unknown user'}{' '}
                            </span>
                            <span className="text-fb-text-secondary">{act.text}</span>
                          </p>
                          <span className="text-[10px] text-fb-text-muted mt-0.5 inline-block">
                            {act.relativeTime}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-fb-text-muted italic">
                  No activity history recorded for this task yet.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 px-6 border-t border-fb-border bg-gray-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onRequestClose}
            className="px-4 py-2 rounded-lg border border-fb-border bg-white hover:bg-gray-100 text-xs font-semibold text-fb-text-secondary hover:text-fb-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={
              isReadOnly ||
              taskMutationInFlight ||
              !draft.title.trim() ||
              (mode === 'edit' && !isDirty)
            }
            className={`px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-fb-button transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary focus-visible:ring-offset-2 ${
              isReadOnly ||
              taskMutationInFlight ||
              !draft.title.trim() ||
              (mode === 'edit' && !isDirty)
                ? 'opacity-60 cursor-not-allowed bg-fb-primary/70'
                : 'bg-fb-primary hover:bg-fb-primary/90 cursor-pointer'
            }`}
          >
            {mode === 'create' ? 'Create task' : 'Save changes'}
          </button>
        </div>
      </aside>

      {/* Discard Changes Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDiscardModal}
        title="Discard unsaved changes?"
        message="You have unsaved edits to this task. Closing without saving will discard your changes."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        isDestructive={false}
        onConfirm={onConfirmDiscard}
        onCancel={onCancelDiscard}
      />

      {/* Delete Task Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title={`Delete task ${taskId}?`}
        message={`Are you sure you want to permanently delete "${draft.title}"? This action cannot be undone.`}
        confirmLabel="Delete task"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </>
  );
};
