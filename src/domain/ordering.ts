import { PRIORITY_ORDER } from './constants';
import { Task } from './types';

/**
 * Reindexes an array of items to have contiguous 0..n-1 positions,
 * matching their array sequence.
 */
export function reindexPositions<T extends { position: number }>(items: T[]): T[] {
  return items.map((item, index) => {
    if (item.position === index) return item;
    return {
      ...item,
      position: index,
    };
  });
}

/**
 * Deterministic sort comparator for tasks by priority.
 * Default desc: urgent -> high -> normal -> low -> none.
 * Stable tie-breaker: position, then id.
 */
export function sortTasksByPriority(
  tasks: Task[],
  dir: 'asc' | 'desc' = 'desc'
): Task[] {
  return [...tasks].sort((a, b) => {
    const scoreA = PRIORITY_ORDER[a.priority];
    const scoreB = PRIORITY_ORDER[b.priority];

    if (scoreA !== scoreB) {
      return dir === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    }

    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return a.id.localeCompare(b.id);
  });
}

/**
 * Deterministic sort comparator for tasks by due date.
 * Default asc: earliest date first, tasks without due dates at the end.
 * Stable tie-breaker: position, then id.
 */
export function sortTasksByDueDate(
  tasks: Task[],
  dir: 'asc' | 'desc' = 'asc'
): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.dueDate === null && b.dueDate === null) {
      if (a.position !== b.position) return a.position - b.position;
      return a.id.localeCompare(b.id);
    }
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;

    const timeA = new Date(a.dueDate).getTime();
    const timeB = new Date(b.dueDate).getTime();

    if (timeA !== timeB) {
      return dir === 'asc' ? timeA - timeB : timeB - timeA;
    }

    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return a.id.localeCompare(b.id);
  });
}
