# Implementation Plan

This plan organizes the development of Flowboard into sequential, dependency-aware phases. Each phase establishes a verified operational baseline before subsequent layers are built.

---

## Phase 1: Foundation & Domain Layer

### Goal
Establish design tokens, strict TypeScript interfaces, deterministic seed fixtures, and pure permission logic before writing UI or state code.

### Implementation
* Define domain types in `src/domain/types.ts` (`ContainerNode`, `Task`, `TaskStatus`, `User`, `Grant`, `Capability`).
* Configure Tailwind utility tokens matching Figma specifications in `tailwind.config.js` (`fb-primary`, `fb-sidebar`, `fb-border`, typography scales).
* Build seed fixtures in `src/store/fixtures.ts` containing the engineering workspace, Sprint 18 list, Backlog list, Growth list, initial tasks, and access grants.
* Implement the functional permission engine in `src/domain/permissions.ts` (`can`, `canViewNode`, `getEffectiveCapabilities`).

### Expected Result
Domain interfaces and pure permission evaluation pass isolated unit tests with zero framework dependencies.

### Before moving forward, verify:
* `npm run typecheck` succeeds with zero errors.
* Domain permission tests verify Alice's admin bypass, Bob's explicit Sprint 18 deny grant, and Carol's private Marketing space access.

---

## Phase 2: State Store & Routing

### Goal
Implement normalized state storage, mutation actions, derived selectors, and hash-based route synchronization.

### Implementation
* Build the Zustand store in `src/store/store.ts` managing normalized dictionaries (`containersById`, `tasksById`, `statusesById`, `usersById`, `grants`).
* Implement container actions (`createContainer`, `renameContainer`, `createList`) and task actions (`createTask`, `updateTask`, `deleteTask`, `moveTaskStatus`).
* Build pure selectors in `src/store/selectors.ts` (`getFilteredTree`, `getKanbanColumns`, `getSortedTasks`, `getBreadcrumbs`).
* Build the routing state machine hook in `src/hooks/useActiveList.ts` parsing hash routes (`#/list/:listId`) into explicit route states (`access`, `forbidden`, `not-found`, `no-visible-lists`).

### Expected Result
Store actions reject unauthorized mutations and return typed `Result<T, AppError>`. Hash changes update active list resolution deterministically.

### Before moving forward, verify:
* Store unit tests verify cross-list move validation, contiguous position reindexing, and cycle prevention.
* Routing unit tests verify URL hash parsing, fallback redirection, and neutral 403/404 state generation.

---

## Phase 3: Application Shell & Navigation

### Goal
Assemble the visual shell, responsive navigation, and user perspective switcher.

### Implementation
* Build `AppShell.tsx` coordinating layout geometry, sidebar collapse state, and mobile drawer transitions.
* Build `Sidebar.tsx` and `TreeNode.tsx` rendering the filtered container hierarchy in full (248px) and compact rail (68px) modes.
* Build `Topbar.tsx`, `Breadcrumbs.tsx`, and `UserSwitcher.tsx` with identity switching.
* Persist active user perspective and sidebar collapse state synchronously in `sessionStorage`.

### Expected Result
Navigating the sidebar updates the URL hash. Switching users immediately re-filters the container tree. Hard refresh preserves both current list and active user perspective without layout shift.

### Before moving forward, verify:
* Bob cannot see Sprint 18 in the sidebar tree.
* Carol sees the private Marketing space.
* Refreshing on Bob stays on Bob and retains the active list.

---

## Phase 4: Task Management & Core Views

### Goal
Deliver interactive dual-view task management (Kanban and Dense List) and the accessible Task Drawer.

### Implementation
* Build `KanbanBoard.tsx` and `TaskCard.tsx` using `@dnd-kit/core` with hardware-accelerated transforms.
* Build `ListView.tsx` and `ListRow.tsx` displaying tabular tasks with interactive priority and due-date column sorting.
* Build `WorkspaceHeader.tsx` displaying list metadata, view toggle (`Board` vs `List`), and action triggers.
* Build `TaskDrawer.tsx` with modal dialog semantics, keyboard focus traps, dirty draft tracking, and unsaved changes confirmation modals.

### Expected Result
Users can create, edit, move, and delete tasks across views. Dragging a card between columns updates its status and position index. Closing a dirty drawer prompts for confirmation.

### Before moving forward, verify:
* Task creation assigns sequential identifiers (e.g., `FE-108`).
* Dragging a card updates its column and reindexes sibling positions contiguously.
* React Testing Library component tests confirm drawer dirty-check and modal dismissal workflows.

---

## Phase 5: Stretch Goals & Release Gate

### Goal
Implement optimistic Kanban drag-and-drop rollback, dense list bulk operations, and complete documentation.

### Implementation
* Extend `moveTaskStatus` in `src/store/store.ts` to capture pre-mutation snapshots, apply optimistic drops, and roll back on armed simulated errors.
* Add exclusive concurrency lock (`taskMutationInFlight`) disabling user switching during in-flight transactions.
* Build `useBulkSelection.ts` and `BulkActionDock.tsx` supporting multi-task status changes and additive assignee assignments.
* Finalize project documentation (`README.md`, `INITIAL_ANALYSIS.md`, `ARCHITECTURE.md`, `TESTING.md`, `UI_CHECKLIST.md`, `AI_USAGE.md`).

### Expected Result
Dropping a card with simulation armed optimistically moves the card, holds for 300ms, snaps back to original position, displays a red error toast, and disarms. Multi-selected tasks update atomically in rendered row order.

### Before moving forward, verify:
* 100% test pass rate across all test suites (`npm test`).
* TypeScript check passes with zero errors (`npm run typecheck`).
* Production build compiles cleanly under 2 seconds (`npm run build`).
