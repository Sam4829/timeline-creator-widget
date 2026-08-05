export type ColumnType = 'text' | 'daterange' | 'status' | 'assignee';

export interface ColumnData {
  name: string;
  type: ColumnType;
  order: number;
  locked?: boolean;
}

export type CellValue = string | string[] | null;

export interface RowData {
  order: number;
  cells: {
    [columnId: string]: CellValue;
  };
  durations?: {
    [columnId: string]: string;
  };
}

export interface RosterMember {
  name: string;
}

// Iframe Messages
export type UIMode = 'settings' | 'date-picker' | 'dropdown' | 'add-name' | 'plan';

// Plan feature result types
export interface PlanCellResult {
  colId: string;
  value: string;
}

export interface PlanRowResult {
  rowId: string;
  cells: PlanCellResult[];
  durations?: {
    [columnId: string]: string;
  };
}

export interface DatePickerData {
  rowId: string;
  colId: string;
  currentValue: string;
}

export interface DropdownData {
  rowId: string;
  colId: string;
  type: 'status' | 'assignee';
  options: string[];
  currentValue: string | string[];
}
