# Flowboard — Testing Strategy

> **Framework**: Vitest + React Testing Library
> **Approach**: Risk-focused, intentional testing of critical business logic, Assignment-mandated tests, and stretch state integrity
> **No**: Playwright, E2E tests, arbitrary coverage targets

---

## Testing Philosophy

The Assignment requires:
1. "Unit / store tests: permission filtering on the tree and task access" (§8)
2. "Component test or E2E: at least one" (§8)

We chose **RTL component testing** over E2E (Playwright/Cypress) for faster iteration and deterministic CI behavior at this scale. This is a deliberate trade-off documented in the README.

### Sequential Implementation of Tests

Mandatory tests are implemented **alongside the functionality they verify**, completing all mandatory testing well before the MVP Gate:
- **T05 (Batch 2)**: Permission filtering and store security tests are written immediately with the store and domain operations.
- **T10 (Batch 4)**: The required Task Detail Drawer component test is written immediately when the drawer component is built.
- **T13 (Batch 6)**: The required Optimistic DnD rollback integrity test is written with Stretch A.
- **T14 (Batch 6)**: The required Bulk Update atomicity test is written with Stretch B.
- **T15 (Batch 7)**: Regresses the entire suite, executes the final typecheck, and runs the production build release gate.

---

## 1. Domain / Store Tests (Vitest — Implemented in T05)

### Permission Filtering Tests

These are the highest-priority tests. Permission bugs can silently expose or hide data.

| Test | What It Proves | Requirement IDs |
|---|---|---|
| Alice sees all non-archived containers | Admin bypass works correctly | P-06, TE-03 |
| Bob sees Engineering, Q2 Launch, Backlog | Public container visibility works | P-04, TE-03 |
| Bob does NOT see Sprint 18 | Explicit `deny` grant blocks access | P-03, TE-03 |
| Bob does NOT see Marketing or its children | Private container without `allow` is hidden | P-05, TE-03 |
| Carol sees Engineering subtree + Marketing subtree | `allow` grant on private container works | P-05, TE-03 |
| Archived container is invisible to Alice | Archive check precedes admin bypass | H-09, P-06, TE-04 |
| Archived ancestor hides descendants for all users | Structural tree pruning works | P-06, TE-04 |
| Inaccessible ancestor hides all descendants | Tree filtering is structurally complete | P-13, TE-03 |

### Task Access Tests

| Test | What It Proves | Requirement IDs |
|---|---|---|
| Bob can create a task in Backlog (accessible list) | `canEditTask` via `canEditList` works for members | P-07, P-08, TE-05 |
| Bob cannot create a task in Sprint 18 (denied list) | `canEditTask` returns `FORBIDDEN`, zero state mutation | P-12, TE-05 |
| Bob cannot mutate a task in Sprint 18 | Update/delete returns `FORBIDDEN`, state unchanged | P-12, TE-05 |
| Cross-list move with denied destination returns `FORBIDDEN` | Both source and dest permission checked | T-09, TE-05 |
| Cross-list move with denied source returns `FORBIDDEN` | Symmetric permission check | T-09, TE-05 |

### Container Security & Store Guard Tests

| Test | What It Proves | Requirement IDs |
|---|---|---|
| Bob cannot create a container | `canManageContainers` is admin-only | H-06, P-09, TE-06 |
| Bob cannot rename a container | Admin guard on rename | H-06, TE-06 |
| Bob cannot archive a container | Admin guard on archive | H-06, TE-06 |
| `createContainer` with invalid parent type returns `INVALID_PARENTAGE` | Strict 4-tier enforcement | H-03 |
| `createList` creates container + 3 default statuses atomically | Atomic list creation invariant | H-11, S-02 |
| `setActiveUser` during `taskMutationInFlight` returns `INVARIANT_VIOLATION` | Mutation lock protects user switch | D-06 |

### Test Structure

```typescript
// src/__tests__/permissions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('Permission Filtering', () => {
  beforeEach(() => {
    // Reset store to fresh fixture state
  });

  describe('canViewNode — Tree Visibility', () => {
    it('Alice (admin) sees all non-archived containers', ...);
    it('Bob sees public Engineering subtree except denied Sprint 18', ...);
    it('Bob does not see private Marketing subtree', ...);
    it('Carol sees Engineering and Marketing subtrees', ...);
    it('Archived container is invisible even to Alice', ...);
    it('Archived ancestor hides all descendants', ...);
  });

  describe('canEditTask — Task Access', () => {
    it('Bob can create task in accessible Backlog list', ...);
    it('Bob cannot create task in denied Sprint 18', ...);
    it('Cross-list move to denied list returns FORBIDDEN', ...);
  });

  describe('canManageContainers — Admin Guard', () => {
    it('Bob cannot create container', ...);
    it('Bob cannot rename container', ...);
    it('Bob cannot archive container', ...);
  });

  describe('Store Guards', () => {
    it('createContainer with invalid parentage returns INVALID_PARENTAGE', ...);
    it('createList creates container + 3 default statuses', ...);
    it('setActiveUser during mutation lock returns INVARIANT_VIOLATION', ...);
  });
});
```

---

## 2. Component Tests (React Testing Library — Implemented in T10)

### Task Detail Drawer Test

One focused component test verifying the Assignment's §8 requirement ("at least one component test").

| Test | What It Proves | Requirement IDs |
|---|---|---|
| Renders Create mode with empty fields and "Create task" CTA | Create mode initialization correct | DR-02, TE-07 |
| Renders Edit mode with populated fields and "Save changes" CTA | Edit mode population correct | DR-03, TE-07 |
| Editing a field marks drawer as dirty ("Unsaved changes") | Controlled draft tracking works | DR-04, TE-07 |
| `requestClose()` on dirty drawer shows discard confirmation | Dirty check prevents data loss | DR-05, TE-07 |
| Clean drawer closes immediately on `requestClose()` | No unnecessary confirmation prompt | DR-05, TE-07 |

### Test Structure

```typescript
// src/__tests__/TaskDrawer.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

describe('TaskDrawer', () => {
  it('renders Create mode with empty fields', ...);
  it('renders Edit mode with task data', ...);
  it('marks as dirty when field is edited', ...);
  it('shows discard confirmation on dirty close', ...);
  it('closes immediately when clean', ...);
});
```

---

## 3. Stretch State-Integrity Tests (Required)

Each selected stretch goal makes an important state-integrity claim and includes one focused automated test:

| Test | What It Proves | Implemented In | Requirement IDs |
|---|---|---|---|
| Optimistic DnD Rollback Integrity | Failed mutation cleanly reverts `statusId`, `position`, `updatedAt`, and sibling positions via snapshot | T13 (Stretch A) | ST-01, ST-02, ST-04 |
| Bulk Update Atomicity | Preflight failure on any task leaves 100% of tasks unmutated (all-or-nothing commit) | T14 (Stretch B) | ST-06, ST-10 |

### Optional Unit Tests (If Time Permits)

These low-risk helper tests may be added if meaningful time remains:
- New task default `todo` status + end-of-column position check
- `reindexPositions` contiguous `0..n-1` verification

---

## 4. Manual QA Protocol

### Permission / User Switching (Critical)

| Scenario | Expected Behavior |
|---|---|
| Switch to Alice | Full tree visible, all tasks editable, container menus visible |
| Switch to Bob | Engineering/Q2 Launch/Backlog visible; Sprint 18 hidden; Marketing hidden; no container menus |
| Switch to Carol | All containers visible including Marketing; no container menus |
| Navigate to forbidden list as Bob | 403 Restricted Card with explanation |
| Switch user while on forbidden list | Auto-redirect to first visible list + toast |

### DnD (Critical)

| Scenario | Expected Behavior |
|---|---|
| Drag card within column | Card reorders; position persists |
| Drag card to different column | Card moves; status changes; positions contiguous |
| Drag with simulation armed (Stretch A) | Card visually drops, pauses ~300ms, snaps back; error toast |
| Drag after simulation disarms | Normal instant commit |
| Touch drag on mobile | 250ms delay before drag starts; no accidental drags during scroll |

### Responsive Layout (Required)

| Width | Check |
|---|---|
| 375px (mobile) | Off-canvas sidebar, full-width drawer, compact topbar, no horizontal overflow |
| 768px (tablet) | Off-canvas sidebar, table internal scroll, no horizontal overflow |
| 1024px (small desktop) | Fixed sidebar appears, full layout |
| 1280px | Dense desktop layout, readable card/table spacing |
| 1440px | Full Figma reference width, all elements properly spaced |

### Keyboard / Focus Behavior

| Scenario | Expected Behavior |
|---|---|
| Tab through sidebar tree items | Visible focus ring on each item |
| Escape while drawer is open | Triggers `requestClose()` (dirty check if needed) |
| Tab inside drawer | Focus trapped within drawer |
| Close drawer | Focus returns to triggering card/row |
| All icon-only buttons | Have `aria-label` |

### Loading / Empty / Error States

| Scenario | Expected Behavior |
|---|---|
| First app load | Skeleton shimmer briefly visible |
| Switch to empty list | "No tasks here yet" illustration with "Add task" button |
| Empty kanban column | Dotted border drop placeholder |
| Permission-denied mutation | Error toast with clear message |
| Simulated failure (Stretch A) | Error toast: "Couldn't move task. Changes were reverted safely." |

### Visual Comparison

- Compare rendered UI against supplied Figma screenshots at 1440px width
- Verify: sidebar colors, topbar height, card styling, column headers, status colors, priority badges, drawer layout, 403 card, toast styling
- Functional correctness and product feel take priority over pixel-perfect cloning

---

## 5. Final Engineering Checks

| Check | Command | Must Pass |
|---|---|---|
| TypeScript typecheck | `tsc --noEmit` | Zero errors |
| Automated tests | `npm test` | All tests pass |
| Production build | `npm run build` | Clean build, no warnings |

These three checks are the final release/submission gate.

---

## Test File Organization

```
src/
├── __tests__/
│   ├── permissions.test.ts        # T05: Domain + store permission tests (MVP mandatory)
│   ├── TaskDrawer.test.tsx        # T10: Task Detail Drawer component test (MVP mandatory)
│   ├── optimisticDnD.test.ts      # T13: Stretch A rollback integrity test (Required)
│   └── bulkUpdate.test.ts         # T14: Stretch B atomicity test (Required)
├── domain/
│   └── (pure functions — exercised via permissions.test.ts)
└── store/
    └── (store mutations — exercised via permissions.test.ts)
```

Minimal file count. Tests are grouped by risk area and implemented alongside the corresponding functional tasks.
