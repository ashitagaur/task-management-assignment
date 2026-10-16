import { ContainerType, StatusColor, TaskPriority, StatusCategory } from './types';

export const VALID_PARENT_TYPES: Record<Exclude<ContainerType, 'workspace'>, ContainerType> = {
  space: 'workspace',
  folder: 'space',
  list: 'folder',
};

export const DEFAULT_STATUS_TEMPLATES: Array<{
  name: string;
  category: StatusCategory;
  color: StatusColor;
}> = [
  { name: 'To Do', category: 'todo', color: 'gray' },
  { name: 'In Progress', category: 'in_progress', color: 'blue' },
  { name: 'Done', category: 'done', color: 'green' },
];

export const STATUS_COLOR_STYLES: Record<
  StatusColor,
  {
    dot: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  gray: {
    dot: 'bg-gray-400',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
  blue: {
    dot: 'bg-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  purple: {
    dot: 'bg-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  green: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  amber: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
  none: 0,
};

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
  }
> = {
  urgent: {
    label: 'Urgent',
    badgeBg: 'bg-fb-urgent-bg',
    badgeText: 'text-fb-urgent-text',
    badgeBorder: 'border-fb-danger-border',
    dotColor: 'bg-fb-danger',
  },
  high: {
    label: 'High',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  normal: {
    label: 'Normal',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    dotColor: 'bg-blue-500',
  },
  low: {
    label: 'Low',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-600',
    badgeBorder: 'border-slate-200',
    dotColor: 'bg-slate-400',
  },
  none: {
    label: 'None',
    badgeBg: 'bg-gray-50',
    badgeText: 'text-gray-500',
    badgeBorder: 'border-gray-200',
    dotColor: 'bg-gray-300',
  },
};
