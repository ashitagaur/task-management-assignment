# Flowboard — Requirements Catalogue

> **Source**: Original Take-Home Assignment + Engineering Architecture Analysis + Accepted Review Decisions
> **Classification**: MVP = Core planned implementation, including Assignment-mandatory requirements and intentionally selected product/design decisions | STRETCH = Selected Stretch Goal | CUT = Explicitly Not Attempted | OWNER = Manual Delivery

---

## Hierarchy (H)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| H-01 | Model a container tree: Workspace → Space → Folder → List → Tasks | MVP | Assignment §1 |
| H-02 | Each container node has: `id`, `name`, `type`, `parentId`, `position` | MVP | Assignment §1 |
| H-03 | Enforce strict 4-tier parent types: workspace→space, space→folder, folder→list | MVP | Assignment §1, Decision 4 |
| H-04 | Containers have `isPrivate` (default false) and `archived` (soft-delete) fields | MVP | Assignment §1, Architecture §3.1 |
| H-05 | CRUD for each container type (create, read, rename, archive) | MVP | Assignment §1 |
| H-06 | Container CRUD is admin-only; store returns `FORBIDDEN` for members | MVP | Architecture §5.1, §3.2 |
| H-07 | Reorder siblings via Move Up / Move Down (DnD not required) | MVP | Assignment §1 |
| H-08 | Archive (soft-delete): sets `archived: true`; archived containers and descendants hidden from tree | MVP | Assignment §1, Architecture §5.1 |
| H-09 | Archived containers unavailable even to admin | MVP | Architecture §3.2 |
| H-10 | No restore UI in MVP; store action only | MVP | Architecture §5.1 |
| H-11 | Atomic List creation: creates container + 3 default statuses (To Do, In Progress, Done) in one operation | MVP | Architecture §5.1 |
| H-12 | Contiguous sibling position reindexing via `reindexPositions()` after every position-affecting operation | MVP | Architecture §3.2, §5.2 |

---

## Tasks (T)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| T-01 | Task entity with fields: `id`, `title`, `description`, `primaryListId`, `statusId`, `priority`, `assigneeIds`, `dueDate`, `position`, `createdAt`, `updatedAt` | MVP | Assignment §2 |
| T-02 | `title` required, max 500 chars | MVP | Assignment §2 |
| T-03 | `priority` enum: `urgent`, `high`, `normal`, `low`, `none` | MVP | Assignment §2 |
| T-04 | Task ID generated from monotonic counter (e.g., `FE-101`) | MVP | Architecture §5.2 |
| T-05 | Create task: defaults to active list's lowest-position `todo` status, appends to end of column | MVP | Architecture §5.2 |
| T-06 | Read, update, delete task operations | MVP | Assignment §2 |
| T-07 | Delete task with confirmation prompt | MVP | Architecture §5.4 |
| T-08 | Move task between lists: updates `primaryListId`, remaps `statusId` via `resolveDestinationStatus()` | MVP | Assignment §2 |
| T-09 | Cross-list move checks edit permission on BOTH source and destination lists | MVP | Architecture §3.2, §5.2 |
| T-10 | Change task status (kanban column move or drawer picker) | MVP | Assignment §2 |
| T-11 | Reorder tasks within a status column | MVP | Assignment §2 |
| T-12 | `statusId` must belong to task's `primaryListId` status set at all times | MVP | Assignment §2, §3 |
| T-13 | `createdAt` set on creation; `updatedAt` updated on every mutation | MVP | Assignment §2 |

---

## Status Configuration (S)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| S-01 | Each list owns a status set | MVP | Assignment §3 |
| S-02 | Minimum statuses per list: `todo`, `in_progress`, `done` (status coverage invariant) | MVP | Assignment §3 |
| S-03 | Status fields: `id`, `name`, `category`, `color`, `position` | MVP | Assignment §3 |
| S-04 | Tasks must only use statuses defined on their list | MVP | Assignment §3 |
| S-05 | Status `category` used only for cross-list status remapping, never as visible column title | MVP | Architecture §3.3 |
| S-06 | Status colors rendered via static Tailwind `STATUS_COLOR_STYLES` map (no runtime hex) | MVP | Architecture §3.3, §6 |
| S-07 | At least one list has a custom additional status (e.g., "In Review") | MVP | Architecture §4 |

---

## Views (V)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| V-01 | Kanban board: columns = list's statuses, ordered by `status.position` | MVP | Assignment §4A |
| V-02 | Kanban cards show: title, assignee avatars/initials, priority badge, due date | MVP | Assignment §4A |
| V-03 | Drag card to another column updates status | MVP | Assignment §4A |
| V-04 | Drag within column updates position | MVP | Assignment §4A |
| V-05 | Dense list view: table with title, status, assignees, priority, due date columns | MVP | Assignment §4B |
| V-06 | Sort by due date and priority (deterministic stable sort with tie-breaking) | MVP | Assignment §4B |
| V-07 | Click row → task detail drawer/modal | MVP | Assignment §4B |
| V-08 | Collapsible sidebar tree: workspace → spaces → folders → lists | MVP | Assignment §4C |
| V-09 | Selecting a list in sidebar loads its board/list view | MVP | Assignment §4C |
| V-10 | View toggle between Board and List views | MVP | Architecture §5.3 |
| V-11 | Breadcrumb navigation showing hierarchy path | MVP | Figma screenshots |

---

## Task Detail Drawer (DR)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| DR-01 | Task detail drawer with accessible dialog primitive (focus trap, Escape, overlay click, focus restore) | MVP | Assignment §4B, §7 |
| DR-02 | Create Mode: empty form, active list pre-selected, default todo status, "Create task" CTA | MVP | Architecture §5.4 |
| DR-03 | Edit Mode: populated with task data, "Save changes" CTA | MVP | Architecture §5.4 |
| DR-04 | Controlled draft: edits mutate local draft only; "Saved" / "Unsaved changes" indicator | MVP | Architecture §5.4 |
| DR-05 | Unified `requestClose()`: dirty check → discard confirmation prompt | MVP | Architecture §5.4 |
| DR-06 | Fields: Title, Description, Status, Priority, Assignees, Due Date, List (cross-list) | MVP | Architecture §5.4 |
| DR-07 | Cross-list selection remaps status via `resolveDestinationStatus()` | MVP | Architecture §5.4 |
| DR-08 | Static read-only activity area with seeded entries (userId, text, relativeTime) | MVP | Architecture §5.4, Decision 1 |
| DR-09 | `role="dialog"`, `aria-modal="true"` | MVP | Architecture §8 |

---

## Permissions (P)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| P-01 | Three mock users: Alice (admin), Bob (member), Carol (member) | MVP | Assignment §5 |
| P-02 | In-app user switcher (obvious, demoable in under 30 seconds) | MVP | Assignment §5 |
| P-03 | Grants: `{ resourceId, userId, mode: allow | deny }` attached to containers | MVP | Assignment §5 |
| P-04 | Public containers: visible to all members unless explicitly denied | MVP | Assignment §5 |
| P-05 | Private containers: visible only with explicit `allow` grant (admins bypass) | MVP | Assignment §5 |
| P-06 | `canViewNode`: archive check → admin bypass → own-node rule on node AND every ancestor | MVP | Architecture §3.2 |
| P-07 | `canEditList`: equals `canViewNode` for non-archived lists (view = edit for tasks) | MVP | Architecture §3.2, Decision 3 |
| P-08 | `canEditTask`: delegates to `canEditList` on task's primary list | MVP | Architecture §3.2 |
| P-09 | `canManageContainers`: admin-only | MVP | Architecture §3.2 |
| P-10 | Permission checks in store/selectors — not only in UI | MVP | Assignment §5 |
| P-11 | Switching users must immediately reflect what tree and boards show | MVP | Assignment §5 |
| P-12 | Attempting to open/mutate denied resource → clear error (`{ error: { code, message } }`) | MVP | Assignment §5 |
| P-13 | Permission-filtered tree returns only visible nodes | MVP | Assignment §5 |
| P-14 | 403 Restricted Card shown for forbidden list navigation (Figma `Node 1:882`) | MVP | Architecture §5.3, Figma `Node 1:882` |
| P-15 | "Viewing as <User> · <Role>" permission feedback banner | MVP | Figma `Node 1:871` |

---

## Client Data Layer (D)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| D-01 | Typed models for containers, tasks, statuses, users, grants | MVP | Assignment §6 |
| D-02 | Seed fixtures: 1 workspace, 2 spaces, 2 folders, 3 lists, 15+ tasks, 3 users, sample grants | MVP | Assignment §6 |
| D-03 | Mutations through Zustand store | MVP | Assignment §6 |
| D-04 | Consistent error shape: `{ error: { code, message } }` via `AppResult<T>` | MVP | Assignment §6 |
| D-05 | `simulateFailureNext` flag in store for deterministic failure testing | MVP | Architecture §5.6 |
| D-06 | `taskMutationInFlight` lock guarding all task mutations | MVP | Architecture §2.1, §5.2 |
| D-07 | Monotonic task counter (`nextTaskNumber`) for ID generation | MVP | Architecture §5.2 |
| D-08 | Injectable `now()` timestamp factory for deterministic testing | MVP | Architecture §3.1 |

---

## UX, Look & Feel (U)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| U-01 | Tailwind CSS only — no custom CSS files, CSS modules, SCSS, styled-components | MVP | Assignment §7 |
| U-02 | Extended Tailwind theme with `fb-*` design tokens (colors, fonts, radii, shadows) | MVP | Assignment §7, Architecture §6 |
| U-03 | Coherent app chrome: sidebar + top bar + main content | MVP | Assignment §7 |
| U-04 | Loading: skeleton or spinner for tree and board/list on first load / list switch | MVP | Assignment §7 |
| U-05 | Empty states: empty list and empty kanban columns | MVP | Assignment §7 |
| U-06 | Errors: toast or inline banner for mutation failures (including permission denied) | MVP | Assignment §7 |
| U-07 | Hover, focus, active states on tree items, cards, rows, buttons | MVP | Assignment §7 |
| U-08 | DnD: visible drag preview + drop-target highlight | MVP | Assignment §7 |
| U-09 | Drawer: Escape and overlay-click to close; sensible focus behavior | MVP | Assignment §7 |
| U-10 | User switcher is obvious | MVP | Assignment §7 |
| U-11 | Priority and status colors consistent across kanban cards and list rows | MVP | Assignment §7 |
| U-12 | Responsive: desktop-first; responsive adaptation across breakpoints | MVP | Assignment §7, Architecture §6 |
| U-13 | Zero page-level horizontal overflow | MVP | Architecture §6 |
| U-14 | Lucide icons (uniform stroke sizes: 14px, 16px, 18px) | MVP | Architecture §6 |

---

## Accessibility (A)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| A-01 | `aria-live="polite"` for toast notifications | MVP | Architecture §8 |
| A-02 | `aria-label` for icon-only buttons | MVP | Architecture §8 |
| A-03 | Semantic `<button>` elements (no clickable divs) | MVP | Architecture §8 |
| A-04 | Visible keyboard focus rings (`focus-visible:ring-2`) | MVP | Architecture §8 |
| A-05 | `@dnd-kit` KeyboardSensor where practical | MVP | Architecture §8 |
| A-06 | Touch targets ≥ 40px | MVP | Architecture §8 |

---

## Testing (TE)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| TE-01 | Unit/store tests: permission filtering on tree and task access | MVP | Assignment §8 |
| TE-02 | At least one component test (RTL — chosen over E2E per Decision 2) | MVP | Assignment §8 |
| TE-03 | Verify Alice admin bypass, Bob denied Sprint 18 + no Marketing, Carol sees all | MVP | Testing Strategy §1 |
| TE-04 | Verify archived containers unavailable even to admin | MVP | Testing Strategy §1 |
| TE-05 | Verify member task mutation in accessible vs. denied list | MVP | Testing Strategy §1 |
| TE-06 | Verify container CRUD by member returns `FORBIDDEN` | MVP | Testing Strategy §1 |
| TE-07 | Task Detail Drawer component test: Create vs. Edit mode, dirty requestClose | MVP | Testing Strategy §2 |

---

## Documentation (DO)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| DO-01 | How to run locally (`npm install && npm run dev`) | MVP | Assignment §9 |
| DO-02 | Architecture diagram (Mermaid) | MVP | Assignment §9 |
| DO-03 | Data model explanation | MVP | Assignment §9 |
| DO-04 | Permission enforcement documentation | MVP | Assignment §9 |
| DO-05 | Trade-offs: what was cut, what would be built next | MVP | Assignment §9 |
| DO-06 | AI usage log (`AI_USAGE.md`) | MVP | Assignment §9 |
| DO-07 | DnD `style=` exception documentation | MVP | Assignment §7, Architecture §6 |
| DO-08 | Note: "Future iteration: nearest-grant inheritance, teams, roles" | MVP | Architecture §9 |
| DO-09 | Note: "Basic Kanban DnD is core MVP, not a stretch" | MVP | Architecture §9 |

---

## Stretch Goals — Selected (ST)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| ST-01 | Optimistic UI on kanban drag-drop: immediate visual update on drop | STRETCH | Assignment stretch, Architecture §5.6 |
| ST-02 | Pre-mutation column-slice snapshotting (`TaskMoveTransactionSnapshot`) | STRETCH | Architecture §5.6 |
| ST-03 | Topbar "Simulate Failure" toggle: arms next mutation to fail | STRETCH | Architecture §5.6 |
| ST-04 | Atomic rollback: restores only `statusId`, `position`, `updatedAt`, sibling positions | STRETCH | Architecture §5.6 |
| ST-05 | Error toast on rollback: "Couldn't move task. Changes were reverted safely." | STRETCH | Architecture §5.6 |
| ST-06 | Bulk Update: Dense List row checkboxes + Select All Visible + count indicator | STRETCH | Architecture §5.7 |
| ST-07 | Floating bulk action dock: Change Status + Add Assignees | STRETCH | Architecture §5.7 |
| ST-08 | Bulk Change Status: appends tasks to end of target column in rendered row order | STRETCH | Architecture §5.7 |
| ST-09 | Bulk Add Assignees: additive with deduplication (never replaces) | STRETCH | Architecture §5.7 |
| ST-10 | `bulkUpdateTasks` store command: all-or-nothing preflight + atomic commit | STRETCH | Architecture §5.7 |

---

## Explicitly Cut / Not Attempted (CUT)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| CUT-01 | Client-side search on task title/description (search input retained visually) | CUT | Assignment stretch |
| CUT-02 | Live activity feed / audit logging | CUT | Assignment stretch |
| CUT-03 | Keyboard shortcuts for common actions | CUT | Assignment stretch |
| CUT-04 | Storybook / Histoire | CUT | Assignment stretch |
| CUT-05 | Container drag-and-drop reordering | CUT | Assignment §1 |
| CUT-06 | Subtasks (`parentTaskId`) | CUT | Assignment §2 |
| CUT-07 | Simulated pagination | CUT | Assignment §6 |
| CUT-08 | Dark mode | CUT | Assignment out of scope |
| CUT-09 | Mobile redesign | CUT | Assignment out of scope |
| CUT-10 | Archive restore UI | CUT | Architecture §5.1 — store action only in MVP |

---

## Owner / Manual Delivery (OWNER)

| ID | Requirement | Classification | Source |
|---|---|---|---|
| OWN-01 | Git commits, staging, push | OWNER | Release Protocol |
| OWN-02 | Public GitHub repository publication | OWNER | Assignment deliverables |
| OWN-03 | Vercel deployment + Live Demo URL | OWNER | Assignment deliverables |
| OWN-04 | 3-5 minute demo video (Loom/YouTube) | OWNER | Assignment deliverables |
