export const mockColumns = [
  { id: 'col-1', name: 'Task Name', type: 'text' as const, order: 0 },
  { id: 'col-2', name: 'Design Spec', type: 'daterange' as const, order: 1 },
  { id: 'col-3', name: 'Review', type: 'daterange' as const, order: 2 },
  { id: 'col-4', name: 'Status', type: 'status' as const, order: 3 },
  { id: 'col-5', name: 'Assignee', type: 'assignee' as const, order: 4 },
];

export const mockRoster = [
  { id: 'roster-1', name: 'Sagnik' },
  { id: 'roster-2', name: 'Alex Rivera' },
  { id: 'roster-3', name: 'Jordan Lee' },
  { id: 'roster-4', name: 'Sam Taylor' },
];

export const mockRows = [
  {
    id: 'row-1',
    order: 0,
    cells: {
      'col-1': 'Onboarding flow & UX',
      'col-2': '2025-08-04 – 2025-08-05',
      'col-3': '2025-08-06',
      'col-4': 'WIP',
      'col-5': ['Sagnik', 'Jordan Lee'],
    },
  },
  {
    id: 'row-2',
    order: 1,
    cells: {
      'col-1': 'Settings & Roster popup',
      'col-2': '2025-08-07 – 2025-08-08',
      'col-3': '',
      'col-4': 'In review',
      'col-5': ['Alex Rivera'],
    },
  },
  {
    id: 'row-3',
    order: 2,
    cells: {
      'col-1': 'Export to Figma token spec',
      'col-2': '',
      'col-3': '',
      'col-4': 'Yet to start',
      'col-5': [],
    },
  },
];

export const mockStatusOptions = ['WIP', 'Done', 'Yet to start', 'Blocked', 'In review'];
export const mockAssigneeOptions = mockRoster.map(r => r.name);
