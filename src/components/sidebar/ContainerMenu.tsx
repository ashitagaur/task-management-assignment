import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Plus, Edit2, ArrowUp, ArrowDown, Archive } from 'lucide-react';
import { ContainerNode, ContainerType } from '../../domain/types';
import { VALID_PARENT_TYPES } from '../../domain/constants';
import { useAppStore, getPermissionContext } from '../../store/store';
import {
  canCreateContainer,
  canRenameContainer,
  canArchiveContainer,
  canReorderContainer,
} from '../../domain/permissions';

export interface ContainerMenuProps {
  node: ContainerNode;
  onOpenCreateModal: (childType: ContainerType) => void;
  onOpenRenameModal: () => void;
  isFirstSibling?: boolean;
  isLastSibling?: boolean;
}

/**
 * Returns the strictly valid child container type permitted for a parent container type
 * derived directly from the authoritative domain VALID_PARENT_TYPES mapping:
 * - workspace -> space
 * - space     -> folder
 * - folder    -> list
 * - list      -> null (no children allowed)
 */
export function getValidChildType(parentType: ContainerType): ContainerType | null {
  for (const [child, parent] of Object.entries(VALID_PARENT_TYPES)) {
    if (parent === parentType) {
      return child as ContainerType;
    }
  }
  return null;
}

export const ContainerMenu: React.FC<ContainerMenuProps> = ({
  node,
  onOpenCreateModal,
  onOpenRenameModal,
  isFirstSibling = false,
  isLastSibling = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fullState = useAppStore((state) => state);
  const activeUserId = useAppStore((state) => state.activeUserId);
  const moveContainerUp = useAppStore((state) => state.moveContainerUp);
  const moveContainerDown = useAppStore((state) => state.moveContainerDown);
  const archiveContainer = useAppStore((state) => state.archiveContainer);

  const context = getPermissionContext(fullState);

  // Check capabilities
  const canCreate = canCreateContainer(activeUserId, node.id, context);
  const canRename = canRenameContainer(activeUserId, node.id, context);
  const canArchive = canArchiveContainer(activeUserId, node.id, context);
  const canReorder = canReorderContainer(activeUserId, node.id, context);

  // If user has zero container management capabilities on this node, hide menu completely
  const hasAnyCapability = canCreate || canRename || canArchive || canReorder;

  // Authoritative child type derived from VALID_PARENT_TYPES
  const childType = getValidChildType(node.type);

  // Robust collision-aware positioning based on viewport space
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 176; // w-44
    const menuHeight = menuRef.current ? menuRef.current.offsetHeight : 180;
    const padding = 4;

    // Align right edge of menu to right edge of button
    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    // Vertical positioning: Prefer opening downwards
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: number;
    if (spaceBelow >= menuHeight + padding || spaceBelow >= spaceAbove) {
      // Enough space below -> open downwards
      top = rect.bottom + padding;
    } else {
      // Not enough space below and more space above -> flip upwards
      top = rect.top - menuHeight - padding;
    }

    // Keep completely within viewport bounds
    top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));

    setMenuPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  if (!hasAnyCapability) {
    return null;
  }

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-controls={isOpen ? `container-menu-${node.id}` : undefined}
        aria-label={`Options for ${node.name}`}
        className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fb-primary"
      >
        <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {isOpen &&
        menuPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            id={`container-menu-${node.id}`}
            aria-label={`Actions for ${node.name}`}
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 100,
            }}
            className="w-44 rounded-xl bg-fb-sidebar border border-gray-700 shadow-2xl py-1 text-xs text-gray-200 select-none animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {canCreate && childType && (
              <button
                type="button"
                onClick={() => handleAction(() => onOpenCreateModal(childType))}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-800 text-gray-200 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fb-primary"
              >
                <Plus className="w-3.5 h-3.5 text-fb-primary" />
                <span>Add {childType.charAt(0).toUpperCase() + childType.slice(1)}</span>
              </button>
            )}

            {canRename && (
              <button
                type="button"
                onClick={() => handleAction(onOpenRenameModal)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-800 text-gray-200 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fb-primary"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Rename</span>
              </button>
            )}

            {canReorder && (
              <>
                <button
                  type="button"
                  disabled={isFirstSibling}
                  onClick={() => handleAction(() => moveContainerUp(node.id))}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fb-primary ${isFirstSibling
                      ? 'opacity-40 cursor-not-allowed text-gray-500'
                      : 'hover:bg-gray-800 text-gray-200 hover:text-white'
                    }`}
                >
                  <ArrowUp className="w-3.5 h-3.5 text-gray-400" />
                  <span>Move Up</span>
                </button>

                <button
                  type="button"
                  disabled={isLastSibling}
                  onClick={() => handleAction(() => moveContainerDown(node.id))}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fb-primary ${isLastSibling
                      ? 'opacity-40 cursor-not-allowed text-gray-500'
                      : 'hover:bg-gray-800 text-gray-200 hover:text-white'
                    }`}
                >
                  <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
                  <span>Move Down</span>
                </button>
              </>
            )}

            {canArchive && (
              <div className="border-t border-gray-800 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleAction(() => archiveContainer(node.id))}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-fb-danger hover:bg-fb-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fb-primary"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
