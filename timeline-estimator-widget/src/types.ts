export type ColumnType = 'text' | 'daterange' | 'status' | 'assignee';

export interface ColumnData {
  name: string;
  type: ColumnType;
  order: number;
  locked?: boolean;
}

export interface DateHistoryEntry {
  value: string;
  changedBy: string;
  changedAt: string;
  reason: string | null;
}

export interface DateRangeData {
  current: string;
  history: DateHistoryEntry[];
}

export type CellValue = string | string[] | DateRangeData | null;

export interface RowData {
  order: number;
  cells: {
    [columnId: string]: CellValue;
  };
}

export interface RosterMember {
  name: string;
}

// Iframe Messages
export type UIMode = 'settings' | 'date-picker' | 'dropdown' | 'add-name';

export interface DatePickerData {
  rowId: string;
  colId: string;
  historyCount: number;
  currentValue: string;
}

export interface DropdownData {
  rowId: string;
  colId: string;
  type: 'status' | 'assignee';
  options: string[];
  currentValue: string | string[];
}
