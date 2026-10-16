import { useState, useCallback, useEffect } from 'react';

export interface UseBulkSelectionReturn {
  selectedTaskIds: Set<string>;
  isSelected: (taskId: string) => boolean;
  toggle: (taskId: string) => void;
  selectAllVisible: (visibleTaskIds: string[]) => void;
  clear: () => void;
  selectionCount: number;
}

/**
 * Hook to manage transient selection of tasks in Dense List View.
 * Automatically clears when listId or activeUserId changes.
 */
export function useBulkSelection(listId: string): UseBulkSelectionReturn {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Automatically reset selection whenever active list changes
  useEffect(() => {
    setSelectedTaskIds(new Set());
  }, [listId]);

  const isSelected = useCallback(
    (taskId: string) => selectedTaskIds.has(taskId),
    [selectedTaskIds]
  );

  const toggle = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const selectAllVisible = useCallback((visibleTaskIds: string[]) => {
    setSelectedTaskIds((prev) => {
      const allSelected = visibleTaskIds.every((id) => prev.has(id));
      if (allSelected) {
        // Deselect all currently visible
        const next = new Set(prev);
        for (const id of visibleTaskIds) {
          next.delete(id);
        }
        return next;
      } else {
        // Select all visible
        const next = new Set(prev);
        for (const id of visibleTaskIds) {
          next.add(id);
        }
        return next;
      }
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  return {
    selectedTaskIds,
    isSelected,
    toggle,
    selectAllVisible,
    clear,
    selectionCount: selectedTaskIds.size,
  };
}
