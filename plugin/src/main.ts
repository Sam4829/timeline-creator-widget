/// <reference types="@figma/plugin-typings" />
import { emit, on, showUI } from '@create-figma-plugin/utilities'
import { GenerateTimelineHandler, ClosePluginHandler, PluginData, Column, Row } from './types'

// ─── colour helpers ──────────────────────────────────────────────────────────

function hexToRgb(h: string): RGB {
  const v = parseInt(h.replace('#', ''), 16)
  return {
    r: ((v >> 16) & 255) / 255,
    g: ((v >> 8) & 255) / 255,
    b: (v & 255) / 255
  }
}

function solidFill(hex: string, opacity?: number): SolidPaint[] {
  return [{ type: 'SOLID', color: hexToRgb(hex), opacity: opacity === undefined ? 1 : opacity }]
}

// ─── font loader ─────────────────────────────────────────────────────────────
// Hardcode Inter as guaranteed by Figma

async function loadFonts() {
  const styles = ['Regular', 'Medium', 'Semi Bold', 'Bold']
  for (const style of styles) {
    try {
      await figma.loadFontAsync({ family: 'Inter', style })
    } catch (e) {
      console.warn('Failed to load Inter ' + style)
    }
  }
}

// ─── text helper ─────────────────────────────────────────────────────────────

function makeTextNode(content: string, style: string, size: number, colorHex: string): TextNode {
  const node = figma.createText()
  try {
    node.fontName = { family: 'Inter', style }
  } catch (e) {
    // Graceful fallback to whatever default Figma has
  }
  node.fontSize = size
  node.characters = String(content || '')
  node.fills = solidFill(colorHex)
  return node
}

// ─── rect helper ─────────────────────────────────────────────────────────────

function addRect(parent: FrameNode, x: number, y: number, w: number, h: number, colorHex: string) {
  const r = figma.createRectangle()
  r.resize(w, h)
  r.x = x; r.y = y
  r.fills = solidFill(colorHex)
  parent.appendChild(r)
}

// ─── theme constants ─────────────────────────────────────────────────────────

const DARK_THEME = {
  bg:        '#1a1a1a',
  headerBg:  '#252525',
  headerFg:  '#ffffff',
  subBg:     '#2d2d2d',
  subFg:     '#aaaaaa',
  rowBg:     '#1f1f1f',
  rowAltBg:  '#252525',
  cellFg:    '#e0e0e0',
  borderHex: '#3a3a3a',
  dimFg:     '#555555',
  statusColors: {
    'WIP':          { bg: '#1e3a1e', fg: '#6fcf6f' },
    'Done':         { bg: '#1a2d1a', fg: '#4caf50' },
    'Yet to start': { bg: '#1e1e3a', fg: '#8888cc' },
    'Blocked':      { bg: '#3a1a1a', fg: '#e57373' },
    'In review':    { bg: '#3a2a10', fg: '#ffb74d' }
  } as Record<string, { bg: string, fg: string }>
}
const LIGHT_THEME = {
  bg:        '#ffffff',
  headerBg:  '#f0f0f0',
  headerFg:  '#111111',
  subBg:     '#fafafa',
  subFg:     '#666666',
  rowBg:     '#ffffff',
  rowAltBg:  '#f7f7f7',
  cellFg:    '#222222',
  borderHex: '#dddddd',
  dimFg:     '#aaaaaa',
  statusColors: {
    'WIP':          { bg: '#e8f5e9', fg: '#2e7d32' },
    'Done':         { bg: '#c8e6c9', fg: '#1b5e20' },
    'Yet to start': { bg: '#e8eaf6', fg: '#283593' },
    'Blocked':      { bg: '#ffebee', fg: '#c62828' },
    'In review':    { bg: '#fff3e0', fg: '#e65100' }
  } as Record<string, { bg: string, fg: string }>
}

// ─── main draw ───────────────────────────────────────────────────────────────

async function drawTimeline(data: PluginData) {
  const projectName = data.projectName || 'Timeline'
  const columns     = data.columns || []
  const rows        = data.rows || []
  const theme       = data.theme || 'dark'

  await loadFonts()

  // ── theme ──
  const tk = (theme === 'light') ? LIGHT_THEME : DARK_THEME

  // ── dimensions ──
  const TITLE_H  = 52
  const HEADER_H = 44
  const SUBHDR_H = 28
  const ROW_H    = 38
  const PAD      = 14
  const SERIAL_W = 44
  const FIRST_W  = 260
  const DATE_W   = 120
  const RANGE_W  = 168
  const OTHER_W  = 120

  // Per-column widths
  const colWidths: number[] = []
  for (let i = 0; i < columns.length; i++) {
    const ct = columns[i].type || 'text'
    if (ct === 'serial')       colWidths.push(SERIAL_W)
    else if (ct === 'daterange') colWidths.push(RANGE_W)
    else if (ct === 'date')    colWidths.push(DATE_W)
    else if (ct === 'text' && colWidths.indexOf(FIRST_W) === -1) colWidths.push(FIRST_W)
    else                       colWidths.push(OTHER_W)
  }

  const colXOffsets: number[] = [0]
  let totalW = 0
  for (let i = 0; i < colWidths.length; i++) {
    totalW += colWidths[i]
    colXOffsets.push(totalW)
  }
  const totalH = TITLE_H + HEADER_H + (ROW_H * rows.length)

  // ── outer frame ──
  const outer = figma.createFrame()
  outer.name = 'Timeline — ' + projectName
  outer.resize(totalW, totalH)
  outer.fills = solidFill(tk.bg)
  outer.clipsContent = true
  outer.cornerRadius = 6

  // Position to the right of existing content
  let maxX = 0
  const pageChildren = figma.currentPage.children
  for (let i = 0; i < pageChildren.length; i++) {
    const n = pageChildren[i]
    if (typeof n.x === 'number' && typeof n.width === 'number') {
      const right = n.x + n.width
      if (right > maxX) maxX = right
    }
  }
  outer.x = maxX > 0 ? maxX + 100 : 0
  outer.y = 0
  figma.currentPage.appendChild(outer)

  // ── TITLE BAR ──
  const titleBar = figma.createFrame()
  titleBar.name = 'Title Bar'
  titleBar.resize(totalW, TITLE_H)
  titleBar.x = 0; titleBar.y = 0
  titleBar.fills = solidFill(tk.headerBg)
  outer.appendChild(titleBar)
  addRect(titleBar, 0, TITLE_H - 1, totalW, 1, tk.borderHex)

  const titleTxt = makeTextNode(projectName.toUpperCase(), 'Bold', 12, tk.headerFg)
  titleBar.appendChild(titleTxt)
  titleTxt.x = PAD
  titleTxt.y = Math.round((TITLE_H - titleTxt.height) / 2)

  // ── COLUMN HEADERS ──
  let yOff = TITLE_H
  for (let c = 0; c < columns.length; c++) {
    const cx = colXOffsets[c]
    const cw = colWidths[c]

    const hdrCell = figma.createFrame()
    hdrCell.name = 'Hdr-' + c
    hdrCell.resize(cw, HEADER_H)
    hdrCell.x = cx; hdrCell.y = yOff
    hdrCell.fills = solidFill(tk.headerBg)
    outer.appendChild(hdrCell)

    const hdrTxt = makeTextNode(columns[c].name, 'Semi Bold', c === 0 ? 11 : 10, tk.headerFg)
    hdrCell.appendChild(hdrTxt)
    if (c === 0) {
      hdrTxt.x = PAD
    } else {
      hdrTxt.x = Math.max(4, Math.round((cw - hdrTxt.width) / 2))
    }
    hdrTxt.y = Math.round((HEADER_H - hdrTxt.height) / 2)

    if (c < columns.length - 1) addRect(hdrCell, cw - 1, 0, 1, HEADER_H, tk.borderHex)
    addRect(hdrCell, 0, HEADER_H - 1, cw, 1, tk.borderHex)
  }

  // ── DATA ROWS ──
  yOff = TITLE_H + HEADER_H

  for (let r = 0; r < rows.length; r++) {
    const rowData   = rows[r]
    const cells     = rowData.cells || []
    const rowBgHex  = (r % 2 === 1) ? tk.rowAltBg : tk.rowBg

    for (let c = 0; c < columns.length; c++) {
      const cx       = colXOffsets[c]
      const cw       = colWidths[c]
      const cellVal  = String(cells[c] || '')
      const colType  = columns[c].type || 'text'

      const cellFrame = figma.createFrame()
      cellFrame.name = 'R' + (r + 1) + 'C' + (c + 1)
      cellFrame.resize(cw, ROW_H)
      cellFrame.x = cx
      cellFrame.y = yOff + (r * ROW_H)
      cellFrame.fills = solidFill(rowBgHex)
      outer.appendChild(cellFrame)

      if (c < columns.length - 1) addRect(cellFrame, cw - 1, 0, 1, ROW_H, tk.borderHex)
      addRect(cellFrame, 0, ROW_H - 1, cw, 1, tk.borderHex)

      if (colType === 'serial') {
        const numTxt = makeTextNode((r + 1) + '.', 'Regular', 9, tk.subFg)
        cellFrame.appendChild(numTxt)
        numTxt.x = Math.max(4, Math.round((cw - numTxt.width) / 2))
        numTxt.y = Math.round((ROW_H - numTxt.height) / 2)

      } else if (colType === 'status' && cellVal) {
        const sc = tk.statusColors[cellVal] || { bg: tk.subBg, fg: tk.subFg }
        const BADGE_H = 18

        const badge = figma.createFrame()
        badge.cornerRadius = 9
        badge.fills = solidFill(sc.bg)
        cellFrame.appendChild(badge)

        const bLabel = makeTextNode(cellVal, 'Medium', 8, sc.fg)
        badge.appendChild(bLabel)
        
        const badgeW = Math.min(bLabel.width + 16, cw - 12)
        badge.resize(badgeW, BADGE_H)
        badge.x = Math.round((cw - badgeW) / 2)
        badge.y = Math.round((ROW_H - BADGE_H) / 2)
        
        bLabel.x = Math.round((badgeW - bLabel.width) / 2)
        bLabel.y = Math.round((BADGE_H - bLabel.height) / 2)

      } else {
        let display = cellVal || '—'
        if (display !== '—' && display.length > 40) {
          display = display.substring(0, 38) + '…'
        }
        const fg = cellVal ? tk.cellFg : tk.dimFg
        const txt = makeTextNode(display, 'Regular', 10, fg)
        cellFrame.appendChild(txt)
        
        if (colType === 'text') {
          txt.x = PAD
        } else {
          txt.x = Math.max(4, Math.round((cw - txt.width) / 2))
        }
        txt.y = Math.round((ROW_H - txt.height) / 2)
      }
    }
  }

  figma.viewport.scrollAndZoomIntoView([outer])
  return { nodeId: outer.id, fontUsed: 'Inter Regular' }
}

export default function () {
  on<GenerateTimelineHandler>('GENERATE_TIMELINE', async function (data: PluginData) {
    try {
      const result = await drawTimeline(data)
      emit('GENERATE_SUCCESS', { nodeId: result.nodeId, fontUsed: result.fontUsed })
    } catch (err: any) {
      const message = (err && err.message) ? err.message : String(err)
      emit('GENERATE_ERROR', { message })
    }
  })

  on<ClosePluginHandler>('CLOSE_PLUGIN', function () {
    figma.closePlugin()
  })

  showUI({ width: 800, height: 640 })
}
