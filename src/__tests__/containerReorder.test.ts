import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/store';
import { INITIAL_CONTAINERS } from '../store/fixtures';

describe('Hierarchy Sibling Drag-and-Drop Reordering', () => {
  beforeEach(() => {
    // Reset store with fresh fixture clone
    useAppStore.setState({
      activeUserId: 'user-alice', // Admin with full permissions
      containersById: JSON.parse(JSON.stringify(INITIAL_CONTAINERS)),
    });
  });

  it('reorders spaces within the root workspace (same parent ws-main, same type space)', () => {
    const store = useAppStore.getState();

    // Initial state: sp-engineering has position 0, sp-marketing has position 1
    expect(store.containersById['sp-engineering']?.position).toBe(0);
    expect(store.containersById['sp-marketing']?.position).toBe(1);
    expect(store.containersById['sp-engineering']?.parentId).toBe('ws-flowboard');
    expect(store.containersById['sp-marketing']?.parentId).toBe('ws-flowboard');

    // Drag sp-marketing over sp-engineering
    const result = store.reorderSiblingContainers('sp-marketing', 'sp-engineering');
    expect(result.success).toBe(true);

    const updated = useAppStore.getState();
    expect(updated.containersById['sp-marketing']?.position).toBe(0);
    expect(updated.containersById['sp-engineering']?.position).toBe(1);

    // Rule: Never change parentId during drag-and-drop
    expect(updated.containersById['sp-marketing']?.parentId).toBe('ws-flowboard');
    expect(updated.containersById['sp-engineering']?.parentId).toBe('ws-flowboard');
  });

  it('reorders folders within their parent space', () => {
    const store = useAppStore.getState();

    // Create a second folder in sp-engineering to test folder sibling reorder
    const createRes = store.createContainer('sp-engineering', 'Platform', 'folder');
    expect(createRes.success).toBe(true);
    const newFolderId = (createRes as { success: true; data: { id: string } }).data.id;

    const before = useAppStore.getState();
    expect(before.containersById['fld-q2-launch']?.position).toBe(0);
    expect(before.containersById[newFolderId]?.position).toBe(1);
    expect(before.containersById['fld-q2-launch']?.parentId).toBe('sp-engineering');
    expect(before.containersById[newFolderId]?.parentId).toBe('sp-engineering');

    // Reorder newFolder over fld-q2-launch
    const reorderRes = useAppStore.getState().reorderSiblingContainers(newFolderId, 'fld-q2-launch');
    expect(reorderRes.success).toBe(true);

    const after = useAppStore.getState();
    expect(after.containersById[newFolderId]?.position).toBe(0);
    expect(after.containersById['fld-q2-launch']?.position).toBe(1);

    // Rule: parentId strictly preserved
    expect(after.containersById[newFolderId]?.parentId).toBe('sp-engineering');
    expect(after.containersById['fld-q2-launch']?.parentId).toBe('sp-engineering');
  });

  it('reorders lists within their parent folder', () => {
    const store = useAppStore.getState();

    // fld-q2-launch has two lists: list-backlog (0) and list-sprint-18 (1)
    expect(store.containersById['list-backlog']?.position).toBe(0);
    expect(store.containersById['list-sprint-18']?.position).toBe(1);
    expect(store.containersById['list-backlog']?.parentId).toBe('fld-q2-launch');
    expect(store.containersById['list-sprint-18']?.parentId).toBe('fld-q2-launch');

    // Drag list-sprint-18 over list-backlog
    const result = store.reorderSiblingContainers('list-sprint-18', 'list-backlog');
    expect(result.success).toBe(true);

    const updated = useAppStore.getState();
    expect(updated.containersById['list-sprint-18']?.position).toBe(0);
    expect(updated.containersById['list-backlog']?.position).toBe(1);

    // Rule: parentId strictly preserved
    expect(updated.containersById['list-sprint-18']?.parentId).toBe('fld-q2-launch');
    expect(updated.containersById['list-backlog']?.parentId).toBe('fld-q2-launch');
  });

  it('strictly rejects cross-parent drops (e.g., folder in Space A over folder in Space B)', () => {
    const store = useAppStore.getState();

    // fld-q2-launch is in sp-engineering; fld-campaigns is in sp-marketing
    expect(store.containersById['fld-q2-launch']?.parentId).toBe('sp-engineering');
    expect(store.containersById['fld-campaigns']?.parentId).toBe('sp-marketing');

    const result = store.reorderSiblingContainers('fld-q2-launch', 'fld-campaigns');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_PARENTAGE');
      expect(result.error.message).toContain('same parentId and same type');
    }

    // Verify parentIds and positions remain unchanged
    const after = useAppStore.getState();
    expect(after.containersById['fld-q2-launch']?.parentId).toBe('sp-engineering');
    expect(after.containersById['fld-campaigns']?.parentId).toBe('sp-marketing');
  });

  it('strictly rejects cross-type drops (e.g., space over folder, or folder over list)', () => {
    const store = useAppStore.getState();

    const result = store.reorderSiblingContainers('sp-engineering', 'fld-q2-launch');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_PARENTAGE');
    }
  });

  it('strictly rejects reordering the workspace itself', () => {
    const store = useAppStore.getState();

    const result = store.reorderSiblingContainers('ws-flowboard', 'sp-engineering');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('Workspace cannot be reordered');
    }
  });

  it('enforces permissions: member (Bob) is forbidden from reordering containers', () => {
    useAppStore.setState({ activeUserId: 'user-bob' });
    const store = useAppStore.getState();

    const result = store.reorderSiblingContainers('list-sprint-18', 'list-backlog');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('FORBIDDEN');
      expect(result.error.message).toContain('Permission denied');
    }
  });

  it('preserves existing moveContainerUp and moveContainerDown functionality without regression', () => {
    const store = useAppStore.getState();

    // list-sprint-18 is at position 1
    expect(store.containersById['list-sprint-18']?.position).toBe(1);

    // Move Up
    const upRes = store.moveContainerUp('list-sprint-18');
    expect(upRes.success).toBe(true);

    const afterUp = useAppStore.getState();
    expect(afterUp.containersById['list-sprint-18']?.position).toBe(0);
    expect(afterUp.containersById['list-backlog']?.position).toBe(1);

    // Move Down
    const downRes = afterUp.moveContainerDown('list-sprint-18');
    expect(downRes.success).toBe(true);

    const afterDown = useAppStore.getState();
    expect(afterDown.containersById['list-sprint-18']?.position).toBe(1);
    expect(afterDown.containersById['list-backlog']?.position).toBe(0);
  });
});
