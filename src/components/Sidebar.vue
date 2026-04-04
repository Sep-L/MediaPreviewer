<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { FolderGroup } from '../types'
import { getSetting, setSetting } from '../composables/useSettings'

const props = defineProps<{
  groups: FolderGroup[]
  activeFolder: string
}>()

const emit = defineEmits<{
  (e: 'navigate', folderPath: string): void
  (e: 'removeFromList', folderPath: string): void
  (e: 'deleteFolder', folderPath: string): void
  (e: 'openInExplorer', folderPath: string): void
  (e: 'toggleExpand', folderPath: string): void
}>()

const SIDEBAR_WIDTH_KEY = 'sidebar-width'
const DEFAULT_WIDTH = 220

const sidebarWidth = ref(DEFAULT_WIDTH)
const drawerRef = ref<HTMLElement | null>(null)
const isResizing = ref(false)

onMounted(async () => {
  sidebarWidth.value = await getSetting(SIDEBAR_WIDTH_KEY, DEFAULT_WIDTH)
  document.addEventListener('click', handleClickOutside)
  if (drawerRef.value) {
    drawerRef.value.style.width = sidebarWidth.value + 'px'
    document.documentElement.style.setProperty('--sidebar-width', sidebarWidth.value + 'px')
  }
})

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuFolder = ref<FolderGroup | null>(null)

function scrollToFolder(folderPath: string) {
  const element = document.getElementById('folder-' + folderPath.replace(/[^a-zA-Z0-9]/g, '-'))
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  emit('navigate', folderPath)
}

function handleContextMenu(event: MouseEvent, group: FolderGroup) {
  event.preventDefault()
  contextMenuFolder.value = group
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuVisible.value = true
}

function closeContextMenu() {
  contextMenuVisible.value = false
  contextMenuFolder.value = null
}

function handleRemoveFromList() {
  if (contextMenuFolder.value) {
    emit('removeFromList', contextMenuFolder.value.folder_path)
    closeContextMenu()
  }
}

function handleDeleteFolder() {
  if (contextMenuFolder.value) {
    emit('deleteFolder', contextMenuFolder.value.folder_path)
    closeContextMenu()
  }
}

function handleOpenInExplorer() {
  if (contextMenuFolder.value) {
    emit('openInExplorer', contextMenuFolder.value.folder_path)
    closeContextMenu()
  }
}

function handleClickOutside() {
  if (contextMenuVisible.value) {
    closeContextMenu()
  }
}

function toggleExpand(group: FolderGroup) {
  emit('toggleExpand', group.folder_path)
}

function startResize(e: MouseEvent) {
  e.preventDefault()
  isResizing.value = true
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  document.documentElement.style.cursor = 'ew-resize'
  
  const drawer = drawerRef.value
  if (!drawer) return
  
  drawer.classList.add('resizing')
  
  const startX = e.clientX
  const startWidth = drawer.offsetWidth
  const minWidth = 200
  const maxWidth = 500
  
  let currentWidth = startWidth
  
  const onMove = (moveEvent: MouseEvent) => {
    const delta = moveEvent.clientX - startX
    const newWidth = startWidth + delta
    currentWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
    document.documentElement.style.setProperty('--sidebar-width', currentWidth + 'px')
    drawer.style.width = currentWidth + 'px'
  }
  
  const onUp = async () => {
    sidebarWidth.value = currentWidth
    await setSetting(SIDEBAR_WIDTH_KEY, currentWidth)
    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.documentElement.style.cursor = ''
    drawer.classList.remove('resizing')
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// 检查文件夹是否有子文件夹
function hasChildren(group: FolderGroup): boolean {
  return props.groups.some(g => {
    // 标准化路径比较（处理分隔符差异）
    const parentPath = g.parent_path?.replace(/\\/g, '/').toLowerCase()
    const groupPath = group.folder_path.replace(/\\/g, '/').toLowerCase()
    return parentPath === groupPath
  })
}

// 计算可见的文件夹（根据展开状态过滤）
const visibleGroups = computed(() => {
  const visible: FolderGroup[] = []
  const expandedPaths = new Set<string>()

  // 首先找出所有展开的文件夹
  props.groups.forEach(group => {
    if (group.is_expanded !== false) {
      expandedPaths.add(group.folder_path)
    }
  })

  // 然后过滤出可见的文件夹
  props.groups.forEach(group => {
    // 根文件夹（level === 1）总是可见
    if (group.level === 1) {
      visible.push(group)
    } else {
      // 检查父文件夹是否展开（使用标准化路径比较）
      const parent = props.groups.find(g => {
        const gPath = g.folder_path.replace(/\\/g, '/').toLowerCase()
        const parentPath = group.parent_path?.replace(/\\/g, '/').toLowerCase()
        return gPath === parentPath
      })
      if (parent && parent.is_expanded !== false) {
        visible.push(group)
      }
    }
  })

  // 按层级和路径排序，确保父文件夹在子文件夹之前显示
  return visible.sort((a, b) => {
    // 首先按层级排序
    if (a.level !== b.level) {
      return a.level - b.level
    }
    // 同层级按路径排序
    return a.folder_path.localeCompare(b.folder_path)
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <aside class="drawer" ref="drawerRef">
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="drawer-header">
      <div class="drawer-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        </svg>
      </div>
      <div class="drawer-header-content">
        <span class="drawer-title">文件夹导航</span>
        <span class="drawer-subtitle">{{ groups.length }} 个分组</span>
      </div>
    </div>
    <div class="drawer-list">
      <div
        v-for="(group, index) in visibleGroups"
        :key="group.folder_path"
        class="list-tile"
        :class="{ 
          'list-tile-active': activeFolder === group.folder_path,
          'list-tile-root': group.level === 1,
          'list-tile-child': group.level === 2,
          'list-tile-grandchild': group.level >= 3
        }"
        :data-level="group.level"
        :style="{ 
          animationDelay: index * 50 + 'ms',
          paddingLeft: group.level > 1 ? `${(group.level - 1) * 0.8 + 0.5}vw` : '0.5vw',
          paddingRight: '1vw'
        }"
        @click="scrollToFolder(group.folder_path)"
        @contextmenu="handleContextMenu($event, group)"
      >
        <div class="list-tile-leading">
          <!-- 展开/折叠按钮 -->
          <button
            v-if="hasChildren(group)"
            class="expand-btn"
            :class="{ 'is-expanded': group.is_expanded !== false }"
            @click.stop="toggleExpand(group)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>
          <div v-else class="expand-placeholder"></div>
          <div class="folder-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
          </div>
        </div>
        <div class="list-tile-content">
          <span class="list-tile-title">{{ group.folder_name?.trim() || group.folder_path.split(/[\\/]/).pop() || '根目录' }}</span>
          <span class="list-tile-subtitle">{{ group.files.length }} 个文件</span>
        </div>
        <div class="list-tile-trailing">
          <svg v-if="activeFolder === group.folder_path" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
          <!-- 从列表移除按钮 - 悬浮时显示 -->
          <button
            class="remove-btn"
            @click.stop="emit('removeFromList', group.folder_path)"
            title="从列表中移除"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 右键菜单 -->
    <Teleport to="body">
      <div 
        v-if="contextMenuVisible && contextMenuFolder" 
        class="context-menu"
        :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
      >
        <div class="menu-item" @click="scrollToFolder(contextMenuFolder.folder_path)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
          <span>跳转到此文件夹</span>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="handleOpenInExplorer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z"/>
          </svg>
          <span>在文件管理器中打开</span>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="handleRemoveFromList">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
          <span>从列表中移除</span>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item danger" @click="handleDeleteFolder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          <span>删除文件夹</span>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.drawer {
  position: fixed;
  top: 8vh;
  left: 0;
  width: 22vw;
  height: calc(100vh - 8vh);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(1.5vh);
  -webkit-backdrop-filter: blur(1.5vh);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  box-shadow: 0.3vw 0 1.8vh rgba(0, 0, 0, 0.06);
  z-index: 50;
}

.drawer.resizing {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 10;
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 40px;
  background: transparent;
  border-radius: 2px;
  transition: background 0.2s;
}

.resize-handle:hover::after {
  background: rgba(59, 130, 246, 0.4);
}

.drawer-header {
  padding: 2.5vh 1.5vw;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(79, 70, 229, 0.04) 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  gap: 1vw;
}

.drawer-icon {
  width: 3vw;
  height: 3vw;
  min-width: 36px;
  min-height: 36px;
  max-width: 48px;
  max-height: 48px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 0.8vw;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 0.4vh 1.2vh rgba(59, 130, 246, 0.35);
}

.drawer-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.3vh;
}

.drawer-title {
  font-size: clamp(13px, 1.1vw, 17px);
  font-weight: 600;
  color: #111827;
  letter-spacing: -0.01em;
}

.drawer-subtitle {
  font-size: clamp(10px, 0.85vw, 13px);
  color: #6b7280;
  font-weight: 500;
}

.drawer-list {
  flex: 1;
  overflow-y: auto;
  padding: 1.5vh 0;
}

.list-tile {
  display: flex;
  align-items: center;
  padding: 1.5vh 0;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0.8vw;
  margin-bottom: 0.5vh;
  opacity: 0;
  animation: slideIn 0.4s ease-out forwards;
  position: relative;
}

/* 层级指示线 */
.list-tile::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  bottom: 20%;
  width: 3px;
  border-radius: 2px;
  background: transparent;
  transition: background 0.2s;
}

/* 根文件夹层级指示 */
.list-tile[data-level="1"]::before {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
}

/* 子文件夹层级指示 */
.list-tile[data-level="2"]::before {
  background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%);
}

/* 孙文件夹层级指示 */
.list-tile[data-level="3"]::before {
  background: linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%);
}

/* 更深层级 */
.list-tile[data-level="4"]::before,
.list-tile[data-level="5"]::before {
  background: linear-gradient(180deg, #bfdbfe 0%, #93c5fd 100%);
}

/* 根文件夹样式 - 更突出 */
.list-tile-root {
  background: rgba(59, 130, 246, 0.04);
  margin-top: 0.8vh;
}

.list-tile-root:first-child {
  margin-top: 0;
}

.list-tile-root .list-tile-title {
  font-weight: 600;
  font-size: 14px;
  color: #1e40af;
}

/* 子文件夹样式 */
.list-tile-child {
  background: rgba(255, 255, 255, 0.6);
}

.list-tile-child .list-tile-title {
  font-weight: 500;
  font-size: 13px;
  color: #374151;
}

/* 孙文件夹及更深样式 */
.list-tile-grandchild {
  background: rgba(255, 255, 255, 0.3);
}

.list-tile-grandchild .list-tile-title {
  font-weight: 400;
  font-size: 12px;
  color: #6b7280;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.list-tile:hover {
  background: rgba(59, 130, 246, 0.06);
}

.list-tile-active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.15);
}

.list-tile-active .list-tile-title {
  color: #2563eb;
  font-weight: 600;
}

.list-tile-active .folder-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.list-tile-leading {
  margin-right: 6px;
  display: flex;
  align-items: center;
}

.folder-icon {
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #eff6ff 0%, #fff 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  transition: all 0.2s;
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.1);
}

.list-tile:hover .folder-icon {
  transform: scale(1.05);
}

.list-tile-content { 
  flex: 1; 
  min-width: 0; 
}

.list-tile-title { 
  font-size: 13px; 
  font-weight: 500;
  color: #374151;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.list-tile-subtitle { 
  font-size: 11px; 
  color: #9ca3af;
  display: block;
  margin-top: 2px;
  font-weight: 500;
}

.list-tile-trailing {
  color: #3b82f6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-tile-active .list-tile-trailing {
  opacity: 1;
}

/* 展开/折叠按钮 */
.expand-btn {
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  margin-right: 2px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.expand-btn:hover {
  color: #3b82f6;
}

.expand-btn svg {
  transition: transform 0.2s;
}

.expand-btn.is-expanded svg {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 14px;
  height: 14px;
  margin-right: 2px;
  flex-shrink: 0;
}

/* 从列表移除按钮 - 默认隐藏，悬浮时显示 */
.remove-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  opacity: 0;
  transition: all 0.2s;
  margin-left: 4px;
}

.list-tile:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.remove-btn:active {
  transform: scale(0.95);
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 8px;
  min-width: 180px;
  z-index: 2000;
  animation: menuAppear 0.2s ease-out;
}

@keyframes menuAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.15s;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
}

.menu-item:hover {
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
}

.menu-item.danger { 
  color: #ef4444;
}

.menu-item.danger:hover { 
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
}

.menu-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.06);
  margin: 6px 8px;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.15);
}
</style>
