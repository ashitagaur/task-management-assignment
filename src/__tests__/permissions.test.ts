import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, getPermissionContext } from '../store/store';
import { getFilteredTree, getKanbanColumns } from '../store/selectors';
import {
  can,
  canTask,
  canViewNode,
  canCreateTask,
  canEditTask,
  canDeleteTask,
  canMoveTask,
  canCreateContainer,
  canRenameContainer,
  canArchiveContainer,
  canReorderContainer,
  getEffectiveCapabilities,
} from '../domain/permissions';
import { RoleDefinition, User, Grant, ContainerNode } from '../domain/types';
import { DEFAULT_ROLES } from '../domain/constants';

describe('Domain & Store Permission Tests', () => {
  beforeEach(() => {
    // Reset store to fresh fixture state before each test
    useAppStore.getState().resetData();
  });

  describe('1. Role Capabilities & Inheritance (getEffectiveCapabilities)', () => {
    it('Member receives configured Member capabilities', () => {
      const caps = getEffectiveCapabilities('member');
      expect(caps.has('container.read')).toBe(true);
      expect(caps.has('task.read')).toBe(true);
      expect(caps.has('task.create')).toBe(true);
      expect(caps.has('task.update')).toBe(true);
      expect(caps.has('task.delete')).toBe(true);
      expect(caps.has('task.move')).toBe(true);

      // Container management and bypass should NOT be in Member
      expect(caps.has('container.create')).toBe(false);
      expect(caps.has('container.rename')).toBe(false);
      expect(caps.has('container.archive')).toBe(false);
      expect(caps.has('container.reorder')).toBe(false);
      expect(caps.has('permission.bypass')).toBe(false);
    });

    it('Admin inherits Member capabilities plus Admin-specific capabilities', () => {
      const caps = getEffectiveCapabilities('admin');

      // Inherited from Member
      expect(caps.has('container.read')).toBe(true);
      expect(caps.has('task.read')).toBe(true);
      expect(caps.has('task.create')).toBe(true);
      expect(caps.has('task.update')).toBe(true);
      expect(caps.has('task.delete')).toBe(true);
      expect(caps.has('task.move')).toBe(true);

      // Admin specific
      expect(caps.has('container.create')).toBe(true);
      expect(caps.has('container.rename')).toBe(true);
      expect(caps.has('container.archive')).toBe(true);
      expect(caps.has('container.reorder')).toBe(true);
      expect(caps.has('permission.bypass')).toBe(true);
    });

    it('deduplicates inherited capabilities safely without error', () => {
      const customRoles: Record<string, RoleDefinition> = {
        base: {
          id: 'base',
          name: 'Base',
          capabilities: ['container.read', 'task.read'],
        },
        child: {
          id: 'child',
          name: 'Child',
          inherits: ['base'],
          capabilities: ['container.read', 'task.create'], // container.read duplicated
        },
      };

      const caps = getEffectiveCapabilities('child', customRoles);
      expect(caps.size).toBe(3);
      expect(caps.has('container.read')).toBe(true);
      expect(caps.has('task.read')).toBe(true);
      expect(caps.has('task.create')).toBe(true);
    });

    it('safely terminates and guards against cyclic role inheritance', () => {
      const cyclicRoles: Record<string, RoleDefinition> = {
        roleA: {
          id: 'roleA',
          name: 'Role A',
          inherits: ['roleB'],
          capabilities: ['container.read'],
        },
        roleB: {
          id: 'roleB',
          name: 'Role B',
          inherits: ['roleA'], // Cyclic reference
          capabilities: ['task.read'],
        },
      };

      // Must resolve cleanly without infinite loop or stack overflow
      const capsA = getEffectiveCapabilities('roleA', cyclicRoles);
      expect(capsA.has('container.read')).toBe(true);
      expect(capsA.has('task.read')).toBe(true);
    });

    it('handles missing or malformed role references safely', () => {
      const caps = getEffectiveCapabilities('non-existent-role');
      expect(caps.size).toBe(0);

      const malformedRoles: Record<string, RoleDefinition> = {
        broken: {
          id: 'broken',
          name: 'Broken',
          inherits: ['does-not-exist'],
          capabilities: ['container.read'],
        },
      };
      const brokenCaps = getEffectiveCapabilities('broken', malformedRoles);
      expect(brokenCaps.size).toBe(1);
      expect(brokenCaps.has('container.read')).toBe(true);
    });
  });

  describe('2. Tree Visibility & Hierarchical Grants (canViewNode & getFilteredTree)', () => {
    it('Alice (admin) sees all non-archived containers via permission.bypass', () => {
      useAppStore.getState().setActiveUser('user-alice');
      const filtered = getFilteredTree(useAppStore.getState());

      // Total active containers in fixtures: 1 workspace + 2 spaces + 2 folders + 3 lists = 8
      expect(filtered.length).toBe(8);
      const ids = filtered.map((c) => c.id);
      expect(ids).toContain('ws-flowboard');
      expect(ids).toContain('sp-engineering');
      expect(ids).toContain('sp-marketing');
      expect(ids).toContain('fld-q2-launch');
      expect(ids).toContain('fld-campaigns');
      expect(ids).toContain('list-sprint-18');
      expect(ids).toContain('list-backlog');
      expect(ids).toContain('list-growth');
    });

    it('Bob (member) sees public Engineering subtree but is blocked from Sprint 18 by explicit deny grant', () => {
      useAppStore.getState().setActiveUser('user-bob');
      const filtered = getFilteredTree(useAppStore.getState());
      const ids = filtered.map((c) => c.id);

      // Public allowed
      expect(ids).toContain('ws-flowboard');
      expect(ids).toContain('sp-engineering');
      expect(ids).toContain('fld-q2-launch');
      expect(ids).toContain('list-backlog');

      // Denied list blocked
      expect(ids).not.toContain('list-sprint-18');
    });

    it('Bob (member) does NOT see private Marketing subtree (no explicit allow grant)', () => {
      useAppStore.getState().setActiveUser('user-bob');
      const filtered = getFilteredTree(useAppStore.getState());
      const ids = filtered.map((c) => c.id);

      expect(ids).not.toContain('sp-marketing');
      expect(ids).not.toContain('fld-campaigns');
      expect(ids).not.toContain('list-growth');
    });

    it('Carol (member) sees Engineering subtree AND Marketing subtree via hierarchical ALLOW grant', () => {
      useAppStore.getState().setActiveUser('user-carol');
      const filtered = getFilteredTree(useAppStore.getState());
      const ids = filtered.map((c) => c.id);

      // Public Engineering
      expect(ids).toContain('sp-engineering');
      expect(ids).toContain('list-backlog');
      expect(ids).toContain('list-sprint-18'); // Carol is not denied on Sprint 18

      // Private Marketing subtree: Carol has ALLOW on sp-marketing, which propagates to descendants
      expect(ids).toContain('sp-marketing');
      expect(ids).toContain('fld-campaigns');
      expect(ids).toContain('list-growth');
    });

    it('Ancestor DENY blocks descendants even if child has explicit ALLOW (DENY wins)', () => {
      const state = useAppStore.getState();

      // Give Bob an explicit ALLOW grant on Sprint 18, but a DENY grant on its parent folder Q2 Launch
      const customGrants: Grant[] = [
        ...state.grants,
        { resourceId: 'fld-q2-launch', userId: 'user-bob', mode: 'deny' },
        { resourceId: 'list-sprint-18', userId: 'user-bob', mode: 'allow' },
      ];

      const context = {
        containersById: state.containersById,
        grants: customGrants,
        usersById: state.usersById,
      };

      const canBobViewSprint18 = canViewNode('user-bob', 'list-sprint-18', context);

      // Ancestor DENY on fld-q2-launch must block Sprint 18 despite direct allow
      expect(canBobViewSprint18).toBe(false);
    });

    it('Archived container is invisible to all users, even Alice (admin with bypass)', () => {
      useAppStore.getState().setActiveUser('user-alice');

      // Archive Backlog list
      const archiveResult = useAppStore.getState().archiveContainer('list-backlog');
      expect(archiveResult.success).toBe(true);

      // Verify Alice cannot see archived container
      const aliceVisible = getFilteredTree(useAppStore.getState());
      expect(aliceVisible.map((c) => c.id)).not.toContain('list-backlog');

      // Verify pure canViewNode returns false for Alice (archive before bypass check)
      const state = useAppStore.getState();
      const context = getPermissionContext(state);
      const canAliceView = canViewNode('user-alice', 'list-backlog', context);
      expect(canAliceView).toBe(false);
    });

    it('Archived ancestor hides all descendants (structural tree pruning)', () => {
      useAppStore.getState().setActiveUser('user-alice');
      // Archive Q2 Launch folder (ancestor of Backlog and Sprint 18)
      const archiveResult = useAppStore.getState().archiveContainer('fld-q2-launch');
      expect(archiveResult.success).toBe(true);

      const state = useAppStore.getState();
      const filtered = getFilteredTree(state);
      const ids = filtered.map((c) => c.id);

      expect(ids).not.toContain('fld-q2-launch');
      expect(ids).not.toContain('list-backlog');
      expect(ids).not.toContain('list-sprint-18');
    });

    it('Resource-path cycles fail closed (return false)', () => {
      const state = useAppStore.getState();
      // Introduce an intentional cycle between two folders
      const cyclicContainers: Record<string, ContainerNode> = {
        ...state.containersById,
        'fld-cycle-a': {
          id: 'fld-cycle-a',
          name: 'Cycle A',
          type: 'folder',
          parentId: 'fld-cycle-b',
          position: 0,
        },
        'fld-cycle-b': {
          id: 'fld-cycle-b',
          name: 'Cycle B',
          type: 'folder',
          parentId: 'fld-cycle-a',
          position: 0,
        },
      };

      const context = {
        containersById: cyclicContainers,
        grants: state.grants,
        usersById: state.usersById,
      };

      // Path traversal must fail closed
      expect(canViewNode('user-alice', 'fld-cycle-a', context)).toBe(false);
      expect(canViewNode('user-bob', 'fld-cycle-a', context)).toBe(false);
    });

    it('Broken ancestry chain (missing parent) fails closed (return false)', () => {
      const state = useAppStore.getState();
      // Container referencing a non-existent parent container
      const brokenContainers: Record<string, ContainerNode> = {
        ...state.containersById,
        'fld-orphan': {
          id: 'fld-orphan',
          name: 'Orphan Folder',
          type: 'folder',
          parentId: 'missing-parent-id',
          position: 0,
        },
      };

      const context = {
        containersById: brokenContainers,
        grants: state.grants,
        usersById: state.usersById,
      };

      expect(canViewNode('user-alice', 'fld-orphan', context)).toBe(false);
      expect(canViewNode('user-bob', 'fld-orphan', context)).toBe(false);
    });
  });

  describe('3. Task Access & Mutations (canEditTask, canTask & Store Guards)', () => {
    it('Bob can create a task in Backlog (accessible list)', () => {
      useAppStore.getState().setActiveUser('user-bob');

      const result = useAppStore.getState().createTask('list-backlog', {
        title: 'New Member Task',
        priority: 'high',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('New Member Task');
        expect(result.data.primaryListId).toBe('list-backlog');
        expect(result.data.id).toMatch(/^FE-\d+$/);
      }
    });

    it('Bob cannot create a task in Sprint 18 (denied list) -> returns FORBIDDEN with zero mutation', () => {
      useAppStore.getState().setActiveUser('user-bob');
      const initialTasksCount = Object.keys(useAppStore.getState().tasksById).length;

      const result = useAppStore.getState().createTask('list-sprint-18', {
        title: 'Unauthorized Task',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }

      // Assert zero mutation
      const finalTasksCount = Object.keys(useAppStore.getState().tasksById).length;
      expect(finalTasksCount).toBe(initialTasksCount);
    });

    it('Bob cannot mutate or delete tasks in Sprint 18 -> returns FORBIDDEN', () => {
      useAppStore.getState().setActiveUser('user-bob');
      const sprint18Task = Object.values(useAppStore.getState().tasksById).find(
        (t) => t.primaryListId === 'list-sprint-18'
      )!;
      expect(sprint18Task).toBeDefined();

      // Attempt update
      const updateResult = useAppStore.getState().updateTask(sprint18Task.id, {
        title: 'Hacked Title',
      });
      expect(updateResult.success).toBe(false);
      if (!updateResult.success) {
        expect(updateResult.error.code).toBe('FORBIDDEN');
      }

      // Assert task in store remains unchanged
      expect(useAppStore.getState().tasksById[sprint18Task.id]?.title).toBe(sprint18Task.title);

      // Attempt delete
      const deleteResult = useAppStore.getState().deleteTask(sprint18Task.id);
      expect(deleteResult.success).toBe(false);
      if (!deleteResult.success) {
        expect(deleteResult.error.code).toBe('FORBIDDEN');
      }

      // Assert task still exists in store
      expect(useAppStore.getState().tasksById[sprint18Task.id]).toBeDefined();
    });

    it('Cross-list move checks permissions on BOTH source and destination lists symmetrically', () => {
      useAppStore.getState().setActiveUser('user-bob');

      // Task in Backlog (Bob has access)
      const backlogTask = Object.values(useAppStore.getState().tasksById).find(
        (t) => t.primaryListId === 'list-backlog'
      )!;

      // 1. Move from Backlog (accessible) to Sprint 18 (denied)
      const moveDeniedDest = useAppStore
        .getState()
        .moveTaskToList(backlogTask.id, 'list-sprint-18');
      expect(moveDeniedDest.success).toBe(false);
      if (!moveDeniedDest.success) {
        expect(moveDeniedDest.error.code).toBe('FORBIDDEN');
      }

      // Verify task did not move
      expect(useAppStore.getState().tasksById[backlogTask.id]?.primaryListId).toBe(
        'list-backlog'
      );

      // 2. Move from Sprint 18 (denied) to Backlog (accessible)
      const sprintTask = Object.values(useAppStore.getState().tasksById).find(
        (t) => t.primaryListId === 'list-sprint-18'
      )!;

      const moveDeniedSource = useAppStore
        .getState()
        .moveTaskToList(sprintTask.id, 'list-backlog');
      expect(moveDeniedSource.success).toBe(false);
      if (!moveDeniedSource.success) {
        expect(moveDeniedSource.error.code).toBe('FORBIDDEN');
      }

      // Verify task did not move
      expect(useAppStore.getState().tasksById[sprintTask.id]?.primaryListId).toBe(
        'list-sprint-18'
      );
    });

    it('Future role safety: test-only Viewer role can read but cannot update tasks (view != edit)', () => {
      // Test-only role definition: has read capabilities, but lacks task.create, task.update, task.delete
      const customRoles: Record<string, RoleDefinition> = {
        ...DEFAULT_ROLES,
        viewer: {
          id: 'viewer',
          name: 'Viewer',
          capabilities: ['container.read', 'task.read'],
        },
      };

      const testViewer: User = {
        id: 'user-viewer',
        name: 'Victor Viewer',
        role: 'viewer',
        initials: 'VV',
        email: 'victor@flowboard.test',
      };

      const state = useAppStore.getState();
      const context = {
        containersById: state.containersById,
        grants: state.grants,
        usersById: {
          ...state.usersById,
          [testViewer.id]: testViewer,
        },
        roleDefinitions: customRoles,
      };

      // 1. Viewer can view Backlog list (container.read)
      expect(canViewNode(testViewer.id, 'list-backlog', context)).toBe(true);

      // 2. Viewer CANNOT create task in Backlog (missing task.create)
      expect(canCreateTask(testViewer.id, 'list-backlog', context)).toBe(false);

      // 3. Viewer CANNOT edit task in Backlog (missing task.update)
      const sampleTask = Object.values(state.tasksById).find(
        (t) => t.primaryListId === 'list-backlog'
      )!;
      expect(canEditTask(testViewer.id, sampleTask, context)).toBe(false);

      // 4. canTask helper directly confirms task.read allowed, task.update denied
      expect(canTask(testViewer.id, sampleTask, 'task.read', context)).toBe(true);
      expect(canTask(testViewer.id, sampleTask, 'task.update', context)).toBe(false);
    });
  });

  describe('4. Container Capability Guards (canCreateContainer, canRenameContainer, etc.)', () => {
    it('Bob (member) cannot create, rename, archive, or reorder containers', () => {
      useAppStore.getState().setActiveUser('user-bob');

      // Create container attempt
      const createRes = useAppStore
        .getState()
        .createContainer('sp-engineering', 'New Folder', 'folder');
      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error.code).toBe('FORBIDDEN');
      }

      // Create list attempt
      const createListRes = useAppStore
        .getState()
        .createList('fld-q2-launch', 'New List');
      expect(createListRes.success).toBe(false);
      if (!createListRes.success) {
        expect(createListRes.error.code).toBe('FORBIDDEN');
      }

      // Rename attempt
      const renameRes = useAppStore
        .getState()
        .renameContainer('fld-q2-launch', 'Renamed Folder');
      expect(renameRes.success).toBe(false);
      if (!renameRes.success) {
        expect(renameRes.error.code).toBe('FORBIDDEN');
      }

      // Archive attempt
      const archiveRes = useAppStore
        .getState()
        .archiveContainer('fld-q2-launch');
      expect(archiveRes.success).toBe(false);
      if (!archiveRes.success) {
        expect(archiveRes.error.code).toBe('FORBIDDEN');
      }

      // Move attempt
      const moveRes = useAppStore.getState().moveContainerUp('fld-q2-launch');
      expect(moveRes.success).toBe(false);
      if (!moveRes.success) {
        expect(moveRes.error.code).toBe('FORBIDDEN');
      }
    });

    it('Alice (admin) can manage containers because Admin inherits container.* capabilities', () => {
      useAppStore.getState().setActiveUser('user-alice');

      const renameRes = useAppStore
        .getState()
        .renameContainer('fld-q2-launch', 'Q2 Launch Renamed');
      expect(renameRes.success).toBe(true);
      if (renameRes.success) {
        expect(renameRes.data.name).toBe('Q2 Launch Renamed');
      }
    });
  });

  describe('5. Store Invariants, Ordering & Concurrency Guards', () => {
    it('createContainer with invalid parent type returns INVALID_PARENTAGE', () => {
      useAppStore.getState().setActiveUser('user-alice');

      // Attempt creating a list directly under Space (violates strict 4-tier Workspace -> Space -> Folder -> List)
      const result = useAppStore
        .getState()
        .createContainer('sp-engineering', 'Direct List', 'list');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_PARENTAGE');
      }
    });

    it('createList atomically creates container + 3 default statuses', () => {
      useAppStore.getState().setActiveUser('user-alice');

      const result = useAppStore
        .getState()
        .createList('fld-q2-launch', 'Sprint 19');
      expect(result.success).toBe(true);

      if (result.success) {
        const { container, statuses } = result.data;
        expect(container.name).toBe('Sprint 19');
        expect(container.type).toBe('list');
        expect(container.parentId).toBe('fld-q2-launch');

        expect(statuses.length).toBe(3);
        const categories = statuses.map((s) => s.category);
        expect(categories).toEqual(['todo', 'in_progress', 'done']);

        // Check store persistence
        expect(useAppStore.getState().containersById[container.id]).toBeDefined();
        for (const status of statuses) {
          expect(useAppStore.getState().statusesById[status.id]).toBeDefined();
        }
      }
    });

    it('setActiveUser returns INVARIANT_VIOLATION when taskMutationInFlight is true', () => {
      useAppStore.getState().setTaskMutationInFlight(true);

      const result = useAppStore.getState().setActiveUser('user-bob');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVARIANT_VIOLATION');
      }

      // Assert active user was not changed
      expect(useAppStore.getState().activeUserId).toBe('user-alice');

      // Release lock and verify switch succeeds
      useAppStore.getState().setTaskMutationInFlight(false);
      const successResult = useAppStore.getState().setActiveUser('user-bob');
      expect(successResult.success).toBe(true);
      expect(useAppStore.getState().activeUserId).toBe('user-bob');
    });

    it('getKanbanColumns groups tasks by status ordered by status position and task integer position', () => {
      useAppStore.getState().setActiveUser('user-alice');
      const columns = getKanbanColumns(useAppStore.getState(), 'list-backlog');

      expect(columns.length).toBeGreaterThan(0);
      for (const col of columns) {
        expect(col.status).toBeDefined();
        expect(Array.isArray(col.tasks)).toBe(true);
        // Verify contiguous integer ordering 0..n-1
        col.tasks.forEach((task, idx) => {
          expect(task.position).toBe(idx);
        });
      }
    });
  });

  describe('6. Pure Policy Engine & Semantic Wrappers with PermissionContext', () => {
    it('can() directly validates capabilities on resources', () => {
      const state = useAppStore.getState();
      const context = getPermissionContext(state);

      // Alice has bypass, so can perform container.read on non-archived node
      expect(can('user-alice', 'container.read', 'list-backlog', context)).toBe(true);

      // Bob has task.create on Backlog (accessible)
      expect(can('user-bob', 'task.create', 'list-backlog', context)).toBe(true);

      // Bob does NOT have task.create on Sprint 18 (denied)
      expect(can('user-bob', 'task.create', 'list-sprint-18', context)).toBe(false);

      // Bob does NOT have container.create anywhere (lacks capability)
      expect(can('user-bob', 'container.create', 'sp-engineering', context)).toBe(false);
    });

    it('canTask() delegates cleanly to can() for task primary list', () => {
      const state = useAppStore.getState();
      const context = getPermissionContext(state);
      const backlogTask = Object.values(state.tasksById).find(
        (t) => t.primaryListId === 'list-backlog'
      )!;

      expect(canTask('user-bob', backlogTask, 'task.read', context)).toBe(true);
      expect(canTask('user-bob', backlogTask, 'task.update', context)).toBe(true);
      expect(canTask('user-bob', backlogTask, 'task.delete', context)).toBe(true);
      expect(canTask('user-bob', backlogTask, 'container.create', context)).toBe(false);
    });

    it('semantic wrappers accept PermissionContext and delegate correctly', () => {
      const state = useAppStore.getState();
      const context = getPermissionContext(state);
      const sampleTask = Object.values(state.tasksById).find(
        (t) => t.primaryListId === 'list-backlog'
      )!;

      // canDeleteTask
      expect(canDeleteTask('user-bob', sampleTask, context)).toBe(true);

      // canMoveTask (fails because dest is denied to Bob)
      expect(canMoveTask('user-bob', sampleTask, 'list-sprint-18', context)).toBe(false);

      // Container wrappers for Bob (all false) vs Alice (all true)
      expect(canCreateContainer('user-bob', 'sp-engineering', context)).toBe(false);
      expect(canCreateContainer('user-alice', 'sp-engineering', context)).toBe(true);

      expect(canRenameContainer('user-bob', 'fld-q2-launch', context)).toBe(false);
      expect(canRenameContainer('user-alice', 'fld-q2-launch', context)).toBe(true);

      expect(canArchiveContainer('user-bob', 'fld-q2-launch', context)).toBe(false);
      expect(canArchiveContainer('user-alice', 'fld-q2-launch', context)).toBe(true);

      expect(canReorderContainer('user-bob', 'fld-q2-launch', context)).toBe(false);
      expect(canReorderContainer('user-alice', 'fld-q2-launch', context)).toBe(true);
    });
  });
});
