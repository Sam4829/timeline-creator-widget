/// <reference types="@figma/plugin-typings" />
/// <reference types="@figma/widget-typings" />
/** @jsx figma.widget.h */

import { showUI, on, once, emit } from '@create-figma-plugin/utilities';
import { ColumnData, RowData, RosterMember, CellValue } from './types';
import { ThemeTokens, StatusTokens, FIXED_STATUSES } from './theme';

const { widget } = figma;
const {
  AutoLayout,
  Text,
  Input,
  useSyncedState,
  useSyncedMap,
  useEffect,
  SVG
} = widget;

const getSettingsIcon = (color: string) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3"></circle>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
</svg>`;

const getPlusIcon = (color: string) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 3V13M3 8H13" stroke="${color}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;


const getCalendarIcon = (color: string) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1.5" y="3.5" width="13" height="11" rx="1.5" stroke="${color}"/>
  <path d="M1.5 7h13" stroke="${color}" stroke-linecap="round"/>
  <path d="M5 1.5V4" stroke="${color}" stroke-linecap="round"/>
  <path d="M11 1.5V4" stroke="${color}" stroke-linecap="round"/>
  <circle cx="5" cy="10" r="1" fill="${color}"/>
  <circle cx="8" cy="10" r="1" fill="${color}"/>
  <circle cx="11" cy="10" r="1" fill="${color}"/>
</svg>`;

const formatFriendlyDate = (isoString: string) => {
  if (!isoString) return '';
  const parts = isoString.split('\u2013').map(p => p.trim()).filter(Boolean);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const formattedParts = parts.map(p => {
    const dateParts = p.split('-');
    if (dateParts.length === 3) {
      const [, m, d] = dateParts;
      const day = parseInt(d, 10).toString();
      const month = months[parseInt(m, 10) - 1];
      return `${day} ${month}`;
    }
    return p;
  });

  if (formattedParts.length === 2 && formattedParts[0] === formattedParts[1]) {
    return formattedParts[0];
  }

  return formattedParts.join(' - ');
};

export default function () {
  widget.register(TimelineEstimator as any);
}

// Guard flag to prevent stacking showUI calls on rapid double-clicks.
// Module-level because it persists across widget re-renders.
let uiOpen = false;

function TimelineEstimator() {
  const [projectName, setProjectName] = useSyncedState('projectName', 'New Project');
  const [themeName, setThemeName] = useSyncedState<'dark' | 'light'>('theme', 'dark');
  const [lastEditedBy, setLastEditedBy] = useSyncedState('lastEditedBy', 'You');
  const [initialized, setInitialized] = useSyncedState('initialized', false);

  const rosterMap = useSyncedMap<RosterMember>('roster');
  const columnsMap = useSyncedMap<ColumnData>('columns');
  const rowsMap = useSyncedMap<RowData>('rows');

  const theme = ThemeTokens[themeName as keyof typeof ThemeTokens];

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);

      columnsMap.set('col-1', { name: 'Task / Screen', type: 'text', order: 0, locked: true });
      columnsMap.set('col-2', { name: 'Start \u2013 End', type: 'daterange', order: 1 });
      columnsMap.set('col-3', { name: 'Status', type: 'status', order: 2 });
      columnsMap.set('col-4', { name: 'Assignee', type: 'assignee', order: 3 });

      rowsMap.set('row-1', {
        order: 0,
        cells: {
          'col-1': 'Task 1',
          'col-2': null,
          'col-3': null,
          'col-4': null
        }
      });
    }
  });

  const getCurrentUserName = (): string => {
    try {
      return figma.currentUser?.name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  const updateLastEdited = () => {
    try {
      setLastEditedBy(getCurrentUserName());
    } catch {
    }
  };

  const columns = columnsMap.keys()
    .map((k: string) => ({ id: k, ...columnsMap.get(k)! }))
    .sort((a: any, b: any) => a.order - b.order);

  const rows = rowsMap.keys()
    .map((k: string) => ({ id: k, ...rowsMap.get(k)! }))
    .sort((a: any, b: any) => a.order - b.order);

  const handleAddRow = () => {
    const newId = `row-${Date.now()}`;
    const newOrder = rows.length > 0 ? rows[rows.length - 1].order + 1 : 0;
    rowsMap.set(newId, { order: newOrder, cells: {} });
    updateLastEdited();
  };

  // Helper: build a roster snapshot for passing to the UI
  const getRosterSnapshot = () =>
    rosterMap.keys().map(k => ({ id: k, name: rosterMap.get(k)!.name }));

  const handleOpenSettings = () => {
    if (uiOpen) return new Promise<void>(r => r()); // Prevent stacking
    uiOpen = true;

    return new Promise<void>((resolve) => {
      // Reuse pre-computed `columns` instead of re-iterating the map
      const colsData = columns;
      const rowsData = rows;
      const roster = getRosterSnapshot();

      showUI({ width: 400, height: 500, title: 'Settings' }, { type: 'settings', columns: colsData, rows: rowsData, roster, themeName });
      figma.ui.postMessage({ type: 'request-focus' });

      // Register listeners lazily after showUI to avoid blocking the click handler
      setTimeout(() => {
        const cleanupUpdateTheme = on('update-theme' as any, (newTheme: 'dark' | 'light') => {
          setThemeName(newTheme);
          updateLastEdited();
        });

        const cleanupAdd = on('add-roster-name' as any, (name: string) => {
          rosterMap.set(`roster-${Date.now()}`, { name });
          emit('update-roster' as any, getRosterSnapshot());
        });

        const cleanupRemove = on('remove-roster-name' as any, (id: string) => {
          rosterMap.delete(id);
          emit('update-roster' as any, getRosterSnapshot());
        });

        const cleanupAddCol = on('add-column' as any, () => {
          const order = columnsMap.keys().length;
          const newId = `col-${Date.now()}`;
          columnsMap.set(newId, { name: 'New Column', type: 'text', order });
          const updated = columnsMap.keys().map((k: string) => ({ id: k, ...columnsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
          emit('update-columns' as any, updated);
          updateLastEdited();
        });

        const cleanupUpdateCol = on('update-column' as any, ({ id, updates }) => {
          const col = columnsMap.get(id);
          if (col) {
            if (updates.type && updates.type !== col.type) {
              let hasData = false;
              rowsMap.keys().forEach(rk => {
                const r = rowsMap.get(rk)!;
                if (r.cells[id] && r.cells[id] !== '') {
                   if (typeof r.cells[id] === 'object' && r.cells[id] !== null) {
                     if ((r.cells[id] as any).current) hasData = true;
                   } else {
                     hasData = true;
                   }
                }
              });
              if (hasData) {
                emit('column-warning' as any, "Clear this column's data first before changing its type.");
                return;
              }
            }
            columnsMap.set(id, { ...col, ...updates });
            const updated = columnsMap.keys().map((k: string) => ({ id: k, ...columnsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
            emit('update-columns' as any, updated);
            updateLastEdited();
          }
        });

        const cleanupRemoveCol = on('remove-column' as any, (id: string) => {
          columnsMap.delete(id);
          rowsMap.keys().forEach(rk => {
            const r = rowsMap.get(rk)!;
            if (id in r.cells) {
              const newCells = { ...r.cells };
              delete newCells[id];
              rowsMap.set(rk, { ...r, cells: newCells });
            }
          });
          const updated = columnsMap.keys().map((k: string) => ({ id: k, ...columnsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
          emit('update-columns' as any, updated);
          updateLastEdited();
        });

        const cleanupReorderCol = on('reorder-column-drop' as any, ({ draggedId, targetIndex }) => {
          const colsList = columnsMap.keys().map((k: string) => ({ id: k, ...columnsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
          const oldIndex = colsList.findIndex(c => c.id === draggedId);
          if (oldIndex === -1 || targetIndex < 1 || targetIndex >= colsList.length || oldIndex === targetIndex) return;
          
          const draggedCol = colsList.splice(oldIndex, 1)[0];
          colsList.splice(targetIndex, 0, draggedCol);
          
          colsList.forEach((c, idx) => {
             const { id: cId, ...rest } = c;
             columnsMap.set(cId, { ...rest, order: idx });
          });
          const updated = columnsMap.keys().map((k: string) => ({ id: k, ...columnsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
          emit('update-columns' as any, updated);
          updateLastEdited();
        });

        const cleanupAddRow = on('add-row' as any, () => {
          handleAddRow();
          const updated = rowsMap.keys().map((k: string) => ({ id: k, ...rowsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
          emit('update-rows' as any, updated);
        });

        const cleanupRemoveRow = on('remove-row' as any, (id: string) => {
          rowsMap.delete(id);
          const updated = rowsMap.keys().map((k: string) => ({ id: k, ...rowsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
          emit('update-rows' as any, updated);
          updateLastEdited();
        });

        const cleanupReorderRow = on('reorder-row-drop' as any, ({ draggedId, targetIndex }) => {
          const rowsList = rowsMap.keys().map((k: string) => ({ id: k, ...rowsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
          const oldIndex = rowsList.findIndex(r => r.id === draggedId);
          if (oldIndex === -1 || targetIndex < 0 || targetIndex >= rowsList.length || oldIndex === targetIndex) return;
          
          const draggedRow = rowsList.splice(oldIndex, 1)[0];
          rowsList.splice(targetIndex, 0, draggedRow);
          
          rowsList.forEach((r, idx) => {
             const { id: rId, ...rest } = r;
             rowsMap.set(rId, { ...rest, order: idx });
          });
          const updated = rowsMap.keys().map((k: string) => ({ id: k, ...rowsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
          emit('update-rows' as any, updated);
          updateLastEdited();
        });

        const cleanupApplyTemplate = on('apply-template' as any, (templateName: string) => {
          let newCols: ColumnData[] = [];
          let newRows: any[] = [];
          
          if (templateName === 'Polaris D&E') {
            newCols = [
              { name: 'Task / Screen', type: 'text', order: 0, locked: true },
              { name: 'Screenshot mapping', type: 'daterange', order: 1 },
              { name: 'Master screen analysis', type: 'daterange', order: 2 },
              { name: 'VD start date', type: 'daterange', order: 3 },
              { name: 'Draft 1 review', type: 'daterange', order: 4 },
              { name: 'Feedback updates', type: 'daterange', order: 5 },
              { name: 'Final review', type: 'daterange', order: 6 },
              { name: 'Component creation', type: 'daterange', order: 7 },
              { name: 'Responsive check', type: 'daterange', order: 8 },
              { name: 'Release file update', type: 'daterange', order: 9 },
              { name: 'Tech handover', type: 'daterange', order: 10 },
              { name: 'Assignee', type: 'assignee', order: 11 },
              { name: 'Current status', type: 'status', order: 12 }
            ];
            newRows = [
              { 'col-1': 'Onboarding flow', 'col-13': 'Yet to start' }
            ];
          } else if (templateName === 'Design Sprint') {
            newCols = [
              { name: 'Phase', type: 'text', order: 0, locked: true },
              { name: 'Understand & Define', type: 'daterange', order: 1 },
              { name: 'Sketch & Decide', type: 'daterange', order: 2 },
              { name: 'Prototype', type: 'daterange', order: 3 },
              { name: 'Test', type: 'daterange', order: 4 },
              { name: 'Assignee', type: 'assignee', order: 5 },
              { name: 'Status', type: 'status', order: 6 }
            ];
            newRows = [
              { 'col-1': 'Sprint 1', 'col-7': 'WIP' }
            ];
          } else if (templateName === 'Dev Timeline') {
            newCols = [
              { name: 'Feature', type: 'text', order: 0, locked: true },
              { name: 'Frontend', type: 'daterange', order: 1 },
              { name: 'Backend', type: 'daterange', order: 2 },
              { name: 'QA Testing', type: 'daterange', order: 3 },
              { name: 'Deployment', type: 'daterange', order: 4 },
              { name: 'Lead', type: 'assignee', order: 5 },
              { name: 'Status', type: 'status', order: 6 }
            ];
            newRows = [
              { 'col-1': 'User Authentication', 'col-7': 'Done' },
              { 'col-1': 'Dashboard', 'col-7': 'WIP' }
            ];
          } else {
            newCols = [
              { name: 'Task', type: 'text', order: 0, locked: true }
            ];
            newRows = [];
          }

          columnsMap.keys().forEach(k => columnsMap.delete(k));
          rowsMap.keys().forEach(k => rowsMap.delete(k));

          newCols.forEach((c, i) => columnsMap.set(`col-${i+1}`, c));
          newRows.forEach((r, i) => {
             rowsMap.set(`row-${i+1}`, { order: i, cells: r });
          });
          
          updateLastEdited();
          
          const updated = columnsMap.keys().map((k: string) => ({ id: k, ...columnsMap.get(k)! })).sort((a: any, b: any) => a.order - b.order);
          emit('update-columns' as any, updated);
        });

        const cleanupClose = on('close-settings' as any, () => {
          console.log('Settings closed');
          cleanupUpdateTheme();
          cleanupAdd();
          cleanupRemove();
          cleanupAddCol();
          cleanupUpdateCol();
          cleanupRemoveCol();
          cleanupReorderCol();
          cleanupApplyTemplate();
          cleanupAddRow();
          cleanupRemoveRow();
          cleanupReorderRow();
          cleanupClose();
          uiOpen = false;
          figma.closePlugin();
          resolve();
        });
      }, 0);
    });
  };

  const handleOpenPlan = () => {
    if (uiOpen) return new Promise<void>(r => r());
    uiOpen = true;

    return new Promise<void>((resolve) => {
      const colsData = columns;
      const rowsData = rows.map(r => ({
        id: r.id,
        order: r.order,
        cells: r.cells,
        durations: r.durations
      }));

      showUI({ width: 466, height: 540, title: 'Plan Timeline' }, { type: 'plan', rows: rowsData, columns: colsData });
      figma.ui.postMessage({ type: 'request-focus' });

      setTimeout(() => {
        const cleanupApplyPlan = on('apply-plan' as any, (planResults: any[]) => {
          for (const rowResult of planResults) {
            const currentRow = rowsMap.get(rowResult.rowId);
            if (!currentRow) continue;

            const newCells = { ...currentRow.cells };

            for (const cellResult of rowResult.cells) {
              newCells[cellResult.colId] = cellResult.value;
            }

            rowsMap.set(rowResult.rowId, {
              ...currentRow,
              cells: newCells,
              durations: rowResult.durations ?? currentRow.durations
            });
          }

          updateLastEdited();
          cleanupApplyPlan();
          uiOpen = false;
          figma.closePlugin();
          resolve();
        });
      }, 0);
    });
  };

  const handleCellClick = (rowId: string, col: ColumnData & { id: string }) => {
    if (uiOpen) return new Promise<void>(r => r()); // Prevent stacking
    uiOpen = true;

    return new Promise<void>((resolve) => {
      const row = rowsMap.get(rowId);
      if (!row) {
        uiOpen = false;
        resolve();
        return;
      }
      const cellValue = row.cells[col.id];

      if (col.type === 'daterange') {
        const cleanup = once('submit-date' as any, (msgData: any) => {
          cleanup();
          const { rowId: rId, colId: cId, value } = msgData;
          const currentRow = rowsMap.get(rId);
          if (currentRow) {
            const newRows = { ...currentRow, cells: { ...currentRow.cells } };
            newRows.cells[cId] = value;
            rowsMap.set(rId, newRows);
            updateLastEdited();
          }
          uiOpen = false;
          figma.closePlugin();
          resolve();
        });

        showUI({ width: 320, height: 280, title: 'Set Date Range' }, {
          type: 'date-picker',
          data: {
            rowId,
            colId: col.id,
            currentValue: (cellValue as string) || ''
          }
        });
        figma.ui.postMessage({ type: 'request-focus' });

      } else if (col.type === 'status') {
        const cleanup = once('select-dropdown' as any, (msgData: any) => {
          cleanup();
          const { rowId: rId, colId: cId, value } = msgData;
          const currentRow = rowsMap.get(rId);
          if (currentRow) {
            const newRows = { ...currentRow, cells: { ...currentRow.cells } };
            newRows.cells[cId] = value;
            rowsMap.set(rId, newRows);
            updateLastEdited();
          }
          uiOpen = false;
          figma.closePlugin();
          resolve();
        });

        showUI({ width: 200, height: 240, title: 'Set Status' }, {
          type: 'dropdown',
          data: {
            rowId, colId: col.id, type: 'status', options: FIXED_STATUSES, currentValue: cellValue as string
          }
        });
        figma.ui.postMessage({ type: 'request-focus' });

      } else if (col.type === 'assignee') {
        const cleanup = once('select-dropdown' as any, (msgData: any) => {
          cleanup();
          const { rowId: rId, colId: cId, value } = msgData;
          const currentRow = rowsMap.get(rId);
          if (currentRow) {
            const newRows = { ...currentRow, cells: { ...currentRow.cells } };
            newRows.cells[cId] = value;
            rowsMap.set(rId, newRows);
            updateLastEdited();
          }
          uiOpen = false;
          figma.closePlugin();
          resolve();
        });

        const names = rosterMap.keys().map(k => rosterMap.get(k)!.name);
        showUI({ width: 200, height: 280, title: 'Set Assignee' }, {
          type: 'dropdown',
          data: {
            rowId, colId: col.id, type: 'assignee', options: names, currentValue: cellValue as string | string[]
          }
        });
        figma.ui.postMessage({ type: 'request-focus' });

      } else {
        uiOpen = false;
        resolve();
      }
    });
  };

  const getColWidth = (col: ColumnData) => {
    if (col.type === 'text') return 240;
    return Math.max(120, Math.ceil(col.name.length * 7.5));
  };

  const getStatusToken = (status: string) => {
    return (StatusTokens as any)[status] || { bg: theme.subBg, fg: theme.cellFg };
  };

  const renderCell = (row: RowData & { id: string }, col: ColumnData & { id: string }, rowIndex: number) => {
    const cellValue = row.cells[col.id];

    if (col.type === 'text') {
      return (
        <AutoLayout width="fill-parent" verticalAlignItems="center" spacing={8}>
          <Text fill={theme.subFg} fontSize={11} width={20}>{rowIndex + 1}.</Text>
          <AutoLayout width="fill-parent" verticalAlignItems="center" spacing={4}>
            <Input
              value={(cellValue as string) || ''}
              placeholder="Enter text..."
              onTextEditEnd={(e) => {
                const newRows = { ...row, cells: { ...row.cells } };
                newRows.cells[col.id] = e.characters;
                rowsMap.set(row.id, newRows);
                updateLastEdited();
              }}
              fill={theme.cellFg}
              fontSize={11}
              fontWeight="bold"
              width="fill-parent"
            />
          </AutoLayout>
        </AutoLayout>
      );
    }

    if (col.type === 'status') {
      const val = cellValue as string;
      if (!val) {
        return <Text fill={theme.subFg} fontSize={11} italic onClick={() => handleCellClick(row.id, col)}>Select...</Text>;
      }
      const token = getStatusToken(val);
      return (
        <AutoLayout
          fill={token.bg}
          padding={{ horizontal: 10, vertical: 4 }}
          cornerRadius={12}
          onClick={() => handleCellClick(row.id, col)}
        >
          <Text fill={token.fg} fontSize={11} fontWeight="bold">{val}</Text>
        </AutoLayout>
      );
    }

    if (col.type === 'daterange') {
      const data = cellValue as string | null;
      if (!data) {
        return <Text fill={theme.subFg} fontSize={11} italic onClick={() => handleCellClick(row.id, col)}>Set date...</Text>;
      }

      return (
        <AutoLayout verticalAlignItems="center" spacing={4} onClick={() => handleCellClick(row.id, col)} width="fill-parent" horizontalAlignItems="start">
          <Text fill={theme.cellFg} fontSize={11} width="fill-parent" horizontalAlignText="left">{formatFriendlyDate(data)}</Text>
        </AutoLayout>
      );
    }

    // Assignee
    const avatarColors = ['#8A38F5', '#198F51', '#0A6DC2', '#D05141', '#D4860A', '#1A7A8A'];
    const getAvatarColor = (name: string) => {
      const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      return avatarColors[hash % avatarColors.length];
    };

    let assignees: string[] = [];
    if (Array.isArray(cellValue)) {
      assignees = cellValue;
    } else if (typeof cellValue === 'string' && cellValue) {
      assignees = [cellValue];
    }
    const valStr = assignees.join(', ');

    if (!valStr) {
      return <Text fill={theme.subFg} fontSize={11} italic onClick={() => handleCellClick(row.id, col)}>Select...</Text>;
    }
    return (
      <AutoLayout onClick={() => handleCellClick(row.id, col)} verticalAlignItems="center" spacing={8} width="fill-parent">
        <AutoLayout spacing={-4}>
          {assignees.map((name: string, i: number) => (
            <AutoLayout key={i} width={16} height={16} cornerRadius={999} fill={getAvatarColor(name)} horizontalAlignItems="center" verticalAlignItems="center" stroke={theme.bg} strokeWidth={1}>
              <Text fill="#FFFFFF" fontSize={9} fontWeight="bold">{name.charAt(0).toUpperCase()}</Text>
            </AutoLayout>
          ))}
        </AutoLayout>
        <Text fill={theme.cellFg} fontSize={11} width="fill-parent" horizontalAlignText="left">{valStr} &#x25BE;</Text>
      </AutoLayout>
    );
  };

  const generateTSV = (): string => {
    const escapeTSVCell = (val: string): string => {
      if (/[\t\n\r"]/.test(val)) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const header = columns.map(col => escapeTSVCell(col.name)).join('\t');
    const dataRows = rows.map(row => {
      return columns.map(col => {
        const cellValue = row.cells[col.id];
        let val = '';
        if (col.type === 'daterange') {
          val = cellValue ? formatFriendlyDate(cellValue as string) : '';
        } else if (col.type === 'assignee') {
          val = Array.isArray(cellValue) ? cellValue.join(', ') : (cellValue as string) || '';
        } else {
          val = (cellValue as string) || '';
        }
        return escapeTSVCell(val);
      }).join('\t');
    });

    return [header, ...dataRows].join('\n');
  };

  const handleCopyPlan = () => {
    if (uiOpen) return new Promise<void>(r => r());
    uiOpen = true;

    return new Promise<void>((resolve) => {
      const tsvText = generateTSV();

      const timer = setTimeout(() => {
        cleanupCopied();
        cleanupFailed();
        uiOpen = false;
        figma.closePlugin();
        figma.notify('Copying timeline timed out', { error: true });
        resolve();
      }, 10000);

      const cleanupCopied = once('copied' as any, () => {
        clearTimeout(timer);
        cleanupFailed();
        uiOpen = false;
        figma.closePlugin();
        figma.notify('Plan copied to clipboard!');
        resolve();
      });

      const cleanupFailed = once('copy-failed' as any, (_errMessage: string) => {
        clearTimeout(timer);
        // Modal stays open; cleanupCopied is still active for the manual click
      });

      showUI({ width: 320, height: 140, title: 'Copy Plan' }, { type: 'copy-clipboard', text: tsvText });
    });
  };

  return (
    <AutoLayout
      direction="vertical"
      fill={theme.bg}
      cornerRadius={12}
      stroke={theme.border}
      strokeWidth={1}
    >
      {/* Title Bar */}
      <AutoLayout
        width="fill-parent"
        fill={theme.headerBg}
        padding={{ horizontal: 24, vertical: 16 }}
        verticalAlignItems="center"
        spacing="auto"
      >
        <Input
          value={projectName}
          onTextEditEnd={(e) => {
            setProjectName(e.characters);
            updateLastEdited();
          }}
          fontSize={24}
          fontWeight="bold"
          fill={theme.headerFg}
          width={300}
        />
        <AutoLayout verticalAlignItems="center" spacing={40}>
          <Text fill={theme.subFg} fontSize={11}>Last edited: {lastEditedBy}</Text>
          <AutoLayout verticalAlignItems="center" spacing={12}>
            {(() => {
              const hasRows = rows.length > 0;
              const hasDaterangeCols = columns.some(c => c.type === 'daterange');
              const planEnabled = hasRows && hasDaterangeCols;
              const planTooltip = !hasRows
                ? 'Add rows to start planning'
                : !hasDaterangeCols
                ? 'Add a date column to your template first'
                : undefined;
              return (
                <AutoLayout
                  padding={{ horizontal: 8, vertical: 4 }}
                  hoverStyle={planEnabled ? { fill: theme.subBg } : undefined}
                  cornerRadius={5}
                  stroke="#FFFFFF1A"
                  strokeWidth={1}
                  verticalAlignItems="center"
                  spacing={8}
                  opacity={planEnabled ? 1 : 0.35}
                  onClick={planEnabled ? handleOpenPlan : undefined}
                  tooltip={planTooltip}
                >
                  <SVG src={getCalendarIcon(theme.cellFg)} />
                  <Text fill={theme.cellFg} fontSize={11}>Make plan</Text>
                </AutoLayout>
              );
            })()}
            <AutoLayout
              padding={{ horizontal: 8, vertical: 4 }}
              hoverStyle={{ fill: theme.subBg }}
              cornerRadius={5}
              stroke="#FFFFFF1A"
              strokeWidth={1}
              verticalAlignItems="center"
              spacing={8}
              onClick={handleOpenSettings}
            >
              <SVG src={getSettingsIcon(theme.cellFg)} />
              <Text fill={theme.cellFg} fontSize={11}>Settings</Text>
            </AutoLayout>
          </AutoLayout>
        </AutoLayout>
      </AutoLayout>

      {/* Columns Header */}
      <AutoLayout width="fill-parent" height={1} fill={theme.border} />
      <AutoLayout
        width="fill-parent"
        fill={theme.bg}
        verticalAlignItems="center"
        padding={{ horizontal: 24, vertical: 12 }}
        spacing={48}
      >
        {columns.map((col) => (
          <AutoLayout key={col.id} width={getColWidth(col)}>
            <Text fill={theme.headerFg} fontSize={11} fontWeight="bold" opacity={0.9}>{col.name}</Text>
          </AutoLayout>
        ))}
      </AutoLayout>

      {/* Rows */}
      {rows.map((row, index) => (
        <AutoLayout
          key={row.id}
          direction="vertical"
          width="fill-parent"
        >
          <AutoLayout width="fill-parent" height={1} fill={theme.border} />
          <AutoLayout
            width="fill-parent"
            fill={theme.bg}
            verticalAlignItems="center"
            padding={{ horizontal: 24, vertical: 16 }}
            spacing={48}
          >
            {columns.map((col) => (
              <AutoLayout key={col.id} width={getColWidth(col)}>
                {renderCell(row, col, index)}
              </AutoLayout>
            ))}
          </AutoLayout>
        </AutoLayout>
      ))}

      {/* Footer Add Row & Copy Plan */}
      <AutoLayout width="fill-parent" height={1} fill={theme.border} />
      <AutoLayout width="fill-parent" padding={12} spacing="auto" verticalAlignItems="center">
        <AutoLayout
          padding={{ horizontal: 12, vertical: 6 }}
          stroke={theme.border}
          strokeWidth={1}
          cornerRadius={5}
          verticalAlignItems="center"
          spacing={4}
          onClick={handleAddRow}
          hoverStyle={{ fill: theme.subBg }}
        >
          <SVG src={getPlusIcon(theme.cellFg)} />
          <Text fill={theme.cellFg} fontSize={11}>Add row</Text>
        </AutoLayout>

        <AutoLayout
          padding={{ horizontal: 12, vertical: 6 }}
          stroke={theme.border}
          strokeWidth={1}
          cornerRadius={5}
          verticalAlignItems="center"
          spacing={4}
          onClick={handleCopyPlan}
          hoverStyle={{ fill: theme.subBg }}
        >
          <Text fill={theme.cellFg} fontSize={11}>Copy plan</Text>
        </AutoLayout>
      </AutoLayout>
    </AutoLayout>
  );
}
