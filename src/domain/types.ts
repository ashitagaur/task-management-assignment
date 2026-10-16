export type ContainerType = 'workspace' | 'space' | 'folder' | 'list';

export interface ContainerNode {
  id: string;
  name: string;
  type: ContainerType;
  parentId: string | null;
  position: number;
  isPrivate?: boolean;
  archived?: boolean;
}

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low' | 'none';

export interface Task {
  id: string;
  title: string;
  description: string;
  primaryListId: string;
  statusId: string;
  priority: TaskPriority;
  assigneeIds: string[];
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type StatusCategory = 'todo' | 'in_progress' | 'done';

export type StatusColor = 'gray' | 'blue' | 'purple' | 'green' | 'amber';

export interface TaskStatus {
  id: string;
  name: string;
  category: StatusCategory;
  color: StatusColor;
  position: number;
  listId: string;
}

export type Capability =
  | 'container.read'
  | 'container.create'
  | 'container.rename'
  | 'container.archive'
  | 'container.reorder'
  | 'task.read'
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'task.move'
  | 'permission.bypass';

export interface RoleDefinition {
  id: string;
  name: string;
  inherits?: string[];
  capabilities: Capability[];
}

export type UserRole = 'admin' | 'member' | string;

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  initials: string;
  email: string;
}

export type GrantMode = 'allow' | 'deny';

export interface Grant {
  resourceId: string;
  userId: string;
  mode: GrantMode;
}

export interface PermissionContext {
  containersById: Record<string, ContainerNode>;
  grants: Grant[];
  usersById: Record<string, User>;
  roleDefinitions?: Record<string, RoleDefinition>;
}

export interface StaticActivityEntry {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  relativeTime: string;
  createdAt: string;
}

export type AppErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'INVALID_PARENTAGE'
  | 'INVARIANT_VIOLATION'
  | 'MUTATION_IN_FLIGHT'
  | 'SIMULATED_FAILURE';

export interface AppError {
  code: AppErrorCode;
  message: string;
  details?: unknown;
}

export type AppResult<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

export function success<T>(data: T): AppResult<T> {
  return { success: true, data };
}

export function failure<T = never>(
  code: AppErrorCode,
  message: string,
  details?: unknown
): AppResult<T> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

export interface PositionSnapshot {
  taskId: string;
  position: number;
}

export interface TaskMoveTransactionSnapshot {
  movedTaskId: string;
  movedTaskStatusBefore: string;
  movedTaskPositionBefore: number;
  movedTaskUpdatedAtBefore: string;
  sourceSiblingPositionsBefore: PositionSnapshot[];
  destinationSiblingPositionsBefore: PositionSnapshot[];
}
