<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import type { MediaFile, FolderGroup, ReadFolderResult, FileFilter } from './types'

import { useThumbnail } from './composables/useThumbnail'
import { usePreview } from './composables/usePreview'
import { useRecentFolders } from './composables/useRecentFolders'
import { getSetting, setSetting } from './composables/useSettings'

import Sidebar from './components/Sidebar.vue'
import EmptyState from './components/EmptyState.vue'
import FileCard from './components/FileCard.vue'
import PreviewModal from './components/PreviewModal.vue'
import ContextMenu from './components/ContextMenu.vue'
import FileInfoPanel from './components/FileInfoPanel.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ZoomStepSelector from './components/ZoomStepSelector.vue'
import CurrentZoomSelector from './components/CurrentZoomSelector.vue'

const groups = ref<FolderGroup[]>([])
const currentFilter = ref<FileFilter>('all')
const isDragging = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const currentFolderPath = ref('')
const showSidebar = ref(true)
const mainContentRef = ref<HTMLElement | null>(null)

// 确认弹窗状态
const confirmDialogVisible = ref(false)
const confirmDialogConfig = ref({
  title: '确认操作',
  message: '',
  detail: '',
  warning: '',
  confirmText: '确认',
  cancelText: '取消',
  onConfirm: () => {},
  onCancel: () => {}
})

// 窗口状态
const WINDOW_STATE_KEY = 'windowState'
interface WindowState {
  x: number; y: number; width: number; height: number; isMaximized: boolean
}
let saveWindowStateTimeout: ReturnType<typeof setTimeout> | null = null

// Grid 设置 - 使用百分比，浏览器自动响应容器变化
const MIN_GRID_SIZE = 60  // 最小列宽(px)
const DEFAULT_GRID_PERCENT = 10  // 默认占容器宽度的百分比
const gridPercent = ref(DEFAULT_GRID_PERCENT)

// 容器宽度（用于计算缩略图尺寸）
const containerWidth = ref(0)
let resizeObserver: ResizeObserver | null = null

// 根据百分比和容器宽度计算实际像素值（仅用于缩略图加载）
function getGridSizePx(): number {
  return containerWidth.value > 0 
    ? Math.max(MIN_GRID_SIZE, (gridPercent.value / 100) * containerWidth.value)
    : Math.max(MIN_GRID_SIZE, (gridPercent.value / 100) * window.innerWidth)
}

// 缩放步长配置（百分比）
const ZOOM_STEP_KEY = 'zoomStep'
const DEFAULT_ZOOM_STEP = 1
const zoomStep = ref(DEFAULT_ZOOM_STEP)

// 当前缩放比例配置（百分比）
const CURRENT_ZOOM_KEY = 'currentZoom'
const DEFAULT_CURRENT_ZOOM = 10
const currentZoom = ref(DEFAULT_CURRENT_ZOOM)

// 计算属性（必须在 usePreview 之前定义）
const allFiles = computed(() => groups.value.flatMap(g => g.files))

const filteredGroups = computed(() => {
  let result = groups.value
  if (currentFilter.value !== 'all') {
    result = result.map(g => ({
      ...g,
      files: g.files.filter(f => f.file_type === currentFilter.value)
    })).filter(g => g.files.length > 0 || g.level === 1)
  }
  return result.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.folder_path.localeCompare(b.folder_path)
  })
})

const fileCountByType = computed(() => {
  const counts = { all: allFiles.value.length, image: 0, other: 0 }
  allFiles.value.forEach(file => {
    if (file.file_type === 'image') counts.image++
    else counts.other++
  })
  return counts
})

// 使用 composables
const { 
  getImageUrl, 
  isImageLoaded, 
  isImageLoading, 
  loadAllThumbnails, 
  clearCache 
} = useThumbnail()

const { 
  previewFile, 
  previewImageUrl, 
  previewZoom, 
  previewPosition, 
  isDraggingPreview, 
  isLoadingPreview,
  previewRotation,
  canGoPrev,
  canGoNext,
  openPreview, 
  closePreview, 
  goToPrev, 
  goToNext, 
  handlePreviewWheel, 
  resetZoom, 
  rotateLeft, 
  rotateRight, 
  startDragPreview 
} = usePreview(() => allFiles.value)

const { 
  recentFolders, 
  loadRecentFolders, 
  addToRecentFolders, 
  removeFromRecentFolders 
} = useRecentFolders()

// 右键菜单状态
const contextMenuFile = ref<MediaFile | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })

// 文件详情面板状态
const infoPanelFile = ref<MediaFile | null>(null)

// 当前高亮的文件夹
const activeFolder = ref('')

// 工具函数
function getFolderId(folderPath: string): string {
  return 'folder-' + folderPath.replace(/[^a-zA-Z0-9]/g, '-')
}

function scrollToFolder(folderPath: string) {
  const element = document.getElementById(getFolderId(folderPath))
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 加载文件夹
async function loadMultipleFolders(folderPaths: string[]) {
  isLoading.value = true
  errorMessage.value = ''
  clearCache()
  closePreview()

  try {
    const result = await invoke<ReadFolderResult>('get_all_files', { folderPaths })
    
    console.log('拖入的文件夹:', folderPaths)
    console.log('后端返回的groups:', result.groups.map(g => ({ path: g.folder_path, name: g.folder_name })))
    
    // 为每个拖入的文件夹找到其根路径和深度
    const rootInfo = folderPaths.map(rootPath => {
      const normalizedRoot = rootPath.replace(/\/$/, '').replace(/\\$/, '')
      const depth = normalizedRoot.split(/[\\/]/).filter(p => p.length > 0).length
      return { path: normalizedRoot, depth }
    })
    
    console.log('rootInfo:', rootInfo)
    
    // 为每个 group 添加层级信息
    groups.value = result.groups.map(group => {
      const normalizedGroupPath = group.folder_path.replace(/\/$/, '').replace(/\\$/, '')
      const groupDepth = normalizedGroupPath.split(/[\\/]/).filter(p => p.length > 0).length
      
      // 找到这个文件夹属于哪个拖入的根文件夹
      let matchedRoot = rootInfo.find(r => {
        const isMatch = normalizedGroupPath === r.path || normalizedGroupPath.startsWith(r.path + '\\') || normalizedGroupPath.startsWith(r.path + '/')
        if (isMatch) {
          console.log(`匹配成功: ${normalizedGroupPath} 属于 ${r.path}`)
        }
        return isMatch
      })
      
      // 如果没找到匹配的根文件夹，使用深度最小的作为默认
      if (!matchedRoot) {
        matchedRoot = rootInfo.reduce((min, r) => r.depth < min.depth ? r : min, rootInfo[0])
        console.log(`未找到匹配，使用默认: ${normalizedGroupPath} -> ${matchedRoot.path}`)
      }
      
      // 计算相对于所属根文件夹的层级
      const relativeLevel = groupDepth - matchedRoot.depth + 1
      const level = Math.max(1, relativeLevel)
      
      // 找到父文件夹路径（只有非根文件夹才有父文件夹）
      let parentPath: string | undefined = undefined
      if (level > 1) {
        // 使用正则匹配最后一个分隔符，处理 \ 和 / 两种情况
        const match = normalizedGroupPath.match(/^(.*)[\\/]([^\\/]+)$/)
        if (match) {
          parentPath = match[1]
        }
      }
      
      console.log(`文件夹: ${normalizedGroupPath}, level: ${level}, parent: ${parentPath}`)

      return {
        ...group,
        level,
        parent_path: parentPath,
        is_expanded: true
      }
    })
    currentFolderPath.value = folderPaths.join(' | ')
    await addToRecentFolders(folderPaths)

    const imageFiles = allFiles.value.filter(f => f.file_type === 'image')
    loadAllThumbnails(imageFiles, getGridSizePx())
  } catch (error) {
    errorMessage.value = `读取文件夹失败: ${error}`
  } finally {
    isLoading.value = false
  }
}

// 过滤器
function setFilter(filter: FileFilter) {
  currentFilter.value = filter
}

// 键盘事件（仅处理非预览状态）
function handleKeydown(event: KeyboardEvent) {
  // 预览状态的键盘事件由 usePreview 处理
  if (previewFile.value) return
  
  if (event.key === 'Escape') {
    if (currentFolderPath.value) {
      groups.value = []
      currentFolderPath.value = ''
      clearCache()
    }
  }
  
  if (event.ctrlKey && event.key === 'b') {
    event.preventDefault()
    showSidebar.value = !showSidebar.value
  }
}

// 滚轮事件 - Ctrl+滚轮调整图片大小
async function handleWheel(event: WheelEvent) {
  if (!event.ctrlKey) return
  event.preventDefault()
  const stepPercent = zoomStep.value / 100
  const delta = event.deltaY > 0 ? -stepPercent : stepPercent
  gridPercent.value = Math.max(1, gridPercent.value * (1 + delta))
  // 更新 CSS 变量（百分比），浏览器自动响应
  document.documentElement.style.setProperty('--grid-percent', `${gridPercent.value.toFixed(2)}%`)
  document.documentElement.style.setProperty('--grid-percent', `${gridPercent.value.toFixed(2)}%`)
  await setSetting('gridPercent', gridPercent.value)
}

// 防抖更新当前高亮的文件夹
let updateVisibleTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedUpdateActiveFolder() {
  if (updateVisibleTimeout) clearTimeout(updateVisibleTimeout)
  updateVisibleTimeout = setTimeout(() => {
    updateActiveFolder()
  }, 150)
}

// 更新当前高亮的文件夹
function updateActiveFolder() {
  if (!mainContentRef.value || filteredGroups.value.length === 0) return
  
  const sections = filteredGroups.value.map(g => ({
    path: g.folder_path,
    element: document.getElementById(getFolderId(g.folder_path))
  })).filter(s => s.element)
  
  const containerRect = mainContentRef.value.getBoundingClientRect()
  const headerHeight = 100
  
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i]
    if (section.element) {
      const rect = section.element.getBoundingClientRect()
      if (rect.top <= containerRect.top + headerHeight) {
        activeFolder.value = section.path
        return
      }
    }
  }
  
  if (sections.length > 0) {
    activeFolder.value = sections[0].path
  }
}

// 存储配置的方法
async function saveZoomStep() {
  await setSetting(ZOOM_STEP_KEY, zoomStep.value)
}

// 根据期望的每行图片数量计算实际的 百分比
function calculatePercentFromImagesPerRow(imagesPerRow: number): number {
  const availableWidth = 100 - 2
  const imageWidth = availableWidth / imagesPerRow
  return imageWidth
}

async function saveCurrentZoom() {
  await setSetting(CURRENT_ZOOM_KEY, currentZoom.value)
  const imagesPerRow = 100 / currentZoom.value
  gridPercent.value = calculatePercentFromImagesPerRow(imagesPerRow)
  document.documentElement.style.setProperty('--grid-percent', `${gridPercent.value.toFixed(2)}%`)
}

// 窗口状态保存
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function saveWindowState() {
  if (saveWindowStateTimeout) clearTimeout(saveWindowStateTimeout)
  saveWindowStateTimeout = setTimeout(async () => {
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

async function restoreWindowState() {
  const savedState = await getSetting<WindowState | null>(WINDOW_STATE_KEY, null)
  if (!savedState) return
  
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
  }
}

// 右键菜单
function handleContextMenu(event: MouseEvent, file: MediaFile) {
  event.preventDefault()
  contextMenuFile.value = file
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
}

function closeContextMenu() {
  contextMenuFile.value = null
}

async function copyFilePath(file: MediaFile) {
  try {
    await navigator.clipboard.writeText(file.path)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

async function openInExplorer(file: MediaFile) {
  try {
    await invoke('open_in_explorer', { filePath: file.path })
  } catch (error) {
    console.error('打开资源管理器失败:', error)
  }
}

function deleteFile(file: MediaFile) {
  confirmDialogConfig.value = {
    title: '删除文件',
    message: `确定要删除 "${file.name}" 吗？`,
    detail: file.path,
    warning: '文件将被移入回收站，此操作可恢复',
    confirmText: '删除',
    cancelText: '取消',
    onConfirm: async () => {
      confirmDialogVisible.value = false
      try {
        await invoke('delete_file', { filePath: file.path })
        groups.value.forEach(g => {
          g.files = g.files.filter(f => f.path !== file.path)
        })
      } catch (error) {
        console.error('删除失败:', error)
        alert(`删除失败: ${error}`)
      }
    },
    onCancel: () => {
      confirmDialogVisible.value = false
    }
  }
  confirmDialogVisible.value = true
}

function showFileInfo(file: MediaFile) {
  infoPanelFile.value = file
}

// 从列表中移除文件夹（不删除系统文件）
function removeFromList(folderPath: string) {
  groups.value = groups.value.filter(g => g.folder_path !== folderPath)
  console.log('已从列表中移除:', folderPath)
}

// 切换文件夹展开/折叠状态
function toggleFolderExpand(folderPath: string) {
  const group = groups.value.find(g => g.folder_path === folderPath)
  if (group) {
    group.is_expanded = !group.is_expanded
  }
}

// 删除系统里的文件夹
function deleteFolder(folderPath: string) {
  // 显示美化的确认弹窗
  confirmDialogConfig.value = {
    title: '删除文件夹',
    message: '您确定要删除此文件夹吗？文件夹中的所有内容将被永久删除。',
    detail: folderPath,
    warning: '此操作不可恢复！',
    confirmText: '删除',
    cancelText: '取消',
    onConfirm: async () => {
      confirmDialogVisible.value = false
      try {
        // 调用后端删除文件夹
        await invoke('delete_folder', { folderPath })
        // 从列表中移除
        groups.value = groups.value.filter(g => g.folder_path !== folderPath)
        console.log('文件夹已删除:', folderPath)
      } catch (error) {
        console.error('删除文件夹失败:', error)
        alert(`删除失败: ${error}`)
      }
    },
    onCancel: () => {
      confirmDialogVisible.value = false
    }
  }
  confirmDialogVisible.value = true
}

// 在文件管理器中打开文件夹
async function openFolderInExplorer(folderPath: string) {
  try {
    await invoke('open_in_explorer', { filePath: folderPath })
    console.log('已在文件管理器中打开:', folderPath)
  } catch (error) {
    console.error('打开文件管理器失败:', error)
    alert(`打开失败: ${error}`)
  }
}

// 生命周期
let unlisten: (() => void) | null = null

onMounted(async () => {
  const savedCurrentZoom = await getSetting<number | null>(CURRENT_ZOOM_KEY, null)
  if (savedCurrentZoom) {
    currentZoom.value = savedCurrentZoom
    const imagesPerRow = 100 / currentZoom.value
    gridPercent.value = calculatePercentFromImagesPerRow(imagesPerRow)
  } else {
    const savedGridPercent = await getSetting<number | null>('gridPercent', null)
    if (savedGridPercent) {
      gridPercent.value = savedGridPercent
    }
  }

  document.documentElement.style.setProperty('--grid-percent', `${gridPercent.value.toFixed(2)}%`)

  const savedShowSidebar = await getSetting<boolean | null>('showSidebar', null)
  if (savedShowSidebar !== null) showSidebar.value = savedShowSidebar

  const savedZoomStep = await getSetting<number | null>(ZOOM_STEP_KEY, null)
  if (savedZoomStep) zoomStep.value = savedZoomStep

  await loadRecentFolders()
  await restoreWindowState()
  
  nextTick(() => {
    if (mainContentRef.value) {
      mainContentRef.value.addEventListener('wheel', handleWheel, { passive: false })
      mainContentRef.value.addEventListener('scroll', debouncedUpdateActiveFolder)
      
      containerWidth.value = mainContentRef.value.clientWidth
      
      // 监听容器宽度变化，自动更新缩略图尺寸
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width
          if (newWidth > 0) {
            containerWidth.value = newWidth
          }
        }
      })
      resizeObserver.observe(mainContentRef.value)
    }
  })
  
  // 延迟初始化 Tauri 窗口监听器
  setTimeout(async () => {
    try {
      // 检查是否在 Tauri 环境中
      if (isTauri()) {
        console.log('Tauri environment detected, setting up window listeners...')
        const webview = getCurrentWebview()
        
        unlisten = await webview.onDragDropEvent((event) => {
          if (event.payload.type === 'enter') {
            isDragging.value = true
          } else if (event.payload.type === 'leave') {
            isDragging.value = false
          } else if (event.payload.type === 'drop') {
            isDragging.value = false
            const paths = event.payload.paths
            console.log('Dropped paths:', paths)
            if (paths && paths.length > 0) {
              loadMultipleFolders(paths)
            }
          }
        })
        console.log('DragDrop listener registered')
      } else {
        console.log('Not in Tauri environment')
      }
    } catch (error) {
      console.error('Failed to set up window listeners:', error)
    }
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', debouncedUpdateActiveFolder)
  if (mainContentRef.value) {
    mainContentRef.value.removeEventListener('wheel', handleWheel)
    mainContentRef.value.removeEventListener('scroll', debouncedUpdateActiveFolder)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (unlisten) unlisten()
  clearCache()
  closePreview()
})

watch(showSidebar, async (val) => await setSetting('showSidebar', val))
</script>

<template>
  <div class="app-container">
    <header v-if="groups.length > 0" class="app-bar">
      <div class="app-bar-leading">
        <button class="icon-btn" @click="groups = []; currentFolderPath = ''">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <button class="icon-btn" @click="showSidebar = !showSidebar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
      </div>
      <div class="app-bar-title">
        <span class="title-text">{{ currentFolderPath.split('\\').pop() || currentFolderPath.split('/').pop() }}</span>
        <span class="subtitle-text">{{ allFiles.length }} 个文件 · {{ groups.length }} 个文件夹</span>
      </div>
      <div class="app-bar-actions">
        <!-- 缩放设置 -->
        <div class="zoom-step-wrapper">
          <span class="zoom-step-label">当前缩放</span>
          <CurrentZoomSelector
            v-model="currentZoom"
            @change="saveCurrentZoom"
            title="当前缩放比例"
          />
        </div>
        <div class="zoom-step-wrapper">
          <span class="zoom-step-label">缩放步长</span>
          <ZoomStepSelector
            v-model="zoomStep"
            @change="saveZoomStep"
            title="Ctrl+滚轮缩放步长"
          />
        </div>
      </div>
    </header>

    <div class="main-wrapper">
      <Transition name="drawer">
        <Sidebar
          v-if="showSidebar && filteredGroups.length > 0"
          :groups="filteredGroups"
          :active-folder="activeFolder"
          @navigate="scrollToFolder"
          @remove-from-list="removeFromList"
          @delete-folder="deleteFolder"
          @open-in-explorer="openFolderInExplorer"
          @toggle-expand="toggleFolderExpand"
        />
      </Transition>

      <main ref="mainContentRef" class="main-content" :class="{ 'drag-over': isDragging, 'no-sidebar': !showSidebar || filteredGroups.length === 0 }">
        <EmptyState 
          v-if="groups.length === 0" 
          :recent-folders="recentFolders"
          @select-folder="loadMultipleFolders([$event])"
          @remove-recent="removeFromRecentFolders"
        />

        <div v-else-if="isLoading" class="loading-state">
          <div class="circular-progress"></div>
          <p class="loading-text">加载中...</p>
        </div>

        <template v-else>
          <div class="filter-chips">
            <button 
              v-for="(count, type) in fileCountByType" 
              :key="type"
              class="chip"
              :class="{ 'chip-selected': currentFilter === type }"
              @click="setFilter(type as FileFilter)"
            >
              <span>{{ type === 'all' ? '全部' : type === 'image' ? '图片' : '其他' }}</span>
              <span class="chip-count">{{ count }}</span>
            </button>
          </div>

          <div v-for="group in filteredGroups" :key="group.folder_path" class="folder-section" :id="getFolderId(group.folder_path)">
            <div class="section-header">
              <div class="section-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#409EFF">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                </svg>
              </div>
              <div class="section-content">
                <span class="section-title">{{ group.folder_name || '根目录' }}</span>
                <span class="section-subtitle">{{ group.files.length }} 个文件</span>
              </div>
            </div>

            <div class="file-grid">
              <FileCard 
                v-for="file in group.files" 
                :key="file.path" 
                :file="file"
                @click="openPreview(file)"
                @contextmenu="handleContextMenu($event, file)"
              >
                <template #image="{ file: f }">
                  <img v-if="isImageLoaded(f)" :src="getImageUrl(f)" :alt="f.name" decoding="async" loading="lazy" />
                  <div v-else-if="isImageLoading(f)" class="card-placeholder">
                    <div class="circular-progress small"></div>
                  </div>
                  <div v-else class="card-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#9e9e9e">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                  </div>
                </template>
              </FileCard>
            </div>
          </div>
        </template>
      </main>
    </div>

    <PreviewModal 
      v-if="previewFile"
      :file="previewFile"
      :image-url="previewImageUrl"
      :zoom="previewZoom"
      :position="previewPosition"
      :rotation="previewRotation"
      :is-dragging="isDraggingPreview"
      :is-loading="isLoadingPreview"
      :can-go-prev="canGoPrev"
      :can-go-next="canGoNext"
      @close="closePreview"
      @wheel="handlePreviewWheel"
      @mousedown="startDragPreview"
      @reset-zoom="resetZoom"
      @rotate-left="rotateLeft"
      @rotate-right="rotateRight"
      @prev="goToPrev"
      @next="goToNext"
    />

    <ContextMenu 
      v-if="contextMenuFile"
      :file="contextMenuFile"
      :position="contextMenuPosition"
      @close="closeContextMenu"
      @copy-path="copyFilePath"
      @open-in-explorer="openInExplorer"
      @delete="deleteFile"
      @show-info="showFileInfo"
    />

    <FileInfoPanel 
      v-if="infoPanelFile"
      :file="infoPanelFile"
    />

    <!-- 确认弹窗 -->
    <ConfirmDialog
      :visible="confirmDialogVisible"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      :detail="confirmDialogConfig.detail"
      :warning="confirmDialogConfig.warning"
      :confirm-text="confirmDialogConfig.confirmText"
      :cancel-text="confirmDialogConfig.cancelText"
      @confirm="confirmDialogConfig.onConfirm"
      @cancel="confirmDialogConfig.onCancel"
    />
  </div>
</template>

<style>
/* ===== 设计系统变量 - 现代蓝色主题 ===== */
:root {
  /* 网格百分比 - 浏览器自动响应容器变化 */
  --grid-percent: 10%;
  /* 网格最大尺寸 - 控制缩放上限 */
  --max-grid-size: 280px;

  /* 主色调 - 现代蓝 */
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-400: #60a5fa;
  --primary-100: #dbeafe;
  --primary-50: #eff6ff;

  /* 强调色 - 天蓝 */
  --accent-500: #0ea5e9;
  --accent-400: #38bdf8;
  --accent-100: #e0f2fe;

  /* 中性色 - 冷调灰 */
  --gray-900: #0f172a;
  --gray-700: #334155;
  --gray-500: #64748b;
  --gray-400: #94a3b8;
  --gray-300: #cbd5e1;
  --gray-200: #e2e8f0;
  --gray-100: #f1f5f9;
  --gray-50: #f8fafc;

  /* 背景色 - 冷白 */
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;

  /* 阴影系统 - 冷调 */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08);
  --shadow-glow: 0 0 20px rgba(59, 130, 246, 0.35);

  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* 过渡 */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* ===== 全局样式 ===== */
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --sidebar-width: 22vw;
}

html, body, #app {
  height: 100%;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(160deg, #f8fafc 0%, #eff6ff 50%, #dbeafe 100%);
  color: var(--gray-900);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container { 
  height: 100vh; 
  display: flex; 
  flex-direction: column;
}

/* ===== AppBar - 蓝色玻璃效果 ===== */
.app-bar {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%);
  backdrop-filter: blur(1.5vh);
  -webkit-backdrop-filter: blur(1.5vh);
  padding: 0 1vw;
  height: 8vh;
  min-height: 50px;
  max-height: 80px;
  display: flex;
  align-items: center;
  box-shadow: var(--shadow-lg), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
  z-index: 100;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.app-bar-leading { 
  display: flex; 
  align-items: center; 
  gap: 8px;
}

.icon-btn {
  width: 2.8vw;
  height: 2.8vw;
  min-width: 36px;
  min-height: 36px;
  max-width: 48px;
  max-height: 48px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.icon-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.icon-btn:hover { 
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.icon-btn:hover::before {
  opacity: 1;
}

.icon-btn:active {
  transform: translateY(0);
}

.app-bar-title {
  flex: 1;
  margin-left: 1.2vw;
  display: flex;
  flex-direction: column;
  gap: 0.4vh;
}

.title-text {
  font-size: clamp(14px, 1.2vw, 20px);
  font-weight: 600;
  color: #fff;
  display: block;
  letter-spacing: -0.025em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.subtitle-text {
  font-size: clamp(10px, 0.8vw, 14px);
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

.app-bar-actions {
  display: flex;
  align-items: center;
  gap: 0.8vw;
}

.dropdown {
  padding: 1.2vh 1.2vw;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: clamp(11px, 0.9vw, 15px);
  cursor: pointer;
  color: var(--gray-700);
  font-weight: 500;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.dropdown:hover {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.dropdown.small {
  padding: 1vh 1vw;
  font-size: clamp(10px, 0.8vw, 13px);
}

/* 缩放步长设置区域 */
.zoom-step-wrapper {
  display: flex;
  align-items: center;
  gap: 0.8vw;
  padding: 0.8vh 1.2vw;
  background: rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow-sm);
}

.zoom-step-label {
  font-size: clamp(11px, 0.9vw, 14px);
  color: var(--gray-700);
  font-weight: 600;
  white-space: nowrap;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* ===== Main Wrapper ===== */
.main-wrapper { 
  flex: 1; 
  display: flex; 
  overflow: hidden;
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2.5vh 2vw;
  background: transparent;
  margin-left: var(--sidebar-width, 22vw);
  transition: margin-left 0.3s ease;
}

.main-content.no-sidebar {
  margin-left: 0;
}

.main-content.drag-over { 
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(79, 70, 229, 0.05) 100%);
}

.main-content.drag-over::after {
  content: '释放以加载文件夹';
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px 40px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%);
  color: white;
  border-radius: var(--radius-xl);
  font-size: 16px;
  font-weight: 600;
  box-shadow: var(--shadow-xl), 0 0 40px rgba(59, 130, 246, 0.4);
  pointer-events: none;
  z-index: 1000;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.05); }
}

/* ===== Filter Chips ===== */
.filter-chips {
  display: flex;
  gap: 0.8vw;
  margin-bottom: 2.5vh;
  flex-wrap: wrap;
}

.chip {
  display: flex;
  align-items: center;
  gap: 0.5vw;
  padding: 1.2vh 1.2vw;
  background: var(--bg-secondary);
  border: 1px solid var(--gray-200);
  border-radius: 9999px;
  font-size: clamp(11px, 0.9vw, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  color: var(--gray-700);
  box-shadow: var(--shadow-sm);
}

.chip:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.chip-selected {
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: var(--shadow-md), 0 0 0 1px rgba(59, 130, 246, 0.3);
}

.chip-selected:hover {
  background: linear-gradient(135deg, var(--primary-600) 0%, #1d4ed8 100%);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
}

.chip-count {
  background: rgba(0, 0, 0, 0.08);
  padding: 0.4vh 0.8vw;
  border-radius: 9999px;
  font-size: clamp(9px, 0.75vw, 12px);
  font-weight: 600;
  min-width: 1.5vw;
  text-align: center;
}

.chip-selected .chip-count {
  background: rgba(255, 255, 255, 0.25);
}

/* ===== Folder Section ===== */
.folder-section {
  margin-bottom: 3vh;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(2vh);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-header {
  display: flex;
  align-items: center;
  padding: 1.8vh 1.5vw;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  margin-bottom: 1.8vh;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--gray-100);
  transition: all var(--transition-fast);
}

.section-header:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--gray-200);
}

.section-icon {
  margin-right: 1vw;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3vw;
  height: 3vw;
  min-width: 36px;
  min-height: 36px;
  max-width: 48px;
  max-height: 48px;
  background: linear-gradient(135deg, var(--primary-50) 0%, #fff 100%);
  border-radius: var(--radius-md);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.12);
}

.section-content {
  flex: 1;
}

.section-title {
  font-size: clamp(14px, 1.1vw, 18px);
  font-weight: 600;
  color: var(--gray-900);
  display: block;
  letter-spacing: -0.01em;
}

.section-subtitle {
  font-size: clamp(11px, 0.9vw, 14px);
  color: var(--gray-500);
  margin-top: 0.5vh;
  font-weight: 500;
}

/* ===== File Grid ===== */
.file-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.file-grid .card {
  /* 百分比宽度，浏览器自动响应容器变化，无需 JS 干预 */
  width: var(--grid-percent, 10%);
  flex-shrink: 0;
}

/* ===== Card - 玻璃拟态风格 ===== */
.card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--gray-100);
  position: relative;
}

.card:hover {
  box-shadow: var(--shadow-xl);
  transform: translateY(-4px) scale(1.01);
  border-color: rgba(59, 130, 246, 0.2);
}

.card:active {
  transform: translateY(-2px) scale(0.99);
}

.card-media {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
  overflow: hidden;
  position: relative;
}

.card-media img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.card:hover .card-media img {
  transform: scale(1.05);
}

.card-placeholder { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  width: 100%; 
  height: 100%;
}

.card-content {
  padding: 1.5vh 1vw;
  position: relative;
  z-index: 2;
  background: var(--bg-secondary);
}

.card-title {
  font-size: clamp(11px, 0.9vw, 14px);
  font-weight: 600;
  color: var(--gray-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 0.8vh;
  letter-spacing: -0.01em;
}

.card-subtitle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: clamp(10px, 0.8vw, 12px);
  color: var(--gray-500);
}

.file-ext {
  background: linear-gradient(135deg, var(--primary-50) 0%, #fff 100%);
  color: var(--primary-600);
  padding: 0.4vh 0.6vw;
  border-radius: 6px;
  text-transform: uppercase;
  font-size: clamp(9px, 0.7vw, 11px);
  font-weight: 700;
  letter-spacing: 0.05em;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

/* ===== Loading ===== */
.loading-state { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  height: 300px;
  gap: 20px;
}

.circular-progress { 
  width: 48px; 
  height: 48px; 
  border: 3px solid var(--gray-200);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.circular-progress.small { 
  width: 28px; 
  height: 28px; 
  border-width: 2px;
  box-shadow: none;
}

@keyframes spin { 
  to { transform: rotate(360deg); } 
}

.loading-text { 
  color: var(--gray-500);
  font-size: 14px;
  font-weight: 500;
}

/* ===== Transitions ===== */
.drawer-enter-active, 
.drawer-leave-active { 
  transition: all var(--transition-slow);
}

.drawer-enter-from, 
.drawer-leave-to { 
  transform: translateX(-100%);
  opacity: 0;
}

/* ===== 滚动条美化 ===== */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

/* ===== 选中状态 ===== */
::selection {
  background: var(--primary-100);
  color: var(--primary-600);
}
</style>
