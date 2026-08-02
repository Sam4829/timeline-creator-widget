export const ThemeTokens = {
  dark: {
    bg: '#222222',
    headerBg: '#222222',
    headerFg: '#ffffff',
    subBg: '#2d2d2d',
    subFg: '#888888',
    rowBg: '#222222',
    rowAltBg: '#222222',
    cellFg: '#e0e0e0',
    border: '#333333',
    accent: '#ff6b6b'
  },
  light: {
    bg: '#ffffff',
    headerBg: '#f5f5f5',
    headerFg: '#000000',
    subBg: '#eeeeee',
    subFg: '#666666',
    rowBg: '#fafafa',
    rowAltBg: '#f5f5f5',
    cellFg: '#333333',
    border: '#cccccc',
    accent: '#d32f2f'
  }
};

export const StatusTokens = {
  'WIP': { bg: '#1e3a1e', fg: '#6fcf6f' },
  'Done': { bg: '#1a2d1a', fg: '#4caf50' },
  'Yet to start': { bg: '#1e1e3a', fg: '#8888cc' },
  'Blocked': { bg: '#3a1a1a', fg: '#e57373' },
  'In review': { bg: '#3a2a10', fg: '#ffb74d' }
};

export const FIXED_STATUSES = ['WIP', 'Done', 'Yet to start', 'Blocked', 'In review'];
