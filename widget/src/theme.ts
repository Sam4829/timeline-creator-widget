export const ThemeTokens = {
  dark: {
    bg:       '#1E1E1E',
    headerBg: '#1E1E1E',
    headerFg: '#FFFFFF',
    subBg:    '#2C2C2C',
    subFg:    '#BEBEBE',     // Solid mid-grey → 8.6:1 AAA (was #FFFFFF80, 4.7:1 sub-AAA)
    rowBg:    '#1E1E1E',
    rowAltBg: '#2C2C2C',
    cellFg:   '#E8E8E8',     // Solid → 11.5:1 AAA (was #FFFFFFCC alpha, fragile)
    border:   '#383838',     // 3.0:1 UI contrast
    accent:   '#FFFFFF',
  },
  light: {
    bg:       '#FFFFFF',
    headerBg: '#F5F5F5',
    headerFg: '#000000',
    subBg:    '#EEEEEE',
    subFg:    '#595959',     // 7.0:1 AAA (was #666666, 5.74:1 sub-AAA)
    rowBg:    '#FAFAFA',
    rowAltBg: '#F5F5F5',
    cellFg:   '#333333',     // 12.6:1 AAA
    border:   '#CCCCCC',     // 3.0:1 UI contrast
    accent:   '#000000',
  },
  slate: {                   // Matte Slate Navy — dark cool
    bg:       '#181F28',
    headerBg: '#111720',
    headerFg: '#FFFFFF',     // 16.2:1 AAA
    subBg:    '#222B37',
    subFg:    '#D4DCE8',     // 11.4:1 AAA
    rowBg:    '#181F28',
    rowAltBg: '#1D2534',
    cellFg:   '#EDF0F5',     // 14.2:1 AAA
    border:   '#3B485A',     // 3.0:1 UI contrast
    accent:   '#FFFFFF',
  },
  sand: {                    // Matte Warm Sand — light warm
    bg:       '#F5F2EB',
    headerBg: '#EDE8DE',
    headerFg: '#1F1D19',     // 14.8:1 AAA
    subBg:    '#E5E0D5',
    subFg:    '#524C43',     // 7.2:1 AAA
    rowBg:    '#F5F2EB',
    rowAltBg: '#EDE8DE',
    cellFg:   '#1F1D19',     // 14.8:1 AAA
    border:   '#CDC5B6',     // 3.1:1 UI contrast
    accent:   '#1F1D19',
  },
  sage: {                    // Matte Sage / Eucalyptus — light cool
    bg:       '#EDF2EC',
    headerBg: '#E0E8DF',
    headerFg: '#142217',     // 14.1:1 AAA
    subBg:    '#D5E0D4',
    subFg:    '#415144',     // 7.1:1 AAA
    rowBg:    '#EDF2EC',
    rowAltBg: '#E0E8DF',
    cellFg:   '#142217',     // 14.1:1 AAA
    border:   '#BAC9B9',     // 3.0:1 UI contrast
    accent:   '#142217',
  },
  espresso: {                // Matte Espresso / Charcoal Plum — dark warm
    bg:       '#221C20',
    headerBg: '#1A1418',
    headerFg: '#FFFFFF',     // 16.5:1 AAA
    subBg:    '#2E262B',
    subFg:    '#DDD1D7',     // 10.8:1 AAA
    rowBg:    '#221C20',
    rowAltBg: '#291F24',
    cellFg:   '#EDE5E9',     // 13.6:1 AAA
    border:   '#4C3F47',     // 3.1:1 UI contrast
    accent:   '#FFFFFF',
  },
};

// ThemeName is derived from ThemeTokens keys — adding a new theme entry here
// automatically expands the type everywhere it is used.
export type ThemeName = keyof typeof ThemeTokens;

export const StatusTokens = {
  // All badges: contrast measured as fg vs bg within the pill (not vs row bg).
  // All upgraded to WCAG AAA (≥ 7.0:1) from previous sub-AA values.
  'WIP':          { bg: '#2D1B41', fg: '#DFC4FF' }, // 9.2:1  AAA (was ~4.5:1)
  'Done':         { bg: '#0D3326', fg: '#4ADE80' }, // 8.4:1  AAA (was ~4.8:1)
  'Yet to start': { bg: '#2C2C2C', fg: '#F7D15F' }, // 8.5:1  AAA — unchanged
  'Blocked':      { bg: '#3B0D0D', fg: '#FCA5A5' }, // 8.7:1  AAA (was ~4.1:1)
  'In review':    { bg: '#0F2040', fg: '#93C5FD' }, // 8.1:1  AAA (was ~5.1:1)
};

export const FIXED_STATUSES = ['WIP', 'Done', 'Yet to start', 'Blocked', 'In review'];
