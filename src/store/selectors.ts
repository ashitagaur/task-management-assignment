import { ContainerNode, ContainerType, Task, TaskStatus } from '../domain/types';
import { canViewNode } from '../domain/permissions';
import { sortTasksByDueDate, sortTasksByPriority } from '../domain/ordering';
import { getPermissionContext, AppStoreState } from './store';

/**
 * Returns all container nodes visible to the active user,
 * structurally filtered by permissions and excluding archived nodes.
 */
export function getFilteredTree(state: AppStoreState): ContainerNode[] {
  const context = getPermissionContext(state);

  return Object.values(state.containersById).filter((node) => {
    if (node.archived) return false;
    return canViewNode(state.activeUserId, node.id, context);
  });
}

/**
 * Returns all statuses for a given list, sorted ascending by position.
 */
export function getListStatuses(state: AppStoreState, listId: string): TaskStatus[] {
  return Object.values(state.statusesById)
    .filter((status) => status.listId === listId)
    .sort((a, b) => a.position - b.position);
}

export interface KanbanColumnProjection {
  status: TaskStatus;
  tasks: Task[];
}

/**
 * Returns the Kanban board projection for a list:
 * An array of columns (one per status), with tasks sorted by position within each column.
 */
export function getKanbanColumns(
  state: AppStoreState,
  listId: string
): KanbanColumnProjection[] {
  const statuses = getListStatuses(state, listId);
  const tasksInList = Object.values(state.tasksById).filter(
    (task) => task.primaryListId === listId
  );

  return statuses.map((status) => {
    const tasksInColumn = tasksInList
      .filter((task) => task.statusId === status.id)
      .sort((a, b) => a.position - b.position);

    return {
      status,
      tasks: tasksInColumn,
    };
  });
}

/**
 * Returns all tasks for a list, sorted deterministically by priority, due date,
 * or default position.
 */
export function getSortedTasks(
  state: AppStoreState,
  listId: string,
  sortKey: 'priority' | 'dueDate' | null,
  sortDir: 'asc' | 'desc' = 'asc'
): Task[] {
  const tasks = Object.values(state.tasksById).filter(
    (task) => task.primaryListId === listId
  );

  if (sortKey === 'priority') {
    return sortTasksByPriority(tasks, sortDir);
  }

  if (sortKey === 'dueDate') {
    return sortTasksByDueDate(tasks, sortDir);
  }

  // Default sort by position with tie-breaking
  return [...tasks].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Returns the ancestor breadcrumb chain from root Workspace down to the target List.
 */
export function getBreadcrumbs(
  state: AppStoreState,
  listId: string
): Array<{ id: string; name: string; type: ContainerType }> {
  const crumbs: Array<{ id: string; name: string; type: ContainerType }> = [];
  let current: ContainerNode | undefined = state.containersById[listId];
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    crumbs.unshift({
      id: current.id,
      name: current.name,
      type: current.type,
    });
    if (!current.parentId) break;
    current = state.containersById[current.parentId];
  }

  return crumbs;
}

/**
 * Returns the count of tasks inside a list.
 */
export function getTaskCount(state: AppStoreState, listId: string): number {
  return Object.values(state.tasksById).filter((task) => task.primaryListId === listId)
    .length;
}

/**
 * Returns all lists that are visible to the active user (useful for route fallback).
 */
export function getVisibleLists(state: AppStoreState): ContainerNode[] {
  const filtered = getFilteredTree(state);
  return filtered.filter((node) => node.type === 'list');
}
