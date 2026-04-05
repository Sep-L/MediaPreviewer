import { ref } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window'
import { getSetting, setSetting } from './useSettings'
import { WINDOW_STATE_KEY } from '../constants'
import type { WindowState } from '../constants'

let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function useWindowState() {
  const isRestoring = ref(false)

  async function save() {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(async () => {
      try {
        const appWindow = getCurrentWebviewWindow()
        const isMaximized = await appWindow.isMaximized()
        if (isMaximized) {
          await setSetting(WINDOW_STATE_KEY, { x: 0, y: 0, width: 0, height: 0, isMaximized: true })
        } else {
          const position = await appWindow.outerPosition()
          const size = await appWindow.outerSize()
          await setSetting(WINDOW_STATE_KEY, {
            x: position.x, y: position.y, width: size.width, height: size.height, isMaximized: false
          })
        }
      } catch (error) {
        console.error('保存窗口状态失败:', error)
      }
    }, 300)
  }

  async function restore() {
    const savedState = await getSetting<WindowState | null>(WINDOW_STATE_KEY, null)
    if (!savedState || isRestoring.value) return
    
    isRestoring.value = true
    try {
      const appWindow = getCurrentWebviewWindow()
      
      if (savedState.isMaximized) {
        await appWindow.maximize()
      } else if (savedState.width > 0 && savedState.height > 0) {
        const innerSize = await appWindow.innerSize()
        const maxWidth = Math.max(1920, innerSize.width + 200)
        const maxHeight = Math.max(1080, innerSize.height + 200)
        
        const safeX = Math.max(0, Math.min(savedState.x, maxWidth - 200))
        const safeY = Math.max(0, Math.min(savedState.y, maxHeight - 100))
        const safeWidth = Math.max(400, Math.min(savedState.width, maxWidth))
        const safeHeight = Math.max(300, Math.min(savedState.height, maxHeight))
        
        await appWindow.setPosition(new PhysicalPosition(safeX, safeY))
        await appWindow.setSize(new PhysicalSize(safeWidth, safeHeight))
      }
    } catch (error) {
      console.error('恢复窗口状态失败:', error)
    } finally {
      isRestoring.value = false
    }
  }

  return {
    saveWindowState: save,
    restoreWindowState: restore
  }
}
