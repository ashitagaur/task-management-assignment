# Initial Analysis

This document captures the problem analysis, scope decisions, and operational constraints established before writing code.

---

## 1. Assignment Interpretation

The assignment asks for a client-side project management interface that mirrors ClickUp or Linear at a focused scale. It requires a 4-level container hierarchy (Workspace, Space, Folder, List), list-scoped workflows, dual viewing modes (Board and List), an accessible task drawer, and role-based permissions tested through instant user switching.

There is no backend server. All state lives on the client, seeded from deterministic fixtures. The primary technical challenge is maintaining strict structural and security integrity across views and user identities without server validation.

---

## 2. Mandatory Requirements

1. **Hierarchy**: Workspaces contain Spaces; Spaces contain Folders or Lists; Folders contain Lists. Lists contain tasks.
2. **List-Scoped Statuses**: Each List defines its own status workflow. Statuses do not leak across lists.
3. **Dual Views**:
   * Kanban Board with drag-and-drop column transitions and intra-column reordering.
   * Dense List View displaying tasks in tabular form with sorting.
4. **Task Lifecycle**: Create, edit, and soft-delete tasks. Tasks maintain an auto-incrementing identifier (e.g., `FE-101`).
5. **Access Control**: Role inheritance (Admin inherits Member), list-level explicit grants (`allow`, `deny`), and private container visibility.
6. **Multi-User Simulation**: Instant perspective switching between Alice (Admin), Bob (Member with Sprint 18 deny grant), and Carol (Member with Marketing space allow grant).
7. **Routing**: Bookmarkable URLs driven by `#/#/list/:listId` hash routes.

---

## 3. Important Constraints

* **Pure Client State**: No external database or network API. The app must boot predictably from fixture state.
* **Deterministic Refresh**: Hard refresh must restore the selected list from the URL hash and the selected user perspective from session storage without layout shifts.
* **Figma Fidelity**: Colors, typography, spacing, and micro-interactions must match the provided Figma specification directly.
* **Tailwind Only**: Zero bespoke CSS files. All styling must use standard or configured utility classes.
* **Strict Performance**: Initial paint under 200ms, test suite completion under 3 seconds.

---

## 4. Functional & UX Expectations

* **Immediate Feedback**: Task card drops and field changes must update visually without perceived lag.
* **Stable Chrome**: Sidebar, Topbar, breadcrumbs, and workspace headers must remain stable across refreshes. Loading skeletons must only overlay task content.
* **Safe Unsaved Changes**: The Task Drawer must detect dirty state and prompt confirmation before discarding edits.
* **Contextual Fallbacks**: Navigating to an unauthorized or missing list must render clear product states (`RestrictedCard`, `NotFoundCard`) instead of blank screens.

---

## 5. Edge and Failure Cases

* **Cycle Prevention**: Parent container re-assignment must reject ancestor-descendant cycles.
* **Deny Wins**: Explicit `deny` grants at any tree level override descendant `allow` grants.
* **Symmetric Cross-List Moves**: Moving a task from List A to List B requires write permissions on both source and destination lists.
* **Archived Ancestors**: Archiving a Space or Folder immediately hides all descendant Lists and tasks from all users, including Admins.
* **Concurrent In-Flight Lock**: While a task mutation or rollback is in flight, user switching must be locked to prevent cross-account state corruption.

---

## 6. Scope Decisions & Assumptions

* **Storage Strategy**: Domain state (tasks, containers, statuses) resets from fixtures on reload to prevent stale evaluation state. Session identity (`activeUserId`) and sidebar collapse state (`sidebarCollapsed`) persist in `sessionStorage`.
* **Container DnD**: Fully implemented across every sibling level in the hierarchy (Spaces within Workspace, Folders within Space, Lists within Folder). Strictly enforces same-parent and same-type invariants, position-only mutation (parentId is strictly immutable), cross-level drop rejection, role permission enforcement, and backward-compatible button-driven Move Up/Down actions.
* **Activity Feed**: Excluded from the task drawer to focus on core metadata and property editing.
* **Global Search / Filter / Sort**: Retained as visual affordances with "Upgrade to Premium" tooltips to preserve Figma fidelity without partial or broken implementations.
* **Inline Styles**: Disallowed across the codebase with one narrow exception: `@dnd-kit` hardware-accelerated transform coordinate styles on active drag cards.

---

## 7. Definition of Done

* All mandatory assignment features implemented and visually verified against Figma.
* 100% green automated test suite verifying store invariants, access policies, and component behaviors.
* Clean TypeScript typecheck (`tsc --noEmit`) with zero errors.
* Production build generates with zero warnings or dead imports.
* Application runs smoothly on local dev server with zero console errors.
