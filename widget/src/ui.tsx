import { h, Fragment } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { emit, on } from '@create-figma-plugin/utilities';
import { render } from '@create-figma-plugin/ui';
import { UIMode, ColumnData, RosterMember, DatePickerData, DropdownData } from './types';
import '!./ui.css';

function Plugin(props: any) {
  const mode = props.type;

  // When main.tsx opens a UI panel, it sends 'request-focus' via postMessage.
  // We receive it here and focus the first input using requestAnimationFrame,
  // which gives the iframe's render cycle time to complete before focusing.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.pluginMessage?.type === 'request-focus') {
        requestAnimationFrame(() => {
          const firstInput = document.querySelector<HTMLElement>('input, textarea, [contenteditable]');
          if (firstInput) firstInput.focus();
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!mode) {
    return (
      <div className="modal-body" style={{ color: 'var(--text-sub)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      {mode === 'date-picker' && <DatePicker {...props.data} />}
      {mode === 'settings' && <Settings initialColumns={props.columns} rows={props.rows} roster={props.roster} themeName={props.themeName} />}
      {mode === 'dropdown' && <CellDropdown {...props.data} />}
      {mode === 'plan' && <PlanPopup rows={props.rows} columns={props.columns} />}
      {mode === 'copy-clipboard' && <CopyClipboard text={props.text} />}
    </div>
  );
}

function getRowLabel(row: any, columns: any[], idx: number): string {
  const textCol = columns.find((c: any) => c.type === 'text');
  if (textCol) {
    const val = row.cells?.[textCol.id];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return `Row ${idx + 1}`;
}

function buildISODateRange(startDate: string, endDate: string): string {
  if (startDate && endDate && startDate !== endDate) {
    return `${startDate} \u2013 ${endDate}`;
  }
  if (startDate) return startDate;
  if (endDate) return endDate;
  return '';
}

// Symmetric inverse of buildISODateRange.
// ' – ' is the ONLY separator buildISODateRange ever writes, so we split on exactly that.
function parseISODateRange(value: string): [string, string] {
  if (!value) return ['', ''];
  const SEP = ' \u2013 '; // exact separator used by buildISODateRange
  const idx = value.indexOf(SEP);
  if (idx !== -1) {
    return [value.slice(0, idx), value.slice(idx + SEP.length)];
  }
  // Single date — prefill both fields with the same value.
  return [value.trim(), value.trim()];
}

// Returns the start portion of a stored cell value, or '' if it's not a valid ISO date.
function extractStartDate(value: string): string {
  const [start] = parseISODateRange(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : '';
}

// Team Assignee Avatar Palette index hash — deterministic, mirrors main.tsx:767
function avatarIndex(name: string): number {
  return name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 6;
}

// Preset template definitions matching the design system
const TEMPLATE_CARDS = [
  {
    name: 'Blank',
    desc: 'Minimalist layout with single date range',
    tag: 'Clean',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    )
  },
  {
    name: 'Design & Experience',
    desc: 'Product discovery, UX, UI, and review',
    tag: 'Popular',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1 9.5l4-4 2 2 4-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M8 2.5h3v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    name: 'Design Sprint',
    desc: '5-day rapid prototyping framework',
    tag: '5 Days',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 10.5V2l7 3.5-7 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    name: 'Product Design',
    desc: 'Feature lifecycle from spec to dev handoff',
    tag: 'Standard',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M6 3.5v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    name: 'Brand/Marketing',
    desc: 'Campaign timeline & multi-channel deliverables',
    tag: 'Creative',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M10 2L3 6l7 4V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    name: 'UX Research',
    desc: 'Participant synthesis & qualitative studies',
    tag: 'Research',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M8.5 8.5L10.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    name: 'Design Systems',
    desc: 'Component library build-out & governance',
    tag: 'Systems',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="2" y="2" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="6.5" y="2" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="2" y="6.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="6.5" y="6.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    )
  }
];

function DatePicker({ rowId, colId, colName, rowIdentifier, currentValue }: DatePickerData) {
  const [initialStart, initialEnd] = parseISODateRange(currentValue);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);

  useEffect(() => {
    if (initialStart) setStartDate(initialStart);
    if (initialEnd) setEndDate(initialEnd);
  }, [currentValue]);

  const handleSubmit = () => {
    const value = buildISODateRange(startDate, endDate);

    emit('submit-date', {
      rowId,
      colId,
      value
    });
  };

  const submitDisabled = !startDate && !endDate;

  return (
    <div className="modal-body" style={{ gap: '12px' }}>
      <div>
        <div className="modal-heading">
          {rowIdentifier} &ndash; {colName}
        </div>
        <div style={{ color: 'var(--text-sub)', fontSize: '11px' }}>
          Date Range:
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate((e.target as HTMLInputElement).value)}
          className="form-date-input"
          style={{ flex: 1 }}
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate((e.target as HTMLInputElement).value)}
          className="form-date-input"
          style={{ flex: 1 }}
        />
      </div>
      <button
        type="button"
        className="btn-primary"
        style={{ width: '100%', marginTop: '6px' }}
        onClick={handleSubmit}
        disabled={submitDisabled}
      >
        Set Date
      </button>
    </div>
  );
}

function Settings({ initialColumns, rows: initialRows, roster: initialRoster, themeName: initialTheme }: { initialColumns: (ColumnData & { id: string })[], rows?: any[], roster: ({ id: string } & RosterMember)[], themeName: 'dark' | 'light' }) {
  // F10: currentTheme state removed — theme is now a native property-menu dropdown on the widget.
  const [tab, setTab] = useState<'roster' | 'templates' | 'rows' | 'columns'>('roster');
  const [localRoster, setLocalRoster] = useState(initialRoster);
  const [localColumns, setLocalColumns] = useState(initialColumns);
  // F9: Local column name state — edits stay in the iframe until blur to avoid
  // per-keystroke map mutations that re-render the widget on every multiplayer client.
  const [localColNames, setLocalColNames] = useState<Record<string, string>>(
    () => Object.fromEntries(initialColumns.map(c => [c.id, c.name]))
  );
  const [localRows, setLocalRows] = useState(initialRows || []);
  const [newName, setNewName] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [confirmPending, setConfirmPending] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [confirmRemoveRowId, setConfirmRemoveRowId] = useState<string | null>(null);
  const rosterInputRef = useRef<HTMLInputElement>(null);

  // When the Roster tab becomes active, focus the "New name" input.
  // The 150ms delay gives Figma time to yield OS focus to the iframe.
  useEffect(() => {
    if (tab === 'roster') {
      const timer = setTimeout(() => {
        rosterInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [tab]);

  useEffect(() => {
    const unsubRoster = on('update-roster' as any, (updated: any[]) => setLocalRoster(updated));
    const unsubCols = on('update-columns' as any, (updated: any[]) => {
      setLocalColumns(updated);
      // F9: Keep local name state in sync with confirmed widget state.
      setLocalColNames(Object.fromEntries(updated.map((c: any) => [c.id, c.name])));
      setWarningMsg('');
    });
    const unsubRows = on('update-rows' as any, (updated: any[]) => setLocalRows(updated));
    const unsubWarn = on('column-warning' as any, (msg: string) => setWarningMsg(msg));
    return () => { unsubRoster(); unsubCols(); unsubRows(); unsubWarn(); };
  }, []);

  const handleAddName = () => {
    if (newName.trim()) {
      emit('add-roster-name', newName.trim());
      setNewName('');
    }
  };

  const handleApplyTemplate = (templateName: string) => {
    // Show inline confirm — never use window.confirm() in Figma iframes.
    // The native dialog steals OS focus from the iframe and never returns it.
    setConfirmPending(templateName);
  };

  const handleConfirmApply = () => {
    if (confirmPending) {
      emit('apply-template', confirmPending);
      setConfirmPending(null);
      // Refocus the first input after the re-render settles
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('input, textarea');
        if (first) first.focus();
      });
    }
  };

  const handleCancelApply = () => {
    setConfirmPending(null);
    // Restore focus after dismissing the confirm
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>('input, textarea');
      if (first) first.focus();
    });
  };

  return (
    <div className="settings-container">
      <div className="seg-tabs">
        <button
          type="button"
          className={`seg-tab ${tab === 'roster' ? 'active' : ''}`}
          onClick={() => setTab('roster')}
        >
          Roster
        </button>
        <button
          type="button"
          className={`seg-tab ${tab === 'templates' ? 'active' : ''}`}
          onClick={() => setTab('templates')}
        >
          Templates
        </button>
        <button
          type="button"
          className={`seg-tab ${tab === 'rows' ? 'active' : ''}`}
          onClick={() => setTab('rows')}
        >
          Rows
        </button>
        <button
          type="button"
          className={`seg-tab ${tab === 'columns' ? 'active' : ''}`}
          onClick={() => setTab('columns')}
        >
          Columns
        </button>
      </div>

      {warningMsg && (
        <div className="warning-banner" style={{ marginTop: '12px' }}>
          {warningMsg}
        </div>
      )}

      {tab === 'roster' && (
        <div className="tab-content-area">
          {localRoster.length === 0 ? (
            <div className="empty-state">
              <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.6 }}>
                <circle cx="20" cy="20" r="19" stroke="var(--border-hairline)" strokeWidth="2"/>
                <path d="M20 23C22.2091 23 24 21.2091 24 19C24 16.7909 22.2091 15 20 15C17.7909 15 16 16.7909 16 19C16 21.2091 17.7909 23 20 23Z" stroke="var(--text-sub)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M26 29C26 26.7909 23.3137 25 20 25C16.6863 25 14 26.7909 14 29" stroke="var(--text-sub)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{ fontWeight: 500, color: 'var(--text-body)' }}>No members in roster yet.</div>
              <div style={{ fontSize: '10px', color: 'var(--text-sub)' }}>Team assignees added here will be available in timeline dropdowns.</div>
            </div>
          ) : (
            <div className="roster-list">
              {localRoster.map(r => (
                <div key={r.id} className="roster-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={`avatar avatar-${avatarIndex(r.name)}`}>
                      {r.name.trim() ? r.name.trim()[0].toUpperCase() : '?'}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-body)' }}>{r.name}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-row-remove"
                    onClick={() => emit('remove-roster-name', r.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input
              ref={rosterInputRef}
              type="text"
              value={newName}
              onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
              placeholder="New member name..."
              className="form-input"
              style={{ flex: 1 }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddName(); }}
            />
            <button
              type="button"
              className="btn-ghost-dashed"
              style={{ whiteSpace: 'nowrap' }}
              onClick={handleAddName}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Add member
            </button>
          </div>
        </div>
      )}

      {tab === 'rows' && (
        <div className="tab-content-area">
          {localRows.length === 0 ? (
            <div className="empty-state">
              No rows added yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {localRows.map((r, i) => (
                <div
                  key={r.id}
                  draggable={true}
                  onDragStart={(e) => {
                    setDraggedRowId(r.id);
                    if (e.dataTransfer) {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', r.id);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                    setDragOverRowId(r.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverRowId === r.id) setDragOverRowId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedId = e.dataTransfer?.getData('text/plain');
                    if (droppedId && droppedId !== r.id) {
                      const targetIndex = i;
                      emit('reorder-row-drop', { draggedId: droppedId, targetIndex });
                    }
                    setDraggedRowId(null);
                    setDragOverRowId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedRowId(null);
                    setDragOverRowId(null);
                  }}
                  className="list-item"
                  style={{
                    opacity: draggedRowId === r.id ? 0.4 : 1,
                    backgroundColor: dragOverRowId === r.id ? 'var(--figma-color-bg-hover, rgba(255,255,255,0.05))' : undefined,
                    boxShadow: dragOverRowId === r.id ? 'inset 0 0 0 1px var(--accent-focus-ring)' : undefined,
                  }}
                >
                  <div
                    className="drag-handle"
                    style={{ cursor: draggedRowId === r.id ? 'grabbing' : 'grab' }}
                  >
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                      <circle cx="2.5" cy="2.5" r="1.2" fill="currentColor"/>
                      <circle cx="7.5" cy="2.5" r="1.2" fill="currentColor"/>
                      <circle cx="2.5" cy="7" r="1.2" fill="currentColor"/>
                      <circle cx="7.5" cy="7" r="1.2" fill="currentColor"/>
                      <circle cx="2.5" cy="11.5" r="1.2" fill="currentColor"/>
                      <circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-body)', fontWeight: 500 }}>
                      {getRowLabel(r, localColumns, i)}
                    </span>
                  </div>
                  <div>
                    {confirmRemoveRowId === r.id ? (
                      <span className="inline-confirm">
                        <span className="confirm-label">Delete?</span>
                        <span
                          className="confirm-yes"
                          onClick={() => { emit('remove-row', r.id); setConfirmRemoveRowId(null); }}
                        >
                          Yes
                        </span>
                        <span
                          className="confirm-cancel"
                          onClick={() => setConfirmRemoveRowId(null)}
                        >
                          Cancel
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-row-remove"
                        onClick={() => setConfirmRemoveRowId(r.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <button
              type="button"
              className="btn-ghost-dashed"
              style={{ width: '100%' }}
              onClick={() => emit('add-row')}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Add row
            </button>
          </div>
        </div>
      )}

      {tab === 'columns' && (
        <div className="tab-content-area">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {localColumns.map((c, i) => {
              const isFirst = i === 0;
              return (
                <div
                  key={c.id}
                  draggable={!isFirst}
                  onDragStart={(e) => {
                    if (isFirst) { e.preventDefault(); return; }
                    setDraggedId(c.id);
                    if (e.dataTransfer) {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', c.id);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                    setDragOverId(c.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverId === c.id) setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedId = e.dataTransfer?.getData('text/plain');
                    if (droppedId && droppedId !== c.id) {
                      const targetIndex = Math.max(1, i); // Clamp to position 2 (index 1)
                      emit('reorder-column-drop', { draggedId: droppedId, targetIndex });
                    }
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                  className="list-item"
                  style={{
                    opacity: draggedId === c.id ? 0.4 : 1,
                    backgroundColor: dragOverId === c.id ? 'var(--figma-color-bg-hover, rgba(255,255,255,0.05))' : undefined,
                    boxShadow: dragOverId === c.id ? 'inset 0 0 0 1px var(--accent-focus-ring)' : undefined,
                  }}
                >
                  <div
                    className="drag-handle"
                    style={{ cursor: isFirst ? 'default' : (draggedId === c.id ? 'grabbing' : 'grab'), color: isFirst ? 'var(--text-sub)' : undefined }}
                  >
                    {isFirst ? (
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                        <rect x="1.5" y="4.5" width="7" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M3 4.5V3a2 2 0 114 0v1.5" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                    ) : (
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                        <circle cx="2.5" cy="2.5" r="1.2" fill="currentColor"/>
                        <circle cx="7.5" cy="2.5" r="1.2" fill="currentColor"/>
                        <circle cx="2.5" cy="7" r="1.2" fill="currentColor"/>
                        <circle cx="7.5" cy="7" r="1.2" fill="currentColor"/>
                        <circle cx="2.5" cy="11.5" r="1.2" fill="currentColor"/>
                        <circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={localColNames[c.id] ?? c.name}
                      readOnly={c.locked}
                      onChange={e => {
                        // F9: Update local state only — no widget emit per keystroke.
                        const val = (e.target as HTMLInputElement).value;
                        setLocalColNames(prev => ({ ...prev, [c.id]: val }));
                      }}
                      onBlur={e => {
                        // F9: Emit to widget only on blur (commit).
                        emit('update-column', { id: c.id, updates: { name: (e.target as HTMLInputElement).value } });
                      }}
                      className="form-input"
                      style={{
                        width: '100%',
                        background: c.locked ? 'transparent' : undefined,
                        borderColor: c.locked ? 'transparent' : undefined,
                        cursor: c.locked ? 'default' : undefined
                      }}
                    />
                  </div>
                  {c.locked ? (
                    <span className="locked-badge">Text (Primary)</span>
                  ) : (
                    <div style={{ width: '104px' }}>
                      <select
                        className="form-select"
                        value={c.type}
                        onChange={e => emit('update-column', { id: c.id, updates: { type: e.currentTarget.value } })}
                        disabled={c.locked}
                        style={{ width: '100%' }}
                      >
                        <option value="daterange">Date Range</option>
                        <option value="text">Text</option>
                        <option value="status">Status</option>
                        <option value="assignee">Assignee</option>
                      </select>
                    </div>
                  )}
                  <div style={{ width: '50px', textAlign: 'right' }}>
                    {!c.locked && (
                      <button
                        type="button"
                        className="btn-row-remove"
                        onClick={() => emit('remove-column', c.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <button
              type="button"
              className="btn-ghost-dashed"
              style={{ width: '100%' }}
              onClick={() => emit('add-column')}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Add column
            </button>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="tab-content-area">
          <div className="template-banner">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#F7D15F', flexShrink: 0, marginTop: '2px' }}>
              <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 5.5v3M7 10h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <div>Select a preset timeline structure. Replaces milestone columns but keeps your existing task names.</div>
          </div>

          {confirmPending ? (
            <div className="toast-danger">
              <div>
                Apply <strong>{confirmPending}</strong> template? Replaces milestone columns but keeps your existing task names.
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    flex: 1,
                    background: 'var(--status-blocked-bg)',
                    border: '1px solid var(--status-blocked-fg)',
                    color: 'var(--status-blocked-fg)'
                  }}
                  onClick={handleConfirmApply}
                >
                  Yes, apply
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={handleCancelApply}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {TEMPLATE_CARDS.map(t => (
                <div
                  key={t.name}
                  className="template-card"
                  onClick={() => handleApplyTemplate(t.name)}
                >
                  <div className="template-left">
                    <div className="template-icon-wrap">
                      {t.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-header)' }}>
                        {t.name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>
                        {t.desc}
                      </span>
                    </div>
                  </div>
                  <span className="template-tag">{t.tag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="modal-footer">
        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={() => emit('close-settings')}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function CellDropdown({ rowId, colId, colName, rowIdentifier, type, options, currentValue }: DropdownData) {
  // Normalize currentValue to array for assignees, keep as string for status
  const [selected, setSelected] = useState<string[]>(
    type === 'assignee' 
      ? (Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue as string] : []))
      : [currentValue as string]
  );

  const toggleOption = (opt: string) => {
    if (type === 'assignee') {
      setSelected(prev => 
        prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
      );
    } else {
      // Single select for status
      emit('select-dropdown', { rowId, colId, value: opt });
    }
  };

  const handleDone = () => {
    emit('select-dropdown', { rowId, colId, value: selected });
  };

  return (
    <div className="modal-body" style={{ paddingBottom: type === 'assignee' ? '64px' : '16px' }}>
      <div>
        <div className="modal-heading">
          {rowIdentifier} &ndash; {colName}
        </div>
        <div style={{ color: 'var(--text-sub)', fontSize: '11px', marginBottom: '10px' }}>
          {type === 'assignee' ? 'Assignees:' : 'Status:'}
        </div>
      </div>

      {options.length === 0 ? (
        <div style={{ color: 'var(--text-sub)', fontSize: '11px', padding: '16px 0', textAlign: 'center' }}>
          No members available. Add them in Settings.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {options.map(opt => {
            const isSelected = selected.includes(opt);
            return (
              <div
                key={opt}
                className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleOption(opt)}
              >
                {type === 'assignee' && (
                  <Fragment>
                    <div className="checkbox-box">
                      {isSelected && <div className="checkbox-inner" />}
                    </div>
                    <div className={`avatar avatar-${avatarIndex(opt)}`}>
                      {opt.trim() ? opt.trim()[0].toUpperCase() : '?'}
                    </div>
                  </Fragment>
                )}
                <span style={{ color: isSelected ? 'var(--text-header)' : 'var(--text-body)', fontWeight: isSelected ? 500 : 400 }}>
                  {opt}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {type === 'assignee' && options.length > 0 && (
        <div className="modal-footer">
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={handleDone}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function CopyClipboard({ text }: { text: string }) {
  const [status, setStatus] = useState<'copying' | 'failed' | 'done'>('copying');

  // execCommand fallback — works in Figma plugin iframes where navigator.clipboard is undefined.
  // Creates a hidden textarea, selects all text, calls document.execCommand('copy'), then removes it.
  const execCommandCopy = (): boolean => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      // Position off-screen so it doesn't flash visually
      textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  };

  const performCopy = () => {
    // Try modern Clipboard API first (available in some Figma contexts / future versions)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          emit('copied');
        })
        .catch(() => {
          // Clipboard API rejected — try execCommand fallback
          const ok = execCommandCopy();
          if (ok) {
            emit('copied');
          } else {
            setStatus('failed');
            emit('copy-failed', 'Permission denied');
          }
        });
    } else {
      // navigator.clipboard is undefined (Figma sandboxed iframe) — go straight to execCommand
      const ok = execCommandCopy();
      if (ok) {
        emit('copied');
      } else {
        setStatus('failed');
        emit('copy-failed', 'execCommand copy failed');
      }
    }
  };

  useEffect(() => {
    performCopy();
  }, [text]);

  return (
    <div className="modal-body" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px', minHeight: '120px' }}>
      <div style={{ color: 'var(--text-body)', fontSize: '11px' }}>
        {status === 'failed'
          ? 'Could not copy automatically. Click below to copy.'
          : 'Copying timeline to clipboard...'}
      </div>
      {status === 'failed' && (
        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={performCopy}
        >
          Click to Copy
        </button>
      )}
    </div>
  );
}

// ─── Plan Popup ──────────────────────────────────────────────────────────────

// Business-day helpers
function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function nextBusinessDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (isWeekend(next)) next.setDate(next.getDate() + 1);
  return next;
}

function addBusinessDays(date: Date, n: number): Date {
  if (n <= 0) return new Date(date);
  let result = new Date(date);
  let added = 0;
  while (added < n) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) added++;
  }
  return result;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function rollToBusinessDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  let date = new Date(y, m - 1, d);
  while (isWeekend(date)) date = nextBusinessDay(date);
  return date;
}

interface PlanRowInput {
  rowId: string;
  label: string;
  startDate: string;
  durations: { [colId: string]: string }; // string so input is controlled
}

function PlanPopup({ rows, columns }: { rows: any[], columns: any[] }) {
  const daterangeCols = columns.filter((c: any) => c.type === 'daterange');

  const [planRows, setPlanRows] = useState<PlanRowInput[]>(() =>
    rows.map((row: any, idx: number) => {
      const label = getRowLabel(row, columns, idx);
      const durations: { [colId: string]: string } = {};
      daterangeCols.forEach((c: any) => { durations[c.id] = row.durations?.[c.id] ?? '1'; });

      let initialStart = row.startDate ?? '';
      if (!initialStart && idx === 0 && daterangeCols.length > 0) {
        const firstCellVal = row.cells?.[daterangeCols[0].id];
        if (typeof firstCellVal === 'string') {
          initialStart = extractStartDate(firstCellVal);
        }
      }

      return { rowId: row.id, label, startDate: initialStart, durations };
    })
  );

  const [showConfirm, setShowConfirm] = useState(false);
  const [computed, setComputed] = useState<any[] | null>(null);

  const row1StartMissing = !planRows[0]?.startDate;
  const applyDisabled = row1StartMissing;

  const updateStartDate = (idx: number, val: string) => {
    setPlanRows(prev => prev.map((r, i) => i === idx ? { ...r, startDate: val } : r));
  };

  const updateDuration = (rowIdx: number, colId: string, val: string) => {
    setPlanRows(prev => prev.map((r, i) =>
      i === rowIdx ? { ...r, durations: { ...r.durations, [colId]: val } } : r
    ));
  };

  const computePlan = (): any[] => {
    const results: any[] = [];
    let prevRowEndForChaining: Date | null = null;

    for (let ri = 0; ri < planRows.length; ri++) {
      const pr = planRows[ri];
      let cursor: Date;

      if (pr.startDate) {
        cursor = rollToBusinessDay(pr.startDate);
      } else if (ri > 0 && prevRowEndForChaining) {
        cursor = new Date(prevRowEndForChaining);
      } else {
        // Row 1 with no start date — skip (should be blocked by UI)
        results.push({ rowId: pr.rowId, cells: [], durations: pr.durations, startDate: pr.startDate });
        continue;
      }

      let accumulator = 0;
      const cells: any[] = [];

      for (const col of daterangeCols) {
        const rawDur = parseFloat(pr.durations[col.id] || '1');
        const duration = isNaN(rawDur) || rawDur < 0.5 ? 1 : rawDur;

        let startDate: Date;
        let endDate: Date;

        if (duration < 1) {
          // Half-day (0.5)
          const slotDate = accumulator === 0 ? new Date(cursor) : nextBusinessDay(cursor);
          startDate = slotDate;
          endDate = slotDate;
          accumulator += 0.5;

          if (accumulator >= 1.0) {
            cursor = nextBusinessDay(slotDate);
            accumulator = 0;
          } else {
            cursor = new Date(slotDate);
          }
        } else {
          // Full day or more — absorb leftover accumulator
          const totalSpan = Math.ceil(accumulator + duration);
          startDate = new Date(cursor);
          endDate = totalSpan <= 1 ? new Date(cursor) : addBusinessDays(cursor, totalSpan - 1);
          accumulator = 0;
          cursor = nextBusinessDay(endDate);
        }

        const startISO = toISODate(startDate);
        const endISO = toISODate(endDate);
        const value = buildISODateRange(startISO, endISO);

        cells.push({
          colId: col.id,
          value
        });
      }

      // End of row: determine chaining date for next row
      if (accumulator === 0.5) {
        prevRowEndForChaining = nextBusinessDay(cursor);
      } else {
        prevRowEndForChaining = new Date(cursor);
      }

      results.push({ rowId: pr.rowId, cells, durations: pr.durations, startDate: pr.startDate });
    }

    return results;
  };

  const handleApplyClick = () => {
    const plan = computePlan();
    setComputed(plan);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (computed) {
      emit('apply-plan', computed);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setComputed(null);
  };

  return (
    <div style={{ fontFamily: 'var(--font-family)', fontSize: '11px', color: 'var(--text-body)' }}>
      <div
        className="plan-container"
        style={{
          maxHeight: showConfirm ? 'calc(100vh - 110px)' : 'calc(100vh - 70px)',
          paddingBottom: showConfirm ? '110px' : '72px'
        }}
      >
        {planRows.map((pr, ri) => (
          <div key={pr.rowId} className="plan-card">
            <div className="plan-card-header">
              <div className="plan-task-title">
                {pr.label}
                <span className="plan-task-idx">Row {ri + 1}</span>
              </div>
            </div>

            <div className="plan-date-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="plan-date-label">
                  Start Date{ri === 0 ? <span style={{ color: 'var(--status-blocked-fg)' }}> *</span> : ''}
                </span>
                {ri > 0 && !pr.startDate && (
                  <span className="plan-chain-hint">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M3 2v5a3 3 0 003 3h4M7 7l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Chains from prev row if empty
                  </span>
                )}
              </div>
              <input
                type="date"
                value={pr.startDate}
                onChange={e => updateStartDate(ri, (e.target as HTMLInputElement).value)}
                className="form-date-input"
                style={{ width: '140px' }}
              />
            </div>

            <div className="plan-table-card">
              <table className="plan-table">
                <thead>
                  <tr>
                    <th>Timeline Column</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {daterangeCols.map((col: any) => {
                    const currentDur = pr.durations[col.id] ?? '1';
                    return (
                      <tr key={col.id}>
                        <td>{col.name}</td>
                        <td>
                          <div className="plan-duration-stepper">
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => {
                                const cur = parseFloat(currentDur) || 1;
                                const next = Math.max(0.5, cur - 0.5);
                                updateDuration(ri, col.id, String(next));
                              }}
                            >
                              &minus;
                            </button>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={currentDur}
                              onChange={e => updateDuration(ri, col.id, (e.target as HTMLInputElement).value)}
                              className="stepper-input"
                            />
                            <span className="stepper-unit">d</span>
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => {
                                const cur = parseFloat(currentDur) || 1;
                                const next = cur + 0.5;
                                updateDuration(ri, col.id, String(next));
                              }}
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation banner */}
      {showConfirm ? (
        <div className="modal-footer" style={{ background: 'var(--surface-sub)' }}>
          <div style={{ fontSize: '11px', color: '#F7D15F', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span> This will overwrite existing date values.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-primary"
              style={{
                flex: 1,
                background: 'var(--status-blocked-bg)',
                border: '1px solid var(--status-blocked-fg)',
                color: 'var(--status-blocked-fg)'
              }}
              onClick={handleConfirm}
            >
              Apply Plan
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="modal-footer">
          {row1StartMissing && (
            <div style={{ fontSize: '11px', color: 'var(--status-blocked-fg)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>*</span> Start date is required for the first row
            </div>
          )}
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={handleApplyClick}
            disabled={applyDisabled}
          >
            Apply Plan
          </button>
        </div>
      )}
    </div>
  );
}

export default render(Plugin);
