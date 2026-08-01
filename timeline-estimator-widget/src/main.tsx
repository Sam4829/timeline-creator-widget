/// <reference types="@figma/plugin-typings" />
/// <reference types="@figma/widget-typings" />
/** @jsx figma.widget.h */

import { showUI, on, once, emit } from '@create-figma-plugin/utilities';
import { ColumnData, RowData, RosterMember, CellValue, DateRangeData, DateHistoryEntry } from './types';
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

const getSettingsIcon = (color: string) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 11.5C9.933 11.5 11.5 9.933 11.5 8C11.5 6.067 9.933 4.5 8 4.5C6.067 4.5 4.5 6.067 4.5 8C4.5 9.933 6.067 11.5 8 11.5Z" stroke="${color}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14.5 8C14.5 8 13.5 8.7 13.5 10C13.5 11.3 14.2 12.2 14.2 12.2L12.2 14.2C12.2 14.2 11.3 13.5 10 13.5C8.7 13.5 8 14.5 8 14.5C8 14.5 7.3 13.5 6 13.5C4.7 13.5 3.8 14.2 3.8 14.2L1.8 12.2C1.8 12.2 2.5 11.3 2.5 10C2.5 8.7 1.5 8 1.5 8C1.5 8 2.5 7.3 2.5 6C2.5 4.7 1.8 3.8 1.8 3.8L3.8 1.8C3.8 1.8 4.7 2.5 6 2.5C7.3 2.5 8 1.5 8 1.5C8 1.5 8.7 2.5 10 2.5C11.3 2.5 12.2 1.8 12.2 1.8L14.2 3.8C14.2 3.8 13.5 4.7 13.5 6C13.5 7.3 14.5 8 14.5 8Z" stroke="${color}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const getInfoIcon = (color: string) => `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="6" cy="6" r="5" stroke="${color}"/>
  <path d="M6 3.5V3.51" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M6 5.5V8.5" stroke="${color}" stroke-linecap="round"/>
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
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
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

  return formattedParts.join(' \u2013 ');
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
      const roster = getRosterSnapshot();

      showUI({ width: 400, height: 500, title: 'Settings' }, { type: 'settings', columns: colsData, roster });
      figma.ui.postMessage({ type: 'request-focus' });

      // Register listeners lazily after showUI to avoid blocking the click handler
      setTimeout(() => {
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
          cleanupAdd();
          cleanupRemove();
          cleanupAddCol();
          cleanupUpdateCol();
          cleanupRemoveCol();
          cleanupReorderCol();
          cleanupApplyTemplate();
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
        cells: r.cells
      }));

      showUI({ width: 450, height: 520, title: 'Plan Timeline' }, { type: 'plan', rows: rowsData, columns: colsData });
      figma.ui.postMessage({ type: 'request-focus' });

      setTimeout(() => {
        const cleanupApplyPlan = on('apply-plan' as any, (planResults: any[]) => {
          for (const rowResult of planResults) {
            const currentRow = rowsMap.get(rowResult.rowId);
            if (!currentRow) continue;

            const newCells = { ...currentRow.cells };

            for (const cellResult of rowResult.cells) {
              const existing = newCells[cellResult.colId];
              const incoming = cellResult.dateRange;

              if (!existing || typeof existing !== 'object' || !(existing as any).current) {
                // Fresh cell — write directly
                newCells[cellResult.colId] = incoming;
              } else {
                // Cell has existing data — push new history entry, update current
                const prev = existing as any;
                const newHistory = [
                  ...prev.history,
                  {
                    value: incoming.current,
                    changedBy: getCurrentUserName(),
                    changedAt: new Date().toISOString(),
                    reason: 'Auto-planned'
                  }
                ];
                newCells[cellResult.colId] = {
                  current: incoming.current,
                  history: newHistory
                };
              }
            }

            rowsMap.set(rowResult.rowId, { ...currentRow, cells: newCells });
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
        const data = cellValue as DateRangeData | null;

        const cleanup = once('submit-date' as any, (msgData: any) => {
          cleanup();
          const { rowId: rId, colId: cId, mode, value, reason } = msgData;
          const currentRow = rowsMap.get(rId);
          if (currentRow) {
            const currentCell = currentRow.cells[cId] as DateRangeData | null;
            const newCell: DateRangeData = currentCell
              ? JSON.parse(JSON.stringify(currentCell))
              : { current: '', history: [] };

            if (mode === 'revise') {
              newCell.history.push({
                value,
                changedBy: getCurrentUserName(),
                changedAt: new Date().toISOString(),
                reason
              });
              newCell.current = value;
            } else if (mode === 'update') {
              if (newCell.history.length === 0) {
                newCell.history.push({
                  value,
                  changedBy: getCurrentUserName(),
                  changedAt: new Date().toISOString(),
                  reason: null
                });
              }
              newCell.current = value;
            }

            const newRows = { ...currentRow, cells: { ...currentRow.cells } };
            newRows.cells[cId] = newCell;
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
            historyCount: data ? data.history.length : 0,
            currentValue: data ? data.current : ''
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

  const getStatusToken = (status: string) => {
    return (StatusTokens as any)[status] || { bg: theme.subBg, fg: theme.cellFg };
  };

  const renderCell = (row: RowData & { id: string }, col: ColumnData & { id: string }, rowIndex: number) => {
    const cellValue = row.cells[col.id];

    if (col.type === 'text') {
      let isRevised = false;
      for (const key of Object.keys(row.cells)) {
         const colDef = columnsMap.get(key);
         if (colDef && colDef.type === 'daterange') {
           const dData = row.cells[key] as DateRangeData | null;
           if (dData && dData.history && dData.history.length > 1) {
             isRevised = true;
             break;
           }
         }
      }
      return (
        <AutoLayout width="fill-parent" verticalAlignItems="center" spacing={8}>
          <Text fill={theme.subFg} fontSize={14} width={20}>{rowIndex + 1}.</Text>
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
              fontSize={14}
              width={isRevised ? 160 : "fill-parent"}
            />
            {isRevised && <Text fill={theme.subFg} fontSize={14} italic>(revised)</Text>}
          </AutoLayout>
        </AutoLayout>
      );
    }

    if (col.type === 'status') {
      const val = cellValue as string;
      if (!val) {
        return <Text fill={theme.subFg} fontSize={14} italic onClick={() => handleCellClick(row.id, col)}>Select...</Text>;
      }
      const token = getStatusToken(val);
      return (
        <AutoLayout
          fill={token.bg}
          padding={{ horizontal: 8, vertical: 4 }}
          cornerRadius={999}
          onClick={() => handleCellClick(row.id, col)}
        >
          <Text fill={token.fg} fontSize={12} fontWeight="bold">{val}</Text>
        </AutoLayout>
      );
    }

    if (col.type === 'daterange') {
      const data = cellValue as DateRangeData | null;
      if (!data || !data.current) {
        return <Text fill={theme.subFg} fontSize={14} italic onClick={() => handleCellClick(row.id, col)}>Set date...</Text>;
      }

      const historyCount = Math.max(0, data.history.length - 1);

      let tooltip = '';
      if (historyCount > 0) {
         tooltip = data.history.slice().reverse().map((h, i) => {
           const label = i === 0 ? '(current)' : '(revised)';
           return `${formatFriendlyDate(h.value)} ${label}\n\u21B3 set ${new Date(h.changedAt).toLocaleDateString()} by ${h.changedBy}${h.reason ? ` - "${h.reason}"` : ''}`;
         }).join('\n\n');
      }

      return (
        <AutoLayout verticalAlignItems="center" spacing={4} onClick={() => handleCellClick(row.id, col)} tooltip={tooltip || undefined} width="fill-parent" horizontalAlignItems="center">
          <Text fill={theme.cellFg} fontSize={14} width="fill-parent" horizontalAlignText="center">{formatFriendlyDate(data.current)}</Text>
          {historyCount > 0 && (
            <AutoLayout verticalAlignItems="center" spacing={2} fill={theme.subBg} cornerRadius={4} padding={{ horizontal: 4, vertical: 2 }}>
              <SVG src={getInfoIcon(theme.accent)} />
              <Text fill={theme.accent} fontSize={10}>{historyCount}</Text>
            </AutoLayout>
          )}
        </AutoLayout>
      );
    }

    // Assignee
    let valStr = '';
    if (Array.isArray(cellValue)) {
      valStr = cellValue.join(', ');
    } else if (typeof cellValue === 'string') {
      valStr = cellValue;
    }

    if (!valStr) {
      return <Text fill={theme.subFg} fontSize={14} italic onClick={() => handleCellClick(row.id, col)}>Select...</Text>;
    }
    return (
      <AutoLayout onClick={() => handleCellClick(row.id, col)} horizontalAlignItems="center" width="fill-parent">
        <Text fill={theme.cellFg} fontSize={14} width="fill-parent" horizontalAlignText="center">{valStr} &#x25BE;</Text>
      </AutoLayout>
    );
  };

  return (
    <AutoLayout
      direction="vertical"
      fill={theme.bg}
      cornerRadius={8}
      stroke={theme.border}
      strokeWidth={1}
    >
      {/* Title Bar */}
      <AutoLayout
        width="fill-parent"
        height={64}
        fill={theme.headerBg}
        padding={{ horizontal: 24 }}
        verticalAlignItems="center"
        spacing="auto"
      >
        <Input
          value={projectName.toUpperCase()}
          onTextEditEnd={(e) => {
            setProjectName(e.characters);
            updateLastEdited();
          }}
          fontSize={16}
          fontWeight="bold"
          fill={theme.headerFg}
          width={300}
        />
        <AutoLayout verticalAlignItems="center" spacing={12}>
          <Text fill={theme.subFg} fontSize={12}>Last edited: {lastEditedBy}</Text>
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
                padding={8}
                hoverStyle={planEnabled ? { fill: theme.subBg } : undefined}
                cornerRadius={4}
                opacity={planEnabled ? 1 : 0.35}
                onClick={planEnabled ? handleOpenPlan : undefined}
                tooltip={planTooltip}
              >
                <SVG src={getCalendarIcon(theme.subFg)} />
              </AutoLayout>
            );
          })()}
          <AutoLayout
            padding={8}
            hoverStyle={{ fill: theme.subBg }}
            cornerRadius={4}
            onClick={handleOpenSettings}
          >
            <SVG src={getSettingsIcon(theme.subFg)} />
          </AutoLayout>
        </AutoLayout>
      </AutoLayout>

      {/* Columns Header */}
      <AutoLayout width="fill-parent" height={1} fill={theme.border} />
      <AutoLayout width="fill-parent" fill={theme.bg} verticalAlignItems="center">
        {columns.flatMap((col, i) => {
          const cell = (
            <AutoLayout key={col.id} width={col.type === 'text' ? 260 : (col.type === 'daterange' ? 180 : 150)} padding={{ horizontal: 24, vertical: 20 }} horizontalAlignItems={col.type === 'text' ? 'start' : 'center'} overflow="hidden">
              <Text fill={theme.headerFg} fontSize={14} fontWeight="bold">{col.name}</Text>
            </AutoLayout>
          );
          if (i > 0) {
            return [
              <AutoLayout key={`div-col-${col.id}`} width={1} height="fill-parent" fill={theme.border} />,
              cell
            ];
          }
          return [cell];
        })}
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
            fill={theme.rowBg}
            verticalAlignItems="center"
          >
            {columns.flatMap((col, i) => {
              const cell = (
                <AutoLayout key={col.id} width={col.type === 'text' ? 260 : (col.type === 'daterange' ? 180 : 150)} padding={{ horizontal: 24, vertical: 20 }} horizontalAlignItems={col.type === 'text' ? 'start' : 'center'} overflow="hidden">
                   {renderCell(row, col, index)}
                </AutoLayout>
              );
              if (i > 0) {
                return [
                  <AutoLayout key={`div-row-${row.id}-${col.id}`} width={1} height="fill-parent" fill={theme.border} />,
                  cell
                ];
              }
              return [cell];
            })}
          </AutoLayout>
        </AutoLayout>
      ))}

      {/* Footer Add Row */}
      <AutoLayout width="fill-parent" height={1} fill={theme.border} />
      <AutoLayout
        width="fill-parent"
        height={52}
        padding={{ horizontal: 24 }}
        verticalAlignItems="center"
        onClick={handleAddRow}
        hoverStyle={{ fill: theme.rowAltBg }}
      >
        <Text fill={theme.accent} fontSize={14} fontWeight="bold">+ Add row</Text>
      </AutoLayout>
    </AutoLayout>
  );
}
