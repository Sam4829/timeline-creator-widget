import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { emit, on } from '@create-figma-plugin/utilities';
import {
  Container,
  VerticalSpace,
  Button,
  Textbox,
  TextboxMultiline,
  Columns,
  Text,
  Dropdown,
  render
} from '@create-figma-plugin/ui';
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

  if (!mode) return <Container space="medium"><Text>Loading...</Text></Container>;

  return (
    <div>
      {mode === 'date-picker' && <DatePicker {...props.data} />}
      {mode === 'settings' && <Settings initialColumns={props.columns} roster={props.roster} />}
      {mode === 'dropdown' && <CellDropdown {...props.data} />}
    </div>
  );
}

function DatePicker({ rowId, colId, historyCount, currentValue }: DatePickerData) {
  const isFirstSet = historyCount === 0;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRevise, setIsRevise] = useState(!isFirstSet);
  const [reason, setReason] = useState('');

  const parts = currentValue && currentValue.includes('\u2013')
    ? currentValue.split(' \u2013 ')
    : ['', ''];
  const [initialStart, initialEnd] = parts;

  useEffect(() => {
    if (initialStart) setStartDate(initialStart);
    if (initialEnd) setEndDate(initialEnd);
  }, []);

  const handleSubmit = () => {
    let value = '';
    if (startDate && endDate && startDate !== endDate) {
      value = `${startDate} \u2013 ${endDate}`;
    } else if (startDate) {
      value = startDate;
    } else if (endDate) {
      value = endDate;
    }

    emit('submit-date', {
      rowId,
      colId,
      mode: isFirstSet ? 'update' : (isRevise ? 'revise' : 'update'),
      value,
      reason: isRevise && !isFirstSet ? reason : null
    });
  };

  const submitDisabled = (!startDate && !endDate) || (!isFirstSet && isRevise && !reason.trim());

  return (
    <Container space="medium">
      <VerticalSpace space="small" />
      <Text>Date Range</Text>
      <VerticalSpace space="small" />
      <Columns space="small">
        <input type="date" value={startDate} onChange={e => setStartDate((e.target as HTMLInputElement).value)} style={{ width: '100%', padding: '4px' }} />
        <input type="date" value={endDate} onChange={e => setEndDate((e.target as HTMLInputElement).value)} style={{ width: '100%', padding: '4px' }} />
      </Columns>

      {!isFirstSet && (
        <div>
          <VerticalSpace space="large" />
          <div style={{ display: 'flex', gap: '8px' }}>
            <div 
              style={{ flex: 1, padding: '8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid', borderColor: !isRevise ? 'var(--figma-color-border-selected, #18A0FB)' : 'var(--figma-color-border, #e0e0e0)', background: !isRevise ? 'var(--figma-color-bg-selected, rgba(24, 160, 251, 0.1))' : 'transparent' }}
              onClick={() => setIsRevise(false)}
            >
              <div style={{ fontWeight: 'bold', fontSize: '12px', color: !isRevise ? 'var(--figma-color-text-brand, #18A0FB)' : 'var(--figma-color-text, #333)' }}>Update</div>
              <div style={{ fontSize: '10px', color: 'var(--figma-color-text-secondary, #666)', marginTop: '4px' }}>Just fixing a mistake — no history kept</div>
            </div>
            <div 
              style={{ flex: 1, padding: '8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid', borderColor: isRevise ? 'var(--figma-color-border-selected, #18A0FB)' : 'var(--figma-color-border, #e0e0e0)', background: isRevise ? 'var(--figma-color-bg-selected, rgba(24, 160, 251, 0.1))' : 'transparent' }}
              onClick={() => setIsRevise(true)}
            >
              <div style={{ fontWeight: 'bold', fontSize: '12px', color: isRevise ? 'var(--figma-color-text-brand, #18A0FB)' : 'var(--figma-color-text, #333)' }}>Revise</div>
              <div style={{ fontSize: '10px', color: 'var(--figma-color-text-secondary, #666)', marginTop: '4px' }}>Schedule actually changed — keeps a record</div>
            </div>
          </div>
        </div>
      )}

      {isRevise && !isFirstSet && (
        <div>
          <VerticalSpace space="small" />
          <TextboxMultiline
            value={reason}
            onValueInput={setReason}
            placeholder="Reason for schedule change..."
            rows={3}
          />
        </div>
      )}

      <VerticalSpace space="large" />
      <Button fullWidth onClick={handleSubmit} disabled={submitDisabled}>
        {isFirstSet ? 'Set Date' : (isRevise ? 'Submit Revision' : 'Update Date')}
      </Button>
    </Container>
  );
}

function Settings({ initialColumns, roster: initialRoster }: { initialColumns: (ColumnData & { id: string })[], roster: ({ id: string } & RosterMember)[] }) {
  const [tab, setTab] = useState<'roster' | 'structure' | 'templates'>('structure');
  const [localRoster, setLocalRoster] = useState(initialRoster);
  const [localColumns, setLocalColumns] = useState(initialColumns);
  const [newName, setNewName] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [confirmPending, setConfirmPending] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
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
      setWarningMsg('');
    });
    const unsubWarn = on('column-warning' as any, (msg: string) => setWarningMsg(msg));
    return () => { unsubRoster(); unsubCols(); unsubWarn(); };
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

  const columnTypes = [
    { value: 'text', text: 'Text' },
    { value: 'daterange', text: 'Date Range' },
    { value: 'status', text: 'Status' },
    { value: 'assignee', text: 'Assignee' }
  ];

  return (
    <Container space="medium">
      <div style={{ display: 'flex', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--figma-color-border, #e0e0e0)' }}>
        <div onClick={() => setTab('structure')} style={{ cursor: 'pointer' }}>
          <Text style={{ fontWeight: tab === 'structure' ? 'bold' : 'normal', color: tab === 'structure' ? 'var(--figma-color-text, #000)' : 'var(--figma-color-text-secondary, #666)' }}>Structure</Text>
        </div>
        <div onClick={() => setTab('templates')} style={{ cursor: 'pointer' }}>
          <Text style={{ fontWeight: tab === 'templates' ? 'bold' : 'normal', color: tab === 'templates' ? 'var(--figma-color-text, #000)' : 'var(--figma-color-text-secondary, #666)' }}>Templates</Text>
        </div>
        <div onClick={() => setTab('roster')} style={{ cursor: 'pointer' }}>
          <Text style={{ fontWeight: tab === 'roster' ? 'bold' : 'normal', color: tab === 'roster' ? 'var(--figma-color-text, #000)' : 'var(--figma-color-text-secondary, #666)' }}>Roster</Text>
        </div>
      </div>
      <VerticalSpace space="medium" />

      {warningMsg && (
        <div style={{ padding: '8px', background: 'var(--figma-color-bg-danger, #ffebee)', color: 'var(--figma-color-text-danger, #c62828)', borderRadius: '4px', marginBottom: '16px', fontSize: '12px' }}>
          {warningMsg}
        </div>
      )}

      {tab === 'roster' && (
        <div>
          {localRoster.length === 0 && (
            <Text style={{ color: 'var(--figma-color-text-secondary, #666)', marginBottom: '16px', display: 'block' }}>No members in roster yet.</Text>
          )}
          {localRoster.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', alignItems: 'center' }}>
              <Text>{r.name}</Text>
              <div style={{ cursor: 'pointer', color: 'var(--figma-color-text-danger, #ff6b6b)' }} onClick={() => emit('remove-roster-name', r.id)}>
                 Remove
              </div>
            </div>
          ))}
          <VerticalSpace space="medium" />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={rosterInputRef}
              type="text"
              value={newName}
              onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
              placeholder="New name"
              style={{
                flex: 1,
                padding: '6px 8px',
                border: '1px solid var(--figma-color-border, #e0e0e0)',
                borderRadius: '4px',
                background: 'var(--figma-color-bg, #fff)',
                color: 'var(--figma-color-text, #000)',
                fontSize: '11px'
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddName(); }}
            />
            <Button onClick={handleAddName}>Add</Button>
          </div>
        </div>
      )}

      {tab === 'structure' && (
        <div>
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
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', 
                  borderBottom: '1px solid var(--figma-color-border, #f0f0f0)',
                  opacity: draggedId === c.id ? 0.4 : 1,
                  backgroundColor: dragOverId === c.id ? 'var(--figma-color-bg-hover, rgba(0,0,0,0.03))' : 'transparent',
                  boxShadow: dragOverId === c.id ? 'inset 0 0 0 1px var(--figma-color-border-brand, #18A0FB)' : 'none',
                  transition: 'background-color 0.1s, box-shadow 0.1s'
                }}
              >
                <div style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '16px',
                  cursor: isFirst ? 'default' : (draggedId === c.id ? 'grabbing' : 'grab'), 
                  color: isFirst ? 'transparent' : 'var(--figma-color-text-tertiary, #b3b3b3)' 
                }}>
                  {isFirst ? '' : '⣿'}
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    value={c.name} 
                    onChange={e => emit('update-column', { id: c.id, updates: { name: (e.target as HTMLInputElement).value } })}
                    style={{ width: '100%', padding: '4px', border: '1px solid var(--figma-color-border, #e0e0e0)', borderRadius: '2px', background: 'var(--figma-color-bg, #fff)', color: 'var(--figma-color-text, #000)' }}
                  />
                </div>
                <div style={{ width: '100px' }}>
                  <Dropdown 
                    options={columnTypes} 
                    value={c.type} 
                    onChange={e => emit('update-column', { id: c.id, updates: { type: e.currentTarget.value } })}
                    disabled={c.locked}
                  />
                </div>
                <div style={{ width: '50px', textAlign: 'right' }}>
                  {!c.locked && (
                    <span style={{ cursor: 'pointer', color: 'var(--figma-color-text-danger, #ff6b6b)', fontSize: '12px' }} onClick={() => emit('remove-column', c.id)}>Remove</span>
                  )}
                </div>
              </div>
            );
          })}
          <VerticalSpace space="medium" />
          <Button onClick={() => emit('add-column')}>+ Add column</Button>
        </div>
      )}

      {tab === 'templates' && (
        <div>
          <Text style={{ color: 'var(--figma-color-text-secondary, #666)', marginBottom: '16px', display: 'block' }}>Select a preset timeline structure. Warning: this replaces current data.</Text>
          {confirmPending ? (
            <div style={{ padding: '12px', background: 'var(--figma-color-bg-secondary, #f5f5f5)', border: '1px solid var(--figma-color-border, #e0e0e0)', borderRadius: '6px' }}>
              <Text style={{ display: 'block', marginBottom: '12px', fontSize: '12px', color: 'var(--figma-color-text, #000)' }}>
                Apply <strong>{confirmPending}</strong> template? This will replace all current columns and rows.
              </Text>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button danger fullWidth onClick={handleConfirmApply}>Yes, apply</Button>
                <Button secondary fullWidth onClick={handleCancelApply}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button secondary fullWidth onClick={() => handleApplyTemplate('Blank')}>Blank</Button>
              <Button secondary fullWidth onClick={() => handleApplyTemplate('Polaris D&E')}>Polaris D&E</Button>
              <Button secondary fullWidth onClick={() => handleApplyTemplate('Design Sprint')}>Design Sprint</Button>
              <Button secondary fullWidth onClick={() => handleApplyTemplate('Dev Timeline')}>Dev Timeline</Button>
            </div>
          )}
        </div>
      )}

      <VerticalSpace space="large" />
      <Button fullWidth onClick={() => emit('close-settings')}>Done</Button>
    </Container>
  );
}

function CellDropdown({ rowId, colId, type, options, currentValue }: DropdownData) {
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
    <Container space="small">
      <VerticalSpace space="small" />
      <Text>Select {type}</Text>
      <VerticalSpace space="small" />
      {options.length === 0 ? (
        <Text style={{ color: 'var(--figma-color-text-secondary, #666)' }}>No members available. Add them in Settings.</Text>
      ) : (
        <div style={{ paddingBottom: type === 'assignee' ? '50px' : '0' }}>
          {options.map(opt => (
            <div
              key={opt}
              style={{
                padding: '8px',
                cursor: 'pointer',
                background: selected.includes(opt) ? 'var(--figma-color-bg-selected, rgba(24, 160, 251, 0.1))' : 'transparent',
                color: selected.includes(opt) ? 'var(--figma-color-text-brand, #18A0FB)' : 'var(--figma-color-text, #000)',
                borderRadius: '4px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => toggleOption(opt)}
            >
              {type === 'assignee' && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '1px solid currentColor',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {selected.includes(opt) && <div style={{ width: '8px', height: '8px', background: 'currentColor' }} />}
                </div>
              )}
              <Text style={{ color: 'inherit' }}>{opt}</Text>
            </div>
          ))}
        </div>
      )}
      
      {type === 'assignee' && options.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: 'var(--figma-color-bg, #fff)' }}>
          <Button fullWidth onClick={handleDone}>Done</Button>
        </div>
      )}
    </Container>
  );
}

export default render(Plugin);
