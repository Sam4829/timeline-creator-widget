/// <reference types="@figma/plugin-typings" />
import { h, Fragment, JSX } from 'preact'
import { useState, useCallback, useEffect, useMemo, useRef } from 'preact/hooks'
import {
  Button,
  Container,
  render,
  Textbox,
  Dropdown,
  VerticalSpace,
  Text,
  Divider,
  IconClose16,
  Disclosure,
  Checkbox,
  Toggle
} from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'

import {
  Column,
  Row,
  PluginData,
  GenerateTimelineHandler,
  ClosePluginHandler,
  GenerateSuccessHandler,
  GenerateErrorHandler
} from './types'

function Plugin() {
  const [activeTab, setActiveTab] = useState<'Setup' | 'Structure' | 'Plan Details' | 'Preview'>('Setup')
  const [projectName, setProjectName] = useState('Timeline Estimation')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [template, setTemplate] = useState('Blank')
  
  const [columns, setColumns] = useState<Column[]>([
    { id: 'c0', name: 'No.', type: 'serial', locked: true },
    { id: 'c1', name: 'Task', type: 'text', locked: true },
    { id: 'c2', name: 'Start & End Date', type: 'daterange' },
    { id: 'c3', name: 'Status', type: 'status' }
  ])

  const [rows, setRows] = useState<Row[]>([
    { id: 'r1', cells: ['', 'Research', '2023-10-01|2023-10-05', 'Done'] },
    { id: 'r2', cells: ['', 'Design', '2023-10-06|2023-10-12', 'WIP'] }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const [enableAssignees, setEnableAssignees] = useState(false)
  const [assigneeNames, setAssigneeNames] = useState<string[]>([])
  const [newAssignee, setNewAssignee] = useState('')

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        generateRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ─── Message Handlers ───
  useEffect(() => {
    const onSuccess = on<GenerateSuccessHandler>('GENERATE_SUCCESS', (res) => {
      setErrorMsg('')
      setIsGenerating(false)
      // Success feedback could go here
    })
    const onError = on<GenerateErrorHandler>('GENERATE_ERROR', (err) => {
      setErrorMsg(err.message)
      setIsGenerating(false)
    })
    return () => {
      onSuccess()
      onError()
    }
  }, [])

  // ─── Actions ───
  const handleGenerate = useCallback(() => {
    if (columns.length === 0) { setErrorMsg('Add at least one column before generating.'); return }
    if (rows.length === 0) { setErrorMsg('Add at least one row before generating.'); return }
    setErrorMsg('')
    setIsGenerating(true)
    const formattedRows = rows.map(r => {
      const formattedCells = r.cells.map((cell, cIdx) => {
         const c = columns[cIdx];
         if (c && (c.type === 'date' || c.type === 'daterange') && cell.includes('|')) {
           const [s, e] = cell.split('|');
           const formatDate = (d: string) => {
             if (!d) return '';
             // Use UTC so we don't get timezone shifts for dates like "YYYY-MM-DD"
             const [y, m, day] = d.split('-');
             if (y && m && day) {
               const date = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(day)));
               return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
             }
             return d;
           }
           const sFmt = formatDate(s);
           const eFmt = formatDate(e);
           if (sFmt && eFmt) return `${sFmt} - ${eFmt}`;
           return sFmt || eFmt || '';
         }
         return cell;
      });
      return { ...r, cells: formattedCells };
    });

    emit<GenerateTimelineHandler>('GENERATE_TIMELINE', {
      projectName,
      theme,
      columns,
      rows: formattedRows
    })
  }, [projectName, theme, columns, rows])

  const generateRef = useRef(handleGenerate)
  generateRef.current = handleGenerate

  const handleAddColumn = () => {
    setColumns([...columns, { id: 'c' + Date.now(), name: 'New Column', type: 'text' }])
  }

  const handleUpdateColumn = (idx: number, updates: Partial<Column>) => {
    const newCols = [...columns]
    newCols[idx] = { ...newCols[idx], ...updates }
    setColumns(newCols)
  }

  const handleRemoveColumn = (idx: number) => {
    const newCols = [...columns]
    newCols.splice(idx, 1)
    setColumns(newCols)
    
    // Also remove cell data
    const newRows = rows.map(r => {
      const newCells = [...r.cells]
      newCells.splice(idx, 1)
      return { ...r, cells: newCells }
    })
    setRows(newRows)
  }

  const handleAddRow = () => {
    setRows([...rows, { id: 'r' + Date.now(), cells: new Array(columns.length).fill('') }])
  }

  const handleRemoveRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateCell = (rIdx: number, cIdx: number, val: string) => {
    setRows(prev => prev.map((r, i) =>
      i === rIdx
        ? { ...r, cells: r.cells.map((c, j) => j === cIdx ? val : c) }
        : r
    ))
  }

  // ─── Filtered Rows ───
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows.map((r, i) => ({ row: r, idx: i }))
    const q = searchQuery.toLowerCase()
    return rows
      .map((r, i) => ({ row: r, idx: i }))
      .filter(item => item.row.cells[0]?.toLowerCase().includes(q))
  }, [rows, searchQuery])

  // ─── Layout Styles ───
  const layoutStyle: JSX.CSSProperties = {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: 'var(--figma-color-bg)'
  }

  const sidebarStyle: JSX.CSSProperties = {
    width: '200px',
    borderRight: '1px solid var(--figma-color-border)',
    backgroundColor: 'var(--figma-color-bg-secondary)',
    display: 'flex',
    flexDirection: 'column'
  }

  const navItemStyle = (isActive: boolean): JSX.CSSProperties => ({
    padding: '8px 16px',
    cursor: 'pointer',
    backgroundColor: isActive ? 'var(--figma-color-bg-selected-tertiary)' : 'transparent',
    color: isActive ? 'var(--figma-color-text)' : 'var(--figma-color-text-secondary)',
    fontWeight: isActive ? 600 : 400,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  })

  const contentStyle: JSX.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    position: 'relative'
  }

  // ─── Type Dropdown Options ───
  const typeOptions = [
    { value: 'serial', text: 'Serial No.' },
    { value: 'text', text: 'Text' },
    { value: 'date', text: 'Date' },
    { value: 'daterange', text: 'Date Range' },
    { value: 'status', text: 'Status' },
    { value: 'assignee', text: 'Assignee' }
  ]

  // ─── Template Dropdown Options ───
  const templateOptions = [
    { value: 'Blank', text: 'Blank' },
    { value: 'Polaris', text: 'Polaris' }
  ]

  // ─── Theme Dropdown Options ───
  const themeOptions = [
    { value: 'dark', text: 'Dark' },
    { value: 'light', text: 'Light' }
  ]

  const handleTemplateChange = (val: string) => {
    setTemplate(val)
    if (val === 'Polaris') {
      const polarisCols: Column[] = [
        { id: 'c0', name: 'No.', type: 'serial', locked: true },
        { id: 'c1', name: 'Task / Screen', type: 'text', locked: true },
        { id: 'c2', name: 'Screenshot mapping', type: 'daterange' },
        { id: 'c3', name: 'Master screen analysis', type: 'daterange' },
        { id: 'c4', name: 'VD start date', type: 'date' },
        { id: 'c5', name: 'Draft 1 review', type: 'date' },
        { id: 'c6', name: 'Feedback updates', type: 'date' },
        { id: 'c7', name: 'Final review', type: 'date' },
        { id: 'c8', name: 'Component creation', type: 'date' },
        { id: 'c9', name: 'Responsive check', type: 'date' },
        { id: 'c10', name: 'Release file update', type: 'date' },
        { id: 'c11', name: 'Tech handover', type: 'date' },
        { id: 'c12', name: 'Assignee', type: 'assignee' },
        { id: 'c13', name: 'Current status', type: 'status' }
      ];
      setColumns(polarisCols);
      setRows([
        { id: 'r1', cells: new Array(polarisCols.length).fill('') }
      ]);
    } else if (val === 'Blank') {
      setColumns([
        { id: 'c0', name: 'No.', type: 'serial', locked: true },
        { id: 'c1', name: 'Task', type: 'text', locked: true },
        { id: 'c2', name: 'Start & End Date', type: 'date' },
        { id: 'c3', name: 'Status', type: 'status' }
      ]);
      setRows([
        { id: 'r1', cells: ['', '', '', ''] }
      ]);
    }
  }

  return (
    <div style={layoutStyle}>
      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={{ padding: '16px 16px 8px', fontWeight: 600 }}>Timeline Config</div>
        <Divider />
        <div onClick={() => setActiveTab('Setup')} style={navItemStyle(activeTab === 'Setup')}>
          <span style={{ fontSize: '14px' }}>⚙️</span> Setup
        </div>
        <div onClick={() => setActiveTab('Structure')} style={navItemStyle(activeTab === 'Structure')}>
          <span style={{ fontSize: '14px' }}>📝</span> Structure ({columns.length})
        </div>
        <div onClick={() => setActiveTab('Plan Details')} style={navItemStyle(activeTab === 'Plan Details')}>
          <span style={{ fontSize: '14px' }}>📋</span> Plan Details ({rows.length})
        </div>
        <div style={{ flex: 1 }} />
        <Divider />
        <div onClick={() => setActiveTab('Preview')} style={navItemStyle(activeTab === 'Preview')}>
          <span style={{ fontSize: '14px' }}>▶️</span> Generate
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={contentStyle}>
        <Container space="medium">
          <VerticalSpace space="medium" />

          {activeTab === 'Setup' && (
            <Fragment>
              <Text style={{ color: 'var(--figma-color-text-secondary)' }}>Project details and timeline settings.</Text>
              <VerticalSpace space="large" />
              <Text><label style={{ fontWeight: 600 }}>Project Name</label></Text>
              <VerticalSpace space="small" />
              <Textbox
                value={projectName}
                onValueInput={setProjectName}
              />
              <VerticalSpace space="medium" />
              <Text><label style={{ fontWeight: 600 }}>Template</label></Text>
              <VerticalSpace space="small" />
              <Dropdown
                options={templateOptions}
                value={template}
                onChange={(e) => handleTemplateChange(e.currentTarget.value)}
              />
              <VerticalSpace space="medium" />
              <Text><label style={{ fontWeight: 600 }}>Theme</label></Text>
              <VerticalSpace space="small" />
              <Dropdown
                options={themeOptions}
                value={theme}
                onChange={(e) => setTheme(e.currentTarget.value as 'dark' | 'light')}
              />
              <VerticalSpace space="medium" />
              <Text><label style={{ fontWeight: 600 }}>Assignees</label></Text>
              <VerticalSpace space="small" />
              <Toggle value={enableAssignees} onValueChange={setEnableAssignees}>
                <Text>Add Assignee names</Text>
              </Toggle>
              {enableAssignees && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Textbox value={newAssignee} onValueInput={setNewAssignee} placeholder="Name..." />
                    <Button onClick={() => { if(newAssignee.trim()) { setAssigneeNames([...assigneeNames, newAssignee.trim()]); setNewAssignee('') } }}>Add</Button>
                  </div>
                  <VerticalSpace space="small" />
                  {assigneeNames.map((name, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'var(--figma-color-bg-secondary)', marginBottom: '4px', borderRadius: '4px' }}>
                      <Text>{name}</Text>
                      <div style={{ cursor: 'pointer' }} onClick={() => setAssigneeNames(assigneeNames.filter((_, idx) => idx !== i))}><IconClose16 /></div>
                    </div>
                  ))}
                </div>
              )}
            </Fragment>
          )}

          {activeTab === 'Structure' && (
            <Fragment>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'var(--figma-color-text-secondary)' }}>Manage timeline columns.</Text>
                <div onClick={handleAddColumn} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Text style={{ color: 'var(--figma-color-text-brand)' }}>+ Add</Text>
                </div>
              </div>
              <VerticalSpace space="large" />

              {columns.map((c, idx) => (
                <div key={c.id} style={{ marginBottom: '8px', border: '1px solid var(--figma-color-border)', borderRadius: '4px' }}>
                  <Disclosure title={c.locked ? `${c.name} (Locked)` : c.name} open={true}>
                    <div style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <Text><label style={{ fontWeight: 600 }}>Column Name</label></Text>
                          <VerticalSpace space="small" />
                          <Textbox
                            value={c.name}
                            onValueInput={(v) => handleUpdateColumn(idx, { name: v })}
                            disabled={c.locked}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <Text><label style={{ fontWeight: 600 }}>Type</label></Text>
                          <VerticalSpace space="small" />
                          <Dropdown
                            options={typeOptions}
                            value={c.type}
                            onChange={(e) => handleUpdateColumn(idx, { type: e.currentTarget.value })}
                            disabled={c.locked}
                          />
                        </div>
                      </div>
                      {!c.locked && (
                        <Fragment>
                          <VerticalSpace space="small" />
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div onClick={() => handleRemoveColumn(idx)} style={{ cursor: 'pointer', color: 'var(--figma-color-text-danger)' }}>
                              <Text>Remove</Text>
                            </div>
                          </div>
                        </Fragment>
                      )}
                    </div>
                  </Disclosure>
                </div>
              ))}
            </Fragment>
          )}

          {activeTab === 'Plan Details' && (
            <Fragment>
              <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--figma-color-bg)', padding: '16px 0', borderBottom: '1px solid var(--figma-color-border)', marginBottom: '16px', marginTop: '-16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <Text style={{ color: 'var(--figma-color-text-secondary)' }}>Manage timeline tasks.</Text>
                  <div onClick={handleAddRow} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text style={{ color: 'var(--figma-color-text-brand)' }}>+ Add Row</Text>
                  </div>
                </div>
                
                <Textbox
                  placeholder="Filter tasks by name..."
                  value={searchQuery}
                  onValueInput={setSearchQuery}
                />
              </div>

              {filteredRows.map(({ row, idx }) => (
                <div key={row.id} style={{ marginBottom: '16px', border: '1px solid var(--figma-color-border)', borderRadius: '6px', padding: '16px', backgroundColor: 'var(--figma-color-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Text><label style={{ fontWeight: 600 }}>Row {idx + 1}</label></Text>
                    <div onClick={() => handleRemoveRow(idx)} style={{ cursor: 'pointer' }}>
                      <IconClose16 />
                    </div>
                  </div>
                  
                  {columns.map((c, cIdx) => (
                    <div key={c.id} style={{ marginBottom: '16px' }}>
                      <Text style={{ color: 'var(--figma-color-text-secondary)' }}>{c.name}</Text>
                      <VerticalSpace space="extraSmall" />
                      {c.type === 'serial' ? (
                        <Text style={{ color: 'var(--figma-color-text-secondary)', padding: '4px 0', display: 'block' }}>{idx + 1}</Text>
                      ) : (c.type === 'date' || c.type === 'daterange') ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="date" 
                            value={row.cells[cIdx]?.split('|')[0] || ''} 
                            onChange={e => handleUpdateCell(idx, cIdx, `${e.currentTarget.value}|${row.cells[cIdx]?.split('|')[1] || ''}`)} 
                            style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--figma-color-border)', borderRadius: '2px', background: 'var(--figma-color-bg)', color: 'var(--figma-color-text)' }}
                          />
                          <input 
                            type="date" 
                            value={row.cells[cIdx]?.split('|')[1] || ''} 
                            onChange={e => handleUpdateCell(idx, cIdx, `${row.cells[cIdx]?.split('|')[0] || ''}|${e.currentTarget.value}`)} 
                            style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--figma-color-border)', borderRadius: '2px', background: 'var(--figma-color-bg)', color: 'var(--figma-color-text)' }}
                          />
                        </div>
                      ) : c.type === 'status' ? (
                        <Dropdown
                          options={[
                            { value: '', text: 'None' },
                            { value: 'WIP', text: 'WIP' },
                            { value: 'Done', text: 'Done' },
                            { value: 'Yet to start', text: 'Yet to start' },
                            { value: 'Blocked', text: 'Blocked' },
                            { value: 'In review', text: 'In review' }
                          ]}
                          value={row.cells[cIdx] || ''}
                          onChange={e => handleUpdateCell(idx, cIdx, e.currentTarget.value)}
                        />
                      ) : c.type === 'assignee' ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '4px 0' }}>
                          {assigneeNames.map(name => {
                            const isChecked = (row.cells[cIdx] || '').split(', ').indexOf(name) !== -1
                            return (
                              <Checkbox 
                                key={name}
                                value={isChecked}
                                onValueChange={(checked) => {
                                  const currentNames = (row.cells[cIdx] || '').split(', ').filter(Boolean)
                                  if (checked) {
                                    currentNames.push(name)
                                  } else {
                                    const nIdx = currentNames.indexOf(name)
                                    if (nIdx > -1) currentNames.splice(nIdx, 1)
                                  }
                                  handleUpdateCell(idx, cIdx, currentNames.join(', '))
                                }}
                              >
                                <Text>{name}</Text>
                              </Checkbox>
                            )
                          })}
                          {assigneeNames.length === 0 && <Text style={{ color: 'var(--figma-color-text-secondary)' }}>No assignees configured in Setup.</Text>}
                        </div>
                      ) : (
                        <Textbox
                          value={row.cells[cIdx] || ''}
                          onValueInput={(v) => handleUpdateCell(idx, cIdx, v)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </Fragment>
          )}

          {activeTab === 'Preview' && (
            <Fragment>
              <Text style={{ color: 'var(--figma-color-text-secondary)' }}>Ready to render timeline on canvas.</Text>
              <VerticalSpace space="large" />
              <Button fullWidth onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating…' : 'Generate Timeline (Cmd+G)'}
              </Button>
              {errorMsg && (
                <Fragment>
                  <VerticalSpace space="small" />
                  <Text style={{ color: 'var(--figma-color-text-danger)' }}>{errorMsg}</Text>
                </Fragment>
              )}
            </Fragment>
          )}

          <VerticalSpace space="large" />
        </Container>
      </div>
    </div>
  )
}

export default render(Plugin)
