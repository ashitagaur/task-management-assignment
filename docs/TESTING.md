# Testing Strategy & Verification Matrix

This document defines the automated and manual verification protocol for Flowboard. Testing prioritizes high-risk security boundaries, state mutations, and transaction rollback integrity.

---

## 1. Automated Test Suites Overview

The test suite executes via Vitest and React Testing Library:

```bash
npm test -- --reporter=verbose
```

| Test Suite | File | Focus Area |
|---|---|---|
| **Full Application E2E** | `src/__tests__/app.e2e.test.tsx` | End-to-end user workflows: task creation, RBAC tree pruning on perspective switch, view toggles + bulk update dock, 404 fallback routing. |
| **Permissions & Store** | `src/__tests__/permissions.test.ts` | Role inheritance, container access rules, task CRUD authorization, tree pruning, concurrency locks. |
| **Component Dialog** | `src/__tests__/TaskDrawer.test.tsx` | Create/edit dialog semantics, form field dirty tracking, unsaved changes confirmation modal. |
| **Optimistic DnD** | `src/__tests__/optimisticDnD.test.ts` | Optimistic drop commit, transaction rollback, sibling restoration, single-shot disarm. |
| **Bulk Updates** | `src/__tests__/bulkUpdate.test.ts` | All-or-nothing preflight checks, visual row order preservation, additive assignee deduplication. |
| **Shell & Routing** | `src/__tests__/topbar.test.tsx` | 404 header neutral state, sidebar collapse persistence from session storage. |

---

## 2. High-Risk Scenarios Matrix

### Security & Permission Boundaries

#### Scenario 1: Alice Admin Tree Visibility
* **Action**: Evaluate `getFilteredTree` with `activeUserId = 'user-alice'`.
* **Expected Result**: Alice sees the entire container hierarchy (Engineering, Marketing, Sprint 18, Backlog, Growth) via admin bypass.

#### Scenario 2: Bob Explicit Deny Enforcement
* **Action**: Evaluate `getFilteredTree` with `activeUserId = 'user-bob'`.
* **Expected Result**: Bob sees public Engineering spaces, but Sprint 18 is pruned from the tree due to an explicit `deny` grant.

#### Scenario 3: Carol Private Allow Grant
* **Action**: Evaluate `getFilteredTree` with `activeUserId = 'user-carol'`.
* **Expected Result**: Carol sees public Engineering containers and the private Marketing space via an explicit `allow` grant.

#### Scenario 4: Unauthorized Task Mutation
* **Action**: Call `createTask` or `updateTask` with `activeUserId = 'user-bob'` targeting a task in Sprint 18.
* **Expected Result**: Store rejects the call with `FORBIDDEN`. Tasks dictionary remains untouched.

#### Scenario 5: Symmetric Cross-List Move Guard
* **Action**: Move a task from accessible Backlog to restricted Sprint 18 as Bob.
* **Expected Result**: Action fails with `FORBIDDEN` because Bob lacks write capabilities on the destination list.

---

### State Mutations & Transactions

#### Scenario 6: Task Creation Auto-Increment
* **Action**: Create a task in Backlog.
* **Expected Result**: Task receives sequential key `FE-108`, status is set to target list default, position is appended contiguously.

#### Scenario 7: Intra-Column Reorder
* **Action**: Reorder a task from position 0 to position 2 within the same status column.
* **Expected Result**: Sibling positions shift cleanly (`0, 1, 2`) with zero gaps or duplicate indices.

#### Scenario 8: Optimistic Drag-and-Drop Rollback
* **Action**: Arm simulation toggle (`simulateFailureNext = true`), then drag a card to another column.
* **Expected Result**: Card moves optimistically in UI. At 300ms, store restores pre-mutation snapshot (`statusId`, `position`, sibling order), displays a red error toast, and disarms simulation toggle.

#### Scenario 9: Concurrency Lock During In-Flight Mutation
* **Action**: Trigger an optimistic move. While in flight, invoke `setActiveUser('user-bob')`.
* **Expected Result**: Switcher button in UI is disabled (`opacity-60`, `cursor-not-allowed`). Store method returns `INVARIANT_VIOLATION`.

#### Scenario 10: Bulk Update Row Order Preservation
* **Action**: Sort Dense List by Priority descending, select 3 tasks, and apply "Change Status".
* **Expected Result**: All 3 tasks move to the target status column appended in the exact visual sequence they held in the sorted list.

---

### Shell Stability & Refresh

#### Scenario 11: Active User Refresh Preservation
* **Action**: Switch to Bob, navigate to Backlog, and hard-refresh the browser.
* **Expected Result**: App initializes with Bob active. URL stays on `#/list/list-backlog`. No visual flash of Alice's perspective.

#### Scenario 12: Collapsed Sidebar Refresh Preservation
* **Action**: Collapse desktop sidebar to 68px rail, then hard-refresh the browser.
* **Expected Result**: Sidebar mounts directly at 68px. Width transition does not animate on mount. No layout expansion pop occurs.

#### Scenario 13: Non-Existent Route (404)
* **Action**: Navigate to `#/list/invalid-list-id`.
* **Expected Result**: Topbar hides Search, Info icon, and Simulation toggle, showing only the User Switcher. Viewport renders `NotFoundCard` with clean copy and fallback button.

#### Scenario 14: Restricted Route (403)
* **Action**: Switch to Bob, navigate directly to `#/list/list-sprint-18`.
* **Expected Result**: Viewport renders `RestrictedCard` explaining access denial without leaking hierarchy metadata.
