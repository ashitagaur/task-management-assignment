import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Hash, GripVertical } from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContainerNode, ContainerType } from '../../domain/types';
import { useAppStore, getPermissionContext } from '../../store/store';
import { canReorderContainer } from '../../domain/permissions';
import { getTaskCount } from '../../store/selectors';
import { ContainerMenu } from './ContainerMenu';

export interface TreeNodeProps {
  node: ContainerNode;
  childrenNodes: ContainerNode[];
  childrenByParent: Map<string | null, ContainerNode[]>;
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  onOpenCreateModal: (parent: ContainerNode, childType: ContainerType) => void;
  onOpenRenameModal: (node: ContainerNode) => void;
  isFirstSibling?: boolean;
  isLastSibling?: boolean;
  level?: number;
  isCollapsed?: boolean;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  childrenNodes,
  childrenByParent,
  activeListId,
  onSelectList,
  onOpenCreateModal,
  onOpenRenameModal,
  isFirstSibling = false,
  isLastSibling = false,
  level = 0,
  isCollapsed = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const fullState = useAppStore((state) => state);

  const isList = node.type === 'list';
  const isActive = isList && node.id === activeListId;
  const hasChildren = childrenNodes.length > 0;
  const taskCount = isList ? getTaskCount(fullState, node.id) : 0;

  const activeUserId = useAppStore((state) => state.activeUserId);
  const context = useAppStore(getPermissionContext);
  const canReorder = canReorderContainer(activeUserId, node.id, context);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    disabled: !canReorder || isCollapsed,
    data: {
      type: node.type,
      parentId: node.parentId,
      node,
    },
  });

  const style: React.CSSProperties = {
    // DND-EXCEPTION: inline styles required for @dnd-kit transform and transition
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  };

  // Collapsed Sidebar Compact Rail Mode
  if (isCollapsed) {
    if (isList) {
      return (
        <div className="py-0.5 flex justify-center">
          <button
            type="button"
            onClick={() => onSelectList(node.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`List ${node.name}, ${taskCount} tasks`}
            title={`${node.name} (${taskCount} tasks)`}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${
              isActive
                ? 'bg-fb-primary text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Hash className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="py-0.5 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-label={`${node.type} ${node.name}`}
          title={`${node.name} (${node.type})`}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
        >
          {node.type === 'space' ? (
            <span className="text-xs font-bold text-gray-400">{node.name.charAt(0)}</span>
          ) : isExpanded ? (
            <FolderOpen className="w-4 h-4 text-amber-400/90" />
          ) : (
            <Folder className="w-4 h-4 text-amber-400/90" />
          )}
        </button>

        {isExpanded && hasChildren && (
          <div className="w-full space-y-0.5 mt-0.5">
            {childrenNodes.map((child, idx) => (
              <TreeNode
                key={child.id}
                node={child}
                childrenNodes={childrenByParent.get(child.id) || []}
                childrenByParent={childrenByParent}
                activeListId={activeListId}
                onSelectList={onSelectList}
                onOpenCreateModal={onOpenCreateModal}
                onOpenRenameModal={onOpenRenameModal}
                isFirstSibling={idx === 0}
                isLastSibling={idx === childrenNodes.length - 1}
                level={level + 1}
                isCollapsed
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const paddingLeftClass =
    level === 0 ? 'pl-2' : level === 1 ? 'pl-5' : 'pl-8';

  return (
    <div className="select-none">
      {/* Node Row Container */}
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative flex items-center justify-between rounded-lg transition-colors ${
          isActive
            ? 'bg-fb-sidebar-active'
            : 'hover:bg-gray-800/50'
        }`}
        {...attributes}
        {...listeners}
      >
        {/* Semantic Action: Expand/Collapse button for containers OR Navigation button for lists */}
        {!isList ? (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={`container-children-${node.id}`}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.type} ${node.name}`}
            className={`flex-1 flex items-center gap-1.5 py-1.5 min-w-0 text-left rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${paddingLeftClass} ${
              isActive ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            {canReorder && !isCollapsed && (
              <span
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity -ml-1 text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
                title="Drag to reorder"
                aria-hidden="true"
              >
                <GripVertical className="w-3 h-3" />
              </span>
            )}

            <span className="p-0.5 rounded text-gray-400 group-hover:text-white shrink-0" aria-hidden="true">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>

            {node.type !== 'space' && (
              <span className="shrink-0 text-gray-400 group-hover:text-gray-300" aria-hidden="true">
                {isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400/80" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-amber-400/80" />
                )}
              </span>
            )}

            <span className="truncate text-xs">{node.name}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectList(node.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`List ${node.name}, ${taskCount} tasks`}
            className={`flex-1 flex items-center gap-1.5 py-1.5 min-w-0 text-left rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${paddingLeftClass} ${
              isActive ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            {canReorder && !isCollapsed && (
              <span
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity -ml-1 text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
                title="Drag to reorder"
                aria-hidden="true"
              >
                <GripVertical className="w-3 h-3" />
              </span>
            )}

            <span className="w-3.5 flex items-center justify-center shrink-0" aria-hidden="true">
              <Hash className="w-3 h-3 text-gray-500" />
            </span>

            <span className="truncate text-xs">{node.name}</span>
          </button>
        )}

        {/* Right side controls: Task count badge & ContainerMenu */}
        <div className="flex items-center gap-1 shrink-0 pr-1.5">
          {isList && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                isActive
                  ? 'bg-fb-primary/30 text-white'
                  : 'text-gray-400 group-hover:text-gray-300'
              }`}
            >
              {taskCount}
            </span>
          )}

          <div
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ContainerMenu
              node={node}
              onOpenCreateModal={(childType) => onOpenCreateModal(node, childType)}
              onOpenRenameModal={() => onOpenRenameModal(node)}
              isFirstSibling={isFirstSibling}
              isLastSibling={isLastSibling}
            />
          </div>
        </div>
      </div>

      {/* Child Nodes */}
      {!isList && isExpanded && hasChildren && (
        <div id={`container-children-${node.id}`} className="mt-0.5 space-y-0.5">
          <SortableContext
            items={childrenNodes.map((child) => child.id)}
            strategy={verticalListSortingStrategy}
          >
            {childrenNodes.map((child, idx) => (
              <TreeNode
                key={child.id}
                node={child}
                childrenNodes={childrenByParent.get(child.id) || []}
                childrenByParent={childrenByParent}
                activeListId={activeListId}
                onSelectList={onSelectList}
                onOpenCreateModal={onOpenCreateModal}
                onOpenRenameModal={onOpenRenameModal}
                isFirstSibling={idx === 0}
                isLastSibling={idx === childrenNodes.length - 1}
                level={level + 1}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
};
