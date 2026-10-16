import React, { useState, useMemo } from 'react';
import { Layout, X, Plus, ChevronRight, MoreHorizontal } from 'lucide-react';
import { ContainerNode, ContainerType } from '../../domain/types';
import { useAppStore, getPermissionContext } from '../../store/store';
import { getFilteredTree } from '../../store/selectors';
import { canCreateContainer } from '../../domain/permissions';
import { TreeNode } from './TreeNode';
import { ContainerModal } from './ContainerModal';
import { getValidChildType } from './ContainerMenu';
import { Avatar } from '../shared/Avatar';

export interface SidebarProps {
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  onCloseMobile?: () => void;
  isMobile?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeListId,
  onSelectList,
  onCloseMobile,
  isMobile = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const fullState = useAppStore((state) => state);
  const activeUserId = useAppStore((state) => state.activeUserId);
  const usersById = useAppStore((state) => state.usersById);
  const createContainer = useAppStore((state) => state.createContainer);
  const createList = useAppStore((state) => state.createList);
  const renameContainer = useAppStore((state) => state.renameContainer);

  const currentUser = usersById[activeUserId];

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'rename';
    targetNode: ContainerNode | null;
    childType?: ContainerType;
  }>({
    isOpen: false,
    mode: 'create',
    targetNode: null,
  });

  // Canonical filtered tree ordered by hierarchy and position
  const filteredNodes = useMemo(() => {
    return getFilteredTree(fullState);
  }, [fullState]);

  // Group filtered nodes by parentId
  const { spaces, childrenByParent, rootWorkspace } = useMemo(() => {
    const byParent = new Map<string | null, ContainerNode[]>();
    let rootWs: ContainerNode | null = null;

    for (const node of filteredNodes) {
      if (node.type === 'workspace') {
        rootWs = node;
      }
      const list = byParent.get(node.parentId) || [];
      list.push(node);
      byParent.set(node.parentId, list);
    }

    // Top-level spaces have parentId equal to workspace id (or null if no workspace)
    const topSpaces = rootWs ? byParent.get(rootWs.id) || [] : byParent.get(null) || [];

    return {
      spaces: topSpaces,
      childrenByParent: byParent,
      rootWorkspace: rootWs,
    };
  }, [filteredNodes]);

  const permissionContext = useMemo(() => {
    return getPermissionContext(fullState);
  }, [fullState]);

  const canCreateSpace = rootWorkspace
    ? canCreateContainer(activeUserId, rootWorkspace.id, permissionContext)
    : false;

  const handleOpenCreateModal = (parent: ContainerNode, childType: ContainerType) => {
    setModalState({
      isOpen: true,
      mode: 'create',
      targetNode: parent,
      childType,
    });
  };

  const handleOpenRenameModal = (node: ContainerNode) => {
    setModalState({
      isOpen: true,
      mode: 'rename',
      targetNode: node,
    });
  };

  const handleCloseModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleModalSubmit = (name: string, isPrivate?: boolean) => {
    if (!modalState.targetNode) {
      return { success: false, error: 'Target container not found' };
    }

    if (modalState.mode === 'rename') {
      const result = renameContainer(modalState.targetNode.id, name);
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error.message };
    }

    // Create mode
    const parent = modalState.targetNode;
    const parentId = parent.id;
    const type = modalState.childType || getValidChildType(parent.type);

    if (!type) {
      return { success: false, error: `Containers of type ${parent.type} cannot have children` };
    }

    if (type === 'list') {
      const result = createList(parentId, name);
      if (result.success) {
        onSelectList(result.data.container.id);
        return { success: true };
      }
      return { success: false, error: result.error.message };
    }

    const result = createContainer(parentId, name, type, isPrivate);
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error.message };
  };

  return (
    <div className="flex flex-col h-full bg-fb-sidebar text-gray-300 select-none">
      {/* Brand Header */}
      <div
        className={`h-16 min-h-[64px] ${
          isCollapsed ? 'px-2 justify-center' : 'px-4 justify-between'
        } flex items-center border-b border-gray-800 shrink-0`}
      >
        {!isMobile && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center gap-2 min-w-0 rounded-lg text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary p-0.5 -m-0.5 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-fb-primary flex items-center justify-center text-white shadow-md shrink-0 transition-transform group-hover:scale-105">
              <Layout className="w-4 h-4" />
            </div>

            {isCollapsed ? (
              <ChevronRight
                className="w-3.5 h-3.5 text-gray-400 group-hover:text-white shrink-0"
                aria-hidden="true"
              />
            ) : (
              <span className="font-bold text-base text-white tracking-tight truncate group-hover:text-gray-100">
                Flowboard
              </span>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-fb-primary flex items-center justify-center text-white shadow-md shrink-0">
              <Layout className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-base text-white tracking-tight truncate">
                Flowboard
              </span>
            )}
          </div>
        )}

        {/* Mobile close button */}
        {isMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation sidebar"
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Hierarchy Tree Area */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-1.5' : 'px-3'} py-4 space-y-4`}>
        {/* Workspace Label Header */}
        {!isCollapsed && (
          <div>
            <div className="px-2 flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                WORKSPACE
              </span>
              {canCreateSpace && rootWorkspace && (
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(rootWorkspace, 'space')}
                  aria-label="Add new Space"
                  title="Add new Space"
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fb-primary"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tree Nodes */}
        <div className="space-y-1">
          {spaces.length > 0 ? (
            spaces.map((space, idx) => (
              <TreeNode
                key={space.id}
                node={space}
                childrenNodes={childrenByParent.get(space.id) || []}
                childrenByParent={childrenByParent}
                activeListId={activeListId}
                onSelectList={onSelectList}
                onOpenCreateModal={handleOpenCreateModal}
                onOpenRenameModal={handleOpenRenameModal}
                isFirstSibling={idx === 0}
                isLastSibling={idx === spaces.length - 1}
                level={0}
                isCollapsed={isCollapsed}
              />
            ))
          ) : (
            <div className="px-2 py-4 text-xs text-gray-500 italic text-center">
              No spaces visible for this user.
            </div>
          )}
        </div>
      </div>

      {/* Current User Footer matching Figma Frame 1:4 */}
      {currentUser && (
        <div
          aria-label="Current user identity"
          className="border-t border-gray-800 shrink-0 p-3 select-none"
        >
          {!isCollapsed && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">
              CURRENT USER
            </div>
          )}

          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between'
            } gap-2.5 px-1 py-1 rounded-lg`}
          >
            <div
              className={`flex items-center gap-2.5 ${
                isCollapsed ? 'justify-center' : 'min-w-0'
              }`}
              title={`${currentUser.name} (${currentUser.role})`}
            >
              <Avatar initials={currentUser.initials} name={currentUser.name} size="md" />
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-xs font-semibold text-white truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] text-gray-400 capitalize truncate">
                    {currentUser.role}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div
                className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                aria-hidden="true"
              >
                <MoreHorizontal className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Container Create / Rename Modal */}
      {modalState.targetNode && (
        <ContainerModal
          isOpen={modalState.isOpen}
          mode={modalState.mode}
          targetNode={modalState.targetNode}
          childType={modalState.childType}
          onClose={handleCloseModal}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
};
