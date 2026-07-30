import { EventHandler } from '@create-figma-plugin/utilities'

export interface Column {
  id: string
  name: string
  type: string
  locked?: boolean
}

export interface Row {
  id: string
  cells: string[]
}

export interface PluginData {
  projectName: string
  columns: Column[]
  rows: Row[]
  theme: 'dark' | 'light'
}

export interface GenerateTimelineHandler extends EventHandler {
  name: 'GENERATE_TIMELINE'
  handler: (data: PluginData) => void
}

export interface ClosePluginHandler extends EventHandler {
  name: 'CLOSE_PLUGIN'
  handler: () => void
}

export interface GenerateSuccessHandler extends EventHandler {
  name: 'GENERATE_SUCCESS'
  handler: (result: { nodeId: string; fontUsed: string }) => void
}

export interface GenerateErrorHandler extends EventHandler {
  name: 'GENERATE_ERROR'
  handler: (err: { message: string }) => void
}
