# UI Acceptance Criteria & Visual Quality Checklist

This document details the expected and forbidden behaviors across all UI components and interaction states in Flowboard.

---

## 1. Application Shell Chrome

### Sidebar Collapse & Expansion
* **Should happen**: Clicking the Flowboard logo toggles between full width (248px) and compact rail (68px) with a smooth 200ms transition.
* **Must not happen**: Sidebar tree text wraps awkwardly or truncates with overflow ellipses during collapse.

### Sidebar Refresh Stability
* **Should happen**: Width, collapsed or expanded state, and active list selection remain stable across browser hard-refreshes.
* **Must not happen**: Sidebar briefly expands, flashes, or behaves like a popup while content initializes.

### Topbar & Navigation Header
* **Should happen**: Displays breadcrumbs, disabled search with Premium affordance, simulation toggle, and user switcher on valid routes.
* **Must not happen**: Header controls jump or recalculate positions during initial app load.

### Page Not Found (404) Topbar State
* **Should happen**: On an invalid route (`#/list/non-existent`), the header displays only the User Switcher on the right, keeping breadcrumbs clean.
* **Must not happen**: Search input, info icon, or simulation button display on missing routes.

---

## 2. Views: Kanban Board & Dense List

### Kanban Column Organization
* **Should happen**: Tasks group cleanly under list-specific statuses with task count pills and status color badges.
* **Must not happen**: Tasks from different lists or statuses intermix within a single column.

### Drag-and-Drop Interaction
* **Should happen**: Grabbing a card lifts it with an elevated drop shadow and hardware-accelerated transform. Dropping moves the card immediately.
* **Must not happen**: Dragging over neighboring columns mutates the Zustand store before drop release.

### Optimistic DnD Rollback
* **Should happen**: If simulation is armed, dropping a card moves it optimistically, holds for 300ms, reverts cleanly to snapshot indices, and triggers an error toast.
* **Must not happen**: Failed drag leaves phantom duplicate cards or permanently scrambled position indices.

### Dense List View Sorting
* **Should happen**: Clicking Priority or Due Date column headers cycles through ascending, descending, and default position order.
* **Must not happen**: Sorting table rows causes horizontal jitter or misaligns column header borders.

### Dense List Bulk Action Dock
* **Should happen**: Selecting two or more checkboxes slides up a floating glassmorphic dock with selection count, status menu, and assignee menu.
* **Must not happen**: Dock obscures bottom table rows without dynamic padding, or retains selections after navigating to another list.

---

## 3. Task Detail Drawer

### Modal Presentation
* **Should happen**: Slides out from the right (480px width) over a backdrop scrim, locking background document scroll.
* **Must not happen**: Background board or list scrolls while interacting inside the drawer.

### Focus Management & Keyboard Trap
* **Should happen**: Opening the drawer focuses the title input. Tabbing cycles through interactive drawer elements without escaping to the background.
* **Must not happen**: Pressing Tab escapes focus into obscured sidebar or topbar controls.

### Dirty Checking & Dismissal Safety
* **Should happen**: Closing an edited task triggers a confirmation modal asking to discard or keep editing. Pressing Escape on a clean drawer closes it immediately.
* **Must not happen**: Unsaved title or description changes discard silently on accidental backdrop clicks.

---

## 4. Shimmer, Loading & Transition States

### Initial App Load / Refresh Shimmer
* **Should happen**: Shimmer skeleton displays exclusively inside `#view-container` for 250ms, then fades smoothly into actual tasks over 200ms.
* **Must not happen**: Sidebar, Topbar, or WorkspaceHeader shimmer or flash on refresh.

### In-App Navigation (No Shimmer)
* **Should happen**: Clicking between accessible lists in the sidebar swaps board content instantly with zero loading skeletons.
* **Must not happen**: Routine route navigation or Board/List view toggles flash an artificial loading skeleton.

---

## 5. Interaction States & Typography

### Interactive Affordances
* **Should happen**: Buttons provide hover background shifts, active pressed states, and visible focus rings (`ring-2 ring-fb-primary`).
* **Must not happen**: Focus outlines clip against container edges or become invisible on dark backgrounds.

### Premium Disabled Controls
* **Should happen**: Global Search, Filter, and Sort display a small info icon, dimmed opacity (`opacity-80`), and a dark tooltip stating "Upgrade to Premium" on hover and focus.
* **Must not happen**: Disabled controls accept text input, trigger fake filtering, or intercept tab navigation.

### Typography & Spacing
* **Should happen**: Inter font hierarchy with strict letter-spacing matching Figma tokens. Margins and paddings use consistent 4px multiples (`p-2`, `p-3`, `p-4`, `p-6`).
* **Must not happen**: Arbitrary font sizes or ad-hoc margins outside Tailwind token scales.
