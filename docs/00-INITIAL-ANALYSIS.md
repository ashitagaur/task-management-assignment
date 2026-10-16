# Flowboard — Initial Analysis

> **Analysis Status**: PASS
> **Architecture Readiness**: READY FOR IMPLEMENTATION
> **Date**: 2026-10-16

---

## 1. Assignment Coverage Assessment

Every mandatory requirement from the Original Take-Home Assignment is addressed in our engineering architecture:

| Assignment Section | Requirement Area | Architecture Coverage | Status |
|---|---|---|---|
| §1 Hierarchy | Container tree, CRUD, reorder, soft-delete | Architecture §5.1 | ✅ Complete |
| §2 Tasks | Task entity, CRUD, move, status, position | Architecture §3, §5.2 | ✅ Complete |
| §3 Status Config | List-scoped status sets, 3 categories | Architecture §3, §3.3 | ✅ Complete |
| §4A Kanban Board | Columns = statuses, drag cards | Architecture §5.3, §5.5 | ✅ Complete |
| §4B List View | Table, sort by due/priority, row click → drawer | Architecture §5.3 | ✅ Complete |
| §4C Sidebar | Collapsible tree, selecting list loads view | Architecture §5.1 | ✅ Complete |
| §5 Permissions | 3 users, switcher, grants, public/private | Architecture §3.2, §5.3 | ✅ Complete |
| §6 Client Data | Typed models, fixtures, store, error shape | Architecture §3, §4, §2.1 | ✅ Complete |
| §7 UX | Loading, empty, error, DnD feedback, Tailwind | Architecture §6 | ✅ Complete |
| §8 Tests | Permission unit tests + component/E2E test | Testing Strategy §1, §2 | ✅ Complete |
| §9 README | Run instructions, arch diagram, trade-offs | README & Architecture §9 | ✅ Complete |
| Stretch | Exactly 2 selected | Architecture §1, §5.6, §5.7 | ✅ Complete |

No mandatory requirement is missing. No material contradictions exist.

---

## 2. Engineering Evaluation & Assignment Analysis

### Review Method

Analyzed the Original Take-Home Assignment requirement-by-requirement, cross-referencing the static Figma Verification Report and five supplied Figma screenshots to establish concrete technical decisions, data contracts, and design tokens.

### Key Verification Points Resolved

**Hierarchy — Strict 4-Tier Enforcement**: The Assignment's "Valid parent types: workspace → space → folder → list" is ambiguous about whether `Space → List` is permitted. Decision: enforce strict 4-tier (`Workspace → Space → Folder → List`). This matches the Assignment's tree diagram, all Figma screenshots, and all fixture data. Impact: uniform tree depth, simpler breadcrumbs, simpler permission traversal, simpler container creation validation. Documented as a deliberate design decision.

**Users and Roles — No Read-Only Role**: Three users (Alice/admin, Bob/member, Carol/member). The Assignment defines no read-only role. `canEditList` = `canViewNode` for non-archived lists. View access implies edit access for tasks. There is no separate "edit" grant type.

**Activity — Not an Assignment Requirement**: Activity feed is listed under "Nice-to-have (stretch goals)" in the Assignment, not as mandatory. Our static seeded read-only activity entries are a design fidelity decision matching Figma screenshots, not a required dynamic feature.

**Testing Approach — RTL Component Test (Not E2E)**: The Assignment permits "Component test or E2E: at least one." We select an RTL component test for faster iteration and deterministic behavior at this scale.

---

## 3. Accepted Architectural Decisions

### Decision 1 — Extend `StaticActivityEntry` Type (APPROVED)

**Context**: Design fidelity with Figma materials
**Change**: Add `userId: string` and `relativeTime: string` fields to `StaticActivityEntry` for avatar and timestamp rendering matching Figma screenshot 5.
**Impact**: Fixture data only. No architecture change.

### Decision 2 — Frame RTL Testing as Documented Trade-Off (APPROVED)

**Context**: Test strategy scope
**Change**: The README and testing documents note: "The Assignment permits either component or E2E testing; we chose RTL component testing for faster iteration and deterministic CI behavior at this scale."
**Impact**: Documentation only. No code change.

### Decision 3 — View Access = Edit Access for Tasks (CONFIRMED)

**Context**: Authorization model
**Confirmation**: `canEditList` equals `canViewNode` for non-archived lists. There is no separate edit grant. The Assignment's "can edit tasks in those lists" means "lists they can see." Documented in Architecture.

### Decision 4 — Strict 4-Tier Hierarchy Enforcement (CONFIRMED)

**Context**: Container tree structure
**Confirmation**: Lists require a parent Folder. `Space → List` is disallowed. Documented in README trade-offs.

Container reorder via Move Up/Down vs. DnD: the Assignment specifies "preferred," so button-based sibling reordering is implemented for containers.

---

## 4. Architectural Readiness

Our engineering architecture is coherent and implementation-ready:

- **State ownership is unambiguous**: Canonical domain state in Zustand, session state in Zustand, derived state via selectors, transient UI state in React component/hook state.
- **Route is single source of truth**: `#/list/:listId` — no duplicated `activeListId` in store.
- **Permissions are authoritative below the UI**: Pure domain functions in `domain/permissions.ts`, reused by selectors and store mutations.
- **Mutations are deterministic**: Contiguous position reindexing via `reindexPositions()`, deterministic cross-list status remapping, monotonic task ID generation.
- **Error handling is typed**: `AppResult<T>` discriminated union returned by all fallible store commands.
- **DnD is sound**: Zero store writes on drag-over, single canonical mutation on drop, optimistic rollback scoped to captured snapshot fields only.
- **Tailwind-only styling**: Verified design tokens from Figma, static `STATUS_COLOR_STYLES` map, documented `@dnd-kit` inline-style exception.

---

## 5. Major Engineering Risks

| Risk | Severity | Mitigation |
|---|---|---|
| DnD library complexity (`@dnd-kit`) | Medium | Use established patterns; DragOverlay + sortable context; test manually across pointer/touch/keyboard |
| Permission logic bugs in tree filtering | High | Pure domain functions with dedicated test suite in T05; test all 3 users explicitly |
| Optimistic rollback state corruption | Medium | Field-scoped snapshot (never full object restore); `try...finally` lock release; required rollback integrity test in T13 |
| Bulk update partial mutation | Medium | All-or-nothing preflight validation; atomic commit; required atomicity test in T14 |
| Drawer dirty state + user switch race | Medium | `key={activeUserId}` resets local state; `requestClose()` unified close path |
| Responsive layout breakage | Medium | Manual QA at 5 target widths; zero page-level horizontal overflow invariant |

---

## 6. Complexity & Overengineering Concerns

We explicitly reject unnecessary abstractions:

> "Do NOT add repository abstractions, CQRS, event buses, service layers with no real responsibility, backend/API simulation architecture, persistence frameworks, or extra stretch goals."

The architecture is straightforward:
- **Feature-oriented React** — not atomic/molecular component taxonomy
- **Pragmatic MVC** — domain rules, Zustand store, React views
- **No fake service layer** — store commands are the mutation boundary
- **No DI framework** — direct imports
- **No event bus** — synchronous store mutations

The `taskMutationInFlight` lock is the only concurrency mechanism required. It exists to prevent concurrent mutations corrupting position state. This is genuinely necessary, not ceremony.

---

## 7. Design Gaps

UI states and components not modeled as standalone Figma artboards, derived from the verified design system:

| Gap | Derivation Source |
|---|---|
| Active DragOverlay (elevated card preview) | Card specimen `#1:946` + `fb-card` shadow + subtle rotation |
| Kanban drop target highlight | `border-fb-primary` + `bg-fb-primary-soft/30` |
| Bulk Update floating dock | `bg-fb-sidebar text-white shadow-fb-modal rounded-fb-lg` |
| Drawer Create Mode | Same layout as Edit Mode with empty fields |
| Discard / Delete confirmation dialogs | `fb-modal` shadow + `16px` radius |
| Responsive sidebar drawer | `bg-fb-sidebar` off-canvas with backdrop |
| Empty column state | Dotted drop placeholder |
| Container context menus | Standard dropdown using design tokens |

No critical visual question remains unresolvable from the static Figma report and screenshots.

---

## 8. Final Implementation-Readiness Decision

**READY FOR IMPLEMENTATION**

All mandatory requirements are covered. Architecture is coherent. State ownership is unambiguous. Permission authority is below the UI. No blocking issues remain. Design gaps are documented and derivable from verified tokens.

---

**STATIC FIGMA REPORT USED**: YES
**FIGMA SCREENSHOTS USED**: YES
**LIVE FIGMA USED**: NO
