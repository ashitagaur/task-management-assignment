# AI Usage Log

This log records how AI pair-programming tools were used during development, highlighting where AI accelerated delivery, where its suggestions were rejected, and what technical decisions were made by the engineer.

---

## 1. Tools Used

* **Primary Tool**: Antigravity IDE (powered by Google DeepMind agentic coding models).
* **Role**: Code generation, test authoring, type definition scaffolding, and quality gate execution.

---

## 2. Where AI Accelerated Implementation

* **Seed Fixtures & Typings**: Generating TypeScript interfaces and normalized fixture records for workspaces, containers, statuses, tasks, and permission grants.
* **Permission Test Suite**: Writing 28 unit tests in `src/__tests__/permissions.test.ts` to verify role inheritance, explicit allow and deny grants, ancestor cycle rejection, and archived container pruning.
* **Component Boilerplate**: Scaffolding repetitive JSX layouts for `KanbanColumn`, `ListRow`, and `TaskDrawer` according to Figma node coordinates.
* **Snapshot Transaction Logic**: Writing the column snapshot capture and field-scoped rollback implementation in `store.ts` for optimistic Kanban drag-and-drop.

---

## 3. Rejected or Corrected AI Suggestions

1. **Rejected Full Store Persistence**:
   * *AI Proposal*: Persist the entire Zustand store to `localStorage` via middleware.
   * *Why Rejected*: Storing mutated tasks and containers causes stale evaluation state across browser refreshes. The engineer directed keeping domain state in memory from deterministic fixtures, persisting only `activeUserId` and `sidebarCollapsed` in `sessionStorage`.

2. **Corrected Route Shimmer Delays**:
   * *AI Proposal*: Trigger a 250ms loading skeleton on every sidebar list selection and view toggle.
   * *Why Corrected*: Routine client-side navigation in a synchronous app should never flash artificial skeletons. The engineer restricted shimmer loading strictly to initial page loads and browser refreshes, scoped inside `#view-container`.

3. **Fixed Bulk Status Insertion Order**:
   * *AI Proposal*: Iterate over raw task dictionary keys when changing status in bulk.
   * *Why Corrected*: Object key iteration ignores visual table sorting. The engineer modified `ListView.tsx` to pass task IDs in the exact rendered row order, ensuring target columns append tasks matching the sorted list order.

4. **Corrected Sidebar Collapse Initial Paint**:
   * *AI Proposal*: Initialize sidebar collapse in an unpersisted `useState(false)`.
   * *Why Corrected*: On browser refresh with a collapsed sidebar, the sidebar expanded to 248px before shrinking, causing a visible popup effect. The engineer added synchronous `sessionStorage` initialization and gated width transitions during initial mount.

---

## 4. Engineering Decisions Directed by Human Review

* **Hierarchical RBAC & Policy Precedence Engine**:
  * Designed a pure functional authorization policy engine decoupled from React component lifecycle.
  * Enforced a strict evaluation hierarchy: `Archive Check > Admin Bypass > Hierarchical DENY-wins > Private Scope ALLOW Grants`. Explicit `deny` grants at any tree level unconditionally override descendant `allow` grants.
  * Separated read visibility from mutation permissions: view access to a container does not grant task creation or cross-list transfer rights. Cross-list task moves require symmetric write capabilities on both source and target containers.

* **Context-Driven Product State Architecture (403 / 404 / Empty)**:
  * Designed dedicated product landing states rather than generic error fallbacks.
  * **Forbidden State (403)**: When a member navigates to a restricted route (e.g. Bob visiting `#/list/list-sprint-18`), the app renders `RestrictedCard` with neutral breadcrumbs, preventing tree hierarchy leaks to unauthorized viewers while offering a direct fallback navigation CTA.
  * **Not Found State (404)**: When a route points to a non-existent or archived list, the topbar automatically strips context-specific controls (Search, Info icon, Simulation toggle) to display only the User Switcher and renders `NotFoundCard` with structured two-line guidance and fallback routing.
  * **User Perspective Reconciliation**: When switching users while viewing a list inaccessible to the new perspective, the system automatically redirects to the new user's first accessible list and issues an informational toast, avoiding visual 403 flashes.

* **Shell Chrome Stability & Layout Governance**:
  * Established the architectural rule: *stable shell chrome, localized content shimmer*.
  * Persisted the 68px collapsed sidebar state in `sessionStorage` and resolved it synchronously during initial component initialization.
  * Gated CSS width transitions with an initial mount hook to eliminate first-paint layout shifts or expanding popup artifacts on hard refresh.
  * Confined loading shimmer skeletons strictly to the task content viewport (`#view-container`), keeping the sidebar, topbar, breadcrumbs, and workspace headers visually stable during transitions.

* **Transaction Safety & State Concurrency Lock**:
  * Introduced `taskMutationInFlight` to establish an exclusive concurrency lock across the application during optimistic drag-and-drop operations.
  * Physically disabled the Topbar User Switcher during active mutations and backed it with store-level invariants (`INVARIANT_VIOLATION`) to ensure transactions never commit or rollback under mismatched user permission scopes.

* **Atomic Multi-Task Mutation Model**:
  * Mandated all-or-nothing preflight validation for Dense List bulk operations. If a single task in a multi-selection lacks edit permissions or belongs to a mismatched list, zero tasks mutate.
  * Fixed bulk positioning logic to extract task IDs in current rendered row order, preserving visual table sort sequences in the destination column without relying on dictionary key order.

* **Styling & Testing Constraints**:
  * Enforced zero custom CSS files, relying strictly on Tailwind utility tokens matching Figma specifications.
  * Selected an in-memory Vitest and React Testing Library setup over browser automation to achieve deterministic, zero-flake CI execution in under 2 seconds.
