# Flowboard

Flowboard is a client-side project management application built for modern software teams. It provides container hierarchies, list-scoped status workflows, dual-view task tracking (Kanban Board and Dense List), an accessible task drawer, and role-based access control with instant user-perspective switching.

The codebase implements a complete frontend solution for the ClickUp / Asana take-home assignment, backed by in-memory fixture state and deterministic browser routing.

---

## Tech Stack

* **Runtime & Framework**: React 18, TypeScript, Vite
* **State Management**: Zustand
* **Drag and Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
* **Styling**: Tailwind CSS (strict utility tokens, zero custom CSS)
* **Icons**: `lucide-react`
* **Testing**: Vitest, React Testing Library

---

## Getting Started

### Prerequisites

Node.js 18 or higher, npm 9 or higher.

### Run Locally

```bash
npm install
npm run dev
```

The app will start at `http://localhost:5173`.

---

## Commands

```bash
npm run dev          # Start local development server
npm test             # Run Vitest test suite (52 tests across 6 suites, including E2E workflows)
npm run typecheck    # Validate TypeScript types without emit (tsc --noEmit)
npm run build        # Build production bundle (tsc && vite build)
npm run preview      # Preview production build locally
```

---

## Stretch Goals Attempted

1. **Optimistic Kanban Drag-and-Drop with Rollback**: Delivers zero-latency drops with a snapshot restore engine that reverts affected columns if a network error occurs.
2. **Dense List Bulk Updates**: Allows multi-task status changes and additive assignee assignments with atomic preflight validation while preserving visual row order.

---

## Engineering Documentation

The project documentation is structured so each core concept lives in a single dedicated document:

* [**Initial Analysis**](docs/INITIAL_ANALYSIS.md): Problem breakdown, mandatory constraints, edge cases, and scope boundaries.
* [**Architecture**](docs/ARCHITECTURE.md): Component boundaries, normalized store design, permission engine, and technical trade-offs.
* [**Implementation Plan**](docs/IMPLEMENTATION_PLAN.md): Dependency-ordered delivery phases with exit criteria.
* [**Testing Strategy**](docs/TESTING.md): High-risk scenarios, permission coverage, and unit test matrix.
* [**UI Checklist**](docs/UI_CHECKLIST.md): Visual acceptance criteria, shell stability rules, and interaction states.
* [**AI Usage Log**](AI_USAGE.md): Tool usage record, rejected AI patterns, and human architectural oversight.
