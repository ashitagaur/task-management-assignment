import { ContainerNode, ContainerType, Task, TaskStatus } from '../domain/types';
import { canViewNode } from '../domain/permissions';
import { sortTasksByDueDate, sortTasksByPriority } from '../domain/ordering';
import { getPermissionContext, AppStoreState } from './store';

/**
 * Returns all container nodes visible to the active user in canonical hierarchy order
 * (depth-first pre-order traversal with siblings sorted ascending by position),
 * structurally filtered by permissions and excluding archived nodes.
 */
export function getFilteredTree(state: AppStoreState): ContainerNode[] {
  const context = getPermissionContext(state);
  const containers = Object.values(state.containersById);

  // Group children by parentId
  const childrenByParent = new Map<string | null, ContainerNode[]>();
  for (const node of containers) {
    if (node.archived) continue;
    const list = childrenByParent.get(node.parentId) || [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }

  // Sort sibling nodes by position, tie-breaking by id
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.id.localeCompare(b.id);
    });
  }

  // Depth-first canonical traversal from root nodes
  const result: ContainerNode[] = [];
  const visited = new Set<string>();

  function traverse(parentId: string | null) {
    const children = childrenByParent.get(parentId) || [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);

      if (canViewNode(state.activeUserId, child.id, context)) {
        result.push(child);
        traverse(child.id);
      }
    }
  }

  traverse(null);
  return result;
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
