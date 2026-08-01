import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { DatePicker, PlanPopup, Settings, CellDropdown } from '../ui';
import { mockRows, mockColumns, mockRoster, mockStatusOptions, mockAssigneeOptions } from './mockData';

// Theme CSS variable maps matching Figma's light & dark mode tokens
const THEME_STYLES = {
  dark: {
    '--figma-color-bg': '#2c2c2c',
    '--figma-color-bg-secondary': '#383838',
    '--figma-color-bg-hover': 'rgba(255, 255, 255, 0.05)',
    '--figma-color-bg-selected': 'rgba(24, 160, 251, 0.2)',
    '--figma-color-bg-danger': '#3c1e1e',
    '--figma-color-bg-warning': '#3c3218',
    '--figma-color-text': '#ffffff',
    '--figma-color-text-secondary': '#b3b3b3',
    '--figma-color-text-tertiary': '#757575',
    '--figma-color-text-brand': '#2c9caf',
    '--figma-color-text-danger': '#f26c6c',
    '--figma-color-border': '#444444',
    '--figma-color-border-brand': '#18a0fb',
    '--figma-color-border-selected': '#18a0fb',
  },
  light: {
    '--figma-color-bg': '#ffffff',
    '--figma-color-bg-secondary': '#f5f5f5',
    '--figma-color-bg-hover': 'rgba(0, 0, 0, 0.03)',
    '--figma-color-bg-selected': 'rgba(24, 160, 251, 0.1)',
    '--figma-color-bg-danger': '#ffebee',
    '--figma-color-bg-warning': '#fff8e1',
    '--figma-color-text': '#000000',
    '--figma-color-text-secondary': '#666666',
    '--figma-color-text-tertiary': '#b3b3b3',
    '--figma-color-text-brand': '#18a0fb',
    '--figma-color-text-danger': '#c62828',
    '--figma-color-border': '#e0e0e0',
    '--figma-color-border-brand': '#18a0fb',
    '--figma-color-border-selected': '#18a0fb',
  }
};

type ViewMode = 'inventory' | 'plan' | 'settings' | 'date-picker' | 'dropdown-status' | 'dropdown-assignee';

interface LogItem {
  name: string;
  args: any[];
  timestamp: Date;
}

function DevHarness() {
  const [activeView, setActiveView] = useState<ViewMode>('inventory');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [logs, setLogs] = useState<LogItem[]>([]);

  useEffect(() => {
    const handleEmit = (e: CustomEvent) => {
      const { name, args, timestamp } = e.detail;
      setLogs(prev => [ { name, args, timestamp }, ...prev.slice(0, 49) ]);
    };

    window.addEventListener('harness-emit' as any, handleEmit);
    return () => window.removeEventListener('harness-emit' as any, handleEmit);
  }, []);

  const activeThemeVars = THEME_STYLES[themeMode];

  const renderComponentPanel = (
    title: string,
    width: number,
    height: number,
    componentJsx: h.JSX.Element
  ) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          width: `${width}px`,
          padding: '6px 10px',
          background: '#111',
          border: '1px solid #333',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          fontSize: '11px',
          color: '#aaa'
        }}>
          <span style={{ fontWeight: 600, color: '#fff' }}>{title}</span>
          <span style={{ fontFamily: 'monospace', color: '#888' }}>{width} × {height}</span>
        </div>
        <div
          style={{
            ...activeThemeVars,
            width: `${width}px`,
            height: `${height}px`,
            background: 'var(--figma-color-bg, #fff)',
            color: 'var(--figma-color-text, #000)',
            border: '1px solid #333',
            borderRadius: '0 0 6px 6px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        >
          {componentJsx}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#181818' }}>
      {/* Top Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: '#222',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff', letterSpacing: '-0.3px' }}>
            🛠️ UI Dev Harness
          </span>
          <div style={{ display: 'flex', gap: '4px', background: '#141414', padding: '3px', borderRadius: '6px' }}>
            {[
              { id: 'inventory', label: '🖼️ Inventory (All)' },
              { id: 'plan', label: '📅 Plan' },
              { id: 'settings', label: '⚙️ Settings' },
              { id: 'date-picker', label: '📆 Date Picker' },
              { id: 'dropdown-status', label: '🏷️ Status' },
              { id: 'dropdown-assignee', label: '👥 Assignee' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as ViewMode)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeView === tab.id ? '#333' : 'transparent',
                  color: activeView === tab.id ? '#fff' : '#888',
                  fontSize: '12px',
                  fontWeight: activeView === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#aaa' }}>Theme:</span>
          <button
            onClick={() => setThemeMode(m => m === 'dark' ? 'light' : 'dark')}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: '1px solid #444',
              background: themeMode === 'dark' ? '#333' : '#e0e0e0',
              color: themeMode === 'dark' ? '#fff' : '#000',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {themeMode === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {activeView === 'inventory' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '-16px' }}>
              Comparing all popup interfaces simultaneously under simulated Figma runtime styling:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' }}>
              {renderComponentPanel(
                'Plan Timeline (PlanPopup)',
                450,
                520,
                <PlanPopup rows={mockRows} columns={mockColumns} />
              )}
              {renderComponentPanel(
                'Settings (Templates / Roster / Structure)',
                400,
                500,
                <Settings initialColumns={mockColumns} roster={mockRoster} />
              )}
              {renderComponentPanel(
                'Date Picker (DatePicker)',
                320,
                280,
                <DatePicker rowId="row-1" colId="col-2" currentValue="2025-08-04 – 2025-08-05" />
              )}
              {renderComponentPanel(
                'Status Dropdown (CellDropdown)',
                200,
                240,
                <CellDropdown rowId="row-1" colId="col-4" type="status" options={mockStatusOptions} currentValue="WIP" />
              )}
              {renderComponentPanel(
                'Assignee Dropdown (CellDropdown)',
                200,
                280,
                <CellDropdown rowId="row-1" colId="col-5" type="assignee" options={mockAssigneeOptions} currentValue={['Sagnik']} />
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            {activeView === 'plan' && renderComponentPanel('Plan Timeline', 450, 520, <PlanPopup rows={mockRows} columns={mockColumns} />)}
            {activeView === 'settings' && renderComponentPanel('Settings', 400, 500, <Settings initialColumns={mockColumns} roster={mockRoster} />)}
            {activeView === 'date-picker' && renderComponentPanel('Date Picker', 320, 280, <DatePicker rowId="row-1" colId="col-2" currentValue="2025-08-04 – 2025-08-05" />)}
            {activeView === 'dropdown-status' && renderComponentPanel('Status Dropdown', 200, 240, <CellDropdown rowId="row-1" colId="col-4" type="status" options={mockStatusOptions} currentValue="WIP" />)}
            {activeView === 'dropdown-assignee' && renderComponentPanel('Assignee Dropdown', 200, 280, <CellDropdown rowId="row-1" colId="col-5" type="assignee" options={mockAssigneeOptions} currentValue={['Sagnik']} />)}
          </div>
        )}
      </main>

      {/* Event Logger Drawer */}
      <footer style={{ background: '#111', borderTop: '1px solid #333', maxHeight: '180px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 16px', background: '#181818', borderBottom: '1px solid #282828' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#aaa' }}>
            📡 Event Log ({logs.length})
          </span>
          <button
            onClick={() => setLogs([])}
            style={{ padding: '2px 8px', fontSize: '10px', background: '#222', border: '1px solid #333', color: '#888', borderRadius: '3px', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 16px', fontFamily: 'monospace', fontSize: '11px', flex: 1 }}>
          {logs.length === 0 ? (
            <span style={{ color: '#555' }}>Click buttons or inputs above to see emitted plugin events...</span>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: '4px', color: '#6fcf6f' }}>
                <span style={{ color: '#666', marginRight: '8px' }}>
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span style={{ fontWeight: 600, color: '#18a0fb' }}>emit('{log.name}')</span>: {JSON.stringify(log.args)}
              </div>
            ))
          )}
        </div>
      </footer>
    </div>
  );
}

render(<DevHarness />, document.getElementById('app')!);
