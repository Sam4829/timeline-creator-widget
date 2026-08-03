export const ThemeTokens = {
  dark: {
    bg: '#1E1E1E',
    headerBg: '#1E1E1E',
    headerFg: '#FFFFFF',
    subBg: '#2C2C2C',
    subFg: '#FFFFFF80',
    rowBg: '#1E1E1E',
    rowAltBg: '#2C2C2C',
    cellFg: '#FFFFFFCC',
    border: '#383838',
    accent: '#FFFFFF'
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
    accent: '#000000'
  }
};

export const StatusTokens = {
  'WIP': { bg: '#473956', fg: '#D1A8FF' },
  'Done': { bg: '#2C2C2C', fg: '#10B981' },
  'Yet to start': { bg: '#2C2C2C', fg: '#F7D15F' },
  'Blocked': { bg: '#4d2626', fg: '#ff8a8a' },
  'In review': { bg: '#223355', fg: '#8ab4f8' }
};

export const FIXED_STATUSES = ['WIP', 'Done', 'Yet to start', 'Blocked', 'In review'];
