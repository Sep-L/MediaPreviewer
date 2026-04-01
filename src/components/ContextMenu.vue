<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { MediaFile } from '../types'

const props = defineProps<{
  file: MediaFile | null
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'copyPath', file: MediaFile): void
  (e: 'openInExplorer', file: MediaFile): void
  (e: 'delete', file: MediaFile): void
  (e: 'showInfo', file: MediaFile): void
}>()

const menuRef = ref<HTMLElement | null>(null)

const MENU_WIDTH = 200
const MENU_HEIGHT = 240

const menuStyle = computed(() => {
  const x = Math.min(props.position.x, window.innerWidth - MENU_WIDTH - 8)
  const y = Math.min(props.position.y, window.innerHeight - MENU_HEIGHT - 8)
  return {
    left: `${Math.max(0, x)}px`,
    top: `${Math.max(0, y)}px`
  }
})

function handleCopyPath() {
  if (props.file) {
    emit('copyPath', props.file)
    emit('close')
  }
}

function handleOpenInExplorer() {
  if (props.file) {
    emit('openInExplorer', props.file)
    emit('close')
  }
}

function handleDelete() {
  if (props.file) {
    emit('delete', props.file)
    emit('close')
  }
}

function handleShowInfo() {
  if (props.file) {
    emit('showInfo', props.file)
    emit('close')
  }
}

function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="file" ref="menuRef" class="context-menu" :style="menuStyle">
      <div class="menu-item" @click="handleShowInfo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <span>查看详情</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="handleCopyPath">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        <span>复制路径</span>
      </div>
      <div class="menu-item" @click="handleOpenInExplorer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z"/>
        </svg>
        <span>在资源管理器中打开</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="handleDelete">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        <span>删除文件</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  padding: 8px 0;
  min-width: 180px;
  z-index: 2000;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
  color: #303133;
  font-size: 14px;
}
.menu-item:hover { background: #f5f7fa; }
.menu-item.danger { color: #f56c6c; }
.menu-item.danger:hover { background: #fef0f0; }
.menu-divider {
  height: 1px;
  background: #e4e7ed;
  margin: 4px 0;
}
</style>
