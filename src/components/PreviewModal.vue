<script setup lang="ts">
import { computed } from 'vue'
import type { MediaFile } from '../types'

const props = defineProps<{
  file: MediaFile | null
  imageUrl: string
  zoom: number
  position: { x: number; y: number }
  rotation: number
  isDragging: boolean
  isLoading: boolean
  canGoPrev: boolean
  canGoNext: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'wheel', event: WheelEvent): void
  (e: 'mousedown', event: MouseEvent): void
  (e: 'resetZoom'): void
  (e: 'rotateLeft'): void
  (e: 'rotateRight'): void
  (e: 'prev'): void
  (e: 'next'): void
}>()

const imageStyle = computed(() => ({
  transform: `translate(${props.position.x}px, ${props.position.y}px) scale(${props.zoom}) rotate(${props.rotation}deg)`,
  cursor: props.isDragging ? 'grabbing' : 'grab'
}))

const zoomPercent = computed(() => Math.round(props.zoom * 100))
</script>

<template>
  <div v-if="file" class="preview-scaffold">
    <div class="preview-app-bar">
      <button class="icon-btn" @click="emit('close')">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      <span class="preview-title">{{ file.name }}</span>
      <div class="preview-actions">
        <button class="icon-btn" @click="emit('rotateLeft')" title="向左旋转">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/>
          </svg>
        </button>
        <button class="icon-btn" @click="emit('rotateRight')" title="向右旋转">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/>
          </svg>
        </button>
        <button class="text-btn" @click="emit('resetZoom')">重置</button>
      </div>
    </div>
    
    <div class="preview-body" @wheel.stop="emit('wheel', $event)">
      <div v-if="isLoading" class="preview-loading">
        <div class="circular-progress large"></div>
      </div>
      <img 
        v-else 
        :src="imageUrl" 
        :alt="file.name"
        class="preview-image"
        :style="imageStyle"
        @mousedown.stop="emit('mousedown', $event)"
        draggable="false"
      />
    </div>
    
    <div class="preview-nav prev" v-if="canGoPrev" @click="emit('prev')">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    </div>
    <div class="preview-nav next" v-if="canGoNext" @click="emit('next')">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
      </svg>
    </div>
    
    <div class="preview-fab">
      <span class="fab-label">{{ zoomPercent }}%</span>
    </div>
  </div>
</template>

<style scoped>
.preview-scaffold {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}
.preview-app-bar {
  background: rgba(0,0,0,0.8);
  padding: 0 8px;
  height: 56px;
  display: flex;
  align-items: center;
  backdrop-filter: blur(10px);
}
.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: background 0.2s;
}
.icon-btn:hover { background: rgba(255,255,255,0.1); }
.preview-title { 
  flex: 1; 
  margin-left: 16px; 
  font-size: 16px; 
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-actions { display: flex; align-items: center; gap: 8px; }
.text-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #409EFF;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}
.text-btn:hover { background: rgba(64,158,255,0.1); }
.preview-body { 
  flex: 1; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  overflow: hidden;
  background: #000;
}
.preview-loading { display: flex; align-items: center; justify-content: center; }
.preview-image { 
  max-width: 100%; 
  max-height: 100%; 
  transition: transform 0.1s ease-out; 
  user-select: none; 
}
.preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: all 0.2s;
}
.preview-nav:hover { background: rgba(255,255,255,0.2); }
.preview-nav.prev { left: 24px; }
.preview-nav.next { right: 24px; }
.preview-fab {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 72px;
  height: 40px;
  background: rgba(255,255,255,0.9);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.fab-label { font-size: 14px; font-weight: 500; color: #212121; }
.circular-progress {
  width: 64px;
  height: 64px;
  border: 6px solid #333;
  border-top-color: #409EFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
