// 窗口状态存储 key
export const WINDOW_STATE_KEY = 'windowState'

// 缩放相关 keys
export const ZOOM_STEP_KEY = 'zoomStep'
export const CURRENT_ZOOM_KEY = 'currentZoom'

// 默认值
export const DEFAULT_ZOOM_STEP = 1
export const DEFAULT_CURRENT_ZOOM = 10
export const DEFAULT_GRID_PERCENT = 10
export const MIN_GRID_SIZE = 60

// Grid 计算公式：availableWidth = 100 - 2 (gap)
export const GRID_GAP = 2

// 侧边栏默认宽度
export const DEFAULT_SIDEBAR_WIDTH = 280

// 文件过滤选项
export const FILE_FILTERS = ['all', 'image', 'other'] as const

// 图片类型
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico']

// 缩放选项
export const ZOOM_OPTIONS = [
  { value: 10, label: '10%' },
  { value: 20, label: '20%' },
  { value: 25, label: '25%' },
  { value: 33, label: '33%' },
  { value: 50, label: '50%' },
  { value: 100, label: '100%' }
] as const

// 缩放步长选项
export const ZOOM_STEP_OPTIONS = [
  { value: 1, label: '1% (Ctrl+滚轮调整1%)' },
  { value: 2, label: '2% (Ctrl+滚轮调整2%)' },
  { value: 3, label: '3% (Ctrl+滚轮调整3%)' },
  { value: 4, label: '4% (Ctrl+滚轮调整4%)' },
  { value: 5, label: '5% (Ctrl+滚轮调整5%)' }
] as const

// 窗口状态类型
export interface WindowState {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}

// 确认对话框配置类型
export interface ConfirmDialogConfig {
  title: string
  message: string
  detail?: string
  warning?: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
}
