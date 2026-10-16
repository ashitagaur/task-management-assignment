import { DEFAULT_ROLES } from './constants';
import {
  Capability,
  ContainerNode,
  PermissionContext,
  RoleDefinition,
  Task,
} from './types';

/**
 * Resolves all effective capabilities for a role, including inherited roles.
 * - Handles role inheritance
 * - Deduplicates capabilities
 * - Protects against inheritance cycles
 * - Safely handles missing/malformed roles
 */
export function getEffectiveCapabilities(
  roleId: string,
  roleDefinitions: Record<string, RoleDefinition> = DEFAULT_ROLES
): Set<Capability> {
  const capabilities = new Set<Capability>();
  if (!roleId || !roleDefinitions[roleId]) {
    return capabilities;
  }

  const visitedRoles = new Set<string>();
  const queue: string[] = [roleId];

  while (queue.length > 0) {
    const currentRoleId = queue.shift()!;
    if (visitedRoles.has(currentRoleId)) {
      continue;
    }
    visitedRoles.add(currentRoleId);

    const roleDef = roleDefinitions[currentRoleId];
    if (!roleDef) {
      continue;
    }

    if (Array.isArray(roleDef.capabilities)) {
      for (const cap of roleDef.capabilities) {
        capabilities.add(cap);
      }
    }

    if (Array.isArray(roleDef.inherits)) {
      for (const inheritedId of roleDef.inherits) {
        if (!visitedRoles.has(inheritedId)) {
          queue.push(inheritedId);
        }
      }
    }
  }

  return capabilities;
}

/**
 * Generic Policy Engine
 * Evaluates authorization according to deterministic 5-step precedence:
 * 1. ARCHIVE CHECK: Target or any ancestor archived -> DENY (unconditional, even for bypass)
 * 2. ROLE CAPABILITY: User must have the requested capability -> DENY if missing
 * 3. BYPASS: If user has 'permission.bypass' -> ALLOW without grant/privacy checks
 * 4. HIERARCHICAL GRANTS: Evaluate path from root to target. DENY anywhere -> DENY (DENY wins over ALLOW)
 * 5. PRIVATE/PUBLIC VISIBILITY:
 *    - Private resources require direct or inherited ALLOW
 *    - Public resources allowed unless blocked by DENY
 *    - Structural accessibility enforced across entire path
 *
 * Tree Integrity Safeguards (Fail Closed):
 * - Cycles in container hierarchy immediately FAIL CLOSED (return false).
 * - Broken ancestry chains (missing parent container) immediately FAIL CLOSED (return false).
 */
export function can(
  userId: string,
  capability: Capability,
  resourceId: string,
  context: PermissionContext
): boolean {
  const { containersById, grants, usersById, roleDefinitions = DEFAULT_ROLES } = context;

  const user = usersById[userId];
  if (!user) return false;

  const targetNode = containersById[resourceId];
  if (!targetNode) return false;

  // Build complete path from root to target container
  const path: ContainerNode[] = [];
  let current: ContainerNode | undefined = targetNode;
  const visitedNodes = new Set<string>();

  while (current) {
    // Fail closed on cycles
    if (visitedNodes.has(current.id)) {
      return false;
    }
    visitedNodes.add(current.id);
    path.unshift(current); // root at index 0, target at index length - 1

    if (!current.parentId) {
      break;
    }

    // Fail closed on broken parent reference
    const parent: ContainerNode | undefined = containersById[current.parentId];
    if (!parent) {
      return false;
    }
    current = parent;
  }

  // 1. ARCHIVE CHECK: Target or any ancestor archived -> DENIED unconditionally
  for (const node of path) {
    if (node.archived) {
      return false;
    }
  }

  // 2. EFFECTIVE ROLE CAPABILITIES: Must possess requested capability
  const effectiveCaps = getEffectiveCapabilities(user.role, roleDefinitions);
  if (!effectiveCaps.has(capability)) {
    return false;
  }

  // 3. BYPASS: Users with permission.bypass can perform any non-archived allowed capability
  if (effectiveCaps.has('permission.bypass')) {
    return true;
  }

  // 4. HIERARCHICAL GRANTS: DENY wins over ALLOW. Ancestor DENY blocks descendants.
  for (const node of path) {
    const hasDeny = grants.some(
      (g) => g.resourceId === node.id && g.userId === userId && g.mode === 'deny'
    );
    if (hasDeny) {
      return false;
    }
  }

  // 5. PRIVATE/PUBLIC VISIBILITY & STRUCTURAL ACCESSIBILITY
  let inheritedAllow = false;

  for (const node of path) {
    const hasDirectAllow = grants.some(
      (g) => g.resourceId === node.id && g.userId === userId && g.mode === 'allow'
    );
    if (hasDirectAllow) {
      inheritedAllow = true;
    }

    if (node.isPrivate) {
      if (!inheritedAllow) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Generic task helper.
 * Derives permission from task.primaryListId.
 * Delegates to can(userId, capability, task.primaryListId, context).
 */
export function canTask(
  userId: string,
  task: Task,
  capability: Capability,
  context: PermissionContext
): boolean {
  return can(userId, capability, task.primaryListId, context);
}

/**
 * Checks whether a user has view permission for a container node.
 * Delegates to can(userId, 'container.read', containerId, context).
 */
export function canViewNode(
  userId: string,
  containerId: string,
  context: PermissionContext
): boolean {
  return can(userId, 'container.read', containerId, context);
}

/**
 * Checks whether a user can create a task in a list.
 * Delegates to can(userId, 'task.create', listId, context).
 */
export function canCreateTask(
  userId: string,
  listId: string,
  context: PermissionContext
): boolean {
  return can(userId, 'task.create', listId, context);
}

/**
 * Checks whether a user can update a specific task.
 * Delegates to canTask(userId, task, 'task.update', context).
 */
export function canEditTask(
  userId: string,
  task: Task,
  context: PermissionContext
): boolean {
  return canTask(userId, task, 'task.update', context);
}

/**
 * Checks whether a user can delete a specific task.
 * Delegates to canTask(userId, task, 'task.delete', context).
 */
export function canDeleteTask(
  userId: string,
  task: Task,
  context: PermissionContext
): boolean {
  return canTask(userId, task, 'task.delete', context);
}

/**
 * Checks whether a user can move a task across lists.
 * Symmetrically requires task.move on BOTH the source and destination lists.
 */
export function canMoveTask(
  userId: string,
  task: Task,
  destinationListId: string,
  context: PermissionContext
): boolean {
  const canMoveFromSource = canTask(userId, task, 'task.move', context);
  const canMoveToDest = can(userId, 'task.move', destinationListId, context);
  return canMoveFromSource && canMoveToDest;
}

/**
 * Checks whether a user can create a container under parentId.
 * Delegates to can(userId, 'container.create', parentId, context).
 */
export function canCreateContainer(
  userId: string,
  parentId: string,
  context: PermissionContext
): boolean {
  return can(userId, 'container.create', parentId, context);
}

/**
 * Checks whether a user can rename a container.
 * Delegates to can(userId, 'container.rename', containerId, context).
 */
export function canRenameContainer(
  userId: string,
  containerId: string,
  context: PermissionContext
): boolean {
  return can(userId, 'container.rename', containerId, context);
}

/**
 * Checks whether a user can archive a container.
 * Delegates to can(userId, 'container.archive', containerId, context).
 */
export function canArchiveContainer(
  userId: string,
  containerId: string,
  context: PermissionContext
): boolean {
  return can(userId, 'container.archive', containerId, context);
}

/**
 * Checks whether a user can reorder a container.
 * Delegates to can(userId, 'container.reorder', containerId, context).
 */
export function canReorderContainer(
  userId: string,
  containerId: string,
  context: PermissionContext
): boolean {
  return can(userId, 'container.reorder', containerId, context);
}
