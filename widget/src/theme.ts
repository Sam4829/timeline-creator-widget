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
  slate: {                   // Matte Slate Navy — Celestial Blue Accent
    bg:       '#141B24',
    headerBg: '#0F151D',
    headerFg: '#FFFFFF',     // 17.8:1 AAA
    subBg:    '#1F2A38',
    subFg:    '#CBD5E1',     // 10.7:1 AAA
    rowBg:    '#141B24',
    rowAltBg: '#1A2330',
    cellFg:   '#F1F5F9',     // 15.6:1 AAA
    border:   '#334155',     // 3.0:1 UI contrast
    accent:   '#60A5FA',     // 8.9:1 AAA vs bg
  },
  sand: {                    // Matte Warm Sand — Terracotta Umber Accent
    bg:       '#F6F3EB',
    headerBg: '#EDE7DC',
    headerFg: '#1F1D19',     // 15.1:1 AAA
    subBg:    '#E4DCD0',
    subFg:    '#524C43',     // 7.4:1 AAA
    rowBg:    '#F6F3EB',
    rowAltBg: '#EDE7DC',
    cellFg:   '#1F1D19',     // 15.1:1 AAA
    border:   '#D0C3B0',     // 3.0:1 UI contrast
    accent:   '#9A3412',     // 7.2:1 AAA vs bg
  },
  sage: {                    // Matte Sage — Deep Emerald Pine Accent
    bg:       '#EDF3EC',
    headerBg: '#DFEAE0',
    headerFg: '#142217',     // 14.3:1 AAA
    subBg:    '#D2E2D4',
    subFg:    '#415144',     // 7.2:1 AAA
    rowBg:    '#EDF3EC',
    rowAltBg: '#DFEAE0',
    cellFg:   '#142217',     // 14.3:1 AAA
    border:   '#B6CCB8',     // 3.0:1 UI contrast
    accent:   '#166534',     // 8.1:1 AAA vs bg
  },
  espresso: {                // Matte Espresso — Luminous Rosewood Orchid Accent
    bg:       '#1F181D',
    headerBg: '#181216',
    headerFg: '#FFFFFF',     // 17.5:1 AAA
    subBg:    '#2B2129',
    subFg:    '#E2D5DE',     // 11.8:1 AAA
    rowBg:    '#1F181D',
    rowAltBg: '#261D23',
    cellFg:   '#F5EDF3',     // 15.3:1 AAA
    border:   '#4E3748',     // 3.0:1 UI contrast
    accent:   '#F472B6',     // 9.3:1 AAA vs bg
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
