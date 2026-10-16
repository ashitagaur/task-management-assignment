# Flowboard — AI Usage Log

> **Context**: Documenting the application of generative AI and pair-programming tools throughout the development of Flowboard, adhering to evaluation transparency guidelines.

---

## 1. AI Tooling Used

- **Primary Tool**: Antigravity IDE (powered by Google DeepMind Advanced Agentic Coding)
- **Role**: Pair-programming copilot, architecture co-designer, test suite author, and continuous quality auditor.
- **Workflow Pattern**:
  `Specification & Architecture → TDD State Layer → Component Scaffold → Integration & Polish → Automated Regression & Verification`

---

## 2. Structured Log of Key AI-Assisted Workflows

### Phase 1: Planning, Requirements & Pure Domain Design
- **AI Contribution**:
  - Parsed the assignment requirements into a normalized requirement matrix across Hierarchy, Tasks, Statuses, Views, Permissions, and Quality Gates.
  - Co-designed the pure functional capability engine (`domain/permissions.ts`), establishing the precedence hierarchy:
    `Archive Check > Admin Bypass > Hierarchical Grants (DENY-wins) > Public/Private Visibility`.
  - Defined strict TypeScript discriminated unions (`AppResult<T>`, `ContainerNode`, `Task`, `TaskStatus`).

### Phase 2: State Layer & Security Test Matrix
- **AI Contribution**:
  - Implemented the normalized Zustand store (`store.ts`) with concurrency locking (`taskMutationInFlight`) and monotonic counter task ID generation (`nextTaskNumber`).
  - Generated the 28-case permission and store test matrix in `src/__tests__/permissions.test.ts`, covering Alice admin bypass, Bob explicit deny on Sprint 18, Bob exclusion from private Marketing, Carol explicit grant access, and member mutation guards.

### Phase 3 & 4: UI/UX, DnD & Accessibility Polish
- **AI Contribution**:
  - Scaffolding of the Figma-accurate component hierarchy: `AppShell`, `Topbar`, `Sidebar`, `WorkspaceHeader`, `KanbanBoard`, `ListView`, and `TaskDrawer`.
  - Configured `@dnd-kit` sensors (Pointer Sensor with 4px activation constraint, Touch Sensor with 250ms hold, and KeyboardSensor).
  - Designed the accessible modal/drawer primitives with focus trapping, Escape key listener, and dirty-close confirmation modals.
  - Resolved responsive layout edge cases, eliminating page-level horizontal overflow across all viewports (375px mobile through 1440px desktop).

### Phase 5: Stretch Goals & Transaction Integrity
- **AI Contribution**:
  - **Stretch A (Optimistic Kanban DnD with Rollback)**:
    - Designed the `TaskMoveTransactionSnapshot` capturing pre-mutation task state, source siblings, and destination siblings.
    - Implemented field-scoped rollback restoring ONLY `statusId`, `position`, `updatedAt`, and sibling positions while keeping the concurrency lock active during simulation.
    - Authored `src/__tests__/optimisticDnD.test.ts`.
  - **Stretch B (Bulk Update in Dense List View)**:
    - Created `useBulkSelection` hook and `BulkActionDock` floating pill with status and additive assignee dropdowns.
    - Implemented `bulkUpdateTasks` in Zustand with all-or-nothing preflight validation ensuring zero partial mutation on any failure.
    - Authored `src/__tests__/bulkUpdate.test.ts`.

---

## 3. Key Human Decisions & Adjustments

1. **State Persistence Boundary**:
   - The AI initially considered full Zustand `localStorage` persistence. The human evaluator/architect directed keeping canonical domain data strictly in memory with synchronous deterministic fixtures, persisting **only** `activeUserId` in `sessionStorage` (`flowboard.activeUserId`). This ensures multi-tab evaluator isolation and guarantees clean reload states without stale data pollution.
2. **First-Paint & Shimmer UX**:
   - The AI initially applied simulated loading across route navigation. Human QA caught the artificial shimmer delay on synchronous client-side transitions. The system was refined to restrict the loading skeleton strictly to initial app load and browser hard refresh, with a smooth 200ms ease-out crossfade that prevents layout shift.
3. **Testing Strategy Selection**:
   - Decided on Vitest unit tests + React Testing Library component tests over heavy end-to-end runners (Playwright) to guarantee deterministic, zero-flake CI execution under 2 seconds.

---

## 4. Quality Verification Summary

| Gate | Status | Command |
| :--- | :---: | :--- |
| **Vitest Test Suite** | 43 / 43 Passed (4 test suites) | `npm test` |
| **TypeScript Typecheck** | 0 Errors | `npm run typecheck` |
| **Production Build** | Clean Bundle (~327 kB / 95 kB gzip) | `npm run build` |
