import { TaskStatus } from './types';

/**
 * Resolves the appropriate destination status when a task is moved to a different list.
 * 1. Finds destination statuses matching the source status's category.
 * 2. If matching statuses exist, chooses the one with the lowest position.
 * 3. Fallback: lowest-position 'todo' status in the destination list.
 * 4. Final fallback: lowest-position status of any category in the destination list.
 */
export function resolveDestinationStatus(
  sourceStatus: TaskStatus,
  destStatuses: TaskStatus[]
): TaskStatus {
  if (destStatuses.length === 0) {
    throw new Error('Destination list has no configured statuses');
  }

  const sortedDest = [...destStatuses].sort((a, b) => a.position - b.position);

  // 1. Same category match
  const sameCategory = sortedDest.filter((s) => s.category === sourceStatus.category);
  if (sameCategory.length > 0 && sameCategory[0]) {
    return sameCategory[0];
  }

  // 2. 'todo' category fallback
  const todoCategory = sortedDest.filter((s) => s.category === 'todo');
  if (todoCategory.length > 0 && todoCategory[0]) {
    return todoCategory[0];
  }

  // 3. Lowest position fallback
  return sortedDest[0]!;
}
