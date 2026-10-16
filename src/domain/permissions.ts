import { ContainerNode, Grant, Task, User } from './types';

/**
 * Checks whether a user has view permission for a container node.
 * Evaluation Order:
 * 1. Archive check: If the node or any ancestor is archived, returns false (even for admins).
 * 2. Admin bypass: If the user is an admin, returns true for all non-archived nodes.
 * 3. Member check: The user must have access to the target node AND all of its ancestors.
 *    For each node in the hierarchy chain:
 *    - An explicit 'deny' grant on that node blocks access immediately.
 *    - An explicit 'allow' grant on that node grants access to that node.
 *    - If no explicit grant exists, access is granted if the container is public (not isPrivate),
 *      or denied if the container is private.
 */
export function canViewNode(
  userId: string,
  targetNodeId: string,
  containersById: Record<string, ContainerNode>,
  grants: Grant[],
  usersById: Record<string, User>
): boolean {
  const user = usersById[userId];
  if (!user) return false;

  const targetNode = containersById[targetNodeId];
  if (!targetNode) return false;

  // Build path from target node up to root
  const path: ContainerNode[] = [];
  let current: ContainerNode | undefined = targetNode;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) {
      // Cycle detection fallback
      break;
    }
    visited.add(current.id);
    path.push(current);

    if (!current.parentId) {
      break;
    }
    current = containersById[current.parentId];
  }

  // 1. Archive check: if node or ANY ancestor is archived, inaccessible to all
  for (const node of path) {
    if (node.archived) {
      return false;
    }
  }

  // 2. Admin bypass for non-archived nodes
  if (user.role === 'admin') {
    return true;
  }

  // 3. Member evaluation: must have permission on target AND all ancestors
  // Grants are evaluated on specific containers only (no implicit inheritance of grants).
  // A container is visible if not denied, and either public or explicitly allowed.
  for (const node of path) {
    const nodeGrants = grants.filter(
      (g) => g.resourceId === node.id && g.userId === userId
    );

    const hasDeny = nodeGrants.some((g) => g.mode === 'deny');
    if (hasDeny) {
      return false;
    }

    const hasAllow = nodeGrants.some((g) => g.mode === 'allow');
    if (node.isPrivate) {
      if (!hasAllow) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks whether a user can edit tasks in a list.
 * In Flowboard, view access equals edit access for non-archived lists.
 */
export function canEditList(
  userId: string,
  listId: string,
  containersById: Record<string, ContainerNode>,
  grants: Grant[],
  usersById: Record<string, User>
): boolean {
  const list = containersById[listId];
  if (!list || list.type !== 'list' || list.archived) {
    return false;
  }

  return canViewNode(userId, listId, containersById, grants, usersById);
}

/**
 * Checks whether a user can edit a specific task.
 * Delegates to canEditList on the task's primary list.
 */
export function canEditTask(
  userId: string,
  task: Task,
  containersById: Record<string, ContainerNode>,
  grants: Grant[],
  usersById: Record<string, User>
): boolean {
  return canEditList(userId, task.primaryListId, containersById, grants, usersById);
}

/**
 * Checks whether a user has container management permissions (create, rename, archive, reorder).
 * In Flowboard, container management is strictly admin-only.
 */
export function canManageContainers(
  userId: string,
  usersById: Record<string, User>
): boolean {
  return usersById[userId]?.role === 'admin';
}
