import {
  ContainerNode,
  Grant,
  StaticActivityEntry,
  Task,
  TaskStatus,
  User,
} from '../domain/types';

export const INITIAL_USERS: Record<string, User> = {
  'user-alice': {
    id: 'user-alice',
    name: 'Alice Admin',
    role: 'admin',
    initials: 'AA',
    email: 'alice@flowboard.dev',
  },
  'user-bob': {
    id: 'user-bob',
    name: 'Bob Member',
    role: 'member',
    initials: 'BM',
    email: 'bob@flowboard.dev',
  },
  'user-carol': {
    id: 'user-carol',
    name: 'Carol Member',
    role: 'member',
    initials: 'CM',
    email: 'carol@flowboard.dev',
  },
};

export const INITIAL_CONTAINERS: Record<string, ContainerNode> = {
  // 1 Workspace
  'ws-flowboard': {
    id: 'ws-flowboard',
    name: 'Flowboard Workspace',
    type: 'workspace',
    parentId: null,
    position: 0,
    isPrivate: false,
    archived: false,
  },
  // 2 Spaces
  'sp-engineering': {
    id: 'sp-engineering',
    name: 'Engineering',
    type: 'space',
    parentId: 'ws-flowboard',
    position: 0,
    isPrivate: false,
    archived: false,
  },
  'sp-marketing': {
    id: 'sp-marketing',
    name: 'Marketing',
    type: 'space',
    parentId: 'ws-flowboard',
    position: 1,
    isPrivate: true, // Private container
    archived: false,
  },
  // 2 Folders
  'fld-q2-launch': {
    id: 'fld-q2-launch',
    name: 'Q2 Launch',
    type: 'folder',
    parentId: 'sp-engineering',
    position: 0,
    isPrivate: false,
    archived: false,
  },
  'fld-campaigns': {
    id: 'fld-campaigns',
    name: 'Campaigns',
    type: 'folder',
    parentId: 'sp-marketing',
    position: 0,
    isPrivate: false,
    archived: false,
  },
  // 3 Lists
  'list-sprint-18': {
    id: 'list-sprint-18',
    name: 'Sprint 18',
    type: 'list',
    parentId: 'fld-q2-launch',
    position: 0,
    isPrivate: false,
    archived: false,
  },
  'list-backlog': {
    id: 'list-backlog',
    name: 'Backlog',
    type: 'list',
    parentId: 'fld-q2-launch',
    position: 1,
    isPrivate: false,
    archived: false,
  },
  'list-growth': {
    id: 'list-growth',
    name: 'Growth Campaigns',
    type: 'list',
    parentId: 'fld-campaigns',
    position: 0,
    isPrivate: false,
    archived: false,
  },
};

export const INITIAL_STATUSES: Record<string, TaskStatus> = {
  // Sprint 18 statuses (includes custom "In Review")
  'status-sp18-todo': {
    id: 'status-sp18-todo',
    name: 'To Do',
    category: 'todo',
    color: 'gray',
    position: 0,
    listId: 'list-sprint-18',
  },
  'status-sp18-prog': {
    id: 'status-sp18-prog',
    name: 'In Progress',
    category: 'in_progress',
    color: 'blue',
    position: 1,
    listId: 'list-sprint-18',
  },
  'status-sp18-review': {
    id: 'status-sp18-review',
    name: 'In Review',
    category: 'in_progress',
    color: 'purple',
    position: 2,
    listId: 'list-sprint-18',
  },
  'status-sp18-done': {
    id: 'status-sp18-done',
    name: 'Done',
    category: 'done',
    color: 'green',
    position: 3,
    listId: 'list-sprint-18',
  },

  // Backlog statuses
  'status-bkl-todo': {
    id: 'status-bkl-todo',
    name: 'To Do',
    category: 'todo',
    color: 'gray',
    position: 0,
    listId: 'list-backlog',
  },
  'status-bkl-prog': {
    id: 'status-bkl-prog',
    name: 'In Progress',
    category: 'in_progress',
    color: 'blue',
    position: 1,
    listId: 'list-backlog',
  },
  'status-bkl-done': {
    id: 'status-bkl-done',
    name: 'Done',
    category: 'done',
    color: 'green',
    position: 2,
    listId: 'list-backlog',
  },

  // Growth Campaigns statuses
  'status-growth-todo': {
    id: 'status-growth-todo',
    name: 'To Do',
    category: 'todo',
    color: 'gray',
    position: 0,
    listId: 'list-growth',
  },
  'status-growth-prog': {
    id: 'status-growth-prog',
    name: 'In Progress',
    category: 'in_progress',
    color: 'blue',
    position: 1,
    listId: 'list-growth',
  },
  'status-growth-done': {
    id: 'status-growth-done',
    name: 'Done',
    category: 'done',
    color: 'green',
    position: 2,
    listId: 'list-growth',
  },
};

export const INITIAL_GRANTS: Grant[] = [
  // Bob is explicitly denied access to Sprint 18
  {
    resourceId: 'list-sprint-18',
    userId: 'user-bob',
    mode: 'deny',
  },
  // Carol is explicitly allowed access to private Marketing space
  {
    resourceId: 'sp-marketing',
    userId: 'user-carol',
    mode: 'allow',
  },
];

export const INITIAL_TASKS: Record<string, Task> = {
  // Sprint 18 Tasks
  'FE-101': {
    id: 'FE-101',
    title: 'Design high-fidelity authentication token flow',
    description: 'Ensure refresh token rotation adheres to OAuth 2.1 specs with strict cookies.',
    primaryListId: 'list-sprint-18',
    statusId: 'status-sp18-todo',
    priority: 'high',
    assigneeIds: ['user-alice', 'user-bob'],
    dueDate: '2026-10-25',
    position: 0,
    createdAt: '2026-10-10T09:00:00Z',
    updatedAt: '2026-10-10T09:00:00Z',
  },
  'FE-102': {
    id: 'FE-102',
    title: 'Implement normalized client state cache',
    description: 'Structure entity tables in Zustand with derived selector projections.',
    primaryListId: 'list-sprint-18',
    statusId: 'status-sp18-todo',
    priority: 'urgent',
    assigneeIds: ['user-alice'],
    dueDate: '2026-10-20',
    position: 1,
    createdAt: '2026-10-11T10:00:00Z',
    updatedAt: '2026-10-11T10:00:00Z',
  },
  'FE-103': {
    id: 'FE-103',
    title: 'Build drag-and-drop sortable Kanban canvas',
    description: 'Configure pointer and touch sensors with collision detection in dnd-kit.',
    primaryListId: 'list-sprint-18',
    statusId: 'status-sp18-prog',
    priority: 'urgent',
    assigneeIds: ['user-carol'],
    dueDate: '2026-10-18',
    position: 0,
    createdAt: '2026-10-12T11:00:00Z',
    updatedAt: '2026-10-12T11:00:00Z',
  },
  'FE-104': {
    id: 'FE-104',
    title: 'Audit focus trap and ARIA landmarks in modal drawer',
    description: 'Verify keyboard navigation and screen reader live region announcements.',
    primaryListId: 'list-sprint-18',
    statusId: 'status-sp18-prog',
    priority: 'normal',
    assigneeIds: ['user-bob'],
    dueDate: null,
    position: 1,
    createdAt: '2026-10-13T12:00:00Z',
    updatedAt: '2026-10-13T12:00:00Z',
  },
  'FE-105': {
    id: 'FE-105',
    title: 'Review optimistic rollback animation spec',
    description: 'Simulate server latency and verify snapshot restoration of position indices.',
    primaryListId: 'list-sprint-18',
    statusId: 'status-sp18-review',
    priority: 'high',
    assigneeIds: ['user-alice', 'user-carol'],
    dueDate: '2026-10-16',
    position: 0,
    createdAt: '2026-10-14T13:00:00Z',
    updatedAt: '2026-10-14T13:00:00Z',
  },
  'FE-106': {
    id: 'FE-106',
    title: 'Deliver Tailwind design token typography scale',
    description: 'Verified exact letter-spacing and line-heights matching Figma artboards.',
    primaryListId: 'list-sprint-18',
    statusId: 'status-sp18-done',
    priority: 'low',
    assigneeIds: ['user-alice'],
    dueDate: '2026-10-14',
    position: 0,
    createdAt: '2026-10-09T08:00:00Z',
    updatedAt: '2026-10-14T16:00:00Z',
  },
  'FE-107': {
    id: 'FE-107',
    title: 'Extract SVG icons for Lucide integration',
    description: 'Normalize stroke width to 1.75px across all navigation and action buttons.',
    primaryListId: 'list-sprint-18',
    statusId: 'status-sp18-done',
    priority: 'none',
    assigneeIds: ['user-bob'],
    dueDate: '2026-10-12',
    position: 1,
    createdAt: '2026-10-08T08:00:00Z',
    updatedAt: '2026-10-12T14:00:00Z',
  },

  // Backlog Tasks
  'FE-108': {
    id: 'FE-108',
    title: 'Migrate legacy CSS classes to utility-first tokens',
    description: 'Audit legacy stylesheet and replace with custom fb- tokens.',
    primaryListId: 'list-backlog',
    statusId: 'status-bkl-todo',
    priority: 'low',
    assigneeIds: ['user-bob'],
    dueDate: '2026-11-05',
    position: 0,
    createdAt: '2026-10-11T14:00:00Z',
    updatedAt: '2026-10-11T14:00:00Z',
  },
  'FE-109': {
    id: 'FE-109',
    title: 'Create telemetry event dictionary for user switcher',
    description: 'Track time-to-switch and identify common permission navigation denials.',
    primaryListId: 'list-backlog',
    statusId: 'status-bkl-todo',
    priority: 'normal',
    assigneeIds: ['user-carol'],
    dueDate: null,
    position: 1,
    createdAt: '2026-10-12T15:00:00Z',
    updatedAt: '2026-10-12T15:00:00Z',
  },
  'FE-110': {
    id: 'FE-110',
    title: 'Refactor breadcrumb generator for deep hierarchies',
    description: 'Handle truncated ancestor paths gracefully on viewport widths under 640px.',
    primaryListId: 'list-backlog',
    statusId: 'status-bkl-prog',
    priority: 'high',
    assigneeIds: ['user-alice'],
    dueDate: '2026-10-28',
    position: 0,
    createdAt: '2026-10-13T16:00:00Z',
    updatedAt: '2026-10-13T16:00:00Z',
  },
  'FE-111': {
    id: 'FE-111',
    title: 'Benchmark table virtualizer against dense DOM trees',
    description: 'Verify 60fps scrolling performance with 500+ rendered list rows.',
    primaryListId: 'list-backlog',
    statusId: 'status-bkl-done',
    priority: 'urgent',
    assigneeIds: ['user-alice', 'user-bob'],
    dueDate: '2026-10-15',
    position: 0,
    createdAt: '2026-10-07T11:00:00Z',
    updatedAt: '2026-10-15T10:00:00Z',
  },

  // Growth Campaigns Tasks (Marketing Space)
  'FE-112': {
    id: 'FE-112',
    title: 'Q4 Product Hunt launch banner assets',
    description: 'Design responsive vector banners matching the dark theme sidebar aesthetic.',
    primaryListId: 'list-growth',
    statusId: 'status-growth-todo',
    priority: 'high',
    assigneeIds: ['user-carol'],
    dueDate: '2026-11-15',
    position: 0,
    createdAt: '2026-10-13T09:00:00Z',
    updatedAt: '2026-10-13T09:00:00Z',
  },
  'FE-113': {
    id: 'FE-113',
    title: 'Customer onboarding email drip copy review',
    description: 'Ensure tone is helpful, concise, and links directly to feature deep-dives.',
    primaryListId: 'list-growth',
    statusId: 'status-growth-todo',
    priority: 'normal',
    assigneeIds: ['user-carol'],
    dueDate: '2026-10-31',
    position: 1,
    createdAt: '2026-10-14T10:00:00Z',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  'FE-114': {
    id: 'FE-114',
    title: 'Interactive product demo sandbox environment',
    description: 'Pre-populate fixture data so prospect trials showcase populated boards instantly.',
    primaryListId: 'list-growth',
    statusId: 'status-growth-prog',
    priority: 'urgent',
    assigneeIds: ['user-carol', 'user-alice'],
    dueDate: '2026-10-24',
    position: 0,
    createdAt: '2026-10-14T11:00:00Z',
    updatedAt: '2026-10-14T11:00:00Z',
  },
  'FE-115': {
    id: 'FE-115',
    title: 'Social proof testimonial cards for landing page',
    description: 'Extract customer quotes and format into accessible grid component.',
    primaryListId: 'list-growth',
    statusId: 'status-growth-done',
    priority: 'low',
    assigneeIds: ['user-carol'],
    dueDate: '2026-10-14',
    position: 0,
    createdAt: '2026-10-10T12:00:00Z',
    updatedAt: '2026-10-14T17:00:00Z',
  },
  'FE-116': {
    id: 'FE-116',
    title: 'Set up Google Analytics 4 conversion tracking tags',
    description: 'Add custom events for list creation, task completion, and view toggling.',
    primaryListId: 'list-growth',
    statusId: 'status-growth-done',
    priority: 'normal',
    assigneeIds: ['user-carol'],
    dueDate: '2026-10-15',
    position: 1,
    createdAt: '2026-10-11T13:00:00Z',
    updatedAt: '2026-10-15T09:00:00Z',
  },
};

export const INITIAL_ACTIVITY: Record<string, StaticActivityEntry[]> = {
  'FE-101': [
    {
      id: 'act-1',
      taskId: 'FE-101',
      userId: 'user-alice',
      text: 'created task and assigned to Alice Admin and Bob Member',
      relativeTime: '6 days ago',
      createdAt: '2026-10-10T09:00:00Z',
    },
    {
      id: 'act-2',
      taskId: 'FE-101',
      userId: 'user-bob',
      text: 'updated priority to High',
      relativeTime: '5 days ago',
      createdAt: '2026-10-11T10:15:00Z',
    },
  ],
  'FE-102': [
    {
      id: 'act-3',
      taskId: 'FE-102',
      userId: 'user-alice',
      text: 'created task with Urgent priority',
      relativeTime: '5 days ago',
      createdAt: '2026-10-11T10:00:00Z',
    },
  ],
  'FE-103': [
    {
      id: 'act-4',
      taskId: 'FE-103',
      userId: 'user-alice',
      text: 'assigned task to Carol Member',
      relativeTime: '4 days ago',
      createdAt: '2026-10-12T11:00:00Z',
    },
    {
      id: 'act-5',
      taskId: 'FE-103',
      userId: 'user-carol',
      text: 'moved task to In Progress',
      relativeTime: '2 days ago',
      createdAt: '2026-10-14T14:30:00Z',
    },
  ],
  'FE-105': [
    {
      id: 'act-6',
      taskId: 'FE-105',
      userId: 'user-carol',
      text: 'moved task to In Review',
      relativeTime: 'yesterday',
      createdAt: '2026-10-15T16:00:00Z',
    },
  ],
};

export const INITIAL_NEXT_TASK_NUMBER = 117;

/**
 * Validates structural invariants of the seed fixture dataset.
 * Throws an descriptive error if any invariant is violated.
 */
export function validateFixtureInvariants(): boolean {
  // 1. Check parentage adheres to strict 4-tier hierarchy
  for (const node of Object.values(INITIAL_CONTAINERS)) {
    if (node.type === 'workspace') {
      if (node.parentId !== null) {
        throw new Error(`Workspace ${node.id} must have null parentId`);
      }
    } else {
      if (!node.parentId) {
        throw new Error(`Non-workspace container ${node.id} must have parentId`);
      }
      const parent = INITIAL_CONTAINERS[node.parentId];
      if (!parent) {
        throw new Error(`Parent ${node.parentId} not found for container ${node.id}`);
      }
      if (node.type === 'space' && parent.type !== 'workspace') {
        throw new Error(`Space ${node.id} must be under workspace, got ${parent.type}`);
      }
      if (node.type === 'folder' && parent.type !== 'space') {
        throw new Error(`Folder ${node.id} must be under space, got ${parent.type}`);
      }
      if (node.type === 'list' && parent.type !== 'folder') {
        throw new Error(`List ${node.id} must be under folder, got ${parent.type}`);
      }
    }
  }

  // 2. Every list has >=1 todo, >=1 in_progress, >=1 done status
  const lists = Object.values(INITIAL_CONTAINERS).filter((c) => c.type === 'list');
  for (const list of lists) {
    const listStatuses = Object.values(INITIAL_STATUSES).filter((s) => s.listId === list.id);
    const hasTodo = listStatuses.some((s) => s.category === 'todo');
    const hasProgress = listStatuses.some((s) => s.category === 'in_progress');
    const hasDone = listStatuses.some((s) => s.category === 'done');
    if (!hasTodo || !hasProgress || !hasDone) {
      throw new Error(`List ${list.id} missing mandatory status category coverage`);
    }
  }

  // 3. Every task statusId belongs to its primaryListId's status set
  for (const task of Object.values(INITIAL_TASKS)) {
    const status = INITIAL_STATUSES[task.statusId];
    if (!status) {
      throw new Error(`Status ${task.statusId} not found for task ${task.id}`);
    }
    if (status.listId !== task.primaryListId) {
      throw new Error(
        `Task ${task.id} status ${status.id} belongs to list ${status.listId}, not primaryListId ${task.primaryListId}`
      );
    }
    for (const assigneeId of task.assigneeIds) {
      if (!INITIAL_USERS[assigneeId]) {
        throw new Error(`Task ${task.id} references unknown user ${assigneeId}`);
      }
    }
  }

  return true;
}
